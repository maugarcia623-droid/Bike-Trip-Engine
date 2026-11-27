import Foundation
import Testing
@testable import CadenceCore

@Suite("StemStickerEngine Golden Parity")
struct StemStickerTests {
    @Test("Matches all 3 stemSticker.golden.json cases")
    func matchesGolden() throws {
        let data = try GoldenFixtureLoader.loadData(fileName: "stemSticker.golden.json")
        let root = try JSONSerialization.jsonObject(with: data) as! [String: Any]
        let cases = root["cases"] as! [[String: Any]]
        let decoder = JSONDecoder()
        let frozenNow = Date(timeIntervalSince1970: 1795694400) // 2026-11-26T12:00:00.000Z

        func caseById(_ id: String) -> [String: Any] {
            cases.first(where: { ($0["id"] as? String) == id })!
        }

        // 1. ventoux-gravel-selected-stops-en
        do {
            let c = caseById("ventoux-gravel-selected-stops-en")
            let exp = c["expected"] as! [String: Any]
            let expPresets = try decoder.decode([String: StemStickerPreset].self, from: JSONSerialization.data(withJSONObject: exp["presets"]!))
            let expSticker = try decoder.decode(StemStickerData.self, from: JSONSerialization.data(withJSONObject: exp["sticker"]!))
            #expect(StemStickerEngine.presets == expPresets)

            let ventouxTrip = Self.makeVentouxToolTrip(now: frozenNow)
            let mockStops = [
                StageAmenity(id: "stop-a", category: .food, subType: "bakery", name: "Boulangerie A", lat: 44.14, lon: 5.21, routeKm: 10, detourMeters: 20),
                StageAmenity(id: "stop-b", category: .water, subType: "drinking_water", name: "Fontaine B", lat: 44.16, lon: 5.26, routeKm: 28, detourMeters: 10),
            ]
            let actual = StemStickerEngine.buildStemStickerData(
                trip: ventouxTrip,
                amenities: mockStops,
                selectedAmenityIds: ["stop-b"],
                customNotes: [StemStickerNote(id: "c1", km: 15.2, label: "Chalet Reynard Coffee")],
                presetId: "gravel",
                lang: .en,
                now: frozenNow
            )
            #expect(actual == expSticker)
        }

        // 2. road-preset-water-gap-fr
        do {
            let c = caseById("road-preset-water-gap-fr")
            let exp = try decoder.decode(StemStickerData.self, from: JSONSerialization.data(withJSONObject: c["expected"]!))
            var dryTourTrip = Self.makeBaseTrip(
                name: "Boucle Sèche 95 km",
                departureDate: "2026-07-15",
                departureTime: "07:30"
            )
            dryTourTrip.route.distanceKm = 95
            dryTourTrip.route.elevationGainM = 650
            dryTourTrip.route.targetSpeedKmH = 26
            dryTourTrip.weather.temperatureC = 27

            var specs = RiderBikeSpecs.defaultSpecs
            specs.pressureUnit = .psi
            let actual = StemStickerEngine.buildStemStickerData(
                trip: dryTourTrip,
                riderSpecs: specs,
                amenities: [],
                presetId: "road",
                lang: .fr,
                now: frozenNow
            )
            #expect(actual == exp)
        }

        // 3. short-ride-carb-locked-vs-auto
        do {
            let c = caseById("short-ride-carb-locked-vs-auto")
            let exp = c["expected"] as! [String: Any]
            let expAuto = try decoder.decode(StemStickerData.self, from: JSONSerialization.data(withJSONObject: exp["autoShortSticker"]!))
            let expLocked = try decoder.decode(StemStickerData.self, from: JSONSerialization.data(withJSONObject: exp["lockedShortSticker"]!))

            var shortRideTrip = Self.makeBaseTrip(
                name: "Short Interval Spin",
                departureDate: "2026-07-15",
                departureTime: "08:00"
            )
            shortRideTrip.route.distanceKm = 12
            shortRideTrip.route.elevationGainM = 80
            shortRideTrip.route.targetSpeedKmH = 25

            var autoSpecs = RiderBikeSpecs.defaultSpecs
            autoSpecs.carbTargetGPerHr = 80
            autoSpecs.carbPacingMode = "auto"

            var lockedSpecs = RiderBikeSpecs.defaultSpecs
            lockedSpecs.carbTargetGPerHr = 80
            lockedSpecs.carbPacingMode = "locked"

            #expect(StemStickerEngine.buildStemStickerData(trip: shortRideTrip, riderSpecs: autoSpecs, presetId: "road", lang: .en, now: frozenNow) == expAuto)
            #expect(StemStickerEngine.buildStemStickerData(trip: shortRideTrip, riderSpecs: lockedSpecs, presetId: "road", lang: .en, now: frozenNow) == expLocked)
        }
    }

    private static func makeBaseTrip(name: String, departureDate: String, departureTime: String) -> TripProfile {
        TripProfile(
            departureDate: departureDate,
            departureTime: departureTime,
            id: "golden-base-trip",
            name: name,
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

    private static func makeVentouxToolTrip(now: Date) -> TripProfile {
        let anchors: [(km: Double, eleM: Double)] = [
            (0, 305), (5.5, 540), (15.2, 1417), (21.4, 1909),
            (32, 1120), (42.5, 320), (50.2, 448), (57.8, 305),
        ]
        let totalDistanceKm = 57.8
        let samples = 90
        var raw: [(distKm: Double, eleM: Double)] = []
        for i in 0..<samples {
            let distKm = JSCompat.jsToFixedNumber((Double(i) / Double(samples - 1)) * totalDistanceKm, decimals: 2)
            var segIdx = 0
            for j in 0..<(anchors.count - 1) {
                if distKm >= anchors[j].km { segIdx = j }
            }
            let a = anchors[segIdx]
            let b = anchors[min(anchors.count - 1, segIdx + 1)]
            let span = max(0.01, b.km - a.km)
            let t = max(0.0, min(1.0, (distKm - a.km) / span))
            let smoothT = t * t * (3.0 - 2.0 * t)
            let eleM = Double(JSCompat.jsRoundInt(a.eleM + (b.eleM - a.eleM) * smoothT))
            raw.append((distKm, eleM))
        }
        let eleProfile: [ElevationProfilePoint] = raw.enumerated().map { idx, pt in
            if idx == 0 { return ElevationProfilePoint(distKm: pt.distKm, eleM: pt.eleM, gradePct: 0) }
            let prev = raw[idx - 1]
            let dKm = max(0.01, pt.distKm - prev.distKm)
            let gradePct = JSCompat.jsToFixedNumber(((pt.eleM - prev.eleM) / (dKm * 1000.0)) * 100.0, decimals: 1)
            return ElevationProfilePoint(distKm: pt.distKm, eleM: pt.eleM, gradePct: gradePct)
        }

        let coords: [LatLon] = [
            LatLon(lat: 44.1235, lon: 5.1795), LatLon(lat: 44.1422, lon: 5.2112), LatLon(lat: 44.1495, lon: 5.2368),
            LatLon(lat: 44.1605, lon: 5.2632), LatLon(lat: 44.1568, lon: 5.2852), LatLon(lat: 44.1682, lon: 5.2824),
            LatLon(lat: 44.1736, lon: 5.2787), LatLon(lat: 44.1842, lon: 5.2495), LatLon(lat: 44.1935, lon: 5.2098),
            LatLon(lat: 44.1742, lon: 5.1322), LatLon(lat: 44.1462, lon: 5.1495), LatLon(lat: 44.1235, lon: 5.1795),
        ]

        var base = PlanShareCodec.buildDefaultNewTripTemplate(lang: .en, now: now)
        base.id = "trip-tool-ventoux"
        base.name = "Mont Ventoux Classic — Bédoin Loop"
        base.tag = "Sport"
        base.departureDate = "2026-07-15"
        base.departureTime = "08:00"
        base.arriveAtMode = false
        base.physics.gradientPercent = 1.13
        base.route.routeMode = "gpx"
        base.route.origin = "Bédoin"
        base.route.destination = "Bédoin"
        base.route.distanceKm = 57.8
        base.route.elevationGainM = 1640
        base.route.elevationLossM = 1640
        base.route.targetSpeedKmH = 20
        base.route.coordinates = coords
        base.route.elevationProfile = eleProfile
        return base
    }
}
