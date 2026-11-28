import Foundation
import Testing
@testable import CadenceCore

@Suite("NlpRideParser Tests")
struct NlpRideParserTests {
    // Thursday 2026-11-26 12:00:00 UTC (13:00 Paris)
    private let fixedNow = Date(timeIntervalSince1970: 1_795_694_400)
    private let parisTZ = TimeZone(identifier: "Europe/Paris")!

    @Test("Parses all 4 English locale preset prompts")
    func englishPresets() {
        // 1. EN Commute
        let commute = NlpRideParser.parseTripDescription(
            "22 km gravel commute across the estuary bridge to Saint-Nazaire Harbour, arriving at 08:30 for a 09:00 shift. Rider 74 kg, bike 9.4 kg, gear 4 kg, cruising at 27.5 km/h with an 8 km/h headwind. Office planning: quick arrival snack and a relaxed lunch break window.",
            lang: .en,
            now: fixedNow,
            timeZone: parisTZ
        )
        #expect(commute.parsedValues.tag == "VÉLOTAF")
        #expect(commute.parsedValues.route.distanceKm == 22)
        #expect(commute.parsedValues.route.targetSpeedKmH == 27.5)
        #expect(commute.parsedValues.physics.riderWeightKg == 74)
        #expect(commute.parsedValues.physics.bikeWeightKg == 9.4)
        #expect(commute.parsedValues.physics.gearWeightKg == 4)
        #expect(commute.parsedValues.office.targetGateArrivalTime == "08:30")
        #expect(commute.parsedValues.office.shiftStartTime == "09:00")
        #expect(commute.parsedValues.weather.isHeadwindActive == true)
        #expect(commute.parsedValues.weather.baseWindSpeedKmH == 8)
        #expect(commute.detected.headwind == "8 km/h")

        // 2. EN Escapade
        let escapade = NlpRideParser.parseTripDescription(
            "Escapade from Nantes to Clisson hotel on December 15, 2026. Check-in is at 3 PM, leaving at 10:30. Carrying 6.5 kg of gear. Cruising speed around 24 km/h, 45 km route.",
            lang: .en,
            now: fixedNow,
            timeZone: parisTZ
        )
        #expect(escapade.parsedValues.tag == "ESCAPADE")
        #expect(escapade.parsedValues.departureDate == "2026-12-15")
        #expect(escapade.parsedValues.departureTime == "10:30")
        #expect(escapade.parsedValues.office.targetGateArrivalTime == "15:00")
        #expect(escapade.parsedValues.physics.gearWeightKg == 6.5)
        #expect(escapade.parsedValues.route.targetSpeedKmH == 24)
        #expect(escapade.parsedValues.route.distanceKm == 45)
        #expect(escapade.detected.origin == "Nantes")
        #expect(escapade.detected.destination == "Clisson")
        #expect(escapade.parsedValues.name == "Nantes → Clisson Tour")

        // 3. EN Bikepacking
        let bikepacking = NlpRideParser.parseTripDescription(
            "Bikepacking adventure on October 28th. Leave at 07:00, 85 km distance, 12 kg luggage, bike 11.5 kg, rider 72 kg, pace 21 km/h.",
            lang: .en,
            now: fixedNow,
            timeZone: parisTZ
        )
        #expect(bikepacking.parsedValues.tag == "BIKEPACKING")
        #expect(bikepacking.parsedValues.departureDate == "2026-10-28")
        #expect(bikepacking.parsedValues.departureTime == "07:00")
        #expect(bikepacking.parsedValues.route.distanceKm == 85)
        #expect(bikepacking.parsedValues.physics.gearWeightKg == 12)
        #expect(bikepacking.parsedValues.physics.bikeWeightKg == 11.5)
        #expect(bikepacking.parsedValues.physics.riderWeightKg == 72)
        #expect(bikepacking.parsedValues.route.targetSpeedKmH == 21)

        // 4. EN Sport
        let sport = NlpRideParser.parseTripDescription(
            "Sport Gran Fondo training tomorrow. Zero bags, 110km, target speed 33 km/h, setting off at 6:30.",
            lang: .en,
            now: fixedNow,
            timeZone: parisTZ
        )
        #expect(sport.parsedValues.tag == "SPORT")
        #expect(sport.parsedValues.departureDate == "2026-11-27")
        #expect(sport.parsedValues.physics.gearWeightKg == 0)
        #expect(sport.detected.cargo == 0)
        #expect(sport.parsedValues.route.distanceKm == 110)
        #expect(sport.parsedValues.route.targetSpeedKmH == 33)
        #expect(sport.parsedValues.departureTime == "06:30")
    }

    @Test("Parses all 4 French locale preset prompts")
    func frenchPresets() {
        // 1. FR Vélotaf
        let velotaf = NlpRideParser.parseTripDescription(
            "Vélotaf gravel de 22 km par le pont de l’estuaire vers le port de Saint-Nazaire, arrivée à 08:30 pour une prise de poste à 09:00. Cycliste 74 kg, vélo 9,4 kg, sacoche 4 kg, allure 27,5 km/h avec vent de face de 8 km/h. Collation à l’arrivée et pause déjeuner tranquille.",
            lang: .fr,
            now: fixedNow,
            timeZone: parisTZ
        )
        #expect(velotaf.parsedValues.tag == "VÉLOTAF")
        #expect(velotaf.parsedValues.route.distanceKm == 22)
        #expect(velotaf.parsedValues.route.targetSpeedKmH == 27.5)
        #expect(velotaf.parsedValues.weather.baseWindSpeedKmH == 8)
        #expect(velotaf.parsedValues.office.targetGateArrivalTime == "08:30")
        #expect(velotaf.parsedValues.office.shiftStartTime == "09:00")

        // 2. FR Escapade
        let escapade = NlpRideParser.parseTripDescription(
            "Je veux rouler de Nantes vers un hôtel à Clisson le 15 décembre 2026, check-in à 15h, partir à 10h30 avec 6,5 kg de bagages, allure de 24 km/h sur 45 km.",
            lang: .fr,
            now: fixedNow,
            timeZone: parisTZ
        )
        #expect(escapade.parsedValues.tag == "ESCAPADE")
        #expect(escapade.detected.origin == "Nantes")
        #expect(escapade.detected.destination == "Clisson")
        #expect(escapade.parsedValues.name == "Nantes → Clisson")
        #expect(escapade.parsedValues.departureDate == "2026-12-15")
        #expect(escapade.parsedValues.departureTime == "10:30")
        #expect(escapade.parsedValues.office.targetGateArrivalTime == "15:00")
        #expect(escapade.parsedValues.physics.gearWeightKg == 6.5)

        // 3. FR Bikepacking (ravito 15 min + marge anti-crève 10 min -> 8 + 25 = 33)
        let bikepacking = NlpRideParser.parseTripDescription(
            "Bikepacking bivouac le 28 octobre. Départ à 07h00, distance 85 km, 12 kg de sacoches, vélo 11,5 kg, cycliste 72 kg, allure 21 km/h, pause ravito 15 min et marge anti-crève 10 min.",
            lang: .fr,
            now: fixedNow,
            timeZone: parisTZ
        )
        #expect(bikepacking.parsedValues.tag == "BIKEPACKING")
        #expect(bikepacking.parsedValues.departureDate == "2026-10-28")
        #expect(bikepacking.parsedValues.departureTime == "07:00")
        #expect(bikepacking.detected.ravito == "+15 min")
        #expect(bikepacking.detected.includeExtraRavito == true)
        #expect(bikepacking.detected.puncturePrep == "+10 min")
        #expect(bikepacking.detected.includePunctureKit == true)
        #expect(bikepacking.parsedValues.route.urbanTrafficDelayMinutes == 33)

        // 4. FR Sport
        let sport = NlpRideParser.parseTripDescription(
            "Sortie Sport Gran Fondo demain. Sans sacoche, 110 km, vitesse cible 33 km/h, partir à 6h30 avec kit anti-crève.",
            lang: .fr,
            now: fixedNow,
            timeZone: parisTZ
        )
        #expect(sport.parsedValues.tag == "SPORT")
        #expect(sport.parsedValues.departureDate == "2026-11-27")
        #expect(sport.parsedValues.physics.gearWeightKg == 0)
        #expect(sport.detected.puncturePrep == "Kit anti-crève")
        #expect(sport.detected.includePunctureKit == true)
    }

    @Test("Wind speed masking, reverse/forward timeline math, idioms, weekdays, places, and office rules")
    func edgeCasesAndRules() {
        // Wind speed masking: "vent de face 25 km/h" must NOT set detected.speed
        let windMasked = NlpRideParser.parseTripDescription(
            "Sortie avec vent de face de 25 km/h",
            lang: .fr,
            now: fixedNow,
            timeZone: parisTZ
        )
        #expect(windMasked.detected.speed == nil)
        #expect(windMasked.parsedValues.weather.baseWindSpeedKmH == 25)
        #expect(windMasked.detected.headwind == "25 km/h")

        // Reverse timeline: shift 09:00 only -> gate 08:30, 35 km / 25 km/h (84m) + 15m = 99m -> 06:51
        let reverseOnly = NlpRideParser.parseTripDescription(
            "Work shift at 09:00",
            lang: .en,
            now: fixedNow,
            timeZone: parisTZ
        )
        #expect(reverseOnly.parsedValues.office.targetGateArrivalTime == "08:30")
        #expect(reverseOnly.parsedValues.departureTime == "06:51")

        // Forward timeline: departure 07:30 only -> arrival 09:09
        let forwardOnly = NlpRideParser.parseTripDescription(
            "Leaving at 07:30",
            lang: .en,
            now: fixedNow,
            timeZone: parisTZ
        )
        #expect(forwardOnly.parsedValues.departureTime == "07:30")
        #expect(forwardOnly.parsedValues.office.targetGateArrivalTime == "09:09")
        #expect(forwardOnly.parsedValues.office.shiftStartTime == "09:09")

        // Idioms: midi, minuit, 7h et quart, 8h moins le quart, après-midi, half past 6
        let frQuarterPast = NlpRideParser.parseTripDescription(
            "Partir à 7h et quart, arrivée à midi",
            lang: .fr,
            now: fixedNow,
            timeZone: parisTZ
        )
        #expect(frQuarterPast.parsedValues.departureTime == "07:15")
        #expect(frQuarterPast.parsedValues.office.targetGateArrivalTime == "12:00")

        let frAfternoon = NlpRideParser.parseTripDescription(
            "Arrivée à 3h de l'après-midi",
            lang: .fr,
            now: fixedNow,
            timeZone: parisTZ
        )
        #expect(frAfternoon.parsedValues.office.targetGateArrivalTime == "15:00")

        let frQuarterTo = NlpRideParser.parseTripDescription(
            "Partir à 8h moins le quart, arrivée à minuit",
            lang: .fr,
            now: fixedNow,
            timeZone: parisTZ
        )
        #expect(frQuarterTo.parsedValues.departureTime == "07:45")
        #expect(frQuarterTo.parsedValues.office.targetGateArrivalTime == "00:00")

        let enIdioms = NlpRideParser.parseTripDescription(
            "Leaving at half past 6, arriving at noon",
            lang: .en,
            now: fixedNow,
            timeZone: parisTZ
        )
        #expect(enIdioms.parsedValues.departureTime == "06:30")
        #expect(enIdioms.parsedValues.office.targetGateArrivalTime == "12:00")

        // Weekdays (fixedNow is Thursday 2026-11-26)
        let monday = NlpRideParser.parseTripDescription("Sortie lundi", lang: .fr, now: fixedNow, timeZone: parisTZ)
        #expect(monday.parsedValues.departureDate == "2026-11-30")
        let sameDayNextWeek = NlpRideParser.parseTripDescription("Sortie jeudi", lang: .fr, now: fixedNow, timeZone: parisTZ)
        #expect(sameDayNextWeek.parsedValues.departureDate == "2026-12-03")
        let dayAfterTomorrow = NlpRideParser.parseTripDescription("Sortie après-demain", lang: .fr, now: fixedNow, timeZone: parisTZ)
        #expect(dayAfterTomorrow.parsedValues.departureDate == "2026-11-28")

        // Place cleaning & gate-only guard
        let places = NlpRideParser.parseTripDescription(
            "de saint-nazaire à la baule",
            lang: .fr,
            now: fixedNow,
            timeZone: parisTZ
        )
        #expect(places.detected.origin == "Saint-Nazaire")
        #expect(places.detected.destination == "La Baule")

        let bivouac = NlpRideParser.parseTripDescription(
            "rouler vers un bivouac à pornic",
            lang: .fr,
            now: fixedNow,
            timeZone: parisTZ
        )
        #expect(bivouac.detected.destination == "Pornic")

        let gateOnly = NlpRideParser.parseTripDescription(
            "Ride from Nantes to gate 17",
            lang: .en,
            now: fixedNow,
            timeZone: parisTZ
        )
        #expect(gateOnly.detected.destination == nil)
        #expect(gateOnly.detected.gate == "Gate 17")

        // Weather + office rules + applying(to:)
        let weatherOffice = NlpRideParser.parseTripDescription(
            "Commute -3°C, 80% rain, calm wind, pas de bouffe dans l'open space",
            lang: .fr,
            now: fixedNow,
            timeZone: parisTZ
        )
        #expect(weatherOffice.parsedValues.weather.temperatureC == -3)
        #expect(weatherOffice.parsedValues.weather.precipitationRiskPercent == 80)
        #expect(weatherOffice.parsedValues.weather.windDirection == "calm")
        #expect(weatherOffice.parsedValues.office.strictNoFoodInOpenSpace == true)
        #expect(weatherOffice.detected.strictFoodRule == true)

        let base = TripProfile(id: "t1", name: "Keep Me", tag: "SPORT", description: "Original")
        let patched = weatherOffice.parsedValues.applying(to: base)
        #expect(patched.id == "t1")
        #expect(patched.description == "Original")
        #expect(patched.weather.temperatureC == -3)
        #expect(patched.office.strictNoFoodInOpenSpace == true)
    }

    @Test("Deterministic timeZone injection across non-Europe/Paris DST transition dates")
    func nonParisTimezoneDstDeterminism() {
        let nyTZ = TimeZone(identifier: "America/New_York")!
        let utcTZ = TimeZone(secondsFromGMT: 0)!

        // 2026-11-01T03:30:00Z = Saturday 2026-10-31 23:30 EDT in New York, Sunday 2026-11-01 03:30 in UTC
        let boundaryInstant = Date(timeIntervalSince1970: 1_793_503_800)

        let nyToday = NlpRideParser.parseTripDescription("Ride today", lang: .en, now: boundaryInstant, timeZone: nyTZ)
        let utcToday = NlpRideParser.parseTripDescription("Ride today", lang: .en, now: boundaryInstant, timeZone: utcTZ)
        #expect(nyToday.parsedValues.departureDate == "2026-10-31")
        #expect(utcToday.parsedValues.departureDate == "2026-11-01")

        // US Spring-Forward DST transition date: 2026-03-08 12:00:00Z
        let springDstNow = Date(timeIntervalSince1970: 1_772_971_200)
        let nyTomorrow = NlpRideParser.parseTripDescription("Ride tomorrow", lang: .en, now: springDstNow, timeZone: nyTZ)
        let nyMonday = NlpRideParser.parseTripDescription("Ride monday", lang: .en, now: springDstNow, timeZone: nyTZ)
        #expect(nyTomorrow.parsedValues.departureDate == "2026-03-09")
        #expect(nyMonday.parsedValues.departureDate == "2026-03-09")
    }
}
