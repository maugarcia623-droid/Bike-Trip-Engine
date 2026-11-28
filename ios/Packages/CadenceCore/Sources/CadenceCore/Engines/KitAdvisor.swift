import Foundation

public enum KitTierTheme: String, Codable, Sendable, CaseIterable, Equatable {
    case sky
    case teal
    case emerald
    case amber
}

public struct KitRecommendation: Codable, Sendable, Equatable {
    public var feelsLikeC: Int
    public var tierBadge: String
    public var tierTheme: KitTierTheme
    public var upperBody: String
    public var lowerAndExtremities: String
    public var opticsAndShield: String
    public var sectorNote: String?

    public init(
        feelsLikeC: Int,
        tierBadge: String,
        tierTheme: KitTierTheme,
        upperBody: String,
        lowerAndExtremities: String,
        opticsAndShield: String,
        sectorNote: String? = nil
    ) {
        self.feelsLikeC = feelsLikeC
        self.tierBadge = tierBadge
        self.tierTheme = tierTheme
        self.upperBody = upperBody
        self.lowerAndExtremities = lowerAndExtremities
        self.opticsAndShield = opticsAndShield
        self.sectorNote = sectorNote
    }
}

public struct KitAdvisorOptions: Sendable, Equatable {
    public var ridingSpeedKmH: Double?
    public var coldestSectorLabel: String?

    public init(ridingSpeedKmH: Double? = nil, coldestSectorLabel: String? = nil) {
        self.ridingSpeedKmH = ridingSpeedKmH
        self.coldestSectorLabel = coldestSectorLabel
    }
}

public enum KitAdvisor {
    private static func jsNum(_ value: Double) -> String {
        guard value.isFinite else { return "0" }
        let safe = value == 0 ? 0.0 : value
        if safe.truncatingRemainder(dividingBy: 1) == 0, abs(safe) < 9_007_199_254_740_992 {
            return String(Int64(safe))
        }
        return String(safe)
    }

    public static func getKitRecommendation(
        weather: WeatherCondition,
        solarPhase: AmbientLightPhase = .daylight,
        lang: CadenceLang = .en,
        options: KitAdvisorOptions? = nil
    ) -> KitRecommendation {
        getKitRecommendation(
            weather: weather,
            solarPhase: solarPhase.rawValue,
            lang: lang,
            options: options
        )
    }

    public static func getKitRecommendation(
        weather: WeatherCondition,
        solarPhase: String,
        lang: CadenceLang = .en,
        options: KitAdvisorOptions? = nil
    ) -> KitRecommendation {
        let isFr = lang == .fr
        let tempC = weather.temperatureC.isFinite ? weather.temperatureC : 12.0
        let speedBase: Double
        if let s = options?.ridingSpeedKmH, s.isFinite, s > 5.0 {
            speedBase = s
        } else {
            speedBase = 22.0
        }

        let headwind: Double
        if let eff = weather.effectiveHeadwindKmH, eff.isFinite {
            headwind = eff
        } else if weather.isHeadwindActive {
            headwind = (weather.baseWindSpeedKmH.isFinite && weather.baseWindSpeedKmH != 0) ? weather.baseWindSpeedKmH : 12.0
        } else {
            headwind = 0.0
        }
        let effectiveWindKmh = max(12.0, speedBase + headwind * 0.65)

        // Environment Canada / Steadman apparent wind-chill blend relevant to cycling airflow
        let feelsLikeRaw: Double
        if tempC <= 14.0 {
            let p = pow(effectiveWindKmh, 0.16)
            feelsLikeRaw = 13.12 + 0.6215 * tempC - 11.37 * p + 0.3965 * tempC * p
        } else {
            feelsLikeRaw = tempC
        }
        let feelsLikeC = JSCompat.jsRoundInt(feelsLikeRaw)

        let rainRisk = weather.precipitationRiskPercent
        let visKm = weather.visibilityKm
        let isLowLight =
            solarPhase == "deep-night" ||
            solarPhase == "nautical-twilight" ||
            solarPhase == "civil-twilight" ||
            weather.isDay == false ||
            visKm < 4.0

        let tierBadge: String
        let tierTheme: KitTierTheme
        let upperBody: String
        let lowerAndExtremities: String

        if feelsLikeC < 3 {
            tierBadge = isFr ? "Grand froid (<3°C)" : "Deep winter (<3°C)"
            tierTheme = .sky
            upperBody = isFr
                ? "Sous-maillot mérinos épais + veste thermique coupe-vent"
                : "Heavy merino base layer + windproof thermal winter jacket"
            lowerAndExtremities = isFr
                ? "Cuissard long thermique, gants hiver isolés, sur-chaussures néoprène & tour de cou"
                : "Thermal bib tights, insulated winter gloves, neoprene overshoes & neck buff"
        } else if feelsLikeC <= 9 {
            tierBadge = isFr ? "Thermique (3–9°C)" : "Thermal kit (3–9°C)"
            tierTheme = .sky
            upperBody = isFr
                ? "Sous-maillot manches longues + maillot gratté + gilet coupe-vent"
                : "Long-sleeve base layer + Roubaix thermal jersey + windproof gilet"
            lowerAndExtremities = isFr
                ? "Collant long ou jambières thermiques, gants longs coupe-vent & couvre-orteils"
                : "Thermal bib tights or leg warmers, long-finger windproof gloves & toe covers"
        } else if feelsLikeC <= 15 {
            tierBadge = isFr ? "Mi-saison (10–15°C)" : "Mid-season (10–15°C)"
            tierTheme = .teal
            upperBody = isFr
                ? "Maillot manches courtes + manchettes amovibles + gilet coupe-vent pliable"
                : "Short-sleeve jersey + arm warmers + packable wind vest (gilet)"
            if feelsLikeC <= 12 {
                lowerAndExtremities = isFr
                    ? "Cuissard court + genouillères légères & gants fins"
                    : "Bib shorts + light knee warmers & light full-finger liners"
            } else {
                lowerAndExtremities = isFr
                    ? "Cuissard court classique & mitaines ou gants mi-saison"
                    : "Standard bib shorts & light mitts"
            }
        } else if feelsLikeC <= 22 {
            tierBadge = isFr ? "Tempéré (16–22°C)" : "Mild aero (16–22°C)"
            tierTheme = .emerald
            upperBody = isFr
                ? "Sous-maillot mesh sans manches + maillot été respirant"
                : "Sleeveless mesh base layer + breathable summer jersey"
            lowerAndExtremities = isFr
                ? "Cuissard été léger & chaussettes aéro"
                : "Lightweight summer bib shorts & aero socks"
        } else {
            tierBadge = isFr ? "Chaleur (>22°C)" : "Hot weather (>22°C)"
            tierTheme = .amber
            upperBody = isFr
                ? "Maillot ultra-léger ajouré zip intégral (sans sous-couche épaisse)"
                : "Ultralight open-mesh jersey (full-zip ventilation)"
            lowerAndExtremities = isFr
                ? "Cuissard été ventilé, crème solaire SPF 50 & électrolytes renforcés"
                : "Ventilated summer bibs, SPF 50 sun protection & high-sodium bidon"
        }

        let rainStr = jsNum(rainRisk)
        let opticsAndShield: String
        if rainRisk >= 45 {
            opticsAndShield = isFr
                ? "Pluie \(rainStr)% : veste membrane imperméable coutures étanches + garde-boue & écran hydrophobe clair"
                : "\(rainStr)% rain risk: taped-seam waterproof shell + fenders & clear hydrophobic lens"
        } else if rainRisk >= 25 {
            opticsAndShield = isFr
                ? "Averses \(rainStr)% : coupe-vent déperlant DWR en poche centrale + verres photochromiques"
                : "\(rainStr)% shower risk: packable DWR shell in jersey pocket + photochromic lens"
        } else if isLowLight {
            opticsAndShield = isFr
                ? "Faible luminosité : verres clairs ou photochromiques Cat. 0–1 + rappels rétroréfléchissants"
                : "Low light: clear or Cat. 0–1 photochromic eyewear + hi-vis ankle/vest accents"
        } else {
            opticsAndShield = isFr
                ? "Route sèche : lunettes solaires Cat. 2–3 haute définition"
                : "Dry corridor: high-contrast Cat. 2–3 sun cycling eyewear"
        }

        return KitRecommendation(
            feelsLikeC: feelsLikeC,
            tierBadge: tierBadge,
            tierTheme: tierTheme,
            upperBody: upperBody,
            lowerAndExtremities: lowerAndExtremities,
            opticsAndShield: opticsAndShield,
            sectorNote: options?.coldestSectorLabel
        )
    }
}
