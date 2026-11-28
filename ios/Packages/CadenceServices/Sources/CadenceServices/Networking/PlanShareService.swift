import Foundation
import CadenceCore

public struct ShortPlanShareResult: Sendable, Equatable {
    public var url: URL
    public var code: String?
    public var isShort: Bool

    public init(url: URL, code: String?, isShort: Bool) {
        self.url = url
        self.code = code
        self.isShort = isShort
    }
}

public struct CreateSharedPlanParams: Encodable, Sendable, Equatable {
    public let p_token: String
    public let p_title: String
    public let p_summary: String
    public let p_distance_km: Double
    public let p_elevation_m: Int
    public let p_stage_count: Int

    public init(
        p_token: String,
        p_title: String,
        p_summary: String,
        p_distance_km: Double,
        p_elevation_m: Int,
        p_stage_count: Int
    ) {
        self.p_token = p_token
        self.p_title = p_title
        self.p_summary = p_summary
        self.p_distance_km = p_distance_km
        self.p_elevation_m = p_elevation_m
        self.p_stage_count = p_stage_count
    }
}

public struct SharedPlanRow: Codable, Sendable, Equatable {
    public let code: String
    public let token: String
    public let title: String?
    public let summary: String?
    public let distanceKm: Double?
    public let elevationM: Int?
    public let stageCount: Int?
    public let createdAt: String?

    enum CodingKeys: String, CodingKey {
        case code
        case token
        case title
        case summary
        case distanceKm = "distance_km"
        case elevationM = "elevation_m"
        case stageCount = "stage_count"
        case createdAt = "created_at"
    }

    public init(
        code: String,
        token: String,
        title: String? = nil,
        summary: String? = nil,
        distanceKm: Double? = nil,
        elevationM: Int? = nil,
        stageCount: Int? = nil,
        createdAt: String? = nil
    ) {
        self.code = code
        self.token = token
        self.title = title
        self.summary = summary
        self.distanceKm = distanceKm
        self.elevationM = elevationM
        self.stageCount = stageCount
        self.createdAt = createdAt
    }
}

public enum PlanShareRPCError: Error, Sendable, Equatable {
    case invalidURL
    case httpError(statusCode: Int, body: String?)
    case decodingFailed(String)
}

public protocol PlanShareRPCTransport: Sendable {
    func createSharedPlan(
        params: CreateSharedPlanParams,
        timeoutSeconds: TimeInterval
    ) async throws -> String

    func getSharedPlan(
        code: String,
        timeoutSeconds: TimeInterval
    ) async throws -> [SharedPlanRow]
}

public struct SupabasePlanShareRPCTransport: PlanShareRPCTransport {
    public let configuration: SupabaseConfiguration
    public let authTokenProvider: (@Sendable () async -> String?)?

    public init(
        configuration: SupabaseConfiguration = SupabaseConfiguration(),
        authService: AuthService? = nil,
        authTokenProvider: (@Sendable () async -> String?)? = nil
    ) {
        self.configuration = configuration
        if let authTokenProvider {
            self.authTokenProvider = authTokenProvider
        } else if let authService {
            self.authTokenProvider = {
                await authService.currentSession()?.accessToken
            }
        } else {
            self.authTokenProvider = nil
        }
    }

    public func createSharedPlan(
        params: CreateSharedPlanParams,
        timeoutSeconds: TimeInterval
    ) async throws -> String {
        let endpointURL = configuration.supabaseURL
            .appendingPathComponent("rest")
            .appendingPathComponent("v1")
            .appendingPathComponent("rpc")
            .appendingPathComponent("create_shared_plan")

        let data = try await postRPC(
            url: endpointURL,
            body: params,
            timeoutSeconds: timeoutSeconds
        )

        if let decoded = try? JSONDecoder().decode(String.self, from: data) {
            return decoded
        }
        if let raw = String(data: data, encoding: .utf8) {
            let trimmed = raw.trimmingCharacters(in: .whitespacesAndNewlines)
            if trimmed.hasPrefix("\""), trimmed.hasSuffix("\""), trimmed.count >= 2 {
                return String(trimmed.dropFirst().dropLast())
            }
            return trimmed
        }
        throw PlanShareRPCError.decodingFailed("Empty create_shared_plan response")
    }

    public func getSharedPlan(
        code: String,
        timeoutSeconds: TimeInterval
    ) async throws -> [SharedPlanRow] {
        let endpointURL = configuration.supabaseURL
            .appendingPathComponent("rest")
            .appendingPathComponent("v1")
            .appendingPathComponent("rpc")
            .appendingPathComponent("get_shared_plan")

        let data = try await postRPC(
            url: endpointURL,
            body: ["p_code": code],
            timeoutSeconds: timeoutSeconds
        )

        if let rows = try? JSONDecoder().decode([SharedPlanRow].self, from: data) {
            return rows
        }
        if let single = try? JSONDecoder().decode(SharedPlanRow.self, from: data) {
            return [single]
        }
        throw PlanShareRPCError.decodingFailed("Invalid get_shared_plan response")
    }

    private func postRPC<Body: Encodable>(
        url: URL,
        body: Body,
        timeoutSeconds: TimeInterval
    ) async throws -> Data {
        try Task.checkCancellation()
        let clampedTimeout = max(0.01, timeoutSeconds)

        var request = URLRequest(url: url, timeoutInterval: max(0.1, clampedTimeout))
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue("application/json", forHTTPHeaderField: "Accept")
        request.setValue(configuration.supabaseAnonKey, forHTTPHeaderField: "apikey")

        let userToken = await authTokenProvider?()
        if let bearer = SupabaseEdgeFunctionClient.resolveAuthorizationBearerToken(
            supabaseAnonKey: configuration.supabaseAnonKey,
            userAccessToken: userToken
        ) {
            request.setValue("Bearer \(bearer)", forHTTPHeaderField: "Authorization")
        }

        request.httpBody = try JSONEncoder().encode(body)

        let (data, httpResponse) = try await M4CRequestTimeoutRunner.perform(
            request: request,
            urlSession: configuration.urlSession,
            timeoutSeconds: clampedTimeout
        )

        guard (200...299).contains(httpResponse.statusCode) else {
            let text = String(data: data, encoding: .utf8)
            throw PlanShareRPCError.httpError(statusCode: httpResponse.statusCode, body: text)
        }
        return data
    }
}

/// Persists compact shared plans via `create_shared_plan`, resolves `/p/<code>` links via
/// `get_shared_plan`, coalesces concurrent creates, and falls back to inline `?plan=<token>`.
/// Mirrors `src/services/planShareService.ts`.
public actor PlanShareService {
    public static let createTimeoutSeconds: TimeInterval = 4.5
    public static let resolveTimeoutSeconds: TimeInterval = 6.5
    public static let defaultBaseURL = URL(string: "https://cadence.app")!

    private static let shortCodeRegex = try! NSRegularExpression(
        pattern: "^[a-z0-9]{6,16}$",
        options: [.caseInsensitive]
    )

    private let transport: any PlanShareRPCTransport
    private let createTimeoutSeconds: TimeInterval
    private let resolveTimeoutSeconds: TimeInterval

    private var tokenToShortCodeCache: [String: String] = [:]
    private var inFlightCreateByToken: [String: (id: UUID, flight: CoalescedFlight<String?>)] = [:]

    public init(
        configuration: SupabaseConfiguration = SupabaseConfiguration(),
        authService: AuthService? = nil,
        authTokenProvider: (@Sendable () async -> String?)? = nil,
        transport: (any PlanShareRPCTransport)? = nil,
        createTimeoutSeconds: TimeInterval = PlanShareService.createTimeoutSeconds,
        resolveTimeoutSeconds: TimeInterval = PlanShareService.resolveTimeoutSeconds
    ) {
        self.transport = transport ?? SupabasePlanShareRPCTransport(
            configuration: configuration,
            authService: authService,
            authTokenProvider: authTokenProvider
        )
        self.createTimeoutSeconds = max(0.01, createTimeoutSeconds)
        self.resolveTimeoutSeconds = max(0.01, resolveTimeoutSeconds)
    }

    // MARK: - Pure URL & Code Helpers

    public nonisolated static func isValidShortCode(_ code: String) -> Bool {
        let trimmed = code.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty else { return false }
        let range = NSRange(location: 0, length: trimmed.utf16.count)
        return shortCodeRegex.firstMatch(in: trimmed, options: [], range: range) != nil
    }

    public nonisolated static func extractSharedPlanRef(from url: URL) -> ExtractedSharedPlanRef? {
        if url.scheme?.lowercased() == "cadence",
           url.host?.lowercased() == "p" {
            let trimmedCode = url.path.trimmingCharacters(in: CharacterSet(charactersIn: "/")).lowercased()
            if isValidShortCode(trimmedCode) {
                return ExtractedSharedPlanRef(kind: "short", code: trimmedCode)
            }
        }

        return PlanShareCodec.extractSharedPlanFromLocation(
            pathname: url.path,
            search: url.query ?? "",
            hash: url.fragment ?? ""
        )
    }

    // MARK: - RPC Operations

    public func createShortShareURL(
        trip: TripProfile,
        extras: PlanShareExtras = PlanShareExtras(),
        baseURL: URL = PlanShareService.defaultBaseURL
    ) async -> ShortPlanShareResult {
        let token = PlanShareCodec.encodePlanShareToken(trip, extras: extras)
        let meta = PlanShareCodec.buildPlanShareSummaryMeta(trip, extras: extras)

        let code = await requestShortCodeForToken(token: token, meta: meta)
        let baseString = baseURL.absoluteString

        if let code {
            let shortURLString = PlanShareCodec.buildShortPlanShareUrl(code, baseUrl: baseString)
            if let shortURL = URL(string: shortURLString) {
                return ShortPlanShareResult(url: shortURL, code: code, isShort: true)
            }
        }

        let inlineBase = baseString.hasSuffix("/") ? baseString : "\(baseString)/"
        let fallbackString = PlanShareCodec.buildPlanShareUrl(trip, extras: extras, baseUrl: inlineBase)
        let fallbackURL = URL(string: fallbackString) ?? baseURL
        return ShortPlanShareResult(url: fallbackURL, code: nil, isShort: false)
    }

    private func requestShortCodeForToken(
        token: String,
        meta: PlanShareSummaryMeta
    ) async -> String? {
        if let cached = tokenToShortCodeCache[token] {
            return cached
        }

        while true {
            if let existing = inFlightCreateByToken[token] {
                if let waiterID = existing.flight.tryReserveWaiter() {
                    do {
                        switch try await existing.flight.awaitResult(waiterID: waiterID) {
                        case .value(let code):
                            return code
                        case .abortedByCancellation:
                            if Task.isCancelled { return nil }
                            continue
                        }
                    } catch {
                        return nil
                    }
                }
                await Task.yield()
                continue
            }

            let requestID = UUID()
            let transportRef = self.transport
            let timeoutSec = self.createTimeoutSeconds
            let flight = CoalescedFlight<String?>(onCancelFlight: { [weak self] in
                Task {
                    await self?.clearInFlight(token: token, id: requestID)
                }
            })
            guard let waiterID = flight.tryReserveWaiter() else {
                continue
            }
            inFlightCreateByToken[token] = (id: requestID, flight: flight)

            let params = CreateSharedPlanParams(
                p_token: token,
                p_title: meta.title,
                p_summary: meta.summary,
                p_distance_km: meta.distanceKm,
                p_elevation_m: meta.elevationM,
                p_stage_count: meta.stageCount
            )

            flight.start { [weak self] in
                do {
                    let rawCode = try await transportRef.createSharedPlan(
                        params: params,
                        timeoutSeconds: timeoutSec
                    )
                    let cleanCode = rawCode.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
                    guard Self.isValidShortCode(cleanCode) else {
                        await self?.clearInFlight(token: token, id: requestID)
                        return nil
                    }
                    await self?.finishCreateSuccess(code: cleanCode, forToken: token, id: requestID)
                    return cleanCode
                } catch is CancellationError {
                    await self?.clearInFlight(token: token, id: requestID)
                    throw CancellationError()
                } catch {
                    await self?.clearInFlight(token: token, id: requestID)
                    return nil
                }
            }

            do {
                switch try await flight.awaitResult(waiterID: waiterID) {
                case .value(let code):
                    return code
                case .abortedByCancellation:
                    if Task.isCancelled { return nil }
                    continue
                }
            } catch {
                return nil
            }
        }
    }

    private func finishCreateSuccess(code: String, forToken token: String, id: UUID) {
        tokenToShortCodeCache[token] = code
        if inFlightCreateByToken[token]?.id == id {
            inFlightCreateByToken.removeValue(forKey: token)
        }
    }

    private func clearInFlight(token: String, id: UUID) {
        if inFlightCreateByToken[token]?.id == id {
            inFlightCreateByToken.removeValue(forKey: token)
        }
    }

    public func resolveShortPlanToken(code: String) async -> String? {
        let cleanCode = code.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
        guard Self.isValidShortCode(cleanCode) else {
            return nil
        }

        do {
            let rows = try await transport.getSharedPlan(
                code: cleanCode,
                timeoutSeconds: resolveTimeoutSeconds
            )
            guard let first = rows.first else {
                return nil
            }
            let token = first.token.trimmingCharacters(in: .whitespacesAndNewlines)
            return token.count >= 10 ? token : nil
        } catch {
            return nil
        }
    }

    public func resolveAndDecodeSharedPlan(
        from url: URL,
        lang: CadenceLang = .en,
        receiverSpecs: RiderBikeSpecs? = nil,
        now: Date = Date()
    ) async -> SharedPlanDecodeResult? {
        guard let ref = Self.extractSharedPlanRef(from: url) else {
            return nil
        }

        let token: String?
        switch ref.kind {
        case "short":
            guard let code = ref.code else { return nil }
            token = await resolveShortPlanToken(code: code)
        case "token":
            token = ref.token
        default:
            token = nil
        }

        guard let token,
              var decoded = PlanShareCodec.decodePlanShareToken(token, lang: lang, now: now) else {
            return nil
        }

        if let receiverSpecs {
            decoded.trip = PlanShareCodec.applyPersonalLensToSharedTrip(
                decoded.trip,
                receiverSpecs: receiverSpecs,
                options: PersonalLensOptions(lang: lang, now: now)
            )
        }

        return decoded
    }
}
