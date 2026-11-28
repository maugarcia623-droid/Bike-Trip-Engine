import Foundation

public struct StravaConnectionStatus: Codable, Sendable, Equatable {
    public var connected: Bool
    public var athleteName: String?
    public var athleteId: String?
    public var error: String?

    public init(
        connected: Bool = false,
        athleteName: String? = nil,
        athleteId: String? = nil,
        error: String? = nil
    ) {
        self.connected = connected
        self.athleteName = athleteName
        self.athleteId = athleteId
        self.error = error
    }
}

public enum StravaAuthError: Error, Sendable, Equatable {
    case missingAuthorizeURL(reason: String)
    case invalidCallbackURL
    case networkError(String)
}

private struct StravaAuthRequestBody: Encodable, Sendable {
    let action: String
    let connectionKey: String
    let redirectOrigin: String?
}

private struct StravaAuthorizeResponse: Decodable, Sendable {
    let ok: Bool?
    let authorizeUrl: String?
    let reason: String?
}

private struct StravaStatusResponse: Decodable, Sendable {
    let ok: Bool?
    let connected: Bool?
    let athleteName: String?
    let athleteId: String?
    let reason: String?
}

private struct StravaDisconnectResponse: Decodable, Sendable {
    let ok: Bool?
    let connected: Bool?
}

/// Manages Strava OAuth connection, `cadence://oauth-callback` parsing, status streaming,
/// and disconnection via the `strava-auth` Edge Function (`v7`).
/// Mirrors `src/services/stravaIntegration.ts`.
public actor StravaAuthService {
    public static let defaultRedirectOrigin = "cadence://oauth-callback"
    public static let statusStorageKey = "cadence_strava_status_v1"

    private let edgeFunctionClient: any EdgeFunctionInvoking
    private let connectionKeyStore: any IntegrationConnectionKeyStore
    private let statusStore: any IntegrationDataStore

    private var currentStatus = StravaConnectionStatus(connected: false)
    private var didLoadPersistedStatus = false
    private var continuations: [UUID: AsyncStream<StravaConnectionStatus>.Continuation] = [:]

    public init(
        configuration: SupabaseConfiguration = SupabaseConfiguration(),
        authService: AuthService? = nil,
        authTokenProvider: (@Sendable () async -> String?)? = nil,
        connectionKeyStore: (any IntegrationConnectionKeyStore)? = nil,
        statusStore: (any IntegrationDataStore)? = nil,
        edgeFunctionClient: (any EdgeFunctionInvoking)? = nil
    ) {
        self.connectionKeyStore = connectionKeyStore ?? UserDefaultsIntegrationKeyStore()
        self.statusStore = statusStore ?? UserDefaultsIntegrationDataStore()
        self.edgeFunctionClient = edgeFunctionClient ?? SupabaseEdgeFunctionClient(
            configuration: configuration,
            authService: authService,
            authTokenProvider: authTokenProvider
        )
    }

    deinit {
        for continuation in continuations.values {
            continuation.finish()
        }
    }

    private func hydrateStatusIfNeeded() async {
        guard !didLoadPersistedStatus else { return }
        didLoadPersistedStatus = true
        if let data = await statusStore.loadData(forKey: Self.statusStorageKey),
           let decoded = try? JSONDecoder().decode(StravaConnectionStatus.self, from: data) {
            currentStatus = decoded
        }
    }

    private func updateAndPersistStatus(_ status: StravaConnectionStatus) async {
        didLoadPersistedStatus = true
        currentStatus = status
        if let data = try? JSONEncoder().encode(status) {
            await statusStore.saveData(data, forKey: Self.statusStorageKey)
        }
        for continuation in continuations.values {
            continuation.yield(status)
        }
    }

    private func removeContinuation(id: UUID) {
        continuations.removeValue(forKey: id)
    }

    public func cachedStatus() async -> StravaConnectionStatus {
        await hydrateStatusIfNeeded()
        return currentStatus
    }

    public func statusStream() async -> AsyncStream<StravaConnectionStatus> {
        await hydrateStatusIfNeeded()
        let id = UUID()
        let initial = currentStatus
        return AsyncStream { continuation in
            continuation.yield(initial)
            continuations[id] = continuation
            continuation.onTermination = { [weak self] _ in
                Task {
                    await self?.removeContinuation(id: id)
                }
            }
        }
    }

    public func integrationConnectionKey() async -> String {
        await connectionKeyStore.getOrCreateConnectionKey()
    }

    public func requestAuthorizeURL(
        redirectOrigin: String = StravaAuthService.defaultRedirectOrigin
    ) async throws -> URL {
        await hydrateStatusIfNeeded()
        let connectionKey = await connectionKeyStore.getOrCreateConnectionKey()
        let body = StravaAuthRequestBody(
            action: "authorize_url",
            connectionKey: connectionKey,
            redirectOrigin: redirectOrigin
        )

        do {
            let response: StravaAuthorizeResponse = try await edgeFunctionClient.invoke(
                "strava-auth",
                body: body
            )
            if response.ok == true,
               let rawAuthURL = response.authorizeUrl?.trimmingCharacters(in: .whitespacesAndNewlines),
               !rawAuthURL.isEmpty,
               let url = URL(string: rawAuthURL) {
                return url
            }

            let reason = (response.reason?.isEmpty == false) ? response.reason! : "oauth_failed"
            await updateAndPersistStatus(StravaConnectionStatus(connected: false, error: reason))
            throw StravaAuthError.missingAuthorizeURL(reason: reason)
        } catch let error as StravaAuthError {
            throw error
        } catch is CancellationError {
            throw CancellationError()
        } catch {
            await updateAndPersistStatus(StravaConnectionStatus(connected: false, error: "oauth_failed"))
            throw StravaAuthError.networkError(String(describing: error))
        }
    }

    @discardableResult
    public func handleOAuthCallback(_ url: URL) async -> StravaConnectionStatus? {
        guard url.scheme?.lowercased() == "cadence",
              url.host?.lowercased() == "oauth-callback",
              url.port == nil,
              url.user == nil,
              url.password == nil,
              (url.path.isEmpty || url.path == "/"),
              let components = URLComponents(url: url, resolvingAgainstBaseURL: false),
              components.port == nil,
              components.user == nil,
              components.password == nil else {
            return nil
        }

        let items = components.queryItems ?? []
        let connectedParam = items.first(where: { $0.name == "strava_connected" })?.value
        let athleteParam = items.first(where: { $0.name == "strava_athlete" })?.value
        let errorParam = items.first(where: { $0.name == "strava_error" })?.value

        if (connectedParam == nil || connectedParam?.isEmpty == true),
           (errorParam == nil || errorParam?.isEmpty == true) {
            return nil
        }

        if connectedParam == "1" {
            let trimmedAthlete = athleteParam?.trimmingCharacters(in: .whitespacesAndNewlines)
            let next = StravaConnectionStatus(
                connected: true,
                athleteName: (trimmedAthlete?.isEmpty == false) ? trimmedAthlete : nil,
                athleteId: nil,
                error: nil
            )
            await updateAndPersistStatus(next)
            return next
        }

        let resolvedError = (errorParam?.isEmpty == false) ? errorParam! : "oauth_failed"
        let next = StravaConnectionStatus(
            connected: false,
            athleteName: nil,
            athleteId: nil,
            error: resolvedError
        )
        await updateAndPersistStatus(next)
        return next
    }

    public func fetchConnectionStatus() async -> StravaConnectionStatus {
        await hydrateStatusIfNeeded()
        let connectionKey = await connectionKeyStore.getOrCreateConnectionKey()
        let body = StravaAuthRequestBody(
            action: "status",
            connectionKey: connectionKey,
            redirectOrigin: nil
        )

        do {
            let response: StravaStatusResponse = try await edgeFunctionClient.invoke(
                "strava-auth",
                body: body
            )
            guard response.ok == true else {
                return currentStatus
            }
            let next = StravaConnectionStatus(
                connected: response.connected ?? false,
                athleteName: response.athleteName,
                athleteId: response.athleteId,
                error: nil
            )
            await updateAndPersistStatus(next)
            return next
        } catch {
            return currentStatus
        }
    }

    @discardableResult
    public func disconnect() async -> Bool {
        await updateAndPersistStatus(StravaConnectionStatus(connected: false))
        let connectionKey = await connectionKeyStore.getOrCreateConnectionKey()
        let body = StravaAuthRequestBody(
            action: "disconnect",
            connectionKey: connectionKey,
            redirectOrigin: nil
        )

        do {
            let response: StravaDisconnectResponse = try await edgeFunctionClient.invoke(
                "strava-auth",
                body: body
            )
            return response.ok ?? true
        } catch {
            return false
        }
    }
}
