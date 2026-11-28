import Foundation
import Testing
@testable import CadenceCore

@Suite("GpxExporter & StageManager Totals Tests")
struct GpxExporterTests {
    private let fixedNow = Date(timeIntervalSince1970: 1_783_641_600) // 2026-07-10T00:00:00Z
    private let parisTZ = TimeZone(identifier: "Europe/Paris")!

    private func makeClimbingTrip() -> TripProfile {
        // Synthetic profile with a 6 km @ 6% climb (+360m, Cat 2/3)
        var profile: [ElevationProfilePoint] = []
        for i in 0...40 {
            let km = Double(i) * 1.5
            let ele: Double
            if km >= 15 && km <= 21 {
                ele = 50.0 + (km - 15.0) * 60.0 // 60 m/km = 6%
            } else if km > 21 {
                ele = 410.0 - (km - 21.0) * 8.0
            } else {
                ele = 50.0
            }
            profile.append(ElevationProfilePoint(distKm: km, eleM: ele, gradePct: 0))
        }

        let coords = [
            LatLon(lat: 47.2184, lon: -1.5536),
            LatLon(lat: 47.2500, lon: -1.6500),
            LatLon(lat: 47.2800, lon: -1.8000),
            LatLon(lat: 47.3100, lon: -1.9500),
        ]

        return TripProfile(
            departureDate: "2026-07-10",
            departureTime: "08:00",
            id: "climb-1",
            name: "Alps & Loiret Test",
            tag: "SPORT",
            physics: PhysicsParams(riderWeightKg: 70, bikeWeightKg: 8.5, gearWeightKg: 1.5),
            route: RouteParams(
                elevationGainM: 420,
                origin: "Nantes",
                destination: "Summit",
                distanceKm: 60,
                targetSpeedKmH: 25,
                targetEffortWatts: 220,
                coordinates: coords,
                elevationProfile: profile
            ),
            weather: WeatherCondition(temperatureC: 20)
        )
    }

    @Test("Includes climb-by-climb splits and fueling checkpoints in GPX and TCX exports (climbSplits.test.ts parity)")
    func climbSplitsGpxAndTcx() {
        let trip = makeClimbingTrip()
        let gpx = GpxExporter.exportTripToGpx(trip, now: fixedNow, timeZone: parisTZ)
        let tcx = GpxExporter.exportTripToTcx(trip, now: fixedNow, timeZone: parisTZ)

        #expect(gpx.contains("<wpt "))
        #expect(gpx.contains("<sym>Summit</sym>"))
        #expect(gpx.contains("<sym>Food</sym>") || gpx.contains("<sym>Drinking Water</sym>"))
        #expect(gpx.contains("% FTP"))

        #expect(tcx.contains("<CoursePoint>"))
        let climbPointTypes = [
            "<PointType>Hors Category</PointType>",
            "<PointType>1st Category</PointType>",
            "<PointType>2nd Category</PointType>",
            "<PointType>3rd Category</PointType>",
            "<PointType>4th Category</PointType>",
        ]
        #expect(climbPointTypes.contains { tcx.contains($0) })
        #expect(tcx.contains("<PointType>Food</PointType>") || tcx.contains("<PointType>Water</PointType>"))
        #expect(tcx.contains("% FTP"))
        #expect(tcx.contains("<Watts>220</Watts>"))
        #expect(tcx.contains("<TotalTimeSeconds>"))
        #expect(tcx.contains("<DistanceMeters>60000.0</DistanceMeters>"))
    }

    @Test("Exports single-stage slice and multi-stage tour GPX plus ExpeditionTotals (gpxSlicer.test.ts parity)")
    func stageSliceAndTourExport() {
        let stage1 = TripStage(
            id: "s1",
            dayNumber: 1,
            departureDate: "2026-07-10",
            departureTime: "08:00",
            route: RouteParams(elevationGainM: 900, origin: "Nantes", destination: "Redon", distanceKm: 120),
            office: OfficeConstraints(),
            weather: WeatherCondition()
        )
        let stage2 = TripStage(
            id: "s2",
            dayNumber: 2,
            departureDate: "2026-07-11",
            departureTime: "08:30",
            route: RouteParams(elevationGainM: 1100, origin: "Redon", destination: "Pontivy", distanceKm: 135),
            office: OfficeConstraints(),
            weather: WeatherCondition(),
            pinnedAmenities: [
                StageAmenity(id: "w2", category: .water, subType: "drinking_water", name: "Fontaine Pontivy", lat: 48.06, lon: -2.96, routeKm: 70, detourMeters: 20),
            ]
        )
        let stage3 = TripStage(
            id: "s3",
            dayNumber: 3,
            departureDate: "2026-07-12",
            departureTime: "08:30",
            route: RouteParams(elevationGainM: 1250, origin: "Pontivy", destination: "Brest", distanceKm: 145),
            office: OfficeConstraints(),
            weather: WeatherCondition()
        )

        let tourTrip = TripProfile(
            departureDate: "2026-07-10",
            departureTime: "08:00",
            id: "tour-400",
            name: "Bretagne 400",
            tag: "BIKEPACKING",
            route: stage1.route,
            stages: [stage1, stage2, stage3],
            activeStageIndex: 0
        )

        let totals = StageManagerEngine.getExpeditionTotals(tourTrip, now: fixedNow)
        #expect(totals.totalDays == 3)
        #expect(totals.totalDistanceKm == 400.0)
        #expect(totals.totalElevationM == 3250)
        #expect(totals.originCity == "Nantes")
        #expect(totals.finalDestinationCity == "Brest")

        // gpxSlicer.test.ts lines 228-232 assertions
        let day2Gpx = GpxExporter.exportStageToGpx(tourTrip, stageIndex: 1, now: fixedNow, timeZone: parisTZ)
        #expect(day2Gpx.contains("<gpx version=\"1.1\""))
        #expect(day2Gpx.contains("Day 2 (Redon → Pontivy)"))
        #expect(day2Gpx.contains("<trkpt "))

        // Entire tour GPX
        let fullTourGpx = GpxExporter.exportEntireTourToGpx(tourTrip, now: fixedNow, timeZone: parisTZ)
        #expect(fullTourGpx.contains("creator=\"Cadence - Tour Engine\""))
        #expect(fullTourGpx.contains("<number>1</number>"))
        #expect(fullTourGpx.contains("<number>2</number>"))
        #expect(fullTourGpx.contains("<number>3</number>"))
        #expect(fullTourGpx.contains("D2 · Fontaine Pontivy"))
        #expect(fullTourGpx.contains("Day 2 Cue Sheet: Redon → Pontivy"))
    }

    @Test("XML escaping, radius loop generation, and POSIX decimal dots")
    func xmlEscapingAndRadiusLoop() {
        let specialTrip = TripProfile(
            departureDate: "2026-07-10",
            departureTime: "09:00",
            id: "xml-1",
            name: "Ride <A & \"B\"> 'C'",
            tag: "SPORT",
            route: RouteParams(
                origin: "A & B",
                destination: "C < D",
                distanceKm: 30,
                routeMode: "manual-radius",
                originCoords: LatLon(lat: 47.2186, lon: -1.5541)
            )
        )
        let gpx = GpxExporter.exportTripToGpx(specialTrip, lang: .fr, now: fixedNow, timeZone: parisTZ)
        #expect(gpx.contains("Ride &lt;A &amp; &quot;B&quot;&gt; &apos;C&apos;"))
        // 65 trackpoints (i = 0...64)
        let trkptCount = gpx.components(separatedBy: "<trkpt ").count - 1
        #expect(trkptCount == 65)
        // POSIX decimal dots even when lang == .fr
        #expect(gpx.contains("lat=\"47.218600\""))
        #expect(!gpx.contains("lat=\"47,"))
        // UTC Z timestamp
        #expect(gpx.contains("Z</time>"))
    }

    @Test("Deterministic timeZone injection across non-Europe/Paris DST transitions")
    func nonParisTimezoneDstExport() {
        let nyTZ = TimeZone(identifier: "America/New_York")!
        let utcTZ = TimeZone(secondsFromGMT: 0)!

        // 2026-03-08: US Spring-Forward DST (NY at 08:00 is EDT = UTC-4 -> 12:00Z; Paris is CET = UTC+1 -> 07:00Z)
        let springTrip = TripProfile(
            departureDate: "2026-03-08",
            departureTime: "08:00",
            id: "tz-spring",
            name: "NY Spring DST",
            tag: "SPORT",
            route: RouteParams(
                origin: "NYC",
                destination: "Nyack",
                distanceKm: 30,
                targetSpeedKmH: 30,
                coordinates: [
                    LatLon(lat: 40.7128, lon: -74.0060),
                    LatLon(lat: 41.0909, lon: -73.9179),
                ]
            )
        )
        let nySpringGpx = GpxExporter.exportTripToGpx(springTrip, now: fixedNow, timeZone: nyTZ)
        let utcSpringGpx = GpxExporter.exportTripToGpx(springTrip, now: fixedNow, timeZone: utcTZ)
        let parisSpringGpx = GpxExporter.exportTripToGpx(springTrip, now: fixedNow, timeZone: parisTZ)

        #expect(nySpringGpx.contains("<time>2026-03-08T12:00:00.000Z</time>"))
        #expect(utcSpringGpx.contains("<time>2026-03-08T08:00:00.000Z</time>"))
        #expect(parisSpringGpx.contains("<time>2026-03-08T07:00:00.000Z</time>"))

        // 2026-11-01: US Fall-Back DST (NY at 08:00 is EST = UTC-5 -> 13:00Z; UTC is 08:00Z)
        let fallTrip = TripProfile(
            departureDate: "2026-11-01",
            departureTime: "08:00",
            id: "tz-fall",
            name: "NY Fall DST",
            tag: "SPORT",
            route: springTrip.route
        )
        let nyFallGpx = GpxExporter.exportTripToGpx(fallTrip, now: fixedNow, timeZone: nyTZ)
        let utcFallGpx = GpxExporter.exportTripToGpx(fallTrip, now: fixedNow, timeZone: utcTZ)
        #expect(nyFallGpx.contains("<time>2026-11-01T13:00:00.000Z</time>"))
        #expect(utcFallGpx.contains("<time>2026-11-01T08:00:00.000Z</time>"))
    }
}
