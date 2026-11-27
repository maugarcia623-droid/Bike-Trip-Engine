import Foundation
import Testing
@testable import CadenceCore

@Suite("GpxSlicerEngine Golden Parity")
struct GpxSlicerTests {
    @Test("Matches all 3 gpxSlicer.golden.json cases")
    func matchesGolden() throws {
        let data = try GoldenFixtureLoader.loadData(fileName: "gpxSlicer.golden.json")
        let root = try JSONSerialization.jsonObject(with: data) as! [String: Any]
        let cases = root["cases"] as! [[String: Any]]
        let decoder = JSONDecoder()
        let frozenNow = ISO8601DateFormatter().date(from: "2026-11-26T12:00:00.000Z") ?? Date()

        func caseById(_ id: String) -> [String: Any] {
            cases.first(where: { ($0["id"] as? String) == id })!
        }

        // 1. suggest-day-counts
        do {
            let c = caseById("suggest-day-counts")
            let exp = c["expected"] as! [String: Any]
            #expect(GpxSlicerEngine.stageColors == (exp["stageColors"] as! [String]))
            #expect(GpxSlicerEngine.getStageColor(1) == (exp["day2Color"] as! String))
            let suggestions = exp["suggestions"] as! [[String: Any]]
            for item in suggestions {
                let km = item["km"] as! Double
                let gain = item["gain"] as! Double
                let days = item["days"] as! Int
                let minStageKm = item["minStageKm"] as! Double
                #expect(GpxSlicerEngine.suggestDayCount(totalDistanceKm: km, totalElevationGainM: gain) == days)
                #expect(GpxSlicerEngine.getMinStageDistanceKm(totalDistanceKm: km, dayCount: days) == minStageKm)
            }
        }

        // 2. hilly-400km-effort-vs-distance
        do {
            let c = caseById("hilly-400km-effort-vs-distance")
            let exp = c["expected"] as! [String: Any]
            let hillyTrip = Self.make400KmKomootTrip(hillyMiddle: true)
            let hillySpine = GpxSlicerEngine.extractFullTourSpine(hillyTrip, now: frozenNow)!

            let distCuts = GpxSlicerEngine.computeDefaultCutDistances(hillySpine, dayCount: 3, mode: .distance)
            let effortCuts = GpxSlicerEngine.computeDefaultCutDistances(hillySpine, dayCount: 3, mode: .effort)
            #expect(distCuts == (exp["distanceCutsKm"] as! [Double]))
            #expect(effortCuts == (exp["effortCutsKm"] as! [Double]))
            #expect(GpxSlicerEngine.moveSingleCut([130, 265], cutIndex: 0, targetKm: 310, totalDistanceKm: 400) == (exp["movedCut0To310"] as! [Double]))
            #expect(GpxSlicerEngine.clampAndSortCuts([-10, 420, 200], totalDistanceKm: 400) == (exp["clampedCuts"] as! [Double]))

            let expMidCoord = try decoder.decode(LatLon.self, from: JSONSerialization.data(withJSONObject: exp["midCoord200Km"]!))
            let expMidEle = try decoder.decode(ElevationAtDistanceResult.self, from: JSONSerialization.data(withJSONObject: exp["midEle200Km"]!))
            let expNearest = try decoder.decode(NearestDistanceResult.self, from: JSONSerialization.data(withJSONObject: exp["nearestToMidOffset"]!))

            let midCoord = GpxSlicerEngine.interpolateCoordAtDistance(hillySpine, targetKm: 200)
            #expect(midCoord == expMidCoord)
            #expect(GpxSlicerEngine.interpolateElevationAtDistance(hillySpine.elevationProfile, targetKm: 200) == expMidEle)
            #expect(GpxSlicerEngine.findNearestDistanceOnSpine(hillySpine, lat: midCoord.lat + 0.01, lng: midCoord.lon, minKm: 100, maxKm: 300) == expNearest)
        }

        // 3. slice-and-commit-and-remerge
        do {
            let c = caseById("slice-and-commit-and-remerge")
            let exp = c["expected"] as! [String: Any]

            var tourWithin = Self.make400KmKomootTrip(hillyMiddle: false)
            tourWithin.departureDate = "2026-12-01"
            let spineWithin = GpxSlicerEngine.extractFullTourSpine(tourWithin, now: frozenNow)!
            let cutsWithin = GpxSlicerEngine.computeDefaultCutDistances(spineWithin, dayCount: 3, mode: .distance)
            let previewsWithin = GpxSlicerEngine.sliceRouteIntoStagePreviews(
                spineWithin,
                rawCutDistancesKm: cutsWithin,
                options: SlicePreviewOptions(
                    startDateIso: "2026-12-01",
                    dailyStartTime: "08:30",
                    physics: tourWithin.physics,
                    targetSpeedKmH: 20,
                    weather: tourWithin.weather,
                    lang: .en,
                    cutLabels: [0: "Redon", 1: "Pontivy"],
                    cutAccommodationNotes: [0: "Camp · Camping Municipal (0.4 km off route)"]
                )
            )
            let slicedWithin = GpxSlicerEngine.applyStageSlicesToTrip(tourWithin, spine: spineWithin, previews: previewsWithin, now: frozenNow)

            let tourBeyond = Self.make400KmKomootTrip(hillyMiddle: false)
            let spineBeyond = GpxSlicerEngine.extractFullTourSpine(tourBeyond, now: frozenNow)!
            let cutsBeyond = GpxSlicerEngine.computeDefaultCutDistances(spineBeyond, dayCount: 3, mode: .distance)
            let previewsBeyond = GpxSlicerEngine.sliceRouteIntoStagePreviews(
                spineBeyond,
                rawCutDistancesKm: cutsBeyond,
                options: SlicePreviewOptions(
                    startDateIso: "2026-07-10",
                    dailyStartTime: "08:30",
                    physics: tourBeyond.physics,
                    targetSpeedKmH: 20,
                    weather: tourBeyond.weather,
                    lang: .en,
                    cutLabels: [0: "Redon", 1: "Pontivy"]
                )
            )
            let slicedBeyond = GpxSlicerEngine.applyStageSlicesToTrip(tourBeyond, spine: spineBeyond, previews: previewsBeyond, now: frozenNow)
            let reconstructed = GpxSlicerEngine.extractFullTourSpine(slicedBeyond, now: frozenNow)!
            let remerged = GpxSlicerEngine.mergeTourStagesToSingleDay(slicedBeyond, now: frozenNow)

            let expWithin = exp["withinHorizonStages"] as! [[String: Any]]
            let withinStages = slicedWithin.stages ?? []
            #expect(withinStages.count == expWithin.count)
            for (idx, ew) in expWithin.enumerated() {
                let s = withinStages[idx]
                #expect(s.dayNumber == (ew["dayNumber"] as! Int))
                #expect(s.departureDate == (ew["departureDate"] as! String))
                #expect(s.route.distanceKm == (ew["distanceKm"] as! Double))
                #expect(s.route.origin == (ew["origin"] as! String))
                #expect(s.route.destination == (ew["destination"] as! String))
                #expect(s.weather.source == (ew["weatherSource"] as? String))
                #expect(s.weather.isBeyondForecastWindow == (ew["isBeyondForecastWindow"] as? Bool))
            }

            let expBeyond = exp["beyondHorizonStages"] as! [[String: Any]]
            let beyondStages = slicedBeyond.stages ?? []
            #expect(beyondStages.count == expBeyond.count)
            for (idx, eb) in expBeyond.enumerated() {
                let s = beyondStages[idx]
                #expect(s.dayNumber == (eb["dayNumber"] as! Int))
                #expect(s.departureDate == (eb["departureDate"] as! String))
                #expect(s.route.distanceKm == (eb["distanceKm"] as! Double))
                #expect(s.weather.source == (eb["weatherSource"] as? String))
                #expect(s.weather.isBeyondForecastWindow == (eb["isBeyondForecastWindow"] as? Bool))
            }

            let expRec = exp["reconstructedMeta"] as! [String: Any]
            #expect(reconstructed.totalDistanceKm == (expRec["totalDistanceKm"] as! Double))
            #expect(reconstructed.initialCutDistancesKm == (expRec["initialCutDistancesKm"] as? [Double]))
            #expect(reconstructed.initialCutLabels == (expRec["initialCutLabels"] as? [String]))
            #expect(reconstructed.originLabel == (expRec["originLabel"] as! String))
            #expect(reconstructed.destLabel == (expRec["destLabel"] as! String))

            let expRemerged = exp["remergedMeta"] as! [String: Any]
            #expect((remerged.stages != nil) == (expRemerged["stagesDefined"] as! Bool))
            #expect(remerged.route.distanceKm == (expRemerged["distanceKm"] as! Double))
            #expect(remerged.route.origin == (expRemerged["origin"] as! String))
            #expect(remerged.route.destination == (expRemerged["destination"] as! String))
        }
    }

    private static func make400KmKomootTrip(hillyMiddle: Bool) -> TripProfile {
        let totalKm = 400.0
        let count = 201
        var coords: [LatLon] = []
        var profile: [ElevationProfilePoint] = []

        for i in 0..<count {
            let distKm = (Double(i) / Double(count - 1)) * totalKm
            let lat = 47.22 + (Double(i) / Double(count - 1)) * 1.15
            let lng = -1.55 - (Double(i) / Double(count - 1)) * 2.85
            coords.append(LatLon(lat: JSCompat.roundTo(lat, decimals: 5), lon: JSCompat.roundTo(lng, decimals: 5)))

            let eleM: Double
            if hillyMiddle {
                if distKm >= 150 && distKm <= 260 {
                    let phase = ((distKm - 150.0) / 110.0) * Double.pi * 4.0
                    eleM = 60.0 + abs(sin(phase)) * 620.0
                } else {
                    eleM = 35.0 + sin(distKm * 0.08) * 12.0
                }
            } else {
                eleM = 40.0 + sin(distKm * 0.07) * 55.0 + cos(distKm * 0.19) * 28.0
            }

            var gradePct = 0.0
            if i > 0 {
                let prev = profile[i - 1]
                gradePct = JSCompat.roundTo(((eleM - prev.eleM) / ((distKm - prev.distKm) * 1000.0)) * 100.0, decimals: 1)
            }
            profile.append(ElevationProfilePoint(
                distKm: JSCompat.roundTo(distKm, decimals: 2),
                eleM: JSCompat.roundTo(eleM, decimals: 1),
                gradePct: gradePct
            ))
        }

        return TripProfile(
            departureDate: "2026-07-10",
            departureTime: "08:30",
            id: "komoot-400-test",
            name: "Nantes → Finistère Bikepacking",
            tag: "BIKEPACKING",
            description: "Single-day free-tier Komoot export",
            physics: PhysicsParams(
                luggageWeightKg: 8, riderWeightKg: 74, bikeWeightKg: 11, gearWeightKg: 8, cda: 0.38,
                crr: 0.0055, rho: 1.225, drivetrainEfficiency: 0.96, grossMechanicalEfficiency: 0.21, gradientPercent: 0.8
            ),
            route: RouteParams(
                elevationGainM: hillyMiddle ? 2800 : 1850,
                elevationLossM: hillyMiddle ? 2750 : 1820,
                origin: "Nantes",
                destination: "Brest",
                distanceKm: totalKm,
                targetSpeedKmH: 20,
                pacingMode: "speed",
                urbanTrafficDelayMinutes: 0,
                gateSecurityDelayMinutes: 0,
                coordinates: coords,
                routeMode: "gpx",
                originCoords: coords.first,
                destCoords: coords.last,
                gpxFileName: "komoot-400km.gpx",
                elevationProfile: profile,
                waypoints: []
            ),
            office: OfficeConstraints(
                shiftStartTime: "18:00", targetGateArrivalTime: "18:00", gateName: "Brest",
                lockerRefuelMinutes: 0, showerChangeMinutes: 0, breakRoomBreakfastMinutes: 0
            ),
            weather: WeatherCondition(
                source: "live", effectiveHeadwindKmH: 14, isHeadwindActive: true, baseWindSpeedKmH: 20, windDirection: "headwind",
                temperatureC: 20, precipitationRiskPercent: 10, estuaryGustKmH: 14, visibilityKm: 20
            ),
            checklist: [],
            customChips: ["bikepacking-expedition"],
            arriveAtMode: false
        )
    }
}
