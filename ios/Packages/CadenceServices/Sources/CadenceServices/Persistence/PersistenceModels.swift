import Foundation
import CadenceCore

// MARK: - User Profile DTO

/// Mirrors `UserProfile` in `src/utils/userProfileStorage.ts:5-14` (stored in `rider_profiles.profile`).
public struct UserProfileDTO: Codable, Sendable, Equatable {
    public var name: String?
    public var heightCm: Double?
    public var weightKg: Double?
    public var bikeName: String?
    public var bikeType: String?
    public var bikeWeightKg: Double?
    public var isTubeless: Bool?
    public var completedAt: String?

    public init(
        name: String? = nil,
        heightCm: Double? = nil,
        weightKg: Double? = nil,
        bikeName: String? = nil,
        bikeType: String? = nil,
        bikeWeightKg: Double? = nil,
        isTubeless: Bool? = nil,
        completedAt: String? = nil
    ) {
        self.name = name
        self.heightCm = heightCm
        self.weightKg = weightKg
        self.bikeName = bikeName
        self.bikeType = bikeType
        self.bikeWeightKg = bikeWeightKg
        self.isTubeless = isTubeless
        self.completedAt = completedAt
    }

    public var isEmpty: Bool {
        let hasName = !(name?.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty ?? true)
        return !hasName
            && heightCm == nil
            && weightKg == nil
            && bikeName == nil
            && bikeType == nil
            && bikeWeightKg == nil
            && isTubeless == nil
            && completedAt == nil
    }
}

public typealias UserProfile = UserProfileDTO

// MARK: - OSM Surface Cache DTOs

/// Mirrors `OsmWayTags` in `src/services/osmSurfaceService.ts:10-27`.
public struct OsmWayTags: Codable, Sendable, Equatable {
    public var highway: String?
    public var surface: String?
    public var tracktype: String?
    public var smoothness: String?
    public var bicycle: String?
    public var footway: String?
    public var service: String?
    public var access: String?
    public var name: String?
    public var ref: String?
    public var mtbScale: String?
    public var sacScale: String?
    public var width: String?
    public var cyclewaySurface: String?
    public var cyclewayBothSurface: String?

    enum CodingKeys: String, CodingKey {
        case highway
        case surface
        case tracktype
        case smoothness
        case bicycle
        case footway
        case service
        case access
        case name
        case ref
        case width
        case mtbScale = "mtb:scale"
        case sacScale = "sac_scale"
        case cyclewaySurface = "cycleway:surface"
        case cyclewayBothSurface = "cycleway:both:surface"
    }

    public init(
        highway: String? = nil,
        surface: String? = nil,
        tracktype: String? = nil,
        smoothness: String? = nil,
        bicycle: String? = nil,
        footway: String? = nil,
        service: String? = nil,
        access: String? = nil,
        name: String? = nil,
        ref: String? = nil,
        mtbScale: String? = nil,
        sacScale: String? = nil,
        width: String? = nil,
        cyclewaySurface: String? = nil,
        cyclewayBothSurface: String? = nil
    ) {
        self.highway = highway
        self.surface = surface
        self.tracktype = tracktype
        self.smoothness = smoothness
        self.bicycle = bicycle
        self.footway = footway
        self.service = service
        self.access = access
        self.name = name
        self.ref = ref
        self.mtbScale = mtbScale
        self.sacScale = sacScale
        self.width = width
        self.cyclewaySurface = cyclewaySurface
        self.cyclewayBothSurface = cyclewayBothSurface
    }
}

public struct OsmCoordinate: Codable, Sendable, Equatable {
    public var lat: Double
    public var lon: Double

    public init(lat: Double, lon: Double) {
        self.lat = lat
        self.lon = lon
    }
}

public struct OsmBounds: Codable, Sendable, Equatable {
    public var minlat: Double
    public var minlon: Double
    public var maxlat: Double
    public var maxlon: Double

    public init(minlat: Double, minlon: Double, maxlat: Double, maxlon: Double) {
        self.minlat = minlat
        self.minlon = minlon
        self.maxlat = maxlat
        self.maxlon = maxlon
    }
}

/// Mirrors `OsmWayElement` in `src/services/osmSurfaceService.ts:29-39`.
public struct OsmWayElement: Codable, Sendable, Equatable, Identifiable {
    public var id: Int
    public var bounds: OsmBounds?
    public var geometry: [OsmCoordinate]
    public var tags: OsmWayTags

    public init(id: Int, bounds: OsmBounds? = nil, geometry: [OsmCoordinate], tags: OsmWayTags) {
        self.id = id
        self.bounds = bounds
        self.geometry = geometry
        self.tags = tags
    }
}

/// Mirrors `OsmSurfaceRouteData` in `src/services/osmSurfaceService.ts:53-59`.
public struct OsmSurfaceRouteData: Codable, Sendable, Equatable {
    public var routeKey: String
    public var ways: [OsmWayElement]
    public var wayCount: Int
    public var chunkCount: Int
    public var fetchedAt: String

    public init(
        routeKey: String,
        ways: [OsmWayElement],
        wayCount: Int,
        chunkCount: Int,
        fetchedAt: String
    ) {
        self.routeKey = routeKey
        self.ways = ways
        self.wayCount = wayCount
        self.chunkCount = chunkCount
        self.fetchedAt = fetchedAt
    }
}

// MARK: - Offline Pack & Cache DTOs

/// Mirrors `OfflineExpeditionPackMeta` in `src/services/offlinePackService.ts:21-30`.
public struct OfflinePackMeta: Codable, Sendable, Equatable, Identifiable {
    public var id: String { tripId }
    public var tripId: String
    public var tripName: String
    public var savedAt: Date
    public var distanceKm: Double
    public var amenitiesCount: Int
    public var hasSurface: Bool
    public var hasWeather: Bool
    public var tilesPrefetched: Int
    public var pinnedCacheKeys: [String]

    public init(
        tripId: String,
        tripName: String,
        savedAt: Date = Date(),
        distanceKm: Double,
        amenitiesCount: Int,
        hasSurface: Bool,
        hasWeather: Bool,
        tilesPrefetched: Int = 0,
        pinnedCacheKeys: [String] = []
    ) {
        self.tripId = tripId
        self.tripName = tripName
        self.savedAt = savedAt
        self.distanceKm = distanceKm
        self.amenitiesCount = amenitiesCount
        self.hasSurface = hasSurface
        self.hasWeather = hasWeather
        self.tilesPrefetched = tilesPrefetched
        self.pinnedCacheKeys = pinnedCacheKeys
    }
}

public enum WeatherCacheKind: String, Codable, Sendable, CaseIterable {
    case sector
    case weekly
    case hourly

    public var maxUnpinnedEntries: Int {
        switch self {
        case .weekly: return 30
        case .hourly: return 50
        case .sector: return 100
        }
    }
}

// MARK: - Pending Share Import DTOs

public enum PendingShareKind: String, Codable, Sendable, CaseIterable {
    case file
    case url
    case planCode
    case planToken
    case text
}

public enum PendingShareStatus: String, Codable, Sendable, CaseIterable {
    case pending
    case processing
    case completed
    case failed
}

public struct PendingShareImportDTO: Codable, Sendable, Equatable, Identifiable {
    public var id: String
    public var kind: PendingShareKind
    public var status: PendingShareStatus
    public var sourceUrl: String?
    public var sharedText: String?
    public var fileName: String?
    public var utTypeIdentifier: String?
    public var fileData: Data?
    public var errorMessage: String?
    public var createdAt: Date
    public var processedAt: Date?

    public init(
        id: String = UUID().uuidString,
        kind: PendingShareKind,
        status: PendingShareStatus = .pending,
        sourceUrl: String? = nil,
        sharedText: String? = nil,
        fileName: String? = nil,
        utTypeIdentifier: String? = nil,
        fileData: Data? = nil,
        errorMessage: String? = nil,
        createdAt: Date = Date(),
        processedAt: Date? = nil
    ) {
        self.id = id
        self.kind = kind
        self.status = status
        self.sourceUrl = sourceUrl
        self.sharedText = sharedText
        self.fileName = fileName
        self.utTypeIdentifier = utTypeIdentifier
        self.fileData = fileData
        self.errorMessage = errorMessage
        self.createdAt = createdAt
        self.processedAt = processedAt
    }
}

// MARK: - Unified Sync & Store Record DTOs

public struct SyncTripRecord: Sendable, Equatable {
    public var clientId: String
    public var trip: TripProfile
    public var sortOrder: Int
    public var clientUpdatedAt: Date
    public var serverUpdatedAt: Date?
    public var deletedAt: Date?
    public var needsSync: Bool

    public init(
        clientId: String,
        trip: TripProfile,
        sortOrder: Int = 0,
        clientUpdatedAt: Date,
        serverUpdatedAt: Date? = nil,
        deletedAt: Date? = nil,
        needsSync: Bool
    ) {
        self.clientId = clientId
        self.trip = trip
        self.sortOrder = sortOrder
        self.clientUpdatedAt = clientUpdatedAt
        self.serverUpdatedAt = serverUpdatedAt
        self.deletedAt = deletedAt
        self.needsSync = needsSync
    }
}

public struct SyncBikeRecord: Sendable, Equatable {
    public var clientId: String
    public var bike: BikeSpec
    public var sortOrder: Int
    public var clientUpdatedAt: Date
    public var serverUpdatedAt: Date?
    public var deletedAt: Date?
    public var needsSync: Bool

    public init(
        clientId: String,
        bike: BikeSpec,
        sortOrder: Int = 0,
        clientUpdatedAt: Date,
        serverUpdatedAt: Date? = nil,
        deletedAt: Date? = nil,
        needsSync: Bool
    ) {
        self.clientId = clientId
        self.bike = bike
        self.sortOrder = sortOrder
        self.clientUpdatedAt = clientUpdatedAt
        self.serverUpdatedAt = serverUpdatedAt
        self.deletedAt = deletedAt
        self.needsSync = needsSync
    }
}

public struct SyncRiderProfileRecord: Sendable, Equatable {
    public var userId: String?
    public var riderName: String?
    public var activeTripClientId: String?
    public var activeBikeClientId: String?
    public var specs: RiderSpecsCloudPayload
    public var profile: UserProfileDTO
    public var hasCompletedOnboarding: Bool
    public var clientUpdatedAt: Date
    public var serverUpdatedAt: Date?
    public var needsSync: Bool

    public init(
        userId: String? = nil,
        riderName: String? = nil,
        activeTripClientId: String? = nil,
        activeBikeClientId: String? = nil,
        specs: RiderSpecsCloudPayload,
        profile: UserProfileDTO = UserProfileDTO(),
        hasCompletedOnboarding: Bool = false,
        clientUpdatedAt: Date,
        serverUpdatedAt: Date? = nil,
        needsSync: Bool
    ) {
        self.userId = userId
        self.riderName = riderName
        self.activeTripClientId = activeTripClientId
        self.activeBikeClientId = activeBikeClientId
        self.specs = specs
        self.profile = profile
        self.hasCompletedOnboarding = hasCompletedOnboarding
        self.clientUpdatedAt = clientUpdatedAt
        self.serverUpdatedAt = serverUpdatedAt
        self.needsSync = needsSync
    }
}

// MARK: - Internal JSON Coding Helper

enum PersistenceCodec {
    static func encode<T: Encodable>(_ value: T) throws -> Data {
        let encoder = JSONEncoder()
        return try encoder.encode(value)
    }

    static func decode<T: Decodable>(_ type: T.Type, from data: Data) throws -> T {
        let decoder = JSONDecoder()
        return try decoder.decode(type, from: data)
    }
}
