import Foundation

public struct ExtractedSharedPlanRef: Codable, Sendable, Equatable {
    public var kind: String // "short" | "token"
    public var code: String?
    public var token: String?

    public init(kind: String, code: String? = nil, token: String? = nil) {
        self.kind = kind
        self.code = code
        self.token = token
    }
}

public struct SenderBaseline: Codable, Sendable, Equatable {
    public var name: String
    public var riderWeightKg: Double
    public var bikeWeightKg: Double
    public var luggageWeightKg: Double
    public var cda: Double
    public var crr: Double
    public var ftpWatts: Double
    public var bikeName: String?
    public var bikeCategory: BikeCategory?

    public init(
        name: String,
        riderWeightKg: Double,
        bikeWeightKg: Double,
        luggageWeightKg: Double,
        cda: Double,
        crr: Double,
        ftpWatts: Double,
        bikeName: String? = nil,
        bikeCategory: BikeCategory? = nil
    ) {
        self.name = name
        self.riderWeightKg = riderWeightKg
        self.bikeWeightKg = bikeWeightKg
        self.luggageWeightKg = luggageWeightKg
        self.cda = cda
        self.crr = crr
        self.ftpWatts = ftpWatts
        self.bikeName = bikeName
        self.bikeCategory = bikeCategory
    }
}

public struct SharedPlanMeta: Codable, Sendable, Equatable {
    public var version: Int
    public var leaveBy: String
    public var arrival: String
    public var goStatus: String // "GO" | "CAUTION" | "NO-GO"
    public var bikeName: String?
    public var pinnedCount: Int
    public var stageCount: Int
    public var sharedGroupSpeedKmH: Double
    public var senderBaseline: SenderBaseline?

    public init(
        version: Int,
        leaveBy: String,
        arrival: String,
        goStatus: String,
        bikeName: String? = nil,
        pinnedCount: Int,
        stageCount: Int,
        sharedGroupSpeedKmH: Double,
        senderBaseline: SenderBaseline? = nil
    ) {
        self.version = version
        self.leaveBy = leaveBy
        self.arrival = arrival
        self.goStatus = goStatus
        self.bikeName = bikeName
        self.pinnedCount = pinnedCount
        self.stageCount = stageCount
        self.sharedGroupSpeedKmH = sharedGroupSpeedKmH
        self.senderBaseline = senderBaseline
    }
}

public struct PlanShareExtras: Sendable {
    public var leaveByHHMM: String
    public var arrivalHHMM: String
    public var goStatus: String // "GO" | "CAUTION" | "NO-GO"
    public var bikeName: String?
    public var senderBaseline: SenderBaseline?

    public init(
        leaveByHHMM: String = "08:00",
        arrivalHHMM: String = "10:30",
        goStatus: String = "GO",
        bikeName: String? = nil,
        senderBaseline: SenderBaseline? = nil
    ) {
        self.leaveByHHMM = leaveByHHMM
        self.arrivalHHMM = arrivalHHMM
        self.goStatus = goStatus
        self.bikeName = bikeName
        self.senderBaseline = senderBaseline
    }
}

public struct SharedPlanDecodeResult: Codable, Sendable, Equatable {
    public var trip: TripProfile
    public var sharedMeta: SharedPlanMeta

    public init(trip: TripProfile, sharedMeta: SharedPlanMeta) {
        self.trip = trip
        self.sharedMeta = sharedMeta
    }
}

public struct PlanShareSummaryMeta: Codable, Sendable, Equatable {
    public var title: String
    public var summary: String
    public var distanceKm: Double
    public var elevationM: Int
    public var stageCount: Int

    public init(title: String, summary: String, distanceKm: Double, elevationM: Int, stageCount: Int) {
        self.title = title
        self.summary = summary
        self.distanceKm = distanceKm
        self.elevationM = elevationM
        self.stageCount = stageCount
    }
}

public struct PersonalLensOptions: Sendable {
    public var luggageWeightKg: Double?
    public var lang: CadenceLang
    public var now: Date

    public init(luggageWeightKg: Double? = nil, lang: CadenceLang = .en, now: Date = Date()) {
        self.luggageWeightKg = luggageWeightKg
        self.lang = lang
        self.now = now
    }
}

public struct GroupSyncRiderMetrics: Codable, Sendable, Equatable {
    public var label: String
    public var avgWatts: Int
    public var ftpWatts: Int
    public var ftpPercent: Int
    public var zone: String
    public var kcal: Int
    public var movingTimeFormatted: String
    public var arrivalHHMM: String

    public init(
        label: String,
        avgWatts: Int,
        ftpWatts: Int,
        ftpPercent: Int,
        zone: String,
        kcal: Int,
        movingTimeFormatted: String,
        arrivalHHMM: String
    ) {
        self.label = label
        self.avgWatts = avgWatts
        self.ftpWatts = ftpWatts
        self.ftpPercent = ftpPercent
        self.zone = zone
        self.kcal = kcal
        self.movingTimeFormatted = movingTimeFormatted
        self.arrivalHHMM = arrivalHHMM
    }
}

public struct GroupSyncCheckResult: Codable, Sendable, Equatable {
    public var groupSpeedKmH: Double
    public var sender: GroupSyncRiderMetrics
    public var receiver: GroupSyncRiderMetrics
    public var effortGapPct: Int
    public var harderRider: String // "sender" | "receiver" | "balanced"
    public var isBalanced: Bool
    public var recommendedGroupSpeedKmH: Double?
    public var recommendedArrivalHHMM: String?
    public var recommendedDurationDeltaMin: Int
    public var takeaway: String

    public init(
        groupSpeedKmH: Double,
        sender: GroupSyncRiderMetrics,
        receiver: GroupSyncRiderMetrics,
        effortGapPct: Int,
        harderRider: String,
        isBalanced: Bool,
        recommendedGroupSpeedKmH: Double? = nil,
        recommendedArrivalHHMM: String? = nil,
        recommendedDurationDeltaMin: Int,
        takeaway: String
    ) {
        self.groupSpeedKmH = groupSpeedKmH
        self.sender = sender
        self.receiver = receiver
        self.effortGapPct = effortGapPct
        self.harderRider = harderRider
        self.isBalanced = isBalanced
        self.recommendedGroupSpeedKmH = recommendedGroupSpeedKmH
        self.recommendedArrivalHHMM = recommendedArrivalHHMM
        self.recommendedDurationDeltaMin = recommendedDurationDeltaMin
        self.takeaway = takeaway
    }
}

public enum PlanShareCodec {
    private static let nantesAtlantisCoords: [LatLon] = [
        LatLon(lat: 47.2174, lon: -1.5419), LatLon(lat: 47.21732, lon: -1.54232), LatLon(lat: 47.2176, lon: -1.54244),
        LatLon(lat: 47.21731, lon: -1.54392), LatLon(lat: 47.21701, lon: -1.5448), LatLon(lat: 47.21661, lon: -1.54543),
        LatLon(lat: 47.21624, lon: -1.54554), LatLon(lat: 47.21433, lon: -1.54952), LatLon(lat: 47.21328, lon: -1.55206),
        LatLon(lat: 47.21336, lon: -1.55246), LatLon(lat: 47.21315, lon: -1.55271), LatLon(lat: 47.21285, lon: -1.55361),
        LatLon(lat: 47.21298, lon: -1.55418), LatLon(lat: 47.21426, lon: -1.55542), LatLon(lat: 47.21502, lon: -1.5561),
        LatLon(lat: 47.21598, lon: -1.55649), LatLon(lat: 47.21605, lon: -1.557), LatLon(lat: 47.21479, lon: -1.56517),
        LatLon(lat: 47.21442, lon: -1.56555), LatLon(lat: 47.2146, lon: -1.56628), LatLon(lat: 47.21459, lon: -1.56727),
        LatLon(lat: 47.21431, lon: -1.57065), LatLon(lat: 47.21451, lon: -1.57281), LatLon(lat: 47.21513, lon: -1.57228),
        LatLon(lat: 47.21598, lon: -1.5732), LatLon(lat: 47.21574, lon: -1.57349), LatLon(lat: 47.21572, lon: -1.57367),
        LatLon(lat: 47.2161, lon: -1.57419), LatLon(lat: 47.21629, lon: -1.57429), LatLon(lat: 47.2166, lon: -1.57425),
        LatLon(lat: 47.21675, lon: -1.57411), LatLon(lat: 47.21706, lon: -1.57355), LatLon(lat: 47.21792, lon: -1.57354),
        LatLon(lat: 47.21895, lon: -1.57494), LatLon(lat: 47.21925, lon: -1.57604), LatLon(lat: 47.21951, lon: -1.57626),
        LatLon(lat: 47.21988, lon: -1.57717), LatLon(lat: 47.22029, lon: -1.57751), LatLon(lat: 47.22063, lon: -1.57799),
        LatLon(lat: 47.22147, lon: -1.57857), LatLon(lat: 47.22189, lon: -1.57899), LatLon(lat: 47.22197, lon: -1.57884),
        LatLon(lat: 47.22253, lon: -1.5807), LatLon(lat: 47.22255, lon: -1.58214), LatLon(lat: 47.22226, lon: -1.58478),
        LatLon(lat: 47.22257, lon: -1.5858), LatLon(lat: 47.22402, lon: -1.58856), LatLon(lat: 47.22415, lon: -1.58863),
        LatLon(lat: 47.22442, lon: -1.58852), LatLon(lat: 47.22454, lon: -1.58866), LatLon(lat: 47.22553, lon: -1.59074),
        LatLon(lat: 47.22611, lon: -1.59052), LatLon(lat: 47.2266, lon: -1.59067), LatLon(lat: 47.22685, lon: -1.59135),
        LatLon(lat: 47.22689, lon: -1.59187), LatLon(lat: 47.22651, lon: -1.59435), LatLon(lat: 47.22656, lon: -1.5945),
        LatLon(lat: 47.22687, lon: -1.59474), LatLon(lat: 47.22701, lon: -1.59529), LatLon(lat: 47.2274, lon: -1.59549),
        LatLon(lat: 47.22847, lon: -1.59547), LatLon(lat: 47.22857, lon: -1.59562), LatLon(lat: 47.22842, lon: -1.59621),
        LatLon(lat: 47.22854, lon: -1.59644), LatLon(lat: 47.22895, lon: -1.59688), LatLon(lat: 47.22935, lon: -1.59711),
        LatLon(lat: 47.22915, lon: -1.59751), LatLon(lat: 47.22968, lon: -1.59874), LatLon(lat: 47.22983, lon: -1.59946),
        LatLon(lat: 47.22985, lon: -1.60016), LatLon(lat: 47.22966, lon: -1.60102), LatLon(lat: 47.22985, lon: -1.60326),
        LatLon(lat: 47.22913, lon: -1.60482), LatLon(lat: 47.22908, lon: -1.60476), LatLon(lat: 47.22852, lon: -1.60544),
        LatLon(lat: 47.22927, lon: -1.60802), LatLon(lat: 47.22943, lon: -1.60814), LatLon(lat: 47.22941, lon: -1.60834),
        LatLon(lat: 47.23083, lon: -1.61147), LatLon(lat: 47.23056, lon: -1.61545), LatLon(lat: 47.23028, lon: -1.61649),
        LatLon(lat: 47.23031, lon: -1.6169), LatLon(lat: 47.23044, lon: -1.61698), LatLon(lat: 47.23036, lon: -1.61726),
        LatLon(lat: 47.23016, lon: -1.61714), LatLon(lat: 47.23005, lon: -1.61732), LatLon(lat: 47.2305, lon: -1.61823),
        LatLon(lat: 47.23007, lon: -1.61873), LatLon(lat: 47.22982, lon: -1.61931), LatLon(lat: 47.22974, lon: -1.62054),
        LatLon(lat: 47.22885, lon: -1.62076), LatLon(lat: 47.2285, lon: -1.62119), LatLon(lat: 47.22757, lon: -1.62125),
        LatLon(lat: 47.22749, lon: -1.62144), LatLon(lat: 47.22755, lon: -1.62247), LatLon(lat: 47.22743, lon: -1.62251),
        LatLon(lat: 47.22684, lon: -1.62336), LatLon(lat: 47.22605, lon: -1.62478), LatLon(lat: 47.226, lon: -1.62503),
        LatLon(lat: 47.22654, lon: -1.62821), LatLon(lat: 47.22679, lon: -1.62842), LatLon(lat: 47.22555, lon: -1.62898),
        LatLon(lat: 47.22574, lon: -1.62981), LatLon(lat: 47.22381, lon: -1.63063), LatLon(lat: 47.22379, lon: -1.6305),
    ]

    private static func isoTimestamp(_ date: Date) -> String {
        let isoFmt = ISO8601DateFormatter()
        isoFmt.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        return isoFmt.string(from: date)
    }

    public static func buildDefaultNewTripTemplate(
        lang: CadenceLang = .en,
        now: Date = Date(),
        timeZone: TimeZone = TimeZone(identifier: "Europe/Paris") ?? .current
    ) -> TripProfile {
        let weather = WeatherCondition(
            source: "planned",
            airDensityRho: 1.236,
            isHeadwindActive: true,
            baseWindSpeedKmH: 9,
            windDirection: "headwind",
            windDirectionDegrees: 265,
            temperatureC: 11,
            precipitationRiskPercent: 15,
            estuaryGustKmH: 16,
            visibilityKm: 14,
            isDay: true,
            sunrise: "07:35",
            sunset: "18:05"
        )
        let bpChips = ["coffee-stop", "shower-locker", "cargo-laptop-pack", "bike-lane-priority"]
        let rawChecklist = RideReadinessEngine.generateTripChecklist(
            tag: "VÉLOTAF",
            distanceKm: 9.4,
            weather: weather,
            options: ChecklistGenerationOptions(lang: lang, customChips: bpChips)
        )
        let preCheckedCount = max(1, min(rawChecklist.count - 1, JSCompat.jsRoundInt(Double(rawChecklist.count) * 0.82)))
        let checklist = rawChecklist.enumerated().map { idx, item -> ChecklistItem in
            var copy = item
            copy.checked = idx < preCheckedCount
            return copy
        }

        let fmtDate = DateFormatter()
        fmtDate.calendar = Calendar(identifier: .gregorian)
        fmtDate.timeZone = timeZone
        fmtDate.dateFormat = "yyyy-MM-dd"
        let todayIso = fmtDate.string(from: now)
        let nowIso = isoTimestamp(now)

        let isFr = lang == .fr
        return TripProfile(
            departureDate: todayIso,
            departureTime: "07:38",
            id: "commute-nantes-atlantis",
            name: isFr ? "Vélotaf Quais de Loire (Campus Atlantis)" : "Loire Quay Morning Commute (Atlantis)",
            tag: "VÉLOTAF",
            description: isFr
                ? "Trajet vélotaf sécurisé de 9,4 km depuis la Gare de Nantes vers Saint-Herblain Atlantis avec pause expresso, sacoche ordinateur étanche et pause douche à 08:30."
                : "9.4 km segregated riverside commute from Gare de Nantes to Saint-Herblain Atlantis with espresso stop, waterproof laptop pannier, and 08:30 arrival shower break.",
            createdAt: nowIso,
            updatedAt: nowIso,
            physics: PhysicsParams(
                riderWeightKg: 74,
                bikeWeightKg: 9.6,
                gearWeightKg: 4.5,
                cda: 0.39,
                crr: 0.0058,
                rho: 1.225,
                drivetrainEfficiency: 0.95,
                grossMechanicalEfficiency: 0.21,
                gradientPercent: 0.4
            ),
            route: RouteParams(
                elevationGainM: 116,
                origin: "Gare de Nantes",
                destination: "Saint-Herblain Atlantis",
                distanceKm: 9.4,
                targetSpeedKmH: 24.5,
                pacingMode: nil,
                urbanTrafficDelayMinutes: 7,
                gateSecurityDelayMinutes: 4,
                coordinates: nantesAtlantisCoords
            ),
            office: OfficeConstraints(
                shiftStartTime: "09:00",
                targetGateArrivalTime: "08:30",
                gateName: isFr ? "Campus Atlantis" : "Atlantis Campus",
                lockerRefuelMinutes: 10,
                showerChangeMinutes: 12,
                breakRoomBreakfastMinutes: 15,
                strictNoFoodInOpenSpace: true,
                badgeRequiredForGate: true,
                notes: "Loire quay segregated cycleway into Atlantis tech campus. Arrival snack at 08:30 before 09:00 standup."
            ),
            weather: weather,
            checklist: checklist,
            customChips: ["coffee-stop", "rush-hour-buffer"],
            ruleSettings: LogisticsSettings(
                coffeeDurationMin: 15,
                cafeName: "Café de la Gare / Estuary Roaster",
                rationType: "Double espresso & almond pastry"
            ),
            arriveAtMode: true
        )
    }

    public static func downsampleCoordinates(_ coords: [LatLon], maxPoints: Int = 96) -> [LatLon] {
        if coords.count <= maxPoints { return coords }
        var result: [LatLon] = []
        let step = Double(coords.count - 1) / Double(maxPoints - 1)
        for i in 0..<(maxPoints - 1) {
            result.append(coords[JSCompat.jsRoundInt(Double(i) * step)])
        }
        result.append(coords[coords.count - 1])
        return result
    }

    private static func encodeSigned(_ num: Int) -> String {
        var sgnNum = num < 0 ? ~(num << 1) : (num << 1)
        var out = ""
        while sgnNum >= 0x20 {
            out.unicodeScalars.append(UnicodeScalar((0x20 | (sgnNum & 0x1f)) + 63)!)
            sgnNum >>= 5
        }
        out.unicodeScalars.append(UnicodeScalar(sgnNum + 63)!)
        return out
    }

    public static func encodePolyline(_ coords: [LatLon]) -> String {
        var prevLat = 0
        var prevLon = 0
        var out = ""
        for pt in coords {
            let eLat = JSCompat.jsRoundInt(pt.lat * 1e5)
            let eLon = JSCompat.jsRoundInt(pt.lon * 1e5)
            out += encodeSigned(eLat - prevLat)
            out += encodeSigned(eLon - prevLon)
            prevLat = eLat
            prevLon = eLon
        }
        return out
    }

    public static func decodePolyline(_ encoded: String) -> [LatLon] {
        if encoded.isEmpty { return [] }
        let chars = Array(encoded.unicodeScalars.map { Int($0.value) })
        var coords: [LatLon] = []
        var index = 0
        var lat = 0
        var lon = 0
        while index < chars.count {
            var shift = 0
            var result = 0
            var byte = 0
            repeat {
                if index >= chars.count { return coords }
                byte = chars[index] - 63
                index += 1
                result |= (byte & 0x1f) << shift
                shift += 5
            } while byte >= 0x20
            lat += (result & 1) != 0 ? ~(result >> 1) : (result >> 1)

            shift = 0
            result = 0
            repeat {
                if index >= chars.count { return coords }
                byte = chars[index] - 63
                index += 1
                result |= (byte & 0x1f) << shift
                shift += 5
            } while byte >= 0x20
            lon += (result & 1) != 0 ? ~(result >> 1) : (result >> 1)

            coords.append(LatLon(
                lat: JSCompat.jsToFixedNumber(Double(lat) / 1e5, decimals: 5),
                lon: JSCompat.jsToFixedNumber(Double(lon) / 1e5, decimals: 5)
            ))
        }
        return coords
    }

    public static func hashTokenShort(_ token: String) -> String {
        var h: UInt32 = 2166136261
        for scalar in token.utf16 {
            h ^= UInt32(scalar)
            h = h &* 16777619
        }
        return String(h, radix: 36)
    }

    private static func utf8ToBase64Url(_ str: String) -> String {
        Data(str.utf8).base64EncodedString()
            .replacingOccurrences(of: "+", with: "-")
            .replacingOccurrences(of: "/", with: "_")
            .replacingOccurrences(of: "=", with: "")
    }

    private static func base64UrlToUtf8(_ token: String) -> String? {
        var std = token
            .replacingOccurrences(of: "-", with: "+")
            .replacingOccurrences(of: "_", with: "/")
        let rem = std.count % 4
        if rem > 0 {
            std += String(repeating: "=", count: 4 - rem)
        }
        guard let data = Data(base64Encoded: std) else { return nil }
        return String(data: data, encoding: .utf8)
    }

    private static func jsonString(_ value: Any) -> String {
        if let dict = value as? [(String, Any)] {
            let parts = dict.map { k, v in "\(jsonString(k)):\(jsonString(v))" }
            return "{\(parts.joined(separator: ","))}"
        }
        if let arr = value as? [Any] {
            return "[\(arr.map { jsonString($0) }.joined(separator: ","))]"
        }
        if let s = value as? String {
            let data = try! JSONSerialization.data(withJSONObject: [s], options: [.withoutEscapingSlashes])
            let str = String(data: data, encoding: .utf8)!
            return String(str.dropFirst().dropLast())
        }
        if let b = value as? Bool {
            return b ? "true" : "false"
        }
        if let i = value as? Int {
            return String(i)
        }
        if let d = value as? Double {
            if !d.isFinite { return "null" }
            if d.truncatingRemainder(dividingBy: 1) == 0 && abs(d) < 1e15 {
                return String(Int64(d))
            }
            return String(d)
        }
        if value is NSNull {
            return "null"
        }
        return "null"
    }

    private static func serializeAmenities(_ amenities: [StageAmenity]?) -> [Any] {
        (amenities ?? []).prefix(12).map { a -> [Any] in
            var entry: [Any] = [
                String(a.name.prefix(60)),
                a.category.rawValue,
                JSCompat.jsToFixedNumber(a.routeKm, decimals: 1),
                JSCompat.jsToFixedNumber(a.lat, decimals: 5),
                JSCompat.jsToFixedNumber(a.lon, decimals: 5),
            ]
            if let oh = a.openingHours, !oh.isEmpty {
                entry.append(String(oh.prefix(48)))
                entry.append(JSCompat.jsRoundInt(a.detourMeters))
            } else {
                entry.append(NSNull())
                entry.append(JSCompat.jsRoundInt(a.detourMeters))
            }
            return entry
        }
    }

    private static func deserializeAmenities(_ rows: [[Any]]?, prefix: String) -> [StageAmenity] {
        let validCats = Set(AmenityCategory.allCases.map(\.rawValue))
        return (rows ?? []).enumerated().map { idx, row in
            let name = (row.count > 0 ? row[0] as? String : nil) ?? "Pinned Stop"
            let catRaw = (row.count > 1 ? row[1] as? String : nil) ?? "water"
            let cat = validCats.contains(catRaw) ? (AmenityCategory(rawValue: catRaw) ?? .water) : .water
            let routeKm = (row.count > 2 ? (row[2] as? Double ?? (row[2] as? Int).map(Double.init)) : nil) ?? 0
            let lat = (row.count > 3 ? (row[3] as? Double ?? (row[3] as? Int).map(Double.init)) : nil) ?? 0
            let lon = (row.count > 4 ? (row[4] as? Double ?? (row[4] as? Int).map(Double.init)) : nil) ?? 0
            let openingHours = (row.count > 5 ? row[5] as? String : nil).flatMap { $0.isEmpty ? nil : $0 }
            let detourMeters = (row.count > 6 ? (row[6] as? Double ?? (row[6] as? Int).map(Double.init)) : nil) ?? 0
            return StageAmenity(
                id: "\(prefix)-\(idx)-\(JSCompat.jsFixed(lat, decimals: 4))-\(JSCompat.jsFixed(lon, decimals: 4))",
                category: cat,
                subType: cat.rawValue,
                name: name.isEmpty ? "Pinned Stop" : name,
                lat: lat,
                lon: lon,
                routeKm: routeKm,
                detourMeters: detourMeters,
                openingHours: openingHours,
                isPinned: true
            )
        }
    }

    public static func buildPlanShareSummaryMeta(
        _ trip: TripProfile,
        extras: PlanShareExtras = PlanShareExtras()
    ) -> PlanShareSummaryMeta {
        let stages = trip.stages ?? []
        let hasMultiStage = stages.count > 1
        let stageCount = hasMultiStage ? stages.count : 1

        let totalDistanceKm = hasMultiStage
            ? stages.reduce(0.0) { $0 + $1.route.distanceKm }
            : trip.route.distanceKm
        let totalElevationM = hasMultiStage
            ? stages.reduce(0.0) { $0 + ($1.route.elevationGainM ?? 0) }
            : (trip.route.elevationGainM ?? 0)

        let distanceKm = JSCompat.jsToFixedNumber(max(0.0, totalDistanceKm), decimals: 1)
        let elevationM = max(0, JSCompat.jsRoundInt(totalElevationM))
        let kmLabel: String
        if distanceKm >= 100 {
            kmLabel = "\(JSCompat.jsRoundInt(distanceKm))"
        } else if distanceKm.truncatingRemainder(dividingBy: 1) == 0 {
            kmLabel = "\(Int(distanceKm))"
        } else {
            kmLabel = "\(distanceKm)"
        }
        let trimmedName = trip.name.trimmingCharacters(in: .whitespacesAndNewlines)
        let title = trimmedName.isEmpty ? "Cadence Ride Plan" : String(trimmedName.prefix(120))

        var parts: [String] = []
        if stageCount > 1 {
            parts.append("\(stageCount)-day tour")
        }
        if distanceKm > 0 {
            parts.append("\(kmLabel) km")
        }
        if elevationM > 0 {
            parts.append("+\(elevationM) m")
        }
        if stageCount == 1 && !extras.leaveByHHMM.isEmpty {
            parts.append(
                !extras.arrivalHHMM.isEmpty
                    ? "\(extras.leaveByHHMM) → \(extras.arrivalHHMM)"
                    : "Start \(extras.leaveByHHMM)"
            )
        }
        let pinnedCount = hasMultiStage
            ? stages.reduce(0) { $0 + ($1.pinnedAmenities?.count ?? 0) }
            : (trip.pinnedAmenities?.count ?? 0)
        if pinnedCount > 0 {
            parts.append("\(pinnedCount) stop\(pinnedCount == 1 ? "" : "s")")
        }

        let joined = parts.joined(separator: " · ")
        let summary = String((joined.isEmpty ? "Shared cycling plan on Cadence" : joined).prefix(240))

        return PlanShareSummaryMeta(
            title: title,
            summary: summary,
            distanceKm: distanceKm,
            elevationM: elevationM,
            stageCount: stageCount
        )
    }

    public static func buildShortPlanShareUrl(_ code: String, baseUrl: String = "https://cadence.app") -> String {
        let cleanCode = code.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
        let origin = baseUrl.replacingOccurrences(of: "/+$", with: "", options: .regularExpression)
        return "\(origin)/p/\(cleanCode)"
    }

    public static func extractSharedPlanFromLocation(
        pathname: String = "",
        search: String = "",
        hash: String = ""
    ) -> ExtractedSharedPlanRef? {
        let pTrim = pathname.trimmingCharacters(in: .whitespacesAndNewlines)
        if let range = pTrim.range(of: "^/p/([a-z0-9]{6,16})/?$", options: [.regularExpression, .caseInsensitive]) {
            let matched = String(pTrim[range])
            let code = matched
                .replacingOccurrences(of: "^/p/", with: "", options: [.regularExpression, .caseInsensitive])
                .replacingOccurrences(of: "/$", with: "", options: .regularExpression)
                .lowercased()
            return ExtractedSharedPlanRef(kind: "short", code: code)
        }

        func queryParam(_ rawQuery: String, name: String) -> String? {
            let clean = rawQuery.hasPrefix("?") || rawQuery.hasPrefix("#") ? String(rawQuery.dropFirst()) : rawQuery
            guard !clean.isEmpty,
                  let comps = URLComponents(string: "https://x.test/?\(clean)") else { return nil }
            return comps.queryItems?.first(where: { $0.name == name })?.value
        }

        let shortParam = (queryParam(search, name: "p") ?? queryParam(hash, name: "p") ?? "")
            .trimmingCharacters(in: .whitespacesAndNewlines)
        if !shortParam.isEmpty,
           shortParam.range(of: "^[a-z0-9]{6,16}$", options: [.regularExpression, .caseInsensitive]) != nil {
            return ExtractedSharedPlanRef(kind: "short", code: shortParam.lowercased())
        }

        let planToken = (queryParam(search, name: "plan") ?? queryParam(hash, name: "plan") ?? "")
            .trimmingCharacters(in: .whitespacesAndNewlines)
        if !planToken.isEmpty {
            return ExtractedSharedPlanRef(kind: "token", token: planToken)
        }

        return nil
    }

    public static func encodePlanShareToken(
        _ trip: TripProfile,
        extras: PlanShareExtras = PlanShareExtras()
    ) -> String {
        let stages = trip.stages ?? []
        let hasMultiStage = stages.count > 1
        let stageCount = hasMultiStage ? stages.count : 1
        let maxStagePoints = max(24, min(72, 210 / stageCount))

        let coords = trip.route.coordinates ?? []
        let sampled = downsampleCoordinates(coords, maxPoints: hasMultiStage ? maxStagePoints : 90)
        let pl = sampled.count >= 2 ? encodePolyline(sampled) : nil
        let pinned = serializeAmenities(trip.pinnedAmenities)

        var stagesPayload: [[(String, Any)]]?
        if hasMultiStage {
            stagesPayload = stages.map { stage in
                let sCoords = stage.route.coordinates ?? []
                let sSampled = downsampleCoordinates(sCoords, maxPoints: maxStagePoints)
                let sPl = sSampled.count >= 2 ? encodePolyline(sSampled) : nil
                let sPinned = serializeAmenities(stage.pinnedAmenities)
                var stPairs: [(String, Any)] = [
                    ("o", String((stage.route.origin ?? "").prefix(60))),
                    ("x", String((stage.route.destination ?? "").prefix(60))),
                    ("km", JSCompat.jsToFixedNumber(stage.route.distanceKm > 0 ? stage.route.distanceKm : 30.0, decimals: 1)),
                    ("el", JSCompat.jsRoundInt(stage.route.elevationGainM ?? 0)),
                ]
                if !stage.departureDate.isEmpty { stPairs.append(("dd", stage.departureDate)) }
                if !stage.departureTime.isEmpty { stPairs.append(("dt", stage.departureTime)) }
                if let sPl = sPl { stPairs.append(("pl", sPl)) }
                if let nt = stage.accommodationNote, !nt.isEmpty { stPairs.append(("nt", String(nt.prefix(80)))) }
                if !sPinned.isEmpty { stPairs.append(("st", sPinned)) }
                return stPairs
            }
        }

        let luggageKg = JSCompat.jsToFixedNumber(trip.physics.luggageWeightKg ?? trip.physics.gearWeightKg, decimals: 1)

        var payload: [(String, Any)] = [
            ("v", 2),
            ("n", String((trip.name.isEmpty ? "Cadence Ride" : trip.name).prefix(90))),
            ("tag", trip.tag),
            ("o", String((trip.route.origin ?? "").prefix(60))),
            ("x", String((trip.route.destination ?? "").prefix(60))),
            ("km", JSCompat.jsToFixedNumber(trip.route.distanceKm > 0 ? trip.route.distanceKm : 30.0, decimals: 1)),
            ("el", JSCompat.jsRoundInt(trip.route.elevationGainM ?? 0)),
            ("sp", JSCompat.jsToFixedNumber(trip.route.targetSpeedKmH > 0 ? trip.route.targetSpeedKmH : 24.0, decimals: 1)),
        ]
        if let dd = trip.departureDate { payload.append(("dd", dd)) }
        if let dt = trip.departureTime { payload.append(("dt", dt)) }
        payload.append(("lb", extras.leaveByHHMM))
        payload.append(("ar", extras.arrivalHHMM))
        if let am = trip.arriveAtMode { payload.append(("am", am)) }
        payload.append(("go", extras.goStatus))
        if let bk = extras.bikeName { payload.append(("bk", String(bk.prefix(50)))) }
        if let pl = pl { payload.append(("pl", pl)) }

        var wPairs: [(String, Any)] = [
            ("t", JSCompat.jsRoundInt(trip.weather.temperatureC)),
            ("wd", JSCompat.jsRoundInt(trip.weather.windDirectionDegrees)),
            ("ws", JSCompat.jsRoundInt(trip.weather.baseWindSpeedKmH)),
            ("pr", JSCompat.jsRoundInt(trip.weather.precipitationRiskPercent)),
        ]
        if let wc = trip.weather.weatherCode { wPairs.append(("wc", wc)) }
        payload.append(("w", wPairs))

        let phPairs: [(String, Any)] = [
            ("rw", JSCompat.jsToFixedNumber(trip.physics.riderWeightKg, decimals: 1)),
            ("bw", JSCompat.jsToFixedNumber(trip.physics.bikeWeightKg, decimals: 1)),
            ("lw", luggageKg),
            ("cda", JSCompat.jsToFixedNumber(trip.physics.cda, decimals: 3)),
            ("crr", JSCompat.jsToFixedNumber(trip.physics.crr, decimals: 4)),
        ]
        payload.append(("ph", phPairs))

        if let sb = extras.senderBaseline {
            var snPairs: [(String, Any)] = [
                ("n", String((sb.name.isEmpty ? "Partner" : sb.name).prefix(32))),
                ("rw", JSCompat.jsToFixedNumber(sb.riderWeightKg, decimals: 1)),
                ("bw", JSCompat.jsToFixedNumber(sb.bikeWeightKg, decimals: 1)),
                ("lw", JSCompat.jsToFixedNumber(sb.luggageWeightKg, decimals: 1)),
                ("cda", JSCompat.jsToFixedNumber(sb.cda, decimals: 3)),
                ("crr", JSCompat.jsToFixedNumber(sb.crr, decimals: 4)),
                ("ftp", JSCompat.jsRoundInt(sb.ftpWatts)),
            ]
            if let bk = sb.bikeName { snPairs.append(("bk", String(bk.prefix(40)))) }
            if let bc = sb.bikeCategory { snPairs.append(("bc", bc.rawValue)) }
            payload.append(("sn", snPairs))
        }

        if let sg = stagesPayload {
            payload.append(("sg", sg as [Any]))
        }
        if !pinned.isEmpty {
            payload.append(("st", pinned))
        }

        return utf8ToBase64Url(jsonString(payload))
    }

    public static func buildPlanShareUrl(
        _ trip: TripProfile,
        extras: PlanShareExtras = PlanShareExtras(),
        baseUrl: String = "https://cadence.app/"
    ) -> String {
        let token = encodePlanShareToken(trip, extras: extras)
        let sep = baseUrl.contains("?") ? "&" : "?"
        return "\(baseUrl)\(sep)plan=\(token)"
    }

    private static func numVal(_ v: Any?) -> Double? {
        if let d = v as? Double, d.isFinite { return d }
        if let i = v as? Int { return Double(i) }
        return nil
    }

    public static func decodePlanShareToken(
        _ token: String,
        lang: CadenceLang = .en,
        now: Date = Date()
    ) -> SharedPlanDecodeResult? {
        let trimmed = token.trimmingCharacters(in: .whitespacesAndNewlines)
        guard trimmed.count >= 10,
              let json = base64UrlToUtf8(trimmed),
              let data = json.data(using: .utf8),
              let parsed = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
              let v = parsed["v"] as? Int, (v == 1 || v == 2),
              let parsedName = parsed["n"] as? String, !parsedName.isEmpty,
              let parsedKm = numVal(parsed["km"]), parsedKm != 0 else {
            return nil
        }

        let base = buildDefaultNewTripTemplate(lang: lang, now: now)
        let resolvedTag = (parsed["tag"] as? String).flatMap { $0.isEmpty ? nil : $0 } ?? "SPORT"
        let w = parsed["w"] as? [String: Any]
        let ph = parsed["ph"] as? [String: Any]
        let resolvedWindSpeed = numVal(w?["ws"]) ?? base.weather.baseWindSpeedKmH
        var resolvedWeather = base.weather
        resolvedWeather.temperatureC = numVal(w?["t"]) ?? base.weather.temperatureC
        resolvedWeather.windDirectionDegrees = numVal(w?["wd"]) ?? base.weather.windDirectionDegrees
        resolvedWeather.baseWindSpeedKmH = resolvedWindSpeed
        resolvedWeather.precipitationRiskPercent = numVal(w?["pr"]) ?? base.weather.precipitationRiskPercent
        resolvedWeather.weatherCode = numVal(w?["wc"]).map { Int($0) } ?? base.weather.weatherCode
        resolvedWeather.isHeadwindActive = resolvedWindSpeed >= 8

        let deterministicId = "shared-plan-\(hashTokenShort(trimmed))"
        let parsedEl = numVal(parsed["el"]) ?? 0
        let parsedSp = numVal(parsed["sp"]) ?? 24
        let parsedDd = parsed["dd"] as? String
        let parsedDt = parsed["dt"] as? String
        let parsedLb = parsed["lb"] as? String
        let parsedAr = parsed["ar"] as? String
        let parsedO = parsed["o"] as? String
        let parsedX = parsed["x"] as? String

        var stages: [TripStage]?
        if v == 2, let rawSg = parsed["sg"] as? [[String: Any]], rawSg.count > 1 {
            stages = rawSg.enumerated().map { idx, st in
                let stCoords = (st["pl"] as? String).map { decodePolyline($0) } ?? []
                let stMode = stCoords.count >= 2 ? "corridor" : "manual-radius"
                let stO = (st["o"] as? String).flatMap { $0.isEmpty ? nil : $0 } ?? "Stage \(idx + 1)"
                let stX = (st["x"] as? String).flatMap { $0.isEmpty ? nil : $0 } ?? "Finish \(idx + 1)"
                let stKm = numVal(st["km"]) ?? 30
                let stEl = numVal(st["el"]) ?? 0
                var stRouteInput = base.route
                stRouteInput.routeMode = stMode
                stRouteInput.origin = stO
                stRouteInput.destination = stX
                stRouteInput.distanceKm = stKm
                stRouteInput.elevationGainM = stEl
                stRouteInput.targetSpeedKmH = parsedSp
                stRouteInput.coordinates = stCoords.count >= 2 ? stCoords : nil
                let stSynth = GpxParserEngine.synthesizeRouteElevationProfile(stRouteInput)

                var stRoute = base.route
                stRoute.routeMode = stMode
                stRoute.origin = stO
                stRoute.destination = stX
                stRoute.distanceKm = stKm
                stRoute.elevationGainM = stEl
                stRoute.targetSpeedKmH = parsedSp
                stRoute.urbanTrafficDelayMinutes = 0
                stRoute.gateSecurityDelayMinutes = 0
                stRoute.coordinates = stCoords.count >= 2 ? stCoords : nil
                stRoute.elevationProfile = stSynth.elevationProfile
                stRoute.terrainSummary = stSynth.terrainSummary

                var stOffice = base.office
                stOffice.gateName = (st["x"] as? String).flatMap { $0.isEmpty ? nil : $0 } ?? "Stage \(idx + 1)"

                return TripStage(
                    id: "\(deterministicId)-day-\(idx + 1)",
                    dayNumber: idx + 1,
                    departureDate: (st["dd"] as? String).flatMap { $0.isEmpty ? nil : $0 } ?? parsedDd ?? base.departureDate ?? "",
                    departureTime: (st["dt"] as? String).flatMap { $0.isEmpty ? nil : $0 } ?? parsedDt ?? parsedLb ?? "08:00",
                    route: stRoute,
                    office: stOffice,
                    weather: resolvedWeather,
                    customChips: [],
                    accommodationNote: st["nt"] as? String,
                    pinnedAmenities: deserializeAmenities(st["st"] as? [[Any]], prefix: "\(deterministicId)-d\(idx + 1)-stop")
                )
            }
        }

        let firstStage = stages?.first
        let coords = firstStage?.route.coordinates ?? ((parsed["pl"] as? String).map { decodePolyline($0) } ?? [])
        let routeMode = coords.count >= 2 ? "corridor" : "manual-radius"

        let synthProfile: [ElevationProfilePoint]?
        let synthSummary: TerrainSummary?
        if let first = firstStage {
            synthProfile = first.route.elevationProfile
            synthSummary = first.route.terrainSummary
        } else {
            var rIn = base.route
            rIn.routeMode = routeMode
            rIn.origin = (parsedO?.isEmpty == false) ? parsedO : base.route.origin
            rIn.destination = (parsedX?.isEmpty == false) ? parsedX : base.route.destination
            rIn.distanceKm = parsedKm
            rIn.elevationGainM = parsedEl
            rIn.targetSpeedKmH = parsedSp
            rIn.coordinates = coords.count >= 2 ? coords : nil
            let res = GpxParserEngine.synthesizeRouteElevationProfile(rIn)
            synthProfile = res.elevationProfile
            synthSummary = res.terrainSummary
        }

        let pinnedAmenities: [StageAmenity]
        if let fPinned = firstStage?.pinnedAmenities, !fPinned.isEmpty {
            pinnedAmenities = fPinned
        } else {
            pinnedAmenities = deserializeAmenities(parsed["st"] as? [[Any]], prefix: "shared-stop")
        }

        let resolvedOrigin = firstStage?.route.origin ?? ((parsedO?.isEmpty == false) ? parsedO! : (base.route.origin ?? "Start"))
        let resolvedDest = firstStage?.route.destination ?? ((parsedX?.isEmpty == false) ? parsedX! : (base.route.destination ?? "Finish"))
        let resolvedKm = firstStage?.route.distanceKm ?? parsedKm
        let resolvedEl = firstStage?.route.elevationGainM ?? parsedEl
        let resolvedLeaveBy = (parsedLb?.isEmpty == false) ? parsedLb! : (firstStage?.departureTime ?? ((parsedDt?.isEmpty == false) ? parsedDt! : (base.departureTime ?? "08:00")))
        let resolvedArrival = (parsedAr?.isEmpty == false) ? parsedAr! : ((parsedDt?.isEmpty == false) ? parsedDt! : "10:30")

        let stageCount = stages?.count ?? 1
        let totalPinnedCount: Int
        if let stages = stages {
            let sum = stages.reduce(0) { $0 + ($1.pinnedAmenities?.count ?? 0) }
            totalPinnedCount = sum > 0 ? sum : pinnedAmenities.count
        } else {
            totalPinnedCount = pinnedAmenities.count
        }

        let kmStr = resolvedKm.truncatingRemainder(dividingBy: 1) == 0 ? "\(Int(resolvedKm))" : "\(resolvedKm)"
        let elStr = "\(Int(resolvedEl))"
        let generatedDescription: String
        if stageCount > 1, let stages = stages {
            let sumKm = JSCompat.jsRoundInt(stages.reduce(0.0) { $0 + $1.route.distanceKm })
            generatedDescription = lang == .fr
                ? "Tour \(stageCount) jours · \(sumKm) km · Plan partagé"
                : "\(stageCount)-day tour · \(sumKm) km · Shared blueprint"
        } else {
            generatedDescription = lang == .fr
                ? "\(kmStr) km · \(resolvedOrigin) → \(resolvedDest) (+\(elStr) m) · Plan de groupe (\(pinnedAmenities.count) arrêt\(pinnedAmenities.count > 1 ? "s" : ""))"
                : "\(kmStr) km · \(resolvedOrigin) → \(resolvedDest) (+\(elStr) m) · Shared Group Plan (\(pinnedAmenities.count) stop\(pinnedAmenities.count == 1 ? "" : "s"))"
        }

        let luggageWeightKg = (v == 2 ? numVal(ph?["lw"]) : nil) ?? base.physics.luggageWeightKg ?? base.physics.gearWeightKg

        var trip = base
        trip.id = deterministicId
        trip.name = parsedName
        trip.tag = resolvedTag
        trip.description = generatedDescription
        trip.updatedAt = isoTimestamp(now)
        trip.departureDate = firstStage?.departureDate ?? parsedDd ?? base.departureDate
        trip.departureTime = resolvedLeaveBy
        trip.arriveAtMode = (parsed["am"] as? Bool) ?? false
        trip.customChips = []
        trip.ruleSettings = LogisticsSettings()
        trip.office = OfficeConstraints(
            shiftStartTime: resolvedArrival,
            targetGateArrivalTime: resolvedArrival,
            gateName: resolvedDest.isEmpty ? parsedName : resolvedDest,
            lockerRefuelMinutes: 0,
            showerChangeMinutes: 0,
            breakRoomBreakfastMinutes: 0,
            strictNoFoodInOpenSpace: false,
            badgeRequiredForGate: false,
            notes: ""
        )
        trip.route = RouteParams(
            elevationGainM: resolvedEl,
            origin: resolvedOrigin,
            destination: resolvedDest,
            distanceKm: resolvedKm,
            targetSpeedKmH: parsedSp,
            pacingMode: base.route.pacingMode,
            urbanTrafficDelayMinutes: 0,
            gateSecurityDelayMinutes: 0,
            coordinates: coords.count >= 2 ? coords : nil,
            routeMode: routeMode,
            elevationProfile: synthProfile,
            terrainSummary: synthSummary
        )
        trip.weather = resolvedWeather
        trip.physics = PhysicsParams(
            luggageWeightKg: luggageWeightKg,
            riderWeightKg: numVal(ph?["rw"]) ?? base.physics.riderWeightKg,
            bikeWeightKg: numVal(ph?["bw"]) ?? base.physics.bikeWeightKg,
            gearWeightKg: luggageWeightKg,
            cda: numVal(ph?["cda"]) ?? base.physics.cda,
            crr: numVal(ph?["crr"]) ?? base.physics.crr,
            rho: base.physics.rho,
            drivetrainEfficiency: base.physics.drivetrainEfficiency,
            grossMechanicalEfficiency: base.physics.grossMechanicalEfficiency,
            gradientPercent: base.physics.gradientPercent
        )
        trip.checklist = RideReadinessEngine.generateTripChecklist(
            tag: resolvedTag,
            distanceKm: resolvedKm,
            weather: resolvedWeather,
            options: ChecklistGenerationOptions(lang: lang, customChips: [])
        )
        trip.pinnedAmenities = pinnedAmenities
        trip.stages = stages
        trip.activeStageIndex = stages != nil ? 0 : nil

        var senderBaseline: SenderBaseline?
        if v == 2, let sn = parsed["sn"] as? [String: Any] {
            senderBaseline = SenderBaseline(
                name: (sn["n"] as? String).flatMap { $0.isEmpty ? nil : $0 } ?? "Partner",
                riderWeightKg: numVal(sn["rw"]) ?? 70,
                bikeWeightKg: numVal(sn["bw"]) ?? 9,
                luggageWeightKg: numVal(sn["lw"]) ?? 0,
                cda: numVal(sn["cda"]) ?? 0.35,
                crr: numVal(sn["crr"]) ?? 0.005,
                ftpWatts: numVal(sn["ftp"]) ?? 220,
                bikeName: sn["bk"] as? String,
                bikeCategory: (sn["bc"] as? String).flatMap { BikeCategory(rawValue: $0) }
            )
        }

        return SharedPlanDecodeResult(
            trip: trip,
            sharedMeta: SharedPlanMeta(
                version: v,
                leaveBy: resolvedLeaveBy,
                arrival: resolvedArrival,
                goStatus: (parsed["go"] as? String) ?? "GO",
                bikeName: parsed["bk"] as? String,
                pinnedCount: totalPinnedCount,
                stageCount: stageCount,
                sharedGroupSpeedKmH: parsedSp,
                senderBaseline: senderBaseline
            )
        )
    }

    public static func applyPersonalLensToSharedTrip(
        _ sharedTrip: TripProfile,
        receiverSpecs: RiderBikeSpecs,
        options: PersonalLensOptions = PersonalLensOptions()
    ) -> TripProfile {
        let effective = BikeSpecsCatalog.getEffectiveRiderSpecs(receiverSpecs)
        let activeBike = BikeSpecsCatalog.getActiveBike(receiverSpecs)
        let resolvedRiderWeightKg = (receiverSpecs.riderWeightKg.isFinite && receiverSpecs.riderWeightKg > 25)
            ? receiverSpecs.riderWeightKg
            : effective.riderWeightKg
        let luggageKg = options.luggageWeightKg.map { max(0.0, $0) }
            ?? sharedTrip.physics.luggageWeightKg
            ?? sharedTrip.physics.gearWeightKg

        var out = sharedTrip
        out.updatedAt = isoTimestamp(options.now)
        out.physics.riderWeightKg = resolvedRiderWeightKg
        out.physics.bikeWeightKg = activeBike.weightKg
        out.physics.luggageWeightKg = luggageKg
        out.physics.gearWeightKg = luggageKg
        out.physics.cda = activeBike.cda
        out.physics.crr = activeBike.crr
        out.checklist = RideReadinessEngine.generateTripChecklist(
            tag: sharedTrip.tag,
            distanceKm: sharedTrip.route.distanceKm,
            weather: sharedTrip.weather,
            options: ChecklistGenerationOptions(
                lang: options.lang,
                customChips: sharedTrip.customChips ?? [],
                totalDays: sharedTrip.stages?.count ?? 1,
                isTubeless: activeBike.isTubeless
            )
        )
        return out
    }

    public static func computeGroupSyncCheck(
        _ trip: TripProfile,
        sender: SenderBaseline,
        receiverSpecs: RiderBikeSpecs,
        departureHHMM: String,
        lang: CadenceLang = .en
    ) -> GroupSyncCheckResult {
        let isFr = lang == .fr
        let groupSpeedKmH = max(10.0, JSCompat.jsToFixedNumber(trip.route.targetSpeedKmH > 0 ? trip.route.targetSpeedKmH : 20.0, decimals: 1))
        let activeBike = BikeSpecsCatalog.getActiveBike(receiverSpecs)
        let effectiveReceiver = BikeSpecsCatalog.getEffectiveRiderSpecs(receiverSpecs)
        let receiverTrimmed = (receiverSpecs.riderName ?? "").trimmingCharacters(in: .whitespacesAndNewlines)
        let receiverLabel = !receiverTrimmed.isEmpty ? receiverTrimmed : (isFr ? "Vous" : "You")
        let senderLabel = !sender.name.isEmpty ? sender.name : (isFr ? "Partenaire" : "Partner")
        let receiverWeightKg = (receiverSpecs.riderWeightKg.isFinite && receiverSpecs.riderWeightKg > 25)
            ? receiverSpecs.riderWeightKg
            : effectiveReceiver.riderWeightKg
        let receiverFtpWatts = (receiverSpecs.ftpWatts.isFinite && receiverSpecs.ftpWatts >= 80)
            ? receiverSpecs.ftpWatts
            : effectiveReceiver.ftpWatts

        func routeAtSpeed(_ spd: Double) -> RouteParams {
            var r = trip.route
            r.pacingMode = "speed"
            r.targetSpeedKmH = spd
            return r
        }

        var senderPhysicsBase = trip.physics
        senderPhysicsBase.riderWeightKg = sender.riderWeightKg
        senderPhysicsBase.bikeWeightKg = sender.bikeWeightKg
        senderPhysicsBase.luggageWeightKg = sender.luggageWeightKg
        senderPhysicsBase.gearWeightKg = sender.luggageWeightKg
        senderPhysicsBase.cda = sender.cda
        senderPhysicsBase.crr = sender.crr

        var receiverPhysicsBase = trip.physics
        let recLuggage = trip.physics.luggageWeightKg ?? trip.physics.gearWeightKg
        receiverPhysicsBase.riderWeightKg = receiverWeightKg
        receiverPhysicsBase.bikeWeightKg = activeBike.weightKg
        receiverPhysicsBase.luggageWeightKg = recLuggage
        receiverPhysicsBase.gearWeightKg = recLuggage
        receiverPhysicsBase.cda = activeBike.cda
        receiverPhysicsBase.crr = activeBike.crr

        let sCalc = PhysicsEngine.calculatePhysics(
            physics: senderPhysicsBase,
            route: routeAtSpeed(groupSpeedKmH),
            weather: trip.weather,
            lang: lang,
            ftpOverride: sender.ftpWatts
        )
        let rCalc = PhysicsEngine.calculatePhysics(
            physics: receiverPhysicsBase,
            route: routeAtSpeed(groupSpeedKmH),
            weather: trip.weather,
            lang: lang,
            ftpOverride: receiverFtpWatts,
            riderSpecs: receiverSpecs
        )

        let sFtpPct = JSCompat.jsRoundInt(sCalc.ftpPercent)
        let rFtpPct = JSCompat.jsRoundInt(rCalc.ftpPercent)
        let sZone = PhysicsEngine.getPowerZone(Double(sFtpPct))
        let rZone = PhysicsEngine.getPowerZone(Double(rFtpPct))
        let sArr = TimelineEngine.addMinutesToTime(departureHHMM, JSCompat.jsRoundInt(sCalc.movingTimeSeconds / 60.0))
        let rArr = TimelineEngine.addMinutesToTime(departureHHMM, JSCompat.jsRoundInt(rCalc.movingTimeSeconds / 60.0))

        let effortGapPct = abs(sFtpPct - rFtpPct)
        let harderRider: String
        if effortGapPct < 6 && max(sFtpPct, rFtpPct) <= 75 {
            harderRider = "balanced"
        } else if rFtpPct >= sFtpPct {
            harderRider = "receiver"
        } else {
            harderRider = "sender"
        }

        let needsAdjustment = max(sFtpPct, rFtpPct) > 75 || (effortGapPct >= 12 && max(sFtpPct, rFtpPct) > 70)
        var recommendedGroupSpeedKmH: Double?
        var recommendedArrivalHHMM: String?
        var recommendedDurationDeltaMin = 0

        if needsAdjustment {
            let minSpeed = max(12.0, groupSpeedKmH - 8.0)
            var cand = JSCompat.jsToFixedNumber(groupSpeedKmH - 0.5, decimals: 1)
            while cand >= minSpeed {
                let sCand = PhysicsEngine.calculatePhysics(physics: senderPhysicsBase, route: routeAtSpeed(cand), weather: trip.weather, lang: lang, ftpOverride: sender.ftpWatts)
                let rCand = PhysicsEngine.calculatePhysics(physics: receiverPhysicsBase, route: routeAtSpeed(cand), weather: trip.weather, lang: lang, ftpOverride: receiverFtpWatts, riderSpecs: receiverSpecs)
                if max(sCand.ftpPercent, rCand.ftpPercent) <= 74 {
                    recommendedGroupSpeedKmH = cand
                    let candMin = JSCompat.jsRoundInt(rCand.movingTimeSeconds / 60.0)
                    let baseMin = JSCompat.jsRoundInt(rCalc.movingTimeSeconds / 60.0)
                    recommendedDurationDeltaMin = max(0, candMin - baseMin)
                    recommendedArrivalHHMM = TimelineEngine.addMinutesToTime(departureHHMM, candMin)
                    break
                }
                cand = JSCompat.jsToFixedNumber(cand - 0.5, decimals: 1)
            }
        }

        let isBalanced = !needsAdjustment

        func formatSunsetMargin(_ arrivalHHMM: String) -> String {
            let coords = trip.route.coordinates?.first ?? LatLon(lat: 47.2184, lon: -1.5536)
            let dateStr = trip.departureDate ?? "2026-11-26"
            let tz = SolarVisibilityEngine.getApproxTimezoneOffset(dateStr: dateStr, lon: coords.lon)
            let solar = SolarVisibilityEngine.getSolarEphemeris(lat: coords.lat, lon: coords.lon, dateStr: dateStr, tzOffsetHours: tz)
            func toMin(_ hhmm: String) -> Int {
                let parts = hhmm.split(separator: ":").compactMap { Int($0) }
                return (parts.count > 0 ? parts[0] : 0) * 60 + (parts.count > 1 ? parts[1] : 0)
            }
            let diffMin = toMin(solar.sunset) - toMin(arrivalHHMM)
            if abs(diffMin) >= 60 {
                let hrs = JSCompat.roundTo(Double(abs(diffMin)) / 60.0, decimals: 1)
                let hrsStr = hrs.truncatingRemainder(dividingBy: 1) == 0 ? "\(Int(hrs))" : "\(hrs)"
                if diffMin > 0 {
                    return isFr ? ", \(hrsStr)h avant le coucher" : ", \(hrsStr)h before sunset"
                }
                return isFr ? ", \(hrsStr)h après la nuit" : ", \(hrsStr)h after sunset"
            }
            if diffMin > 0 {
                return isFr ? ", \(diffMin) min avant la nuit" : ", \(diffMin) min before sunset"
            }
            return isFr ? ", \(abs(diffMin)) min après la nuit" : ", \(abs(diffMin)) min after sunset"
        }

        let spdStr = groupSpeedKmH.truncatingRemainder(dividingBy: 1) == 0 ? "\(Int(groupSpeedKmH))" : "\(groupSpeedKmH)"
        let takeaway: String
        if isBalanced {
            takeaway = isFr
                ? "À \(spdStr) km/h, vous roulez tous les deux en \(rZone)/\(sZone) confortable (\(JSCompat.jsRoundInt(rCalc.legWatts)) W vs \(JSCompat.jsRoundInt(sCalc.legWatts)) W)."
                : "At \(spdStr) km/h, both riders stay in a comfortable \(rZone)/\(sZone) endurance groove (\(JSCompat.jsRoundInt(rCalc.legWatts)) W vs \(JSCompat.jsRoundInt(sCalc.legWatts)) W)."
        } else if let recSpd = recommendedGroupSpeedKmH, let recArr = recommendedArrivalHHMM {
            let harderName = harderRider == "receiver" ? receiverLabel : senderLabel
            let harderPct = harderRider == "receiver" ? rFtpPct : sFtpPct
            let harderZone = harderRider == "receiver" ? rZone : sZone
            let sunsetNote = formatSunsetMargin(recArr)
            let recSpdStr = recSpd.truncatingRemainder(dividingBy: 1) == 0 ? "\(Int(recSpd))" : "\(recSpd)"
            takeaway = isFr
                ? "À \(spdStr) km/h, \(harderName) monte à \(harderPct)% FTP (\(harderZone)). Passez à \(recSpdStr) km/h pour finir frais tous les deux (arrivée \(recArr)\(sunsetNote))."
                : "At \(spdStr) km/h, \(harderName) hits \(harderPct)% FTP (\(harderZone)). Ease to \(recSpdStr) km/h so you both finish fresh (arrival \(recArr)\(sunsetNote))."
        } else {
            takeaway = isFr
                ? "Écart d’effort de \(effortGapPct)% FTP entre vous deux à \(spdStr) km/h — prévoyez des relais doux en bosse."
                : "\(effortGapPct)% FTP effort gap at \(spdStr) km/h — take turns gently on climbs so nobody cooks early."
        }

        return GroupSyncCheckResult(
            groupSpeedKmH: groupSpeedKmH,
            sender: GroupSyncRiderMetrics(
                label: senderLabel,
                avgWatts: JSCompat.jsRoundInt(sCalc.legWatts),
                ftpWatts: JSCompat.jsRoundInt(sender.ftpWatts),
                ftpPercent: sFtpPct,
                zone: sZone,
                kcal: JSCompat.jsRoundInt(sCalc.totalKcalBurn),
                movingTimeFormatted: sCalc.movingTimeFormatted,
                arrivalHHMM: sArr
            ),
            receiver: GroupSyncRiderMetrics(
                label: receiverLabel,
                avgWatts: JSCompat.jsRoundInt(rCalc.legWatts),
                ftpWatts: JSCompat.jsRoundInt(receiverFtpWatts),
                ftpPercent: rFtpPct,
                zone: rZone,
                kcal: JSCompat.jsRoundInt(rCalc.totalKcalBurn),
                movingTimeFormatted: rCalc.movingTimeFormatted,
                arrivalHHMM: rArr
            ),
            effortGapPct: effortGapPct,
            harderRider: harderRider,
            isBalanced: isBalanced,
            recommendedGroupSpeedKmH: recommendedGroupSpeedKmH,
            recommendedArrivalHHMM: recommendedArrivalHHMM,
            recommendedDurationDeltaMin: recommendedDurationDeltaMin,
            takeaway: takeaway
        )
    }
}
