import Foundation

public struct ParsedFeedback: Codable, Sendable, Equatable {
    public var tripMode: String?
    public var arrivalTarget: String?
    public var rolloutTime: String?
    public var speed: Double?
    public var date: String?
    public var distance: Double?
    public var cargo: Double?
    public var riderMass: Double?
    public var bikeMass: Double?
    public var gate: String?
    public var origin: String?
    public var destination: String?
    public var headwind: String?
    public var strictFoodRule: Bool?
    public var ravito: String?
    public var puncturePrep: String?
    public var includePunctureKit: Bool?
    public var includeExtraRavito: Bool?

    public init(
        tripMode: String? = nil,
        arrivalTarget: String? = nil,
        rolloutTime: String? = nil,
        speed: Double? = nil,
        date: String? = nil,
        distance: Double? = nil,
        cargo: Double? = nil,
        riderMass: Double? = nil,
        bikeMass: Double? = nil,
        gate: String? = nil,
        origin: String? = nil,
        destination: String? = nil,
        headwind: String? = nil,
        strictFoodRule: Bool? = nil,
        ravito: String? = nil,
        puncturePrep: String? = nil,
        includePunctureKit: Bool? = nil,
        includeExtraRavito: Bool? = nil
    ) {
        self.tripMode = tripMode
        self.arrivalTarget = arrivalTarget
        self.rolloutTime = rolloutTime
        self.speed = speed
        self.date = date
        self.distance = distance
        self.cargo = cargo
        self.riderMass = riderMass
        self.bikeMass = bikeMass
        self.gate = gate
        self.origin = origin
        self.destination = destination
        self.headwind = headwind
        self.strictFoodRule = strictFoodRule
        self.ravito = ravito
        self.puncturePrep = puncturePrep
        self.includePunctureKit = includePunctureKit
        self.includeExtraRavito = includeExtraRavito
    }
}

/// Swift representation of TS `Partial<TripProfile>` containing the exact subset
/// of top-level fields and merged nested sub-structs mutated by `parseTripDescription`.
public struct ParsedTripPatch: Codable, Sendable, Equatable {
    public var name: String?
    public var tag: String?
    public var departureDate: String?
    public var departureTime: String?
    public var physics: PhysicsParams
    public var route: RouteParams
    public var office: OfficeConstraints
    public var weather: WeatherCondition

    public init(
        name: String? = nil,
        tag: String? = nil,
        departureDate: String? = nil,
        departureTime: String? = nil,
        physics: PhysicsParams = PhysicsParams(),
        route: RouteParams = RouteParams(),
        office: OfficeConstraints = OfficeConstraints(),
        weather: WeatherCondition = WeatherCondition()
    ) {
        self.name = name
        self.tag = tag
        self.departureDate = departureDate
        self.departureTime = departureTime
        self.physics = physics
        self.route = route
        self.office = office
        self.weather = weather
    }

    /// Applies this patch onto a base `TripProfile`, preserving unpatched top-level properties.
    public func applying(to base: TripProfile) -> TripProfile {
        var copy = base
        if let name { copy.name = name }
        if let tag { copy.tag = tag }
        if let departureDate { copy.departureDate = departureDate }
        if let departureTime { copy.departureTime = departureTime }
        copy.physics = physics
        copy.route = route
        copy.office = office
        copy.weather = weather
        return copy
    }
}

public struct ParseTripResult: Codable, Sendable, Equatable {
    public var parsedValues: ParsedTripPatch
    public var detected: ParsedFeedback
    public var extractedSummary: [String]

    public init(
        parsedValues: ParsedTripPatch,
        detected: ParsedFeedback,
        extractedSummary: [String]
    ) {
        self.parsedValues = parsedValues
        self.detected = detected
        self.extractedSummary = extractedSummary
    }
}

public enum NlpRideParser {
    private static func formatJsNumber(_ value: Double) -> String {
        guard value.isFinite else { return "0" }
        let safe = value == 0 ? 0.0 : value
        if safe.truncatingRemainder(dividingBy: 1) == 0, abs(safe) < 9_007_199_254_740_992 {
            return String(Int64(safe))
        }
        return String(safe)
    }

    private static func parseDecimal(_ raw: String) -> Double? {
        Double(raw.replacingOccurrences(of: ",", with: "."))
    }

    private static func firstMatch(
        _ pattern: String,
        in text: String,
        caseInsensitive: Bool = true
    ) -> [String?]? {
        let options: NSRegularExpression.Options = caseInsensitive ? [.caseInsensitive] : []
        guard let regex = try? NSRegularExpression(pattern: pattern, options: options) else {
            return nil
        }
        let nsText = text as NSString
        let range = NSRange(location: 0, length: nsText.length)
        guard let match = regex.firstMatch(in: text, options: [], range: range) else {
            return nil
        }
        var groups: [String?] = []
        groups.reserveCapacity(match.numberOfRanges)
        for idx in 0..<match.numberOfRanges {
            let r = match.range(at: idx)
            if r.location != NSNotFound {
                groups.append(nsText.substring(with: r))
            } else {
                groups.append(nil)
            }
        }
        return groups
    }

    private static func testRegex(
        _ pattern: String,
        in text: String,
        caseInsensitive: Bool = true
    ) -> Bool {
        firstMatch(pattern, in: text, caseInsensitive: caseInsensitive) != nil
    }

    private static func replaceMatches(
        _ pattern: String,
        in text: String,
        with template: String,
        caseInsensitive: Bool = true
    ) -> String {
        let options: NSRegularExpression.Options = caseInsensitive ? [.caseInsensitive] : []
        guard let regex = try? NSRegularExpression(pattern: pattern, options: options) else {
            return text
        }
        let nsText = text as NSString
        let range = NSRange(location: 0, length: nsText.length)
        return regex.stringByReplacingMatches(in: text, options: [], range: range, withTemplate: template)
    }

    private static func cleanPlacePhrase(_ raw: String) -> String {
        var cleaned = raw.trimmingCharacters(in: .whitespacesAndNewlines)
        cleaned = replaceMatches(#"^[,.;:!\-–—]+|[,.;:!\-–—]+$"#, in: cleaned, with: "", caseInsensitive: false)
        cleaned = cleaned.trimmingCharacters(in: .whitespacesAndNewlines)

        // Unwrap French/English venue wrappers while preserving town names like "La Baule" or "Le Croisic"
        let venuePrefixPattern = #"^(?:(?:un|une|le|la|l'|l’|mon|notre|the|a|an)\s+)?(?:h[ôo]tel|bivouac|camp(?:ing)?|g[îi]te|auberge|bistro|resto|restaurant|bureau|travail|boulot)\s+(?:à|a|au|aux|de\s+la|du|des|de|d'|d’|en|in|at|near)\s+(.+)$"#
        if let m = firstMatch(venuePrefixPattern, in: cleaned), let inner = m[1] {
            cleaned = inner.trimmingCharacters(in: .whitespacesAndNewlines)
        }

        // Unwrap trailing generic venue word e.g. "Clisson hotel" -> "Clisson"
        if let m = firstMatch(#"^(.+?)\s+(?:h[ôo]tel|bivouac)$"#, in: cleaned),
           let inner = m[1]?.trimmingCharacters(in: .whitespacesAndNewlines),
           inner.count >= 2 {
            cleaned = inner
        }

        // Capitalize first letter if typed all-lowercase (e.g. "clisson" -> "Clisson")
        if !cleaned.isEmpty && cleaned == cleaned.lowercased() {
            if let tokenRegex = try? NSRegularExpression(pattern: #"\s+|-|[^\s-]+"#, options: []) {
                let nsCleaned = cleaned as NSString
                let matches = tokenRegex.matches(
                    in: cleaned,
                    options: [],
                    range: NSRange(location: 0, length: nsCleaned.length)
                )
                let lowercaseSkip: Set<String> = ["de", "du", "des", "sur", "en", "sous"]
                var rebuilt = ""
                for match in matches {
                    let part = nsCleaned.substring(with: match.range)
                    if testRegex(#"^[a-zà-ÿ]+$"#, in: part, caseInsensitive: true),
                       !lowercaseSkip.contains(part.lowercased()),
                       let first = part.first {
                        rebuilt += String(first).uppercased() + String(part.dropFirst())
                    } else {
                        rebuilt += part
                    }
                }
                cleaned = rebuilt
            }
        }

        return cleaned
    }

    private static func parseTimeString(
        _ timeStr: String?,
        meridian: String?,
        norm: String
    ) -> String? {
        guard let timeStr else { return nil }
        let trimmed = timeStr.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
        if trimmed == "midi" || trimmed == "noon" { return "12:00" }
        if trimmed == "minuit" || trimmed == "midnight" { return "00:00" }

        var hours = 0
        var minutes = 0

        if let m = firstMatch(#"^(\d{1,2})\s*h\s*et\s*quart\b"#, in: trimmed, caseInsensitive: false),
           let h = m[1].flatMap(Int.init) {
            hours = h
            minutes = 15
        } else if let m = firstMatch(#"^(\d{1,2})\s*h\s*et\s*demie?\b"#, in: trimmed, caseInsensitive: false),
                  let h = m[1].flatMap(Int.init) {
            hours = h
            minutes = 30
        } else if let m = firstMatch(#"^(\d{1,2})\s*h\s*moins\s*le\s*quart\b"#, in: trimmed, caseInsensitive: false),
                  let h = m[1].flatMap(Int.init) {
            hours = h - 1
            if hours < 0 { hours = 23 }
            minutes = 45
        } else if let m = firstMatch(#"^quarter\s*past\s*(\d{1,2})\b"#, in: trimmed, caseInsensitive: false),
                  let h = m[1].flatMap(Int.init) {
            hours = h
            minutes = 15
        } else if let m = firstMatch(#"^quarter\s*to\s*(\d{1,2})\b"#, in: trimmed, caseInsensitive: false),
                  let h = m[1].flatMap(Int.init) {
            hours = h - 1
            if hours < 0 { hours = 23 }
            minutes = 45
        } else if let m = firstMatch(#"^half\s*past\s*(\d{1,2})\b"#, in: trimmed, caseInsensitive: false),
                  let h = m[1].flatMap(Int.init) {
            hours = h
            minutes = 30
        } else if let m = firstMatch(#"^(\d{1,2})\s*h(?:\s*(\d{2}))?$"#, in: trimmed, caseInsensitive: true),
                  let h = m[1].flatMap(Int.init) {
            hours = h
            minutes = m[2].flatMap(Int.init) ?? 0
        } else if let m = firstMatch(#"^(\d{1,2})\s*:\s*(\d{2})$"#, in: trimmed, caseInsensitive: false),
                  let h = m[1].flatMap(Int.init),
                  let min = m[2].flatMap(Int.init) {
            hours = h
            minutes = min
        } else if let m = firstMatch(#"^(\d{1,2})$"#, in: trimmed, caseInsensitive: false),
                  let h = m[1].flatMap(Int.init) {
            hours = h
            minutes = 0
        } else {
            return nil
        }

        if let meridian {
            let mer = meridian.lowercased()
            if mer == "pm" && hours < 12 { hours += 12 }
            if mer == "am" && hours == 12 { hours = 0 }
        } else if testRegex(#"après-midi|apres-midi|du\s+soir"#, in: norm, caseInsensitive: false),
                  hours >= 1 && hours <= 11 {
            hours += 12
        }

        if hours < 0 || hours > 23 || minutes < 0 || minutes > 59 {
            return nil
        }
        return String(format: "%02d:%02d", hours, minutes)
    }

    /// Bilingual (EN + FR) natural language parser for cycling trip & commute prompts.
    public static func parseTripDescription(
        _ text: String,
        baseTrip: TripProfile? = nil,
        lang: CadenceLang = .en,
        now: Date = Date(),
        timeZone: TimeZone = TimeZone(identifier: "Europe/Paris") ?? .current
    ) -> ParseTripResult {
        let isFr = (lang == .fr)
        let lower = text.lowercased()
        let curlyNormalized = lower
            .replacingOccurrences(of: "’", with: "'")
            .replacingOccurrences(of: "‘", with: "'")
        let decomposed = curlyNormalized.decomposedStringWithCanonicalMapping
        let norm = String(decomposed.unicodeScalars.filter { !(0x0300...0x036F).contains($0.value) })

        var cal = Calendar(identifier: .gregorian)
        cal.timeZone = timeZone
        let currentYear = cal.component(.year, from: now)

        var parsedValues = ParsedTripPatch(
            physics: baseTrip?.physics ?? PhysicsParams(),
            route: baseTrip?.route ?? RouteParams(),
            office: baseTrip?.office ?? OfficeConstraints(),
            weather: baseTrip?.weather ?? WeatherCondition()
        )
        var detected = ParsedFeedback()
        var extractedSummary: [String] = []

        // Month lookup table (English + French full & abbreviated, accent-stripped)
        let monthMap: [String: Int] = [
            "jan": 1, "janv": 1, "january": 1, "janvier": 1,
            "feb": 2, "fev": 2, "fevr": 2, "february": 2, "fevrier": 2,
            "mar": 3, "march": 3, "mars": 3,
            "apr": 4, "avr": 4, "april": 4, "avril": 4,
            "may": 5, "mai": 5,
            "jun": 6, "june": 6, "juin": 6,
            "jul": 7, "juil": 7, "july": 7, "juillet": 7,
            "aug": 8, "august": 8, "aout": 8,
            "sep": 9, "sept": 9, "september": 9, "septembre": 9,
            "oct": 10, "october": 10, "octobre": 10,
            "nov": 11, "november": 11, "novembre": 11,
            "dec": 12, "december": 12, "decembre": 12,
        ]
        let monthNamesPattern = monthMap.keys
            .sorted { a, b in a.count != b.count ? a.count > b.count : a < b }
            .joined(separator: "|")

        // ── 1. SPEED / ALLURE EXTRACTION ──
        let normWithoutWind = replaceMatches(
            #"\b(?:vent(?:\s+de\s+face|\s+contraire)?|wind|gusts?|rafales?)\s*(?:de|d'|a|is|at|of)?\s*\d+(?:[.,]\d+)?\s*(?:km\s*\/\s*h|kph|kmh)\b"#,
            in: norm,
            with: "wind_speed_token"
        )

        let speedMatch =
            firstMatch(#"(?:cruising\s*(?:speed|pace)?\s*(?:would\s+be|is|around|at)?|target\s*(?:speed|pace)\s*(?:of|is|at)?|vitesse\s*(?:de\s*croisiere|cible|moyenne)?\s*(?:de|d'|a|autour\s*de|environ)?|allure\s*(?:cible|moyenne|de\s*croisiere)?\s*(?:de|d'|a|autour\s*de|environ)?|moyenne\s*(?:de|d'|a)?|rythme\s*(?:de|d'|a)?|speed\s*(?:of|is|around)?|pace\s*(?:of|is|around)?|holding\s*|rouler\s*a\s*|a\s*|at\s*)(\d+(?:[.,]\d+)?)\s*(?:km\s*\/\s*h|kph|kmh)\b"#, in: normWithoutWind) ??
            firstMatch(#"(\d+(?:[.,]\d+)?)\s*(?:km\s*\/\s*h|kph|kmh)\b"#, in: normWithoutWind) ??
            firstMatch(#"(\d+(?:[.,]\d+)?)\s*(?:de\s*moyenne|km\s*\/\s*h\s*de\s*moyenne)\b"#, in: normWithoutWind) ??
            firstMatch(#"\b(?:target\s*speed|cruising\s*speed|vitesse\s*(?:cible|moyenne|de\s*croisiere)|allure\s*(?:cible|moyenne)?|moyenne\s*de|rythme\s*de)\s*(?:is|of|at|around|de|d'|a)?\s*(\d+(?:[.,]\d+)?)\b"#, in: normWithoutWind)

        var targetSpeed = (baseTrip?.route.targetSpeedKmH ?? 0) > 0 ? baseTrip!.route.targetSpeedKmH : 25.0
        if let speedMatch, let raw = speedMatch[1], let val = parseDecimal(raw), val >= 10 && val <= 60 {
            targetSpeed = val
            parsedValues.route.targetSpeedKmH = val
            detected.speed = val
            extractedSummary.append("Target Speed: \(formatJsNumber(val)) km/h")
        }

        // ── 2. DISTANCE EXTRACTION ──
        let distMatch =
            firstMatch(#"(?:distance|route|ride|commute|length|parcours|trajet|etape|sortie|boucle)?\s*(?:of|is|around|over|for|de|d'|sur)?\s*(\d+(?:[.,]\d+)?)\s*(?:km|kilometers|kilometres|kilos|bornes)\b(?!\s*\/\s*h)"#, in: norm) ??
            firstMatch(#"(\d+(?:[.,]\d+)?)\s*(?:km|kilometers|kilometres|kilos|bornes)\b(?!\s*\/\s*h)"#, in: norm)

        var distanceKm = (baseTrip?.route.distanceKm ?? 0) > 0 ? baseTrip!.route.distanceKm : 35.0
        if let distMatch, let raw = distMatch[1], let val = parseDecimal(raw), val > 0 && val < 500 {
            distanceKm = val
            parsedValues.route.distanceKm = val
            detected.distance = val
            extractedSummary.append("Route Distance: \(formatJsNumber(val)) km")
        }

        // ── 3. RIDER MASS ──
        let riderMatch =
            firstMatch(#"\b(?:rider|cyclist|body|i\s+weigh|je\s+pese|pesant|mon\s+poids|cycliste|poids\s*du\s*cycliste)\s*(?:weight|mass|poids|est\s*de|de|is|around|of|a)?\s*(\d+(?:[.,]\d+)?)\s*kg\b"#, in: norm) ??
            firstMatch(#"(\d+(?:[.,]\d+)?)\s*kg\s*(?:rider|cyclist|cycliste)\b"#, in: norm)
        if let riderMatch, let raw = riderMatch[1], let val = parseDecimal(raw), val >= 40 && val <= 160 {
            parsedValues.physics.riderWeightKg = val
            detected.riderMass = val
            extractedSummary.append("Rider Mass: \(formatJsNumber(val)) kg")
        }

        // ── 4. BIKE MASS ──
        let bikeMatch =
            firstMatch(#"\b(?:bike|bicycle|gravel|frame|velo|monture)\s*(?:weight|mass|poids)?\s*(?:is|around|of|de|a)?\s*(\d+(?:[.,]\d+)?)\s*kg\b"#, in: norm) ??
            firstMatch(#"(\d+(?:[.,]\d+)?)\s*kg\s*(?:bike|bicycle|gravel|frame|velo|monture)\b"#, in: norm)
        if let bikeMatch, let raw = bikeMatch[1], let val = parseDecimal(raw), val >= 4 && val <= 35 {
            parsedValues.physics.bikeWeightKg = val
            detected.bikeMass = val
            extractedSummary.append("Bike Mass: \(formatJsNumber(val)) kg")
        }

        // ── 5. GEAR & BACKPACK MASS ──
        let zeroCargo = testRegex(
            #"\b(?:zero\s*(?:bag|sac)s?|no\s*bags?|nothing\s*on\s*(?:the\s*)?bike|without\s*(?:bags?|luggage)|sans\s*(?:bagages?|sacoches?|sacs?|chargement)|a\s*vide|0\s*kg\s*(?:gear|backpack|bags?|sac|sacoches?|bagages?))\b"#,
            in: norm
        )
        let gearMatch =
            firstMatch(#"\b(?:gear|backpack|kit|luggage|panniers?|bags?|cargo|sac(?:\s*a\s*dos)?|sacoches?|bagages?|chargement|equipement|matos|affaires)\s*(?:weight|mass|poids)?\s*(?:is|around|of|de|a)?\s*(\d+(?:[.,]\d+)?)\s*kg\b"#, in: norm) ??
            firstMatch(#"\b(?:carrying|hauling|with|pack(?:ing)?|setup\s*with|avec|portant|charge\s*de)\s*(?:[a-zà-ÿ0-9'’\- ]{1,25}?\s+)?(\d+(?:[.,]\d+)?)\s*kg\b"#, in: norm) ??
            firstMatch(#"(\d+(?:[.,]\d+)?)\s*kg\s*(?:of\s*|de\s*|d')?(?:gear|backpack|kit|luggage|panniers?|bags?|cargo|tent|tente|sac(?:\s*a\s*dos)?|sacoches?|bagages?|chargement|equipement|matos|affaires)\b"#, in: norm)

        if zeroCargo {
            parsedValues.physics.gearWeightKg = 0
            detected.cargo = 0
            extractedSummary.append("Gear/Backpack Mass: 0 kg")
        } else if let gearMatch, let raw = gearMatch[1], let val = parseDecimal(raw), val >= 0 && val <= 40 {
            parsedValues.physics.gearWeightKg = val
            detected.cargo = val
            extractedSummary.append("Gear/Backpack Mass: \(formatJsNumber(val)) kg")
        }

        // ── 6. GATE DESIGNATION ──
        let gatePattern = #"\b(?:(north|south|east|west|main|nord|sud|est|ouest|principale?)\s+)?(gate|porte|portillon|entrance|acces|entree)(?:\s+(\d+[a-z\-]?|[a-z]\b))?\b"#
        let rawGateMatch = firstMatch(gatePattern, in: norm)
        if let rawGateMatch, let nounRaw = rawGateMatch[2], let idRaw = rawGateMatch[3] {
            let direction = rawGateMatch[1]
            let noun = nounRaw.lowercased()
            let id = idRaw.uppercased()
            let isFrenchNoun = ["porte", "portillon", "acces", "entree"].contains(noun) || isFr
            let baseLabel = isFrenchNoun ? "Porte" : "Gate"
            let gateName: String
            if let direction, let first = direction.first {
                let capDir = String(first).uppercased() + String(direction.dropFirst()).lowercased()
                gateName = "\(capDir) \(baseLabel) \(id)"
            } else {
                gateName = "\(baseLabel) \(id)"
            }
            parsedValues.office.gateName = gateName
            detected.gate = gateName
            extractedSummary.append("Checkpoint: \(gateName)")
        } else if testRegex(#"\b(?:gate|portillon)\b"#, in: norm), let rawGateMatch {
            let direction = rawGateMatch[1]
            let gateName: String
            if let direction, let first = direction.first {
                let capDir = String(first).uppercased() + String(direction.dropFirst()).lowercased()
                gateName = "\(capDir) \(isFr ? "Porte" : "Gate")"
            } else {
                gateName = isFr ? "Porte" : "Gate"
            }
            parsedValues.office.gateName = gateName
            detected.gate = gateName
            extractedSummary.append("Checkpoint: \(gateName)")
        }

        // ── 7. FRENCH CYCLING TERMINOLOGY: RAVITO & CRÈVE / BUFFER ──
        let explicitBufferMatch = firstMatch(
            #"(?:(\d{1,2})\s*-?\s*(?:minute|min)s?\s*(?:de\s*)?(?:buffer|marge|securite)|(?:buffer|marge(?:\s*de\s*securite)?)\s*(?:of|de)?\s*(\d{1,2})\s*(?:min|minutes?))"#,
            in: norm
        )
        var extraBufferMinutes = 0

        if testRegex(#"\b(?:ravitos?|ravitaillements?|pause\s+cafe|arret\s+boulangerie)\b"#, in: norm) {
            let ravitoMinMatch =
                firstMatch(#"\b(?:pause\s+|arret\s+)?(?:ravitos?|ravitaillements?|pause\s+cafe)\s*(?:de|d'|of|for)?\s*(\d{1,2})\s*(?:min|minutes?|m\b)"#, in: norm) ??
                firstMatch(#"(\d{1,2})\s*(?:min|minutes?)\s*(?:de\s*)?(?:pause\s+)?(?:ravitos?|ravitaillements?)"#, in: norm)

            if testRegex(#"\b(?:ravitos?|ravitaillements?)\s+(?:au\s+)?(?:vestiaires?|lockers?)\b"#, in: norm) {
                let mins = ravitoMinMatch?[1].flatMap(Int.init) ?? 10
                parsedValues.office.lockerRefuelMinutes = Double(mins)
                detected.ravito = isFr ? "Vestiaire (\(mins)m)" : "Locker (\(mins)m)"
            } else if let ravitoMinMatch, let mins = ravitoMinMatch[1].flatMap(Int.init) {
                extraBufferMinutes += mins
                detected.ravito = "+\(mins) min"
                detected.includeExtraRavito = true
            } else if testRegex(#"\bsans\s+ravito\b"#, in: norm) {
                detected.ravito = isFr ? "Sans arrêt" : "Non-stop"
            } else {
                extraBufferMinutes += 10
                detected.ravito = isFr ? "Prévu (+10 min)" : "Planned (+10 min)"
                detected.includeExtraRavito = true
            }
            if let ravito = detected.ravito {
                extractedSummary.append("Fueling / Ravito: \(ravito)")
            }
        }

        if testRegex(#"\b(?:anti[\s\-]?creve|anti[\s\-]?crevaison|creves?|crevaisons?|crever|kit\s+meches|chambre\s+a\s+air|puncture|flat\s+tire)\b"#, in: norm) {
            detected.includePunctureKit = true
            let creveMinMatch =
                firstMatch(#"(?:marge|buffer)?\s*(?:anti[\s\-]?creve|anti[\s\-]?crevaison|en\s+cas\s+de\s+creve|creve|crevaison)\s*(?:de|of)?\s*(\d{1,2})\s*(?:min|minutes?|m\b)"#, in: norm) ??
                firstMatch(#"(\d{1,2})\s*(?:min|minutes?)\s*(?:de\s*)?(?:marge\s*)?(?:de\s*)?(?:anti[\s\-]?creve|anti[\s\-]?crevaison|en\s+cas\s+de\s+creve|creve|crevaison|puncture)"#, in: norm)

            if let creveMinMatch, let mins = creveMinMatch[1].flatMap(Int.init) {
                extraBufferMinutes += mins
                detected.puncturePrep = "+\(mins) min"
            } else if testRegex(#"\b(?:marge|en\s+cas\s+de|risque\s+de|buffer)\b.*?\b(?:creve|crevaison|puncture)\b"#, in: norm) {
                extraBufferMinutes += 10
                detected.puncturePrep = isFr ? "Marge +10m & kit" : "+10m & kit"
            } else {
                detected.puncturePrep = isFr ? "Kit anti-crève" : "Puncture kit"
            }
            if let puncturePrep = detected.puncturePrep {
                extractedSummary.append("Puncture Prep: \(puncturePrep)")
            }
        }

        let baseBufferMinutes: Int
        if let explicitBufferMatch, let raw = explicitBufferMatch[1] ?? explicitBufferMatch[2], let val = Int(raw) {
            baseBufferMinutes = val
        } else {
            baseBufferMinutes = 15
        }
        let totalBufferMinutes = baseBufferMinutes + extraBufferMinutes
        if extraBufferMinutes > 0 {
            let baseDelay = baseTrip?.route.urbanTrafficDelayMinutes ?? 8.0
            parsedValues.route.urbanTrafficDelayMinutes = baseDelay + Double(extraBufferMinutes)
        }

        // ── 8. TIME EXTRACTION ──
        let timeSearchText = replaceMatches(
            #"\b(?:(?:north|south|east|west|main|nord|sud|est|ouest)\s+)?(gate|porte|portillon|entrance)(?:\s+(\d+[a-z\-]?|[a-z]\b))?\b"#,
            in: norm,
            with: "gate_checkpoint"
        )

        let timeTokenPattern = #"(midi|minuit|noon|midnight|quarter\s*(?:past|to)\s*\d{1,2}|half\s*past\s*\d{1,2}|\d{1,2}(?:\s*:\s*\d{2}|\s*h(?:\s*(?:et\s*quart|et\s*demie?|moins\s*le\s*quart|\d{2}))?(?!\s*\/)|(?=\s*(?:am|pm)\b|\b)))(?!\d|\s*(?:[.,]\d|\/|km|kph|kmh|kilo|bornes|kg|g\b|w\b|watt|min|sec|%|°|deg|bar|ans\b|jours?\b|"# + monthNamesPattern + #"))\s*(am|pm)?"#

        let depPattern = #"\b(?:roll(?:ing)?\s*out|leav(?:e|ing)|depart(?:ing|ure)?|out\s*the\s*door|setting\s*off|take-?off|partir|je\s+pars|on\s+part|en\s+partant|decollage|mise\s+en\s+route)(?:\s+(?:de|from)\s+[a-zà-ÿ'’\- ]+?\s+)?\s*(?:imperativement\s+|prevu\s+|vers\s+|autour\s+de\s+|at\s+|around\s+|by\s+|d[e']s\s+|pour\s+|a\s+)?"# + timeTokenPattern
        let depMatch = firstMatch(depPattern, in: timeSearchText)

        let arrPattern = #"\b(?:check\s*-?\s*in|enregistrement|arriv(?:e|ing|al|ee|er)|etre\s+(?:arrive|la|sur\s+place)|reach(?:ing)?|rendez\s*-?\s*vous|rdv|reunion|hotel\s*by|bistro\s*by|reservation|meeting|appointment|at\s*gate_checkpoint)(?:\s+(?:prevu(?:e)?|imperative(?:ment)?|strictly))?(?:\s+(?:at|a|au|aux|en|in|to)\s+(?:gate_checkpoint|(?:(?:un|une|le|la|mon|notre|the)\s+|l')?(?!midi\b|minuit\b|noon\b|midnight\b)[a-z'’_\-]{2,24}))?\s*(?:is\s*(?:at|by)?|strictly\s*(?:at|by)?|by|at|around|before|for|vers|avant|pour|d[e']s|a)?\s*"# + timeTokenPattern
        let arrMatch = firstMatch(arrPattern, in: timeSearchText)

        let shiftAfterPattern = #"\b(?:prise\s+de\s+poste|embauche|debut\s+(?:du\s+)?(?:travail|poste|service)|shift|work|office|desk|bureau|boulot|taf)\s*(?:starts?|lock|badge\s*in)?\s*(?:strictly|by|at|is\s*(?:at|by)?|prevu(?:e)?\s*a|avant|pour|a)\s*"# + timeTokenPattern
        let shiftBeforePattern = timeTokenPattern + #"\s*(?:shift|work|prise\s+de\s+poste)"#
        let shiftMatch =
            firstMatch(shiftAfterPattern, in: timeSearchText) ??
            firstMatch(shiftBeforePattern, in: timeSearchText)

        var explicitDepTime: String? = depMatch.flatMap { parseTimeString($0[1], meridian: $0[2], norm: norm) }
        let explicitArrTime: String? = arrMatch.flatMap { parseTimeString($0[1], meridian: $0[2], norm: norm) }
        let explicitShiftTime: String? = shiftMatch.flatMap { parseTimeString($0[1], meridian: $0[2], norm: norm) }

        if explicitDepTime == nil {
            if norm.contains("quarter past seven") || norm.contains("7h et quart") || norm.contains("sept heures et quart") {
                explicitDepTime = "07:15"
            } else if norm.contains("quarter to eight") || norm.contains("8h moins le quart") || norm.contains("huit heures moins le quart") {
                explicitDepTime = "07:45"
            }
        }

        let rideDurationMinutes = JSCompat.jsRoundInt((distanceKm / targetSpeed) * 60.0) + totalBufferMinutes

        if let explicitDepTime {
            parsedValues.departureTime = explicitDepTime
            detected.rolloutTime = explicitDepTime
            extractedSummary.append("Rollout Time: \(explicitDepTime)")
        }

        if let explicitArrTime {
            parsedValues.office.targetGateArrivalTime = explicitArrTime
            detected.arrivalTarget = explicitArrTime
            extractedSummary.append("Target Arrival: \(explicitArrTime)")
        }

        if let explicitShiftTime {
            parsedValues.office.shiftStartTime = explicitShiftTime
            extractedSummary.append("Shift Start: \(explicitShiftTime)")
        }

        var effectiveArrTime = explicitArrTime
        if effectiveArrTime == nil, let explicitShiftTime {
            let parts = explicitShiftTime.split(separator: ":").compactMap { Int($0) }
            if parts.count == 2 {
                var gateTotal = parts[0] * 60 + parts[1] - 30
                if gateTotal < 0 { gateTotal += 24 * 60 }
                let formatted = String(format: "%02d:%02d", gateTotal / 60, gateTotal % 60)
                effectiveArrTime = formatted
                parsedValues.office.targetGateArrivalTime = formatted
                detected.arrivalTarget = formatted
                extractedSummary.append("Target Gate Arrival: \(formatted)")
            }
        }

        if let effectiveArrTime, explicitDepTime == nil {
            let parts = effectiveArrTime.split(separator: ":").compactMap { Int($0) }
            if parts.count == 2 {
                var depTotal = parts[0] * 60 + parts[1] - rideDurationMinutes
                while depTotal < 0 { depTotal += 24 * 60 }
                let calculatedDep = String(format: "%02d:%02d", (depTotal / 60) % 24, depTotal % 60)
                parsedValues.departureTime = calculatedDep
                detected.rolloutTime = calculatedDep
                extractedSummary.append("Est. Rollout: \(calculatedDep)")
            }
        }

        if let explicitDepTime, effectiveArrTime == nil {
            let parts = explicitDepTime.split(separator: ":").compactMap { Int($0) }
            if parts.count == 2 {
                var arrTotal = parts[0] * 60 + parts[1] + rideDurationMinutes
                while arrTotal >= 24 * 60 { arrTotal -= 24 * 60 }
                let calculatedArr = String(format: "%02d:%02d", arrTotal / 60, arrTotal % 60)
                parsedValues.office.targetGateArrivalTime = calculatedArr
                parsedValues.office.shiftStartTime = calculatedArr
                detected.arrivalTarget = calculatedArr
                extractedSummary.append("Est. Arrival: \(calculatedArr)")
            }
        }

        if let explicitArrTime, explicitShiftTime == nil {
            parsedValues.office.shiftStartTime = explicitArrTime
        }

        // ── 9. DATE EXTRACTION ──
        let monthFirstPattern = "\\b(\(monthNamesPattern))\\.?\\s+(\\d{1,2})(?:st|nd|rd|th|er|re|eme|e)?(?:,?\\s*(\\d{4}))?\\b"
        let dayFirstPattern = "\\b(\\d{1,2})(?:st|nd|rd|th|er|re|eme|e)?\\s*(?:of\\s*)?(\(monthNamesPattern))\\.?(?:,?\\s*(\\d{4}))?\\b"
        let monthFirstMatch = firstMatch(monthFirstPattern, in: norm)
        let dayFirstMatch = firstMatch(dayFirstPattern, in: norm)
        let isoDateMatch = firstMatch(#"\b(\d{4})-(\d{1,2})-(\d{1,2})\b"#, in: norm, caseInsensitive: false)
        let slashDateMatch =
            firstMatch(#"\b(\d{1,2})[\/\-](\d{1,2})(?:[\/\-](\d{4}))?\b"#, in: norm, caseInsensitive: false) ??
            firstMatch(#"\b(\d{1,2})\.(\d{1,2})\.(\d{4})\b"#, in: norm, caseInsensitive: false)

        var pYear = currentYear
        var pMonth: Int?
        var pDay: Int?

        if let m = monthFirstMatch, let monthKey = m[1]?.lowercased(), let dayStr = m[2], let day = Int(dayStr) {
            pMonth = monthMap[monthKey]
            pDay = day
            if let yearStr = m[3], let y = Int(yearStr) { pYear = y }
        } else if let m = dayFirstMatch, let dayStr = m[1], let day = Int(dayStr), let monthKey = m[2]?.lowercased() {
            pDay = day
            pMonth = monthMap[monthKey]
            if let yearStr = m[3], let y = Int(yearStr) { pYear = y }
        } else if let m = isoDateMatch,
                  let y = m[1].flatMap(Int.init),
                  let mo = m[2].flatMap(Int.init),
                  let d = m[3].flatMap(Int.init) {
            pYear = y
            pMonth = mo
            pDay = d
        } else if let m = slashDateMatch,
                  let d = m[1].flatMap(Int.init),
                  let mo = m[2].flatMap(Int.init) {
            pDay = d
            pMonth = mo
            if let y = m[3].flatMap(Int.init) { pYear = y }
        } else if norm.contains("apres-demain") || norm.contains("apres demain") || norm.contains("day after tomorrow") {
            let target = cal.date(byAdding: .day, value: 2, to: now) ?? now
            pYear = cal.component(.year, from: target)
            pMonth = cal.component(.month, from: target)
            pDay = cal.component(.day, from: target)
        } else if norm.contains("tomorrow") || norm.contains("demain") {
            let target = cal.date(byAdding: .day, value: 1, to: now) ?? now
            pYear = cal.component(.year, from: target)
            pMonth = cal.component(.month, from: target)
            pDay = cal.component(.day, from: target)
        } else if norm.contains("today") || norm.contains("aujourd") || norm.contains("ce matin") || norm.contains("ce soir") {
            pYear = cal.component(.year, from: now)
            pMonth = cal.component(.month, from: now)
            pDay = cal.component(.day, from: now)
        } else {
            let weekdayMap: [String: Int] = [
                "sunday": 0, "dimanche": 0,
                "monday": 1, "lundi": 1,
                "tuesday": 2, "mardi": 2,
                "wednesday": 3, "mercredi": 3,
                "thursday": 4, "jeudi": 4,
                "friday": 5, "vendredi": 5,
                "saturday": 6, "samedi": 6,
            ]
            if let wdMatch = firstMatch(#"\b(lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche|monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b"#, in: norm),
               let wdKey = wdMatch[1]?.lowercased(),
               let targetDow = weekdayMap[wdKey] {
                let currentDow = cal.component(.weekday, from: now) - 1 // Sunday = 0 .. Saturday = 6
                var delta = (targetDow - currentDow + 7) % 7
                if delta == 0 { delta = 7 }
                let target = cal.date(byAdding: .day, value: delta, to: now) ?? now
                pYear = cal.component(.year, from: target)
                pMonth = cal.component(.month, from: target)
                pDay = cal.component(.day, from: target)
            }
        }

        let monthShortFr = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."]
        let monthShortEn = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

        if let month = pMonth, let day = pDay, month >= 1 && month <= 12 && day >= 1 && day <= 31 {
            let formattedDate = String(format: "%04d-%02d-%02d", pYear, month, day)
            parsedValues.departureDate = formattedDate
            let dateDisplay = isFr
                ? String(format: "%02d %@ %04d", day, monthShortFr[month - 1], pYear)
                : String(format: "%@ %02d, %04d", monthShortEn[month - 1], day, pYear)
            detected.date = dateDisplay
            extractedSummary.append("Departure Date: \(dateDisplay)")
        }

        // ── 10. RIDE ARCHETYPE ──
        if testRegex(#"\b(?:bikepack(?:ing)?|bivouac|multi-?day|tent|tente|towpath|self-?supported|autonomie|itinerance)\b"#, in: norm) {
            parsedValues.tag = "BIKEPACKING"
            detected.tripMode = isFr ? "Bikepacking / Bivouac" : "Bikepacking / Adventure"
            extractedSummary.append("Trip Mode: Bikepacking")
        } else if testRegex(#"\b(?:sport|gran\s*fondo|cyclosportive|peloton|tempo|paceline|zone\s*[345]|training|intervals?|fractionne|foncier|race|fast\s*sunrise|grinder|entrainement|course)\b"#, in: norm) {
            parsedValues.tag = "SPORT"
            detected.tripMode = "Sport / Gran Fondo"
            extractedSummary.append("Trip Mode: Sport / Gran Fondo")
        } else if testRegex(#"\b(?:escapade|hotel|check\s*-?\s*in|enregistrement|touring|cyclotourisme|bistro|dinner|diner|leisure|vacation|vacances|getaway|week\s*-?\s*end|echappee|sejour|gite|auberge)\b"#, in: norm) {
            parsedValues.tag = "ESCAPADE"
            detected.tripMode = isFr ? "Escapade / Séjour" : "Escapade / Leisure Stay"
            if detected.gate == nil {
                parsedValues.office.gateName = isFr ? "Réception Hôtel" : "Hotel Reception"
            }
            extractedSummary.append("Trip Mode: Escapade")
        } else if testRegex(#"\b(?:commute|velotaf|taf|boulot|work|shift|office|desk|locker|vestiaire|badge|travail|bureau|prise\s+de\s+poste|embauche|domicile[\s\-]travail)\b"#, in: norm) {
            parsedValues.tag = "VÉLOTAF"
            detected.tripMode = isFr ? "Trajet Vélotaf" : "Commute Ride"
            extractedSummary.append("Trip Mode: Commute")
        }

        // ── 11. ORIGIN & DESTINATION ──
        let precomposedText = text.precomposedStringWithCanonicalMapping
        let stopLookahead =
            "(?=$|[,.;!?]|\\s+(?:" +
            "le\\s+(?:\\d|1er|premier|lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche|matin|soir)|" +
            "ce\\s+(?:matin|soir|week)|demain|aujourd|apr[eè]s-demain|apres-demain|tomorrow|today|" +
            "lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche|" +
            "on\\b|with\\b|without\\b|at\\b|by\\b|for\\b|around\\b|" +
            "check\\s*-?\\s*in|enregistrement|arriv[eéi]|rendez\\s*-?\\s*vous|rdv|partir|je\\s+pars|d[eé]part|leaving|rolling|setting|" +
            "prise\\s+de\\s+poste|embauche|pour\\s+un|pour\\s+une|" +
            "[àa]\\s*\\d|allure|vitesse|moyenne|rythme|pace|speed|cruising|target|" +
            "avec|sans|sous|vent|headwind|ravito|marge|en\\s+\\d|sur\\s+\\d|\\d+\\s*(?:km|kg|h\\b)" +
            "))"

        let origDestPattern =
            "\\b(?:from|leaving\\s+from|starting\\s+from|depuis|au\\s+d[eé]part\\s+de|partir\\s+de|en\\s+partant\\s+de|de)\\s+" +
            "([A-Za-zÀ-ÿ'’\\- ]{2,40}?)\\s+" +
            "(?:to|toward|towards|vers|jusqu'à|jusqu’à|jusqu'a|direction|(?:à|a)(?!\\s*(?:\\d{1,2}(?:\\s*h|\\s*:)|midi\\b|minuit\\b)))\\s+" +
            "([A-Za-zÀ-ÿ'’0-9\\- ]{2,55}?)\(stopLookahead)"

        let destOnlyVerbPattern =
            "\\b(?:rouler|aller|p[eé]daler|filer|sortie|balade|vir[eé]e|escapade|week-?end|v[eé]lotaf|velotaf|trajet|itin[eé]raire|parcours|randonn[eé]e|[eé]tape|rendez-?vous|rdv|ride|riding|cycling|commut(?:e|ing)|heading|going|trip|tour)" +
            "(?:\\s+[àa]\\s+v[eé]lo)?\\s+" +
            "(?:to|toward|towards|vers|jusqu'à|jusqu’à|jusqu'a|direction|sur|(?:à|a)(?!\\s*(?:\\d{1,2}(?:\\s*h|\\s*:)|midi\\b|minuit\\b)))\\s+" +
            "([A-Za-zÀ-ÿ'’0-9\\- ]{2,55}?)\(stopLookahead)"

        let destOnlyDirectPattern =
            "\\b(?:direction|cap\\s+sur|destination)\\s+([A-Za-zÀ-ÿ'’0-9\\- ]{2,45}?)\(stopLookahead)"

        let nonPlaceWordsPattern = #"^(?:vitesse|allure|moyenne|rythme|pause|marge|plus|moins|autour|environ|sac|sacoches?|bagages?|chargement|matos|[eé]quipement|velo|v[eé]lo|face|croisi[eè]re|pluie|\d|midi|minuit|pour\b)"#

        let rawOrigDestMatch = firstMatch(origDestPattern, in: precomposedText)
        let origDestMatch: [String?]?
        if let rawOrigDestMatch,
           let g1 = rawOrigDestMatch[1]?.trimmingCharacters(in: .whitespacesAndNewlines),
           !testRegex(nonPlaceWordsPattern, in: g1) {
            origDestMatch = rawOrigDestMatch
        } else {
            origDestMatch = nil
        }

        let destVerbMatch = origDestMatch == nil ? firstMatch(destOnlyVerbPattern, in: precomposedText) : nil
        let destDirectMatch = (origDestMatch == nil && destVerbMatch == nil) ? firstMatch(destOnlyDirectPattern, in: precomposedText) : nil

        if let origDestMatch, let rawOrig = origDestMatch[1], let rawDest = origDestMatch[2] {
            let orig = cleanPlacePhrase(rawOrig)
            let dest = cleanPlacePhrase(rawDest)
            let isGateOnly = testRegex(#"^(?:gate|porte|portillon)\s*\d*$"#, in: dest)
            if !orig.isEmpty && !dest.isEmpty && !isGateOnly {
                parsedValues.route.origin = orig
                parsedValues.route.destination = dest
                parsedValues.name = isFr ? "\(orig) → \(dest)" : "\(orig) → \(dest) Tour"
                detected.origin = orig
                detected.destination = dest
                extractedSummary.append("Route: \(orig) → \(dest)")
            }
        } else if let rawDest = (destVerbMatch?[1] ?? destDirectMatch?[1])?.trimmingCharacters(in: .whitespacesAndNewlines) {
            let dest = cleanPlacePhrase(rawDest)
            let isGateOnly = testRegex(#"^(?:gate|porte|portillon)\s*\d*$"#, in: dest)
            if !dest.isEmpty && !testRegex(nonPlaceWordsPattern, in: dest) && !isGateOnly {
                parsedValues.route.destination = dest
                if isFr {
                    parsedValues.name = parsedValues.tag == "ESCAPADE" ? "Escapade à \(dest)" : "Trajet vers \(dest)"
                } else {
                    parsedValues.name = "Ride to \(dest)"
                }
                detected.destination = dest
                extractedSummary.append("Destination: \(dest)")
            }
        }

        // ── 12. WEATHER / WIND / TEMPERATURE / RAIN ──
        if testRegex(#"\b(?:sans\s+vent|pas\s+de\s+vent|vent\s+calme|no\s+wind|calm\s+wind)\b"#, in: norm) {
            parsedValues.weather.isHeadwindActive = false
            parsedValues.weather.windDirection = "calm"
            parsedValues.weather.baseWindSpeedKmH = 2
            detected.headwind = isFr ? "Calme" : "Calm"
            extractedSummary.append("Wind: Calm")
        } else if norm.contains("headwind") ||
                  norm.contains("estuary wind") ||
                  norm.contains("vent de face") ||
                  norm.contains("vent contraire") ||
                  norm.contains("gusts") ||
                  norm.contains("rafales") {
            parsedValues.weather.isHeadwindActive = true
            parsedValues.weather.windDirection = "headwind"
            var windSpeed = 8.0
            let m1 = firstMatch(#"(\d+(?:[.,]\d+)?)\s*(?:km\s*\/\s*h|kmh|kph)?\s*(?:de\s+)?(?:headwind|wind|gusts|vent(?:\s+de\s+face|\s+contraire)?|rafales)"#, in: norm)
            let m2 = firstMatch(#"(?:headwind|wind|gusts|vent(?:\s+de\s+face|\s+contraire)?|rafales)\s*(?:of|de|d'|at|a|is|around)?\s*(\d+(?:[.,]\d+)?)\s*(?:km\s*\/\s*h|kmh|kph)?"#, in: norm)
            if let raw = m1?[1], let val = parseDecimal(raw) {
                windSpeed = val
            } else if let raw = m2?[1], let val = parseDecimal(raw) {
                windSpeed = val
            }
            parsedValues.weather.baseWindSpeedKmH = windSpeed
            let windStr = formatJsNumber(windSpeed)
            detected.headwind = "\(windStr) km/h"
            extractedSummary.append("Headwind: Active (\(windStr) km/h)")
        }

        if let tempMatch = firstMatch(#"(-?\d{1,2})\s*(?:°\s*c?|degres?\b)"#, in: norm),
           let raw = tempMatch[1],
           let tempVal = Int(raw),
           tempVal >= -15 && tempVal <= 45 {
            parsedValues.weather.temperatureC = Double(tempVal)
            extractedSummary.append("Temperature: \(tempVal)°C")
        }

        if testRegex(#"\b(?:pluie|averses?|orage|rain|wet)\b"#, in: norm) {
            let rainPctMatch =
                firstMatch(#"(\d{1,3})\s*%\s*(?:de\s*)?(?:pluie|rain)"#, in: norm) ??
                firstMatch(#"(?:pluie|rain)\s*(?:a\s*)?(\d{1,3})\s*%"#, in: norm)
            if let raw = rainPctMatch?[1], let val = Int(raw) {
                parsedValues.weather.precipitationRiskPercent = Double(min(100, val))
            } else {
                parsedValues.weather.precipitationRiskPercent = 65
            }
        }

        // ── 13. OFFICE RULES ──
        if norm.contains("no food") ||
           norm.contains("open space") ||
           norm.contains("desk policy") ||
           norm.contains("pas de nourriture") ||
           norm.contains("pas de bouffe") ||
           norm.contains("pas de repas") ||
           norm.contains("interdit de manger") {
            parsedValues.office.strictNoFoodInOpenSpace = true
            detected.strictFoodRule = true
            extractedSummary.append("Office guideline: Dedicated break-room refuel")
        }

        return ParseTripResult(
            parsedValues: parsedValues,
            detected: detected,
            extractedSummary: extractedSummary
        )
    }
}
