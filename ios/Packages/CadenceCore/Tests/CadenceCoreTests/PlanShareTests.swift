import Foundation
import Testing
@testable import CadenceCore

@Suite("PlanShareCodec Golden Parity")
struct PlanShareTests {
    @Test("Matches all 5 planShare.golden.json cases")
    func matchesGolden() throws {
        let data = try GoldenFixtureLoader.loadData(fileName: "planShare.golden.json")
        let root = try JSONSerialization.jsonObject(with: data) as! [String: Any]
        let cases = root["cases"] as! [[String: Any]]
        let decoder = JSONDecoder()
        let frozenNow = Date(timeIntervalSince1970: 1795694400) // 2026-11-26T12:00:00.000Z

        func caseById(_ id: String) -> [String: Any] {
            cases.first(where: { ($0["id"] as? String) == id })!
        }

        // 1. polyline-downsample-roundtrip
        do {
            let c = caseById("polyline-downsample-roundtrip")
            let input = c["input"] as! [String: Any]
            let rawCoords = input["coords"] as! [[Double]]
            let coords = rawCoords.map { LatLon(lat: $0[0], lon: $0[1]) }
            let maxPts = input["maxPoints"] as! Int
            let exp = c["expected"] as! [String: Any]

            let expDown = (exp["downsampled"] as! [[Double]]).map { LatLon(lat: $0[0], lon: $0[1]) }
            let expDec = (exp["decodedPoly"] as! [[Double]]).map { LatLon(lat: $0[0], lon: $0[1]) }
            let actualPoly = PlanShareCodec.encodePolyline(coords)
            #expect(PlanShareCodec.downsampleCoordinates(coords, maxPoints: maxPts) == expDown)
            #expect(actualPoly == (exp["encodedPoly"] as! String))
            #expect(PlanShareCodec.decodePolyline(actualPoly) == expDec)
        }

        // 2. short-url-and-location-extract
        do {
            let c = caseById("short-url-and-location-extract")
            let input = c["input"] as! [String: Any]
            let code = input["code"] as! String
            let baseUrl = input["baseUrl"] as! String
            let exp = c["expected"] as! [String: Any]

            #expect(PlanShareCodec.buildShortPlanShareUrl(code, baseUrl: baseUrl) == (exp["shortUrl"] as! String))
            let expPath = try decoder.decode(ExtractedSharedPlanRef?.self, from: JSONSerialization.data(withJSONObject: exp["fromPath"]!))
            let expShortQ = try decoder.decode(ExtractedSharedPlanRef?.self, from: JSONSerialization.data(withJSONObject: exp["fromShortQuery"]!))
            let expTokenQ = try decoder.decode(ExtractedSharedPlanRef?.self, from: JSONSerialization.data(withJSONObject: exp["fromTokenQuery"]!))
            let expHash = try decoder.decode(ExtractedSharedPlanRef?.self, from: JSONSerialization.data(withJSONObject: exp["fromHash"]!))
            #expect(PlanShareCodec.extractSharedPlanFromLocation(pathname: "/p/K8m4P2x9/", search: "", hash: "") == expPath)
            #expect(PlanShareCodec.extractSharedPlanFromLocation(pathname: "/", search: "?p=abc12345", hash: "") == expShortQ)
            #expect(PlanShareCodec.extractSharedPlanFromLocation(pathname: "/", search: "?plan=eyJ2IjoyfQ", hash: "") == expTokenQ)
            #expect(PlanShareCodec.extractSharedPlanFromLocation(pathname: "/", search: "", hash: "#plan=eyJ2IjoxfQ") == expHash)
            #expect(PlanShareCodec.extractSharedPlanFromLocation(pathname: "/", search: "?p=bad!", hash: "") == nil)
        }

        // 3. legacy-v1-decode
        do {
            let c = caseById("legacy-v1-decode")
            let input = c["input"] as! [String: Any]
            let token = input["token"] as! String
            let exp = c["expected"] as! [String: Any]
            let expEn = try decoder.decode(SharedPlanDecodeResult.self, from: JSONSerialization.data(withJSONObject: exp["en"]!))
            let expFr = try decoder.decode(SharedPlanDecodeResult.self, from: JSONSerialization.data(withJSONObject: exp["fr"]!))
            #expect(PlanShareCodec.decodePlanShareToken(token, lang: .en, now: frozenNow) == expEn)
            #expect(PlanShareCodec.decodePlanShareToken(token, lang: .fr, now: frozenNow) == expFr)
        }

        // 4. v2-multistage-encode-decode-and-meta
        do {
            let c = caseById("v2-multistage-encode-decode-and-meta")
            let input = c["input"] as! [String: Any]
            let baseUrl = input["baseUrl"] as! String
            let exp = c["expected"] as! [String: Any]
            let expMeta = try decoder.decode(PlanShareSummaryMeta.self, from: JSONSerialization.data(withJSONObject: exp["summaryMeta"]!))
            let expDecodedEn = try decoder.decode(SharedPlanDecodeResult.self, from: JSONSerialization.data(withJSONObject: exp["decodedEn"]!))

            let baseTrip = Self.makeMultiStageTrip()
            let sender = SenderBaseline(
                name: "Mau", riderWeightKg: 68, bikeWeightKg: 9.5, luggageWeightKg: 6,
                cda: 0.36, crr: 0.005, ftpWatts: 270, bikeName: "Gravel Pro", bikeCategory: .gravel
            )
            let extras = PlanShareExtras(
                leaveByHHMM: "08:00", arrivalHHMM: "15:30", goStatus: "GO",
                bikeName: "Gravel Pro", senderBaseline: sender
            )

            let token = PlanShareCodec.encodePlanShareToken(baseTrip, extras: extras)
            #expect(token == (exp["token"] as! String))
            #expect(PlanShareCodec.buildPlanShareUrl(baseTrip, extras: extras, baseUrl: baseUrl) == (exp["url"] as! String))
            #expect(PlanShareCodec.buildPlanShareSummaryMeta(baseTrip, extras: extras) == expMeta)
            #expect(PlanShareCodec.decodePlanShareToken(token, lang: .en, now: frozenNow) == expDecodedEn)
        }

        // 5. personal-lens-and-group-sync
        do {
            let c = caseById("personal-lens-and-group-sync")
            let input = c["input"] as! [String: Any]
            let depHHMM = input["departureHHMM"] as! String
            let exp = c["expected"] as! [String: Any]
            let expPersEn = try decoder.decode(TripProfile.self, from: JSONSerialization.data(withJSONObject: exp["personalizedEn"]!))
            let expSyncEn = try decoder.decode(GroupSyncCheckResult.self, from: JSONSerialization.data(withJSONObject: exp["groupSyncEn"]!))
            let expSyncFr = try decoder.decode(GroupSyncCheckResult.self, from: JSONSerialization.data(withJSONObject: exp["groupSyncFr"]!))

            let sender = SenderBaseline(
                name: "Mau", riderWeightKg: 68, bikeWeightKg: 9.5, luggageWeightKg: 6,
                cda: 0.36, crr: 0.005, ftpWatts: 270, bikeName: "Gravel Pro", bikeCategory: .gravel
            )
            var hilly = Self.makeBaseTrip(name: "Group Hill Test", departureDate: "2026-07-10", departureTime: "08:00")
            hilly.route.distanceKm = 110
            hilly.route.elevationGainM = 1200
            hilly.route.targetSpeedKmH = 23
            hilly.route.pacingMode = "speed"
            hilly.physics.luggageWeightKg = 8
            hilly.physics.gearWeightKg = 8

            var receiverSpecs = RiderBikeSpecs.defaultSpecs
            receiverSpecs.riderName = "Alex"
            receiverSpecs.riderWeightKg = 88
            receiverSpecs.ftpWatts = 195
            receiverSpecs.telemetryMode = .quantitative
            receiverSpecs.activeBikeId = "bike-alex"
            receiverSpecs.bikes = [
                BikeSpec(
                    id: "bike-alex", name: "Loaded Tourer", weightKg: 13.5,
                    crr: 0.0068, cda: 0.44, isTubeless: false, tireWidthMm: 42, bikeCategory: .touring
                )
            ]

            let actualPers = PlanShareCodec.applyPersonalLensToSharedTrip(
                hilly, receiverSpecs: receiverSpecs,
                options: PersonalLensOptions(luggageWeightKg: 10, lang: .en, now: frozenNow)
            )
            #expect(actualPers == expPersEn)
            #expect(PlanShareCodec.computeGroupSyncCheck(hilly, sender: sender, receiverSpecs: receiverSpecs, departureHHMM: depHHMM, lang: .en) == expSyncEn)
            #expect(PlanShareCodec.computeGroupSyncCheck(hilly, sender: sender, receiverSpecs: receiverSpecs, departureHHMM: depHHMM, lang: .fr) == expSyncFr)
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
            createdAt: "2026-11-15T00:00:00Z",
            updatedAt: "2026-11-15T00:00:00Z",
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
            checklist: []
        )
    }

    private static func makeMultiStageTrip() -> TripProfile {
        var trip = makeBaseTrip(name: "Brittany 3-Day Tour", departureDate: "2026-07-10", departureTime: "08:00")
        trip.tag = "BIKEPACKING"
        trip.route.origin = "Nantes"
        trip.route.destination = "Redon"
        trip.route.distanceKm = 135
        trip.route.elevationGainM = 820
        trip.route.targetSpeedKmH = 20
        trip.route.coordinates = [
            LatLon(lat: 47.2184, lon: -1.5536),
            LatLon(lat: 47.45, lon: -1.8),
            LatLon(lat: 47.651, lon: -2.085),
        ]
        let stop = StageAmenity(
            id: "stop-1", category: .food, subType: "bakery", name: "Boulangerie Blain",
            lat: 47.476, lon: -1.763, routeKm: 42.5, detourMeters: 40, isPinned: true
        )
        trip.pinnedAmenities = [stop]
        let s1Route = trip.route
        var s2Route = trip.route
        s2Route.origin = "Redon"
        s2Route.destination = "Vannes"
        s2Route.distanceKm = 142
        s2Route.elevationGainM = 950
        s2Route.coordinates = [
            LatLon(lat: 47.651, lon: -2.085),
            LatLon(lat: 47.66, lon: -2.4),
            LatLon(lat: 47.658, lon: -2.76),
        ]
        trip.stages = [
            TripStage(
                id: "stage-1", dayNumber: 1, departureDate: "2026-07-10", departureTime: "08:00",
                route: s1Route, office: trip.office, weather: trip.weather,
                customChips: [], accommodationNote: "Camping Municipal Redon", pinnedAmenities: [stop]
            ),
            TripStage(
                id: "stage-2", dayNumber: 2, departureDate: "2026-07-11", departureTime: "08:00",
                route: s2Route, office: trip.office, weather: trip.weather,
                customChips: []
            ),
        ]
        return trip
    }
}
