import Foundation
import Testing
@testable import CadenceCore

@Suite("KitAdvisor Tests")
struct KitAdvisorTests {
    @Test("Temperature tiers and wind chill boundaries (EN and FR)")
    func temperatureTiers() {
        // Deep winter (<3°C): -2°C with headwind -> feelsLike < 3
        let deepWinter = KitAdvisor.getKitRecommendation(
            weather: WeatherCondition(isHeadwindActive: true, baseWindSpeedKmH: 15, temperatureC: -2),
            lang: .en
        )
        #expect(deepWinter.feelsLikeC < 3)
        #expect(deepWinter.tierTheme == .sky)
        #expect(deepWinter.tierBadge == "Deep winter (<3°C)")
        #expect(deepWinter.upperBody == "Heavy merino base layer + windproof thermal winter jacket")

        let deepWinterFr = KitAdvisor.getKitRecommendation(
            weather: WeatherCondition(isHeadwindActive: true, baseWindSpeedKmH: 15, temperatureC: -2),
            lang: .fr
        )
        #expect(deepWinterFr.tierBadge == "Grand froid (<3°C)")

        // Thermal (3-9°C): temp 9°C calm @ 22 km/h -> wind chill ~6°C
        let thermal = KitAdvisor.getKitRecommendation(
            weather: WeatherCondition(temperatureC: 9),
            lang: .en
        )
        #expect(thermal.feelsLikeC >= 3 && thermal.feelsLikeC <= 9)
        #expect(thermal.tierTheme == .sky)
        #expect(thermal.tierBadge == "Thermal kit (3–9°C)")

        // Mid-season (10-12°C sub-branch -> knee warmers)
        let midCool = KitAdvisor.getKitRecommendation(
            weather: WeatherCondition(temperatureC: 13),
            lang: .en,
            options: KitAdvisorOptions(ridingSpeedKmH: 20)
        )
        #expect(midCool.feelsLikeC >= 10 && midCool.feelsLikeC <= 12)
        #expect(midCool.tierTheme == .teal)
        #expect(midCool.lowerAndExtremities == "Bib shorts + light knee warmers & light full-finger liners")

        // Mid-season (13-15°C sub-branch -> standard bib shorts)
        // tempC = 15 > 14 -> skips wind chill -> feelsLikeC = 15
        let midWarm = KitAdvisor.getKitRecommendation(
            weather: WeatherCondition(temperatureC: 15),
            lang: .en
        )
        #expect(midWarm.feelsLikeC == 15)
        #expect(midWarm.tierTheme == .teal)
        #expect(midWarm.lowerAndExtremities == "Standard bib shorts & light mitts")

        // Mild aero (16-22°C)
        let mild = KitAdvisor.getKitRecommendation(
            weather: WeatherCondition(temperatureC: 22),
            lang: .fr
        )
        #expect(mild.feelsLikeC == 22)
        #expect(mild.tierTheme == .emerald)
        #expect(mild.tierBadge == "Tempéré (16–22°C)")

        // Hot (>22°C)
        let hot = KitAdvisor.getKitRecommendation(
            weather: WeatherCondition(temperatureC: 27.6),
            lang: .en,
            options: KitAdvisorOptions(coldestSectorLabel: "Valley floor")
        )
        #expect(hot.feelsLikeC == 28)
        #expect(hot.tierTheme == .amber)
        #expect(hot.tierBadge == "Hot weather (>22°C)")
        #expect(hot.sectorNote == "Valley floor")
    }

    @Test("Headwind fallback and ridingSpeedKmH threshold")
    func windFallbacks() {
        // effectiveHeadwindKmH nil, isHeadwindActive true, baseWindSpeedKmH == 0 -> uses 12 km/h
        // ridingSpeedKmH <= 5 -> falls back to 22 km/h
        let rec1 = KitAdvisor.getKitRecommendation(
            weather: WeatherCondition(effectiveHeadwindKmH: nil, isHeadwindActive: true, baseWindSpeedKmH: 0, temperatureC: 10),
            options: KitAdvisorOptions(ridingSpeedKmH: 4)
        )
        let recExplicit = KitAdvisor.getKitRecommendation(
            weather: WeatherCondition(effectiveHeadwindKmH: 12, isHeadwindActive: true, baseWindSpeedKmH: 0, temperatureC: 10),
            options: KitAdvisorOptions(ridingSpeedKmH: 22)
        )
        #expect(rec1.feelsLikeC == recExplicit.feelsLikeC)

        // NaN baseWindSpeedKmH with isHeadwindActive: true matches TS `NaN || 12` -> feelsLikeC == 4 at 8°C
        let nanBaseWind = KitAdvisor.getKitRecommendation(
            weather: WeatherCondition(isHeadwindActive: true, baseWindSpeedKmH: .nan, temperatureC: 8),
            solarPhase: .daylight,
            lang: .en
        )
        #expect(nanBaseWind.feelsLikeC == 4)

        // Non-finite effectiveHeadwindKmH falls back cleanly to baseWindSpeedKmH / 12
        let nanEffWind = KitAdvisor.getKitRecommendation(
            weather: WeatherCondition(effectiveHeadwindKmH: .nan, isHeadwindActive: true, baseWindSpeedKmH: 0, temperatureC: 8),
            solarPhase: .daylight,
            lang: .en
        )
        #expect(nanEffWind.feelsLikeC == 4)
    }

    @Test("Optics and shield priority: rain >= 45 > rain >= 25 > low light > dry")
    func opticsAndShieldPriority() {
        // Rain >= 45 (integer 45.0 -> "45", decimal 45.5 -> "45.5", no space before % in FR)
        let heavyRainFr = KitAdvisor.getKitRecommendation(
            weather: WeatherCondition(temperatureC: 16, precipitationRiskPercent: 45, visibilityKm: 1.0, isDay: false),
            solarPhase: .deepNight,
            lang: .fr
        )
        #expect(heavyRainFr.opticsAndShield == "Pluie 45% : veste membrane imperméable coutures étanches + garde-boue & écran hydrophobe clair")

        let decimalRainEn = KitAdvisor.getKitRecommendation(
            weather: WeatherCondition(temperatureC: 16, precipitationRiskPercent: 45.5),
            lang: .en
        )
        #expect(decimalRainEn.opticsAndShield == "45.5% rain risk: taped-seam waterproof shell + fenders & clear hydrophobic lens")

        // Rain >= 25
        let showers = KitAdvisor.getKitRecommendation(
            weather: WeatherCondition(temperatureC: 16, precipitationRiskPercent: 30, isDay: false),
            lang: .en
        )
        #expect(showers.opticsAndShield == "30% shower risk: packable DWR shell in jersey pocket + photochromic lens")

        // Low light via solarPhase string overload, isDay == false, or visibilityKm < 4
        let twilightStr = KitAdvisor.getKitRecommendation(
            weather: WeatherCondition(temperatureC: 16, precipitationRiskPercent: 10),
            solarPhase: "civil-twilight",
            lang: .fr
        )
        #expect(twilightStr.opticsAndShield == "Faible luminosité : verres clairs ou photochromiques Cat. 0–1 + rappels rétroréfléchissants")

        let fogLowLight = KitAdvisor.getKitRecommendation(
            weather: WeatherCondition(temperatureC: 16, precipitationRiskPercent: 0, visibilityKm: 3.5),
            solarPhase: .daylight,
            lang: .en
        )
        #expect(fogLowLight.opticsAndShield == "Low light: clear or Cat. 0–1 photochromic eyewear + hi-vis ankle/vest accents")

        // Dry default
        let dry = KitAdvisor.getKitRecommendation(
            weather: WeatherCondition(temperatureC: 18, precipitationRiskPercent: 5, visibilityKm: 20, isDay: true),
            solarPhase: .daylight,
            lang: .en
        )
        #expect(dry.opticsAndShield == "Dry corridor: high-contrast Cat. 2–3 sun cycling eyewear")
    }
}
