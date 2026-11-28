import Foundation
import Testing
import CadenceCore
@testable import CadenceServices

@Suite("PlanShareService")
struct PlanShareServiceTests {
    @Test("extractSharedPlanRef parses /p/<code>, ?p=, #p=, ?plan=, #plan=, cadence://p/<code> and rejects invalid codes")
    func extractSharedPlanRefs() {
        let shortPath = PlanShareService.extractSharedPlanRef(
            from: URL(string: "https://cadence.app/p/K8m4P2x9/")!
        )
        #expect(shortPath?.kind == "short")
        #expect(shortPath?.code == "k8m4p2x9")

        let queryP = PlanShareService.extractSharedPlanRef(
            from: URL(string: "https://cadence.app/?p=AbC12345")!
        )
        #expect(queryP?.kind == "short")
        #expect(queryP?.code == "abc12345")

        let hashP = PlanShareService.extractSharedPlanRef(
            from: URL(string: "https://cadence.app/#p=xyz98765")!
        )
        #expect(hashP?.kind == "short")
        #expect(hashP?.code == "xyz98765")

        let inlinePlan = PlanShareService.extractSharedPlanRef(
            from: URL(string: "https://cadence.app/?plan=eyJ2IjoyfQ")!
        )
        #expect(inlinePlan?.kind == "token")
        #expect(inlinePlan?.token == "eyJ2IjoyfQ")

        let hashPlan = PlanShareService.extractSharedPlanRef(
            from: URL(string: "https://cadence.app/#plan=eyJ2IjoyLCJuIjoidGVzdCJ9")!
        )
        #expect(hashPlan?.kind == "token")
        #expect(hashPlan?.token == "eyJ2IjoyLCJuIjoidGVzdCJ9")

        let deepLink = PlanShareService.extractSharedPlanRef(
            from: URL(string: "cadence://p/k8m4p2x9")!
        )
        #expect(deepLink?.kind == "short")
        #expect(deepLink?.code == "k8m4p2x9")

        let badCode = PlanShareService.extractSharedPlanRef(
            from: URL(string: "https://cadence.app/p/bad!")!
        )
        #expect(badCode == nil)
        #expect(PlanShareService.isValidShortCode("abc") == false)
        #expect(PlanShareService.isValidShortCode("k8m4p2x9") == true)
    }

    @Test("createShortShareURL sends RPC payload, caches session result, and coalesces concurrent requests")
    func createShortURLCachingAndCoalescing() async throws {
        let rpcCount = BoxedValue(0)
        let capturedBodies = BoxedList<Data>()

        let (mockID, session) = M4CAsyncDelayURLProtocol.registerSession { request, bodyData in
            let url = try #require(request.url)
            rpcCount.mutate { $0 += 1 }
            if let bodyData {
                capturedBodies.append(bodyData)
            }
            let data = Data("\"k8m4p2x9\"".utf8)
            return (0.08, M4CTestSupport.makeHTTPResponse(url: url, statusCode: 200), data)
        }
        defer { M4CAsyncDelayURLProtocol.unregister(id: mockID) }

        let config = SupabaseConfiguration(
            supabaseURL: URL(string: "https://example.supabase.co")!,
            supabaseAnonKey: "sb_publishable_test_key",
            urlSession: session
        )
        let service = PlanShareService(configuration: config)
        let trip = M4CTestSupport.makeSampleTrip(name: "Bretagne Classic", distanceKm: 112.4)
        let extras = PlanShareExtras(leaveByHHMM: "07:30", arrivalHHMM: "12:15", goStatus: "GO")

        // Two concurrent calls with the same trip/extras coalesce into 1 RPC call
        async let firstCall = service.createShortShareURL(trip: trip, extras: extras)
        async let secondCall = service.createShortShareURL(trip: trip, extras: extras)
        let (r1, r2) = await (firstCall, secondCall)

        #expect(r1.isShort == true)
        #expect(r1.code == "k8m4p2x9")
        #expect(r1.url.absoluteString == "https://cadence.app/p/k8m4p2x9")
        #expect(r2 == r1)
        #expect(rpcCount.get() == 1)

        // Third call hits session cache with 0 additional RPCs
        let r3 = await service.createShortShareURL(trip: trip, extras: extras)
        #expect(r3 == r1)
        #expect(rpcCount.get() == 1)

        let bodyData = try #require(capturedBodies.snapshot().first)
        let body = try #require(M4CTestSupport.decodeJSONBody(bodyData))
        #expect(body["p_title"] as? String == "Bretagne Classic")
        #expect(body["p_stage_count"] as? Int == 1)
        #expect((body["p_token"] as? String)?.count ?? 0 >= 10)
    }

    @Test("createShortShareURL falls back to inline ?plan=<token> on HTTP 500, invalid code, and timeout")
    func fallbackToInlineURL() async throws {
        let mode = BoxedValue("http-500")
        let (mockID, session) = M4CAsyncDelayURLProtocol.registerSession { request, _ in
            let url = try #require(request.url)
            switch mode.get() {
            case "http-500":
                return (0.0, M4CTestSupport.makeHTTPResponse(url: url, statusCode: 500), Data("err".utf8))
            case "bad-code":
                return (0.0, M4CTestSupport.makeHTTPResponse(url: url, statusCode: 200), Data("\"bad!\"".utf8))
            default:
                return (0.6, M4CTestSupport.makeHTTPResponse(url: url, statusCode: 200), Data("\"valid123\"".utf8))
            }
        }
        defer { M4CAsyncDelayURLProtocol.unregister(id: mockID) }

        let config = SupabaseConfiguration(
            supabaseURL: URL(string: "https://example.supabase.co")!,
            supabaseAnonKey: "sb_publishable_test_key",
            urlSession: session
        )
        let service = PlanShareService(configuration: config, createTimeoutSeconds: 0.08)
        let trip = M4CTestSupport.makeSampleTrip(name: "Fallback Test")

        // 1. HTTP 500
        let errFallback = await service.createShortShareURL(trip: trip)
        #expect(errFallback.isShort == false)
        #expect(errFallback.code == nil)
        #expect(errFallback.url.absoluteString.contains("?plan="))

        // 2. Invalid short code returned by RPC
        mode.set("bad-code")
        let badCodeFallback = await service.createShortShareURL(trip: trip)
        #expect(badCodeFallback.isShort == false)
        #expect(badCodeFallback.code == nil)

        // 3. Timeout fallback
        mode.set("slow")
        let start = ContinuousClock.now
        let timeoutFallback = await service.createShortShareURL(trip: trip)
        let elapsed = start.duration(to: .now)
        #expect(timeoutFallback.isShort == false)
        #expect(timeoutFallback.code == nil)
        #expect(elapsed < .milliseconds(400))
    }

    @Test("resolveShortPlanToken decodes array & single-object RPC responses, rejects <10-char tokens, and applies personal lens")
    func resolveAndDecodeWithPersonalLens() async throws {
        let trip = M4CTestSupport.makeSampleTrip(name: "Paris-Roubaix Recon", distanceKm: 82.0)
        let encodedToken = PlanShareCodec.encodePlanShareToken(trip)
        let mode = BoxedValue("array")

        let (mockID, session) = MockURLProtocol.registerSession { request, _ in
            let url = try #require(request.url)
            switch mode.get() {
            case "array":
                return try M4CTestSupport.makeJSONResponse(url: url, object: [[
                    "code": "pr2026ab",
                    "token": encodedToken,
                    "title": trip.name,
                    "distance_km": 82.0,
                    "elevation_m": 380,
                    "stage_count": 1,
                ]])
            case "single":
                return try M4CTestSupport.makeJSONResponse(url: url, object: [
                    "code": "pr2026ab",
                    "token": encodedToken,
                ])
            default:
                return try M4CTestSupport.makeJSONResponse(url: url, object: [[
                    "code": "pr2026ab",
                    "token": "too_short",
                ]])
            }
        }
        defer { MockURLProtocol.unregister(id: mockID) }

        let config = SupabaseConfiguration(
            supabaseURL: URL(string: "https://example.supabase.co")!,
            supabaseAnonKey: "sb_publishable_test_key",
            urlSession: session
        )
        let service = PlanShareService(configuration: config)

        // 1. Array row + personal lens
        var receiverSpecs = RiderBikeSpecs.defaultSpecs
        receiverSpecs.riderWeightKg = 62.0
        receiverSpecs.bikes = [
            BikeSpec(
                id: "bike-gravel-1",
                name: "Crux Custom",
                weightKg: 8.2,
                crr: 0.0052,
                cda: 0.36,
                isTubeless: true,
                tireWidthMm: 40,
                bikeCategory: .gravel
            ),
        ]
        receiverSpecs.activeBikeId = "bike-gravel-1"

        let decodedFromURL = try #require(await service.resolveAndDecodeSharedPlan(
            from: URL(string: "cadence://p/pr2026ab")!,
            lang: .en,
            receiverSpecs: receiverSpecs
        ))
        #expect(decodedFromURL.trip.name == "Paris-Roubaix Recon")
        #expect(decodedFromURL.trip.physics.riderWeightKg == 62.0)
        #expect(decodedFromURL.trip.physics.bikeWeightKg == 8.2)
        #expect(decodedFromURL.trip.physics.cda == 0.36)

        // 2. Single object row
        mode.set("single")
        let singleToken = await service.resolveShortPlanToken(code: "PR2026AB")
        #expect(singleToken == encodedToken)

        // 3. Rejects <10-char token
        mode.set("short-token")
        let rejected = await service.resolveShortPlanToken(code: "pr2026ab")
        #expect(rejected == nil)
    }
}
