import Foundation

public enum ArrivalOpenStatus: String, Codable, Sendable {
    case open
    case closingSoon = "closing-soon"
    case closed
    case unknown
}

public struct ArrivalOpeningVerdict: Codable, Sendable, Equatable {
    public let status: ArrivalOpenStatus
    public let badgeLabel: String
    public let detailLabel: String
    public let rawHours: String
}

public enum OpeningHoursParser {
    private static let dayIndexMap: [String: Int] = [
        "mo": 0, "tu": 1, "we": 2, "th": 3, "fr": 4, "sa": 5, "su": 6,
    ]
    private static let allDays: Set<Int> = [0, 1, 2, 3, 4, 5, 6]
    private static let monthIndexMap: [String: Int] = [
        "jan": 1, "feb": 2, "mar": 3, "apr": 4, "may": 5, "jun": 6,
        "jul": 7, "aug": 8, "sep": 9, "oct": 10, "nov": 11, "dec": 12,
    ]

    private struct ParsedRule {
        var months: Set<Int>?
        var days: Set<Int>
        var hasExplicitDays: Bool
        var phOnly: Bool
        var isOff: Bool
        var intervals: [(Int, Int)]
    }

    private static func truncateHours(_ raw: String, maxLen: Int = 18) -> String {
        raw.count > maxLen ? "\(raw.prefix(maxLen))…" : raw
    }

    private static func formatMinutesAsHHMM(_ totalMin: Int) -> String {
        let norm = JSCompat.posMod(totalMin, 1440)
        return String(format: "%02d:%02d", norm / 60, norm % 60)
    }

    private static func resolveOsmTargetDay(
        _ targetDateStr: String?,
        timeZone: TimeZone = TimeZone(identifier: "Europe/Paris") ?? .current
    ) -> Int {
        var cal = Calendar(identifier: .gregorian)
        cal.timeZone = timeZone
        let dateObj: Date
        if let s = targetDateStr, s.count >= 10, let d = JSCompat.parseYMDNoon(s, timeZone: timeZone) {
            dateObj = d
        } else {
            dateObj = Date()
        }
        // Calendar.weekday: 1=Sunday, 2=Monday ... 7=Saturday -> JS getDay: 0=Su..6=Sa -> OSM: 0=Mo..6=Su
        let jsDay = cal.component(.weekday, from: dateObj) - 1
        return (jsDay + 6) % 7
    }

    private static func resolveTargetMonth(_ targetDateStr: String?) -> Int {
        if let s = targetDateStr {
            let parts = s.split(separator: "-").compactMap { Int($0) }
            if parts.count == 3, parts[1] >= 1, parts[1] <= 12 {
                return parts[1]
            }
        }
        return Calendar(identifier: .gregorian).component(.month, from: Date())
    }

    private static func parseDaySelectors(_ prefix: String) -> (valid: Bool, days: Set<Int>, hasExplicitDays: Bool, phOnly: Bool) {
        let trimmed = prefix.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
        if trimmed.isEmpty {
            return (true, allDays, false, false)
        }
        let parts = trimmed.split(separator: ",").map { $0.trimmingCharacters(in: .whitespacesAndNewlines) }.filter { !$0.isEmpty }
        var days = Set<Int>()
        var sawWeekday = false
        var sawPh = false

        for part in parts {
            if part == "ph" || part == "sh" {
                sawPh = true
                continue
            }
            if let idx = dayIndexMap[part] {
                days.insert(idx)
                sawWeekday = true
                continue
            }
            if let match = part.wholeMatch(of: /^([a-z]{2})\s*-\s*([a-z]{2})$/) {
                let sKey = String(match.output.1)
                let eKey = String(match.output.2)
                if let start = dayIndexMap[sKey], let end = dayIndexMap[eKey] {
                    var cur = start
                    for _ in 0..<7 {
                        days.insert(cur)
                        if cur == end { break }
                        cur = (cur + 1) % 7
                    }
                    sawWeekday = true
                    continue
                }
            }
            return (false, [], false, false)
        }

        return (true, days, sawWeekday || sawPh, !sawWeekday && sawPh)
    }

    private static func parseLeadingMonthRange(_ raw: String) -> (months: Set<Int>?, rest: String) {
        guard let match = raw.wholeMatch(of: /(?i)^([a-z]{3})\s*-\s*([a-z]{3})(?:\s+(.*))?$/) else {
            return (nil, raw)
        }
        let m1 = String(match.output.1).lowercased()
        let m2 = String(match.output.2).lowercased()
        guard let start = monthIndexMap[m1], let end = monthIndexMap[m2] else {
            return (nil, raw)
        }
        var months = Set<Int>()
        var cur = start
        for _ in 0..<12 {
            months.insert(cur)
            if cur == end { break }
            cur = (cur % 12) + 1
        }
        let rest = match.output.3.map { String($0).trimmingCharacters(in: .whitespacesAndNewlines) } ?? ""
        return (months, rest)
    }

    private static func parseSingleRule(_ ruleRaw: String) -> ParsedRule? {
        let cleaned = ruleRaw.trimmingCharacters(in: .whitespacesAndNewlines)
        if cleaned.isEmpty { return nil }
        if cleaned.range(of: #"["|+]"#, options: .regularExpression) != nil ||
           cleaned.range(of: #"\b(sunrise|sunset|dawn|dusk)\b"#, options: [.regularExpression, .caseInsensitive]) != nil {
            return nil
        }

        let (months, rest) = parseLeadingMonthRange(cleaned)
        if rest.isEmpty {
            return ParsedRule(months: months, days: allDays, hasExplicitDays: false, phOnly: false, isOff: false, intervals: [(0, 1440)])
        }

        let lower = rest.lowercased()
        if lower == "24/7" || lower == "open" {
            return ParsedRule(months: months, days: allDays, hasExplicitDays: false, phOnly: false, isOff: false, intervals: [(0, 1440)])
        }
        if lower == "off" || lower == "closed" {
            return ParsedRule(months: months, days: allDays, hasExplicitDays: false, phOnly: false, isOff: true, intervals: [])
        }

        guard let match = rest.wholeMatch(of: /(?i)^(?:([a-z,\-\s]+?)\s+)?(\d{1,2}:\d{2}\s*-.*|off|closed|open|24\/7)$/) else {
            return nil
        }

        let dayPart = match.output.1.map(String.init) ?? ""
        let timePart = String(match.output.2).trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
        let parsedDays = parseDaySelectors(dayPart)
        if !parsedDays.valid { return nil }

        if timePart == "off" || timePart == "closed" {
            return ParsedRule(months: months, days: parsedDays.days, hasExplicitDays: parsedDays.hasExplicitDays, phOnly: parsedDays.phOnly, isOff: true, intervals: [])
        }
        if timePart == "open" || timePart == "24/7" {
            return ParsedRule(months: months, days: parsedDays.days, hasExplicitDays: parsedDays.hasExplicitDays, phOnly: parsedDays.phOnly, isOff: false, intervals: [(0, 1440)])
        }

        let chunks = timePart.split(separator: ",").map { $0.trimmingCharacters(in: .whitespacesAndNewlines) }.filter { !$0.isEmpty }
        if chunks.isEmpty { return nil }

        var intervals: [(Int, Int)] = []
        for chunk in chunks {
            guard let m = chunk.wholeMatch(of: /^(\d{1,2}):(\d{2})\s*-\s*(\d{1,2}):(\d{2})$/),
                  let h1 = Int(m.output.1), let m1 = Int(m.output.2),
                  let h2 = Int(m.output.3), let m2 = Int(m.output.4),
                  h1 <= 24, m1 <= 59, h2 <= 24, m2 <= 59 else {
                return nil
            }
            let startMin = h1 * 60 + m1
            let endMin = h2 * 60 + m2
            if startMin == 0 && endMin == 0 { return nil }
            intervals.append((startMin, endMin))
        }

        return ParsedRule(months: months, days: parsedDays.days, hasExplicitDays: parsedDays.hasExplicitDays, phOnly: parsedDays.phOnly, isOff: false, intervals: intervals)
    }

    public static func evaluateOpeningHoursAtArrival(
        openingHours: String?,
        targetDateStr: String?,
        arrivalTimeHHMM: String?,
        lang: CadenceLang = .en,
        timeZone: TimeZone = TimeZone(identifier: "Europe/Paris") ?? .current
    ) -> ArrivalOpeningVerdict? {
        guard let openingHours, !openingHours.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else {
            return nil
        }

        let rawHours = openingHours.replacingOccurrences(of: #"\s+"#, with: " ", options: .regularExpression).trimmingCharacters(in: .whitespacesAndNewlines)
        let isFr = lang == .fr

        if rawHours.lowercased() == "24/7" || rawHours.lowercased() == "mo-su 00:00-24:00" {
            return ArrivalOpeningVerdict(
                status: .open,
                badgeLabel: "24/7",
                detailLabel: isFr ? "Ouvert 24h/24" : "Open 24/7",
                rawHours: rawHours
            )
        }

        guard let etaTrimmed = arrivalTimeHHMM?.trimmingCharacters(in: .whitespacesAndNewlines),
              let etaMatch = etaTrimmed.wholeMatch(of: /^(\d{1,2}):(\d{2})$/),
              let etaHour = Int(etaMatch.output.1),
              let etaMinute = Int(etaMatch.output.2),
              etaHour <= 23, etaMinute <= 59 else {
            return ArrivalOpeningVerdict(
                status: .unknown,
                badgeLabel: truncateHours(rawHours),
                detailLabel: rawHours,
                rawHours: rawHours
            )
        }

        let arrivalMinutes = etaHour * 60 + etaMinute
        let formattedEta = String(format: "%02d:%02d", etaHour, etaMinute)

        let rawRules = rawHours.split(separator: ";").map { $0.trimmingCharacters(in: .whitespacesAndNewlines) }.filter { !$0.isEmpty }
        if rawRules.isEmpty { return nil }

        var parsedRules: [ParsedRule] = []
        for r in rawRules {
            guard let parsed = parseSingleRule(r) else {
                return ArrivalOpeningVerdict(
                    status: .unknown,
                    badgeLabel: truncateHours(rawHours),
                    detailLabel: rawHours,
                    rawHours: rawHours
                )
            }
            parsedRules.append(parsed)
        }

        let osmTargetDay = resolveOsmTargetDay(targetDateStr, timeZone: timeZone)
        let targetMonth = resolveTargetMonth(targetDateStr)
        var activeRule: ParsedRule? = nil

        for rule in parsedRules {
            if let months = rule.months, !months.contains(targetMonth) { continue }
            if rule.phOnly { continue }
            if !rule.hasExplicitDays || rule.days.contains(osmTargetDay) {
                activeRule = rule
            }
        }

        guard let activeRule else {
            return ArrivalOpeningVerdict(
                status: .closed,
                badgeLabel: isFr ? "Fermé à \(formattedEta)" : "Closed at \(formattedEta)",
                detailLabel: isFr ? "Fermé ce jour (horaires : \(rawHours))" : "Closed on ride day (hours: \(rawHours))",
                rawHours: rawHours
            )
        }

        if activeRule.isOff || activeRule.intervals.isEmpty {
            return ArrivalOpeningVerdict(
                status: .closed,
                badgeLabel: isFr ? "Fermé à \(formattedEta)" : "Closed at \(formattedEta)",
                detailLabel: isFr
                    ? "Fermé à l'heure d'arrivée estimée (\(formattedEta)) · \(rawHours)"
                    : "Closed at estimated arrival (\(formattedEta)) · \(rawHours)",
                rawHours: rawHours
            )
        }

        if activeRule.intervals.contains(where: { $0.0 == 0 && $0.1 == 1440 }) {
            return ArrivalOpeningVerdict(
                status: .open,
                badgeLabel: "24/7",
                detailLabel: isFr ? "Ouvert 24h/24" : "Open 24/7",
                rawHours: rawHours
            )
        }

        for (startMin, endMin) in activeRule.intervals {
            if endMin > startMin {
                if arrivalMinutes >= startMin && arrivalMinutes < endMin {
                    let remainingMin = endMin - arrivalMinutes
                    let closingHHMM = formatMinutesAsHHMM(endMin)
                    if remainingMin <= 30 && endMin < 1440 {
                        return ArrivalOpeningVerdict(
                            status: .closingSoon,
                            badgeLabel: isFr ? "Ferme bientôt (\(closingHHMM))" : "Closing soon (\(closingHHMM))",
                            detailLabel: isFr
                                ? "Ferme dans \(remainingMin) min à \(closingHHMM) (arrivée \(formattedEta)) · \(rawHours)"
                                : "Closes in \(remainingMin) min at \(closingHHMM) (arrival \(formattedEta)) · \(rawHours)",
                            rawHours: rawHours
                        )
                    }
                    return ArrivalOpeningVerdict(
                        status: .open,
                        badgeLabel: isFr ? "Ouvert à \(formattedEta)" : "Open at \(formattedEta)",
                        detailLabel: isFr
                            ? "Ouvert à \(formattedEta) (jusqu'à \(closingHHMM)) · \(rawHours)"
                            : "Open at \(formattedEta) (until \(closingHHMM)) · \(rawHours)",
                        rawHours: rawHours
                    )
                }
            } else if endMin < startMin {
                if arrivalMinutes >= startMin || arrivalMinutes < endMin {
                    let remainingMin = arrivalMinutes >= startMin ? (1440 - arrivalMinutes + endMin) : (endMin - arrivalMinutes)
                    let closingHHMM = formatMinutesAsHHMM(endMin)
                    if remainingMin <= 30 {
                        return ArrivalOpeningVerdict(
                            status: .closingSoon,
                            badgeLabel: isFr ? "Ferme bientôt (\(closingHHMM))" : "Closing soon (\(closingHHMM))",
                            detailLabel: isFr
                                ? "Ferme dans \(remainingMin) min à \(closingHHMM) (arrivée \(formattedEta)) · \(rawHours)"
                                : "Closes in \(remainingMin) min at \(closingHHMM) (arrival \(formattedEta)) · \(rawHours)",
                            rawHours: rawHours
                        )
                    }
                    return ArrivalOpeningVerdict(
                        status: .open,
                        badgeLabel: isFr ? "Ouvert à \(formattedEta)" : "Open at \(formattedEta)",
                        detailLabel: isFr
                            ? "Ouvert à \(formattedEta) (jusqu'à \(closingHHMM)) · \(rawHours)"
                            : "Open at \(formattedEta) (until \(closingHHMM)) · \(rawHours)",
                        rawHours: rawHours
                    )
                }
            }
        }

        return ArrivalOpeningVerdict(
            status: .closed,
            badgeLabel: isFr ? "Fermé à \(formattedEta)" : "Closed at \(formattedEta)",
            detailLabel: isFr ? "Fermé à \(formattedEta) · \(rawHours)" : "Closed at \(formattedEta) · \(rawHours)",
            rawHours: rawHours
        )
    }
}
