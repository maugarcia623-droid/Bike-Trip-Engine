import Foundation
import Supabase

/// Thread-safe in-memory `AuthLocalStorage` for isolated tests or ephemeral sessions
/// (avoids macOS Keychain entitlement issues in `swift test`).
public final class InMemoryAuthLocalStorage: AuthLocalStorage, @unchecked Sendable {
    private let lock = NSLock()
    private var storage: [String: Data] = [:]

    public init() {}

    public func store(key: String, value: Data) throws {
        lock.lock()
        defer { lock.unlock() }
        storage[key] = value
    }

    public func retrieve(key: String) throws -> Data? {
        lock.lock()
        defer { lock.unlock() }
        return storage[key]
    }

    public func remove(key: String) throws {
        lock.lock()
        defer { lock.unlock() }
        storage.removeValue(forKey: key)
    }
}

public struct SupabaseConfiguration: Sendable {
    public static let defaultProjectURL = URL(string: "https://nymobftelxueitdkfpaz.supabase.co")!
    public static let defaultAnonKey = "sb_publishable_abdu1Js2BDbvZZQMg0Ip0g_Zp94vxKf"
    public static let defaultRedirectURL = URL(string: "cadence://oauth-callback")!

    public let supabaseURL: URL
    public let supabaseAnonKey: String
    public let redirectURL: URL
    public let urlSession: URLSession
    public let authStorage: (any AuthLocalStorage)?
    public let emitLocalSessionAsInitialSession: Bool

    public init(
        supabaseURL: URL = SupabaseConfiguration.resolveDefaultURL(),
        supabaseAnonKey: String = SupabaseConfiguration.resolveDefaultAnonKey(),
        redirectURL: URL = SupabaseConfiguration.defaultRedirectURL,
        urlSession: URLSession = .shared,
        authStorage: (any AuthLocalStorage)? = nil,
        emitLocalSessionAsInitialSession: Bool = true
    ) {
        self.supabaseURL = supabaseURL
        self.supabaseAnonKey = supabaseAnonKey
        self.redirectURL = redirectURL
        self.urlSession = urlSession
        self.authStorage = authStorage
        self.emitLocalSessionAsInitialSession = emitLocalSessionAsInitialSession
    }

    public static func resolveDefaultURL() -> URL {
        if let envValue = ProcessInfo.processInfo.environment["SUPABASE_URL"]?
            .trimmingCharacters(in: .whitespacesAndNewlines),
           !envValue.isEmpty,
           let url = URL(string: envValue) {
            return url
        }
        if let infoValue = Bundle.main.object(forInfoDictionaryKey: "SUPABASE_URL") as? String {
            let trimmed = infoValue.trimmingCharacters(in: .whitespacesAndNewlines)
            if !trimmed.isEmpty, let url = URL(string: trimmed) {
                return url
            }
        }
        return defaultProjectURL
    }

    public static func resolveDefaultAnonKey() -> String {
        if let envValue = ProcessInfo.processInfo.environment["SUPABASE_ANON_KEY"]?
            .trimmingCharacters(in: .whitespacesAndNewlines),
           !envValue.isEmpty {
            return envValue
        }
        if let infoValue = Bundle.main.object(forInfoDictionaryKey: "SUPABASE_ANON_KEY") as? String {
            let trimmed = infoValue.trimmingCharacters(in: .whitespacesAndNewlines)
            if !trimmed.isEmpty {
                return trimmed
            }
        }
        return defaultAnonKey
    }

    public func makeSupabaseClient() -> SupabaseClient {
        let authOptions: SupabaseClientOptions.AuthOptions
        if let authStorage {
            authOptions = SupabaseClientOptions.AuthOptions(
                storage: authStorage,
                redirectToURL: redirectURL,
                flowType: .pkce,
                emitLocalSessionAsInitialSession: emitLocalSessionAsInitialSession
            )
        } else {
            authOptions = SupabaseClientOptions.AuthOptions(
                redirectToURL: redirectURL,
                flowType: .pkce,
                emitLocalSessionAsInitialSession: emitLocalSessionAsInitialSession
            )
        }

        return SupabaseClient(
            supabaseURL: supabaseURL,
            supabaseKey: supabaseAnonKey,
            options: SupabaseClientOptions(
                db: .init(schema: "public"),
                auth: authOptions,
                global: .init(session: urlSession)
            )
        )
    }
}
