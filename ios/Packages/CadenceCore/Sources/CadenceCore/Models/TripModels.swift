import Foundation

public struct WeatherCondition: Codable, Sendable, Equatable {
    public var source: String? // "live" | "planned" | "simulated"
    public var airDensityRho: Double?
    public var effectiveHeadwindKmH: Double?
    public var isBeyondForecastWindow: Bool?
    public var targetTimestampFormatted: String?
    public var isHeadwindActive: Bool
    public var baseWindSpeedKmH: Double
    public var windDirection: String // "headwind" | "cross-headwind" | "tailwind" | "calm"
    public var windDirectionDegrees: Double
    public var temperatureC: Double
    public var relativeHumidity: Double?
    public var recentPrecipitationMm: Double?
    public var precipitationRiskPercent: Double
    public var estuaryGustKmH: Double
    public var visibilityKm: Double
    public var weatherCode: Int?
    public var isDay: Bool?
    public var sunrise: String?
    public var sunset: String?

    public init(
        source: String? = nil,
        airDensityRho: Double? = nil,
        effectiveHeadwindKmH: Double? = nil,
        isBeyondForecastWindow: Bool? = nil,
        targetTimestampFormatted: String? = nil,
        isHeadwindActive: Bool = false,
        baseWindSpeedKmH: Double = 0,
        windDirection: String = "calm",
        windDirectionDegrees: Double = 0,
        temperatureC: Double = 18,
        relativeHumidity: Double? = nil,
        recentPrecipitationMm: Double? = nil,
        precipitationRiskPercent: Double = 0,
        estuaryGustKmH: Double = 0,
        visibilityKm: Double = 20,
        weatherCode: Int? = nil,
        isDay: Bool? = nil,
        sunrise: String? = nil,
        sunset: String? = nil
    ) {
        self.source = source
        self.airDensityRho = airDensityRho
        self.effectiveHeadwindKmH = effectiveHeadwindKmH
        self.isBeyondForecastWindow = isBeyondForecastWindow
        self.targetTimestampFormatted = targetTimestampFormatted
        self.isHeadwindActive = isHeadwindActive
        self.baseWindSpeedKmH = baseWindSpeedKmH
        self.windDirection = windDirection
        self.windDirectionDegrees = windDirectionDegrees
        self.temperatureC = temperatureC
        self.relativeHumidity = relativeHumidity
        self.recentPrecipitationMm = recentPrecipitationMm
        self.precipitationRiskPercent = precipitationRiskPercent
        self.estuaryGustKmH = estuaryGustKmH
        self.visibilityKm = visibilityKm
        self.weatherCode = weatherCode
        self.isDay = isDay
        self.sunrise = sunrise
        self.sunset = sunset
    }
}

public struct PhysicsParams: Codable, Sendable, Equatable {
    public var clothesWeightKg: Double?
    public var luggageWeightKg: Double?
    public var mechanicalLossFraction: Double?
    public var riderWeightKg: Double
    public var bikeWeightKg: Double
    public var gearWeightKg: Double
    public var cda: Double
    public var crr: Double
    public var rho: Double
    public var drivetrainEfficiency: Double
    public var grossMechanicalEfficiency: Double
    public var gradientPercent: Double

    public init(
        clothesWeightKg: Double? = nil,
        luggageWeightKg: Double? = nil,
        mechanicalLossFraction: Double? = nil,
        riderWeightKg: Double = 70,
        bikeWeightKg: Double = 9,
        gearWeightKg: Double = 2,
        cda: Double = 0.32,
        crr: Double = 0.0045,
        rho: Double = 1.225,
        drivetrainEfficiency: Double = 0.97,
        grossMechanicalEfficiency: Double = 0.22,
        gradientPercent: Double = 0
    ) {
        self.clothesWeightKg = clothesWeightKg
        self.luggageWeightKg = luggageWeightKg
        self.mechanicalLossFraction = mechanicalLossFraction
        self.riderWeightKg = riderWeightKg
        self.bikeWeightKg = bikeWeightKg
        self.gearWeightKg = gearWeightKg
        self.cda = cda
        self.crr = crr
        self.rho = rho
        self.drivetrainEfficiency = drivetrainEfficiency
        self.grossMechanicalEfficiency = grossMechanicalEfficiency
        self.gradientPercent = gradientPercent
    }
}

public enum SurfaceType: String, Codable, Sendable, CaseIterable {
    case paved
    case gravel
    case singletrack
}

public enum SectorTechnicality: String, Codable, Sendable, CaseIterable {
    case smooth
    case moderate
    case technical
}

public enum GravelSuitabilityLevel: String, Codable, Sendable, CaseIterable {
    case ideal
    case goodWithCare = "good-with-care"
    case technicalCaution = "technical-caution"
}

public struct SurfaceSegment: Codable, Sendable, Equatable, Identifiable {
    public var id: String
    public var type: SurfaceType
    public var startKm: Double
    public var endKm: Double
    public var distanceKm: Double
    public var startPct: Double
    public var endPct: Double
    public var startCoordIdx: Int
    public var endCoordIdx: Int
    public var coordinates: [LatLon]
    public var nameEn: String
    public var nameFr: String
    public var surfaceDetailEn: String
    public var surfaceDetailFr: String
    public var avgGradePct: Double
    public var maxGradePct: Double
    public var effectiveCrr: Double
    public var technicality: SectorTechnicality
    public var suitability38c: String
    public var riderNoteEn: String
    public var riderNoteFr: String
    public var osmWayIds: [Int]?
    public var osmHighway: String?
    public var osmSurfaceTag: String?
    public var osmTrackType: String?
    public var osmSmoothness: String?
    public var osmMtbScale: String?
    public var osmSacScale: String?
    public var osmName: String?
    public var osmRef: String?
    public var isInferredFromHighway: Bool?
}

public struct GravelSuitabilityAssessment: Codable, Sendable, Equatable {
    public var overallLevel: GravelSuitabilityLevel
    public var scorePct: Double
    public var tireWidthMm: Double
    public var isTubeless: Bool
    public var recommendedFrontBar: Double
    public var recommendedRearBar: Double
    public var frontLoadPct: Double?
    public var rearLoadPct: Double?
    public var hooklessCapped: Bool?
    public var headlineEn: String
    public var headlineFr: String
    public var summaryEn: String
    public var summaryFr: String
    public var unpavedCount: Int
    public var technicalCount: Int
    public var maxUnpavedStretchKm: Double
}

public struct SurfaceBreakdown: Codable, Sendable, Equatable {
    public var pavedPct: Double
    public var gravelPct: Double
    public var singletrackPct: Double
    public var pavedKm: Double
    public var gravelKm: Double
    public var singletrackKm: Double
    public var weightedCrr: Double
    public var segments: [SurfaceSegment]
    public var pointSurfaces: [SurfaceType]
    public var suitability: GravelSuitabilityAssessment
    public var dataSource: String?
    public var isLoadingOsm: Bool?
    public var osmCoveragePct: Double?
    public var explicitTagPct: Double?
    public var osmWayCount: Int?
    public var osmError: String?
    public var osmFetchedAt: String?
}

public struct ElevationProfilePoint: Codable, Sendable, Equatable {
    public var distKm: Double
    public var eleM: Double
    public var gradePct: Double
    public var surfaceType: SurfaceType?

    public init(distKm: Double, eleM: Double, gradePct: Double, surfaceType: SurfaceType? = nil) {
        self.distKm = distKm
        self.eleM = eleM
        self.gradePct = gradePct
        self.surfaceType = surfaceType
    }
}

public struct TerrainSummary: Codable, Sendable, Equatable {
    public var flatPct: Double
    public var rollingPct: Double
    public var climbPct: Double
    public var descentPct: Double
    public var maxGradePct: Double
    public var minEleM: Double
    public var maxEleM: Double
    public var surfaceLabel: String?
    public var difficultyLevel: String?
    public var pavedPct: Double?
    public var gravelPct: Double?
    public var singletrackPct: Double?
    public var surfaceBreakdown: SurfaceBreakdown?
}

public struct RouteWaypoint: Codable, Sendable, Equatable, Identifiable {
    public var id: String
    public var name: String
    public var coordinates: LatLon?
    public var distanceFromStartKm: Double?
    public var sourceAmenityId: String?

    public init(
        id: String,
        name: String,
        coordinates: LatLon? = nil,
        distanceFromStartKm: Double? = nil,
        sourceAmenityId: String? = nil
    ) {
        self.id = id
        self.name = name
        self.coordinates = coordinates
        self.distanceFromStartKm = distanceFromStartKm
        self.sourceAmenityId = sourceAmenityId
    }
}

public enum RouteCueDirection: String, Codable, Sendable, CaseIterable {
    case depart
    case arrive
    case left
    case right
    case slightLeft = "slight-left"
    case slightRight = "slight-right"
    case sharpLeft = "sharp-left"
    case sharpRight = "sharp-right"
    case straight
    case roundabout
    case waypoint
    case resupply
}

public struct RouteCueStep: Codable, Sendable, Equatable {
    public var lat: Double
    public var lng: Double
    public var distKm: Double
    public var instruction: String
    public var direction: RouteCueDirection
    public var streetName: String?

    public init(
        lat: Double,
        lng: Double,
        distKm: Double,
        instruction: String,
        direction: RouteCueDirection,
        streetName: String? = nil
    ) {
        self.lat = lat
        self.lng = lng
        self.distKm = distKm
        self.instruction = instruction
        self.direction = direction
        self.streetName = streetName
    }
}

public struct RouteParams: Codable, Sendable, Equatable {
    public var elevationGainM: Double?
    public var elevationLossM: Double?
    public var origin: String?
    public var destination: String?
    public var distanceKm: Double
    public var targetSpeedKmH: Double
    public var pacingMode: String? // "speed" | "effort"
    public var targetEffortWatts: Double?
    public var urbanTrafficDelayMinutes: Double
    public var gateSecurityDelayMinutes: Double
    public var coordinates: [LatLon]?
    public var routeMode: String? // "corridor" | "manual-radius" | "gpx"
    public var originCoords: LatLon?
    public var destCoords: LatLon?
    public var radiusMeters: Double?
    public var gpxFileName: String?
    public var elevationProfile: [ElevationProfilePoint]?
    public var terrainSummary: TerrainSummary?
    public var surfaceBreakdown: SurfaceBreakdown?
    public var waypoints: [RouteWaypoint]?
    public var cueSheet: [RouteCueStep]?

    public init(
        elevationGainM: Double? = nil,
        elevationLossM: Double? = nil,
        origin: String? = nil,
        destination: String? = nil,
        distanceKm: Double = 50,
        targetSpeedKmH: Double = 25,
        pacingMode: String? = "speed",
        targetEffortWatts: Double? = nil,
        urbanTrafficDelayMinutes: Double = 0,
        gateSecurityDelayMinutes: Double = 0,
        coordinates: [LatLon]? = nil,
        routeMode: String? = nil,
        originCoords: LatLon? = nil,
        destCoords: LatLon? = nil,
        radiusMeters: Double? = nil,
        gpxFileName: String? = nil,
        elevationProfile: [ElevationProfilePoint]? = nil,
        terrainSummary: TerrainSummary? = nil,
        surfaceBreakdown: SurfaceBreakdown? = nil,
        waypoints: [RouteWaypoint]? = nil,
        cueSheet: [RouteCueStep]? = nil
    ) {
        self.elevationGainM = elevationGainM
        self.elevationLossM = elevationLossM
        self.origin = origin
        self.destination = destination
        self.distanceKm = distanceKm
        self.targetSpeedKmH = targetSpeedKmH
        self.pacingMode = pacingMode
        self.targetEffortWatts = targetEffortWatts
        self.urbanTrafficDelayMinutes = urbanTrafficDelayMinutes
        self.gateSecurityDelayMinutes = gateSecurityDelayMinutes
        self.coordinates = coordinates
        self.routeMode = routeMode
        self.originCoords = originCoords
        self.destCoords = destCoords
        self.radiusMeters = radiusMeters
        self.gpxFileName = gpxFileName
        self.elevationProfile = elevationProfile
        self.terrainSummary = terrainSummary
        self.surfaceBreakdown = surfaceBreakdown
        self.waypoints = waypoints
        self.cueSheet = cueSheet
    }
}

public struct OfficeConstraints: Codable, Sendable, Equatable {
    public var deskSetupMinutes: Double?
    public var showerBufferMinutes: Double?
    public var walkFromGateMinutes: Double?
    public var shiftStartTime: String
    public var targetGateArrivalTime: String
    public var gateName: String
    public var lockerRefuelMinutes: Double
    public var showerChangeMinutes: Double
    public var breakRoomBreakfastMinutes: Double
    public var strictNoFoodInOpenSpace: Bool
    public var badgeRequiredForGate: Bool
    public var notes: String

    public init(
        deskSetupMinutes: Double? = nil,
        showerBufferMinutes: Double? = nil,
        walkFromGateMinutes: Double? = nil,
        shiftStartTime: String = "09:00",
        targetGateArrivalTime: String = "08:30",
        gateName: String = "Main Gate",
        lockerRefuelMinutes: Double = 10,
        showerChangeMinutes: Double = 10,
        breakRoomBreakfastMinutes: Double = 10,
        strictNoFoodInOpenSpace: Bool = false,
        badgeRequiredForGate: Bool = false,
        notes: String = ""
    ) {
        self.deskSetupMinutes = deskSetupMinutes
        self.showerBufferMinutes = showerBufferMinutes
        self.walkFromGateMinutes = walkFromGateMinutes
        self.shiftStartTime = shiftStartTime
        self.targetGateArrivalTime = targetGateArrivalTime
        self.gateName = gateName
        self.lockerRefuelMinutes = lockerRefuelMinutes
        self.showerChangeMinutes = showerChangeMinutes
        self.breakRoomBreakfastMinutes = breakRoomBreakfastMinutes
        self.strictNoFoodInOpenSpace = strictNoFoodInOpenSpace
        self.badgeRequiredForGate = badgeRequiredForGate
        self.notes = notes
    }
}

public struct ChecklistItem: Codable, Sendable, Equatable, Identifiable {
    public var id: String
    public var label: String
    public var category: String // "mechanics" | "gear" | "nutrition" | "logistics"
    public var checked: Bool
    public var critical: Bool
    public var isShoppingItem: Bool?

    public init(
        id: String,
        label: String,
        category: String,
        checked: Bool = false,
        critical: Bool = false,
        isShoppingItem: Bool? = nil
    ) {
        self.id = id
        self.label = label
        self.category = category
        self.checked = checked
        self.critical = critical
        self.isShoppingItem = isShoppingItem
    }
}

public struct TripStage: Codable, Sendable, Equatable, Identifiable {
    public var id: String
    public var dayNumber: Int
    public var departureDate: String
    public var departureTime: String
    public var targetMode: String? // "arrive" | "depart"
    public var route: RouteParams
    public var office: OfficeConstraints
    public var weather: WeatherCondition
    public var customChips: [String]
    public var accommodationNote: String?
    public var pinnedAmenities: [StageAmenity]?

    public init(
        id: String,
        dayNumber: Int,
        departureDate: String,
        departureTime: String,
        targetMode: String? = nil,
        route: RouteParams,
        office: OfficeConstraints,
        weather: WeatherCondition,
        customChips: [String] = [],
        accommodationNote: String? = nil,
        pinnedAmenities: [StageAmenity]? = nil
    ) {
        self.id = id
        self.dayNumber = dayNumber
        self.departureDate = departureDate
        self.departureTime = departureTime
        self.targetMode = targetMode
        self.route = route
        self.office = office
        self.weather = weather
        self.customChips = customChips
        self.accommodationNote = accommodationNote
        self.pinnedAmenities = pinnedAmenities
    }
}

public struct LogisticsSettings: Codable, Sendable, Equatable {
    public var preRideStyle: String? // "full-breakfast" | "light-liquid" | "fasted-rollout"
    public var hasDestinationFridge: Bool?
    public var splitPostRideRecovery: Bool?
    public var timelineAnchorMode: String? // "arrive-by" | "depart-at"
    public var anchorTimeHHMM: String?
    public var stage1LocationLabel: String?
    public var stage2LocationLabel: String?
    public var coffeeDurationMin: Double?
    public var cafeName: String?
    public var rationType: String?
    public var plannedLongStopMin: Double?
    public var plannedLongStopLabel: String?
    public var extraMinutes: Double?
    public var picnicDurationMin: Double?

    public init(
        preRideStyle: String? = nil,
        hasDestinationFridge: Bool? = nil,
        splitPostRideRecovery: Bool? = nil,
        timelineAnchorMode: String? = nil,
        anchorTimeHHMM: String? = nil,
        stage1LocationLabel: String? = nil,
        stage2LocationLabel: String? = nil,
        coffeeDurationMin: Double? = nil,
        cafeName: String? = nil,
        rationType: String? = nil,
        plannedLongStopMin: Double? = nil,
        plannedLongStopLabel: String? = nil,
        extraMinutes: Double? = nil,
        picnicDurationMin: Double? = nil
    ) {
        self.preRideStyle = preRideStyle
        self.hasDestinationFridge = hasDestinationFridge
        self.splitPostRideRecovery = splitPostRideRecovery
        self.timelineAnchorMode = timelineAnchorMode
        self.anchorTimeHHMM = anchorTimeHHMM
        self.stage1LocationLabel = stage1LocationLabel
        self.stage2LocationLabel = stage2LocationLabel
        self.coffeeDurationMin = coffeeDurationMin
        self.cafeName = cafeName
        self.rationType = rationType
        self.plannedLongStopMin = plannedLongStopMin
        self.plannedLongStopLabel = plannedLongStopLabel
        self.extraMinutes = extraMinutes
        self.picnicDurationMin = picnicDurationMin
    }
}

public struct TripProfile: Codable, Sendable, Equatable, Identifiable {
    public var departureDate: String?
    public var departureTime: String?
    public var id: String
    public var name: String
    public var tag: String
    public var description: String
    public var createdAt: String
    public var updatedAt: String
    public var physics: PhysicsParams
    public var route: RouteParams
    public var office: OfficeConstraints
    public var weather: WeatherCondition
    public var checklist: [ChecklistItem]
    public var customChips: [String]?
    public var ruleSettings: LogisticsSettings?
    public var arriveAtMode: Bool?
    public var stages: [TripStage]?
    public var activeStageIndex: Int?
    public var pinnedAmenities: [StageAmenity]?

    public init(
        departureDate: String? = nil,
        departureTime: String? = nil,
        id: String,
        name: String,
        tag: String,
        description: String = "",
        createdAt: String = "2026-11-15T00:00:00Z",
        updatedAt: String = "2026-11-15T00:00:00Z",
        physics: PhysicsParams = PhysicsParams(),
        route: RouteParams = RouteParams(),
        office: OfficeConstraints = OfficeConstraints(),
        weather: WeatherCondition = WeatherCondition(),
        checklist: [ChecklistItem] = [],
        customChips: [String]? = nil,
        ruleSettings: LogisticsSettings? = nil,
        arriveAtMode: Bool? = nil,
        stages: [TripStage]? = nil,
        activeStageIndex: Int? = nil,
        pinnedAmenities: [StageAmenity]? = nil
    ) {
        self.departureDate = departureDate
        self.departureTime = departureTime
        self.id = id
        self.name = name
        self.tag = tag
        self.description = description
        self.createdAt = createdAt
        self.updatedAt = updatedAt
        self.physics = physics
        self.route = route
        self.office = office
        self.weather = weather
        self.checklist = checklist
        self.customChips = customChips
        self.ruleSettings = ruleSettings
        self.arriveAtMode = arriveAtMode
        self.stages = stages
        self.activeStageIndex = activeStageIndex
        self.pinnedAmenities = pinnedAmenities
    }
}

public enum RoadSurfaceCondition: String, Codable, Sendable {
    case dry
    case damp
    case wet
}

public struct PhysicsCalculationResult: Codable, Sendable, Equatable {
    public var systemMassKg: Double
    public var groundSpeedMs: Double
    public var airSpeedMs: Double
    public var effectiveSpeedKmH: Double
    public var calmSpeedKmH: Double
    public var baselineLegWatts: Double
    public var rollingResistanceWatts: Double
    public var aerodynamicDragWatts: Double
    public var gravityWatts: Double
    public var wheelWatts: Double
    public var legWatts: Double
    public var wattsPerKg: Double
    public var ftpWatts: Double
    public var ftpPercent: Double
    public var powerZone: String // "Z1"..."Z5"
    public var pacingMode: String // "speed" | "effort"
    public var windDelayMinutes: Int
    public var movingTimeSeconds: Double
    public var movingTimeFormatted: String
    public var totalWorkKj: Double
    public var totalKcalBurn: Double
    public var carbOxidationGramPerHour: Double
    public var totalCarbsBurnedGrams: Double
    public var speedDeltaKmH: Double
    public var powerDeltaWatts: Double
    public var goStatus: String // "GO" | "CAUTION" | "NO-GO"
    public var goStatusReason: String
    public var effectiveCrr: Double
    public var crrMultiplier: Double
    public var roadCondition: RoadSurfaceCondition
    public var cautionPaceFactor: Double
    public var cautionDelayMinutes: Int
    public var cautionReasons: [String]
    public var surfaceCrrSource: String // "bike-baseline" | "osm-surface"
}
