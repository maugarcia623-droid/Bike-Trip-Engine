import Foundation

public struct DailyForecastDay: Codable, Sendable, Equatable {
    public var date: String
    public var weatherCode: Int
    public var tempMaxC: Double
    public var tempMinC: Double
    public var precipitationSumMm: Double
    public var precipitationProbMax: Double
    public var windSpeedMaxKmH: Double

    public init(
        date: String,
        weatherCode: Int,
        tempMaxC: Double,
        tempMinC: Double,
        precipitationSumMm: Double,
        precipitationProbMax: Double,
        windSpeedMaxKmH: Double
    ) {
        self.date = date
        self.weatherCode = weatherCode
        self.tempMaxC = tempMaxC
        self.tempMinC = tempMinC
        self.precipitationSumMm = precipitationSumMm
        self.precipitationProbMax = precipitationProbMax
        self.windSpeedMaxKmH = windSpeedMaxKmH
    }
}

public struct WeeklyForecast: Codable, Sendable, Equatable {
    public var latitude: Double
    public var longitude: Double
    public var fetchedAt: String
    public var days: [DailyForecastDay]

    public init(latitude: Double, longitude: Double, fetchedAt: String, days: [DailyForecastDay]) {
        self.latitude = latitude
        self.longitude = longitude
        self.fetchedAt = fetchedAt
        self.days = days
    }
}

public enum WeeklyWeatherSummaryEngine {
    private static func isSnowDay(_ day: DailyForecastDay) -> Bool {
        (day.weatherCode >= 71 && day.weatherCode <= 77) || day.weatherCode == 85 || day.weatherCode == 86
    }

    private static func isStormDay(_ day: DailyForecastDay) -> Bool {
        day.weatherCode >= 95
    }

    private static func isRainCode(_ code: Int) -> Bool {
        (code >= 51 && code <= 67) || (code >= 80 && code <= 82) || code >= 95
    }

    private static func isRainDay(_ day: DailyForecastDay) -> Bool {
        if isSnowDay(day) { return false }
        return day.precipitationSumMm >= 1.5 || day.precipitationProbMax >= 60 || isRainCode(day.weatherCode)
    }

    private static func isHeavyRainDay(_ day: DailyForecastDay) -> Bool {
        if isSnowDay(day) { return false }
        return day.precipitationSumMm >= 8 || [63, 65, 81, 82, 95, 96, 99].contains(day.weatherCode)
    }

    private static func isWindyDay(_ day: DailyForecastDay) -> Bool {
        day.windSpeedMaxKmH >= 32
    }

    private static func isSunnyDay(_ day: DailyForecastDay) -> Bool {
        day.weatherCode <= 2 && !isRainDay(day) && !isSnowDay(day)
    }

    private static func formatDayLabel(
        _ day: DailyForecastDay,
        index: Int,
        lang: CadenceLang,
        style: String,
        timeZone: TimeZone
    ) -> String {
        if style == "long" {
            if index == 0 { return lang == .fr ? "aujourd'hui" : "today" }
            if index == 1 { return lang == .fr ? "demain" : "tomorrow" }
        }
        let date = JSCompat.parseYMDNoon(day.date, timeZone: timeZone) ?? Date()
        let formatter = DateFormatter()
        formatter.locale = Locale(identifier: lang == .fr ? "fr-FR" : "en-US")
        formatter.timeZone = timeZone
        formatter.setLocalizedDateFormatFromTemplate(style == "long" ? "EEEE" : "EEE")
        return formatter.string(from: date).replacingOccurrences(of: ".", with: "")
    }

    private static func formatSingleDayWithPrep(
        _ day: DailyForecastDay,
        index: Int,
        lang: CadenceLang,
        timeZone: TimeZone
    ) -> String {
        let label = formatDayLabel(day, index: index, lang: lang, style: "long", timeZone: timeZone)
        if index == 0 || index == 1 || lang == .fr { return label }
        return "on \(label)"
    }

    private static func formatShortDayList(
        _ items: [(day: DailyForecastDay, index: Int)],
        lang: CadenceLang,
        timeZone: TimeZone
    ) -> String {
        let labels = items.map { formatDayLabel($0.day, index: $0.index, lang: lang, style: "short", timeZone: timeZone) }
        if labels.isEmpty { return "" }
        if labels.count == 1 { return labels[0] }
        let conj = lang == .fr ? " et " : " & "
        if labels.count == 2 { return "\(labels[0])\(conj)\(labels[1])" }
        return "\(labels.dropLast().joined(separator: ", "))\(conj)\(labels.last!)"
    }

    private static func formatTempPhrase(_ days: [DailyForecastDay], lang: CadenceLang) -> (
        tempPhrase: String, avgHigh: Int, maxHigh: Int, minLow: Int
    ) {
        let highs = days.map(\.tempMaxC)
        let lows = days.map(\.tempMinC)
        let minHigh = JSCompat.jsRoundInt(highs.min() ?? 0)
        let maxHigh = JSCompat.jsRoundInt(highs.max() ?? 0)
        let avgHigh = JSCompat.jsRoundInt(highs.reduce(0, +) / Double(highs.count))
        let minLow = JSCompat.jsRoundInt(lows.min() ?? 0)

        let tempPhrase: String
        if maxHigh - minHigh <= 3 {
            tempPhrase = lang == .fr ? "autour de \(avgHigh)°C" : "around \(avgHigh)°C"
        } else {
            tempPhrase = lang == .fr ? "max \(minHigh)–\(maxHigh)°C" : "highs \(minHigh)–\(maxHigh)°C"
        }
        return (tempPhrase, avgHigh, maxHigh, minLow)
    }

    public static func summarize(
        forecast: WeeklyForecast,
        lang: CadenceLang = .en,
        timeZone: TimeZone = TimeZone(identifier: "Europe/Paris") ?? .current
    ) -> String {
        let days = Array(forecast.days.prefix(7))
        if days.isEmpty { return "" }

        let isFr = lang == .fr
        let indexed = days.enumerated().map { (day: $0.element, index: $0.offset) }

        let snowDays = indexed.filter { isSnowDay($0.day) }
        let rainDays = indexed.filter { isRainDay($0.day) }
        let heavyRainDays = indexed.filter { isHeavyRainDay($0.day) }
        let stormDays = indexed.filter { isStormDay($0.day) }
        let dryDays = indexed.filter { !isRainDay($0.day) && !isSnowDay($0.day) }
        let windyDays = indexed.filter { isWindyDay($0.day) }
        let sunnyDays = indexed.filter { isSunnyDay($0.day) }

        let totalPrecipMm = days.reduce(0.0) { $0 + max(0.0, $1.precipitationSumMm) }
        let maxWind = days.map(\.windSpeedMaxKmH).max() ?? 0.0
        let (tempPhrase, avgHigh, maxHigh, minLow) = formatTempPhrase(days, lang: lang)

        if snowDays.count >= 2 || (snowDays.count >= 1 && minLow <= 0 && avgHigh <= 4) {
            return isFr
                ? "Neige et gel (\(tempPhrase)) au programme cette semaine. Prudence dans les virages, ou session home-trainer."
                : "Snow and freezing temps (\(tempPhrase)) in the mix this week. Take it easy on the corners—or keep it on the trainer."
        }

        let isVeryRainyWeek =
            rainDays.count >= 4
            || (rainDays.count >= 3 && totalPrecipMm >= 20)
            || heavyRainDays.count >= 2

        if isVeryRainyWeek {
            if rainDays.count >= 6 || dryDays.isEmpty {
                if stormDays.count >= 2 {
                    return isFr
                        ? "Semaine orageuse et bien arrosée (\(tempPhrase)). Tu peux le faire, couvre-toi juste de la tête aux pieds et évite les gros grains."
                        : "Stormy, rain-soaked week ahead (\(tempPhrase)). You can do it, just cover yourself from head to toe and dodge the heavy squalls."
                }
                return isFr
                    ? "De la pluie presque toute la semaine (\(tempPhrase)). Tu peux le faire, couvre-toi juste de la tête aux pieds."
                    : "Rain pretty much all week (\(tempPhrase)). You can do it, just cover yourself from head to toe."
            }

            if dryDays.count <= 3 {
                let bestDry = dryDays.sorted { a, b in
                    if a.day.precipitationProbMax != b.day.precipitationProbMax {
                        return a.day.precipitationProbMax < b.day.precipitationProbMax
                    }
                    if a.day.precipitationSumMm != b.day.precipitationSumMm {
                        return a.day.precipitationSumMm < b.day.precipitationSumMm
                    }
                    return b.day.tempMaxC < a.day.tempMaxC
                }[0]
                let bestDryLabel = formatDayLabel(bestDry.day, index: bestDry.index, lang: lang, style: "long", timeZone: timeZone)
                return isFr
                    ? "Semaine bien humide (\(rainDays.count) jours de pluie, \(tempPhrase)) — \(bestDryLabel) s'annonce le plus sec. Tu peux le faire, couvre-toi juste de la tête aux pieds."
                    : "Lots of rain this week (\(rainDays.count) wet days, \(tempPhrase))—\(bestDryLabel) looks driest. You can do it, just cover yourself from head to toe."
            }

            return isFr
                ? "Pas mal de pluie au programme (\(rainDays.count) jours humides, \(tempPhrase)). Tu peux le faire, couvre-toi juste de la tête aux pieds."
                : "Plenty of rain in the forecast (\(rainDays.count) wet days, \(tempPhrase)). You can do it, just cover yourself from head to toe."
        }

        if rainDays.count >= 2 {
            let rainList = formatShortDayList(rainDays, lang: lang, timeZone: timeZone)
            return isFr
                ? "Semaine mitigée (\(tempPhrase)) — plutôt sec dans l'ensemble, avec de la pluie \(rainList). Garde un coupe-pluie sous la main."
                : "Mixed bag this week (\(tempPhrase))—mostly dry, with rain \(rainDays.count == 2 ? "around " : "on ")\(rainList). Keep a shell handy."
        }

        if windyDays.count >= 3 || maxWind >= 42 {
            let peakWind = JSCompat.jsRoundInt(maxWind)
            return isFr
                ? "Plutôt sec cette semaine (\(tempPhrase)), mais venteux (jusqu'à \(peakWind) km/h). De quoi chasser le vent de dos."
                : "Mostly dry this week (\(tempPhrase)), though it's looking breezy (up to \(peakWind) km/h). Free tailwinds if you plan it right."
        }

        if rainDays.count == 1 {
            let wetWhen = formatSingleDayWithPrep(rainDays[0].day, index: rainDays[0].index, lang: lang, timeZone: timeZone)
            return isFr
                ? "Semaine globalement sèche (\(tempPhrase)), juste une averse possible \(wetWhen). Roule tranquille."
                : "Mostly dry all week (\(tempPhrase)), with just a passing shower possible \(wetWhen). Easy riding ahead."
        }

        if avgHigh < 9 {
            return isFr
                ? "Sec et frais toute la semaine (\(tempPhrase)\(minLow <= 3 ? ", matins frisquets" : "")). Une bonne couche thermique et profite des routes calmes."
                : "Dry and crisp all week (\(tempPhrase)\(minLow <= 3 ? ", chilly mornings" : "")). Throw on warm layers and enjoy the quiet roads."
        }

        if maxHigh >= 28 {
            return isFr
                ? "Semaine chaude et sèche (\(tempPhrase)). Pars tôt si possible et prends un bidon de plus."
                : "Warm, dry stretch all week (\(tempPhrase)). Roll out early if you can and pack an extra bottle."
        }

        if sunnyDays.count >= 4 && avgHigh >= 12 {
            return isFr
                ? "Temps sec et lumineux toute la semaine (\(tempPhrase)) — l'excuse parfaite pour rallonger le parcours."
                : "Clear, dry skies all week (\(tempPhrase))—basically an open invitation to take the long way."
        }

        return isFr
            ? "Semaine sèche et calme (\(tempPhrase)). Des conditions idéales pour aligner les kilomètres."
            : "Dry and calm all week (\(tempPhrase)). Solid weather to get the miles in."
    }
}
