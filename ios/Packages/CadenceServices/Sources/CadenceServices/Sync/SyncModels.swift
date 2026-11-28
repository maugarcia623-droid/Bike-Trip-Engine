import Foundation
import CadenceCore

// MARK: - Rider Specs Cloud Payload (rider_profiles.specs without "bikes")

/// Mirrors `CadenceCore.RiderBikeSpecs` without `bikes`, matching `rider_profiles.specs` jsonb.
/// All fields are optional so `{}` or partial server JSONB decodes safely.
public struct RiderSpecsCloudPayload: Codable, Sendable, Equatable {
    public var riderName: String?
    public var riderWeightKg: Double?
    public var riderHeightCm: Double?
    public var ftpWatts: Double?
    public var carbTargetGPerHr: Double?
    public var carbPacingMode: String?
    public var sweatRateLPerHr: Double?
    public var sweatSodiumMgPerL: Double?
    public var nutritionPreference: NutritionPreference?
    public var dietaryFilters: [DietaryFilter]?
    public var activePantryIds: [String]?
    public var customPantryItems: [PantryItem]?
    public var riderLevel: RiderLevel?
    public var cockpitViewMode: CockpitViewMode?
    public var telemetryMode: TelemetryMode?
    public var pacingInputMode: PacingInputMode?
    public var bidonSizeMl: Int?
    public var frameBottleSlots: Int?
    public var pressureUnit: PressureUnit?
    public var liquidCarbRatio: Double?
    public var autoModulateLiquidInHeatOrEffort: Bool?
    public var enableSavoryPalateResets: Bool?
    public var activeBikeId: String?

    public init(
        riderName: String? = nil,
        riderWeightKg: Double? = nil,
        riderHeightCm: Double? = nil,
        ftpWatts: Double? = nil,
        carbTargetGPerHr: Double? = nil,
        carbPacingMode: String? = nil,
        sweatRateLPerHr: Double? = nil,
        sweatSodiumMgPerL: Double? = nil,
        nutritionPreference: NutritionPreference? = nil,
        dietaryFilters: [DietaryFilter]? = nil,
        activePantryIds: [String]? = nil,
        customPantryItems: [PantryItem]? = nil,
        riderLevel: RiderLevel? = nil,
        cockpitViewMode: CockpitViewMode? = nil,
        telemetryMode: TelemetryMode? = nil,
        pacingInputMode: PacingInputMode? = nil,
        bidonSizeMl: Int? = nil,
        frameBottleSlots: Int? = nil,
        pressureUnit: PressureUnit? = nil,
        liquidCarbRatio: Double? = nil,
        autoModulateLiquidInHeatOrEffort: Bool? = nil,
        enableSavoryPalateResets: Bool? = nil,
        activeBikeId: String? = nil
    ) {
        self.riderName = riderName
        self.riderWeightKg = riderWeightKg
        self.riderHeightCm = riderHeightCm
        self.ftpWatts = ftpWatts
        self.carbTargetGPerHr = carbTargetGPerHr
        self.carbPacingMode = carbPacingMode
        self.sweatRateLPerHr = sweatRateLPerHr
        self.sweatSodiumMgPerL = sweatSodiumMgPerL
        self.nutritionPreference = nutritionPreference
        self.dietaryFilters = dietaryFilters
        self.activePantryIds = activePantryIds
        self.customPantryItems = customPantryItems
        self.riderLevel = riderLevel
        self.cockpitViewMode = cockpitViewMode
        self.telemetryMode = telemetryMode
        self.pacingInputMode = pacingInputMode
        self.bidonSizeMl = bidonSizeMl
        self.frameBottleSlots = frameBottleSlots
        self.pressureUnit = pressureUnit
        self.liquidCarbRatio = liquidCarbRatio
        self.autoModulateLiquidInHeatOrEffort = autoModulateLiquidInHeatOrEffort
        self.enableSavoryPalateResets = enableSavoryPalateResets
        self.activeBikeId = activeBikeId
    }

    public init(from specs: RiderBikeSpecs) {
        self.riderName = specs.riderName
        self.riderWeightKg = specs.riderWeightKg
        self.riderHeightCm = specs.riderHeightCm
        self.ftpWatts = specs.ftpWatts
        self.carbTargetGPerHr = specs.carbTargetGPerHr
        self.carbPacingMode = specs.carbPacingMode
        self.sweatRateLPerHr = specs.sweatRateLPerHr
        self.sweatSodiumMgPerL = specs.sweatSodiumMgPerL
        self.nutritionPreference = specs.nutritionPreference
        self.dietaryFilters = specs.dietaryFilters
        self.activePantryIds = specs.activePantryIds
        self.customPantryItems = specs.customPantryItems
        self.riderLevel = specs.riderLevel
        self.cockpitViewMode = specs.cockpitViewMode
        self.telemetryMode = specs.telemetryMode
        self.pacingInputMode = specs.pacingInputMode
        self.bidonSizeMl = specs.bidonSizeMl
        self.frameBottleSlots = specs.frameBottleSlots
        self.pressureUnit = specs.pressureUnit
        self.liquidCarbRatio = specs.liquidCarbRatio
        self.autoModulateLiquidInHeatOrEffort = specs.autoModulateLiquidInHeatOrEffort
        self.enableSavoryPalateResets = specs.enableSavoryPalateResets
        self.activeBikeId = specs.activeBikeId
    }

    public func toRiderBikeSpecs(
        bikes: [BikeSpec],
        riderNameOverride: String? = nil,
        activeBikeClientId: String? = nil
    ) -> RiderBikeSpecs {
        let defaults = RiderBikeSpecs.defaultSpecs
        let resolvedName: String?
        if let overrideTrimmed = riderNameOverride?.trimmingCharacters(in: .whitespacesAndNewlines),
           !overrideTrimmed.isEmpty {
            resolvedName = overrideTrimmed
        } else if let nameTrimmed = riderName?.trimmingCharacters(in: .whitespacesAndNewlines),
                  !nameTrimmed.isEmpty {
            resolvedName = nameTrimmed
        } else {
            resolvedName = nil
        }

        let resolvedActiveBikeId: String
        if let candidate = activeBikeClientId, bikes.contains(where: { $0.id == candidate }) {
            resolvedActiveBikeId = candidate
        } else if let specCandidate = activeBikeId, bikes.contains(where: { $0.id == specCandidate }) {
            resolvedActiveBikeId = specCandidate
        } else {
            resolvedActiveBikeId = bikes.first?.id ?? ""
        }

        return RiderBikeSpecs(
            riderName: resolvedName,
            riderWeightKg: riderWeightKg ?? defaults.riderWeightKg,
            riderHeightCm: riderHeightCm ?? defaults.riderHeightCm,
            ftpWatts: ftpWatts ?? defaults.ftpWatts,
            carbTargetGPerHr: carbTargetGPerHr ?? defaults.carbTargetGPerHr,
            carbPacingMode: carbPacingMode ?? defaults.carbPacingMode,
            sweatRateLPerHr: sweatRateLPerHr ?? defaults.sweatRateLPerHr,
            sweatSodiumMgPerL: sweatSodiumMgPerL ?? defaults.sweatSodiumMgPerL,
            nutritionPreference: nutritionPreference ?? defaults.nutritionPreference,
            dietaryFilters: dietaryFilters ?? defaults.dietaryFilters,
            activePantryIds: activePantryIds ?? defaults.activePantryIds,
            customPantryItems: customPantryItems ?? defaults.customPantryItems,
            riderLevel: riderLevel ?? defaults.riderLevel,
            cockpitViewMode: cockpitViewMode ?? defaults.cockpitViewMode,
            telemetryMode: telemetryMode ?? defaults.telemetryMode,
            pacingInputMode: pacingInputMode ?? defaults.pacingInputMode,
            bidonSizeMl: bidonSizeMl ?? defaults.bidonSizeMl,
            frameBottleSlots: frameBottleSlots ?? defaults.frameBottleSlots,
            pressureUnit: pressureUnit ?? defaults.pressureUnit,
            liquidCarbRatio: liquidCarbRatio ?? defaults.liquidCarbRatio,
            autoModulateLiquidInHeatOrEffort: autoModulateLiquidInHeatOrEffort ?? defaults.autoModulateLiquidInHeatOrEffort,
            enableSavoryPalateResets: enableSavoryPalateResets ?? defaults.enableSavoryPalateResets,
            activeBikeId: resolvedActiveBikeId,
            bikes: bikes
        )
    }

    /// Mirrors `hasMeaningfulCloudValue` in `src/services/cloudSync.ts:131-147`:
    /// `0` and `false` count as populated; empty arrays and whitespace-only strings do not.
    public var hasMeaningfulContent: Bool {
        let hasRiderName = !(riderName?.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty ?? true)
        let hasCarbPacing = !(carbPacingMode?.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty ?? true)
        let hasActiveBikeId = !(activeBikeId?.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty ?? true)
        let hasDietary = !(dietaryFilters?.isEmpty ?? true)
        let hasPantry = !(activePantryIds?.isEmpty ?? true)
        let hasCustomPantry = !(customPantryItems?.isEmpty ?? true)

        return hasRiderName
            || riderWeightKg != nil
            || riderHeightCm != nil
            || ftpWatts != nil
            || carbTargetGPerHr != nil
            || hasCarbPacing
            || sweatRateLPerHr != nil
            || sweatSodiumMgPerL != nil
            || nutritionPreference != nil
            || hasDietary
            || hasPantry
            || hasCustomPantry
            || riderLevel != nil
            || cockpitViewMode != nil
            || telemetryMode != nil
            || pacingInputMode != nil
            || bidonSizeMl != nil
            || frameBottleSlots != nil
            || pressureUnit != nil
            || liquidCarbRatio != nil
            || autoModulateLiquidInHeatOrEffort != nil
            || enableSavoryPalateResets != nil
            || hasActiveBikeId
    }
}

// MARK: - Supabase v2 Row DTOs

public struct RemoteRiderProfileRow: Codable, Sendable, Equatable {
    public var userId: UUID
    public var schemaVersion: Int
    public var riderName: String?
    public var activeTripClientId: String?
    public var activeBikeClientId: String?
    public var specs: RiderSpecsCloudPayload
    public var profile: UserProfileDTO
    public var clientUpdatedAt: String
    public var updatedAt: String?

    enum CodingKeys: String, CodingKey {
        case userId = "user_id"
        case schemaVersion = "schema_version"
        case riderName = "rider_name"
        case activeTripClientId = "active_trip_client_id"
        case activeBikeClientId = "active_bike_client_id"
        case specs
        case profile
        case clientUpdatedAt = "client_updated_at"
        case updatedAt = "updated_at"
    }

    public init(
        userId: UUID,
        schemaVersion: Int = 2,
        riderName: String? = nil,
        activeTripClientId: String? = nil,
        activeBikeClientId: String? = nil,
        specs: RiderSpecsCloudPayload = RiderSpecsCloudPayload(),
        profile: UserProfileDTO = UserProfileDTO(),
        clientUpdatedAt: String,
        updatedAt: String? = nil
    ) {
        self.userId = userId
        self.schemaVersion = schemaVersion
        self.riderName = riderName
        self.activeTripClientId = activeTripClientId
        self.activeBikeClientId = activeBikeClientId
        self.specs = specs
        self.profile = profile
        self.clientUpdatedAt = clientUpdatedAt
        self.updatedAt = updatedAt
    }
}

public struct RemoteRiderProfileUpsert: Codable, Sendable, Equatable {
    public var userId: UUID
    public var schemaVersion: Int
    public var riderName: String?
    public var activeTripClientId: String?
    public var activeBikeClientId: String?
    public var specs: RiderSpecsCloudPayload
    public var profile: UserProfileDTO
    public var clientUpdatedAt: String

    enum CodingKeys: String, CodingKey {
        case userId = "user_id"
        case schemaVersion = "schema_version"
        case riderName = "rider_name"
        case activeTripClientId = "active_trip_client_id"
        case activeBikeClientId = "active_bike_client_id"
        case specs
        case profile
        case clientUpdatedAt = "client_updated_at"
    }

    public init(
        userId: UUID,
        schemaVersion: Int = 2,
        riderName: String? = nil,
        activeTripClientId: String? = nil,
        activeBikeClientId: String? = nil,
        specs: RiderSpecsCloudPayload,
        profile: UserProfileDTO,
        clientUpdatedAt: String
    ) {
        self.userId = userId
        self.schemaVersion = schemaVersion
        self.riderName = riderName
        self.activeTripClientId = activeTripClientId
        self.activeBikeClientId = activeBikeClientId
        self.specs = specs
        self.profile = profile
        self.clientUpdatedAt = clientUpdatedAt
    }
}

public struct RemoteRiderBikeRow: Codable, Sendable, Equatable {
    public var userId: UUID
    public var clientId: String
    public var schemaVersion: Int
    public var name: String
    public var category: String
    public var payload: BikeSpec
    public var sortOrder: Int
    public var clientUpdatedAt: String
    public var updatedAt: String?
    public var deletedAt: String?

    enum CodingKeys: String, CodingKey {
        case userId = "user_id"
        case clientId = "client_id"
        case schemaVersion = "schema_version"
        case name
        case category
        case payload
        case sortOrder = "sort_order"
        case clientUpdatedAt = "client_updated_at"
        case updatedAt = "updated_at"
        case deletedAt = "deleted_at"
    }

    public init(
        userId: UUID,
        clientId: String,
        schemaVersion: Int = 2,
        name: String,
        category: String = BikeCategory.gravel.rawValue,
        payload: BikeSpec,
        sortOrder: Int = 0,
        clientUpdatedAt: String,
        updatedAt: String? = nil,
        deletedAt: String? = nil
    ) {
        self.userId = userId
        self.clientId = clientId
        self.schemaVersion = schemaVersion
        self.name = name
        self.category = category
        self.payload = payload
        self.sortOrder = sortOrder
        self.clientUpdatedAt = clientUpdatedAt
        self.updatedAt = updatedAt
        self.deletedAt = deletedAt
    }

    public func resolvedBikeSpec() -> BikeSpec {
        var bike = payload
        bike.id = clientId
        if bike.name.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty, !name.isEmpty {
            bike.name = name
        }
        if bike.bikeCategory == nil, let parsed = BikeCategory(rawValue: category) {
            bike.bikeCategory = parsed
        }
        return bike
    }
}

public struct RemoteRiderBikeUpsert: Codable, Sendable, Equatable {
    public var userId: UUID
    public var clientId: String
    public var schemaVersion: Int
    public var name: String
    public var category: String
    public var payload: BikeSpec
    public var sortOrder: Int
    public var clientUpdatedAt: String
    public var deletedAt: String?

    enum CodingKeys: String, CodingKey {
        case userId = "user_id"
        case clientId = "client_id"
        case schemaVersion = "schema_version"
        case name
        case category
        case payload
        case sortOrder = "sort_order"
        case clientUpdatedAt = "client_updated_at"
        case deletedAt = "deleted_at"
    }

    public init(
        userId: UUID,
        clientId: String,
        schemaVersion: Int = 2,
        name: String,
        category: String,
        payload: BikeSpec,
        sortOrder: Int,
        clientUpdatedAt: String,
        deletedAt: String?
    ) {
        self.userId = userId
        self.clientId = clientId
        self.schemaVersion = schemaVersion
        self.name = name
        self.category = category
        self.payload = payload
        self.sortOrder = sortOrder
        self.clientUpdatedAt = clientUpdatedAt
        self.deletedAt = deletedAt
    }

    /// Encode explicitly so `deleted_at` is always emitted (`null` when active, ISO string when deleted)
    /// to support resurrection on `ON CONFLICT DO UPDATE`.
    public func encode(to encoder: any Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)
        try container.encode(userId, forKey: .userId)
        try container.encode(clientId, forKey: .clientId)
        try container.encode(schemaVersion, forKey: .schemaVersion)
        try container.encode(name, forKey: .name)
        try container.encode(category, forKey: .category)
        try container.encode(payload, forKey: .payload)
        try container.encode(sortOrder, forKey: .sortOrder)
        try container.encode(clientUpdatedAt, forKey: .clientUpdatedAt)
        try container.encode(deletedAt, forKey: .deletedAt)
    }
}

public struct RemoteUserTripRow: Codable, Sendable, Equatable {
    public var userId: UUID
    public var clientId: String
    public var schemaVersion: Int
    public var name: String
    public var tag: String
    public var departureDate: String?
    public var payload: TripProfile
    public var clientUpdatedAt: String
    public var updatedAt: String?
    public var deletedAt: String?

    enum CodingKeys: String, CodingKey {
        case userId = "user_id"
        case clientId = "client_id"
        case schemaVersion = "schema_version"
        case name
        case tag
        case departureDate = "departure_date"
        case payload
        case clientUpdatedAt = "client_updated_at"
        case updatedAt = "updated_at"
        case deletedAt = "deleted_at"
    }

    public init(
        userId: UUID,
        clientId: String,
        schemaVersion: Int = 2,
        name: String,
        tag: String,
        departureDate: String? = nil,
        payload: TripProfile,
        clientUpdatedAt: String,
        updatedAt: String? = nil,
        deletedAt: String? = nil
    ) {
        self.userId = userId
        self.clientId = clientId
        self.schemaVersion = schemaVersion
        self.name = name
        self.tag = tag
        self.departureDate = departureDate
        self.payload = payload
        self.clientUpdatedAt = clientUpdatedAt
        self.updatedAt = updatedAt
        self.deletedAt = deletedAt
    }

    public func resolvedTripProfile() -> TripProfile {
        var trip = payload
        trip.id = clientId
        if trip.name.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty, !name.isEmpty {
            trip.name = name
        }
        if trip.tag.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty, !tag.isEmpty {
            trip.tag = tag
        }
        if trip.departureDate == nil, let normalized = SyncTimestamp.normalizeDepartureDate(departureDate) {
            trip.departureDate = normalized
        }
        return trip
    }
}

public struct RemoteUserTripUpsert: Codable, Sendable, Equatable {
    public var userId: UUID
    public var clientId: String
    public var schemaVersion: Int
    public var name: String
    public var tag: String
    public var departureDate: String?
    public var payload: TripProfile
    public var clientUpdatedAt: String
    public var deletedAt: String?

    enum CodingKeys: String, CodingKey {
        case userId = "user_id"
        case clientId = "client_id"
        case schemaVersion = "schema_version"
        case name
        case tag
        case departureDate = "departure_date"
        case payload
        case clientUpdatedAt = "client_updated_at"
        case deletedAt = "deleted_at"
    }

    public init(
        userId: UUID,
        clientId: String,
        schemaVersion: Int = 2,
        name: String,
        tag: String,
        departureDate: String?,
        payload: TripProfile,
        clientUpdatedAt: String,
        deletedAt: String?
    ) {
        self.userId = userId
        self.clientId = clientId
        self.schemaVersion = schemaVersion
        self.name = name
        self.tag = tag
        self.departureDate = departureDate
        self.payload = payload
        self.clientUpdatedAt = clientUpdatedAt
        self.deletedAt = deletedAt
    }

    public func encode(to encoder: any Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)
        try container.encode(userId, forKey: .userId)
        try container.encode(clientId, forKey: .clientId)
        try container.encode(schemaVersion, forKey: .schemaVersion)
        try container.encode(name, forKey: .name)
        try container.encode(tag, forKey: .tag)
        try container.encode(departureDate, forKey: .departureDate)
        try container.encode(payload, forKey: .payload)
        try container.encode(clientUpdatedAt, forKey: .clientUpdatedAt)
        try container.encode(deletedAt, forKey: .deletedAt)
    }
}

public struct BackfillV2Response: Codable, Sendable, Equatable {
    public var status: String
    public var profilesInserted: Int
    public var bikesInserted: Int
    public var tripsInserted: Int
    public var skipped: Int

    enum CodingKeys: String, CodingKey {
        case status
        case profilesInserted = "profiles_inserted"
        case bikesInserted = "bikes_inserted"
        case tripsInserted = "trips_inserted"
        case skipped
    }

    public init(
        status: String = "ok",
        profilesInserted: Int = 0,
        bikesInserted: Int = 0,
        tripsInserted: Int = 0,
        skipped: Int = 0
    ) {
        self.status = status
        self.profilesInserted = profilesInserted
        self.bikesInserted = bikesInserted
        self.tripsInserted = tripsInserted
        self.skipped = skipped
    }
}

// MARK: - Sync Status, Report, Errors & Timestamps

public enum SyncStatus: Sendable, Equatable {
    case idle
    case loading
    case saving
    case synced
    case error(String)
}

public enum SyncDirection: String, Sendable, Equatable {
    case none
    case pushed
    case pulled
}

public struct SyncReport: Sendable, Equatable {
    public var didRunBackfill: Bool
    public var tripsPushed: Int
    public var tripsPulled: Int
    public var tripsDeletedLocally: Int
    public var tripsDeletedRemotely: Int
    public var bikesPushed: Int
    public var bikesPulled: Int
    public var bikesDeletedLocally: Int
    public var bikesDeletedRemotely: Int
    public var profileDirection: SyncDirection
    public var syncedAt: Date

    public init(
        didRunBackfill: Bool = false,
        tripsPushed: Int = 0,
        tripsPulled: Int = 0,
        tripsDeletedLocally: Int = 0,
        tripsDeletedRemotely: Int = 0,
        bikesPushed: Int = 0,
        bikesPulled: Int = 0,
        bikesDeletedLocally: Int = 0,
        bikesDeletedRemotely: Int = 0,
        profileDirection: SyncDirection = .none,
        syncedAt: Date = Date()
    ) {
        self.didRunBackfill = didRunBackfill
        self.tripsPushed = tripsPushed
        self.tripsPulled = tripsPulled
        self.tripsDeletedLocally = tripsDeletedLocally
        self.tripsDeletedRemotely = tripsDeletedRemotely
        self.bikesPushed = bikesPushed
        self.bikesPulled = bikesPulled
        self.bikesDeletedLocally = bikesDeletedLocally
        self.bikesDeletedRemotely = bikesDeletedRemotely
        self.profileDirection = profileDirection
        self.syncedAt = syncedAt
    }
}

public enum SyncError: Error, Sendable, Equatable, LocalizedError {
    case notAuthenticated
    case missingSchemaObject(code: String?, message: String)
    case invalidDepartureDate(String)
    case serverError(code: String?, message: String)
    case networkError(String)

    public var errorDescription: String? {
        switch self {
        case .notAuthenticated:
            return "User is not authenticated."
        case .missingSchemaObject(let code, let message):
            return "Missing Supabase schema object (\(code ?? "unknown")): \(message)"
        case .invalidDepartureDate(let raw):
            return "Invalid departure date: \(raw)"
        case .serverError(let code, let message):
            return "Supabase server error (\(code ?? "unknown")): \(message)"
        case .networkError(let message):
            return "Network error: \(message)"
        }
    }
}

public enum SyncTimestamp {
    /// Parses ISO-8601 timestamps with 0, 3, 6, or arbitrary fractional seconds and `Z` or `±HH:MM` offsets.
    public static func parse(_ raw: String?) -> Date? {
        guard let raw else { return nil }
        let trimmed = raw.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty else { return nil }

        // Normalize space separator from Postgres text output if any ("2026-11-26 10:05:00+00:00")
        let isoCandidate = trimmed.replacingOccurrences(of: " ", with: "T")

        // First try standard Swift ISO8601FormatStyle (fractional & non-fractional)
        if let date = try? Date.ISO8601FormatStyle(includingFractionalSeconds: true).parse(isoCandidate) {
            return date
        }
        if let date = try? Date.ISO8601FormatStyle(includingFractionalSeconds: false).parse(isoCandidate) {
            return date
        }

        // Normalize arbitrary fractional second lengths (e.g. 6-digit Postgres microseconds) to 3 digits
        if let normalized = normalizeFractionalSeconds(isoCandidate),
           let date = try? Date.ISO8601FormatStyle(includingFractionalSeconds: true).parse(normalized) {
            return date
        }

        // Fallback via POSIX DateFormatter for edge offsets like "+00"
        let formats = [
            "yyyy-MM-dd'T'HH:mm:ss.SSSSSSXXXXX",
            "yyyy-MM-dd'T'HH:mm:ss.SSSXXXXX",
            "yyyy-MM-dd'T'HH:mm:ssXXXXX",
            "yyyy-MM-dd'T'HH:mm:ss.SSSSSSXX",
            "yyyy-MM-dd'T'HH:mm:ss.SSSXX",
            "yyyy-MM-dd'T'HH:mm:ssXX",
        ]
        for format in formats {
            let formatter = DateFormatter()
            formatter.locale = Locale(identifier: "en_US_POSIX")
            formatter.timeZone = TimeZone(secondsFromGMT: 0)
            formatter.dateFormat = format
            if let date = formatter.date(from: isoCandidate) {
                return date
            }
        }
        return nil
    }

    private static func normalizeFractionalSeconds(_ raw: String) -> String? {
        guard let dotIndex = raw.firstIndex(of: ".") else { return nil }
        let afterDot = raw.index(after: dotIndex)
        var tzStart = afterDot
        while tzStart < raw.endIndex, raw[tzStart].isNumber {
            tzStart = raw.index(after: tzStart)
        }
        guard tzStart > afterDot else { return nil }
        let digits = raw[afterDot..<tzStart]
        let msDigits: String
        if digits.count >= 3 {
            msDigits = String(digits.prefix(3))
        } else {
            msDigits = digits + String(repeating: "0", count: 3 - digits.count)
        }
        let tzSuffix = raw[tzStart...]
        let fixedTz = tzSuffix == "+00" || tzSuffix == "-00" ? "Z" : String(tzSuffix)
        return "\(raw[..<dotIndex]).\(msDigits)\(fixedTz)"
    }

    /// Formats a `Date` as UTC ISO-8601 with millisecond precision (`yyyy-MM-dd'T'HH:mm:ss.SSS'Z'`).
    public static func format(_ date: Date) -> String {
        let formatter = DateFormatter()
        formatter.locale = Locale(identifier: "en_US_POSIX")
        formatter.timeZone = TimeZone(secondsFromGMT: 0)
        formatter.dateFormat = "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'"
        return formatter.string(from: date)
    }

    /// Ports `normalizeDepartureDate` from `src/services/cloudSync.ts:75-93`.
    public static func normalizeDepartureDate(_ raw: String?) -> String? {
        guard let raw else { return nil }
        let trimmed = raw.trimmingCharacters(in: .whitespacesAndNewlines)
        guard trimmed.count >= 10 else { return nil }
        let prefix10 = String(trimmed.prefix(10))

        // Must match /^(\d{4})-(\d{2})-(\d{2})(?:$|T)/ from cloudSync.ts:78
        if trimmed.count > 10 {
            let nextChar = trimmed[trimmed.index(trimmed.startIndex, offsetBy: 10)]
            if nextChar != "T" {
                return nil
            }
        }

        let parts = prefix10.split(separator: "-", omittingEmptySubsequences: false)
        guard parts.count == 3,
              parts[0].count == 4, parts[1].count == 2, parts[2].count == 2,
              parts.allSatisfy({ $0.allSatisfy { $0.isASCII && $0.isWholeNumber } }),
              let year = Int(parts[0]),
              let month = Int(parts[1]),
              let day = Int(parts[2]),
              (1...12).contains(month),
              (1...31).contains(day) else {
            return nil
        }

        var calendar = Calendar(identifier: .gregorian)
        calendar.timeZone = TimeZone(secondsFromGMT: 0)!
        var components = DateComponents()
        components.year = year
        components.month = month
        components.day = day
        components.hour = 12
        guard let date = calendar.date(from: components) else { return nil }
        let verified = calendar.dateComponents([.year, .month, .day], from: date)
        guard verified.year == year, verified.month == month, verified.day == day else {
            return nil
        }
        return prefix10
    }

    /// Compares timestamps with a 1ms tolerance to prevent sub-millisecond drift from causing spurious syncs.
    public static func compare(
        _ lhs: Date,
        _ rhs: Date,
        toleranceSeconds: TimeInterval = 0.001
    ) -> ComparisonResult {
        let delta = lhs.timeIntervalSince(rhs)
        if abs(delta) <= toleranceSeconds {
            return .orderedSame
        }
        return delta > 0 ? .orderedDescending : .orderedAscending
    }
}

// MARK: - Local Store Bridge Protocol

public protocol SyncLocalStore: Sendable {
    func fetchSyncableTrips(includeDeleted: Bool) async throws -> [SyncTripRecord]
    func upsertSyncedTrips(_ records: [SyncTripRecord]) async throws
    func fetchSyncableBikes(includeDeleted: Bool) async throws -> [SyncBikeRecord]
    func upsertSyncedBikes(_ records: [SyncBikeRecord]) async throws
    func fetchSyncableRiderProfile() async throws -> SyncRiderProfileRecord?
    func upsertSyncedRiderProfile(_ record: SyncRiderProfileRecord) async throws
}
