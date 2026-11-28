import Foundation

// MARK: - Integration Key & Status Storage

public protocol IntegrationConnectionKeyStore: Sendable {
    func getOrCreateConnectionKey() async -> String
}

public enum IntegrationKeyValidator {
    private static let uuidRegex = try! NSRegularExpression(
        pattern: "^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$",
        options: [.caseInsensitive]
    )

    public static func isValidUUID(_ value: String) -> Bool {
        let trimmed = value.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty else { return false }
        let range = NSRange(location: 0, length: trimmed.utf16.count)
        return uuidRegex.firstMatch(in: trimmed, options: [], range: range) != nil
    }
}

public actor InMemoryIntegrationKeyStore: IntegrationConnectionKeyStore {
    private var storedKey: String?

    public init(initialKey: String? = nil) {
        if let initialKey, IntegrationKeyValidator.isValidUUID(initialKey) {
            self.storedKey = initialKey.lowercased()
        } else {
            self.storedKey = nil
        }
    }

    public func getOrCreateConnectionKey() -> String {
        if let storedKey, IntegrationKeyValidator.isValidUUID(storedKey) {
            return storedKey
        }
        let created = UUID().uuidString.lowercased()
        storedKey = created
        return created
    }

    public func currentConnectionKey() -> String? {
        storedKey
    }
}

public actor UserDefaultsIntegrationKeyStore: IntegrationConnectionKeyStore {
    public static let defaultSuiteName = "group.cc.ridecadence.app"
    public static let defaultStorageKey = "cadence_integration_key_v1"

    public let suiteName: String
    public let storageKey: String
    private var fallbackEphemeralKey: String?

    public init(
        suiteName: String = UserDefaultsIntegrationKeyStore.defaultSuiteName,
        storageKey: String = UserDefaultsIntegrationKeyStore.defaultStorageKey
    ) {
        self.suiteName = suiteName
        self.storageKey = storageKey
    }

    public func getOrCreateConnectionKey() -> String {
        if let defaults = UserDefaults(suiteName: suiteName),
           let existing = defaults.string(forKey: storageKey),
           IntegrationKeyValidator.isValidUUID(existing) {
            return existing.lowercased()
        }

        let candidate: String
        if let fallbackEphemeralKey, IntegrationKeyValidator.isValidUUID(fallbackEphemeralKey) {
            candidate = fallbackEphemeralKey
        } else {
            candidate = UUID().uuidString.lowercased()
            fallbackEphemeralKey = candidate
        }

        if let defaults = UserDefaults(suiteName: suiteName) {
            defaults.set(candidate, forKey: storageKey)
        }
        return candidate
    }
}

public protocol IntegrationDataStore: Sendable {
    func loadData(forKey key: String) async -> Data?
    func saveData(_ data: Data?, forKey key: String) async
}

public actor InMemoryIntegrationDataStore: IntegrationDataStore {
    private var storage: [String: Data] = [:]

    public init(initialData: [String: Data] = [:]) {
        self.storage = initialData
    }

    public func loadData(forKey key: String) -> Data? {
        storage[key]
    }

    public func saveData(_ data: Data?, forKey key: String) {
        if let data {
            storage[key] = data
        } else {
            storage.removeValue(forKey: key)
        }
    }
}

public actor UserDefaultsIntegrationDataStore: IntegrationDataStore {
    public let suiteName: String

    public init(suiteName: String = UserDefaultsIntegrationKeyStore.defaultSuiteName) {
        self.suiteName = suiteName
    }

    public func loadData(forKey key: String) -> Data? {
        UserDefaults(suiteName: suiteName)?.data(forKey: key)
    }

    public func saveData(_ data: Data?, forKey key: String) {
        guard let defaults = UserDefaults(suiteName: suiteName) else { return }
        if let data {
            defaults.set(data, forKey: key)
        } else {
            defaults.removeObject(forKey: key)
        }
    }
}

// MARK: - Edge Function Client

public enum EdgeFunctionClientError: Error, Sendable, Equatable {
    case invalidURL
    case invalidResponse
    case timeout
    case httpError(statusCode: Int, body: String?)
    case decodingFailed(String)
}

public protocol EdgeFunctionInvoking: Sendable {
    func invoke<RequestBody: Encodable & Sendable, ResponseBody: Decodable & Sendable>(
        _ functionName: String,
        body: RequestBody,
        timeoutSeconds: TimeInterval
    ) async throws -> ResponseBody
}

public extension EdgeFunctionInvoking {
    func invoke<RequestBody: Encodable & Sendable, ResponseBody: Decodable & Sendable>(
        _ functionName: String,
        body: RequestBody
    ) async throws -> ResponseBody {
        try await invoke(functionName, body: body, timeoutSeconds: 15.0)
    }
}

public struct SupabaseEdgeFunctionClient: EdgeFunctionInvoking {
    public static let defaultTimeoutSeconds: TimeInterval = 15.0

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

    public static func isThreePartJWT(_ token: String) -> Bool {
        let parts = token.trimmingCharacters(in: .whitespacesAndNewlines).split(separator: ".", omittingEmptySubsequences: false)
        return parts.count == 3 && parts.allSatisfy { !$0.isEmpty }
    }

    public static func resolveAuthorizationBearerToken(
        supabaseAnonKey: String,
        userAccessToken: String?
    ) -> String? {
        if let userToken = userAccessToken?.trimmingCharacters(in: .whitespacesAndNewlines),
           !userToken.isEmpty {
            return userToken
        }
        let anonTrimmed = supabaseAnonKey.trimmingCharacters(in: .whitespacesAndNewlines)
        if isThreePartJWT(anonTrimmed) {
            return anonTrimmed
        }
        return nil
    }

    public func invoke<RequestBody: Encodable & Sendable, ResponseBody: Decodable & Sendable>(
        _ functionName: String,
        body: RequestBody,
        timeoutSeconds: TimeInterval = SupabaseEdgeFunctionClient.defaultTimeoutSeconds
    ) async throws -> ResponseBody {
        try Task.checkCancellation()

        let cleanName = functionName.trimmingCharacters(in: CharacterSet(charactersIn: "/"))
        guard !cleanName.isEmpty else {
            throw EdgeFunctionClientError.invalidURL
        }

        let endpointURL = configuration.supabaseURL
            .appendingPathComponent("functions")
            .appendingPathComponent("v1")
            .appendingPathComponent(cleanName)

        let bodyData = try JSONEncoder().encode(body)
        let clampedTimeout = max(0.01, timeoutSeconds)

        var request = URLRequest(url: endpointURL, timeoutInterval: max(0.1, clampedTimeout))
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue("application/json", forHTTPHeaderField: "Accept")
        request.setValue(configuration.supabaseAnonKey, forHTTPHeaderField: "apikey")

        let userToken = await authTokenProvider?()
        if let bearerToken = Self.resolveAuthorizationBearerToken(
            supabaseAnonKey: configuration.supabaseAnonKey,
            userAccessToken: userToken
        ) {
            request.setValue("Bearer \(bearerToken)", forHTTPHeaderField: "Authorization")
        }

        request.httpBody = bodyData

        let (data, httpResponse) = try await M4CRequestTimeoutRunner.perform(
            request: request,
            urlSession: configuration.urlSession,
            timeoutSeconds: clampedTimeout
        )

        guard (200...299).contains(httpResponse.statusCode) else {
            let text = String(data: data, encoding: .utf8)
            throw EdgeFunctionClientError.httpError(statusCode: httpResponse.statusCode, body: text)
        }

        do {
            return try JSONDecoder().decode(ResponseBody.self, from: data)
        } catch {
            throw EdgeFunctionClientError.decodingFailed(error.localizedDescription)
        }
    }
}

// MARK: - Shared Non-Blocking Request Timeout Helper

enum M4CRequestTimeoutRunner {
    static func perform(
        request: URLRequest,
        urlSession: URLSession,
        timeoutSeconds: TimeInterval
    ) async throws -> (Data, HTTPURLResponse) {
        try Task.checkCancellation()
        let clamped = min(86_400.0, max(0.005, timeoutSeconds))
        let timeoutDuration: Duration = .nanoseconds(Int64(clamped * 1_000_000_000))

        return try await withThrowingTaskGroup(of: (Data, HTTPURLResponse).self) { group in
            group.addTask {
                let (data, response) = try await urlSession.data(for: request)
                try Task.checkCancellation()
                guard let http = response as? HTTPURLResponse else {
                    throw EdgeFunctionClientError.invalidResponse
                }
                return (data, http)
            }

            group.addTask {
                try await Task.sleep(for: timeoutDuration)
                throw EdgeFunctionClientError.timeout
            }

            guard let first = try await group.next() else {
                throw EdgeFunctionClientError.timeout
            }
            group.cancelAll()
            return first
        }
    }
}
