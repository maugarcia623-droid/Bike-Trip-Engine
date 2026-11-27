import Foundation
import Testing
@testable import CadenceCore

@Suite("TimelineEngine Golden Parity")
struct TimelineTests {
    @Test("Matches all 8 timeline.golden.json cases")
    func matchesGolden() throws {
        let data = try GoldenFixtureLoader.loadData(fileName: "timeline.golden.json")
        let root = try JSONSerialization.jsonObject(with: data) as! [String: Any]
        let cases = root["cases"] as! [[String: Any]]
        let decoder = JSONDecoder()
        let frozenNow = ISO8601DateFormatter().date(from: "2026-11-26T12:00:00.000Z") ?? Date()

        func caseById(_ id: String) -> [String: Any] {
            cases.first(where: { ($0["id"] as? String) == id })!
        }

        let baseOffice = OfficeConstraints(
            shiftStartTime: "09:00",
            targetGateArrivalTime: "08:30",
            gateName: "Main Gate",
            lockerRefuelMinutes: 10,
            showerChangeMinutes: 10,
            breakRoomBreakfastMinutes: 10
        )
        let calmWeather = WeatherCondition(
            isHeadwindActive: false,
            baseWindSpeedKmH: 8,
            windDirection: "calm",
            temperatureC: 18,
            precipitationRiskPercent: 0,
            estuaryGustKmH: 12,
            visibilityKm: 20
        )

        // 1. parse-and-format-hhmm
        do {
            let c = caseById("parse-and-format-hhmm")
            let exp = c["expected"] as! [String: Any]
            let parsed = exp["parsed"] as! [[String: Any]]
            for item in parsed {
                let t = item["time"] as! String
                #expect(TimelineEngine.parseHHMM(t) == (item["minutes"] as! Int))
                #expect(TimelineEngine.isOffHoursCommercialWindow(t) == (item["isOffHours"] as! Bool))
            }
            let formatted = exp["formatted"] as! [[String: Any]]
            for item in formatted {
                let m = item["min"] as! Double
                #expect(TimelineEngine.formatHHMM(m) == (item["hhmm"] as! String))
            }
            #expect(TimelineEngine.calculateDwellMinutes(activeChips: ["coffee-stop", "picnic-outing"], logistics: LogisticsSettings(coffeeDurationMin: 15)) == (exp["dwellMinutes"] as! Int))
        }

        // 2. solve-arrive-by-coffee & 3. solve-predawn-winter-cap
        for id in ["solve-arrive-by-coffee", "solve-predawn-winter-cap"] {
            let c = caseById(id)
            let input = c["input"] as! [String: Any]
            let chips = input["chips"] as! [String]
            let logistics = try decoder.decode(LogisticsSettings.self, from: JSONSerialization.data(withJSONObject: input["logistics"]!))
            let ctx = input["context"] as! [String: Any]
            let depDate = ctx["departureDate"] as? String
            let coords = try ctx["coordinates"].map { try decoder.decode(LatLon.self, from: JSONSerialization.data(withJSONObject: $0)) }
            let exp = try decoder.decode(SolvedTripTimeline.self, from: JSONSerialization.data(withJSONObject: c["expected"]!))

            let actual = TimelineEngine.solveTripTimeline(
                movingSeconds: input["movingSeconds"] as! Double,
                activeChips: chips,
                logistics: logistics,
                departureDate: depDate,
                coordinates: coords,
                now: frozenNow
            )
            #expect(actual == exp, "Mismatch in \(id)")
        }

        // 4. reverse-commute-offhours-coffee
        do {
            let c = caseById("reverse-commute-offhours-coffee")
            let input = c["input"] as! [String: Any]
            let route = try decoder.decode(RouteParams.self, from: JSONSerialization.data(withJSONObject: input["route"]!))
            let exp = c["expected"] as! [String: Any]
            let expEve = try decoder.decode(ReverseTimelineCalculation.self, from: JSONSerialization.data(withJSONObject: exp["evening"]!))
            let expDay = try decoder.decode(ReverseTimelineCalculation.self, from: JSONSerialization.data(withJSONObject: exp["daytime"]!))

            let actualEve = TimelineEngine.calculateReverseTimeline(
                route: route, office: baseOffice, weather: calmWeather, tripTag: "VÉLOTAF", destinationName: "Office",
                lang: .en, extraBufferMinutes: 0, customChips: ["coffee-stop"],
                physicsSpeedOverride: ReverseTimelinePhysicsOverride(effectiveSpeedKmH: 30, calmSpeedKmH: 30, arriveAtMode: false, departureTime: "19:15", departureDate: "2026-07-10"),
                now: frozenNow
            )
            let actualDay = TimelineEngine.calculateReverseTimeline(
                route: route, office: baseOffice, weather: calmWeather, tripTag: "VÉLOTAF", destinationName: "Office",
                lang: .en, extraBufferMinutes: 0, customChips: ["coffee-stop"],
                physicsSpeedOverride: ReverseTimelinePhysicsOverride(effectiveSpeedKmH: 30, calmSpeedKmH: 30, arriveAtMode: false, departureTime: "08:00", departureDate: "2026-07-10"),
                now: frozenNow
            )
            #expect(actualEve == expEve)
            #expect(actualDay == expDay)
        }

        // 5. reverse-commute-severe-headwind-fr
        do {
            let c = caseById("reverse-commute-severe-headwind-fr")
            let input = c["input"] as! [String: Any]
            let route = try decoder.decode(RouteParams.self, from: JSONSerialization.data(withJSONObject: input["route"]!))
            let weather = try decoder.decode(WeatherCondition.self, from: JSONSerialization.data(withJSONObject: input["weather"]!))
            let exp = try decoder.decode(ReverseTimelineCalculation.self, from: JSONSerialization.data(withJSONObject: c["expected"]!))

            let actual = TimelineEngine.calculateReverseTimeline(
                route: route, office: baseOffice, weather: weather, tripTag: "VÉLOTAF", destinationName: "Bureau",
                lang: .fr, extraBufferMinutes: 0, customChips: [],
                physicsSpeedOverride: ReverseTimelinePhysicsOverride(effectiveSpeedKmH: 18, calmSpeedKmH: 25, departureDate: "2026-07-10"),
                now: frozenNow
            )
            #expect(actual == exp)
        }

        // 6. reverse-escapade-waypoints-and-opening-hours
        do {
            let c = caseById("reverse-escapade-waypoints-and-opening-hours")
            let input = c["input"] as! [String: Any]
            let route = try decoder.decode(RouteParams.self, from: JSONSerialization.data(withJSONObject: input["route"]!))
            let pinned = try decoder.decode([StageAmenity].self, from: JSONSerialization.data(withJSONObject: input["pinnedAmenities"]!))
            let exp = try decoder.decode(ReverseTimelineCalculation.self, from: JSONSerialization.data(withJSONObject: c["expected"]!))

            let actual = TimelineEngine.calculateReverseTimeline(
                route: route, office: baseOffice, weather: calmWeather, tripTag: "ESCAPADE", destinationName: "Hotel",
                lang: .en, extraBufferMinutes: 0, customChips: [],
                physicsSpeedOverride: ReverseTimelinePhysicsOverride(effectiveSpeedKmH: 30, calmSpeedKmH: 30, arriveAtMode: false, departureTime: "10:00", pinnedAmenities: pinned, departureDate: "2026-07-15"),
                now: frozenNow
            )
            #expect(actual == exp)
        }

        // 7. reverse-sport-singleday-vs-bikepacking-multiday
        do {
            let c = caseById("reverse-sport-singleday-vs-bikepacking-multiday")
            let input = c["input"] as! [String: Any]
            let route = try decoder.decode(RouteParams.self, from: JSONSerialization.data(withJSONObject: input["route"]!))
            let exp = c["expected"] as! [String: Any]
            let expSingle = try decoder.decode(ReverseTimelineCalculation.self, from: JSONSerialization.data(withJSONObject: exp["singleDay"]!))
            let expMulti = try decoder.decode(ReverseTimelineCalculation.self, from: JSONSerialization.data(withJSONObject: exp["multiDay"]!))

            let actualSingle = TimelineEngine.calculateReverseTimeline(
                route: route, office: baseOffice, weather: calmWeather, tripTag: "SPORT", destinationName: "Finish",
                lang: .en, extraBufferMinutes: 0, customChips: [],
                physicsSpeedOverride: ReverseTimelinePhysicsOverride(effectiveSpeedKmH: 30, calmSpeedKmH: 30, arriveAtMode: false, departureTime: "08:00", movingTimeSeconds: 180 * 60, departureDate: "2026-07-15", isMultiDayTour: false),
                now: frozenNow
            )
            let actualMulti = TimelineEngine.calculateReverseTimeline(
                route: route, office: baseOffice, weather: calmWeather, tripTag: "TOURING", destinationName: "Stage 1 Finish",
                lang: .en, extraBufferMinutes: 0, customChips: [],
                physicsSpeedOverride: ReverseTimelinePhysicsOverride(effectiveSpeedKmH: 30, calmSpeedKmH: 30, arriveAtMode: false, departureTime: "08:00", movingTimeSeconds: 180 * 60, departureDate: "2026-07-15", isMultiDayTour: true),
                now: frozenNow
            )
            #expect(actualSingle == expSingle)
            #expect(actualMulti == expMulti)
        }
    }
}
