import Foundation

public enum AmbientLightPhase: String, Codable, Sendable {
    case deepNight = "deep-night"
    case nauticalTwilight = "nautical-twilight"
    case civilTwilight = "civil-twilight"
    case goldenHour = "golden-hour"
    case daylight = "daylight"
}

public enum VisibilityCategory: String, Codable, Sendable {
    case denseFog = "dense-fog"
    case mistHaze = "mist-haze"
    case reduced = "reduced"
    case good = "good"
    case crystal = "crystal"
}

public struct SolarEphemeris: Codable, Sendable, Equatable {
    public let solarNoon: String
    public let sunrise: String
    public let sunset: String
    public let civilDawn: String
    public let civilDusk: String
    public let nauticalDawn: String
    public let nauticalDusk: String
    public let daylightMinutes: Int
    public let daylightHoursFormatted: String
    public let maxSolarElevationDeg: Double
    public let isWinterSolsticeWindow: Bool
}

public struct VisibilitySuggestion: Codable, Sendable, Equatable {
    public let id: String
    public let category: String
    public let critical: Bool
    public let titleEn: String
    public let titleFr: String
    public let detailEn: String
    public let detailFr: String
    public let badgeEn: String?
    public let badgeFr: String?
}

public struct LightingGearAdvice: Codable, Sendable, Equatable {
    public let recommendedLumens: String
    public let minLumens: Int
    public let maxLumens: Int
    public let lumenSpectrumPosition: Int
    public let beamModeEn: String
    public let beamModeFr: String
    public let rearBeaconEn: String
    public let rearBeaconFr: String
    public let batteryNoticeEn: String
    public let batteryNoticeFr: String
}

public struct PassiveGearAdvice: Codable, Sendable, Equatable {
    public let reflectiveApparelEn: String
    public let reflectiveApparelFr: String
    public let ankleBandsEn: String
    public let ankleBandsFr: String
    public let eyewearEn: String
    public let eyewearFr: String
}

public struct SurfaceCautionAdvice: Codable, Sendable, Equatable {
    public let isBlackIceRisk: Bool
    public let messageEn: String?
    public let messageFr: String?
}

public struct RideVisibilityAnalysis: Codable, Sendable, Equatable {
    public let rolloutTime: String
    public let arrivalTime: String
    public let movingMinutes: Int
    public let dateStr: String
    public let isSimulatedWinterDate: Bool
    public let solar: SolarEphemeris
    public let rolloutElevationDeg: Double
    public let arrivalElevationDeg: Double
    public let rolloutPhase: AmbientLightPhase
    public let arrivalPhase: AmbientLightPhase
    public let nightPercent: Int
    public let twilightPercent: Int
    public let daylightPercent: Int
    public let overallCondition: String
    public let opticalHazardLevel: String
    public let visibilityKm: Double
    public let visibilityCategory: VisibilityCategory
    public let weatherCode: Int
    public let weatherDescEn: String
    public let weatherDescFr: String
    public let isWinterTrip: Bool
    public let lightingGear: LightingGearAdvice
    public let passiveGear: PassiveGearAdvice
    public let surfaceCaution: SurfaceCautionAdvice
    public let summaryRecommendationEn: String
    public let summaryRecommendationFr: String
    public let suggestions: [VisibilitySuggestion]
}

public enum SolarVisibilityEngine {
    public static func minutesToHHMM(_ totalMinutes: Double) -> String {
        var m = JSCompat.jsRoundInt(totalMinutes)
        m = JSCompat.posMod(m, 1440)
        let hh = String(format: "%02d", m / 60)
        let mm = String(format: "%02d", m % 60)
        return "\(hh):\(mm)"
    }

    public static func hhmmToMinutes(_ timeStr: String) -> Int {
        let parts = timeStr.split(separator: ":")
        let h = parts.count > 0 ? (Int(parts[0]) ?? 0) : 0
        let m = parts.count > 1 ? (Int(parts[1]) ?? 0) : 0
        return h * 60 + m
    }

    public static func getApproxTimezoneOffset(
        dateStr: String,
        lon: Double,
        timeZone: TimeZone = TimeZone(identifier: "Europe/Paris") ?? .current
    ) -> Double {
        let parts = dateStr.split(separator: "-").compactMap { Int($0) }
        if parts.count == 3 {
            var cal = Calendar(identifier: .gregorian)
            cal.timeZone = TimeZone(secondsFromGMT: 0)!
            var comps = DateComponents()
            comps.year = parts[0]
            comps.month = parts[1]
            comps.day = parts[2]
            comps.hour = 0
            comps.minute = 0
            comps.second = 0
            if let utcDate = cal.date(from: comps) {
                let offsetHours = Double(timeZone.secondsFromGMT(for: utcDate)) / 3600.0
                if offsetHours >= -12 && offsetHours <= 14 {
                    return offsetHours
                }
            }
        }
        let month = parts.count >= 2 ? parts[1] : 1
        let isSummerCET = month >= 4 && month <= 9
        if lon >= -5 && lon <= 15 {
            return isSummerCET ? 2 : 1
        }
        return JSCompat.jsRound(lon / 15.0)
    }

    private static func dayOfYear(
        _ dateStr: String,
        timeZone: TimeZone = TimeZone(identifier: "Europe/Paris") ?? .current
    ) -> Int {
        let parts = dateStr.split(separator: "-").compactMap { Int($0) }
        let y = parts.count > 0 ? parts[0] : 2026
        let m = parts.count > 1 ? parts[1] : 1
        let d = parts.count > 2 ? parts[2] : 1
        var cal = Calendar(identifier: .gregorian)
        cal.timeZone = timeZone
        let date = cal.date(from: DateComponents(year: y, month: m, day: d, hour: 0)) ?? Date()
        let start = cal.date(from: DateComponents(year: y - 1, month: 12, day: 31, hour: 0)) ?? Date()
        let diffDays = Int(floor(date.timeIntervalSince(start) / 86400.0))
        return max(1, diffDays)
    }

    public static func getSolarEphemeris(
        lat: Double,
        lon: Double,
        dateStr: String,
        tzOffsetHours: Double? = nil,
        timeZone: TimeZone = TimeZone(identifier: "Europe/Paris") ?? .current
    ) -> SolarEphemeris {
        let doy = dayOfYear(dateStr, timeZone: timeZone)
        let tz = tzOffsetHours ?? getApproxTimezoneOffset(dateStr: dateStr, lon: lon, timeZone: timeZone)
        let phi = JSCompat.toRad(lat)
        let gamma = (2.0 * .pi / 365.0) * Double(doy - 1)

        let eqtime = 229.18 * (
            0.000075
            + 0.001868 * cos(gamma)
            - 0.032077 * sin(gamma)
            - 0.014615 * cos(2 * gamma)
            - 0.040849 * sin(2 * gamma)
        )

        let decl = 0.006918
            - 0.399912 * cos(gamma)
            + 0.070257 * sin(gamma)
            - 0.006758 * cos(2 * gamma)
            + 0.000907 * sin(2 * gamma)
            - 0.002697 * cos(3 * gamma)
            + 0.00148 * sin(3 * gamma)

        let timeOffset = eqtime + 4.0 * lon - 60.0 * tz
        let solarNoonMin = 720.0 - timeOffset

        func calcHourAngle(_ zenithDeg: Double) -> Double? {
            let cosHA = (cos(JSCompat.toRad(zenithDeg)) - sin(phi) * sin(decl)) / (cos(phi) * cos(decl))
            if cosHA > 1.0 { return nil }
            if cosHA < -1.0 { return .pi }
            return acos(cosHA)
        }

        let haSunrise = calcHourAngle(90.833) ?? JSCompat.toRad(60)
        let haCivil = calcHourAngle(96.0) ?? JSCompat.toRad(70)
        let haNautical = calcHourAngle(102.0) ?? JSCompat.toRad(80)

        let sunriseMin = solarNoonMin - JSCompat.toDeg(haSunrise) * 4.0
        let sunsetMin = solarNoonMin + JSCompat.toDeg(haSunrise) * 4.0
        let dawnMin = solarNoonMin - JSCompat.toDeg(haCivil) * 4.0
        let duskMin = solarNoonMin + JSCompat.toDeg(haCivil) * 4.0
        let nautDawnMin = solarNoonMin - JSCompat.toDeg(haNautical) * 4.0
        let nautDuskMin = solarNoonMin + JSCompat.toDeg(haNautical) * 4.0

        let daylightMinutes = max(0, JSCompat.jsRoundInt(JSCompat.toDeg(haSunrise) * 8.0))
        let dlHours = daylightMinutes / 60
        let dlMins = daylightMinutes % 60

        let maxElevation = 90.0 - abs(lat - JSCompat.toDeg(decl))
        let isWinterSolsticeWindow = doy >= 315 || doy <= 50

        return SolarEphemeris(
            solarNoon: minutesToHHMM(solarNoonMin),
            sunrise: minutesToHHMM(sunriseMin),
            sunset: minutesToHHMM(sunsetMin),
            civilDawn: minutesToHHMM(dawnMin),
            civilDusk: minutesToHHMM(duskMin),
            nauticalDawn: minutesToHHMM(nautDawnMin),
            nauticalDusk: minutesToHHMM(nautDuskMin),
            daylightMinutes: daylightMinutes,
            daylightHoursFormatted: "\(dlHours)h \(String(format: "%02d", dlMins)) min",
            maxSolarElevationDeg: JSCompat.roundTo(maxElevation, decimals: 1),
            isWinterSolsticeWindow: isWinterSolsticeWindow
        )
    }

    public static func getSolarElevation(
        lat: Double,
        lon: Double,
        dateStr: String,
        timeStr: String,
        tzOffsetHours: Double? = nil,
        timeZone: TimeZone = TimeZone(identifier: "Europe/Paris") ?? .current
    ) -> Double {
        let doy = dayOfYear(dateStr, timeZone: timeZone)
        let tz = tzOffsetHours ?? getApproxTimezoneOffset(dateStr: dateStr, lon: lon, timeZone: timeZone)
        let phi = JSCompat.toRad(lat)
        let gamma = (2.0 * .pi / 365.0) * Double(doy - 1)

        let eqtime = 229.18 * (
            0.000075
            + 0.001868 * cos(gamma)
            - 0.032077 * sin(gamma)
            - 0.014615 * cos(2 * gamma)
            - 0.040849 * sin(2 * gamma)
        )

        let decl = 0.006918
            - 0.399912 * cos(gamma)
            + 0.070257 * sin(gamma)
            - 0.006758 * cos(2 * gamma)
            + 0.000907 * sin(2 * gamma)
            - 0.002697 * cos(3 * gamma)
            + 0.00148 * sin(3 * gamma)

        let minutesFromMidnight = Double(hhmmToMinutes(timeStr))
        let timeOffset = eqtime + 4.0 * lon - 60.0 * tz
        let trueSolarTime = minutesFromMidnight + timeOffset
        let ha = (trueSolarTime / 4.0) - 180.0
        let haRad = JSCompat.toRad(ha)

        let sinElevation = sin(phi) * sin(decl) + cos(phi) * cos(decl) * cos(haRad)
        let elevationRad = asin(max(-1.0, min(1.0, sinElevation)))
        return JSCompat.roundTo(JSCompat.toDeg(elevationRad), decimals: 1)
    }

    public static func getAmbientLightPhase(_ elevationDeg: Double) -> AmbientLightPhase {
        if elevationDeg < -12 { return .deepNight }
        if elevationDeg < -6 { return .nauticalTwilight }
        if elevationDeg < 0 { return .civilTwilight }
        if elevationDeg < 15 { return .goldenHour }
        return .daylight
    }

    public static func getVisibilityCategory(_ visKm: Double) -> VisibilityCategory {
        if visKm < 1.0 { return .denseFog }
        if visKm < 4.0 { return .mistHaze }
        if visKm < 10.0 { return .reduced }
        if visKm < 20.0 { return .good }
        return .crystal
    }

    public static func getWmoWeatherDescription(_ code: Int = 0) -> (en: String, fr: String) {
        if code == 0 { return ("Clear sky", "Ciel dégagé") }
        if code == 1 || code == 2 { return ("Partly cloudy", "Éclaircies") }
        if code == 3 { return ("Overcast winter sky", "Couvert hivernal") }
        if code == 45 || code == 48 { return ("Dense fog / Freezing mist", "Brouillard givrant") }
        if code >= 51 && code <= 55 { return ("Fine drizzle", "Bruine persistante") }
        if code >= 61 && code <= 65 { return ("Cold rain", "Pluie froide") }
        if code >= 71 && code <= 77 { return ("Snow flurries / Ice pellets", "Averses de neige / Grésil") }
        if code >= 80 && code <= 82 { return ("Rain showers", "Averses de pluie") }
        return ("Atmospheric murk", "Brume atmosphérique")
    }

    public static func calculateRideVisibility(
        trip: TripProfile,
        customDate: String? = nil,
        customRolloutTime: String? = nil,
        effectiveSpeedOverrideKmH: Double? = nil,
        timeZone: TimeZone = TimeZone(identifier: "Europe/Paris") ?? .current
    ) -> RideVisibilityAnalysis {
        let coords = trip.route.coordinates?.first ?? LatLon(47.2184, -1.5536)
        let lat = coords.lat
        let lon = coords.lon

        let dateStr = customDate ?? trip.departureDate ?? "2026-11-26"
        let isSimulatedWinterDate = dateStr.contains("-12-") || dateStr.contains("-01-")

        let tz = getApproxTimezoneOffset(dateStr: dateStr, lon: lon, timeZone: timeZone)
        let solar = getSolarEphemeris(lat: lat, lon: lon, dateStr: dateStr, tzOffsetHours: tz, timeZone: timeZone)

        let rawSpeed = effectiveSpeedOverrideKmH ?? trip.route.targetSpeedKmH
        let targetSpeed = max(6.0, rawSpeed > 0 ? rawSpeed : 25.0)
        let distance = max(1.0, trip.route.distanceKm > 0 ? trip.route.distanceKm : 20.0)
        let movingMinutes = JSCompat.jsRoundInt((distance / targetSpeed) * 60.0)

        let rolloutTime = customRolloutTime ?? trip.departureTime ?? "07:15"
        let rolloutMin = hhmmToMinutes(rolloutTime)
        let arrivalMin = (rolloutMin + movingMinutes) % 1440
        let arrivalTime = minutesToHHMM(Double(arrivalMin))

        let rolloutElevationDeg = getSolarElevation(lat: lat, lon: lon, dateStr: dateStr, timeStr: rolloutTime, tzOffsetHours: tz, timeZone: timeZone)
        let arrivalElevationDeg = getSolarElevation(lat: lat, lon: lon, dateStr: dateStr, timeStr: arrivalTime, tzOffsetHours: tz, timeZone: timeZone)

        let rolloutPhase = getAmbientLightPhase(rolloutElevationDeg)
        let arrivalPhase = getAmbientLightPhase(arrivalElevationDeg)

        var nightCount = 0
        var twilightCount = 0
        var daylightCount = 0
        let sampleSteps = 7

        for i in 0..<sampleSteps {
            let frac = Double(i) / Double(sampleSteps - 1)
            let sampleMin = (rolloutMin + JSCompat.jsRoundInt(Double(movingMinutes) * frac)) % 1440
            let elev = getSolarElevation(lat: lat, lon: lon, dateStr: dateStr, timeStr: minutesToHHMM(Double(sampleMin)), tzOffsetHours: tz, timeZone: timeZone)
            if elev < -6 { nightCount += 1 }
            else if elev < 0 { twilightCount += 1 }
            else { daylightCount += 1 }
        }
        _ = daylightCount

        let nightPercent = JSCompat.jsRoundInt((Double(nightCount) / Double(sampleSteps)) * 100.0)
        let twilightPercent = JSCompat.jsRoundInt((Double(twilightCount) / Double(sampleSteps)) * 100.0)
        let daylightPercent = max(0, 100 - nightPercent - twilightPercent)

        let dateParts = dateStr.split(separator: "-").compactMap { Int($0) }
        let monthNum = dateParts.count >= 2 ? dateParts[1] : 1
        let isWinterTrip = monthNum == 11 || monthNum == 12 || monthNum == 1 || monthNum == 2

        var visKm = trip.weather.visibilityKm
        if visKm <= 0 {
            visKm = isWinterTrip ? 3.5 : 18.0
            if isSimulatedWinterDate { visKm = 2.8 }
        }

        let visibilityCategory = getVisibilityCategory(visKm)
        let weatherCode = trip.weather.weatherCode ?? (isWinterTrip ? 3 : 0)
        let weatherDesc = getWmoWeatherDescription(weatherCode)

        var overallCondition = "bright-daylight"
        if nightPercent >= 50 {
            overallCondition = "pitch-dark"
        } else if twilightPercent >= 40 && rolloutElevationDeg < arrivalElevationDeg {
            overallCondition = "twilight-dawn"
        } else if twilightPercent >= 40 && rolloutElevationDeg >= arrivalElevationDeg {
            overallCondition = "twilight-dusk"
        } else if isWinterTrip || daylightPercent < 70 {
            overallCondition = "winter-overcast"
        }

        var opticalHazardLevel = "low"
        if overallCondition == "pitch-dark" || visibilityCategory == .denseFog {
            opticalHazardLevel = "critical"
        } else if overallCondition == "twilight-dawn" || overallCondition == "twilight-dusk" || visibilityCategory == .mistHaze {
            opticalHazardLevel = "elevated"
        } else if overallCondition == "winter-overcast" || visibilityCategory == .reduced {
            opticalHazardLevel = "moderate"
        }

        let recommendedLumens: String
        let minLumens: Int
        let maxLumens: Int
        let lumenSpectrumPosition: Int

        if overallCondition == "pitch-dark" || visibilityCategory == .denseFog || (isWinterTrip && rolloutElevationDeg < -3) {
            recommendedLumens = "800 – 1000 lm"
            minLumens = 800
            maxLumens = 1000
            lumenSpectrumPosition = 82
        } else if overallCondition == "twilight-dawn" || overallCondition == "twilight-dusk" || visibilityCategory == .mistHaze {
            recommendedLumens = "500 – 700 lm"
            minLumens = 500
            maxLumens = 700
            lumenSpectrumPosition = 55
        } else if overallCondition == "winter-overcast" || visibilityCategory == .reduced {
            recommendedLumens = "300 – 500 lm"
            minLumens = 300
            maxLumens = 500
            lumenSpectrumPosition = 35
        } else {
            recommendedLumens = "200 – 400 lm (Daytime Pulse)"
            minLumens = 200
            maxLumens = 400
            lumenSpectrumPosition = 20
        }

        let lightingGear = LightingGearAdvice(
            recommendedLumens: recommendedLumens,
            minLumens: minLumens,
            maxLumens: maxLumens,
            lumenSpectrumPosition: lumenSpectrumPosition,
            beamModeEn: minLumens >= 800
                ? "High-intensity focused beam (StVZO cutoff recommended)"
                : (minLumens >= 500 ? "Medium continuous beam with wide peripheral spill" : "Daytime hyper-flash / penetrating pulse mode"),
            beamModeFr: minLumens >= 800
                ? "Faisceau longue portée focalisé (faisceau coupé StVZO recommandé)"
                : (minLumens >= 500 ? "Faisceau continu médium avec diffusion périphérique large" : "Mode flash pulsé haute visibilité diurne"),
            rearBeaconEn: "Multi-LED pulse red beacon (≥ 50–100 lm) visible from 1 km",
            rearBeaconFr: "Feu rouge clignotant haute puissance (≥ 50–100 lm) visible à 1 km",
            batteryNoticeEn: "Sub-5°C winter cold cuts Lithium-ion runtime by 25–35%. Ensure 100% full charge prior to rollout.",
            batteryNoticeFr: "Le froid hivernal (< 5°C) ampute l’autonomie lithium de 25 à 35%. Départ impératif à 100% de charge."
        )

        let passiveGear = PassiveGearAdvice(
            reflectiveApparelEn: "EN ISO 20471 / EN 17353 certified reflective vest or sash + high-contrast Volt outer shell",
            reflectiveApparelFr: "Gilet ou harnais rétro-réfléchissant certifié EN 17353 + veste extérieure jaune Volt",
            ankleBandsEn: "Retro-reflective ankle bands: rotating pedal motion triggers motorist recognition 3× faster in headlights",
            ankleBandsFr: "Bandes réfléchissantes de chevilles : le mouvement de pédalage alerte les conducteurs 3× plus vite",
            eyewearEn: "Clear or yellow/amber contrast photochromic lenses (avoid dark tinted sunglasses in winter twilight)",
            eyewearFr: "Verres transparents ou photochromiques jaunes/ambre (proscrire les verres solaires foncés)"
        )

        let tempC = trip.weather.temperatureC
        let isBlackIceRisk = isWinterTrip && tempC <= 3.5 && (visKm < 5 || trip.weather.precipitationRiskPercent > 30)
        let tempStr = tempC.truncatingRemainder(dividingBy: 1) == 0 ? String(Int(tempC)) : String(tempC)

        let surfaceCaution = SurfaceCautionAdvice(
            isBlackIceRisk: isBlackIceRisk,
            messageEn: isBlackIceRisk ? "Cold surface alert (\(tempStr)°C + wet fog): Watch for black ice on bridge expansion joints, riverbanks, and shaded turns." : nil,
            messageFr: isBlackIceRisk ? "Alerte verglas (\(tempStr)°C + brume humide) : Méfiance sur ponts métalliques, berges et virages ombragés." : nil
        )

        var suggestions: [VisibilitySuggestion] = []
        if minLumens >= 800 {
            suggestions.append(VisibilitySuggestion(
                id: "vis-front-beam", category: "lighting", critical: true,
                titleEn: "High-Output 800 to 1,000 Lumen Headlight Recommended",
                titleFr: "Éclairage avant puissant 800 à 1 000 Lumens recommandé",
                detailEn: "With low winter ambient light or early morning darkness, an 800 to 1000 lumen headlight is essential to illuminate road obstacles, potholes, and wet asphalt 40–50 meters ahead at cruising pace.",
                detailFr: "En condition d’obscurité ou de faible luminosité hivernale, un feu avant de 800 à 1 000 lumens est indispensable pour éclairer la chaussée, les nids-de-poule et l’asphalte mouillé à 40–50 mètres à vive allure.",
                badgeEn: "800–1000 Lumens", badgeFr: "800–1000 Lumens"
            ))
        } else if minLumens >= 500 {
            suggestions.append(VisibilitySuggestion(
                id: "vis-front-beam-med", category: "lighting", critical: false,
                titleEn: "500 to 700 Lumen Headlight for Twilight Transition",
                titleFr: "Éclairage 500 à 700 Lumens pour transition crépusculaire",
                detailEn: "Dawn and dusk reduce visual contrast dramatically. Run 500–700 lumens with wide beam spread to illuminate unlit road segments while maintaining pedestrian awareness.",
                detailFr: "L’aube et le crépuscule réduisent drastiquement les contrastes. Activez 500 à 700 lumens avec faisceau large pour les sections non éclairées.",
                badgeEn: "500–700 Lumens", badgeFr: "500–700 Lumens"
            ))
        } else {
            suggestions.append(VisibilitySuggestion(
                id: "vis-front-daytime", category: "lighting", critical: false,
                titleEn: "Daytime Penetrating Pulse Light",
                titleFr: "Feu flash diurne anti-brouillard",
                detailEn: "Run front and rear flashing beacons (200–400 lm) to stay visible through diffuse moisture and low winter sunlight glare.",
                detailFr: "Conservez un flash avant/arrière actif (200–400 lm) pour percer la brume et le contre-jour du soleil rasant.",
                badgeEn: "Daytime Pulse", badgeFr: "Flash Diurne"
            ))
        }

        suggestions.append(VisibilitySuggestion(
            id: "vis-reflective-gear", category: "reflective",
            critical: overallCondition == "pitch-dark" || overallCondition == "twilight-dawn",
            titleEn: "Passive Reflective Gear & 360° Bio-Motion Ankle Bands",
            titleFr: "Gilet réfléchissant & bandes de chevilles bio-dynamiques",
            detailEn: "Wear an EN 17353 certified reflective vest or sash to be seen from 300m. Add retro-reflective ankle bands: rotating pedal motion triggers motorist human-reflex recognition 3× faster than static torso reflectors.",
            detailFr: "Portez un gilet ou baudrier réfléchissant certifié pour être vu à 300 m. Ajoutez des serre-pantalons réfléchissants : le mouvement rotatif du pédalage est détecté 3× plus vite par les automobilistes.",
            badgeEn: "EN 17353 / ISO 20471", badgeFr: "Norme EN 17353"
        ))

        if isWinterTrip || tempC <= 6 {
            suggestions.append(VisibilitySuggestion(
                id: "vis-battery-drain", category: "battery", critical: false,
                titleEn: "Cold Ambient Battery Degradation Warning",
                titleFr: "Alerte autonomie batterie par temps froid (< 5°C)",
                detailEn: "Freezing temperatures drop Lithium-ion battery capacity by 25–35%. Top off all lights to 100% before rollout, and avoid high-power modes in illuminated urban zones to conserve runtime.",
                detailFr: "Le froid abaisse la capacité des cellules lithium de 25 à 35%. Rechargez à 100% avant le départ et basculez en mode éco sur les tronçons urbains éclairés pour préserver l’autonomie.",
                badgeEn: "Winter Battery -30%", badgeFr: "Batterie Froid -30%"
            ))
        }

        suggestions.append(VisibilitySuggestion(
            id: "vis-eyewear", category: "eyewear", critical: false,
            titleEn: "High-Contrast Yellow or Clear Eyewear",
            titleFr: "Lunettes à verres clairs ou contrastés jaune/ambre",
            detailEn: "Never wear dark sunglasses in winter dawn or dusk. Use clear or high-contrast yellow lenses to shield eyes from sub-zero headwind, grit, and tire spray without losing terrain definition.",
            detailFr: "Évitez les verres solaires foncés à l’aube et au crépuscule. Utilisez des verres transparents ou jaunes amplificateurs de contraste contre le vent glacial et les projections.",
            badgeEn: "Yellow / Clear Lenses", badgeFr: "Verres Clairs / Jaunes"
        ))

        if isBlackIceRisk {
            suggestions.append(VisibilitySuggestion(
                id: "vis-black-ice", category: "surface", critical: true,
                titleEn: "Morning Black Ice & Low-Contrast Surface Hazard",
                titleFr: "Risque de verglas matinal & chaussée glissante",
                detailEn: "Ambient temperature is \(tempStr)°C with wet air. In darkness or low dawn light, thin transparent black ice is invisible. Drop tire pressure slightly (0.3 bar) and avoid aggressive braking on bridge joints and damp canal towpaths.",
                detailFr: "Température de \(tempStr)°C avec air saturé. Dans l’obscurité, les plaques de verglas sont indétectables. Réduisez légèrement la pression des pneus (0,3 bar) et évitez tout freinage brusque sur les ponts.",
                badgeEn: "Black ice alert", badgeFr: "Danger Verglas"
            ))
        }

        let visStr = visKm.truncatingRemainder(dividingBy: 1) == 0 ? String(Int(visKm)) : String(visKm)
        var summaryEn: String
        var summaryFr: String

        if minLumens >= 800 || overallCondition == "pitch-dark" {
            summaryEn = "Departure is in deep darkness before dawn. Mount an 800 to 1,000 lumen headlight in high-beam mode to see the road ahead, wear reflective gear with rotating ankle bands to be seen, and ensure lights are fully charged (cold drops battery runtime by ~30%)."
            summaryFr = "Départ en pleine nuit avant l'aube. Équipez un feu avant de 800 à 1 000 lumens en plein phare pour éclairer la route, portez un gilet et des bandes de cheville réfléchissantes pour être vu, et partez à 100% de charge (le froid réduit l'autonomie de ~30%)."
        } else if minLumens >= 500 || overallCondition == "twilight-dawn" || overallCondition == "twilight-dusk" {
            summaryEn = "Low-contrast twilight transition across your route. Run a 500–700 lumen continuous beam to illuminate unlit road segments, and wear high-contrast reflective outer gear to stay visible to drivers."
            summaryFr = "Transition crépusculaire à faible contraste. Utilisez un faisceau continu de 500 à 700 lumens pour éclairer les zones d'ombre, et portez une tenue rétro-réfléchissante contrastée."
        } else if visKm < 4 {
            summaryEn = "Atmospheric mist and moisture reduce road visibility to \(visStr) km. Keep daytime penetrating pulse lights active front and rear, and use clear or yellow contrast eyewear against cold wind."
            summaryFr = "Brume et humidité réduisent la visibilité à \(visStr) km. Maintenez des feux flash pulsés actifs à l'avant et à l'arrière, et portez des verres clairs ou jaunes contre le vent frais."
        } else {
            summaryEn = "Favorable daylight visibility throughout the ride. Keep a daytime safety flasher active for traffic awareness, and wear clear or UV eyewear."
            summaryFr = "Visibilité optimale en plein jour. Conservez un feu clignotant diurne pour vous signaler aux automobilistes, et prévoyez des verres adaptés aux reflets."
        }

        if isBlackIceRisk {
            summaryEn += " Heads up: near-freezing surface (\(tempStr)°C) — watch for black ice on bridges and damp turns."
            summaryFr += " Attention : chaussée froide (\(tempStr)°C) — risque de verglas sur ponts et virages humides."
        }

        return RideVisibilityAnalysis(
            rolloutTime: rolloutTime,
            arrivalTime: arrivalTime,
            movingMinutes: movingMinutes,
            dateStr: dateStr,
            isSimulatedWinterDate: isSimulatedWinterDate,
            solar: solar,
            rolloutElevationDeg: rolloutElevationDeg,
            arrivalElevationDeg: arrivalElevationDeg,
            rolloutPhase: rolloutPhase,
            arrivalPhase: arrivalPhase,
            nightPercent: nightPercent,
            twilightPercent: twilightPercent,
            daylightPercent: daylightPercent,
            overallCondition: overallCondition,
            opticalHazardLevel: opticalHazardLevel,
            visibilityKm: visKm,
            visibilityCategory: visibilityCategory,
            weatherCode: weatherCode,
            weatherDescEn: weatherDesc.en,
            weatherDescFr: weatherDesc.fr,
            isWinterTrip: isWinterTrip,
            lightingGear: lightingGear,
            passiveGear: passiveGear,
            surfaceCaution: surfaceCaution,
            summaryRecommendationEn: summaryEn,
            summaryRecommendationFr: summaryFr,
            suggestions: suggestions
        )
    }
}
