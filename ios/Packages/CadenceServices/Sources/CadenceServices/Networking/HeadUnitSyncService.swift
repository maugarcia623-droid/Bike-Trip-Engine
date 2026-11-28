import Foundation
import CadenceCore

public enum HeadUnitProvider: String, Codable, Sendable, CaseIterable, Equatable {
    case wahoo
    case hammerhead
    case garmin
}

public struct HeadUnitStatuses: Codable, Sendable, Equatable {
    public var wahoo: Bool
    public var hammerhead: Bool
    public var garmin: Bool
    public var lastError: String?
    public var lastErrorProvider: HeadUnitProvider?

    public init(
        wahoo: Bool = false,
        hammerhead: Bool = false,
        garmin: Bool = false,
        lastError: String? = nil,
        lastErrorProvider: HeadUnitProvider? = nil
    ) {
        self.wahoo = wahoo
        self.hammerhead = hammerhead
        self.garmin = garmin
        self.lastError = lastError
        self.lastErrorProvider = lastErrorProvider
    }

    public subscript(provider: HeadUnitProvider) -> Bool {
        get {
            switch provider {
            case .wahoo: return wahoo
            case .hammerhead: return hammerhead
            case .garmin: return garmin
            }
        }
        set {
            switch provider {
            case .wahoo: wahoo = newValue
            case .hammerhead: hammerhead = newValue
            case .garmin: garmin = newValue
            }
        }
    }
}

public struct HeadUnitPushResult: Codable, Sendable, Equatable {
    public var ok: Bool
    public var reason: String?
    public var externalId: String?

    public init(ok: Bool, reason: String? = nil, externalId: String? = nil) {
        self.ok = ok
        self.reason = reason
        self.externalId = externalId
    }
}

public enum HeadUnitSyncError: Error, Sendable, Equatable {
    case pushDisabled
    case missingAuthorizeURL(reason: String)
    case networkError(String)
}

private struct HeadUnitAuthRequestBody: Encodable, Sendable {
    let action: String
    let connectionKey: String
    let provider: String?
    let redirectOrigin: String?
}

private struct HeadUnitAuthorizeResponse: Decodable, Sendable {
    let ok: Bool?
    let authorizeUrl: String?
    let reason: String?
}

private struct HeadUnitStatusMapResponse: Decodable, Sendable {
    let wahoo: Bool?
    let hammerhead: Bool?
    let garmin: Bool?
}

private struct HeadUnitStatusResponse: Decodable, Sendable {
    let ok: Bool?
    let statuses: HeadUnitStatusMapResponse?
}

private struct HeadUnitDisconnectResponse: Decodable, Sendable {
    let ok: Bool?
    let disconnected: String?
}

private struct PushCourseRequestBody: Encodable, Sendable {
    let provider: String
    let connectionKey: String
    let fileName: String
    let courseName: String
    let contentBase64: String
}

private struct PushCourseResponse: Decodable, Sendable {
    let ok: Bool?
    let reason: String?
    let externalId: String?
}

/// Manages Wahoo / Hammerhead / Garmin OAuth connections and `.fit` course pushes
/// via the `headunit-auth` (`v4`) and `push-course` Edge Functions.
/// Preserves `headUnitPushEnabled = false` (`HEADUNIT_PUSH_ENABLED = false`) default gate.
/// Mirrors `src/services/headUnitIntegration.ts`.
public actor HeadUnitSyncService {
    public static let headUnitPushEnabled = false
    public static let defaultRedirectOrigin = "cadence://oauth-callback"
    public static let statusStorageKey = "cadence_headunit_status_v1"

    public let isPushEnabled: Bool

    private let edgeFunctionClient: any EdgeFunctionInvoking
    private let connectionKeyStore: any IntegrationConnectionKeyStore
    private let statusStore: any IntegrationDataStore

    private var currentStatuses = HeadUnitStatuses()
    private var didLoadPersistedStatuses = false
    private var continuations: [UUID: AsyncStream<HeadUnitStatuses>.Continuation] = [:]

    public init(
        configuration: SupabaseConfiguration = SupabaseConfiguration(),
        isPushEnabled: Bool = HeadUnitSyncService.headUnitPushEnabled,
        authService: AuthService? = nil,
        authTokenProvider: (@Sendable () async -> String?)? = nil,
        connectionKeyStore: (any IntegrationConnectionKeyStore)? = nil,
        statusStore: (any IntegrationDataStore)? = nil,
        edgeFunctionClient: (any EdgeFunctionInvoking)? = nil
    ) {
        self.isPushEnabled = isPushEnabled
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

    private func hydrateStatusesIfNeeded() async {
        guard !didLoadPersistedStatuses else { return }
        didLoadPersistedStatuses = true
        if let data = await statusStore.loadData(forKey: Self.statusStorageKey),
           let decoded = try? JSONDecoder().decode(HeadUnitStatuses.self, from: data) {
            currentStatuses = decoded
        }
    }

    private func updateAndPersistStatuses(_ statuses: HeadUnitStatuses) async {
        didLoadPersistedStatuses = true
        currentStatuses = statuses
        if let data = try? JSONEncoder().encode(statuses) {
            await statusStore.saveData(data, forKey: Self.statusStorageKey)
        }
        for continuation in continuations.values {
            continuation.yield(statuses)
        }
    }

    private func removeContinuation(id: UUID) {
        continuations.removeValue(forKey: id)
    }

    public func cachedStatuses() async -> HeadUnitStatuses {
        await hydrateStatusesIfNeeded()
        return currentStatuses
    }

    public func statusStream() async -> AsyncStream<HeadUnitStatuses> {
        await hydrateStatusesIfNeeded()
        let id = UUID()
        let initial = currentStatuses
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
        provider: HeadUnitProvider,
        redirectOrigin: String = HeadUnitSyncService.defaultRedirectOrigin
    ) async throws -> URL {
        guard isPushEnabled else {
            throw HeadUnitSyncError.pushDisabled
        }

        await hydrateStatusesIfNeeded()
        let connectionKey = await connectionKeyStore.getOrCreateConnectionKey()
        let body = HeadUnitAuthRequestBody(
            action: "authorize_url",
            connectionKey: connectionKey,
            provider: provider.rawValue,
            redirectOrigin: redirectOrigin
        )

        do {
            let response: HeadUnitAuthorizeResponse = try await edgeFunctionClient.invoke(
                "headunit-auth",
                body: body
            )
            if response.ok == true,
               let rawURL = response.authorizeUrl?.trimmingCharacters(in: .whitespacesAndNewlines),
               !rawURL.isEmpty,
               let url = URL(string: rawURL) {
                return url
            }

            let reason = (response.reason?.isEmpty == false) ? response.reason! : "oauth_failed"
            var next = currentStatuses
            next.lastError = reason
            next.lastErrorProvider = provider
            await updateAndPersistStatuses(next)
            throw HeadUnitSyncError.missingAuthorizeURL(reason: reason)
        } catch let error as HeadUnitSyncError {
            throw error
        } catch is CancellationError {
            throw CancellationError()
        } catch {
            var next = currentStatuses
            next.lastError = "oauth_failed"
            next.lastErrorProvider = provider
            await updateAndPersistStatuses(next)
            throw HeadUnitSyncError.networkError(String(describing: error))
        }
    }

    @discardableResult
    public func handleOAuthCallback(_ url: URL) async -> HeadUnitStatuses? {
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
        let connectedRaw = items.first(where: { $0.name == "headunit_connected" })?.value
        let errorCode = items.first(where: { $0.name == "headunit_error" })?.value
        let errorProviderRaw = items.first(where: { $0.name == "headunit_provider" })?.value

        if (connectedRaw == nil || connectedRaw?.isEmpty == true),
           (errorCode == nil || errorCode?.isEmpty == true) {
            return nil
        }

        await hydrateStatusesIfNeeded()
        var next = currentStatuses

        if let connectedRaw,
           let provider = HeadUnitProvider(rawValue: connectedRaw.lowercased()) {
            next[provider] = true
            next.lastError = nil
            next.lastErrorProvider = nil
            await updateAndPersistStatuses(next)
            return next
        }

        next.lastError = (errorCode?.isEmpty == false) ? errorCode : "oauth_failed"
        next.lastErrorProvider = errorProviderRaw.flatMap { HeadUnitProvider(rawValue: $0.lowercased()) }
        await updateAndPersistStatuses(next)
        return next
    }

    public func fetchStatuses() async -> HeadUnitStatuses {
        await hydrateStatusesIfNeeded()
        let connectionKey = await connectionKeyStore.getOrCreateConnectionKey()
        let body = HeadUnitAuthRequestBody(
            action: "status",
            connectionKey: connectionKey,
            provider: nil,
            redirectOrigin: nil
        )

        do {
            let response: HeadUnitStatusResponse = try await edgeFunctionClient.invoke(
                "headunit-auth",
                body: body
            )
            guard response.ok == true, let statuses = response.statuses else {
                return currentStatuses
            }
            let next = HeadUnitStatuses(
                wahoo: statuses.wahoo ?? false,
                hammerhead: statuses.hammerhead ?? false,
                garmin: statuses.garmin ?? false
            )
            await updateAndPersistStatuses(next)
            return next
        } catch {
            return currentStatuses
        }
    }

    @discardableResult
    public func disconnect(provider: HeadUnitProvider) async -> Bool {
        await hydrateStatusesIfNeeded()
        var next = currentStatuses
        next[provider] = false
        await updateAndPersistStatuses(next)

        let connectionKey = await connectionKeyStore.getOrCreateConnectionKey()
        let body = HeadUnitAuthRequestBody(
            action: "disconnect",
            connectionKey: connectionKey,
            provider: provider.rawValue,
            redirectOrigin: nil
        )

        do {
            let response: HeadUnitDisconnectResponse = try await edgeFunctionClient.invoke(
                "headunit-auth",
                body: body
            )
            return response.ok ?? true
        } catch {
            return false
        }
    }

    public nonisolated static func sanitizeCourseFileName(tripName: String, distanceKm: Double) -> String {
        let rawBase = (tripName.isEmpty ? "cadence-route" : tripName).lowercased()
        let replaced = rawBase.replacingOccurrences(
            of: #"[^a-z0-9_-]+"#,
            with: "-",
            options: [.regularExpression, .caseInsensitive]
        )
        let trimmed = replaced.replacingOccurrences(
            of: #"^-+|-+$"#,
            with: "",
            options: [.regularExpression]
        )
        let baseName = trimmed.isEmpty ? "cadence-route" : trimmed
        let cleanKm = distanceKm.isFinite ? JSCompat.jsRoundInt(distanceKm) : 0
        return "\(baseName)-\(cleanKm)km.fit"
    }

    public func pushCourse(
        trip: TripProfile,
        to provider: HeadUnitProvider,
        options: FitExportOptions = FitExportOptions(),
        riderSpecs: RiderBikeSpecs = .defaultSpecs
    ) async -> HeadUnitPushResult {
        guard isPushEnabled else {
            return HeadUnitPushResult(ok: false, reason: "headunit_push_disabled")
        }

        let fitData = FitExporterEngine.exportTripToFit(
            trip,
            options: options,
            riderSpecs: riderSpecs
        )
        let contentBase64 = fitData.base64EncodedString()
        let fileName = Self.sanitizeCourseFileName(
            tripName: trip.name,
            distanceKm: trip.route.distanceKm
        )
        let courseName = trip.name.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
            ? "Cadence Route"
            : trip.name

        let connectionKey = await connectionKeyStore.getOrCreateConnectionKey()
        let body = PushCourseRequestBody(
            provider: provider.rawValue,
            connectionKey: connectionKey,
            fileName: fileName,
            courseName: courseName,
            contentBase64: contentBase64
        )

        do {
            let response: PushCourseResponse = try await edgeFunctionClient.invoke(
                "push-course",
                body: body
            )
            if response.ok == true {
                return HeadUnitPushResult(ok: true, reason: nil, externalId: response.externalId)
            }
            return HeadUnitPushResult(
                ok: false,
                reason: (response.reason?.isEmpty == false) ? response.reason : "push_failed",
                externalId: nil
            )
        } catch EdgeFunctionClientError.httpError(_, let rawBody) {
            if let rawBody,
               let data = rawBody.data(using: .utf8),
               let parsed = try? JSONDecoder().decode(PushCourseResponse.self, from: data),
               let reason = parsed.reason,
               !reason.isEmpty {
                return HeadUnitPushResult(ok: false, reason: reason)
            }
            return HeadUnitPushResult(ok: false, reason: "push_failed")
        } catch {
            return HeadUnitPushResult(ok: false, reason: "push_failed")
        }
    }
}
