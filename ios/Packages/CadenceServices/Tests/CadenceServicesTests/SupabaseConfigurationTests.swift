import Foundation
import Testing
@testable import CadenceServices

@Suite("SupabaseConfiguration")
struct SupabaseConfigurationTests {
    @Test("Default configuration points to Cadence Supabase project and OAuth callback")
    func defaultConstants() {
        let config = SupabaseConfiguration()
        #expect(config.supabaseURL.absoluteString == "https://nymobftelxueitdkfpaz.supabase.co")
        #expect(config.supabaseAnonKey == "sb_publishable_abdu1Js2BDbvZZQMg0Ip0g_Zp94vxKf")
        #expect(config.redirectURL.absoluteString == "cadence://oauth-callback")
        #expect(config.emitLocalSessionAsInitialSession == true)
    }

    @Test("InMemoryAuthLocalStorage stores, retrieves, removes, and handles concurrent access")
    func inMemoryAuthStorageConcurrency() async throws {
        let storage = InMemoryAuthLocalStorage()
        let sample = Data("secret-token".utf8)
        try storage.store(key: "session", value: sample)
        #expect(try storage.retrieve(key: "session") == sample)

        try storage.remove(key: "session")
        #expect(try storage.retrieve(key: "session") == nil)

        try await withThrowingTaskGroup(of: Void.self) { group in
            for i in 0..<25 {
                group.addTask {
                    let key = "k-\(i)"
                    let data = Data("val-\(i)".utf8)
                    try storage.store(key: key, value: data)
                    let fetched = try storage.retrieve(key: key)
                    #expect(fetched == data)
                }
            }
            try await group.waitForAll()
        }
    }

    @Test("makeSupabaseClient wires custom URLSession and InMemoryAuthLocalStorage")
    func makeClientWiresURLSession() async throws {
        let capturedPaths = BoxedList<String>()
        let (mockId, session) = MockURLProtocol.registerSession { request, _ in
            if let path = request.url?.path {
                capturedPaths.append(path)
            }
            let response = HTTPURLResponse(
                url: request.url!,
                statusCode: 200,
                httpVersion: nil,
                headerFields: ["Content-Type": "application/json"]
            )!
            return (response, Data("[]".utf8))
        }
        defer { MockURLProtocol.unregister(id: mockId) }

        let config = SupabaseConfiguration(
            supabaseURL: URL(string: "https://mock.supabase.co")!,
            supabaseAnonKey: "test-anon-key",
            urlSession: session,
            authStorage: InMemoryAuthLocalStorage()
        )
        let client = config.makeSupabaseClient()
        let rows: [RemoteRiderBikeRow] = try await client
            .from("rider_bikes")
            .select("user_id,client_id,schema_version,name,category,payload,sort_order,client_updated_at,updated_at,deleted_at")
            .execute()
            .value

        #expect(rows.isEmpty)
        #expect(capturedPaths.snapshot().contains("/rest/v1/rider_bikes"))
    }
}
