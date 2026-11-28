import Foundation
import CryptoKit
import Supabase
#if canImport(AuthenticationServices)
import AuthenticationServices
#endif
#if canImport(UIKit)
import UIKit
#elseif canImport(AppKit)
import AppKit
#endif

// MARK: - Auth DTOs & State

public struct AuthUser: Codable, Sendable, Equatable, Identifiable {
    public let id: UUID
    public let email: String?
    public let createdAt: Date?

    public init(id: UUID, email: String?, createdAt: Date? = nil) {
        self.id = id
        self.email = email
        self.createdAt = createdAt
    }
}

public struct AuthSession: Codable, Sendable, Equatable {
    public let accessToken: String
    public let refreshToken: String
    public let expiresAt: TimeInterval
    public let user: AuthUser

    public var isExpired: Bool {
        Date(timeIntervalSince1970: expiresAt) <= Date()
    }

    public init(accessToken: String, refreshToken: String, expiresAt: TimeInterval, user: AuthUser) {
        self.accessToken = accessToken
        self.refreshToken = refreshToken
        self.expiresAt = expiresAt
        self.user = user
    }
}

public enum AuthEvent: String, Sendable, Equatable {
    case initialSession
    case signedIn
    case signedOut
    case tokenRefreshed
    case userUpdated
    case passwordRecovery
}

public enum AuthState: Sendable, Equatable {
    case loading
    case signedOut
    case signedIn(AuthSession)

    public var session: AuthSession? {
        if case .signedIn(let s) = self { return s }
        return nil
    }
}

public struct SignUpResult: Sendable, Equatable {
    public let user: AuthUser
    public let session: AuthSession?
    public let isEmailConfirmationPending: Bool

    public init(user: AuthUser, session: AuthSession?, isEmailConfirmationPending: Bool) {
        self.user = user
        self.session = session
        self.isEmailConfirmationPending = isEmailConfirmationPending
    }
}

public enum AuthServiceError: Error, Sendable, Equatable, LocalizedError {
    case invalidEmail
    case invalidPassword
    case applePresenterUnavailable
    case appleCredentialMissingToken
    case appleAuthorizationCancelled
    case appleAuthorizationFailed(String)
    case unsupportedCallbackURL

    public var errorDescription: String? {
        switch self {
        case .invalidEmail:
            return "Email address cannot be empty."
        case .invalidPassword:
            return "Password cannot be empty."
        case .applePresenterUnavailable:
            return "Sign in with Apple presenter is unavailable."
        case .appleCredentialMissingToken:
            return "Apple ID credential did not contain an identity token."
        case .appleAuthorizationCancelled:
            return "Sign in with Apple was cancelled."
        case .appleAuthorizationFailed(let message):
            return "Sign in with Apple failed: \(message)"
        case .unsupportedCallbackURL:
            return "Unsupported auth callback URL."
        }
    }
}

// MARK: - Auth Transport Abstraction

public protocol AuthClientTransport: Sendable {
    func currentSession() async -> AuthSession?
    func authStateChanges() -> AsyncStream<(AuthEvent, AuthSession?)>
    func signIn(email: String, password: String) async throws -> AuthSession
    func signUp(email: String, password: String, redirectTo: URL?) async throws -> SignUpResult
    func signInWithMagicLink(email: String, redirectTo: URL?) async throws
    func resetPassword(email: String, redirectTo: URL?) async throws
    func updatePassword(newPassword: String) async throws -> AuthUser
    func signOut() async throws
    func signInWithAppleIdToken(idToken: String, nonce: String?) async throws -> AuthSession
    func session(from url: URL) async throws -> AuthSession
}

public struct SupabaseAuthClientTransport: AuthClientTransport, Sendable {
    private let client: SupabaseClient

    public init(client: SupabaseClient) {
        self.client = client
    }

    public init(configuration: SupabaseConfiguration) {
        self.client = configuration.makeSupabaseClient()
    }

    public func currentSession() async -> AuthSession? {
        client.auth.currentSession.map(Self.mapSession)
    }

    public func authStateChanges() -> AsyncStream<(AuthEvent, AuthSession?)> {
        let upstream = client.auth.authStateChanges
        return AsyncStream { continuation in
            let task = Task {
                for await (event, session) in upstream {
                    let mappedEvent = Self.mapEvent(event)
                    let mappedSession = session.map(Self.mapSession)
                    continuation.yield((mappedEvent, mappedSession))
                }
                continuation.finish()
            }
            continuation.onTermination = { _ in
                task.cancel()
            }
        }
    }

    public func signIn(email: String, password: String) async throws -> AuthSession {
        let session = try await client.auth.signIn(email: email, password: password)
        return Self.mapSession(session)
    }

    public func signUp(email: String, password: String, redirectTo: URL?) async throws -> SignUpResult {
        let response = try await client.auth.signUp(
            email: email,
            password: password,
            redirectTo: redirectTo
        )
        let mappedUser = Self.mapUser(response.user)
        let mappedSession = response.session.map(Self.mapSession)
        return SignUpResult(
            user: mappedUser,
            session: mappedSession,
            isEmailConfirmationPending: mappedSession == nil
        )
    }

    public func signInWithMagicLink(email: String, redirectTo: URL?) async throws {
        try await client.auth.signInWithOTP(email: email, redirectTo: redirectTo)
    }

    public func resetPassword(email: String, redirectTo: URL?) async throws {
        try await client.auth.resetPasswordForEmail(email, redirectTo: redirectTo)
    }

    public func updatePassword(newPassword: String) async throws -> AuthUser {
        let user = try await client.auth.update(user: UserAttributes(password: newPassword))
        return Self.mapUser(user)
    }

    public func signOut() async throws {
        try await client.auth.signOut()
    }

    public func signInWithAppleIdToken(idToken: String, nonce: String?) async throws -> AuthSession {
        let credentials = OpenIDConnectCredentials(
            provider: .apple,
            idToken: idToken,
            nonce: nonce
        )
        let session = try await client.auth.signInWithIdToken(credentials: credentials)
        return Self.mapSession(session)
    }

    public func session(from url: URL) async throws -> AuthSession {
        let session = try await client.auth.session(from: url)
        return Self.mapSession(session)
    }

    private static func mapUser(_ user: User) -> AuthUser {
        AuthUser(id: user.id, email: user.email, createdAt: user.createdAt)
    }

    private static func mapSession(_ session: Session) -> AuthSession {
        AuthSession(
            accessToken: session.accessToken,
            refreshToken: session.refreshToken,
            expiresAt: session.expiresAt,
            user: mapUser(session.user)
        )
    }

    private static func mapEvent(_ event: AuthChangeEvent) -> AuthEvent {
        switch event {
        case .initialSession: return .initialSession
        case .signedIn: return .signedIn
        case .signedOut, .userDeleted: return .signedOut
        case .tokenRefreshed: return .tokenRefreshed
        case .userUpdated: return .userUpdated
        case .passwordRecovery: return .passwordRecovery
        case .mfaChallengeVerified: return .signedIn
        }
    }
}

// MARK: - Sign in with Apple Abstraction

public struct AppleIDCredentialResult: Sendable, Equatable {
    public let idToken: String
    public let rawNonce: String
    public let fullName: PersonNameComponents?
    public let email: String?

    public init(
        idToken: String,
        rawNonce: String,
        fullName: PersonNameComponents? = nil,
        email: String? = nil
    ) {
        self.idToken = idToken
        self.rawNonce = rawNonce
        self.fullName = fullName
        self.email = email
    }
}

public protocol AppleSignInPresenting: Sendable {
    @MainActor
    func requestAppleIDCredential(hashedNonce: String, rawNonce: String) async throws -> AppleIDCredentialResult
}

#if canImport(AuthenticationServices)
public final class DefaultAppleSignInPresenter: AppleSignInPresenting, Sendable {
    public init() {}

    @MainActor
    public func requestAppleIDCredential(
        hashedNonce: String,
        rawNonce: String
    ) async throws -> AppleIDCredentialResult {
        try await AppleSignInFlow(hashedNonce: hashedNonce, rawNonce: rawNonce).run()
    }
}

@MainActor
private final class AppleSignInFlow: NSObject, ASAuthorizationControllerDelegate, ASAuthorizationControllerPresentationContextProviding {
    private let hashedNonce: String
    private let rawNonce: String
    private var continuation: CheckedContinuation<AppleIDCredentialResult, any Error>?
    private var controller: ASAuthorizationController?

    init(hashedNonce: String, rawNonce: String) {
        self.hashedNonce = hashedNonce
        self.rawNonce = rawNonce
        super.init()
    }

    func run() async throws -> AppleIDCredentialResult {
        try await withCheckedThrowingContinuation { continuation in
            self.continuation = continuation
            let provider = ASAuthorizationAppleIDProvider()
            let request = provider.createRequest()
            request.requestedScopes = [.fullName, .email]
            request.nonce = hashedNonce

            let controller = ASAuthorizationController(authorizationRequests: [request])
            controller.delegate = self
            controller.presentationContextProvider = self
            self.controller = controller
            controller.performRequests()
        }
    }

    private func finish(with result: Result<AppleIDCredentialResult, any Error>) {
        guard let continuation else { return }
        self.continuation = nil
        self.controller = nil
        continuation.resume(with: result)
    }

    nonisolated func authorizationController(
        controller: ASAuthorizationController,
        didCompleteWithAuthorization authorization: ASAuthorization
    ) {
        guard let credential = authorization.credential as? ASAuthorizationAppleIDCredential,
              let tokenData = credential.identityToken,
              let idToken = String(data: tokenData, encoding: .utf8),
              !idToken.isEmpty else {
            Task { @MainActor in
                self.finish(with: .failure(AuthServiceError.appleCredentialMissingToken))
            }
            return
        }

        let fullName = credential.fullName
        let email = credential.email
        let rawNonce = self.rawNonce
        Task { @MainActor in
            self.finish(with: .success(AppleIDCredentialResult(
                idToken: idToken,
                rawNonce: rawNonce,
                fullName: fullName,
                email: email
            )))
        }
    }

    nonisolated func authorizationController(
        controller: ASAuthorizationController,
        didCompleteWithError error: any Error
    ) {
        let mapped: AuthServiceError
        if let authError = error as? ASAuthorizationError, authError.code == .canceled {
            mapped = .appleAuthorizationCancelled
        } else {
            mapped = .appleAuthorizationFailed(error.localizedDescription)
        }
        Task { @MainActor in
            self.finish(with: .failure(mapped))
        }
    }

    nonisolated func presentationAnchor(for controller: ASAuthorizationController) -> ASPresentationAnchor {
        MainActor.assumeIsolated {
            #if canImport(UIKit)
            let scenes = UIApplication.shared.connectedScenes.compactMap { $0 as? UIWindowScene }
            if let keyWindow = scenes.flatMap(\.windows).first(where: \.isKeyWindow) {
                return keyWindow
            }
            if let firstWindow = scenes.flatMap(\.windows).first {
                return firstWindow
            }
            return ASPresentationAnchor()
            #elseif canImport(AppKit)
            return NSApplication.shared.keyWindow ?? NSApplication.shared.mainWindow ?? ASPresentationAnchor()
            #endif
        }
    }
}
#endif

// MARK: - AuthService Actor

public actor AuthService {
    public private(set) var state: AuthState = .signedOut
    public private(set) var isPasswordRecoveryPending: Bool = false

    private let transport: any AuthClientTransport
    private let redirectURL: URL
    private let applePresenter: (any AppleSignInPresenting)?
    private var continuations: [UUID: AsyncStream<AuthState>.Continuation] = [:]
    private var listenerTask: Task<Void, Never>?

    public init(
        configuration: SupabaseConfiguration = SupabaseConfiguration(),
        applePresenter: (any AppleSignInPresenting)? = nil
    ) {
        let client = configuration.makeSupabaseClient()
        self.transport = SupabaseAuthClientTransport(client: client)
        self.redirectURL = configuration.redirectURL
        #if canImport(AuthenticationServices)
        self.applePresenter = applePresenter ?? DefaultAppleSignInPresenter()
        #else
        self.applePresenter = applePresenter
        #endif
    }

    public init(
        transport: any AuthClientTransport,
        redirectURL: URL = SupabaseConfiguration.defaultRedirectURL,
        applePresenter: (any AppleSignInPresenting)? = nil
    ) {
        self.transport = transport
        self.redirectURL = redirectURL
        self.applePresenter = applePresenter
    }

    deinit {
        listenerTask?.cancel()
        for continuation in continuations.values {
            continuation.finish()
        }
    }

    public func start() async {
        if let existing = await transport.currentSession() {
            updateState(.signedIn(existing))
        } else {
            updateState(.signedOut)
        }

        listenerTask?.cancel()
        let stream = transport.authStateChanges()
        listenerTask = Task { [weak self] in
            for await (event, session) in stream {
                guard let self else { return }
                await self.handleUpstreamEvent(event, session: session)
            }
        }
    }

    public func stateStream() -> AsyncStream<AuthState> {
        let id = UUID()
        let current = state
        return AsyncStream { continuation in
            continuation.yield(current)
            continuations[id] = continuation
            continuation.onTermination = { [weak self] _ in
                Task {
                    await self?.removeContinuation(id: id)
                }
            }
        }
    }

    public func currentSession() async -> AuthSession? {
        if let session = state.session {
            return session
        }
        if let session = await transport.currentSession() {
            updateState(.signedIn(session))
            return session
        }
        return nil
    }

    @discardableResult
    public func signIn(email: String, password: String) async throws -> AuthSession {
        let trimmedEmail = email.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmedEmail.isEmpty else { throw AuthServiceError.invalidEmail }
        guard !password.isEmpty else { throw AuthServiceError.invalidPassword }

        let session = try await transport.signIn(email: trimmedEmail, password: password)
        isPasswordRecoveryPending = false
        updateState(.signedIn(session))
        return session
    }

    @discardableResult
    public func signUp(email: String, password: String) async throws -> SignUpResult {
        let trimmedEmail = email.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmedEmail.isEmpty else { throw AuthServiceError.invalidEmail }
        guard !password.isEmpty else { throw AuthServiceError.invalidPassword }

        let result = try await transport.signUp(
            email: trimmedEmail,
            password: password,
            redirectTo: redirectURL
        )
        if let session = result.session {
            isPasswordRecoveryPending = false
            updateState(.signedIn(session))
        }
        return result
    }

    public func signInWithMagicLink(email: String, redirectTo: URL? = nil) async throws {
        let trimmedEmail = email.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmedEmail.isEmpty else { throw AuthServiceError.invalidEmail }
        try await transport.signInWithMagicLink(
            email: trimmedEmail,
            redirectTo: redirectTo ?? redirectURL
        )
    }

    public func resetPassword(email: String, redirectTo: URL? = nil) async throws {
        let trimmedEmail = email.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmedEmail.isEmpty else { throw AuthServiceError.invalidEmail }
        try await transport.resetPassword(
            email: trimmedEmail,
            redirectTo: redirectTo ?? redirectURL
        )
    }

    @discardableResult
    public func updatePassword(newPassword: String) async throws -> AuthUser {
        guard !newPassword.isEmpty else { throw AuthServiceError.invalidPassword }
        let user = try await transport.updatePassword(newPassword: newPassword)
        isPasswordRecoveryPending = false
        return user
    }

    /// Always clears local auth state even if network sign-out fails offline (local-first guarantee).
    public func signOut() async {
        do {
            try await transport.signOut()
        } catch {
            // Intentionally swallow remote sign-out failure so offline users can always sign out locally.
        }
        isPasswordRecoveryPending = false
        updateState(.signedOut)
    }

    @discardableResult
    public func signInWithApple(idToken: String, nonce: String?) async throws -> AuthSession {
        let session = try await transport.signInWithAppleIdToken(idToken: idToken, nonce: nonce)
        isPasswordRecoveryPending = false
        updateState(.signedIn(session))
        return session
    }

    @discardableResult
    public func signInWithAppleInteractive() async throws -> AuthSession {
        guard let applePresenter else {
            throw AuthServiceError.applePresenterUnavailable
        }
        let rawNonce = try Self.generateRandomNonce()
        let hashedNonce = Self.sha256Hex(rawNonce)
        let credential = try await applePresenter.requestAppleIDCredential(
            hashedNonce: hashedNonce,
            rawNonce: rawNonce
        )
        return try await signInWithApple(idToken: credential.idToken, nonce: credential.rawNonce)
    }

    @discardableResult
    public func handleOpenURL(_ url: URL) async throws -> AuthSession? {
        guard url.scheme?.lowercased() == redirectURL.scheme?.lowercased() else {
            throw AuthServiceError.unsupportedCallbackURL
        }
        let isRecovery = Self.urlIndicatesPasswordRecovery(url)
        let session = try await transport.session(from: url)
        if isRecovery {
            isPasswordRecoveryPending = true
        }
        updateState(.signedIn(session))
        return session
    }

    // MARK: - Nonce & Helpers

    public static func sha256Hex(_ input: String) -> String {
        let data = Data(input.utf8)
        let digest = SHA256.hash(data: data)
        return digest.map { String(format: "%02x", $0) }.joined()
    }

    public static func generateRandomNonce(byteCount: Int = 32) throws -> String {
        var bytes = [UInt8](repeating: 0, count: byteCount)
        let status = SecRandomCopyBytes(kSecRandomDefault, byteCount, &bytes)
        if status != errSecSuccess {
            return UUID().uuidString.replacingOccurrences(of: "-", with: "")
                + UUID().uuidString.replacingOccurrences(of: "-", with: "")
        }
        return bytes.map { String(format: "%02x", $0) }.joined()
    }

    private static func urlIndicatesPasswordRecovery(_ url: URL) -> Bool {
        if let components = URLComponents(url: url, resolvingAgainstBaseURL: false) {
            if components.queryItems?.contains(where: { $0.name == "type" && $0.value == "recovery" }) == true {
                return true
            }
            if let fragment = components.fragment, fragment.contains("type=recovery") {
                return true
            }
        }
        return url.absoluteString.contains("type=recovery")
    }

    private func handleUpstreamEvent(_ event: AuthEvent, session: AuthSession?) {
        switch event {
        case .passwordRecovery:
            isPasswordRecoveryPending = true
            if let session {
                updateState(.signedIn(session))
            }
        case .signedOut:
            isPasswordRecoveryPending = false
            updateState(.signedOut)
        case .initialSession, .signedIn, .tokenRefreshed, .userUpdated:
            if let session {
                updateState(.signedIn(session))
            } else {
                updateState(.signedOut)
            }
        }
    }

    private func updateState(_ newState: AuthState) {
        state = newState
        for continuation in continuations.values {
            continuation.yield(newState)
        }
    }

    private func removeContinuation(id: UUID) {
        continuations.removeValue(forKey: id)
    }
}
