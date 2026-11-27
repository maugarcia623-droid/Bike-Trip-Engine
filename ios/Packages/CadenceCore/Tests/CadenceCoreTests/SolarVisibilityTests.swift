import Foundation
import Testing
@testable import CadenceCore

@Suite("SolarVisibility Golden Parity")
struct SolarVisibilityTests {
    struct ExpectedCase0: Decodable {
        let winterEphemeris: SolarEphemeris
        let winterElev0715: Double
        let winterElev1230: Double
        let summerEphemeris: SolarEphemeris
        let summerElev1300: Double
    }

    struct TzExpectedItem: Decodable, Equatable {
        let dateStr: String
        let tzOffsetHours: Double
    }

    @Test("All solarVisibility.golden.json cases match 1:1")
    func goldenParity() throws {
        let data = try GoldenFixtureLoader.loadData(fileName: "solarVisibility.golden.json")
        let root = try JSONSerialization.jsonObject(with: data) as! [String: Any]
        let cases = root["cases"] as! [[String: Any]]
        let decoder = JSONDecoder()
        let parisTZ = TimeZone(identifier: "Europe/Paris")!

        #expect(cases.count == 5)

        // 0. ephemeris-and-elevation-explicit-tz
        do {
            let c = cases[0]
            let input = c["input"] as! [String: Any]
            let lat = input["lat"] as! Double
            let lon = input["lon"] as! Double
            let winterDate = input["winterDate"] as! String
            let summerDate = input["summerDate"] as! String

            let expected = try decoder.decode(ExpectedCase0.self, from: JSONSerialization.data(withJSONObject: c["expected"]!))

            #expect(SolarVisibilityEngine.getSolarEphemeris(lat: lat, lon: lon, dateStr: winterDate, tzOffsetHours: 1, timeZone: parisTZ) == expected.winterEphemeris)
            #expect(SolarVisibilityEngine.getSolarElevation(lat: lat, lon: lon, dateStr: winterDate, timeStr: "07:15", tzOffsetHours: 1, timeZone: parisTZ) == expected.winterElev0715)
            #expect(SolarVisibilityEngine.getSolarElevation(lat: lat, lon: lon, dateStr: winterDate, timeStr: "12:30", tzOffsetHours: 1, timeZone: parisTZ) == expected.winterElev1230)
            #expect(SolarVisibilityEngine.getSolarEphemeris(lat: lat, lon: lon, dateStr: summerDate, tzOffsetHours: 2, timeZone: parisTZ) == expected.summerEphemeris)
            #expect(SolarVisibilityEngine.getSolarElevation(lat: lat, lon: lon, dateStr: summerDate, timeStr: "13:00", tzOffsetHours: 2, timeZone: parisTZ) == expected.summerElev1300)
        }

        // 1. approx-tz-paris
        do {
            let c = cases[1]
            let input = c["input"] as! [String: Any]
            let dates = input["dates"] as! [String]
            let lon = input["lon"] as! Double
            let expected = try decoder.decode([TzExpectedItem].self, from: JSONSerialization.data(withJSONObject: c["expected"]!))
            let actual = dates.map { TzExpectedItem(dateStr: $0, tzOffsetHours: SolarVisibilityEngine.getApproxTimezoneOffset(dateStr: $0, lon: lon, timeZone: parisTZ)) }
            #expect(actual == expected)
        }

        // 2. ride-visibility-winter-predawn-black-ice
        do {
            let c = cases[2]
            let input = c["input"] as! [String: Any]
            let date = input["date"] as! String
            let rollout = input["rollout"] as! String
            let tempC = input["temperatureC"] as! Double
            let visKm = input["visibilityKm"] as! Double
            let weatherCode = input["weatherCode"] as! Int

            let trip = TripProfile(
                departureDate: date,
                departureTime: rollout,
                id: "solar-test",
                name: "Solar Test",
                tag: "SPORT",
                route: RouteParams(distanceKm: 31.25, targetSpeedKmH: 25),
                weather: WeatherCondition(
                    temperatureC: tempC,
                    precipitationRiskPercent: 45,
                    visibilityKm: visKm,
                    weatherCode: weatherCode
                )
            )
            let expected = try decoder.decode(RideVisibilityAnalysis.self, from: JSONSerialization.data(withJSONObject: c["expected"]!))
            let actual = SolarVisibilityEngine.calculateRideVisibility(trip: trip, customDate: date, customRolloutTime: rollout, timeZone: parisTZ)
            #expect(actual == expected)
        }

        // 3. ride-visibility-twilight-dawn-and-dusk
        do {
            let c = cases[3]
            let exp = c["expected"] as! [String: Any]
            let expDawn = try decoder.decode(RideVisibilityAnalysis.self, from: JSONSerialization.data(withJSONObject: exp["dawn"]!))
            let expDusk = try decoder.decode(RideVisibilityAnalysis.self, from: JSONSerialization.data(withJSONObject: exp["dusk"]!))

            let trip = TripProfile(
                departureDate: expDawn.dateStr,
                departureTime: expDawn.rolloutTime,
                id: "solar-test-twilight",
                name: "Solar Test Twilight",
                tag: "SPORT",
                route: RouteParams(distanceKm: 25, targetSpeedKmH: 25),
                weather: WeatherCondition(
                    temperatureC: 10,
                    precipitationRiskPercent: 0,
                    visibilityKm: expDawn.visibilityKm,
                    weatherCode: expDawn.weatherCode
                )
            )
            #expect(SolarVisibilityEngine.calculateRideVisibility(trip: trip, customDate: expDawn.dateStr, customRolloutTime: expDawn.rolloutTime, timeZone: parisTZ) == expDawn)
            #expect(SolarVisibilityEngine.calculateRideVisibility(trip: trip, customDate: expDusk.dateStr, customRolloutTime: expDusk.rolloutTime, timeZone: parisTZ) == expDusk)
        }

        // 4. phase-category-wmo-time-helpers
        do {
            let c = cases[4]
            let exp = c["expected"] as! [String: Any]
            for item in (exp["lightPhases"] as! [[String: Any]]) {
                #expect(SolarVisibilityEngine.getAmbientLightPhase(item["deg"] as! Double).rawValue == (item["phase"] as! String))
            }
            for item in (exp["visibilityCategories"] as! [[String: Any]]) {
                #expect(SolarVisibilityEngine.getVisibilityCategory(item["km"] as! Double).rawValue == (item["cat"] as! String))
            }
            for item in (exp["wmoDescriptions"] as! [[String: Any]]) {
                let desc = SolarVisibilityEngine.getWmoWeatherDescription(item["code"] as! Int)
                let expDesc = item["desc"] as! [String: String]
                #expect(desc.en == expDesc["en"])
                #expect(desc.fr == expDesc["fr"])
            }
            for item in (exp["minutesToHHMM"] as! [[String: Any]]) {
                #expect(SolarVisibilityEngine.minutesToHHMM(item["min"] as! Double) == (item["hhmm"] as! String))
            }
            for item in (exp["hhmmToMinutes"] as! [[String: Any]]) {
                #expect(SolarVisibilityEngine.hhmmToMinutes(item["hhmm"] as! String) == (item["min"] as! Int))
            }
        }
    }
}
