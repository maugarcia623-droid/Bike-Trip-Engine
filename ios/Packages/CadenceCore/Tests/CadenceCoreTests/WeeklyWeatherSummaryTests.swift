import Foundation
import Testing
@testable import CadenceCore

@Suite("WeeklyWeatherSummary Golden Parity")
struct WeeklyWeatherSummaryTests {
    struct Case: Decodable {
        let id: String
        let description: String
        let input: Input
        let expected: Expected

        struct Input: Decodable {
            let forecast: WeeklyForecast
        }
        struct Expected: Decodable {
            let en: String
            let fr: String
        }
    }

    @Test("All weeklyWeatherSummary.golden.json cases match 1:1")
    func goldenParity() throws {
        let doc = try GoldenFixtureLoader.load(GoldenDocument<Case>.self, fileName: "weeklyWeatherSummary.golden.json")
        let parisTZ = TimeZone(identifier: "Europe/Paris")!
        #expect(!doc.cases.isEmpty)
        for c in doc.cases {
            let enActual = WeeklyWeatherSummaryEngine.summarize(forecast: c.input.forecast, lang: .en, timeZone: parisTZ)
            let frActual = WeeklyWeatherSummaryEngine.summarize(forecast: c.input.forecast, lang: .fr, timeZone: parisTZ)
            #expect(enActual == c.expected.en, "EN mismatch in \(c.id)")
            #expect(frActual == c.expected.fr, "FR mismatch in \(c.id)")
        }
    }
}
