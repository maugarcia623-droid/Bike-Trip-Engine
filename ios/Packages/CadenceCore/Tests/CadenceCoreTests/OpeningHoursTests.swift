import Foundation
import Testing
@testable import CadenceCore

@Suite("OpeningHours Golden Parity")
struct OpeningHoursTests {
    @Test("All openingHours.golden.json cases match 1:1")
    func goldenParity() throws {
        let data = try GoldenFixtureLoader.loadData(fileName: "openingHours.golden.json")
        let root = try JSONSerialization.jsonObject(with: data) as! [String: Any]
        let cases = root["cases"] as! [[String: Any]]
        let decoder = JSONDecoder()
        let parisTZ = TimeZone(identifier: "Europe/Paris")!

        #expect(cases.count == 5)

        // 0. always-open-24-7
        do {
            let c = cases[0]
            let input = c["input"] as! [String: Any]
            let a = input["a"] as! [String]
            let b = input["b"] as! [String]
            let exp = c["expected"] as! [String: Any]
            let expA = try decoder.decode(ArrivalOpeningVerdict.self, from: JSONSerialization.data(withJSONObject: exp["a"]!))
            let expB = try decoder.decode(ArrivalOpeningVerdict.self, from: JSONSerialization.data(withJSONObject: exp["b"]!))

            #expect(OpeningHoursParser.evaluateOpeningHoursAtArrival(openingHours: a[0], targetDateStr: a[1], arrivalTimeHHMM: a[2], lang: CadenceLang(rawValue: a[3])!, timeZone: parisTZ) == expA)
            #expect(OpeningHoursParser.evaluateOpeningHoursAtArrival(openingHours: b[0], targetDateStr: b[1], arrivalTimeHHMM: b[2], lang: CadenceLang(rawValue: b[3])!, timeZone: parisTZ) == expB)
        }

        // 1. weekday-open-closing-closed
        do {
            let c = cases[1]
            let input = c["input"] as! [String: Any]
            let hours = input["hours"] as! String
            let checks = input["checks"] as! [[String: String]]
            let expected = try decoder.decode([ArrivalOpeningVerdict].self, from: JSONSerialization.data(withJSONObject: c["expected"]!))
            for (i, chk) in checks.enumerated() {
                let actual = OpeningHoursParser.evaluateOpeningHoursAtArrival(
                    openingHours: hours,
                    targetDateStr: chk["date"],
                    arrivalTimeHHMM: chk["eta"],
                    lang: CadenceLang(rawValue: chk["lang"]!)!,
                    timeZone: parisTZ
                )
                #expect(actual == expected[i])
            }
        }

        // 2. overnight-window
        do {
            let c = cases[2]
            let input = c["input"] as! [String: Any]
            let hours = input["hours"] as! String
            let date = input["date"] as! String
            let times = input["times"] as! [String]
            let exp = c["expected"] as! [String: Any]
            let exp1 = try decoder.decode(ArrivalOpeningVerdict.self, from: JSONSerialization.data(withJSONObject: exp["at2330"]!))
            let exp2 = try decoder.decode(ArrivalOpeningVerdict.self, from: JSONSerialization.data(withJSONObject: exp["at0140"]!))

            #expect(OpeningHoursParser.evaluateOpeningHoursAtArrival(openingHours: hours, targetDateStr: date, arrivalTimeHHMM: times[0], lang: .en, timeZone: parisTZ) == exp1)
            #expect(OpeningHoursParser.evaluateOpeningHoursAtArrival(openingHours: hours, targetDateStr: date, arrivalTimeHHMM: times[1], lang: .en, timeZone: parisTZ) == exp2)
        }

        // 3. seasonal-apr-oct
        do {
            let c = cases[3]
            let input = c["input"] as! [String: Any]
            let hours = input["hours"] as! String
            let dates = input["dates"] as! [String]
            let exp = c["expected"] as! [String: Any]
            let expJul = try decoder.decode(ArrivalOpeningVerdict.self, from: JSONSerialization.data(withJSONObject: exp["july"]!))
            let expJan = try decoder.decode(ArrivalOpeningVerdict.self, from: JSONSerialization.data(withJSONObject: exp["january"]!))

            #expect(OpeningHoursParser.evaluateOpeningHoursAtArrival(openingHours: hours, targetDateStr: dates[0], arrivalTimeHHMM: "12:00", lang: .en, timeZone: parisTZ) == expJul)
            #expect(OpeningHoursParser.evaluateOpeningHoursAtArrival(openingHours: hours, targetDateStr: dates[1], arrivalTimeHHMM: "12:00", lang: .fr, timeZone: parisTZ) == expJan)
        }

        // 4. unknown-and-empty
        do {
            let c = cases[4]
            let input = c["input"] as! [String: Any]
            let samples = input["samples"] as! [Any]
            let exp = c["expected"] as! [String: Any]
            let expPh = try decoder.decode(ArrivalOpeningVerdict.self, from: JSONSerialization.data(withJSONObject: exp["phOff"]!))
            let expSunset = try decoder.decode(ArrivalOpeningVerdict.self, from: JSONSerialization.data(withJSONObject: exp["sunset"]!))

            #expect(OpeningHoursParser.evaluateOpeningHoursAtArrival(openingHours: samples[0] as? String, targetDateStr: "2026-07-15", arrivalTimeHHMM: "12:00", lang: .en, timeZone: parisTZ) == expPh)
            #expect(OpeningHoursParser.evaluateOpeningHoursAtArrival(openingHours: samples[1] as? String, targetDateStr: "2026-07-15", arrivalTimeHHMM: "12:00", lang: .en, timeZone: parisTZ) == expSunset)
            #expect(OpeningHoursParser.evaluateOpeningHoursAtArrival(openingHours: nil, targetDateStr: "2026-07-15", arrivalTimeHHMM: "12:00", lang: .en, timeZone: parisTZ) == nil)
        }
    }
}
