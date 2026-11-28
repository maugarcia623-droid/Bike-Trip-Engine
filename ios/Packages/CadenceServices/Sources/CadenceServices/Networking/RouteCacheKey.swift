import Foundation
import CadenceCore

/// Deterministic route hash key generator mirroring `getRouteHashKey` in `src/services/overpassCorridor.ts`.
/// Shared by `RoutingService` (corridor scan cache invalidation on reroute) and `OverpassCorridorService`.
public enum RouteCacheKey {
    public static func routeHashKey(
        coordinates: [LatLon]?,
        stageId: String? = nil,
        totalDistanceKm: Double? = nil
    ) -> String {
        guard let coordinates, !coordinates.isEmpty else {
            let sid = (stageId?.isEmpty == false) ? stageId! : "default"
            let distStr: String
            if let totalDistanceKm, totalDistanceKm != 0, totalDistanceKm.isFinite {
                if totalDistanceKm.truncatingRemainder(dividingBy: 1) == 0,
                   abs(totalDistanceKm) < Double(Int64.max) {
                    distStr = String(Int64(totalDistanceKm))
                } else {
                    distStr = String(totalDistanceKm)
                }
            } else {
                distStr = "0"
            }
            return "empty-\(sid)-\(distStr)"
        }

        let n = coordinates.count
        let fractions: [Double] = [0, 0.25, 0.5, 0.75, 1]
        let sig = fractions.map { t in
            let idx = min(n - 1, Int(floor(t * Double(n - 1))))
            let pt = coordinates[idx]
            return "\(JSCompat.jsFixed(pt.lat, decimals: 3)),\(JSCompat.jsFixed(pt.lon, decimals: 3))"
        }.joined(separator: "|")

        let distTag: Int
        if let totalDistanceKm, totalDistanceKm.isFinite {
            distTag = JSCompat.jsRoundInt(totalDistanceKm * 10.0)
        } else {
            distTag = 0
        }
        let sid = (stageId?.isEmpty == false) ? stageId! : "s"
        return "route-\(sid)-\(distTag)-\(sig)"
    }

    /// Deterministic route hash key for OSM surface caching mirroring `getOsmSurfaceRouteKey`
    /// in `src/services/osmSurfaceService.ts:89-105`. Independent of `stageId`.
    public static func osmSurfaceRouteKey(
        coordinates: [LatLon]?,
        distanceKm: Double? = nil
    ) -> String {
        guard let coordinates, coordinates.count >= 2 else {
            return "empty"
        }

        let n = coordinates.count
        let fractions: [Double] = [0, 0.2, 0.4, 0.6, 0.8, 1]
        let sig = fractions.map { t in
            let idx = min(n - 1, Int(floor(t * Double(n - 1))))
            let pt = coordinates[idx]
            return "\(JSCompat.jsFixed(pt.lat, decimals: 3)),\(JSCompat.jsFixed(pt.lon, decimals: 3))"
        }.joined(separator: "|")

        let distTag: Int
        if let distanceKm, distanceKm.isFinite {
            distTag = JSCompat.jsRoundInt(distanceKm * 10.0)
        } else {
            distTag = 0
        }
        return "osm-surf-\(distTag)-\(sig)"
    }
}
