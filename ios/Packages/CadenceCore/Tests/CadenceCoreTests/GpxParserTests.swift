import Foundation
import Testing
@testable import CadenceCore

@Suite("GpxParserEngine Golden Parity")
struct GpxParserTests {
    @Test("Matches all 4 gpxParser.golden.json cases")
    func matchesGolden() throws {
        let data = try GoldenFixtureLoader.loadData(fileName: "gpxParser.golden.json")
        let root = try JSONSerialization.jsonObject(with: data) as! [String: Any]
        let cases = root["cases"] as! [[String: Any]]
        let decoder = JSONDecoder()

        func caseById(_ id: String) -> [String: Any] {
            cases.first(where: { ($0["id"] as? String) == id })!
        }

        // 1. gpx-point-to-point-arrow & 2. gpx-loop-no-ele
        for id in ["gpx-point-to-point-arrow", "gpx-loop-no-ele"] {
            let c = caseById(id)
            let input = c["input"] as! [String: Any]
            let gpxText = input["gpxText"] as! String
            let hint = input["fileNameHint"] as? String ?? ""
            let exp = try decoder.decode(GpxParseResult.self, from: JSONSerialization.data(withJSONObject: c["expected"]!))
            let actual = GpxParserEngine.parseGpxFileContent(gpxText, fileNameHint: hint)
            if id == "gpx-point-to-point-arrow" {
                // `exportGoldenFixtures.ts` ran under Node without `DOMParser`, so `gpxParser.ts` used
                // its regex fallback which keeps `&gt;` unescaped (`"Nantes -&gt; Ancenis"`).
                // Foundation `XMLParser` (like browser `DOMParser`) decodes `&gt;` -> `>` and splits origin/dest.
                #expect(actual?.trackName == "Nantes -> Ancenis")
                #expect(actual?.originLabel == "Nantes")
                #expect(actual?.destLabel == "Ancenis")
                #expect(actual?.coordinates == exp.coordinates)
                #expect(actual?.distanceKm == exp.distanceKm)
                #expect(actual?.elevationGainM == exp.elevationGainM)
                #expect(actual?.elevationLossM == exp.elevationLossM)
                #expect(actual?.elevationProfile == exp.elevationProfile)
                #expect(actual?.terrainSummary == exp.terrainSummary)
            } else {
                #expect(actual == exp, "Mismatch in \(id)")
            }
        }

        // 3. synthesize-route-profile
        do {
            let c = caseById("synthesize-route-profile")
            let input = c["input"] as! [String: Any]
            let route = try decoder.decode(RouteParams.self, from: JSONSerialization.data(withJSONObject: input["route"]!))
            let exp = c["expected"] as! [String: Any]
            let expSynth = try decoder.decode(SynthesizedElevationResult.self, from: JSONSerialization.data(withJSONObject: exp["synthesized"]!))
            let expTerrain = try decoder.decode(TerrainSummary.self, from: JSONSerialization.data(withJSONObject: exp["terrainSummary"]!))

            let synth = GpxParserEngine.synthesizeRouteElevationProfile(route)
            #expect(synth == expSynth)
            let terrain = GpxParserEngine.buildTerrainSummaryFromProfile(
                synth.elevationProfile,
                distanceKm: route.distanceKm,
                elevationGainM: route.elevationGainM ?? 0,
                titleHint: "\(route.origin ?? "") -> \(route.destination ?? "")"
            )
            #expect(terrain == expTerrain)
        }

        // 4. fit-roundtrip-decode
        do {
            let c = caseById("fit-roundtrip-decode")
            let input = c["input"] as! [String: Any]
            let ts = input["exportTimestampMs"] as! Double
            let fileName = input["fileName"] as! String
            let exp = try decoder.decode(GpxParseResult.self, from: JSONSerialization.data(withJSONObject: c["expected"]!))

            let alpine = Self.makeClimbingTrip()
            let fitData = FitExporterEngine.exportTripToFit(
                alpine,
                options: FitExportOptions(includeFuelingCues: false, includeClimbCues: false, exportTimestampMs: ts)
            )
            let decoded = RouteFileParserEngine.parseFitFileData(fitData, fileName: fileName)
            #expect(decoded == exp)
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
