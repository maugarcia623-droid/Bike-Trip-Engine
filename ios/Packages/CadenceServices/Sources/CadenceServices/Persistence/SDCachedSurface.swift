import Foundation
import SwiftData

@Model
public final class SDCachedSurface {
    #Index<SDCachedSurface>([\.lastAccessedAt], [\.expiresAt])

    @Attribute(.unique) public var routeKey: String
    public var wayCount: Int
    public var chunkCount: Int
    public var fetchedAtIso: String
    public var payloadData: Data
    public var createdAt: Date
    public var lastAccessedAt: Date
    public var expiresAt: Date?
    public var isPinnedOffline: Bool

    public init(
        routeKey: String,
        wayCount: Int,
        chunkCount: Int,
        fetchedAtIso: String,
        payloadData: Data,
        createdAt: Date = Date(),
        lastAccessedAt: Date = Date(),
        expiresAt: Date? = nil,
        isPinnedOffline: Bool = false
    ) {
        self.routeKey = routeKey
        self.wayCount = wayCount
        self.chunkCount = chunkCount
        self.fetchedAtIso = fetchedAtIso
        self.payloadData = payloadData
        self.createdAt = createdAt
        self.lastAccessedAt = lastAccessedAt
        self.expiresAt = expiresAt
        self.isPinnedOffline = isPinnedOffline
    }

    func decodeSurface() throws -> OsmSurfaceRouteData {
        try PersistenceCodec.decode(OsmSurfaceRouteData.self, from: payloadData)
    }
}
