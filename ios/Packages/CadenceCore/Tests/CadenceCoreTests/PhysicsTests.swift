import Foundation
import Testing
@testable import CadenceCore

@Suite("PhysicsEngine Golden Parity")
struct PhysicsTests {
    private static func approx(_ a: Double, _ b: Double, tol: Double = 1e-4) -> Bool {
        abs(a - b) <= tol
    }

    private static func expectPhysicsEqual(_ actual: PhysicsCalculationResult, _ expected: PhysicsCalculationResult, _ label: String) {
        #expect(approx(actual.systemMassKg, expected.systemMassKg), "\(label) systemMassKg")
        #expect(approx(actual.groundSpeedMs, expected.groundSpeedMs), "\(label) groundSpeedMs")
        #expect(approx(actual.airSpeedMs, expected.airSpeedMs), "\(label) airSpeedMs")
        #expect(approx(actual.effectiveSpeedKmH, expected.effectiveSpeedKmH), "\(label) effectiveSpeedKmH")
        #expect(approx(actual.calmSpeedKmH, expected.calmSpeedKmH), "\(label) calmSpeedKmH")
        #expect(approx(actual.baselineLegWatts, expected.baselineLegWatts), "\(label) baselineLegWatts")
        #expect(approx(actual.rollingResistanceWatts, expected.rollingResistanceWatts), "\(label) rollingResistanceWatts")
        #expect(approx(actual.aerodynamicDragWatts, expected.aerodynamicDragWatts), "\(label) aerodynamicDragWatts")
        #expect(approx(actual.gravityWatts, expected.gravityWatts), "\(label) gravityWatts")
        #expect(approx(actual.wheelWatts, expected.wheelWatts), "\(label) wheelWatts")
        #expect(approx(actual.legWatts, expected.legWatts), "\(label) legWatts")
        #expect(approx(actual.wattsPerKg, expected.wattsPerKg), "\(label) wattsPerKg")
        #expect(approx(actual.ftpWatts, expected.ftpWatts), "\(label) ftpWatts")
        #expect(approx(actual.ftpPercent, expected.ftpPercent), "\(label) ftpPercent")
        #expect(actual.powerZone == expected.powerZone, "\(label) powerZone")
        #expect(actual.pacingMode == expected.pacingMode, "\(label) pacingMode")
        #expect(actual.windDelayMinutes == expected.windDelayMinutes, "\(label) windDelayMinutes")
        #expect(approx(actual.movingTimeSeconds, expected.movingTimeSeconds, tol: 1e-3), "\(label) movingTimeSeconds")
        #expect(actual.movingTimeFormatted == expected.movingTimeFormatted, "\(label) movingTimeFormatted")
        #expect(approx(actual.totalWorkKj, expected.totalWorkKj, tol: 1e-2), "\(label) totalWorkKj")
        #expect(approx(actual.totalKcalBurn, expected.totalKcalBurn, tol: 1e-2), "\(label) totalKcalBurn")
        #expect(approx(actual.carbOxidationGramPerHour, expected.carbOxidationGramPerHour), "\(label) carbOxidationGramPerHour")
        #expect(approx(actual.totalCarbsBurnedGrams, expected.totalCarbsBurnedGrams), "\(label) totalCarbsBurnedGrams")
        #expect(approx(actual.speedDeltaKmH, expected.speedDeltaKmH), "\(label) speedDeltaKmH")
        #expect(approx(actual.powerDeltaWatts, expected.powerDeltaWatts), "\(label) powerDeltaWatts")
        #expect(actual.goStatus == expected.goStatus, "\(label) goStatus")
        #expect(actual.goStatusReason == expected.goStatusReason, "\(label) goStatusReason")
        #expect(approx(actual.effectiveCrr, expected.effectiveCrr, tol: 1e-5), "\(label) effectiveCrr")
        #expect(approx(actual.crrMultiplier, expected.crrMultiplier, tol: 1e-3), "\(label) crrMultiplier")
        #expect(actual.roadCondition == expected.roadCondition, "\(label) roadCondition")
        #expect(approx(actual.cautionPaceFactor, expected.cautionPaceFactor, tol: 1e-3), "\(label) cautionPaceFactor")
        #expect(actual.cautionDelayMinutes == expected.cautionDelayMinutes, "\(label) cautionDelayMinutes")
        #expect(actual.cautionReasons == expected.cautionReasons, "\(label) cautionReasons")
        #expect(actual.surfaceCrrSource == expected.surfaceCrrSource, "\(label) surfaceCrrSource")
    }

    @Test("Matches all 9 physics.golden.json cases")
    func matchesGolden() throws {
        let data = try GoldenFixtureLoader.loadData(fileName: "physics.golden.json")
        let root = try JSONSerialization.jsonObject(with: data) as! [String: Any]
        let cases = root["cases"] as! [[String: Any]]
        let decoder = JSONDecoder()

        func caseById(_ id: String) -> [String: Any] {
            cases.first(where: { ($0["id"] as? String) == id })!
        }

        // 1. power-zones
        do {
            let c = caseById("power-zones")
            let expected = c["expected"] as! [[String: Any]]
            for item in expected {
                let pct = item["pct"] as! Double
                let zone = item["zone"] as! String
                #expect(PhysicsEngine.getPowerZone(pct) == zone)
            }
        }

        // 2. flat-calm-speed & 3. headwind-speed-fr
        for id in ["flat-calm-speed", "headwind-speed-fr"] {
            let c = caseById(id)
            let input = c["input"] as! [String: Any]
            let physics = try decoder.decode(PhysicsParams.self, from: JSONSerialization.data(withJSONObject: input["physics"]!))
            let route = try decoder.decode(RouteParams.self, from: JSONSerialization.data(withJSONObject: input["route"]!))
            let weather = try decoder.decode(WeatherCondition.self, from: JSONSerialization.data(withJSONObject: input["weather"]!))
            let lang: CadenceLang = (input["lang"] as? String) == "fr" ? .fr : .en
            let ftp = input["ftpOverride"] as? Double
            let env = try input["envContext"].map { try decoder.decode(PhysicsEnvironmentContext.self, from: JSONSerialization.data(withJSONObject: $0)) }

            let exp = c["expected"] as! [String: Any]
            let expResult = try decoder.decode(PhysicsCalculationResult.self, from: JSONSerialization.data(withJSONObject: exp["result"]!))
            let expDidactic = try decoder.decode(PhysicsEngine.WattsDidacticGuide.self, from: JSONSerialization.data(withJSONObject: exp["didactic"]!))

            let actual = PhysicsEngine.calculatePhysics(physics: physics, route: route, weather: weather, lang: lang, ftpOverride: ftp, envContext: env)
            Self.expectPhysicsEqual(actual, expResult, id)
            let actualDidactic = PhysicsEngine.getWattsDidacticExplanation(legWatts: actual.legWatts, ftpWatts: ftp ?? 240, riderWeightKg: physics.riderWeightKg, lang: lang)
            #expect(actualDidactic == expDidactic, "\(id) didactic")
        }

        // 4. headwind-effort & 5. tailwind-speed
        for id in ["headwind-effort", "tailwind-speed"] {
            let c = caseById(id)
            let input = c["input"] as! [String: Any]
            let physics = try decoder.decode(PhysicsParams.self, from: JSONSerialization.data(withJSONObject: input["physics"]!))
            let route = try decoder.decode(RouteParams.self, from: JSONSerialization.data(withJSONObject: input["route"]!))
            let weather = try decoder.decode(WeatherCondition.self, from: JSONSerialization.data(withJSONObject: input["weather"]!))
            let lang: CadenceLang = (input["lang"] as? String) == "fr" ? .fr : .en
            let ftp = input["ftpOverride"] as? Double
            let expResult = try decoder.decode(PhysicsCalculationResult.self, from: JSONSerialization.data(withJSONObject: c["expected"]!))

            let actual = PhysicsEngine.calculatePhysics(physics: physics, route: route, weather: weather, lang: lang, ftpOverride: ftp)
            Self.expectPhysicsEqual(actual, expResult, id)
        }

        // 6. climb-and-descent
        do {
            let c = caseById("climb-and-descent")
            let input = c["input"] as! [String: Any]
            let climbP = try decoder.decode(PhysicsParams.self, from: JSONSerialization.data(withJSONObject: input["climbPhysics"]!))
            let descentP = try decoder.decode(PhysicsParams.self, from: JSONSerialization.data(withJSONObject: input["descentPhysics"]!))
            let route = try decoder.decode(RouteParams.self, from: JSONSerialization.data(withJSONObject: input["route"]!))
            let weather = try decoder.decode(WeatherCondition.self, from: JSONSerialization.data(withJSONObject: input["weather"]!))
            let ftp = input["ftpOverride"] as? Double

            let exp = c["expected"] as! [String: Any]
            let expClimb = try decoder.decode(PhysicsCalculationResult.self, from: JSONSerialization.data(withJSONObject: exp["climb"]!))
            let expDescent = try decoder.decode(PhysicsCalculationResult.self, from: JSONSerialization.data(withJSONObject: exp["descent"]!))

            Self.expectPhysicsEqual(PhysicsEngine.calculatePhysics(physics: climbP, route: route, weather: weather, lang: .en, ftpOverride: ftp), expClimb, "climb")
            Self.expectPhysicsEqual(PhysicsEngine.calculatePhysics(physics: descentP, route: route, weather: weather, lang: .en, ftpOverride: ftp), expDescent, "descent")
        }

        // 7. cold-wet-dark-caution
        do {
            let c = caseById("cold-wet-dark-caution")
            let input = c["input"] as! [String: Any]
            let physics = try decoder.decode(PhysicsParams.self, from: JSONSerialization.data(withJSONObject: input["physics"]!))
            let route = try decoder.decode(RouteParams.self, from: JSONSerialization.data(withJSONObject: input["route"]!))
            let weather = try decoder.decode(WeatherCondition.self, from: JSONSerialization.data(withJSONObject: input["weather"]!))
            let env = try decoder.decode(PhysicsEnvironmentContext.self, from: JSONSerialization.data(withJSONObject: input["envContext"]!))

            let exp = c["expected"] as! [String: Any]
            let expEn = try decoder.decode(PhysicsCalculationResult.self, from: JSONSerialization.data(withJSONObject: exp["en"]!))
            let expFr = try decoder.decode(PhysicsCalculationResult.self, from: JSONSerialization.data(withJSONObject: exp["fr"]!))

            #expect(PhysicsEngine.classifyRoadSurfaceCondition(weather).rawValue == (exp["roadCondition"] as! String))
            let actualEn = PhysicsEngine.calculatePhysics(physics: physics, route: route, weather: weather, lang: .en, ftpOverride: 240, envContext: env)
            let actualFr = PhysicsEngine.calculatePhysics(physics: physics, route: route, weather: weather, lang: .fr, ftpOverride: 240, envContext: env)
            Self.expectPhysicsEqual(actualEn, expEn, "cold-wet-en")
            Self.expectPhysicsEqual(actualFr, expFr, "cold-wet-fr")
            #expect(PhysicsEngine.formatCautionPaceSummary(actualEn, lang: .en) == (exp["cautionSummaryEn"] as? String))
            #expect(PhysicsEngine.formatCautionPaceSummary(actualFr, lang: .fr) == (exp["cautionSummaryFr"] as? String))
        }

        // 8. sectional-energy-breakdown
        do {
            let c = caseById("sectional-energy-breakdown")
            let exp = c["expected"] as! [String: Any]
            let expEnv = try decoder.decode(PhysicsEnvironmentContext.self, from: JSONSerialization.data(withJSONObject: exp["envContext"]!))
            let expPhys = try decoder.decode(PhysicsCalculationResult.self, from: JSONSerialization.data(withJSONObject: exp["physics"]!))
            let expSect = try decoder.decode(PhysicsEngine.SectionalEnergySummary.self, from: JSONSerialization.data(withJSONObject: exp["sectional"]!))

            let climbingTrip = Self.makeClimbingTrip()
            let env = PhysicsEngine.buildEnvironmentContext(trip: climbingTrip, isTubeless: true, departureDate: "2026-07-15")
            #expect(env == expEnv)
            let phys = PhysicsEngine.calculatePhysics(physics: climbingTrip.physics, route: climbingTrip.route, weather: climbingTrip.weather, lang: .en, ftpOverride: 260, envContext: env)
            Self.expectPhysicsEqual(phys, expPhys, "sectional-phys")
            let sect = PhysicsEngine.calculateSectionalEnergyBreakdown(physics: climbingTrip.physics, route: climbingTrip.route, weather: climbingTrip.weather, result: phys, lang: .en, envContext: env)
            #expect(sect == expSect)
        }

        // 9. zero-distance-guard
        do {
            let c = caseById("zero-distance-guard")
            let input = c["input"] as! [String: Any]
            let physics = try decoder.decode(PhysicsParams.self, from: JSONSerialization.data(withJSONObject: input["physics"]!))
            let route = try decoder.decode(RouteParams.self, from: JSONSerialization.data(withJSONObject: input["route"]!))
            let weather = try decoder.decode(WeatherCondition.self, from: JSONSerialization.data(withJSONObject: input["weather"]!))

            let exp = c["expected"] as! [String: Any]
            let expPhys = try decoder.decode(PhysicsCalculationResult.self, from: JSONSerialization.data(withJSONObject: exp["physics"]!))
            let expSect = try decoder.decode(PhysicsEngine.SectionalEnergySummary.self, from: JSONSerialization.data(withJSONObject: exp["sectional"]!))

            let phys = PhysicsEngine.calculatePhysics(physics: physics, route: route, weather: weather, lang: .en, ftpOverride: 240)
            Self.expectPhysicsEqual(phys, expPhys, "zero-phys")
            let sect = PhysicsEngine.calculateSectionalEnergyBreakdown(physics: physics, route: route, weather: weather, result: phys, lang: .en)
            #expect(sect == expSect)
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
                riderWeightKg: 70,
                bikeWeightKg: 8.5,
                gearWeightKg: 2.5,
                cda: 0.34,
                crr: 0.0045,
                rho: 1.225,
                drivetrainEfficiency: 0.97,
                grossMechanicalEfficiency: 0.22,
                gradientPercent: 1.8
            ),
            route: RouteParams(
                elevationGainM: 820,
                origin: "Bourg",
                destination: "Col Loop",
                distanceKm: 62,
                targetSpeedKmH: 23,
                pacingMode: "speed",
                urbanTrafficDelayMinutes: 0,
                gateSecurityDelayMinutes: 0,
                coordinates: [LatLon(lat: 45.05, lon: 6.02), LatLon(lat: 45.09, lon: 6.08), LatLon(lat: 45.14, lon: 6.13)],
                elevationProfile: elevationProfile,
                waypoints: []
            ),
            office: OfficeConstraints(
                shiftStartTime: "12:00",
                targetGateArrivalTime: "11:30",
                gateName: "Col Summit Cafe",
                lockerRefuelMinutes: 0,
                showerChangeMinutes: 0,
                breakRoomBreakfastMinutes: 0
            ),
            weather: WeatherCondition(
                isHeadwindActive: false,
                baseWindSpeedKmH: 8,
                windDirection: "cross-headwind",
                windDirectionDegrees: 240,
                temperatureC: 24,
                relativeHumidity: 60,
                precipitationRiskPercent: 10,
                estuaryGustKmH: 12
            ),
            checklist: [],
            arriveAtMode: false
        )
    }
}
