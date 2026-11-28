import Foundation
import Testing
@testable import CadenceCore

@Suite("RideBriefEngine, ChipTheme, RouteWeatherModels & RestStop Tests")
struct RideBriefTests {
    // Summer daylight date: 2026-06-21
    private let fixedSummerNow = Date(timeIntervalSince1970: 1_782_043_200) // 2026-06-21T12:00:00Z
    private let parisTZ = TimeZone(identifier: "Europe/Paris")!

    private func makeBaselineTrip(
        departureDate: String = "2026-06-21",
        departureTime: String = "10:00",
        distanceKm: Double = 35,
        tag: String = "SPORT",
        weather: WeatherCondition = WeatherCondition(temperatureC: 19, precipitationRiskPercent: 5, visibilityKm: 20, isDay: true),
        pinnedAmenities: [StageAmenity]? = nil,
        customChips: [String]? = nil,
        ruleSettings: LogisticsSettings? = nil
    ) -> TripProfile {
        TripProfile(
            departureDate: departureDate,
            departureTime: departureTime,
            id: "brief-1",
            name: "Nantes Loop",
            tag: tag,
            route: RouteParams(
                elevationGainM: 210,
                origin: "Nantes",
                destination: "Clisson",
                distanceKm: distanceKm,
                targetSpeedKmH: 25,
                coordinates: [
                    LatLon(lat: 47.2184, lon: -1.5536),
                    LatLon(lat: 47.0870, lon: -1.2810),
                ]
            ),
            weather: weather,
            customChips: customChips,
            ruleSettings: ruleSettings,
            arriveAtMode: false,
            pinnedAmenities: pinnedAmenities
        )
    }

    private func makeTimeline(leaveBy: String = "10:00", arrival: String = "11:24", movingMin: Int = 84, stopsMin: Int = 0) -> ReverseTimelineCalculation {
        ReverseTimelineCalculation(
            shiftStartTime: arrival,
            gateArrivalTime: arrival,
            hardDepartureTime: leaveBy,
            preRideMealTime: "08:30",
            wakeUpTime: "08:00",
            totalDoorToDeskMinutes: movingMin + stopsMin,
            pureMovingMinutes: movingMin,
            bufferMinutes: stopsMin,
            steps: [],
            weatherHeadwindImpactMinutes: 0,
            severeHeadwindWarning: false
        )
    }

    @Test("All-clear daylight baseline in EN and FR")
    func allClearDaylightBaseline() {
        let trip = makeBaselineTrip()
        let physics = PhysicsEngine.calculatePhysics(physics: trip.physics, route: trip.route, weather: trip.weather, lang: .en)
        let timeline = makeTimeline()

        let briefEn = RideBriefEngine.buildRideBrief(
            trip: trip,
            physics: physics,
            timeline: timeline,
            lang: .en,
            now: fixedSummerNow,
            timeZone: parisTZ
        )
        #expect(briefEn.verdict == .go)
        #expect(briefEn.firstProblem.severity == .clear)
        #expect(briefEn.blockerAlreadyFeatured == false)
        #expect(briefEn.priorities.count == 3)
        #expect(briefEn.priorities[0].id == "tyre-pressure")
        #expect(briefEn.priorities[0].theme == .sky)
        #expect(briefEn.priorities[1].id == "weather-calm")
        #expect(briefEn.priorities[1].theme == .emerald)
        #expect(briefEn.priorities[2].id == "fuel-hydration")
        #expect(briefEn.priorities[2].theme == .orange)
        #expect(briefEn.readiness.score > 0)
        #expect(briefEn.bottles.carried >= 1)

        let briefFr = RideBriefEngine.buildRideBrief(
            trip: trip,
            physics: physics,
            timeline: timeline,
            lang: .fr,
            now: fixedSummerNow,
            timeZone: parisTZ
        )
        #expect(briefFr.verdict == .go)
        #expect(briefFr.leavePodLabel == "Départ prévu")
    }

    @Test("Closed-on-arrival stop promotes GO to CAUTION and surfaces open alternative")
    func closedStopWithOpenAlternative() {
        // 35 km @ ~25 km/h leaving 10:00 -> km 25 ETA ~11:00 (Sun 2026-06-21)
        let closedBakery = StageAmenity(
            id: "b-closed",
            category: .food,
            subType: "bakery",
            name: "Boulangerie Fermée",
            lat: 47.15,
            lon: -1.40,
            routeKm: 25,
            detourMeters: 50,
            openingHours: "Mo-Sa 07:00-13:00"
        )
        let openBakery = StageAmenity(
            id: "b-open",
            category: .food,
            subType: "bakery",
            name: "Boulangerie Ouverte",
            lat: 47.16,
            lon: -1.39,
            routeKm: 27,
            detourMeters: 40,
            openingHours: "Su 07:00-13:00"
        )
        let trip = makeBaselineTrip(pinnedAmenities: [closedBakery])
        let physics = PhysicsEngine.calculatePhysics(physics: trip.physics, route: trip.route, weather: trip.weather, lang: .en)
        let brief = RideBriefEngine.buildRideBrief(
            trip: trip,
            physics: physics,
            timeline: makeTimeline(),
            amenities: [closedBakery, openBakery],
            hasWaterScan: true,
            lang: .en,
            now: fixedSummerNow,
            timeZone: parisTZ
        )

        #expect(brief.firstProblem.id == "closed-b-closed")
        #expect(brief.firstProblem.severity == .critical)
        #expect(brief.firstProblem.alternativeStop?.id == "b-open")
        #expect(brief.verdict == .caution)
        #expect(brief.blockerAlreadyFeatured == true)
        #expect(brief.priorities[0].iconKey == .blocker)
        #expect(brief.priorities[0].theme == .rose)
    }

    @Test("Overpass water gap gating: suppressed when hasWaterScan is false, critical when true with no water")
    func waterGapGating() {
        let hotWeather = WeatherCondition(temperatureC: 28, precipitationRiskPercent: 0, visibilityKm: 20, isDay: true)
        let trip = makeBaselineTrip(distanceKm: 95, weather: hotWeather)
        let physics = PhysicsEngine.calculatePhysics(physics: trip.physics, route: trip.route, weather: trip.weather, lang: .en)
        let timeline = makeTimeline(leaveBy: "10:00", arrival: "13:48", movingMin: 228)

        let noScan = RideBriefEngine.buildRideBrief(
            trip: trip,
            physics: physics,
            timeline: timeline,
            amenities: [],
            hasWaterScan: false,
            lang: .en,
            now: fixedSummerNow,
            timeZone: parisTZ
        )
        #expect(noScan.firstProblem.id != "water-gap-critical")

        let scannedEmpty = RideBriefEngine.buildRideBrief(
            trip: trip,
            physics: physics,
            timeline: timeline,
            amenities: [],
            hasWaterScan: true,
            lang: .en,
            now: fixedSummerNow,
            timeZone: parisTZ
        )
        #expect(scannedEmpty.firstProblem.id == "water-gap-critical")
        #expect(scannedEmpty.firstProblem.severity == .critical)
        #expect(scannedEmpty.verdict == .caution)
    }

    @Test("Loop flip headline and NO-GO precedence")
    func loopFlipAndNoGoPrecedence() {
        let trip = makeBaselineTrip()
        let physics = PhysicsEngine.calculatePhysics(physics: trip.physics, route: trip.route, weather: trip.weather, lang: .en)
        let timeline = makeTimeline()

        let sector = RouteSectorForecast(
            index: 0, startKm: 0, endKm: 17.5, distanceKm: 17.5,
            lat: 47.2, lon: -1.5, bearingDeg: 90, etaHHMM: "10:20",
            temperatureC: 19, windChillC: 19, windSpeedKmH: 15, windDirectionDegrees: 245,
            windCardinal: "WSW", effectiveHeadwindKmH: 10, precipitationRiskPercent: 0,
            visibilityKm: 20, airDensityRho: 1.2, legWatts: 180, aeroPenaltyWatts: 20,
            effectiveSpeedKmH: 25, durationMin: 42, carbsG: 35
        )
        let analysis = RouteWeatherAnalysis(
            sectors: [sector],
            loopComparison: LoopDirectionComparison(
                isLoop: true,
                forwardOrientation: .anticlockwise,
                recommendedDirection: .reverse,
                forwardTotalMin: 89,
                reverseTotalMin: 84,
                forwardAvgWatts: 190,
                reverseAvgWatts: 175,
                minutesSaved: 5,
                wattsSaved: 15
            ),
            coldestSector: sector,
            wettestSector: sector,
            worstCaseWeather: trip.weather,
            coldestSectorLabel: "S1",
            source: .live
        )

        let flipEn = RideBriefEngine.buildRideBrief(
            trip: trip, physics: physics, timeline: timeline, sectorForecast: analysis, lang: .en, now: fixedSummerNow, timeZone: parisTZ
        )
        #expect(flipEn.headline == "Flip the loop. Save 5 min.")

        let flipFr = RideBriefEngine.buildRideBrief(
            trip: trip, physics: physics, timeline: timeline, sectorForecast: analysis, lang: .fr, now: fixedSummerNow, timeZone: parisTZ
        )
        #expect(flipFr.headline == "Inverse la boucle, gagne 5 min.")

        // NO-GO overrides loop flip
        var noGoPhysics = physics
        noGoPhysics.goStatus = "NO-GO"
        let noGoBrief = RideBriefEngine.buildRideBrief(
            trip: trip, physics: noGoPhysics, timeline: timeline, sectorForecast: analysis, lang: .en, now: fixedSummerNow, timeZone: parisTZ
        )
        #expect(noGoBrief.verdict == .noGo)
        #expect(noGoBrief.headline == "Best to wait or adjust.")
    }

    @Test("StationaryRecoveryEngine.getPlannedRestStopMinutes & night visibility priority")
    func plannedRestStopsAndNightVisibility() {
        // Summer daylight: plannedLongStopMin (30) + coffee-stop (15) + picnic-outing (45) = 90
        let summerTrip = makeBaselineTrip(
            departureDate: "2026-06-21",
            departureTime: "10:00",
            customChips: ["coffee-stop", "picnic-outing"],
            ruleSettings: LogisticsSettings(plannedLongStopMin: 30)
        )
        #expect(StationaryRecoveryEngine.getPlannedRestStopMinutes(summerTrip, now: fixedSummerNow) == 90)

        // Pre-dawn winter (Dec 15 at 05:30): coffee (15 -> capped to 5), picnic (45 >= 30 -> 0), longStop (30 >= 30 -> 0)
        let preDawnWinterTrip = makeBaselineTrip(
            departureDate: "2026-12-15",
            departureTime: "05:30",
            customChips: ["coffee-stop", "picnic-outing"],
            ruleSettings: LogisticsSettings(plannedLongStopMin: 30)
        )
        #expect(StationaryRecoveryEngine.getPlannedRestStopMinutes(preDawnWinterTrip, now: fixedSummerNow) == 5)

        let physics = PhysicsEngine.calculatePhysics(physics: preDawnWinterTrip.physics, route: preDawnWinterTrip.route, weather: preDawnWinterTrip.weather, lang: .en)
        let brief = RideBriefEngine.buildRideBrief(
            trip: preDawnWinterTrip,
            physics: physics,
            timeline: makeTimeline(leaveBy: "05:30", arrival: "06:54"),
            lang: .en,
            now: fixedSummerNow,
            timeZone: parisTZ
        )
        #expect(brief.priorities[0].id == "visibility-night")
        #expect(brief.priorities[0].theme == .purple)
        #expect(brief.priorities[0].iconKey == .lights)
    }

    @Test("Telemetry modes, companion notes, and RouteWeatherModels/ChipTheme Codable round-trip")
    func telemetryModesCompanionAndModels() throws {
        let windyTrip = makeBaselineTrip(
            distanceKm: 70,
            weather: WeatherCondition(
                effectiveHeadwindKmH: 22,
                isHeadwindActive: true,
                baseWindSpeedKmH: 22,
                windDirection: "headwind",
                windDirectionDegrees: 270,
                temperatureC: 16
            )
        )
        let physics = PhysicsEngine.calculatePhysics(physics: windyTrip.physics, route: windyTrip.route, weather: windyTrip.weather, lang: .en)
        let timeline = makeTimeline(leaveBy: "10:00", arrival: "12:50", movingMin: 170)

        var intuitiveSpecs = RiderBikeSpecs.defaultSpecs
        intuitiveSpecs.telemetryMode = .intuitive
        let intuitiveBrief = RideBriefEngine.buildRideBrief(
            trip: windyTrip, physics: physics, timeline: timeline, riderSpecs: intuitiveSpecs, lang: .en, now: fixedSummerNow, timeZone: parisTZ
        )
        #expect(intuitiveBrief.priorities[2].headline == "Sip & bite every 20 min")
        #expect(intuitiveBrief.companionNote?.icon == .wind)

        var fuelFirstSpecs = RiderBikeSpecs.defaultSpecs
        fuelFirstSpecs.telemetryMode = .fuelFirst
        let fuelFirstBrief = RideBriefEngine.buildRideBrief(
            trip: windyTrip, physics: physics, timeline: timeline, riderSpecs: fuelFirstSpecs, lang: .en, now: fixedSummerNow, timeZone: parisTZ
        )
        #expect(fuelFirstBrief.priorities[2].headline.contains("snacks / hr"))

        var proSpecs = RiderBikeSpecs.defaultSpecs
        proSpecs.cockpitViewMode = .pro
        proSpecs.telemetryMode = .quantitative
        let calmLongTrip = makeBaselineTrip(distanceKm: 80)
        let calmLongPhysics = PhysicsEngine.calculatePhysics(physics: calmLongTrip.physics, route: calmLongTrip.route, weather: calmLongTrip.weather, lang: .en)
        let proBrief = RideBriefEngine.buildRideBrief(
            trip: calmLongTrip,
            physics: calmLongPhysics,
            timeline: makeTimeline(leaveBy: "10:00", arrival: "13:12", movingMin: 192),
            riderSpecs: proSpecs,
            lang: .en,
            now: fixedSummerNow,
            timeZone: parisTZ
        )
        #expect(proBrief.narrativeSummary.contains("W ("))
        #expect(proBrief.companionNote?.icon == .flame)

        // Codable round-trip for ChipTheme and RouteWeatherAnalysis
        let encodedThemes = try JSONEncoder().encode(ChipTheme.allCases)
        let decodedThemes = try JSONDecoder().decode([ChipTheme].self, from: encodedThemes)
        #expect(decodedThemes == ChipTheme.allCases)
        #expect(ChipTheme.yellowVest.rawValue == "yellow-vest")

        let sector = RouteSectorForecast(
            index: 0, startKm: 0, endKm: 10, distanceKm: 10,
            lat: 47.2, lon: -1.5, bearingDeg: 45, etaHHMM: "10:25",
            temperatureC: 15, windChillC: 12, windSpeedKmH: 14, windDirectionDegrees: 225,
            windCardinal: "SW", effectiveHeadwindKmH: 8, precipitationRiskPercent: 10,
            visibilityKm: 20, airDensityRho: 1.22, legWatts: 170, aeroPenaltyWatts: 15,
            effectiveSpeedKmH: 24, durationMin: 25, carbsG: 20
        )
        let analysis = RouteWeatherAnalysis(
            sectors: [sector],
            loopComparison: LoopDirectionComparison(
                isLoop: false,
                forwardOrientation: .outAndBack,
                recommendedDirection: .neutral,
                forwardTotalMin: 60,
                reverseTotalMin: 60,
                forwardAvgWatts: 170,
                reverseAvgWatts: 170,
                minutesSaved: 0,
                wattsSaved: 0
            ),
            coldestSector: sector,
            wettestSector: sector,
            worstCaseWeather: WeatherCondition(),
            coldestSectorLabel: "S1",
            source: .planned
        )
        let encodedAnalysis = try JSONEncoder().encode(analysis)
        let decodedAnalysis = try JSONDecoder().decode(RouteWeatherAnalysis.self, from: encodedAnalysis)
        #expect(decodedAnalysis == analysis)
    }

    @Test("North wind (0 deg) and explicit 0 km/h gusts preserve zero instead of falling back to WSW / 1.4x")
    func northWindAndZeroGustsParity() {
        let northZeroGustWeather = WeatherCondition(
            isHeadwindActive: true,
            baseWindSpeedKmH: 20,
            windDirection: "headwind",
            windDirectionDegrees: 0,
            temperatureC: 4,
            estuaryGustKmH: 0
        )
        let trip = makeBaselineTrip(weather: northZeroGustWeather)
        let physics = PhysicsEngine.calculatePhysics(
            physics: trip.physics,
            route: trip.route,
            weather: trip.weather,
            lang: .en
        )
        let timeline = makeTimeline()

        let briefEn = RideBriefEngine.buildRideBrief(
            trip: trip,
            physics: physics,
            timeline: timeline,
            lang: .en,
            now: fixedSummerNow,
            timeZone: parisTZ
        )
        #expect(briefEn.narrativeSummary.contains("20 km/h N breeze"))
        #expect(!briefEn.narrativeSummary.contains("WSW"))
        #expect(briefEn.priorities[1].id == "weather-gusts")
        #expect(briefEn.priorities[1].headline == "Gusts reach 0 km/h")
        #expect(briefEn.priorities[1].detail == "Wind from N · Stay steady in exposed sections")
        #expect(briefEn.readiness.factors[0].note.contains("gusts 0 km/h"))
        #expect(!briefEn.readiness.factors[0].note.contains("28 km/h"))

        let briefFr = RideBriefEngine.buildRideBrief(
            trip: trip,
            physics: physics,
            timeline: timeline,
            lang: .fr,
            now: fixedSummerNow,
            timeZone: parisTZ
        )
        #expect(briefFr.narrativeSummary.contains("vent N de 20 km/h"))
        #expect(!briefFr.narrativeSummary.contains("OSO"))
        #expect(briefFr.priorities[1].headline == "Rafales jusqu'à 0 km/h")
        #expect(briefFr.priorities[1].detail == "Vent N · Reste souple en zone exposée")
        #expect(briefFr.readiness.factors[0].note.contains("rafales 0 km/h"))

        // Non-finite values still fall back to 245° (WSW/OSO) and round(baseWind * 1.4) (28 km/h)
        let nanWeather = WeatherCondition(
            isHeadwindActive: true,
            baseWindSpeedKmH: 20,
            windDirection: "headwind",
            windDirectionDegrees: .nan,
            temperatureC: 4,
            estuaryGustKmH: .nan
        )
        let nanTrip = makeBaselineTrip(weather: nanWeather)
        let nanBrief = RideBriefEngine.buildRideBrief(
            trip: nanTrip,
            physics: physics,
            timeline: timeline,
            lang: .en,
            now: fixedSummerNow,
            timeZone: parisTZ
        )
        #expect(nanBrief.narrativeSummary.contains("WSW"))
        #expect(nanBrief.priorities[1].headline == "Gusts reach 28 km/h")
        #expect(nanBrief.readiness.factors[0].note.contains("gusts 28 km/h"))
    }

    @Test("Telemetry mode priority #3 copy variants (.intuitive and .fuelFirst) in EN and FR")
    func telemetryModePriorityThreeCopyEnAndFr() {
        let trip = makeBaselineTrip(distanceKm: 70)
        let physics = PhysicsEngine.calculatePhysics(
            physics: trip.physics,
            route: trip.route,
            weather: trip.weather,
            lang: .en
        )
        let timeline = makeTimeline(leaveBy: "10:00", arrival: "12:48", movingMin: 168)

        var intuitiveSpecs = RiderBikeSpecs.defaultSpecs
        intuitiveSpecs.telemetryMode = .intuitive

        let intuitiveEn = RideBriefEngine.buildRideBrief(
            trip: trip, physics: physics, timeline: timeline, riderSpecs: intuitiveSpecs, lang: .en, now: fixedSummerNow, timeZone: parisTZ
        )
        #expect(intuitiveEn.priorities[2].headline == "Sip & bite every 20 min")
        #expect(intuitiveEn.priorities[2].detail == intuitiveEn.bottles.badgeLabel)
        #expect(!intuitiveEn.priorities[2].detail.contains("total"))

        let intuitiveFr = RideBriefEngine.buildRideBrief(
            trip: trip, physics: physics, timeline: timeline, riderSpecs: intuitiveSpecs, lang: .fr, now: fixedSummerNow, timeZone: parisTZ
        )
        #expect(intuitiveFr.priorities[2].headline == "Gorgée & bouchée toutes les 20 min")
        #expect(intuitiveFr.priorities[2].detail == intuitiveFr.bottles.badgeLabel)
        #expect(!intuitiveFr.priorities[2].detail.contains("au total"))

        var fuelFirstSpecs = RiderBikeSpecs.defaultSpecs
        fuelFirstSpecs.telemetryMode = .fuelFirst

        let fuelFirstEn = RideBriefEngine.buildRideBrief(
            trip: trip, physics: physics, timeline: timeline, riderSpecs: fuelFirstSpecs, lang: .en, now: fixedSummerNow, timeZone: parisTZ
        )
        let expectedUnitsEn = max(1, JSCompat.jsRoundInt(Double(fuelFirstEn.carbsPerHr) / 20.0))
        #expect(fuelFirstEn.priorities[2].headline == "~\(expectedUnitsEn) snacks / hr")
        #expect(fuelFirstEn.priorities[2].detail == fuelFirstEn.bottles.badgeLabel)

        let fuelFirstFr = RideBriefEngine.buildRideBrief(
            trip: trip, physics: physics, timeline: timeline, riderSpecs: fuelFirstSpecs, lang: .fr, now: fixedSummerNow, timeZone: parisTZ
        )
        let expectedUnitsFr = max(1, JSCompat.jsRoundInt(Double(fuelFirstFr.carbsPerHr) / 20.0))
        #expect(fuelFirstFr.priorities[2].headline == "~\(expectedUnitsFr) en-cas / h")
        #expect(fuelFirstFr.priorities[2].detail == fuelFirstFr.bottles.badgeLabel)
    }
}
