import Foundation
import Testing
import CadenceCore
@testable import CadenceServices

@Suite("HeadUnitSyncService")
struct HeadUnitSyncServiceTests {
    @Test("Default HEADUNIT_PUSH_ENABLED = false gate blocks authorize_url and pushCourse without firing network calls")
    func defaultPushGateBlocksCalls() async throws {
        let networkCalls = BoxedValue(0)
        let (mockID, session) = MockURLProtocol.registerSession { request, _ in
            networkCalls.mutate { $0 += 1 }
            let url = try #require(request.url)
            return try M4CTestSupport.makeJSONResponse(url: url, object: ["ok": true])
        }
        defer { MockURLProtocol.unregister(id: mockID) }

        #expect(HeadUnitSyncService.headUnitPushEnabled == false)

        let config = SupabaseConfiguration(
            supabaseURL: URL(string: "https://example.supabase.co")!,
            supabaseAnonKey: "sb_publishable_test_key",
            urlSession: session
        )
        let service = HeadUnitSyncService(
            configuration: config,
            connectionKeyStore: InMemoryIntegrationKeyStore(),
            statusStore: InMemoryIntegrationDataStore()
        )
        #expect(await service.isPushEnabled == false)

        await #expect(throws: HeadUnitSyncError.pushDisabled) {
            try await service.requestAuthorizeURL(provider: .wahoo)
        }

        let trip = M4CTestSupport.makeSampleTrip()
        let pushResult = await service.pushCourse(trip: trip, to: .garmin)
        #expect(pushResult.ok == false)
        #expect(pushResult.reason == "headunit_push_disabled")
        #expect(networkCalls.get() == 0)
    }

    @Test("Enabled HeadUnitSyncService handles authorize_url, status, disconnect, and OAuth callbacks for all providers")
    func authorizeStatusDisconnectAndCallbacks() async throws {
        let actionsSeen = BoxedList<(path: String, action: String?, provider: String?)>()

        let (mockID, session) = MockURLProtocol.registerSession { request, bodyData in
            let url = try #require(request.url)
            let body = M4CTestSupport.decodeJSONBody(bodyData) ?? [:]
            let action = body["action"] as? String
            let provider = body["provider"] as? String
            actionsSeen.append((path: url.path, action: action, provider: provider))

            if action == "authorize_url" {
                return try M4CTestSupport.makeJSONResponse(url: url, object: [
                    "ok": true,
                    "authorizeUrl": "https://api.wahooligan.com/oauth/authorize?client_id=abc",
                    "provider": provider ?? "wahoo",
                ])
            }
            if action == "status" {
                return try M4CTestSupport.makeJSONResponse(url: url, object: [
                    "ok": true,
                    "statuses": [
                        "wahoo": true,
                        "hammerhead": false,
                        "garmin": true,
                    ],
                ])
            }
            if action == "disconnect" {
                return try M4CTestSupport.makeJSONResponse(url: url, object: [
                    "ok": true,
                    "disconnected": provider ?? "wahoo",
                ])
            }
            return (M4CTestSupport.makeHTTPResponse(url: url, statusCode: 400), Data())
        }
        defer { MockURLProtocol.unregister(id: mockID) }

        let config = SupabaseConfiguration(
            supabaseURL: URL(string: "https://example.supabase.co")!,
            supabaseAnonKey: "sb_publishable_test_key",
            urlSession: session
        )
        let service = HeadUnitSyncService(
            configuration: config,
            isPushEnabled: true,
            connectionKeyStore: InMemoryIntegrationKeyStore(initialKey: "33333333-3333-4333-8333-333333333333"),
            statusStore: InMemoryIntegrationDataStore()
        )

        let stream = await service.statusStream()
        let collected = BoxedList<HeadUnitStatuses>()
        let collectTask = Task {
            for await item in stream {
                collected.append(item)
                if collected.snapshot().count >= 5 {
                    break
                }
            }
        }

        let wahooURL = try await service.requestAuthorizeURL(provider: .wahoo)
        #expect(wahooURL.host == "api.wahooligan.com")

        let connectedCb = await service.handleOAuthCallback(
            URL(string: "cadence://oauth-callback?headunit_connected=hammerhead")!
        )
        #expect(connectedCb?.hammerhead == true)
        #expect(connectedCb?.lastError == nil)

        let errorCb = await service.handleOAuthCallback(
            URL(string: "cadence://oauth-callback?headunit_error=access_denied&headunit_provider=garmin")!
        )
        #expect(errorCb?.lastError == "access_denied")
        #expect(errorCb?.lastErrorProvider == .garmin)

        let remoteStatuses = await service.fetchStatuses()
        #expect(remoteStatuses.wahoo == true)
        #expect(remoteStatuses.hammerhead == false)
        #expect(remoteStatuses.garmin == true)

        let didDisconnect = await service.disconnect(provider: .wahoo)
        #expect(didDisconnect == true)
        let afterDisconnect = await service.cachedStatuses()
        #expect(afterDisconnect.wahoo == false)
        #expect(afterDisconnect.garmin == true)

        await collectTask.value
        #expect(collected.snapshot().contains(where: { $0.hammerhead == true }))
        #expect(collected.snapshot().contains(where: { $0.lastError == "access_denied" && $0.lastErrorProvider == .garmin }))
    }

    @Test("pushCourse generates valid FIT binary, sanitizes filename, and maps success & error reasons")
    func pushCourseFitExportAndErrors() async throws {
        let capturedBodies = BoxedList<Data>()
        let nextResponseMode = BoxedValue("ok")

        let (mockID, session) = MockURLProtocol.registerSession { request, bodyData in
            let url = try #require(request.url)
            if let bodyData {
                capturedBodies.append(bodyData)
            }

            switch nextResponseMode.get() {
            case "ok":
                return try M4CTestSupport.makeJSONResponse(url: url, object: [
                    "ok": true,
                    "provider": "wahoo",
                    "externalId": "wh-route-9988",
                ])
            case "not_connected":
                return try M4CTestSupport.makeJSONResponse(url: url, object: [
                    "ok": false,
                    "reason": "not_connected",
                ])
            default:
                return try M4CTestSupport.makeJSONResponse(url: url, object: [
                    "ok": false,
                    "reason": "garmin_upload_failed_401",
                ])
            }
        }
        defer { MockURLProtocol.unregister(id: mockID) }

        let config = SupabaseConfiguration(
            supabaseURL: URL(string: "https://example.supabase.co")!,
            supabaseAnonKey: "sb_publishable_test_key",
            urlSession: session
        )
        let service = HeadUnitSyncService(
            configuration: config,
            isPushEnabled: true,
            connectionKeyStore: InMemoryIntegrationKeyStore(initialKey: "44444444-4444-4444-8444-444444444444"),
            statusStore: InMemoryIntegrationDataStore()
        )

        let trip = M4CTestSupport.makeSampleTrip(
            name: "Loire -> Saumur (2026)!",
            coordinateCount: 12,
            distanceKm: 63.6
        )

        let okResult = await service.pushCourse(trip: trip, to: .wahoo)
        #expect(okResult.ok == true)
        #expect(okResult.externalId == "wh-route-9988")

        let reqBodyData = try #require(capturedBodies.snapshot().first)
        let reqBody = try #require(M4CTestSupport.decodeJSONBody(reqBodyData))
        #expect(reqBody["provider"] as? String == "wahoo")
        #expect(reqBody["fileName"] as? String == "loire---saumur-2026-64km.fit")
        #expect(HeadUnitSyncService.sanitizeCourseFileName(tripName: "Loire Saumur (2026)!", distanceKm: 63.6) == "loire-saumur-2026-64km.fit")
        #expect(reqBody["courseName"] as? String == "Loire -> Saumur (2026)!")

        let b64 = try #require(reqBody["contentBase64"] as? String)
        let fitData = try #require(Data(base64Encoded: b64))
        #expect(RouteImportService.hasFitSignature(fitData))
        let reparsed = try #require(RouteFileParserEngine.parseFitFileData(fitData, fileName: "pushed.fit"))
        #expect(reparsed.coordinates.count >= 2)

        nextResponseMode.set("not_connected")
        let notConnected = await service.pushCourse(trip: trip, to: .hammerhead)
        #expect(notConnected.ok == false)
        #expect(notConnected.reason == "not_connected")

        nextResponseMode.set("garmin_401")
        let garminErr = await service.pushCourse(trip: trip, to: .garmin)
        #expect(garminErr.ok == false)
        #expect(garminErr.reason == "garmin_upload_failed_401")
    }

    @Test("handleOAuthCallback strictly requires cadence://oauth-callback and rejects spoofed schemes, hosts, paths, ports, and userinfo")
    func rejectsSpoofedOAuthCallbacks() async {
        let dataStore = InMemoryIntegrationDataStore()
        let service = HeadUnitSyncService(
            isPushEnabled: true,
            connectionKeyStore: InMemoryIntegrationKeyStore(),
            statusStore: dataStore
        )

        let stream = await service.statusStream()
        let received = BoxedList<HeadUnitStatuses>()
        let collector = Task {
            for await statuses in stream {
                received.append(statuses)
                if received.snapshot().count >= 2 {
                    break
                }
            }
        }

        let spoofedURLs = [
            "https://evil.com/phish?headunit_connected=garmin",
            "http://evil.com/phish?headunit_connected=wahoo",
            "cadence://evil-host?headunit_connected=hammerhead",
            "cadence://oauth-callback/evil?headunit_connected=garmin",
            "cadence://user@oauth-callback?headunit_connected=wahoo",
            "cadence://oauth-callback:8443?headunit_connected=garmin",
            "https://evil.com/phish?headunit_error=spoofed&headunit_provider=wahoo",
        ]

        for raw in spoofedURLs {
            let result = await service.handleOAuthCallback(URL(string: raw)!)
            #expect(result == nil)
        }

        let cachedAfterSpoof = await service.cachedStatuses()
        #expect(cachedAfterSpoof == HeadUnitStatuses())
        #expect(await dataStore.loadData(forKey: HeadUnitSyncService.statusStorageKey) == nil)

        // Trailing slash on exact cadence://oauth-callback/ is accepted
        let validTrailingSlash = await service.handleOAuthCallback(
            URL(string: "cadence://oauth-callback/?headunit_connected=garmin")!
        )
        #expect(validTrailingSlash?.garmin == true)

        await collector.value
        let emissions = received.snapshot()
        #expect(emissions.count == 2)
        #expect(emissions[0] == HeadUnitStatuses())
        #expect(emissions[1].garmin == true)
    }
}
