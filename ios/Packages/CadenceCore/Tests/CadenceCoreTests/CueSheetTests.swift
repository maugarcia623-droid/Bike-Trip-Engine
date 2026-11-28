import Foundation
import Testing
@testable import CadenceCore

@Suite("CueSheetEngine Tests")
struct CueSheetTests {
    @Test("parseOsrmRouteSteps handles multi-leg routes, trivial continuations, and [lon, lat] rounding")
    func parseOsrmMultiLeg() {
        let legs = [
            OsrmRouteLeg(steps: [
                OsrmRouteStep(
                    distance: 1200,
                    name: "Quai de la Fosse",
                    maneuver: OsrmManeuver(type: "depart", modifier: nil, location: [-1.5541234, 47.2186123])
                ),
                OsrmRouteStep(
                    distance: 800,
                    name: "",
                    maneuver: OsrmManeuver(type: "continue", modifier: "straight", location: [-1.56, 47.21])
                ),
                OsrmRouteStep(
                    distance: 500,
                    name: "Rue de Couëron",
                    maneuver: OsrmManeuver(type: "turn", modifier: "left", location: [-1.57, 47.22])
                ),
                OsrmRouteStep(
                    distance: 0,
                    name: "",
                    maneuver: OsrmManeuver(type: "arrive", modifier: nil, location: [-1.58, 47.22])
                ),
            ]),
            OsrmRouteLeg(steps: [
                OsrmRouteStep(
                    distance: 1500,
                    name: "D17",
                    maneuver: OsrmManeuver(type: "depart", modifier: nil, location: [-1.58, 47.22])
                ),
                OsrmRouteStep(
                    distance: 300,
                    name: "Route de Pornic",
                    maneuver: OsrmManeuver(type: "roundabout", modifier: "right", location: [-1.60, 47.21])
                ),
                OsrmRouteStep(
                    distance: 200,
                    name: "D751",
                    maneuver: OsrmManeuver(type: "fork", modifier: "slight left", location: [-1.61, 47.20])
                ),
                OsrmRouteStep(
                    distance: 0,
                    name: "",
                    maneuver: OsrmManeuver(type: "arrive", modifier: nil, location: [-1.62, 47.19])
                ),
            ]),
        ]

        let steps = CueSheetEngine.parseOsrmRouteSteps(legs)
        #expect(steps.count == 6)

        // First depart: [lon, lat] -> lat, lng rounded to 6 decimals
        #expect(steps[0].direction == .depart)
        #expect(steps[0].lat == 47.218612)
        #expect(steps[0].lng == -1.554123)
        #expect(steps[0].distKm == 0.0)
        #expect(steps[0].instruction == "Depart on Quai de la Fosse")

        // Trivial continue at 1.2 km was skipped; turn left is at 2.0 km
        #expect(steps[1].direction == .left)
        #expect(steps[1].distKm == 2.0)
        #expect(steps[1].instruction == "Turn left onto Rue de Couëron")

        // Intermediate arrive skipped; second leg depart becomes .waypoint at 2.5 km
        #expect(steps[2].direction == .waypoint)
        #expect(steps[2].distKm == 2.5)
        #expect(steps[2].instruction == "Continue past intermediate stop onto D17")

        // Roundabout
        #expect(steps[3].direction == .roundabout)
        #expect(steps[3].instruction == "Enter roundabout onto Route de Pornic")

        // Fork
        #expect(steps[4].direction == .slightLeft)
        #expect(steps[4].instruction == "Take left fork onto D751")

        // Final arrive
        #expect(steps[5].direction == .arrive)
        #expect(steps[5].instruction == "Arrive at destination")
    }

    @Test("synthesizeCueSheetFromCoordinates detects turns and respects 250 m spacing & 45 m lookback")
    func synthesizePolylineCues() {
        // Straight East segment (500m) -> sharp 90° turn North (500m) -> straight finish
        let coords = [
            LatLon(lat: 47.2000, lon: -1.5500),
            LatLon(lat: 47.2000, lon: -1.5430), // ~530 m East
            LatLon(lat: 47.2045, lon: -1.5430), // ~500 m North (90° left turn)
        ]
        let cues = CueSheetEngine.synthesizeCueSheetFromCoordinates(
            coords,
            totalDistanceKm: 1.03,
            originLabel: "Nantes",
            destLabel: "North"
        )
        #expect(cues.count == 3)
        #expect(cues[0].direction == .depart)
        #expect(cues[0].instruction == "Depart Nantes")
        #expect(cues[1].direction == .left)
        #expect(cues[1].instruction == "Turn left")
        #expect(cues[2].direction == .arrive)
        #expect(cues[2].instruction == "Arrive at North")

        // Empty / 1-point track returns []
        #expect(CueSheetEngine.synthesizeCueSheetFromCoordinates([LatLon(47.2, -1.5)], totalDistanceKm: 1.0).isEmpty)
    }

    @Test("formatAmenityCueNote formats on-route and off-route detours in EN and FR")
    func amenityCueNoteFormatting() {
        let fountain = StageAmenity(
            id: "w1",
            category: .water,
            subType: "drinking_water",
            name: "Fontaine du Parc",
            lat: 47.21,
            lon: -1.55,
            routeKm: 12,
            detourMeters: 40,
            openingHours: "24/7"
        )
        let noteEn = CueSheetEngine.formatAmenityCueNote(fountain, eta: "08:30", lang: .en)
        #expect(noteEn.cmt == "km 12 · Est. 08:30 · On route · Hours: 24/7")
        #expect(noteEn.desc == "[Water] Fontaine du Parc — KM 12 (ETA 08:30) · On route · Hours: 24/7 · Cue: Refill water bottles")

        let bakery = StageAmenity(
            id: "f1",
            category: .food,
            subType: "bakery",
            name: "Boulangerie Lemaire",
            lat: 47.22,
            lon: -1.56,
            routeKm: 25,
            detourMeters: 350,
            openingHours: "07:00-19:00"
        )
        let noteFr = CueSheetEngine.formatAmenityCueNote(bakery, eta: "09:15", lang: .fr)
        #expect(noteFr.cmt == "km 25 · Passage 09:15 · +350 m (+0.7 km détour) · Horaires: 07:00-19:00")
        #expect(noteFr.desc == "[Ravitaillement] Boulangerie Lemaire — KM 25 (ETA 09:15) · +350 m (+0.7 km détour) · Horaires: 07:00-19:00 · Cue: Ravitaillement alimentation / eau")
    }

    @Test("Symbol & TCX point type mappings cover all cases")
    func symbolAndTcxMappings() {
        for cat in AmenityCategory.allCases {
            #expect(!CueSheetEngine.getAmenityGpxSymbol(cat).isEmpty)
            #expect(!CueSheetEngine.formatAmenityCategoryLabel(cat, lang: .en).isEmpty)
            #expect(!CueSheetEngine.formatAmenityCategoryLabel(cat, lang: .fr).isEmpty)
        }
        #expect(CueSheetEngine.getAmenityGpxSymbol(.water) == "Drinking Water")
        #expect(CueSheetEngine.getAmenityTcxPointType(.food) == .food)
        #expect(CueSheetEngine.getAmenityTcxPointType(.mechanix) == .firstAid)
        #expect(CueSheetEngine.getAmenityTcxPointType(.bailout) == .generic)
        #expect(CueSheetEngine.getCueDirectionTcxPointType(.sharpLeft) == .left)
        #expect(CueSheetEngine.getCueDirectionTcxPointType(.slightRight) == .right)
        #expect(CueSheetEngine.getCueDirectionTcxPointType(.straight) == .straight)
        #expect(CueSheetEngine.getCueDirectionTcxPointType(.roundabout) == .generic)
    }

    @Test("buildStageCueSheet merges turns, pinned amenities, and unpinned waypoints sorted by distKm")
    func buildStageCueSheetDedupAndSort() {
        let pinned = StageAmenity(
            id: "a1",
            category: .water,
            subType: "drinking_water",
            name: "Water Stop",
            lat: 47.22,
            lon: -1.60,
            routeKm: 12,
            detourMeters: 30
        )
        let route = RouteParams(
            origin: "Nantes",
            destination: "Clisson",
            distanceKm: 30,
            targetSpeedKmH: 24,
            waypoints: [
                // Matches pinned via sourceAmenityId -> deduped
                RouteWaypoint(id: "wp-1", name: "Dup ID", coordinates: LatLon(47.22, -1.60), distanceFromStartKm: 12, sourceAmenityId: "a1"),
                // Distinct via-point -> kept
                RouteWaypoint(id: "wp-2", name: "Bridge", coordinates: LatLon(47.25, -1.52), distanceFromStartKm: 20),
            ]
        )
        let coords = [
            LatLon(lat: 47.218, lon: -1.554),
            LatLon(lat: 47.250, lon: -1.520),
            LatLon(lat: 47.087, lon: -1.281),
        ]
        let entries = CueSheetEngine.buildStageCueSheet(
            route: route,
            coords: coords,
            pinnedAmenities: [pinned],
            departureTime: "08:00",
            dayPrefix: "D1",
            lang: .en
        )

        #expect(entries.first?.direction == .depart)
        #expect(entries.last?.direction == .arrive)
        #expect(entries.contains { $0.shortName == "D1 Water Stop" && $0.direction == .resupply })
        #expect(entries.contains { $0.instruction.contains("Bridge") && $0.direction == .waypoint })
        #expect(!entries.contains { $0.instruction.contains("Dup ID") })

        // Sorted ascending by distKm
        for i in 1..<entries.count {
            #expect(entries[i].distKm >= entries[i - 1].distKm)
        }
    }
}
