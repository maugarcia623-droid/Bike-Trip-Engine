import Foundation
import Testing

/// Loads golden fixture JSON documents directly from `contracts/golden-fixtures/`
/// relative to the repository root without copying or mutating source fixtures.
enum GoldenFixtureLoader {
    static var fixturesDirectory: URL {
        // #filePath: .../ios/Packages/CadenceCore/Tests/CadenceCoreTests/GoldenFixtureLoader.swift
        URL(fileURLWithPath: #filePath)
            .deletingLastPathComponent() // CadenceCoreTests
            .deletingLastPathComponent() // Tests
            .deletingLastPathComponent() // CadenceCore
            .deletingLastPathComponent() // Packages
            .deletingLastPathComponent() // ios
            .deletingLastPathComponent() // repo root
            .appendingPathComponent("contracts", isDirectory: true)
            .appendingPathComponent("golden-fixtures", isDirectory: true)
    }

    static func loadData(fileName: String) throws -> Data {
        let url = fixturesDirectory.appendingPathComponent(fileName)
        return try Data(contentsOf: url)
    }

    static func load<T: Decodable>(_ type: T.Type, fileName: String) throws -> T {
        let data = try loadData(fileName: fileName)
        let decoder = JSONDecoder()
        return try decoder.decode(T.self, from: data)
    }
}

struct GoldenDocument<CaseType: Decodable>: Decodable {
    let schemaVersion: Int
    let engine: String
    let sourceFiles: [String]
    let determinism: GoldenDeterminism
    let cases: [CaseType]
}

struct GoldenDeterminism: Decodable {
    let frozenUtc: String
    let timezone: String
}
