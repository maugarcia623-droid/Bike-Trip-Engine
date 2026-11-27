import Foundation
import Testing
@testable import CadenceCore

@Suite("ClimbSplitsEngine Golden Parity")
struct ClimbSplitsTests {
    @Test("Matches all 5 climbSplits.golden.json cases")
    func matchesGolden() throws {
        let data = try GoldenFixtureLoader.loadData(fileName: "climbSplits.golden.json")
        let root = try JSONSerialization.jsonObject(with: data) as! [String: Any]
        let cases = root["cases"] as! [[String: Any]]
        let decoder = JSONDecoder()

        func caseById(_ id: String) -> [String: Any] {
            cases.first(where: { ($0["id"] as? String) == id })!
        }

        // 1. alpine-loop-auto-en
        do {
            let c = caseById("alpine-loop-auto-en")
            let exp = c["expected"] as! [String: Any]
            let expClimbs = try decoder.decode([DetectedClimb].self, from: JSONSerialization.data(withJSONObject: exp["detectedClimbs"]!))
            let expSummary = try decoder.decode(ClimbSplitsSummary.self, from: JSONSerialization.data(withJSONObject: exp["summary"]!))
            let catLabels = exp["categoryLabels"] as! [String: String]

            #expect(ClimbSplitsEngine.formatClimbCategoryLabel(.hc, lang: .en) == catLabels["hcEn"])
            #expect(ClimbSplitsEngine.formatClimbCategoryLabel(.hc, lang: .fr) == catLabels["hcFr"])
            #expect(ClimbSplitsEngine.formatClimbCategoryLabel(.cat1, lang: .en) == catLabels["cat1En"])
            #expect(ClimbSplitsEngine.formatClimbCategoryLabel(.cat2, lang: .fr) == catLabels["cat2Fr"])

            let alpineTrip = Self.makeClimbingTrip()
            #expect(ClimbSplitsEngine.detectClimbs(alpineTrip.route.elevationProfile) == expClimbs)

            let phys260 = PhysicsEngine.calculatePhysics(
                physics: alpineTrip.physics, route: alpineTrip.route, weather: alpineTrip.weather, lang: .en, ftpOverride: 260
            )
            let summary = ClimbSplitsEngine.computeClimbSplitsAndFueling(
                alpineTrip,
                physicsResult: phys260,
                lang: .en,
                options: ClimbSplitsOptions(
                    ftpWatts: 260, carbTargetGPerHr: 60, carbPacingMode: "auto",
                    nutritionPreference: .sportsFuel, departureTimeHHMM: "08:00", checkpointIntervalMinutes: 35
                )
            )
            #expect(summary == expSummary)
        }

        // 2. alpine-loop-locked-80-en
        do {
            let c = caseById("alpine-loop-locked-80-en")
            let exp = c["expected"] as! [String: Any]
            let exp80 = try decoder.decode(ClimbSplitsSummary.self, from: JSONSerialization.data(withJSONObject: exp["locked80Summary"]!))
            let exp25 = try decoder.decode(ClimbSplitsSummary.self, from: JSONSerialization.data(withJSONObject: exp["locked25FloorSummary"]!))

            var slowTrip = Self.makeClimbingTrip()
            slowTrip.route.targetSpeedKmH = 18
            let phys300 = PhysicsEngine.calculatePhysics(
                physics: slowTrip.physics, route: slowTrip.route, weather: slowTrip.weather, lang: .en, ftpOverride: 300
            )

            let sum80 = ClimbSplitsEngine.computeClimbSplitsAndFueling(
                slowTrip, physicsResult: phys300, lang: .en,
                options: ClimbSplitsOptions(ftpWatts: 300, carbTargetGPerHr: 80, carbPacingMode: "locked", riderLevel: .regular, nutritionPreference: .sportsFuel, checkpointIntervalMinutes: 35)
            )
            let sum25 = ClimbSplitsEngine.computeClimbSplitsAndFueling(
                slowTrip, physicsResult: phys300, lang: .en,
                options: ClimbSplitsOptions(ftpWatts: 300, carbTargetGPerHr: 25, carbPacingMode: "locked", riderLevel: .regular, nutritionPreference: .sportsFuel, checkpointIntervalMinutes: 35)
            )
            #expect(sum80 == exp80)
            #expect(sum25 == exp25)
        }

        // 3. pro-auto-override-check
        do {
            let c = caseById("pro-auto-override-check")
            let exp = try decoder.decode(ClimbSplitsSummary.self, from: JSONSerialization.data(withJSONObject: c["expected"]!))
            var slowTrip = Self.makeClimbingTrip()
            slowTrip.route.targetSpeedKmH = 18
            let phys300 = PhysicsEngine.calculatePhysics(
                physics: slowTrip.physics, route: slowTrip.route, weather: slowTrip.weather, lang: .en, ftpOverride: 300
            )
            let actual = ClimbSplitsEngine.computeClimbSplitsAndFueling(
                slowTrip, physicsResult: phys300, lang: .en,
                options: ClimbSplitsOptions(ftpWatts: 300, carbTargetGPerHr: 90, carbPacingMode: "auto", riderLevel: .pro, nutritionPreference: .sportsFuel)
            )
            #expect(actual == exp)
        }

        // 4. flat-ride-fr
        do {
            let c = caseById("flat-ride-fr")
            let exp = try decoder.decode(ClimbSplitsSummary.self, from: JSONSerialization.data(withJSONObject: c["expected"]!))
            var flatTrip = Self.makeClimbingTrip()
            flatTrip.route.elevationProfile = [
                ElevationProfilePoint(distKm: 0, eleM: 25, gradePct: 0),
                ElevationProfilePoint(distKm: 25, eleM: 28, gradePct: 0.01),
                ElevationProfilePoint(distKm: 50, eleM: 26, gradePct: 0)
            ]
            flatTrip.route.elevationGainM = 20
            flatTrip.route.distanceKm = 50
            let physFr = PhysicsEngine.calculatePhysics(
                physics: flatTrip.physics, route: flatTrip.route, weather: flatTrip.weather, lang: .fr, ftpOverride: 230
            )
            let actual = ClimbSplitsEngine.computeClimbSplitsAndFueling(
                flatTrip, physicsResult: physFr, lang: .fr,
                options: ClimbSplitsOptions(ftpWatts: 230, checkpointIntervalMinutes: 35)
            )
            #expect(actual == exp)
        }

        // 5. climb-pacing-curve-and-interpolation
        do {
            let c = caseById("climb-pacing-curve-and-interpolation")
            let input = c["input"] as! [String: Any]
            let profile = try decoder.decode([ElevationProfilePoint].self, from: JSONSerialization.data(withJSONObject: input["profile"]!))
            let exp = c["expected"] as! [String: Any]
            let expCurve = try decoder.decode([PacingCurvePoint].self, from: JSONSerialization.data(withJSONObject: exp["curve"]!))

            let curve = ClimbSplitsEngine.buildClimbAdjustedPacingCurve(
                profile,
                totalDistanceKm: input["totalDistanceKm"] as! Double,
                avgFlatSpeedKmH: input["avgFlatSpeedKmH"] as! Double,
                totalMassKg: input["totalMassKg"] as! Double
            )
            #expect(curve.count == expCurve.count)
            for i in 0..<curve.count {
                #expect(abs(curve[i].distKm - expCurve[i].distKm) < 1e-6)
                #expect(abs(curve[i].elapsedSec - expCurve[i].elapsedSec) < 1e-6)
            }
            #expect(abs(ClimbSplitsEngine.interpolateElapsedSecondsAtKm(curve, 10) - (exp["elapsedAt10KmSec"] as! Double)) < 1e-6)
            #expect(abs(ClimbSplitsEngine.interpolateElapsedSecondsAtKm(curve, 20) - (exp["elapsedAt20KmSec"] as! Double)) < 1e-6)
            #expect(abs(ClimbSplitsEngine.interpolateDistKmAtSeconds(curve, 1500) - (exp["distAt1500SecKm"] as! Double)) < 1e-6)
        }
    }

    private static func makeClimbingTrip() -> TripProfile {
        let elevationProfile: [ElevationProfilePoint] = [
            ElevationProfilePoint(distKm: 0, eleM: 210, gradePct: 0),
            ElevationProfilePoint(distKm: 10, eleM: 225, gradePct: 0.15),
            ElevationProfilePoint(distKm: 12, eleM: 345, gradePct: 6.0),
            ElevationProfilePoint(distKm: 15, eleM: 555, gradePct: 7.0),
            ElevationProfilePoint(distKm: 18, eleM: 765, gradePct: 7.0),
            ElevationProfilePoint(distKm: 28, eleM: 420, gradePct: -3.4),
            ElevationProfilePoint(distKm: 35, eleM: 430, gradePct: 0.14),
            ElevationProfilePoint(distKm: 39, eleM: 650, gradePct: 5.5),
            ElevationProfilePoint(distKm: 55, eleM: 310, gradePct: -2.1),
            ElevationProfilePoint(distKm: 62, eleM: 320, gradePct: 0.14)
        ]
        return TripProfile(
            departureDate: "2026-07-15",
            departureTime: "08:00",
            id: "alpine-loop",
            name: "Col Loop",
            tag: "SPORT",
            description: "Mountain pacing reference",
            physics: PhysicsParams(
                riderWeightKg: 70, bikeWeightKg: 8.5, gearWeightKg: 2.5, cda: 0.34,
                crr: 0.0045, rho: 1.225, drivetrainEfficiency: 0.97, grossMechanicalEfficiency: 0.22, gradientPercent: 1.8
            ),
            route: RouteParams(
                elevationGainM: 820, origin: "Bourg", destination: "Col Loop", distanceKm: 62,
                targetSpeedKmH: 23, pacingMode: "speed", urbanTrafficDelayMinutes: 0, gateSecurityDelayMinutes: 0,
                coordinates: [LatLon(lat: 45.05, lon: 6.02), LatLon(lat: 45.09, lon: 6.08), LatLon(lat: 45.14, lon: 6.13)],
                elevationProfile: elevationProfile, waypoints: []
            ),
            office: OfficeConstraints(
                shiftStartTime: "12:00", targetGateArrivalTime: "11:30", gateName: "Col Summit Cafe",
                lockerRefuelMinutes: 0, showerChangeMinutes: 0, breakRoomBreakfastMinutes: 0
            ),
            weather: WeatherCondition(
                isHeadwindActive: false, baseWindSpeedKmH: 8, windDirection: "cross-headwind",
                windDirectionDegrees: 240, temperatureC: 24, relativeHumidity: 60, precipitationRiskPercent: 10, estuaryGustKmH: 12
            ),
            checklist: [],
            arriveAtMode: false
        )
    }
}
