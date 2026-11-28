import Foundation
import Testing
@testable import CadenceServices

private final class MockAuthTransport: AuthClientTransport, @unchecked Sendable {
    private let lock = NSLock()
    private var storedSession: AuthSession?
    private var continuation: AsyncStream<(AuthEvent, AuthSession?)>.Continuation?

    var signInCalls: [(email: String, password: String)] = []
    var signUpCalls: [(email: String, password: String, redirectTo: URL?)] = []
    var magicLinkCalls: [(email: String, redirectTo: URL?)] = []
    var resetPasswordCalls: [(email: String, redirectTo: URL?)] = []
    var updatePasswordCalls: [String] = []
    var appleCalls: [(idToken: String, nonce: String?)] = []
    var signOutError: (any Error)?
    var nextSignUpResult: SignUpResult?
    var nextOpenURLSession: AuthSession?

    static let sampleUser = AuthUser(
        id: UUID(uuidString: "11111111-1111-1111-1111-111111111111")!,
        email: "rider@cadence.cc",
        createdAt: Date(timeIntervalSince1970: 1_700_000_000)
    )

    static let sampleSession = AuthSession(
        accessToken: "access-token",
        refreshToken: "refresh-token",
        expiresAt: 4_102_444_800,
        user: sampleUser
    )

    init(initialSession: AuthSession? = nil) {
        self.storedSession = initialSession
    }

    func currentSession() async -> AuthSession? {
        lock.withLock { storedSession }
    }

    func authStateChanges() -> AsyncStream<(AuthEvent, AuthSession?)> {
        AsyncStream { continuation in
            let current = lock.withLock { () -> AuthSession? in
                self.continuation = continuation
                return storedSession
            }
            continuation.yield((.initialSession, current))
        }
    }

    func emit(_ event: AuthEvent, session: AuthSession?) {
        let cont = lock.withLock { continuation }
        cont?.yield((event, session))
    }

    func signIn(email: String, password: String) async throws -> AuthSession {
        lock.withLock {
            signInCalls.append((email, password))
            storedSession = Self.sampleSession
        }
        return Self.sampleSession
    }

    func signUp(email: String, password: String, redirectTo: URL?) async throws -> SignUpResult {
        lock.withLock {
            signUpCalls.append((email, password, redirectTo))
            let result = nextSignUpResult ?? SignUpResult(
                user: Self.sampleUser,
                session: nil,
                isEmailConfirmationPending: true
            )
            if let session = result.session {
                storedSession = session
            }
            return result
        }
    }

    func signInWithMagicLink(email: String, redirectTo: URL?) async throws {
        lock.withLock {
            magicLinkCalls.append((email, redirectTo))
        }
    }

    func resetPassword(email: String, redirectTo: URL?) async throws {
        lock.withLock {
            resetPasswordCalls.append((email, redirectTo))
        }
    }

    func updatePassword(newPassword: String) async throws -> AuthUser {
        lock.withLock {
            updatePasswordCalls.append(newPassword)
        }
        return Self.sampleUser
    }

    func signOut() async throws {
        let error = lock.withLock { () -> (any Error)? in
            let err = signOutError
            storedSession = nil
            return err
        }
        if let error { throw error }
    }

    func signInWithAppleIdToken(idToken: String, nonce: String?) async throws -> AuthSession {
        lock.withLock {
            appleCalls.append((idToken, nonce))
            storedSession = Self.sampleSession
        }
        return Self.sampleSession
    }

    func session(from url: URL) async throws -> AuthSession {
        lock.withLock {
            let s = nextOpenURLSession ?? Self.sampleSession
            storedSession = s
            return s
        }
    }
}

private final class MockAppleSignInPresenter: AppleSignInPresenting, @unchecked Sendable {
    var capturedHashedNonce: String?
    var capturedRawNonce: String?

    @MainActor
    func requestAppleIDCredential(hashedNonce: String, rawNonce: String) async throws -> AppleIDCredentialResult {
        capturedHashedNonce = hashedNonce
        capturedRawNonce = rawNonce
        return AppleIDCredentialResult(
            idToken: "apple-jwt-token",
            rawNonce: rawNonce,
            fullName: nil,
            email: "rider@cadence.cc"
        )
    }
}

@Suite("AuthService")
struct AuthServiceTests {
    @Test("Boots in signedOut with zero account wall and supports signIn + stateStream")
    func bootSignedOutAndSignIn() async throws {
        let transport = MockAuthTransport()
        let auth = AuthService(transport: transport)
        await auth.start()

        #expect(await auth.state == .signedOut)
        #expect(await auth.currentSession() == nil)

        let collected = BoxedList<AuthState>()
        let stream = await auth.stateStream()
        let listenerTask = Task {
            for await state in stream {
                collected.append(state)
                if case .signedIn = state { break }
            }
        }

        let session = try await auth.signIn(email: "  rider@cadence.cc  ", password: "secret")
        #expect(session.user.email == "rider@cadence.cc")
        #expect(transport.signInCalls.first?.email == "rider@cadence.cc")

        await listenerTask.value
        let states = collected.snapshot()
        #expect(states.first == .signedOut)
        #expect(states.last == .signedIn(session))
    }

    @Test("signUp handles email confirmation pending vs immediate session")
    func signUpFlows() async throws {
        let transport = MockAuthTransport()
        let auth = AuthService(transport: transport)
        await auth.start()

        // Pending email confirmation -> stays signedOut
        transport.nextSignUpResult = SignUpResult(
            user: MockAuthTransport.sampleUser,
            session: nil,
            isEmailConfirmationPending: true
        )
        let pending = try await auth.signUp(email: " new@cadence.cc ", password: "pw")
        #expect(pending.isEmailConfirmationPending == true)
        #expect(await auth.state == .signedOut)
        #expect(transport.signUpCalls.first?.redirectTo?.absoluteString == "cadence://oauth-callback")

        // Immediate session -> transitions to signedIn
        transport.nextSignUpResult = SignUpResult(
            user: MockAuthTransport.sampleUser,
            session: MockAuthTransport.sampleSession,
            isEmailConfirmationPending: false
        )
        let immediate = try await auth.signUp(email: "auto@cadence.cc", password: "pw")
        #expect(immediate.isEmailConfirmationPending == false)
        #expect(await auth.state == .signedIn(MockAuthTransport.sampleSession))
    }

    @Test("Magic link, password reset, recovery URL handling, and updatePassword")
    func magicLinkAndPasswordRecovery() async throws {
        let transport = MockAuthTransport()
        let auth = AuthService(transport: transport)
        await auth.start()

        try await auth.signInWithMagicLink(email: " magic@cadence.cc ")
        #expect(transport.magicLinkCalls.first?.email == "magic@cadence.cc")
        #expect(transport.magicLinkCalls.first?.redirectTo?.absoluteString == "cadence://oauth-callback")

        try await auth.resetPassword(email: " reset@cadence.cc ")
        #expect(transport.resetPasswordCalls.first?.email == "reset@cadence.cc")
        #expect(transport.resetPasswordCalls.first?.redirectTo?.absoluteString == "cadence://oauth-callback")

        // Unsupported URL rejected
        await #expect(throws: AuthServiceError.unsupportedCallbackURL) {
            try await auth.handleOpenURL(URL(string: "https://evil.example.com/callback")!)
        }

        // Recovery URL sets isPasswordRecoveryPending
        let recoveryURL = URL(string: "cadence://oauth-callback#access_token=abc&type=recovery")!
        _ = try await auth.handleOpenURL(recoveryURL)
        #expect(await auth.isPasswordRecoveryPending == true)
        #expect(await auth.state == .signedIn(MockAuthTransport.sampleSession))

        _ = try await auth.updatePassword(newPassword: "new-strong-password")
        #expect(await auth.isPasswordRecoveryPending == false)
        #expect(transport.updatePasswordCalls == ["new-strong-password"])
    }

    @Test("Offline-safe signOut always clears local session even if transport throws")
    func offlineSafeSignOut() async throws {
        let transport = MockAuthTransport(initialSession: MockAuthTransport.sampleSession)
        transport.signOutError = URLError(.notConnectedToInternet)
        let auth = AuthService(transport: transport)
        await auth.start()

        #expect(await auth.state == .signedIn(MockAuthTransport.sampleSession))
        await auth.signOut()
        #expect(await auth.state == .signedOut)
        #expect(await auth.currentSession() == nil)
    }

    @Test("Sign in with Apple interactive computes SHA256 hashed nonce and passes raw nonce")
    func signInWithAppleInteractiveNonce() async throws {
        let transport = MockAuthTransport()
        let presenter = MockAppleSignInPresenter()
        let auth = AuthService(transport: transport, applePresenter: presenter)
        await auth.start()

        let session = try await auth.signInWithAppleInteractive()
        #expect(session == MockAuthTransport.sampleSession)

        let rawNonce = try #require(presenter.capturedRawNonce)
        let hashedNonce = try #require(presenter.capturedHashedNonce)
        #expect(!rawNonce.isEmpty)
        #expect(hashedNonce == AuthService.sha256Hex(rawNonce))
        #expect(transport.appleCalls.first?.idToken == "apple-jwt-token")
        #expect(transport.appleCalls.first?.nonce == rawNonce)
    }

    @Test("SupabaseAuthClientTransport integration via MockURLProtocol for token, signup, otp, recover")
    func supabaseAuthHTTPIntegration() async throws {
        let requests = BoxedList<(method: String, path: String, query: String?, body: String)>()
        let sessionJSON = """
        {
          "access_token": "jwt-access",
          "token_type": "bearer",
          "expires_in": 3600,
          "expires_at": 4102444800,
          "refresh_token": "jwt-refresh",
          "user": {
            "id": "22222222-2222-2222-2222-222222222222",
            "aud": "authenticated",
            "role": "authenticated",
            "email": "cyclo@cadence.cc",
            "created_at": "2026-11-27T10:00:00Z",
            "updated_at": "2026-11-27T10:00:00Z",
            "app_metadata": {},
            "user_metadata": {}
          }
        }
        """
        let userOnlyJSON = """
        {
          "id": "33333333-3333-3333-3333-333333333333",
          "aud": "authenticated",
          "role": "authenticated",
          "email": "pending@cadence.cc",
          "created_at": "2026-11-27T10:00:00Z",
          "updated_at": "2026-11-27T10:00:00Z",
          "app_metadata": {},
          "user_metadata": {}
        }
        """

        let (mockId, session) = MockURLProtocol.registerSession { request, bodyData in
            let path = request.url?.path ?? ""
            let query = request.url?.query
            let bodyStr = bodyData.flatMap { String(data: $0, encoding: .utf8) } ?? ""
            requests.append((request.httpMethod ?? "", path, query, bodyStr))

            let responsePayload: String
            if path.hasSuffix("/signup") {
                responsePayload = userOnlyJSON
            } else if path.hasSuffix("/token") {
                responsePayload = sessionJSON
            } else {
                responsePayload = "{}"
            }

            let response = HTTPURLResponse(
                url: request.url!,
                statusCode: 200,
                httpVersion: nil,
                headerFields: ["Content-Type": "application/json"]
            )!
            return (response, Data(responsePayload.utf8))
        }
        defer { MockURLProtocol.unregister(id: mockId) }

        let config = SupabaseConfiguration(
            supabaseURL: URL(string: "https://mock-auth.supabase.co")!,
            supabaseAnonKey: "anon-key",
            urlSession: session,
            authStorage: InMemoryAuthLocalStorage()
        )
        let auth = AuthService(configuration: config, applePresenter: MockAppleSignInPresenter())

        // 1. Sign in
        let signedIn = try await auth.signIn(email: "cyclo@cadence.cc", password: "pw")
        #expect(signedIn.accessToken == "jwt-access")
        #expect(signedIn.user.email == "cyclo@cadence.cc")

        // 2. Sign up (confirmation pending)
        let signUpRes = try await auth.signUp(email: "pending@cadence.cc", password: "pw")
        #expect(signUpRes.isEmailConfirmationPending == true)
        #expect(signUpRes.user.email == "pending@cadence.cc")

        // 3. Magic link & reset password
        try await auth.signInWithMagicLink(email: "magic@cadence.cc")
        try await auth.resetPassword(email: "reset@cadence.cc")

        let captured = requests.snapshot()
        #expect(captured.contains { $0.path == "/auth/v1/token" && $0.query?.contains("grant_type=password") == true })
        #expect(captured.contains { $0.path == "/auth/v1/signup" && $0.query?.contains("redirect_to=cadence") == true })
        #expect(captured.contains { $0.path == "/auth/v1/otp" })
        #expect(captured.contains { $0.path == "/auth/v1/recover" })
    }
}
