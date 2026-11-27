import Foundation
import Testing
@testable import CadenceCore

@Suite("FitExporterEngine Golden Parity")
struct FitExporterTests {
    @Test("Matches all 4 fitExporter.golden.json cases")
    func matchesGolden() throws {
        let data = try GoldenFixtureLoader.loadData(fileName: "fitExporter.golden.json")
        let root = try JSONSerialization.jsonObject(with: data) as! [String: Any]
        let cases = root["cases"] as! [[String: Any]]
        let frozenEpochMs = 1795694400000.0 // 2026-11-26T12:00:00.000Z

        func caseById(_ id: String) -> [String: Any] {
            cases.first(where: { ($0["id"] as? String) == id })!
        }

        func verifyFit(_ fitData: Data, against exp: [String: Any]) {
            #expect(fitData.base64EncodedString() == (exp["base64"] as! String))
            let info = FitExporterEngine.inspectFitBinary(fitData)
            let msgCounts = exp["messageCounts"] as! [String: Any]
            #expect(info.byteLength == (exp["byteLength"] as! Int))
            #expect(info.headerSize == (exp["headerSize"] as! Int))
            #expect(info.headerCrcValid == true)
            #expect(info.fileCrcValid == true)
            #expect(info.recordCount == (msgCounts["record"] as! Int))
            #expect(info.coursePointCount == (msgCounts["coursePoint"] as! Int))
        }

        // 1. minimal-route
        do {
            let c = caseById("minimal-route")
            let exp = c["expected"] as! [String: Any]
            var trip = Self.makeBaseTrip()
            trip.route.distanceKm = 20
            trip.route.targetSpeedKmH = 25
            let fitData = FitExporterEngine.exportTripToFit(
                trip,
                options: FitExportOptions(includeFuelingCues: false, includeClimbCues: false, exportTimestampMs: frozenEpochMs)
            )
            verifyFit(fitData, against: exp)
        }

        // 2. amenities-and-cues-utf8
        do {
            let c = caseById("amenities-and-cues-utf8")
            let exp = c["expected"] as! [String: Any]
            var trip = Self.makeBaseTrip()
            trip.route.distanceKm = 40
            trip.route.targetSpeedKmH = 25
            trip.route.cueSheet = [
                RouteCueStep(lat: 47.2184, lng: -1.5536, distKm: 0, instruction: "Depart", direction: .depart),
                RouteCueStep(lat: 47.29, lng: -1.35, distKm: 10, instruction: "Turn right onto Rue Haute", direction: .right, streetName: "Rue Haute")
            ]
            trip.pinnedAmenities = [
                StageAmenity(
                    id: "utf8-stop",
                    category: .food,
                    subType: "bakery",
                    name: "Stop 1234567 €€€",
                    lat: 47.29,
                    lon: -1.35,
                    routeKm: 8.2,
                    detourMeters: 0,
                    isPinned: true
                )
            ]
            let fitData = FitExporterEngine.exportTripToFit(
                trip,
                options: FitExportOptions(includeFuelingCues: false, includeClimbCues: false, exportTimestampMs: frozenEpochMs)
            )
            verifyFit(fitData, against: exp)
        }

        // 3. alpine-locked-80-en
        do {
            let c = caseById("alpine-locked-80-en")
            let exp = c["expected"] as! [String: Any]
            var trip = Self.makeClimbingTrip()
            trip.route.distanceKm = 65
            trip.route.targetSpeedKmH = 18
            let fitData = FitExporterEngine.exportTripToFit(
                trip,
                options: FitExportOptions(
                    includeFuelingCues: true, includeClimbCues: true, fuelIntervalMinutes: 35,
                    lang: .en, ftpWatts: 300, carbTargetGPerHr: 80,
                    nutritionPreference: .sportsFuel, carbPacingMode: "locked", riderLevel: .regular,
                    exportTimestampMs: frozenEpochMs
                )
            )
            verifyFit(fitData, against: exp)
        }

        // 4. alpine-auto-pro-fr
        do {
            let c = caseById("alpine-auto-pro-fr")
            let exp = c["expected"] as! [String: Any]
            var trip = Self.makeClimbingTrip()
            trip.route.distanceKm = 65
            trip.route.targetSpeedKmH = 18
            let fitData = FitExporterEngine.exportTripToFit(
                trip,
                options: FitExportOptions(
                    includeFuelingCues: true, includeClimbCues: true, fuelIntervalMinutes: 35,
                    lang: .fr, ftpWatts: 300, carbTargetGPerHr: 90,
                    nutritionPreference: .realFood, carbPacingMode: "auto", riderLevel: .pro,
                    exportTimestampMs: frozenEpochMs
                )
            )
            verifyFit(fitData, against: exp)
        }
    }

    private static func makeBaseTrip() -> TripProfile {
        TripProfile(
            departureDate: "2026-11-26",
            departureTime: "08:00",
            id: "golden-base-trip",
            name: "Loire Valley Reference",
            tag: "SPORT",
            description: "Deterministic reference trip",
            physics: PhysicsParams(
                riderWeightKg: 70, bikeWeightKg: 9, gearWeightKg: 2, cda: 0.32,
                crr: 0.0045, rho: 1.225, drivetrainEfficiency: 0.97, grossMechanicalEfficiency: 0.22, gradientPercent: 0
            ),
            route: RouteParams(
                origin: "Nantes", destination: "Ancenis", distanceKm: 50,
                targetSpeedKmH: 28, pacingMode: "speed", urbanTrafficDelayMinutes: 0, gateSecurityDelayMinutes: 0,
                coordinates: [LatLon(lat: 47.2184, lon: -1.5536), LatLon(lat: 47.29, lon: -1.35), LatLon(lat: 47.3667, lon: -1.1833)]
            ),
            office: OfficeConstraints(
                shiftStartTime: "09:00", targetGateArrivalTime: "08:30", gateName: "Main Gate",
                lockerRefuelMinutes: 10, showerChangeMinutes: 10, breakRoomBreakfastMinutes: 10
            ),
            weather: WeatherCondition(
                isHeadwindActive: false, baseWindSpeedKmH: 0, windDirection: "calm", windDirectionDegrees: 0,
                temperatureC: 18, precipitationRiskPercent: 0, estuaryGustKmH: 0, visibilityKm: 20
            ),
            checklist: [],
            arriveAtMode: false
        )
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
