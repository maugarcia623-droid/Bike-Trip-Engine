import Foundation
import SwiftData
import CadenceCore

@Model
public final class SDCachedCorridorScan {
    #Index<SDCachedCorridorScan>([\.lastAccessedAt], [\.expiresAt])

    @Attribute(.unique) public var cacheKey: String
    public var stageId: String
    public var distanceKm: Double
    public var amenitiesCount: Int
    public var payloadData: Data
    public var createdAt: Date
    public var lastAccessedAt: Date
    public var expiresAt: Date?
    public var isPinnedOffline: Bool

    public init(
        cacheKey: String,
        stageId: String,
        distanceKm: Double,
        amenitiesCount: Int,
        payloadData: Data,
        createdAt: Date = Date(),
        lastAccessedAt: Date = Date(),
        expiresAt: Date? = nil,
        isPinnedOffline: Bool = false
    ) {
        self.cacheKey = cacheKey
        self.stageId = stageId
        self.distanceKm = distanceKm
        self.amenitiesCount = amenitiesCount
        self.payloadData = payloadData
        self.createdAt = createdAt
        self.lastAccessedAt = lastAccessedAt
        self.expiresAt = expiresAt
        self.isPinnedOffline = isPinnedOffline
    }

    func decodeAmenities() throws -> [StageAmenity] {
        try PersistenceCodec.decode([StageAmenity].self, from: payloadData)
    }
}
