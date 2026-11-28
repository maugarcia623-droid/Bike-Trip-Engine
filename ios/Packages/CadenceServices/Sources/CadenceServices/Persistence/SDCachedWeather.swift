import Foundation
import SwiftData

@Model
public final class SDCachedWeather {
    #Index<SDCachedWeather>([\.kind, \.lastAccessedAt], [\.expiresAt])

    @Attribute(.unique) public var compositeKey: String
    public var kind: String
    public var cacheKey: String
    public var source: String?
    public var payloadData: Data
    public var createdAt: Date
    public var lastAccessedAt: Date
    public var expiresAt: Date?
    public var isPinnedOffline: Bool

    public init(
        compositeKey: String,
        kind: String,
        cacheKey: String,
        source: String? = nil,
        payloadData: Data,
        createdAt: Date = Date(),
        lastAccessedAt: Date = Date(),
        expiresAt: Date? = nil,
        isPinnedOffline: Bool = false
    ) {
        self.compositeKey = compositeKey
        self.kind = kind
        self.cacheKey = cacheKey
        self.source = source
        self.payloadData = payloadData
        self.createdAt = createdAt
        self.lastAccessedAt = lastAccessedAt
        self.expiresAt = expiresAt
        self.isPinnedOffline = isPinnedOffline
    }

    public static func makeCompositeKey(kind: WeatherCacheKind, cacheKey: String) -> String {
        "\(kind.rawValue):\(cacheKey)"
    }
}
