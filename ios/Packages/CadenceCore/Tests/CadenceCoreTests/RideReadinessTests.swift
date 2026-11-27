import Foundation
import Testing
@testable import CadenceCore

@Suite("RideReadinessEngine Golden Parity")
struct RideReadinessTests {
    @Test("Matches all 6 rideReadiness.golden.json cases")
    func matchesGolden() throws {
        let data = try GoldenFixtureLoader.loadData(fileName: "rideReadiness.golden.json")
        let root = try JSONSerialization.jsonObject(with: data) as! [String: Any]
        let cases = root["cases"] as! [[String: Any]]
        let decoder = JSONDecoder()

        func caseById(_ id: String) -> [String: Any] {
            cases.first(where: { ($0["id"] as? String) == id })!
        }

        // 1. readiness-bands
        do {
            let c = caseById("readiness-bands")
            let input = c["input"] as! [String: Any]
            let scores = input["scores"] as! [Int]
            let exp = c["expected"] as! [String: Any]
            let expBands = try decoder.decode([String: ReadinessBandRange].self, from: JSONSerialization.data(withJSONObject: exp["bands"]!))
            #expect(RideReadinessEngine.readinessBands == expBands)
            let expLevels = exp["levels"] as! [[String: Any]]
            for (idx, s) in scores.enumerated() {
                #expect(RideReadinessEngine.getReadinessLevel(s) == (expLevels[idx]["level"] as! String))
            }
        }

        // 2. perfect-en-and-fr
        do {
            let c = caseById("perfect-en-and-fr")
            let input = c["input"] as! [String: Any]
            let exp = c["expected"] as! [String: Any]
            for key in ["en", "fr"] {
                let inp = try decoder.decode(RideReadinessInput.self, from: JSONSerialization.data(withJSONObject: input[key]!))
                let expRes = try decoder.decode(RideReadinessResult.self, from: JSONSerialization.data(withJSONObject: exp[key]!))
                #expect(RideReadinessEngine.computeRideReadiness(inp) == expRes)
            }
        }

        // 3. terrain-mismatch-vs-gravel
        do {
            let c = caseById("terrain-mismatch-vs-gravel")
            let input = c["input"] as! [String: Any]
            let exp = c["expected"] as! [String: Any]
            for key in ["roadOnGravel", "gravelOnGravel"] {
                let inp = try decoder.decode(RideReadinessInput.self, from: JSONSerialization.data(withJSONObject: input[key]!))
                let expRes = try decoder.decode(RideReadinessResult.self, from: JSONSerialization.data(withJSONObject: exp[key]!))
                #expect(RideReadinessEngine.computeRideReadiness(inp) == expRes)
            }
        }

        // 4. checklist-critical-and-empty
        do {
            let c = caseById("checklist-critical-and-empty")
            let input = c["input"] as! [String: Any]
            let exp = c["expected"] as! [String: Any]
            for key in ["critMissing", "optMissing", "emptyChecklist"] {
                let inp = try decoder.decode(RideReadinessInput.self, from: JSONSerialization.data(withJSONObject: input[key]!))
                let expRes = try decoder.decode(RideReadinessResult.self, from: JSONSerialization.data(withJSONObject: exp[key]!))
                #expect(RideReadinessEngine.computeRideReadiness(inp) == expRes)
            }
        }

        // 5. effort-stop-relief-and-predawn
        do {
            let c = caseById("effort-stop-relief-and-predawn")
            let input = c["input"] as! [String: Any]
            let exp = c["expected"] as! [String: Any]
            for key in ["longWithoutStop", "longWithStop", "preDawnWinter"] {
                let inp = try decoder.decode(RideReadinessInput.self, from: JSONSerialization.data(withJSONObject: input[key]!))
                let expRes = try decoder.decode(RideReadinessResult.self, from: JSONSerialization.data(withJSONObject: exp[key]!))
                #expect(RideReadinessEngine.computeRideReadiness(inp) == expRes)
            }
        }

        // 6. weakest-link-drag-and-nogo-cap
        do {
            let c = caseById("weakest-link-drag-and-nogo-cap")
            let input = c["input"] as! [String: Any]
            let exp = c["expected"] as! [String: Any]
            for key in ["criticalRoute", "stormNoGo"] {
                let inp = try decoder.decode(RideReadinessInput.self, from: JSONSerialization.data(withJSONObject: input[key]!))
                let expRes = try decoder.decode(RideReadinessResult.self, from: JSONSerialization.data(withJSONObject: exp[key]!))
                #expect(RideReadinessEngine.computeRideReadiness(inp) == expRes)
            }
        }
    }
}
