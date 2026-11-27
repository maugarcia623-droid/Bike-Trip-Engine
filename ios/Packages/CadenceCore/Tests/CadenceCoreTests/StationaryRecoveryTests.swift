import Foundation
import Testing
@testable import CadenceCore

@Suite("StationaryRecoveryEngine Golden Parity")
struct StationaryRecoveryTests {
    private struct ProbeInput: Codable {
        let rolloutTimeHHMM: String
        let departureDate: String?
    }

    private struct WinterProbesInput: Codable {
        let constants: [String: Int]
        let probes: [ProbeInput]
    }

    private struct WinterProbesExpected: Codable {
        let winterPreDawn0630: StationaryRecoveryRule
        let winterPreDawn0715: StationaryRecoveryRule
        let winterPostDawn0930: StationaryRecoveryRule
        let summerEarly0630: StationaryRecoveryRule
    }

    private struct RestCapsInput: Codable {
        let durations: [Double]
    }

    private struct RestCapPair: Codable {
        let requested: Int
        let effective: Int
    }

    private struct RestCapsExpected: Codable {
        let restricted: [RestCapPair]
        let unrestricted: [RestCapPair]
    }

    private struct RolloutRuleOutput: Codable {
        let rolloutHHMM: String
        let rule: StationaryRecoveryRule
    }

    private struct TripRolloutExpected: Codable {
        let departMode: RolloutRuleOutput
        let arriveMode: RolloutRuleOutput
    }

    private static func makeBaseTrip() -> TripProfile {
        TripProfile(
            departureDate: "2026-12-15",
            departureTime: "06:30",
            id: "golden-base-trip",
            name: "Nantes-Ancenis",
            tag: "COMMUTE",
            description: "45 km · Commute",
            physics: PhysicsParams(
                riderWeightKg: 70,
                bikeWeightKg: 9,
                gearWeightKg: 2,
                cda: 0.32,
                crr: 0.0045,
                rho: 1.225,
                drivetrainEfficiency: 0.97,
                grossMechanicalEfficiency: 0.22,
                gradientPercent: 0
            ),
            route: RouteParams(
                elevationGainM: 280,
                origin: "Nantes",
                destination: "Ancenis",
                distanceKm: 45,
                targetSpeedKmH: 27,
                pacingMode: "speed",
                urbanTrafficDelayMinutes: 8,
                gateSecurityDelayMinutes: 5,
                coordinates: [LatLon(lat: 47.2184, lon: -1.5536), LatLon(lat: 47.3653, lon: -1.1764)],
                waypoints: []
            ),
            office: OfficeConstraints(
                showerBufferMinutes: 15,
                shiftStartTime: "09:00",
                targetGateArrivalTime: "08:30"
            ),
            weather: WeatherCondition(
                isHeadwindActive: false,
                baseWindSpeedKmH: 8,
                windDirection: "calm",
                temperatureC: 14,
                relativeHumidity: 60,
                precipitationRiskPercent: 10,
                estuaryGustKmH: 14
            ),
            checklist: [],
            arriveAtMode: false
        )
    }

    @Test("Matches stationaryRecovery.golden.json")
    func matchesGolden() throws {
        let data = try GoldenFixtureLoader.loadData(fileName: "stationaryRecovery.golden.json")
        let root = try JSONSerialization.jsonObject(with: data) as! [String: Any]
        let cases = root["cases"] as! [[String: Any]]
        let decoder = JSONDecoder()
        let frozenNow = ISO8601DateFormatter().date(from: "2026-11-26T12:00:00.000Z") ?? Date()

        func caseById(_ id: String) -> [String: Any] {
            cases.first(where: { ($0["id"] as? String) == id })!
        }

        // Case 1: winter-predawn-vs-postdawn-vs-summer
        do {
            let c = caseById("winter-predawn-vs-postdawn-vs-summer")
            let input: WinterProbesInput = try decoder.decode(WinterProbesInput.self, from: JSONSerialization.data(withJSONObject: c["input"]!))
            let expected: WinterProbesExpected = try decoder.decode(WinterProbesExpected.self, from: JSONSerialization.data(withJSONObject: c["expected"]!))

            #expect(StationaryRecoveryEngine.preDawnWinterMaxRestMin == input.constants["PRE_DAWN_WINTER_MAX_REST_MIN"])
            #expect(StationaryRecoveryEngine.lunchBreakMinDuration == input.constants["LUNCH_BREAK_MIN_DURATION"])

            let outputs = input.probes.map {
                StationaryRecoveryEngine.getStationaryRecoveryRule(
                    rolloutTimeHHMM: $0.rolloutTimeHHMM,
                    departureDate: $0.departureDate,
                    now: frozenNow
                )
            }
            #expect(outputs[0] == expected.winterPreDawn0630)
            #expect(outputs[1] == expected.winterPreDawn0715)
            #expect(outputs[2] == expected.winterPostDawn0930)
            #expect(outputs[3] == expected.summerEarly0630)
        }

        // Case 2: resolve-rest-stop-caps
        do {
            let c = caseById("resolve-rest-stop-caps")
            let input: RestCapsInput = try decoder.decode(RestCapsInput.self, from: JSONSerialization.data(withJSONObject: c["input"]!))
            let expected: RestCapsExpected = try decoder.decode(RestCapsExpected.self, from: JSONSerialization.data(withJSONObject: c["expected"]!))

            let restrictedRule = StationaryRecoveryEngine.getStationaryRecoveryRule(
                rolloutTimeHHMM: "06:30",
                departureDate: "2026-12-15",
                now: frozenNow
            )
            let unrestrictedRule = StationaryRecoveryEngine.getStationaryRecoveryRule(
                rolloutTimeHHMM: "09:30",
                departureDate: "2026-12-15",
                now: frozenNow
            )

            for (idx, dur) in input.durations.enumerated() {
                #expect(StationaryRecoveryEngine.resolveEffectiveRestStopMinutes(requestedMinutes: dur, rule: restrictedRule) == expected.restricted[idx].effective)
                #expect(StationaryRecoveryEngine.resolveEffectiveRestStopMinutes(requestedMinutes: dur, rule: unrestrictedRule) == expected.unrestricted[idx].effective)
            }
        }

        // Case 3: trip-rollout-and-rule
        do {
            let c = caseById("trip-rollout-and-rule")
            let expected: TripRolloutExpected = try decoder.decode(TripRolloutExpected.self, from: JSONSerialization.data(withJSONObject: c["expected"]!))

            var departTrip = Self.makeBaseTrip()
            departTrip.arriveAtMode = false
            departTrip.departureTime = "06:30"
            departTrip.departureDate = "2026-12-15"

            var arriveTrip = Self.makeBaseTrip()
            arriveTrip.arriveAtMode = true
            arriveTrip.departureDate = "2026-12-15"
            arriveTrip.route.distanceKm = 45
            arriveTrip.route.targetSpeedKmH = 27
            arriveTrip.route.urbanTrafficDelayMinutes = 10
            arriveTrip.route.gateSecurityDelayMinutes = 5
            arriveTrip.office.targetGateArrivalTime = "08:30"

            #expect(StationaryRecoveryEngine.estimateTripRolloutTimeHHMM(departTrip) == expected.departMode.rolloutHHMM)
            #expect(StationaryRecoveryEngine.getStationaryRecoveryRuleForTrip(departTrip, now: frozenNow) == expected.departMode.rule)
            #expect(StationaryRecoveryEngine.estimateTripRolloutTimeHHMM(arriveTrip) == expected.arriveMode.rolloutHHMM)
            #expect(StationaryRecoveryEngine.getStationaryRecoveryRuleForTrip(arriveTrip, now: frozenNow) == expected.arriveMode.rule)
        }
    }
}
