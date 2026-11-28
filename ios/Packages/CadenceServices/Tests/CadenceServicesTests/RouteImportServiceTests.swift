import Foundation
import Testing
import CadenceCore
@testable import CadenceServices

@Suite("RouteImportService")
struct RouteImportServiceTests {
    @Test("detectProvider identifies Komoot, Bikemap, RideWithGPS, Strava, direct files, and invalid inputs")
    func providerDetection() {
        let komoot = RouteImportService.detectProvider(from: "  https://www.komoot.fr/tour/123456789?share_token=abc  ")
        #expect(komoot.provider == .komoot)
        #expect(komoot.routeId == "123456789")

        let komootApi = RouteImportService.detectProvider(from: "Check out https://api.komoot.de/tour/998877")
        #expect(komootApi.provider == .komoot)
        #expect(komootApi.routeId == "998877")

        let bikemap = RouteImportService.detectProvider(from: "https://www.bikemap.net/en/r/54321/")
        #expect(bikemap.provider == .bikemap)
        #expect(bikemap.routeId == "54321")

        let rwgps = RouteImportService.detectProvider(from: "https://ridewithgps.com/routes/44556677")
        #expect(rwgps.provider == .ridewithgps)
        #expect(rwgps.routeId == "44556677")

        let strava = RouteImportService.detectProvider(from: "https://www.strava.com/routes/31415926")
        #expect(strava.provider == .strava)
        #expect(strava.routeId == "31415926")

        let stravaShort = RouteImportService.detectProvider(from: "https://strava.app.link/abcXYZ")
        #expect(stravaShort.provider == .strava)
        #expect(stravaShort.routeId == nil)

        let directTcx = RouteImportService.detectProvider(from: "https://cdn.example.org/tracks/alpine.tcx")
        #expect(directTcx.provider == .directFile)

        let invalid = RouteImportService.detectProvider(from: "not a route url")
        #expect(invalid.provider == .unknown)
        #expect(invalid.url == nil)
    }

    @Test("TcxRouteParser extracts Course Name, Activity Notes/Id fallback, trackpoints, and rejects malformed XML")
    func tcxParserBehavior() throws {
        let tcx = M4CTestSupport.makeSampleTcx(courseName: "Vercors -> Die")
        let parsed = try #require(TcxRouteParser.parseTcxContent(tcx, fileName: "vercors.tcx"))
        #expect(parsed.trackName == "Vercors -> Die")
        #expect(parsed.originLabel == "Vercors")
        #expect(parsed.destLabel == "Die")
        #expect(parsed.coordinates.count == 3)
        #expect(parsed.distanceKm > 10.0)
        #expect(parsed.elevationGainM == 25)

        let activityNotesTcx = """
        <?xml version="1.0" encoding="UTF-8"?>
        <TrainingCenterDatabase>
          <Activities>
            <Activity Sport="Biking">
              <Id>2026-11-28T07:00:00Z</Id>
              <Notes>Canal du Midi</Notes>
              <Lap>
                <Track>
                  <Trackpoint>
                    <Position><LatitudeDegrees>43.6045</LatitudeDegrees><LongitudeDegrees>1.4440</LongitudeDegrees></Position>
                  </Trackpoint>
                  <Trackpoint>
                    <Position><LatitudeDegrees>43.5500</LatitudeDegrees><LongitudeDegrees>1.5100</LongitudeDegrees></Position>
                  </Trackpoint>
                </Track>
              </Lap>
            </Activity>
          </Activities>
        </TrainingCenterDatabase>
        """
        let fallbackParsed = try #require(TcxRouteParser.parseTcxContent(activityNotesTcx, fileName: "midi.tcx"))
        #expect(fallbackParsed.trackName == "Canal du Midi")
        #expect(fallbackParsed.coordinates.count == 2)

        #expect(TcxRouteParser.parseTcxContent("<TrainingCenterDatabase><Broken>", fileName: "bad.tcx") == nil)
    }

    @Test("route-proxy decodes GPX, TCX, and FIT payloads and sends apikey without sb_publishable Bearer header")
    func proxyImportAllFormatsAndAuthHeaders() async throws {
        let capturedAuthHeaders = BoxedList<String>()
        let capturedApiKeys = BoxedList<String>()
        let capturedBodies = BoxedList<Data>()

        let trip = M4CTestSupport.makeSampleTrip(name: "Fit Proxy Loop", coordinateCount: 10)
        let fitBytes = FitExporterEngine.exportTripToFit(trip)
        let fitBase64 = fitBytes.base64EncodedString()

        let mode = BoxedValue("gpx")
        let (mockID, session) = MockURLProtocol.registerSession { request, bodyData in
            if let auth = request.value(forHTTPHeaderField: "Authorization") {
                capturedAuthHeaders.append(auth)
            }
            if let apikey = request.value(forHTTPHeaderField: "apikey") {
                capturedApiKeys.append(apikey)
            }
            if let bodyData {
                capturedBodies.append(bodyData)
            }

            let url = try #require(request.url)
            switch mode.get() {
            case "gpx":
                return try M4CTestSupport.makeJSONResponse(url: url, object: [
                    "ok": true,
                    "provider": "komoot",
                    "routeId": "111",
                    "format": "gpx",
                    "fileName": "komoot-111.gpx",
                    "content": M4CTestSupport.makeSampleGpx(name: "Proxy GPX"),
                ])
            case "tcx":
                return try M4CTestSupport.makeJSONResponse(url: url, object: [
                    "ok": true,
                    "provider": "strava",
                    "routeId": "222",
                    "format": "tcx",
                    "content": M4CTestSupport.makeSampleTcx(courseName: "Strava Proxy TCX"),
                ])
            default:
                return try M4CTestSupport.makeJSONResponse(url: url, object: [
                    "ok": true,
                    "provider": "ridewithgps",
                    "routeId": "333",
                    "format": "fit",
                    "contentBase64": fitBase64,
                ])
            }
        }
        defer { MockURLProtocol.unregister(id: mockID) }

        let config = SupabaseConfiguration(
            supabaseURL: URL(string: "https://example.supabase.co")!,
            supabaseAnonKey: "sb_publishable_test_key",
            urlSession: session
        )
        let keyStore = InMemoryIntegrationKeyStore(initialKey: "11111111-1111-4111-8111-111111111111")
        let service = RouteImportService(
            urlSession: session,
            configuration: config,
            connectionKeyStore: keyStore
        )

        // 1. GPX via proxy
        let gpxOut = await service.importRoute(from: "https://www.komoot.com/tour/111")
        #expect(gpxOut.ok == true)
        #expect(gpxOut.provider == .komoot)
        #expect(gpxOut.fileName == "komoot-111.gpx")
        #expect(gpxOut.parsed?.trackName == "Proxy GPX")

        // 2. TCX via proxy
        mode.set("tcx")
        let tcxOut = await service.importRoute(from: "https://www.strava.com/routes/222")
        #expect(tcxOut.ok == true)
        #expect(tcxOut.provider == .strava)
        #expect(tcxOut.fileName == "strava-222.tcx")
        #expect(tcxOut.parsed?.trackName == "Strava Proxy TCX")

        // 3. FIT via proxy
        mode.set("fit")
        let fitOut = await service.importRoute(from: "https://ridewithgps.com/routes/333")
        #expect(fitOut.ok == true)
        #expect(fitOut.provider == .ridewithgps)
        #expect(fitOut.fileName == "ridewithgps-333.fit")
        #expect((fitOut.parsed?.coordinates.count ?? 0) >= 2)

        // Verify sb_publishable_ key was NOT forwarded as Authorization: Bearer
        #expect(capturedAuthHeaders.snapshot().isEmpty)
        #expect(capturedApiKeys.snapshot() == [
            "sb_publishable_test_key",
            "sb_publishable_test_key",
            "sb_publishable_test_key",
        ])
        let firstBodyData = try #require(capturedBodies.snapshot().first)
        let firstBody = try #require(M4CTestSupport.decodeJSONBody(firstBodyData))
        #expect(firstBody["connectionKey"] as? String == "11111111-1111-4111-8111-111111111111")
    }

    @Test("Direct unauthenticated fallback succeeds when route-proxy fails, rejects <16B, and returns bilingual guidance on failure")
    func directFallbackAndBilingualGuidance() async throws {
        let requestedURLs = BoxedList<String>()
        let behavior = BoxedValue("rwgps-direct")

        let (mockID, session) = MockURLProtocol.registerSession { request, _ in
            let url = try #require(request.url)
            requestedURLs.append(url.absoluteString)

            if url.path.contains("/functions/v1/route-proxy") {
                return (M4CTestSupport.makeHTTPResponse(url: url, statusCode: 500), Data("{}".utf8))
            }

            switch behavior.get() {
            case "rwgps-direct":
                let gpxData = Data(M4CTestSupport.makeSampleGpx(name: "Direct RWGPS").utf8)
                return (
                    M4CTestSupport.makeHTTPResponse(
                        url: url,
                        statusCode: 200,
                        headers: ["Content-Type": "application/gpx+xml"]
                    ),
                    gpxData
                )
            case "too-short":
                return (M4CTestSupport.makeHTTPResponse(url: url, statusCode: 200), Data("tiny".utf8))
            default:
                return (M4CTestSupport.makeHTTPResponse(url: url, statusCode: 403), Data("Forbidden".utf8))
            }
        }
        defer { MockURLProtocol.unregister(id: mockID) }

        let config = SupabaseConfiguration(
            supabaseURL: URL(string: "https://example.supabase.co")!,
            supabaseAnonKey: "sb_publishable_test_key",
            urlSession: session
        )
        let service = RouteImportService(
            urlSession: session,
            configuration: config,
            connectionKeyStore: InMemoryIntegrationKeyStore()
        )

        // 1. RideWithGPS direct fallback
        let okOutcome = await service.importRoute(from: "https://ridewithgps.com/routes/987654")
        #expect(okOutcome.ok == true)
        #expect(okOutcome.provider == .ridewithgps)
        #expect(okOutcome.parsed?.trackName == "Direct RWGPS")
        #expect(requestedURLs.snapshot().contains("https://ridewithgps.com/routes/987654.gpx?sub_format=track"))

        // 2. <16 byte payload rejected -> bilingual Komoot guidance
        behavior.set("too-short")
        let komootFail = await service.importRoute(from: "https://www.komoot.com/tour/4242")
        #expect(komootFail.ok == false)
        #expect(komootFail.provider == .komoot)
        #expect(komootFail.guidanceEn?.contains("Komoot") == true)
        #expect(komootFail.guidanceFr?.contains("Komoot") == true)

        // 3. Strava private route -> Strava-specific EN/FR guidance (no direct fallback)
        behavior.set("forbidden")
        let stravaFail = await service.importRoute(from: "https://www.strava.com/routes/7777")
        #expect(stravaFail.ok == false)
        #expect(stravaFail.provider == .strava)
        #expect(stravaFail.guidanceEn?.contains("Strava routes require account connection") == true)
        #expect(stravaFail.guidanceFr?.contains("Les parcours Strava nécessitent une connexion") == true)
    }

    @Test("Direct fallback enforces non-blocking async timeout and aborts quickly on slow response")
    func nonBlockingAsyncTimeout() async throws {
        let (mockID, session) = M4CAsyncDelayURLProtocol.registerSession { request, _ in
            let url = try #require(request.url)
            if url.path.contains("/functions/v1/route-proxy") {
                return (0.0, M4CTestSupport.makeHTTPResponse(url: url, statusCode: 500), Data("{}".utf8))
            }
            let gpxData = Data(M4CTestSupport.makeSampleGpx().utf8)
            return (0.8, M4CTestSupport.makeHTTPResponse(url: url, statusCode: 200), gpxData)
        }
        defer { M4CAsyncDelayURLProtocol.unregister(id: mockID) }

        let config = SupabaseConfiguration(
            supabaseURL: URL(string: "https://example.supabase.co")!,
            supabaseAnonKey: "sb_publishable_test_key",
            urlSession: session
        )
        let service = RouteImportService(
            urlSession: session,
            configuration: config,
            connectionKeyStore: InMemoryIntegrationKeyStore(),
            directTimeoutSeconds: 0.08
        )

        let start = ContinuousClock.now
        let outcome = await service.importRoute(from: "https://cdn.example.org/slow.gpx")
        let elapsed = start.duration(to: .now)

        #expect(outcome.ok == false)
        #expect(outcome.provider == .directFile)
        #expect(elapsed < .milliseconds(400))
    }

    @Test("CadenceStore SDPendingShareImport queue processes .file, .url, and .planCode items and updates statuses")
    func pendingShareQueueIntegration() async throws {
        let store = try CadenceModelContainer.makeStore(inMemory: true)
        let trip = M4CTestSupport.makeSampleTrip(id: "shared-trip-1", name: "Gravel Bretagne")
        let encodedToken = PlanShareCodec.encodePlanShareToken(trip)

        let (mockID, session) = MockURLProtocol.registerSession { request, _ in
            let url = try #require(request.url)
            if url.path.contains("/rest/v1/rpc/get_shared_plan") {
                return try M4CTestSupport.makeJSONResponse(url: url, object: [[
                    "code": "bzh77889",
                    "token": encodedToken,
                    "title": trip.name,
                ]])
            }
            if url.path.contains("/functions/v1/route-proxy") {
                return (M4CTestSupport.makeHTTPResponse(url: url, statusCode: 500), Data("{}".utf8))
            }
            return (
                M4CTestSupport.makeHTTPResponse(url: url, statusCode: 200),
                Data(M4CTestSupport.makeSampleTcx(courseName: "Shared URL TCX").utf8)
            )
        }
        defer { MockURLProtocol.unregister(id: mockID) }

        let config = SupabaseConfiguration(
            supabaseURL: URL(string: "https://example.supabase.co")!,
            supabaseAnonKey: "sb_publishable_test_key",
            urlSession: session
        )
        let planShareService = PlanShareService(configuration: config)
        let importService = RouteImportService(
            urlSession: session,
            configuration: config,
            connectionKeyStore: InMemoryIntegrationKeyStore()
        )

        let fileItem = PendingShareImportDTO(
            id: "share-file-1",
            kind: .file,
            fileName: "bretagne.gpx",
            fileData: Data(M4CTestSupport.makeSampleGpx(name: "File GPX").utf8)
        )
        let urlItem = PendingShareImportDTO(
            id: "share-url-1",
            kind: .url,
            sourceUrl: "https://www.bikemap.net/en/r/9090/"
        )
        let planCodeItem = PendingShareImportDTO(
            id: "share-plan-1",
            kind: .planCode,
            sharedText: "bzh77889"
        )
        let badFileItem = PendingShareImportDTO(
            id: "share-bad-1",
            kind: .file,
            fileName: "corrupt.gpx",
            fileData: Data("short".utf8)
        )

        try await store.enqueuePendingShareImport(fileItem)
        try await store.enqueuePendingShareImport(urlItem)
        try await store.enqueuePendingShareImport(planCodeItem)
        try await store.enqueuePendingShareImport(badFileItem)

        let results = try await importService.processPendingShareQueue(
            store: store,
            planShareService: planShareService,
            lang: .en
        )
        #expect(results.count == 4)

        let fetchedFile = try await store.fetchPendingShareImport(id: "share-file-1")
        #expect(fetchedFile?.status == .completed)
        let fetchedUrl = try await store.fetchPendingShareImport(id: "share-url-1")
        #expect(fetchedUrl?.status == .completed)
        let fetchedPlan = try await store.fetchPendingShareImport(id: "share-plan-1")
        #expect(fetchedPlan?.status == .completed)
        let fetchedBad = try await store.fetchPendingShareImport(id: "share-bad-1")
        #expect(fetchedBad?.status == .failed)
        #expect(fetchedBad?.errorMessage != nil)

        if case .success(.sharedPlan(let decoded)) = results[2].result {
            #expect(decoded.trip.name == "Gravel Bretagne")
        } else {
            Issue.record("Expected sharedPlan outcome for planCodeItem")
        }
    }

    @Test("Cancelling processPendingShareImport on .url item mid-fetch throws CancellationError and restores .pending status")
    func processPendingShareImportCancellationRestoresPending() async throws {
        let store = try CadenceModelContainer.makeStore(inMemory: true)
        let directStarted = ShareTestSignal()

        let (mockID, session) = M4CAsyncDelayURLProtocol.registerSession { request, _ in
            let url = try #require(request.url)
            if url.path.contains("/functions/v1/route-proxy") {
                return (0.0, M4CTestSupport.makeHTTPResponse(url: url, statusCode: 500), Data("{}".utf8))
            }
            directStarted.signal()
            let gpxData = Data(M4CTestSupport.makeSampleGpx().utf8)
            return (1.5, M4CTestSupport.makeHTTPResponse(url: url, statusCode: 200), gpxData)
        }
        defer { M4CAsyncDelayURLProtocol.unregister(id: mockID) }

        let config = SupabaseConfiguration(
            supabaseURL: URL(string: "https://example.supabase.co")!,
            supabaseAnonKey: "sb_publishable_test_key",
            urlSession: session
        )
        let importService = RouteImportService(
            urlSession: session,
            configuration: config,
            connectionKeyStore: InMemoryIntegrationKeyStore()
        )

        let urlItem = PendingShareImportDTO(
            id: "share-cancel-url-1",
            kind: .url,
            sourceUrl: "https://www.bikemap.net/en/r/9191/"
        )
        try await store.enqueuePendingShareImport(urlItem)

        let task = Task {
            try await importService.processPendingShareImport(urlItem, store: store)
        }

        await directStarted.wait()
        task.cancel()

        await #expect(throws: CancellationError.self) {
            _ = try await task.value
        }

        let fetched = try await store.fetchPendingShareImport(id: "share-cancel-url-1")
        #expect(fetched?.status != .failed)
        #expect(fetched?.status == .pending)
        #expect(fetched?.errorMessage == nil)
        #expect(fetched?.processedAt == nil)
    }

    @Test("M4CRequestTimeoutRunner clamps extreme/infinite timeoutSeconds without trapping")
    func requestTimeoutRunnerClampsInfinity() async throws {
        let (mockID, session) = MockURLProtocol.registerSession { request, _ in
            let url = try #require(request.url)
            return (M4CTestSupport.makeHTTPResponse(url: url, statusCode: 200), Data("ok".utf8))
        }
        defer { MockURLProtocol.unregister(id: mockID) }

        let req = URLRequest(url: URL(string: "https://example.com/health")!)
        let (data, response) = try await M4CRequestTimeoutRunner.perform(
            request: req,
            urlSession: session,
            timeoutSeconds: .infinity
        )
        #expect(response.statusCode == 200)
        #expect(String(data: data, encoding: .utf8) == "ok")
    }
}

private actor ShareTestSignal {
    private var signaled = false
    private var waiters: [CheckedContinuation<Void, Never>] = []

    nonisolated func signal() {
        Task { await self._signal() }
    }

    private func _signal() {
        guard !signaled else { return }
        signaled = true
        let current = waiters
        waiters.removeAll()
        for waiter in current {
            waiter.resume()
        }
    }

    func wait() async {
        if signaled { return }
        await withCheckedContinuation { continuation in
            waiters.append(continuation)
        }
    }
}
