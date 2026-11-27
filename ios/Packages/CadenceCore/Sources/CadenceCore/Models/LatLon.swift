import Foundation

/// Coordinate pair `[lat, lon]` serialized identically to TypeScript `[number, number]`.
public struct LatLon: Codable, Sendable, Equatable, Hashable {
    public var lat: Double
    public var lon: Double

    public init(lat: Double, lon: Double) {
        self.lat = lat
        self.lon = lon
    }

    public init(_ lat: Double, _ lon: Double) {
        self.lat = lat
        self.lon = lon
    }

    public init(from decoder: Decoder) throws {
        var container = try decoder.unkeyedContainer()
        let lat = try container.decode(Double.self)
        let lon = try container.decode(Double.self)
        self.init(lat: lat, lon: lon)
    }

    public func encode(to encoder: Encoder) throws {
        var container = encoder.unkeyedContainer()
        try container.encode(lat)
        try container.encode(lon)
    }
}
