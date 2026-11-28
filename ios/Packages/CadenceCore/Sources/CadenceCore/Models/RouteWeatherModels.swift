import Foundation

public enum LoopDirection: String, Codable, Sendable, CaseIterable, Equatable {
    case clockwise
    case anticlockwise
    case outAndBack = "out-and-back"
    case linear
    case unknown
}

public enum LoopRecommendedDirection: String, Codable, Sendable, CaseIterable, Equatable {
    case forward
    case reverse
    case neutral
}

public enum RouteWeatherSource: String, Codable, Sendable, CaseIterable, Equatable {
    case live
    case planned
    case simulated
}

public struct RouteSectorForecast: Codable, Sendable, Equatable {
    public var index: Int
    public var startKm: Double
    public var endKm: Double
    public var distanceKm: Double
    public var lat: Double
    public var lon: Double
    public var bearingDeg: Double
    public var etaHHMM: String
    public var temperatureC: Double
    public var windChillC: Double
    public var windSpeedKmH: Double
    public var windDirectionDegrees: Double
    public var windCardinal: String
    public var effectiveHeadwindKmH: Double
    public var precipitationRiskPercent: Double
    public var visibilityKm: Double
    public var airDensityRho: Double
    public var legWatts: Int
    public var aeroPenaltyWatts: Int
    public var effectiveSpeedKmH: Double
    public var durationMin: Int
    public var carbsG: Int

    public init(
        index: Int,
        startKm: Double,
        endKm: Double,
        distanceKm: Double,
        lat: Double,
        lon: Double,
        bearingDeg: Double,
        etaHHMM: String,
        temperatureC: Double,
        windChillC: Double,
        windSpeedKmH: Double,
        windDirectionDegrees: Double,
        windCardinal: String,
        effectiveHeadwindKmH: Double,
        precipitationRiskPercent: Double,
        visibilityKm: Double,
        airDensityRho: Double,
        legWatts: Int,
        aeroPenaltyWatts: Int,
        effectiveSpeedKmH: Double,
        durationMin: Int,
        carbsG: Int
    ) {
        self.index = index
        self.startKm = startKm
        self.endKm = endKm
        self.distanceKm = distanceKm
        self.lat = lat
        self.lon = lon
        self.bearingDeg = bearingDeg
        self.etaHHMM = etaHHMM
        self.temperatureC = temperatureC
        self.windChillC = windChillC
        self.windSpeedKmH = windSpeedKmH
        self.windDirectionDegrees = windDirectionDegrees
        self.windCardinal = windCardinal
        self.effectiveHeadwindKmH = effectiveHeadwindKmH
        self.precipitationRiskPercent = precipitationRiskPercent
        self.visibilityKm = visibilityKm
        self.airDensityRho = airDensityRho
        self.legWatts = legWatts
        self.aeroPenaltyWatts = aeroPenaltyWatts
        self.effectiveSpeedKmH = effectiveSpeedKmH
        self.durationMin = durationMin
        self.carbsG = carbsG
    }
}

public struct LoopDirectionComparison: Codable, Sendable, Equatable {
    public var isLoop: Bool
    public var forwardOrientation: LoopDirection
    public var recommendedDirection: LoopRecommendedDirection
    public var forwardTotalMin: Int
    public var reverseTotalMin: Int
    public var forwardAvgWatts: Int
    public var reverseAvgWatts: Int
    public var minutesSaved: Int
    public var wattsSaved: Int

    public init(
        isLoop: Bool,
        forwardOrientation: LoopDirection,
        recommendedDirection: LoopRecommendedDirection,
        forwardTotalMin: Int,
        reverseTotalMin: Int,
        forwardAvgWatts: Int,
        reverseAvgWatts: Int,
        minutesSaved: Int,
        wattsSaved: Int
    ) {
        self.isLoop = isLoop
        self.forwardOrientation = forwardOrientation
        self.recommendedDirection = recommendedDirection
        self.forwardTotalMin = forwardTotalMin
        self.reverseTotalMin = reverseTotalMin
        self.forwardAvgWatts = forwardAvgWatts
        self.reverseAvgWatts = reverseAvgWatts
        self.minutesSaved = minutesSaved
        self.wattsSaved = wattsSaved
    }
}

public struct RouteWeatherAnalysis: Codable, Sendable, Equatable {
    public var sectors: [RouteSectorForecast]
    public var loopComparison: LoopDirectionComparison
    public var coldestSector: RouteSectorForecast
    public var wettestSector: RouteSectorForecast
    public var worstCaseWeather: WeatherCondition
    public var coldestSectorLabel: String
    public var source: RouteWeatherSource

    public init(
        sectors: [RouteSectorForecast],
        loopComparison: LoopDirectionComparison,
        coldestSector: RouteSectorForecast,
        wettestSector: RouteSectorForecast,
        worstCaseWeather: WeatherCondition,
        coldestSectorLabel: String,
        source: RouteWeatherSource
    ) {
        self.sectors = sectors
        self.loopComparison = loopComparison
        self.coldestSector = coldestSector
        self.wettestSector = wettestSector
        self.worstCaseWeather = worstCaseWeather
        self.coldestSectorLabel = coldestSectorLabel
        self.source = source
    }
}
