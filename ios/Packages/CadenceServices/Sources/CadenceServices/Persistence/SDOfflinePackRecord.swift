import Foundation
import SwiftData

@Model
public final class SDOfflinePackRecord {
    #Index<SDOfflinePackRecord>([\.savedAt])

    @Attribute(.unique) public var tripId: String
    public var tripName: String
    public var savedAt: Date
    public var distanceKm: Double
    public var amenitiesCount: Int
    public var hasSurface: Bool
    public var hasWeather: Bool
    public var tilesPrefetched: Int
    public var pinnedCacheKeysData: Data?

    public init(
        tripId: String,
        tripName: String,
        savedAt: Date = Date(),
        distanceKm: Double,
        amenitiesCount: Int,
        hasSurface: Bool,
        hasWeather: Bool,
        tilesPrefetched: Int = 0,
        pinnedCacheKeysData: Data? = nil
    ) {
        self.tripId = tripId
        self.tripName = tripName
        self.savedAt = savedAt
        self.distanceKm = distanceKm
        self.amenitiesCount = amenitiesCount
        self.hasSurface = hasSurface
        self.hasWeather = hasWeather
        self.tilesPrefetched = tilesPrefetched
        self.pinnedCacheKeysData = pinnedCacheKeysData
    }

    func decodePinnedCacheKeys() throws -> [String] {
        guard let pinnedCacheKeysData else { return [] }
        return try PersistenceCodec.decode([String].self, from: pinnedCacheKeysData)
    }

    func toMeta() throws -> OfflinePackMeta {
        OfflinePackMeta(
            tripId: tripId,
            tripName: tripName,
            savedAt: savedAt,
            distanceKm: distanceKm,
            amenitiesCount: amenitiesCount,
            hasSurface: hasSurface,
            hasWeather: hasWeather,
            tilesPrefetched: tilesPrefetched,
            pinnedCacheKeys: try decodePinnedCacheKeys()
        )
    }
}
