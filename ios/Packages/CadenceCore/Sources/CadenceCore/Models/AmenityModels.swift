import Foundation

public enum AmenityCategory: String, Codable, Sendable, CaseIterable {
    case water
    case cemetery
    case food
    case mechanix
    case essentials
    case bailout
}

public struct StageAmenity: Codable, Sendable, Equatable, Identifiable {
    public var id: String
    public var category: AmenityCategory
    public var subType: String
    public var name: String
    public var lat: Double
    public var lon: Double
    public var routeKm: Double
    public var detourMeters: Double
    public var elevationMeters: Double?
    public var openingHours: String?
    public var isPinned: Bool?

    public init(
        id: String,
        category: AmenityCategory,
        subType: String,
        name: String,
        lat: Double,
        lon: Double,
        routeKm: Double,
        detourMeters: Double,
        elevationMeters: Double? = nil,
        openingHours: String? = nil,
        isPinned: Bool? = nil
    ) {
        self.id = id
        self.category = category
        self.subType = subType
        self.name = name
        self.lat = lat
        self.lon = lon
        self.routeKm = routeKm
        self.detourMeters = detourMeters
        self.elevationMeters = elevationMeters
        self.openingHours = openingHours
        self.isPinned = isPinned
    }
}

public enum WaterGapSeverity: String, Codable, Sendable, CaseIterable {
    case clear
    case caution
    case critical
}

public struct WaterGapAlert: Codable, Sendable, Equatable {
    public var startKm: Double
    public var endKm: Double
    public var distanceKm: Double
    public var severity: WaterGapSeverity
    public var recommendedBidons: Int?
    public var recommendedMl: Int?
    public var gapHours: Double?
    public var gapFluidNeedMl: Int?
    public var onboardCapacityMl: Int?
    public var depletionPct: Int?
    public var recommendedBidonsForGap: Int?
    public var extraPackableBidons: Int?

    public init(
        startKm: Double,
        endKm: Double,
        distanceKm: Double,
        severity: WaterGapSeverity,
        recommendedBidons: Int? = nil,
        recommendedMl: Int? = nil,
        gapHours: Double? = nil,
        gapFluidNeedMl: Int? = nil,
        onboardCapacityMl: Int? = nil,
        depletionPct: Int? = nil,
        recommendedBidonsForGap: Int? = nil,
        extraPackableBidons: Int? = nil
    ) {
        self.startKm = startKm
        self.endKm = endKm
        self.distanceKm = distanceKm
        self.severity = severity
        self.recommendedBidons = recommendedBidons
        self.recommendedMl = recommendedMl
        self.gapHours = gapHours
        self.gapFluidNeedMl = gapFluidNeedMl
        self.onboardCapacityMl = onboardCapacityMl
        self.depletionPct = depletionPct
        self.recommendedBidonsForGap = recommendedBidonsForGap
        self.extraPackableBidons = extraPackableBidons
    }
}

public struct WaterGapsSummary: Codable, Sendable, Equatable {
    public var status: WaterGapSeverity
    public var maxGapKm: Double
    public var gaps: [WaterGapAlert]
    public var cautionGaps: [WaterGapAlert]
    public var criticalGaps: [WaterGapAlert]
    public var totalWaterPoints: Int

    public init(
        status: WaterGapSeverity,
        maxGapKm: Double,
        gaps: [WaterGapAlert],
        cautionGaps: [WaterGapAlert],
        criticalGaps: [WaterGapAlert],
        totalWaterPoints: Int
    ) {
        self.status = status
        self.maxGapKm = maxGapKm
        self.gaps = gaps
        self.cautionGaps = cautionGaps
        self.criticalGaps = criticalGaps
        self.totalWaterPoints = totalWaterPoints
    }
}
