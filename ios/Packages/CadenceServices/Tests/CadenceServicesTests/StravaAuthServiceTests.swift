import Foundation
import Testing
@testable import CadenceServices

@Suite("StravaAuthService")
struct StravaAuthServiceTests {
    @Test("connectionKey persists stable UUID across calls and statusStore hydrates cached status")
    func connectionKeyAndCachedStatusPersistence() async {
        let keyStore = InMemoryIntegrationKeyStore()
        let dataStore = InMemoryIntegrationDataStore()

        let service1 = StravaAuthService(
            connectionKeyStore: keyStore,
            statusStore: dataStore
        )
        let k1 = await service1.integrationConnectionKey()
        let k2 = await service1.integrationConnectionKey()
        #expect(k1 == k2)
        #expect(IntegrationKeyValidator.isValidUUID(k1))

        let callback = URL(string: "cadence://oauth-callback?strava_connected=1&strava_athlete=Mau%20Rider")!
        let updated = await service1.handleOAuthCallback(callback)
        #expect(updated?.connected == true)
        #expect(updated?.athleteName == "Mau Rider")

        // Second instance sharing the same stores hydrates persisted status
        let service2 = StravaAuthService(
            connectionKeyStore: keyStore,
            statusStore: dataStore
        )
        let hydrated = await service2.cachedStatus()
        #expect(hydrated.connected == true)
        #expect(hydrated.athleteName == "Mau Rider")
    }

    @Test("requestAuthorizeURL sends expected action, connectionKey, redirectOrigin, and conditional Authorization JWT")
    func authorizeURLRequestAndJWTHeaders() async throws {
        struct CapturedRequest: Sendable {
            let auth: String?
            let apikey: String?
            let bodyData: Data?
        }
        let capturedRequests = BoxedList<CapturedRequest>()

        let (mockID, session) = MockURLProtocol.registerSession { request, bodyData in
            let url = try #require(request.url)
            capturedRequests.append(CapturedRequest(
                auth: request.value(forHTTPHeaderField: "Authorization"),
                apikey: request.value(forHTTPHeaderField: "apikey"),
                bodyData: bodyData
            ))
            return try M4CTestSupport.makeJSONResponse(url: url, object: [
                "ok": true,
                "authorizeUrl": "https://www.strava.com/oauth/authorize?client_id=123&state=xyz",
            ])
        }
        defer { MockURLProtocol.unregister(id: mockID) }

        let config = SupabaseConfiguration(
            supabaseURL: URL(string: "https://example.supabase.co")!,
            supabaseAnonKey: "sb_publishable_test_key",
            urlSession: session
        )
        let keyStore = InMemoryIntegrationKeyStore(initialKey: "22222222-2222-4222-8222-222222222222")

        // 1. Anonymous (sb_publishable_): no Authorization header
        let anonService = StravaAuthService(
            configuration: config,
            connectionKeyStore: keyStore,
            statusStore: InMemoryIntegrationDataStore()
        )
        let authURL = try await anonService.requestAuthorizeURL()
        #expect(authURL.host == "www.strava.com")

        // 2. Signed-in user JWT: Authorization Bearer <userJWT> IS sent
        let authedService = StravaAuthService(
            configuration: config,
            authTokenProvider: { "user-jwt-token-abc" },
            connectionKeyStore: keyStore,
            statusStore: InMemoryIntegrationDataStore()
        )
        _ = try await authedService.requestAuthorizeURL()

        let requests = capturedRequests.snapshot()
        #expect(requests.count == 2)
        #expect(requests[0].auth == nil)
        #expect(requests[0].apikey == "sb_publishable_test_key")
        let firstBody = try #require(M4CTestSupport.decodeJSONBody(requests[0].bodyData))
        #expect(firstBody["action"] as? String == "authorize_url")
        #expect(firstBody["connectionKey"] as? String == "22222222-2222-4222-8222-222222222222")
        #expect(firstBody["redirectOrigin"] as? String == "cadence://oauth-callback")

        #expect(requests[1].auth == "Bearer user-jwt-token-abc")
    }

    @Test("OAuth callbacks, statusStream updates, missing_strava_secrets error, status fallback, and disconnect")
    func callbacksStatusAndDisconnect() async throws {
        let mode = BoxedValue("secrets-error")
        let (mockID, session) = MockURLProtocol.registerSession { request, bodyData in
            let url = try #require(request.url)
            let body = M4CTestSupport.decodeJSONBody(bodyData) ?? [:]
            let action = body["action"] as? String

            if action == "authorize_url" {
                return try M4CTestSupport.makeJSONResponse(url: url, object: [
                    "ok": false,
                    "reason": "missing_strava_secrets",
                ])
            }
            if action == "status" {
                if mode.get() == "http-500" {
                    return (M4CTestSupport.makeHTTPResponse(url: url, statusCode: 500), Data("err".utf8))
                }
                return try M4CTestSupport.makeJSONResponse(url: url, object: [
                    "ok": true,
                    "connected": true,
                    "athleteName": "Jeanne Moreau",
                    "athleteId": "990011",
                ])
            }
            if action == "disconnect" {
                return try M4CTestSupport.makeJSONResponse(url: url, object: [
                    "ok": true,
                    "connected": false,
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
        let service = StravaAuthService(
            configuration: config,
            connectionKeyStore: InMemoryIntegrationKeyStore(),
            statusStore: InMemoryIntegrationDataStore()
        )

        let stream = await service.statusStream()
        let received = BoxedList<StravaConnectionStatus>()
        let collector = Task {
            for await status in stream {
                received.append(status)
                if received.snapshot().count >= 5 {
                    break
                }
            }
        }

        // 1. missing_strava_secrets error caches error and throws
        await #expect(throws: StravaAuthError.missingAuthorizeURL(reason: "missing_strava_secrets")) {
            try await service.requestAuthorizeURL()
        }

        // 2. Unrelated deep link ignored
        let ignored = await service.handleOAuthCallback(URL(string: "cadence://p/abc12345")!)
        #expect(ignored == nil)

        // 3. Error callback
        let errCallback = await service.handleOAuthCallback(URL(string: "cadence://oauth-callback?strava_error=access_denied")!)
        #expect(errCallback?.connected == false)
        #expect(errCallback?.error == "access_denied")

        // 4. Remote status fetch succeeds
        mode.set("connected")
        let status = await service.fetchConnectionStatus()
        #expect(status.connected == true)
        #expect(status.athleteName == "Jeanne Moreau")
        #expect(status.athleteId == "990011")

        // 5. Remote status HTTP 500 falls back to cached connected status
        mode.set("http-500")
        let fallbackStatus = await service.fetchConnectionStatus()
        #expect(fallbackStatus.connected == true)
        #expect(fallbackStatus.athleteName == "Jeanne Moreau")

        // 6. Disconnect optimistically clears & calls remote
        let disconnected = await service.disconnect()
        #expect(disconnected == true)
        let afterDisconnect = await service.cachedStatus()
        #expect(afterDisconnect.connected == false)

        await collector.value
        let history = received.snapshot()
        #expect(history.contains(where: { $0.error == "missing_strava_secrets" }))
        #expect(history.contains(where: { $0.error == "access_denied" }))
        #expect(history.contains(where: { $0.connected == true && $0.athleteId == "990011" }))
        #expect(history.last?.connected == false)
    }

    @Test("handleOAuthCallback strictly requires cadence://oauth-callback and rejects spoofed schemes, hosts, paths, ports, and userinfo")
    func rejectsSpoofedOAuthCallbacks() async {
        let dataStore = InMemoryIntegrationDataStore()
        let service = StravaAuthService(
            connectionKeyStore: InMemoryIntegrationKeyStore(),
            statusStore: dataStore
        )

        let stream = await service.statusStream()
        let received = BoxedList<StravaConnectionStatus>()
        let collector = Task {
            for await status in stream {
                received.append(status)
                if received.snapshot().count >= 2 {
                    break
                }
            }
        }

        let spoofedURLs = [
            "https://evil.com/phish?strava_connected=1&strava_athlete=Attacker",
            "http://evil.com/phish?strava_connected=1&strava_athlete=Attacker",
            "cadence://evil-host?strava_connected=1&strava_athlete=Attacker",
            "cadence://oauth-callback/evil?strava_connected=1&strava_athlete=Attacker",
            "cadence://user@oauth-callback?strava_connected=1",
            "cadence://oauth-callback:8443?strava_connected=1",
            "https://evil.com/phish?strava_error=spoofed",
        ]

        for raw in spoofedURLs {
            let result = await service.handleOAuthCallback(URL(string: raw)!)
            #expect(result == nil)
        }

        let cachedAfterSpoof = await service.cachedStatus()
        #expect(cachedAfterSpoof == StravaConnectionStatus(connected: false))
        #expect(await dataStore.loadData(forKey: StravaAuthService.statusStorageKey) == nil)

        // Trailing slash on exact cadence://oauth-callback/ is accepted
        let validTrailingSlash = await service.handleOAuthCallback(
            URL(string: "cadence://oauth-callback/?strava_connected=1&strava_athlete=Legit%20Rider")!
        )
        #expect(validTrailingSlash?.connected == true)
        #expect(validTrailingSlash?.athleteName == "Legit Rider")

        await collector.value
        let emissions = received.snapshot()
        #expect(emissions.count == 2)
        #expect(emissions[0].connected == false)
        #expect(emissions[1].connected == true)
        #expect(emissions[1].athleteName == "Legit Rider")
    }
}
