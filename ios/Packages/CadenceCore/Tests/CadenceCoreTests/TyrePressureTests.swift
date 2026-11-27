import Foundation
import Testing
@testable import CadenceCore

@Suite("TyrePressure Golden Parity")
struct TyrePressureTests {
    @Test("All tyrePressure.golden.json cases match 1:1")
    func goldenParity() throws {
        let data = try GoldenFixtureLoader.loadData(fileName: "tyrePressure.golden.json")
        let root = try JSONSerialization.jsonObject(with: data) as! [String: Any]
        let cases = root["cases"] as! [[String: Any]]
        let decoder = JSONDecoder()

        #expect(cases.count == 6)

        // Cases 0..3: direct calculateTyrePressure
        for idx in 0...3 {
            let c = cases[idx]
            let id = c["id"] as! String
            let input = try decoder.decode(TyrePressureInput.self, from: JSONSerialization.data(withJSONObject: c["input"]!))
            let expected = try decoder.decode(TyrePressureResult.self, from: JSONSerialization.data(withJSONObject: c["expected"]!))
            #expect(TyrePressureEngine.calculate(input) == expected, "Mismatch in \(id)")
        }

        // Case 4: build-from-bike-and-infer
        do {
            let c = cases[4]
            let input = c["input"] as! [String: Any]
            let bike = try decoder.decode(BikeSpec.self, from: JSONSerialization.data(withJSONObject: input["bike"]!))
            let built = TyrePressureEngine.buildInput(
                from: bike,
                systemMassKg: input["systemMassKg"] as! Double,
                gearWeightKg: input["gearWeightKg"] as! Double,
                pavedPct: 60,
                gravelPct: 35,
                singletrackPct: 5
            )
            let exp = c["expected"] as! [String: Any]
            let expInput = try decoder.decode(TyrePressureInput.self, from: JSONSerialization.data(withJSONObject: exp["builtInput"]!))
            let expPressure = try decoder.decode(TyrePressureResult.self, from: JSONSerialization.data(withJSONObject: exp["pressure"]!))
            #expect(built == expInput)
            #expect(TyrePressureEngine.calculate(built) == expPressure)
            #expect(TyrePressureEngine.inferBikeCategory(tireWidthMm: 38, bikeName: bike.name, explicitCategory: bike.bikeCategory, gearWeightKg: 2).rawValue == (exp["inferredCategory"] as! String))
            let roadSplit = TyrePressureEngine.getWheelLoadSplit(category: .road)
            let gravelLoadedSplit = TyrePressureEngine.getWheelLoadSplit(category: .gravel, gearWeightKg: 6)
            #expect(roadSplit.frontPct == (exp["wheelLoadSplitRoad"] as! [String: Int])["frontPct"])
            #expect(gravelLoadedSplit.rearPct == (exp["wheelLoadSplitGravelLoaded"] as! [String: Int])["rearPct"])
        }

        // Case 5: formatting-en-fr-psi
        do {
            let c = cases[5]
            let input = c["input"] as! [String: Any]
            let exp = c["expected"] as! [String: Any]
            let frontBar = input["frontBar"] as! Double
            let rearBar = input["rearBar"] as! Double
            let psiList = exp["psiValues"] as! [[String: Any]]
            for item in psiList {
                let bar = item["bar"] as! Double
                let expectedPsi = item["psi"] as! Int
                #expect(TyrePressureEngine.barToPsiValue(bar) == expectedPsi)
            }
            #expect(TyrePressureEngine.formatPair(frontBar: frontBar, rearBar: rearBar, unit: .bar, lang: .en) == (exp["barEn"] as! String))
            #expect(TyrePressureEngine.formatPair(frontBar: frontBar, rearBar: rearBar, unit: .bar, lang: .fr) == (exp["barFr"] as! String))
            #expect(TyrePressureEngine.formatPair(frontBar: frontBar, rearBar: rearBar, unit: .psi, lang: .en) == (exp["psiEn"] as! String))
        }
    }
}
