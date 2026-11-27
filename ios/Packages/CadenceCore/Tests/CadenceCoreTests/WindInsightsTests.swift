import Foundation
import Testing
@testable import CadenceCore

@Suite("WindInsights Golden Parity")
struct WindInsightsTests {
    @Test("All windInsights.golden.json cases match 1:1")
    func goldenParity() throws {
        let data = try GoldenFixtureLoader.loadData(fileName: "windInsights.golden.json")
        let root = try JSONSerialization.jsonObject(with: data) as! [String: Any]
        let cases = root["cases"] as! [[String: Any]]
        let decoder = JSONDecoder()

        // 0. human-wind-headwind-crosswind-tailwind
        do {
            let c = cases[0]
            let input = c["input"] as! [String: Any]
            let base = input["baseWindInput"] as! [String: Any]
            let exp = c["expected"] as! [String: Any]

            let makeParams: (Double, CadenceLang) -> HumanWindImpactParams = { angle, lang in
                HumanWindImpactParams(
                    distanceKm: base["distanceKm"] as! Double,
                    targetSpeedKmH: base["targetSpeedKmH"] as! Double,
                    riderWeightKg: base["riderWeightKg"] as! Double,
                    bikeWeightKg: base["bikeWeightKg"] as! Double,
                    cda: base["cda"] as! Double,
                    crr: base["crr"] as! Double,
                    windSpeedKmH: base["windSpeedKmH"] as! Double,
                    windRelativeAngleDeg: angle,
                    windFromDegrees: base["windFromDegrees"] as? Double,
                    lang: lang
                )
            }

            let expHeadEn = try decoder.decode(HumanWindImpactResult.self, from: JSONSerialization.data(withJSONObject: exp["headwindEn"]!))
            let expCrossEn = try decoder.decode(HumanWindImpactResult.self, from: JSONSerialization.data(withJSONObject: exp["crosswindEn"]!))
            let expTailEn = try decoder.decode(HumanWindImpactResult.self, from: JSONSerialization.data(withJSONObject: exp["tailwindEn"]!))
            let expHeadFr = try decoder.decode(HumanWindImpactResult.self, from: JSONSerialization.data(withJSONObject: exp["headwindFr"]!))

            #expect(WindInsightsEngine.calculateHumanWindImpact(makeParams(0, .en)) == expHeadEn)
            #expect(WindInsightsEngine.calculateHumanWindImpact(makeParams(90, .en)) == expCrossEn)
            #expect(WindInsightsEngine.calculateHumanWindImpact(makeParams(180, .en)) == expTailEn)
            #expect(WindInsightsEngine.calculateHumanWindImpact(makeParams(0, .fr)) == expHeadFr)
        }

        // 1. trip-wind-insight-fr
        do {
            let c = cases[1]
            let input = c["input"] as! [String: Any]
            let exp = try decoder.decode(HumanWindImpactResult.self, from: JSONSerialization.data(withJSONObject: c["expected"]!))
            let actual = WindInsightsEngine.calculateTripWindInsight(
                distanceKm: input["distanceKm"] as! Double,
                targetSpeedKmH: input["targetSpeedKmH"] as! Double,
                riderWeightKg: input["riderWeightKg"] as? Double,
                bikeWeightKg: input["bikeWeightKg"] as? Double,
                cda: input["cda"] as? Double,
                crr: input["crr"] as? Double,
                windSpeedKmH: input["windSpeedKmH"] as! Double,
                effectiveHeadwindKmH: input["effectiveHeadwindKmH"] as? Double,
                windDirection: input["windDirection"] as? String,
                windFromDegrees: input["windFromDegrees"] as? Double,
                temperatureC: input["temperatureC"] as? Double,
                ftpWatts: input["ftpWatts"] as? Double,
                lang: CadenceLang(rawValue: input["lang"] as! String)!
            )
            #expect(actual == exp)
        }

        // 2. elevation-scale-thresholds
        do {
            let c = cases[2]
            let exp = c["expected"] as! [[String: Any]]
            for item in exp {
                let m = item["meters"] as! Double
                let expectedEn = item["en"] as? String
                let expectedFr = item["fr"] as? String
                #expect(WindInsightsEngine.formatElevationRealWorldScale(meters: m, lang: .en) == expectedEn)
                #expect(WindInsightsEngine.formatElevationRealWorldScale(meters: m, lang: .fr) == expectedFr)
            }
        }
    }
}
