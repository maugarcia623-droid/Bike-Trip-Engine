import Foundation
import Testing
@testable import CadenceCore

@Suite("OverpassWaterGapEngine Golden Parity")
struct OverpassWaterGapsTests {
    @Test("Matches all 5 overpassWaterGaps.golden.json cases")
    func matchesGolden() throws {
        let data = try GoldenFixtureLoader.loadData(fileName: "overpassWaterGaps.golden.json")
        let root = try JSONSerialization.jsonObject(with: data) as! [String: Any]
        let cases = root["cases"] as! [[String: Any]]
        let decoder = JSONDecoder()

        func caseById(_ id: String) -> [String: Any] {
            cases.first(where: { ($0["id"] as? String) == id })!
        }

        // 1. haversine-and-cumulative
        do {
            let c = caseById("haversine-and-cumulative")
            let input = c["input"] as! [String: Any]
            let coords = try decoder.decode([LatLon].self, from: JSONSerialization.data(withJSONObject: input["coords"]!))
            let exp = c["expected"] as! [String: Any]
            let expLeg = exp["firstLegMeters"] as! Double
            let expCum = exp["cumulativeMeters"] as! [Double]

            let leg = OverpassWaterGapEngine.haversineDistanceMeters(
                lat1: coords[0].lat, lon1: coords[0].lon, lat2: coords[1].lat, lon2: coords[1].lon
            )
            #expect(abs(leg - expLeg) < 1e-6)
            let cum = OverpassWaterGapEngine.computeCumulativeDistances(coords)
            #expect(cum.count == expCum.count)
            for i in 0..<cum.count {
                #expect(abs(cum[i] - expCum[i]) < 1e-6)
            }
        }

        // 2. snap-and-resnap
        do {
            let c = caseById("snap-and-resnap")
            let input = c["input"] as! [String: Any]
            let coords = try decoder.decode([LatLon].self, from: JSONSerialization.data(withJSONObject: input["coords"]!))
            let rawElev = input["elev"] as! [[String: Any]]
            let elev = rawElev.map { ElevationProfilePoint(distKm: $0["distKm"] as! Double, eleM: $0["eleM"] as! Double, gradePct: 0) }
            let amenities = try decoder.decode([StageAmenity].self, from: JSONSerialization.data(withJSONObject: input["amenities"]!))

            let exp = c["expected"] as! [String: Any]
            let expSnapped = try decoder.decode(PolylineSnapResult.self, from: JSONSerialization.data(withJSONObject: exp["snapped"]!))
            let expResnapped = try decoder.decode([StageAmenity].self, from: JSONSerialization.data(withJSONObject: exp["resnapped"]!))

            let cum = OverpassWaterGapEngine.computeCumulativeDistances(coords)
            let snapped = OverpassWaterGapEngine.snapToPolyline(
                lat: input["queryLat"] as! Double,
                lon: input["queryLon"] as! Double,
                coordinates: coords,
                cumDistancesMeters: cum,
                elevationProfile: elev
            )
            #expect(snapped == expSnapped)
            let resnapped = OverpassWaterGapEngine.resnapAmenitiesToRoute(amenities, coordinates: coords, elevationProfile: elev)
            #expect(resnapped == expResnapped)
        }

        // 3. water-gaps-clear-caution-critical
        do {
            let c = caseById("water-gaps-clear-caution-critical")
            let input = c["input"] as! [String: Any]
            let waterStops = try decoder.decode([StageAmenity].self, from: JSONSerialization.data(withJSONObject: input["waterStops"]!))
            let cafeOnly = try decoder.decode([StageAmenity].self, from: JSONSerialization.data(withJSONObject: input["cafeOnly"]!))

            let exp = c["expected"] as! [String: Any]
            let expClear = try decoder.decode(WaterGapsSummary.self, from: JSONSerialization.data(withJSONObject: exp["clear"]!))
            let expCaution = try decoder.decode(WaterGapsSummary.self, from: JSONSerialization.data(withJSONObject: exp["caution"]!))
            let expCrit = try decoder.decode(WaterGapsSummary.self, from: JSONSerialization.data(withJSONObject: exp["criticalNoWater"]!))
            let expLegacy = try decoder.decode(WaterGapsSummary.self, from: JSONSerialization.data(withJSONObject: exp["legacyPositional"]!))

            #expect(OverpassWaterGapEngine.calculateWaterGaps(
                amenities: waterStops, totalDistanceKm: 90,
                options: OverpassWaterGapEngine.WaterGapsOptions(sectorSpeedKmH: 25, targetFluidMlPerHr: 400, bidonSizeMl: 650, frameBottleSlots: 2)
            ) == expClear)
            #expect(OverpassWaterGapEngine.calculateWaterGaps(
                amenities: waterStops, totalDistanceKm: 90,
                options: OverpassWaterGapEngine.WaterGapsOptions(sectorSpeedKmH: 25, targetFluidMlPerHr: 700, bidonSizeMl: 650, frameBottleSlots: 2)
            ) == expCaution)
            #expect(OverpassWaterGapEngine.calculateWaterGaps(
                amenities: cafeOnly, totalDistanceKm: 80,
                options: OverpassWaterGapEngine.WaterGapsOptions(sectorSpeedKmH: 25, targetFluidMlPerHr: 500, bidonSizeMl: 650, frameBottleSlots: 2)
            ) == expCrit)
            #expect(OverpassWaterGapEngine.calculateWaterGaps(
                amenities: waterStops, totalDistanceKm: 90,
                legacyCautionThresholdKm: 25, legacyCriticalThresholdKm: 45, legacyBidonSizeMl: 650
            ) == expLegacy)
        }

        // 4. amenity-eta-midnight-and-pacing
        do {
            let c = caseById("amenity-eta-midnight-and-pacing")
            let input = c["input"] as! [String: Any]
            let curve = try decoder.decode([PacingCurvePoint].self, from: JSONSerialization.data(withJSONObject: input["pacingCurve"]!))
            let exp = c["expected"] as! [String: Any]
            let expMidnight = try decoder.decode(AmenityEtaDetails.self, from: JSONSerialization.data(withJSONObject: exp["midnightStart"]!))
            let expRollover = try decoder.decode(AmenityEtaDetails.self, from: JSONSerialization.data(withJSONObject: exp["rollover"]!))
            let expCurved = try decoder.decode(AmenityEtaDetails.self, from: JSONSerialization.data(withJSONObject: exp["curved"]!))

            #expect(OverpassWaterGapEngine.calculateAmenityEtaDetails(departureTime: "00:15", routeKm: 12, effectiveSpeedKmH: 24) == expMidnight)
            #expect(OverpassWaterGapEngine.calculateAmenityEta(departureTime: "00:15", routeKm: 12, effectiveSpeedKmH: 24) == (exp["midnightEtaString"] as! String))
            #expect(OverpassWaterGapEngine.calculateAmenityEtaDetails(departureTime: "23:00", routeKm: 48, effectiveSpeedKmH: 24) == expRollover)
            #expect(OverpassWaterGapEngine.calculateAmenityEtaDetails(departureTime: "08:00", routeKm: 30, effectiveSpeedKmH: 20, pacingCurve: curve) == expCurved)
        }

        // 5. auto-mark-resupply-open-hours
        do {
            let c = caseById("auto-mark-resupply-open-hours")
            let input = c["input"] as! [String: Any]
            let amenities = try decoder.decode([StageAmenity].self, from: JSONSerialization.data(withJSONObject: input["amenities"]!))
            let exp = try decoder.decode(OverpassWaterGapEngine.AutoMarkResupplyResult.self, from: JSONSerialization.data(withJSONObject: c["expected"]!))

            let actual = OverpassWaterGapEngine.autoMarkResupplyStops(
                amenities: amenities,
                totalDistanceKm: input["totalDistanceKm"] as! Double,
                departureTime: input["departureTime"] as! String,
                targetDate: input["targetDate"] as? String,
                effectiveSpeedKmH: input["effectiveSpeedKmH"] as! Double,
                intervalKm: input["intervalKm"] as! Double
            )
            #expect(actual == exp)
        }
    }
}
