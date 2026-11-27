import Foundation

public enum NutritionPreference: String, Codable, Sendable, CaseIterable {
    case realFood = "real-food"
    case mixed
    case sportsFuel = "sports-fuel"
}

public enum RiderLevel: String, Codable, Sendable, CaseIterable {
    case occasional
    case regular
    case pro
}

public enum CockpitViewMode: String, Codable, Sendable, CaseIterable {
    case essential
    case pro
}

public enum TelemetryMode: String, Codable, Sendable, CaseIterable {
    case quantitative
    case fuelFirst = "fuel-first"
    case intuitive
}

public enum PacingInputMode: String, Codable, Sendable, CaseIterable {
    case feel
    case power
}

public enum DietaryFilter: String, Codable, Sendable, CaseIterable, Hashable {
    case vegan
    case glutenFree = "gluten-free"
    case dairyFree = "dairy-free"
    case nutFree = "nut-free"
    case lowFodmap = "low-fodmap"
}

public enum PantrySlot: String, Codable, Sendable, CaseIterable {
    case preRide = "pre-ride"
    case onBikeLiquid = "on-bike-liquid"
    case onBikeSolid = "on-bike-solid"
    case postRideRecovery = "post-ride-recovery"
}

public enum FlavorProfile: String, Codable, Sendable, CaseIterable {
    case sweet
    case savory
    case neutral
}

public enum PressureUnit: String, Codable, Sendable, CaseIterable {
    case bar
    case psi
}

public struct PantryItem: Codable, Sendable, Equatable, Identifiable {
    public var id: String
    public var slot: PantrySlot
    public var nameEn: String
    public var nameFr: String
    public var portionLabelEn: String
    public var portionLabelFr: String
    public var carbsG: Double
    public var proteinG: Double
    public var kcal: Double
    public var flavor: FlavorProfile
    public var compliance: [String: Bool]
    public var requiresFridge: Bool?
    public var isCustom: Bool?

    public init(
        id: String,
        slot: PantrySlot,
        nameEn: String,
        nameFr: String,
        portionLabelEn: String,
        portionLabelFr: String,
        carbsG: Double,
        proteinG: Double,
        kcal: Double,
        flavor: FlavorProfile,
        compliance: [DietaryFilter: Bool],
        requiresFridge: Bool? = nil,
        isCustom: Bool? = nil
    ) {
        self.id = id
        self.slot = slot
        self.nameEn = nameEn
        self.nameFr = nameFr
        self.portionLabelEn = portionLabelEn
        self.portionLabelFr = portionLabelFr
        self.carbsG = carbsG
        self.proteinG = proteinG
        self.kcal = kcal
        self.flavor = flavor
        var map: [String: Bool] = [:]
        for (k, v) in compliance { map[k.rawValue] = v }
        self.compliance = map
        self.requiresFridge = requiresFridge
        self.isCustom = isCustom
    }

    public func isCompliant(with filter: DietaryFilter) -> Bool {
        compliance[filter.rawValue] == true
    }
}

public enum BikeCategory: String, Codable, Sendable, CaseIterable {
    case road
    case gravel
    case mtb
    case urban
    case touring
}

public enum CasingType: String, Codable, Sendable, CaseIterable {
    case supple
    case standard
    case reinforced
}

public struct BikeSpec: Codable, Sendable, Equatable, Identifiable {
    public var id: String
    public var name: String
    public var weightKg: Double
    public var crr: Double
    public var cda: Double
    public var isTubeless: Bool
    public var tireWidthMm: Double?
    public var bikeCategory: BikeCategory?
    public var casingType: CasingType?
    public var isHookless: Bool?

    public init(
        id: String,
        name: String,
        weightKg: Double,
        crr: Double,
        cda: Double,
        isTubeless: Bool,
        tireWidthMm: Double? = nil,
        bikeCategory: BikeCategory? = nil,
        casingType: CasingType? = nil,
        isHookless: Bool? = nil
    ) {
        self.id = id
        self.name = name
        self.weightKg = weightKg
        self.crr = crr
        self.cda = cda
        self.isTubeless = isTubeless
        self.tireWidthMm = tireWidthMm
        self.bikeCategory = bikeCategory
        self.casingType = casingType
        self.isHookless = isHookless
    }
}

public struct BikeCategoryDefault: Sendable, Equatable {
    public let tireWidthMm: Double
    public let crr: Double
    public let cda: Double
    public let isTubeless: Bool
    public let casingType: CasingType
    public let weightKg: Double
}

public enum BikeSpecsCatalog {
    public static let categoryDefaults: [BikeCategory: BikeCategoryDefault] = [
        .road: BikeCategoryDefault(tireWidthMm: 28, crr: 0.0040, cda: 0.32, isTubeless: true, casingType: .supple, weightKg: 8.2),
        .gravel: BikeCategoryDefault(tireWidthMm: 38, crr: 0.0055, cda: 0.38, isTubeless: true, casingType: .standard, weightKg: 10.2),
        .urban: BikeCategoryDefault(tireWidthMm: 40, crr: 0.0070, cda: 0.44, isTubeless: false, casingType: .reinforced, weightKg: 12.8),
        .touring: BikeCategoryDefault(tireWidthMm: 42, crr: 0.0062, cda: 0.45, isTubeless: false, casingType: .reinforced, weightKg: 13.5),
        .mtb: BikeCategoryDefault(tireWidthMm: 54, crr: 0.0075, cda: 0.48, isTubeless: true, casingType: .standard, weightKg: 12.0),
    ]

    public static func estimateCrrFromTire(
        tireWidthMm: Double,
        isTubeless: Bool,
        casingType: CasingType = .standard
    ) -> Double {
        let w = max(23.0, min(65.0, tireWidthMm.isFinite ? tireWidthMm : 38.0))
        let base: Double
        if w <= 26 { base = 0.0042 }
        else if w <= 31 { base = 0.0045 }
        else if w <= 36 { base = 0.0052 }
        else if w <= 41 { base = 0.0058 }
        else if w <= 47 { base = 0.0068 }
        else { base = 0.0076 }

        let tubelessDelta = isTubeless ? -0.0005 : 0.0005
        let casingDelta: Double = casingType == .supple ? -0.0003 : (casingType == .reinforced ? 0.0006 : 0.0)
        return JSCompat.roundTo(max(0.0034, min(0.0105, base + tubelessDelta + casingDelta)), decimals: 4)
    }

    public static func resolveBikeTireWidthMm(_ bike: BikeSpec?) -> Double {
        if let w = bike?.tireWidthMm, w.isFinite, w >= 23, w <= 65 {
            return JSCompat.jsRound(w)
        }
        if let cat = bike?.bikeCategory, let def = categoryDefaults[cat] {
            return def.tireWidthMm
        }
        if let crr = bike?.crr, crr.isFinite {
            if crr <= 0.0045 { return 28 }
            if crr <= 0.0062 { return 38 }
            return 42
        }
        return 38
    }

    public static func getActiveBike(_ specs: RiderBikeSpecs) -> BikeSpec {
        specs.bikes.first { $0.id == specs.activeBikeId } ?? specs.bikes.first ?? RiderBikeSpecs.defaultBikes[0]
    }

    public static func getEffectiveRiderSpecs(_ specs: RiderBikeSpecs) -> RiderBikeSpecs {
        specs.effectiveRiderSpecs()
    }
}

public struct RiderBikeSpecs: Codable, Sendable, Equatable {
    public var riderName: String?
    public var riderWeightKg: Double
    public var riderHeightCm: Double
    public var ftpWatts: Double
    public var carbTargetGPerHr: Double
    public var carbPacingMode: String? // "auto" | "locked"
    public var sweatRateLPerHr: Double?
    public var sweatSodiumMgPerL: Double?
    public var nutritionPreference: NutritionPreference
    public var dietaryFilters: [DietaryFilter]?
    public var activePantryIds: [String]?
    public var customPantryItems: [PantryItem]?
    public var riderLevel: RiderLevel
    public var cockpitViewMode: CockpitViewMode?
    public var telemetryMode: TelemetryMode?
    public var pacingInputMode: PacingInputMode?
    public var bidonSizeMl: Int?
    public var frameBottleSlots: Int?
    public var pressureUnit: PressureUnit?
    public var liquidCarbRatio: Double?
    public var autoModulateLiquidInHeatOrEffort: Bool?
    public var enableSavoryPalateResets: Bool?
    public var activeBikeId: String
    public var bikes: [BikeSpec]

    public init(
        riderName: String? = nil,
        riderWeightKg: Double = 68,
        riderHeightCm: Double = 178,
        ftpWatts: Double = 210,
        carbTargetGPerHr: Double = 60,
        carbPacingMode: String? = nil,
        sweatRateLPerHr: Double? = nil,
        sweatSodiumMgPerL: Double? = nil,
        nutritionPreference: NutritionPreference = .realFood,
        dietaryFilters: [DietaryFilter]? = [],
        activePantryIds: [String]? = RiderBikeSpecs.defaultActivePantryIds,
        customPantryItems: [PantryItem]? = [],
        riderLevel: RiderLevel = .regular,
        cockpitViewMode: CockpitViewMode? = .essential,
        telemetryMode: TelemetryMode? = .fuelFirst,
        pacingInputMode: PacingInputMode? = .feel,
        bidonSizeMl: Int? = 650,
        frameBottleSlots: Int? = 2,
        pressureUnit: PressureUnit? = .bar,
        liquidCarbRatio: Double? = 0.35,
        autoModulateLiquidInHeatOrEffort: Bool? = true,
        enableSavoryPalateResets: Bool? = true,
        activeBikeId: String = "bike-sword",
        bikes: [BikeSpec] = RiderBikeSpecs.defaultBikes
    ) {
        self.riderName = riderName
        self.riderWeightKg = riderWeightKg
        self.riderHeightCm = riderHeightCm
        self.ftpWatts = ftpWatts
        self.carbTargetGPerHr = carbTargetGPerHr
        self.carbPacingMode = carbPacingMode
        self.sweatRateLPerHr = sweatRateLPerHr
        self.sweatSodiumMgPerL = sweatSodiumMgPerL
        self.nutritionPreference = nutritionPreference
        self.dietaryFilters = dietaryFilters
        self.activePantryIds = activePantryIds
        self.customPantryItems = customPantryItems
        self.riderLevel = riderLevel
        self.cockpitViewMode = cockpitViewMode
        self.telemetryMode = telemetryMode
        self.pacingInputMode = pacingInputMode
        self.bidonSizeMl = bidonSizeMl
        self.frameBottleSlots = frameBottleSlots
        self.pressureUnit = pressureUnit
        self.liquidCarbRatio = liquidCarbRatio
        self.autoModulateLiquidInHeatOrEffort = autoModulateLiquidInHeatOrEffort
        self.enableSavoryPalateResets = enableSavoryPalateResets
        self.activeBikeId = activeBikeId
        self.bikes = bikes
    }

    public static let defaultActivePantryIds: [String] = [
        "pre-baguette-honey",
        "liq-pressed-apple-grape",
        "sol-medjool-date",
        "sol-fruit-chew-fig",
        "rec-skyr-grape",
    ]

    public static let defaultBikes: [BikeSpec] = [
        BikeSpec(id: "bike-sword", name: "Van Rysel GRVL AF SWORD", weightKg: 10.9, crr: 0.0055, cda: 0.38, isTubeless: true, tireWidthMm: 38, bikeCategory: .gravel, casingType: .standard, isHookless: false),
        BikeSpec(id: "bike-aeroad", name: "Canyon Aeroad CF SLX", weightKg: 7.6, crr: 0.0040, cda: 0.32, isTubeless: true, tireWidthMm: 28, bikeCategory: .road, casingType: .supple, isHookless: true),
        BikeSpec(id: "bike-urban", name: "Omnium Urban Utility", weightKg: 12.8, crr: 0.0070, cda: 0.44, isTubeless: false, tireWidthMm: 42, bikeCategory: .urban, casingType: .reinforced, isHookless: false),
    ]

    public static let defaultSpecs = RiderBikeSpecs()

    public func effectiveRiderSpecs() -> RiderBikeSpecs {
        let mode = telemetryMode ?? .quantitative
        let pacingMode = pacingInputMode ?? .feel
        let userEnteredFtp = (ftpWatts.isFinite && ftpWatts >= 80) ? ftpWatts : 210
        let baselineFtp: Double = riderLevel == .occasional ? 160 : (riderLevel == .pro ? 280 : 210)
        let effectiveFtp = (pacingMode == .power || mode == .quantitative) ? userEnteredFtp : baselineFtp

        var copy = self
        copy.telemetryMode = mode
        copy.ftpWatts = effectiveFtp
        copy.bidonSizeMl = bidonSizeMl ?? 650
        copy.frameBottleSlots = frameBottleSlots ?? 2
        copy.pressureUnit = pressureUnit == .psi ? .psi : .bar
        copy.liquidCarbRatio = liquidCarbRatio ?? 0.35
        copy.autoModulateLiquidInHeatOrEffort = autoModulateLiquidInHeatOrEffort ?? true
        copy.enableSavoryPalateResets = enableSavoryPalateResets ?? true
        copy.dietaryFilters = dietaryFilters ?? []
        copy.activePantryIds = activePantryIds ?? Self.defaultActivePantryIds
        copy.customPantryItems = customPantryItems ?? []

        if mode == .quantitative {
            copy.riderWeightKg = (riderWeightKg.isFinite && riderWeightKg > 25) ? riderWeightKg : 68
        } else {
            copy.riderWeightKg = (pacingMode == .power && riderWeightKg.isFinite && riderWeightKg > 25) ? riderWeightKg : 68
            copy.carbTargetGPerHr = (mode == .intuitive) ? 60 : carbTargetGPerHr
        }
        return copy
    }
}

public typealias RiderSpecs = RiderBikeSpecs
