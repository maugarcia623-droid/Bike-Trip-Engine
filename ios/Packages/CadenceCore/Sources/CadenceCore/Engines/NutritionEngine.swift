import Foundation

public struct NutritionItem: Codable, Sendable, Equatable {
    public var name: String
    public var quantity: String
    public var carbsGrams: Double
    public var proteinGrams: Double
    public var fatsGrams: Double
    public var kcals: Double
    public var quantitativeLabel: String?
    public var portionLabel: String?
    public var notes: String
    public var isRealFoodVerified: Bool
    public var isLiquid: Bool?
    public var isSavoryReset: Bool?
    public var unitCount: Int?

    public init(
        name: String,
        quantity: String,
        carbsGrams: Double,
        proteinGrams: Double,
        fatsGrams: Double,
        kcals: Double,
        quantitativeLabel: String? = nil,
        portionLabel: String? = nil,
        notes: String,
        isRealFoodVerified: Bool,
        isLiquid: Bool? = nil,
        isSavoryReset: Bool? = nil,
        unitCount: Int? = nil
    ) {
        self.name = name
        self.quantity = quantity
        self.carbsGrams = carbsGrams
        self.proteinGrams = proteinGrams
        self.fatsGrams = fatsGrams
        self.kcals = kcals
        self.quantitativeLabel = quantitativeLabel
        self.portionLabel = portionLabel
        self.notes = notes
        self.isRealFoodVerified = isRealFoodVerified
        self.isLiquid = isLiquid
        self.isSavoryReset = isSavoryReset
        self.unitCount = unitCount
    }
}

public struct NutritionPhase: Codable, Sendable, Equatable {
    public var phaseId: String
    public var title: String
    public var timeWindow: String
    public var location: String
    public var rules: String
    public var items: [NutritionItem]

    public init(
        phaseId: String,
        title: String,
        timeWindow: String,
        location: String,
        rules: String,
        items: [NutritionItem]
    ) {
        self.phaseId = phaseId
        self.title = title
        self.timeWindow = timeWindow
        self.location = location
        self.rules = rules
        self.items = items
    }
}

public enum PacingTier: String, Codable, Sendable {
    case shortHydrationOnly = "short-hydration-only"
    case lightCruising = "light-cruising"
    case steadyEndurance = "steady-endurance"
    case highOutput = "high-output"
    case emergencySurge = "emergency-surge"
}

public struct IntensityModulatedCarbTargetParams: Codable, Sendable {
    public var rideHours: Double
    public var pctFtp: Double
    public var carbOxidationGramPerHour: Double
    public var gutCeilingGPerHr: Double
    public var totalDays: Int?
    public var activeChips: [String]?
    public var isLockedCarbTarget: Bool?

    public init(
        rideHours: Double,
        pctFtp: Double,
        carbOxidationGramPerHour: Double,
        gutCeilingGPerHr: Double,
        totalDays: Int? = 1,
        activeChips: [String]? = nil,
        isLockedCarbTarget: Bool? = false
    ) {
        self.rideHours = rideHours
        self.pctFtp = pctFtp
        self.carbOxidationGramPerHour = carbOxidationGramPerHour
        self.gutCeilingGPerHr = gutCeilingGPerHr
        self.totalDays = totalDays
        self.activeChips = activeChips
        self.isLockedCarbTarget = isLockedCarbTarget
    }
}

public struct IntensityModulatedCarbTargetResult: Codable, Sendable, Equatable {
    public var recommendedGPerHr: Double
    public var effectiveCeilingGPerHr: Double
    public var targetOnBikeCarbsG: Double
    public var pacingTier: PacingTier
    public var effectiveHourlyRateG: Double
    public var durationFactor: Double
    public var exoShare: Double
    public var rawDemandGPerHr: Double
}

public struct BottomUpPortionCounts: Codable, Sendable, Equatable {
    public var juiceBidons: Int
    public var datesCount: Int
    public var chewsCount: Int
    public var gelsCount: Int
    public var isoBidons: Int
    public var totalCarbsG: Double
    public var totalKcal: Double
}

public struct HydrationPlanParams: Codable, Sendable {
    public var rideHours: Double
    public var tempC: Double?
    public var legWatts: Double?
    public var bidonSizeMl: Double?
    public var frameBottleSlots: Int?
    public var isShortRide: Bool?
    public var activeChips: [String]?

    public init(
        rideHours: Double,
        tempC: Double? = nil,
        legWatts: Double? = nil,
        bidonSizeMl: Double? = nil,
        frameBottleSlots: Int? = nil,
        isShortRide: Bool? = nil,
        activeChips: [String]? = nil
    ) {
        self.rideHours = rideHours
        self.tempC = tempC
        self.legWatts = legWatts
        self.bidonSizeMl = bidonSizeMl
        self.frameBottleSlots = frameBottleSlots
        self.isShortRide = isShortRide
        self.activeChips = activeChips
    }
}

public struct HydrationPlanResult: Codable, Sendable, Equatable {
    public var sweatRateMlPerHr: Int
    public var targetFluidMlPerHr: Int
    public var totalFluidNeedMl: Int
    public var totalBidonsNeeded: Int
    public var carriedOnFrameBidons: Int
    public var plannedRefillBidons: Int
    public var sodiumMgPerL: Int
    public var bidonSizeMl: Double
}

public struct FuelSplitParams: Codable, Sendable {
    public var rideHours: Double
    public var pctFtp: Double?
    public var tempC: Double?
    public var liquidCarbRatio: Double?
    public var autoModulateLiquidInHeatOrEffort: Bool?
    public var enableSavoryPalateResets: Bool?
    public var isMultiDayTour: Bool?

    public init(
        rideHours: Double,
        pctFtp: Double? = nil,
        tempC: Double? = nil,
        liquidCarbRatio: Double? = nil,
        autoModulateLiquidInHeatOrEffort: Bool? = nil,
        enableSavoryPalateResets: Bool? = nil,
        isMultiDayTour: Bool? = nil
    ) {
        self.rideHours = rideHours
        self.pctFtp = pctFtp
        self.tempC = tempC
        self.liquidCarbRatio = liquidCarbRatio
        self.autoModulateLiquidInHeatOrEffort = autoModulateLiquidInHeatOrEffort
        self.enableSavoryPalateResets = enableSavoryPalateResets
        self.isMultiDayTour = isMultiDayTour
    }
}

public struct EffectiveFuelSplitResult: Codable, Sendable, Equatable {
    public var baselineLiquidRatio: Double
    public var effectiveLiquidRatio: Double
    public var intensityShift: Double
    public var heatShift: Double
    public var isLiquidShifted: Bool
    public var liquidShiftPct: Int
    public var savoryResetCount: Int
}

public struct RealFoodNutritionPlanOptions: Sendable {
    public var carbTargetGPerHr: Double?
    public var isLockedCarbTarget: Bool?
    public var carbPacingMode: String?
    public var riderLevel: RiderLevel?
    public var rideHours: Double?
    public var nutritionPreference: NutritionPreference?
    public var pctFtp: Double?
    public var carbOxidationGramPerHour: Double?
    public var totalDays: Int?
    public var activeChips: [String]?
    public var compliantPantry: ResolvedCompliantPantry?
    public var logistics: LogisticsSettings?
    public var solvedTimeline: SolvedTripTimeline?
    public var tempC: Double?
    public var legWatts: Double?
    public var bidonSizeMl: Double?
    public var frameBottleSlots: Int?
    public var hydrationPlan: HydrationPlanResult?
    public var fuelSplit: EffectiveFuelSplitResult?

    public init(
        carbTargetGPerHr: Double? = nil,
        isLockedCarbTarget: Bool? = nil,
        carbPacingMode: String? = nil,
        riderLevel: RiderLevel? = nil,
        rideHours: Double? = nil,
        nutritionPreference: NutritionPreference? = nil,
        pctFtp: Double? = nil,
        carbOxidationGramPerHour: Double? = nil,
        totalDays: Int? = nil,
        activeChips: [String]? = nil,
        compliantPantry: ResolvedCompliantPantry? = nil,
        logistics: LogisticsSettings? = nil,
        solvedTimeline: SolvedTripTimeline? = nil,
        tempC: Double? = nil,
        legWatts: Double? = nil,
        bidonSizeMl: Double? = nil,
        frameBottleSlots: Int? = nil,
        hydrationPlan: HydrationPlanResult? = nil,
        fuelSplit: EffectiveFuelSplitResult? = nil
    ) {
        self.carbTargetGPerHr = carbTargetGPerHr
        self.isLockedCarbTarget = isLockedCarbTarget
        self.carbPacingMode = carbPacingMode
        self.riderLevel = riderLevel
        self.rideHours = rideHours
        self.nutritionPreference = nutritionPreference
        self.pctFtp = pctFtp
        self.carbOxidationGramPerHour = carbOxidationGramPerHour
        self.totalDays = totalDays
        self.activeChips = activeChips
        self.compliantPantry = compliantPantry
        self.logistics = logistics
        self.solvedTimeline = solvedTimeline
        self.tempC = tempC
        self.legWatts = legWatts
        self.bidonSizeMl = bidonSizeMl
        self.frameBottleSlots = frameBottleSlots
        self.hydrationPlan = hydrationPlan
        self.fuelSplit = fuelSplit
    }
}

public enum NutritionEngine {
    public static let juiceBidonCarbsG: Double = 36
    public static let juiceBidonKcal: Double = 145
    public static let medjoolDateCarbsG: Double = 17
    public static let medjoolDateKcal: Double = 68
    public static let fruitChewCarbsG: Double = 12
    public static let fruitChewKcal: Double = 48
    public static let energyGelCarbsG: Double = 25
    public static let energyGelKcal: Double = 100
    public static let isotonicBidonCarbsG: Double = 36
    public static let isotonicBidonKcal: Double = 144

    public static func calculateIntensityModulatedCarbTarget(
        _ params: IntensityModulatedCarbTargetParams
    ) -> IntensityModulatedCarbTargetResult {
        let totalDays = params.totalDays ?? 1
        let activeChips = params.activeChips ?? []
        let isLocked = params.isLockedCarbTarget ?? false

        let gutCeiling = max(25.0, min(120.0, params.gutCeilingGPerHr))
        let durationFactor = min(1.0, max(0.55, 0.45 + 0.18 * params.rideHours))
        var exoShare = min(0.75, max(0.35, 0.25 + (params.pctFtp / 100.0) * 0.45))
        if activeChips.contains("fitness-boost") || activeChips.contains("climbing-kom-hunt") {
            exoShare = min(0.80, exoShare + 0.08)
        }

        let effectiveCeiling = params.pctFtp > 105 ? min(120.0, gutCeiling + 20.0) : gutCeiling
        let rawDemand = JSCompat.jsRound(params.carbOxidationGramPerHour * exoShare * durationFactor)

        if isLocked {
            let lockedRate = effectiveCeiling
            let lockedTotal = JSCompat.jsRound(lockedRate * max(0.5, params.rideHours))
            let tier: PacingTier
            if params.pctFtp > 105 { tier = .emergencySurge }
            else if lockedRate >= 75 || exoShare >= 0.70 { tier = .highOutput }
            else if lockedRate >= 45 { tier = .steadyEndurance }
            else { tier = .lightCruising }

            return IntensityModulatedCarbTargetResult(
                recommendedGPerHr: lockedRate,
                effectiveCeilingGPerHr: effectiveCeiling,
                targetOnBikeCarbsG: lockedTotal,
                pacingTier: tier,
                effectiveHourlyRateG: lockedRate,
                durationFactor: durationFactor,
                exoShare: exoShare,
                rawDemandGPerHr: rawDemand
            )
        }

        if params.rideHours < 0.75 && totalDays == 1 {
            return IntensityModulatedCarbTargetResult(
                recommendedGPerHr: 0,
                effectiveCeilingGPerHr: gutCeiling,
                targetOnBikeCarbsG: 0,
                pacingTier: .shortHydrationOnly,
                effectiveHourlyRateG: 0,
                durationFactor: 0.55,
                exoShare: 0.35,
                rawDemandGPerHr: 0
            )
        }

        let recommendedGPerHr = min(effectiveCeiling, max(25.0, rawDemand))
        let targetOnBikeCarbsG = max(25.0, JSCompat.jsRound(recommendedGPerHr * params.rideHours))

        let tier: PacingTier
        if params.pctFtp > 105 { tier = .emergencySurge }
        else if recommendedGPerHr >= 75 || exoShare >= 0.70 { tier = .highOutput }
        else if recommendedGPerHr >= 45 { tier = .steadyEndurance }
        else { tier = .lightCruising }

        return IntensityModulatedCarbTargetResult(
            recommendedGPerHr: recommendedGPerHr,
            effectiveCeilingGPerHr: effectiveCeiling,
            targetOnBikeCarbsG: targetOnBikeCarbsG,
            pacingTier: tier,
            effectiveHourlyRateG: recommendedGPerHr,
            durationFactor: durationFactor,
            exoShare: exoShare,
            rawDemandGPerHr: rawDemand
        )
    }

    public static func calculateDynamicCarbTarget(
        rideHours: Double,
        pctFtp: Double,
        carbOxidationGramPerHour: Double,
        gutCeilingGPerHr: Double,
        totalDays: Int = 1,
        activeChips: [String] = []
    ) -> IntensityModulatedCarbTargetResult {
        calculateIntensityModulatedCarbTarget(IntensityModulatedCarbTargetParams(
            rideHours: rideHours,
            pctFtp: pctFtp,
            carbOxidationGramPerHour: carbOxidationGramPerHour,
            gutCeilingGPerHr: gutCeilingGPerHr,
            totalDays: totalDays,
            activeChips: activeChips
        ))
    }

    public static func getBottomUpPortionCounts(
        targetOnBikeCarbsG: Double,
        preference: NutritionPreference,
        rideHours: Double = 1.5
    ) -> BottomUpPortionCounts {
        if targetOnBikeCarbsG <= 0 {
            return BottomUpPortionCounts(
                juiceBidons: 0, datesCount: 0, chewsCount: 0, gelsCount: 0, isoBidons: 0,
                totalCarbsG: 0, totalKcal: 0
            )
        }

        if preference == .sportsFuel {
            let isoBidons = max(1, JSCompat.jsRoundInt((targetOnBikeCarbsG * 0.55) / isotonicBidonCarbsG))
            let remainingGelCarbs = max(0.0, targetOnBikeCarbsG - Double(isoBidons) * isotonicBidonCarbsG)
            let gelsCount = max(1, JSCompat.jsRoundInt(remainingGelCarbs / energyGelCarbsG))
            let totalCarbsG = Double(isoBidons) * isotonicBidonCarbsG + Double(gelsCount) * energyGelCarbsG
            let totalKcal = Double(isoBidons) * isotonicBidonKcal + Double(gelsCount) * energyGelKcal
            return BottomUpPortionCounts(
                juiceBidons: 0, datesCount: 0, chewsCount: 0, gelsCount: gelsCount, isoBidons: isoBidons,
                totalCarbsG: totalCarbsG, totalKcal: totalKcal
            )
        }

        let juiceBidons = max(1, JSCompat.jsRoundInt((targetOnBikeCarbsG * 0.32) / juiceBidonCarbsG))
        let remainingSolidCarbs = max(0.0, targetOnBikeCarbsG - Double(juiceBidons) * juiceBidonCarbsG)
        let datesCount = max(0, JSCompat.jsRoundInt((remainingSolidCarbs * 0.45) / medjoolDateCarbsG))
        let remainingSolidAfterDates = max(0.0, remainingSolidCarbs - Double(datesCount) * medjoolDateCarbsG)

        if preference == .mixed {
            var gelsCount = JSCompat.jsRoundInt(remainingSolidAfterDates / energyGelCarbsG)
            if targetOnBikeCarbsG >= 60 {
                gelsCount = max(1, gelsCount)
            } else {
                gelsCount = max(0, gelsCount)
            }
            let totalCarbsG = Double(juiceBidons) * juiceBidonCarbsG + Double(datesCount) * medjoolDateCarbsG + Double(gelsCount) * energyGelCarbsG
            let totalKcal = Double(juiceBidons) * juiceBidonKcal + Double(datesCount) * medjoolDateKcal + Double(gelsCount) * energyGelKcal
            return BottomUpPortionCounts(
                juiceBidons: juiceBidons, datesCount: datesCount, chewsCount: 0, gelsCount: gelsCount, isoBidons: 0,
                totalCarbsG: totalCarbsG, totalKcal: totalKcal
            )
        }

        let chewsCount = max(0, JSCompat.jsRoundInt(remainingSolidAfterDates / fruitChewCarbsG))
        let totalCarbsG = Double(juiceBidons) * juiceBidonCarbsG + Double(datesCount) * medjoolDateCarbsG + Double(chewsCount) * fruitChewCarbsG
        let totalKcal = Double(juiceBidons) * juiceBidonKcal + Double(datesCount) * medjoolDateKcal + Double(chewsCount) * fruitChewKcal
        return BottomUpPortionCounts(
            juiceBidons: juiceBidons, datesCount: datesCount, chewsCount: chewsCount, gelsCount: 0, isoBidons: 0,
            totalCarbsG: totalCarbsG, totalKcal: totalKcal
        )
    }

    public static func calculateHydrationPlan(_ params: HydrationPlanParams) -> HydrationPlanResult {
        let rideHours = max(0.1, params.rideHours)
        let tempC = params.tempC ?? 18.0
        let legWatts = max(0.0, params.legWatts ?? 150.0)
        let bidonSizeMl = params.bidonSizeMl ?? 650.0
        let frameBottleSlots = max(1, params.frameBottleSlots ?? 2)
        let isShortRide = params.isShortRide ?? (rideHours < 0.75)
        let activeChips = params.activeChips ?? []

        if isShortRide {
            return HydrationPlanResult(
                sweatRateMlPerHr: 0,
                targetFluidMlPerHr: 0,
                totalFluidNeedMl: 450,
                totalBidonsNeeded: 1,
                carriedOnFrameBidons: 1,
                plannedRefillBidons: 0,
                sodiumMgPerL: 0,
                bidonSizeMl: bidonSizeMl
            )
        }

        let thermalSweat = 18.0 * max(0.0, tempC - 10.0)
        let metabolicSweat = 1.15 * legWatts
        let sweatRateMlPerHr = min(1400, max(350, JSCompat.jsRoundInt(400.0 + thermalSweat + metabolicSweat)))
        let targetFluidMlPerHr = JSCompat.jsRoundInt(Double(sweatRateMlPerHr) * 0.80)

        let totalFluidNeedMl = JSCompat.jsRoundInt(Double(targetFluidMlPerHr) * rideHours)
        let totalBidonsNeeded = max(1, Int(ceil(Double(totalFluidNeedMl) / bidonSizeMl)))
        let carriedOnFrameBidons = min(frameBottleSlots, totalBidonsNeeded)
        let plannedRefillBidons = max(0, totalBidonsNeeded - carriedOnFrameBidons)

        let isHighSodium = tempC >= 24 || sweatRateMlPerHr >= 850 || activeChips.contains("hydration-electrolytes")
        let sodiumMgPerL = isHighSodium ? 750 : 500

        return HydrationPlanResult(
            sweatRateMlPerHr: sweatRateMlPerHr,
            targetFluidMlPerHr: targetFluidMlPerHr,
            totalFluidNeedMl: totalFluidNeedMl,
            totalBidonsNeeded: totalBidonsNeeded,
            carriedOnFrameBidons: carriedOnFrameBidons,
            plannedRefillBidons: plannedRefillBidons,
            sodiumMgPerL: sodiumMgPerL,
            bidonSizeMl: bidonSizeMl
        )
    }

    public static func resolveEffectiveFuelSplit(_ params: FuelSplitParams) -> EffectiveFuelSplitResult {
        let baselineLiquidRatio = min(0.85, max(0.15, params.liquidCarbRatio ?? 0.35))
        let autoModulate = params.autoModulateLiquidInHeatOrEffort != false
        let pctFtp = params.pctFtp ?? 72.0
        let tempC = params.tempC ?? 18.0
        let rideHours = max(0.1, params.rideHours)

        var intensityShift = 0.0
        var heatShift = 0.0

        if autoModulate {
            if pctFtp > 105 { intensityShift = 0.30 }
            else if pctFtp >= 85 { intensityShift = 0.20 }
            else if pctFtp >= 80 { intensityShift = 0.10 }

            if tempC >= 31 { heatShift = 0.15 }
            else if tempC >= 26 { heatShift = 0.10 }
        }

        let effectiveLiquidRatio = min(
            0.85,
            max(0.15, JSCompat.jsRound((baselineLiquidRatio + intensityShift + heatShift) * 100.0) / 100.0)
        )
        let isLiquidShifted = effectiveLiquidRatio > baselineLiquidRatio
        let liquidShiftPct = JSCompat.jsRoundInt((effectiveLiquidRatio - baselineLiquidRatio) * 100.0)

        var savoryResetCount = 0
        if params.isMultiDayTour == true && params.enableSavoryPalateResets != false && rideHours >= 2.5 {
            if pctFtp < 90 {
                savoryResetCount = Int(floor(rideHours / 1.5))
            } else if rideHours >= 3.5 {
                savoryResetCount = 1
            }
        }

        return EffectiveFuelSplitResult(
            baselineLiquidRatio: baselineLiquidRatio,
            effectiveLiquidRatio: effectiveLiquidRatio,
            intensityShift: intensityShift,
            heatShift: heatShift,
            isLiquidShifted: isLiquidShifted,
            liquidShiftPct: liquidShiftPct,
            savoryResetCount: savoryResetCount
        )
    }

    public static func scalePortionLabel(_ label: String, units: Int) -> String {
        if units <= 1 { return label }
        let regex = try? NSRegularExpression(pattern: #"^(\d+)\s+(.*)$"#)
        let range = NSRange(location: 0, length: label.utf16.count)
        if let match = regex?.firstMatch(in: label, options: [], range: range),
           let r1 = Range(match.range(at: 1), in: label),
           let r2 = Range(match.range(at: 2), in: label),
           let baseCount = Int(label[r1]) {
            let rest = String(label[r2])
            if baseCount > 1 { return "\(baseCount * units) \(rest)" }
            return "\(rest) × \(units)"
        }
        return "\(label) × \(units)"
    }

    public static func formatBottlePlan(
        carbBottles: Int,
        waterBottles: Int,
        liquidItem: PantryItem,
        lang: CadenceLang,
        bidonSizeMl: Int? = nil
    ) -> String {
        let isFr = lang == .fr
        let sizeSuffix = bidonSizeMl.map { " (\($0) ml)" } ?? ""
        let rawLabel = isFr ? liquidItem.portionLabelFr : liquidItem.portionLabelEn
        let noun = rawLabel.replacingOccurrences(of: #"^1\s+(bottle|bidon)\s+"#, with: "", options: [.regularExpression, .caseInsensitive])
        let hasPrefix = noun != rawLabel

        let carbPart: String
        if carbBottles > 0 {
            if isFr {
                carbPart = hasPrefix ? "\(carbBottles) bidon\(carbBottles > 1 ? "s" : "") \(noun)" : "\(carbBottles) × \(rawLabel)"
            } else {
                carbPart = hasPrefix ? "\(carbBottles) bottle\(carbBottles > 1 ? "s" : "") of \(noun)" : "\(carbBottles) × \(rawLabel)"
            }
        } else {
            carbPart = ""
        }

        let waterPart: String
        if waterBottles > 0 {
            waterPart = isFr
                ? "\(waterBottles) bidon\(waterBottles > 1 ? "s" : "") d’eau"
                : "\(waterBottles) bottle\(waterBottles > 1 ? "s" : "") of water"
        } else {
            waterPart = ""
        }

        return [carbPart, waterPart].filter { !$0.isEmpty }.joined(separator: " + ") + sizeSuffix
    }

    public static func allocatePhase2OnBikeItems(
        targetOnBikeCarbsG: Double,
        preference: NutritionPreference,
        rideHours: Double,
        lang: CadenceLang = .en,
        hydrationPlan: HydrationPlanResult? = nil,
        fuelSplit: EffectiveFuelSplitResult? = nil,
        riderSpecs: RiderBikeSpecs = .defaultSpecs
    ) -> [NutritionItem] {
        let isFr = lang == .fr
        let bidonSizeMl = Int(hydrationPlan?.bidonSizeMl ?? 650)

        if targetOnBikeCarbsG <= 0 {
            return [
                NutritionItem(
                    name: isFr ? "Eau Pure & Électrolytes" : "Pure Water & Electrolytes",
                    quantity: isFr ? "1× Bidon \(bidonSizeMl) ml (450 ml cible)" : "1× \(bidonSizeMl) ml bottle (450 ml target)",
                    carbsGrams: 0,
                    proteinGrams: 0,
                    fatsGrams: 0,
                    kcals: 0,
                    quantitativeLabel: isFr ? "Eau pure & électrolytes (0 g C)" : "Pure water & electrolytes (0 g C)",
                    portionLabel: isFr ? "1 bidon d’eau" : "1 bottle water",
                    notes: isFr ? "Hydratation seule pour une sortie courte (< 45 min)." : "Just water for a short ride (under 45 min).",
                    isRealFoodVerified: true,
                    isLiquid: true
                )
            ]
        }

        let counts = getBottomUpPortionCounts(targetOnBikeCarbsG: targetOnBikeCarbsG, preference: preference, rideHours: rideHours)
        var items: [NutritionItem] = []

        if preference == .sportsFuel {
            if counts.isoBidons > 0 {
                let totalBidonsNeeded = hydrationPlan?.totalBidonsNeeded ?? counts.isoBidons
                let liquidCarbBidons = min(totalBidonsNeeded, counts.isoBidons)
                let pureWaterBidons = max(0, totalBidonsNeeded - liquidCarbBidons)
                items.append(NutritionItem(
                    name: isFr ? "Boisson Glucidique Isotonique + Électrolytes" : "Isotonic Carb Drink Mix + Electrolytes",
                    quantity: pureWaterBidons > 0
                        ? (isFr ? "\(liquidCarbBidons)× Bidon Glucidique (\(bidonSizeMl) ml) + \(pureWaterBidons)× Bidon\(pureWaterBidons > 1 ? "s" : "") Eau/Électrolytes (\(bidonSizeMl) ml)" : "\(liquidCarbBidons)× Carbohydrate Bottle (\(bidonSizeMl) ml) + \(pureWaterBidons)× Pure/Electrolyte Water Bottle\(pureWaterBidons > 1 ? "s" : "") (\(bidonSizeMl) ml)")
                        : (isFr ? "\(liquidCarbBidons)× Bidon\(liquidCarbBidons > 1 ? "s" : "") \(bidonSizeMl) ml" : "\(liquidCarbBidons)× \(bidonSizeMl) ml bottle\(liquidCarbBidons > 1 ? "s" : "")"),
                    carbsGrams: Double(liquidCarbBidons) * isotonicBidonCarbsG,
                    proteinGrams: 0,
                    fatsGrams: 0,
                    kcals: Double(liquidCarbBidons) * isotonicBidonKcal,
                    quantitativeLabel: isFr
                        ? "Boisson glucidique isotonique (\(liquidCarbBidons * Int(isotonicBidonCarbsG)) g C)"
                        : "Isotonic carb mix (\(liquidCarbBidons * Int(isotonicBidonCarbsG)) g C)",
                    portionLabel: pureWaterBidons > 0
                        ? (isFr ? "\(liquidCarbBidons)× Bidon glucidique + \(pureWaterBidons)× Bidon\(pureWaterBidons > 1 ? "s" : "") eau/électrolytes" : "\(liquidCarbBidons)× Carbohydrate Bottle + \(pureWaterBidons)× Water Bottle\(pureWaterBidons > 1 ? "s" : "")")
                        : (isFr ? "\(liquidCarbBidons) \(liquidCarbBidons > 1 ? "bidons" : "bidon") d’eau & électrolytes" : "\(liquidCarbBidons) \(liquidCarbBidons > 1 ? "bottles" : "bottle") hydration drink"),
                    notes: isFr ? "Facile à boire, rien à mâcher." : "Easy to drink, nothing to chew.",
                    isRealFoodVerified: false,
                    isLiquid: true
                ))
            }

            if counts.gelsCount > 0 {
                items.append(NutritionItem(
                    name: isFr ? "Gels Énergétiques Glucose/Fructose" : "Dual-Source Energy Gels",
                    quantity: "\(counts.gelsCount)× gel (25 g)",
                    carbsGrams: Double(counts.gelsCount) * energyGelCarbsG,
                    proteinGrams: 0,
                    fatsGrams: 0,
                    kcals: Double(counts.gelsCount) * energyGelKcal,
                    quantitativeLabel: isFr
                        ? "\(counts.gelsCount)× gel énergétique (\(counts.gelsCount * Int(energyGelCarbsG)) g C)"
                        : "\(counts.gelsCount)× energy gel (\(counts.gelsCount * Int(energyGelCarbsG)) g C)",
                    portionLabel: isFr
                        ? "\(counts.gelsCount) \(counts.gelsCount > 1 ? "collations" : "collation") de poche rapide"
                        : "\(counts.gelsCount) quick pocket \(counts.gelsCount > 1 ? "snacks" : "snack")",
                    notes: isFr ? "À prendre avant les côtes ou sections exposées." : "Take ahead of climbs or exposed headwind sections.",
                    isRealFoodVerified: false
                ))
            }
            return items
        }

        if counts.juiceBidons > 0 {
            let totalBidonsNeeded = hydrationPlan?.totalBidonsNeeded ?? counts.juiceBidons
            let liquidCarbBidons = min(totalBidonsNeeded, counts.juiceBidons)
            let pureWaterBidons = max(0, totalBidonsNeeded - liquidCarbBidons)
            items.append(NutritionItem(
                name: isFr ? "50/50 Eau & Pur Jus de Pomme/Raisin Pressé" : "50/50 Water & 100% Pressed Apple/Grape Juice",
                quantity: pureWaterBidons > 0
                    ? (isFr ? "\(liquidCarbBidons)× Bidon Glucidique (\(bidonSizeMl) ml) + \(pureWaterBidons)× Bidon\(pureWaterBidons > 1 ? "s" : "") Eau/Électrolytes (\(bidonSizeMl) ml)" : "\(liquidCarbBidons)× Carbohydrate Bottle (\(bidonSizeMl) ml) + \(pureWaterBidons)× Pure/Electrolyte Water Bottle\(pureWaterBidons > 1 ? "s" : "") (\(bidonSizeMl) ml)")
                    : (isFr ? "\(liquidCarbBidons)× Bidon\(liquidCarbBidons > 1 ? "s" : "") \(bidonSizeMl) ml" : "\(liquidCarbBidons)× \(bidonSizeMl) ml bottle\(liquidCarbBidons > 1 ? "s" : "")"),
                carbsGrams: Double(liquidCarbBidons) * juiceBidonCarbsG,
                proteinGrams: 0,
                fatsGrams: 0,
                kcals: Double(liquidCarbBidons) * juiceBidonKcal,
                quantitativeLabel: isFr
                    ? "50/50 eau & pur jus pressé (\(liquidCarbBidons * Int(juiceBidonCarbsG)) g C)"
                    : "50/50 water & 100% pressed juice (\(liquidCarbBidons * Int(juiceBidonCarbsG)) g C)",
                portionLabel: pureWaterBidons > 0
                    ? (isFr ? "\(liquidCarbBidons)× Bidon glucidique + \(pureWaterBidons)× Bidon\(pureWaterBidons > 1 ? "s" : "") eau/électrolytes" : "\(liquidCarbBidons)× Carbohydrate Bottle + \(pureWaterBidons)× Water Bottle\(pureWaterBidons > 1 ? "s" : "")")
                    : (isFr ? "\(liquidCarbBidons) \(liquidCarbBidons > 1 ? "bidons" : "bidon") jus naturel dilué" : "\(liquidCarbBidons) \(liquidCarbBidons > 1 ? "bottles" : "bottle") diluted fruit juice"),
                notes: isFr ? "Jus coupé d’eau, léger pour l’estomac." : "Juice cut with water, easy on the stomach.",
                isRealFoodVerified: true,
                isLiquid: true
            ))
        }

        if counts.datesCount > 0 {
            items.append(NutritionItem(
                name: isFr ? "Dattes Medjool (Dénoyautées)" : "Medjool Dates (Pitted)",
                quantity: isFr ? "\(counts.datesCount) dattes" : "\(counts.datesCount) plump dates",
                carbsGrams: Double(counts.datesCount) * medjoolDateCarbsG,
                proteinGrams: counts.datesCount > 0 ? 1 : 0,
                fatsGrams: 0,
                kcals: Double(counts.datesCount) * medjoolDateKcal,
                quantitativeLabel: isFr ? "Dattes Medjool dénoyautées (\(counts.datesCount * Int(medjoolDateCarbsG)) g C)" : "Medjool dates (\(counts.datesCount * Int(medjoolDateCarbsG)) g C)",
                portionLabel: isFr ? "\(counts.datesCount) \(counts.datesCount > 1 ? "dattes" : "datte") ou fruits secs" : "\(counts.datesCount) plump \(counts.datesCount > 1 ? "dates" : "date") or dried fruit",
                notes: isFr ? "Riches en potassium naturel, texture fondante." : "Rich in natural potassium, melt-in-mouth chewability.",
                isRealFoodVerified: true
            ))
        }

        if preference == .mixed && counts.gelsCount > 0 {
            items.append(NutritionItem(
                name: isFr ? "Gel Énergétique Rapide (Secours Bosses)" : "Fast Energy Gel (Climb Backup)",
                quantity: "\(counts.gelsCount)× gel (25 g)",
                carbsGrams: Double(counts.gelsCount) * energyGelCarbsG,
                proteinGrams: 0,
                fatsGrams: 0,
                kcals: Double(counts.gelsCount) * energyGelKcal,
                quantitativeLabel: isFr ? "\(counts.gelsCount)× gel énergétique (\(counts.gelsCount * Int(energyGelCarbsG)) g C)" : "\(counts.gelsCount)× energy gel (\(counts.gelsCount * Int(energyGelCarbsG)) g C)",
                portionLabel: isFr ? "\(counts.gelsCount) \(counts.gelsCount > 1 ? "collations" : "collation") de poche rapide" : "\(counts.gelsCount) quick pocket \(counts.gelsCount > 1 ? "snacks" : "snack")",
                notes: isFr ? "À prendre avant les côtes ou sections exposées." : "Take ahead of climbs or exposed headwind sections.",
                isRealFoodVerified: false
            ))
        } else if preference == .realFood && counts.chewsCount > 0 {
            items.append(NutritionItem(
                name: isFr ? "Pâtes de Fruits Artisanales & Figues" : "Artisanal Fruit Chews & Dried Figs",
                quantity: isFr ? "\(counts.chewsCount) portions" : "\(counts.chewsCount) pieces",
                carbsGrams: Double(counts.chewsCount) * fruitChewCarbsG,
                proteinGrams: 0,
                fatsGrams: 0,
                kcals: Double(counts.chewsCount) * fruitChewKcal,
                quantitativeLabel: isFr ? "Pâtes de fruits artisanales (\(counts.chewsCount * Int(fruitChewCarbsG))g C)" : "Artisanal fruit chews (\(counts.chewsCount * Int(fruitChewCarbsG))g C)",
                portionLabel: isFr ? "\(counts.chewsCount) \(counts.chewsCount > 1 ? "bouchées" : "bouchée") de fruits secs ou figues" : "\(counts.chewsCount) \(counts.chewsCount > 1 ? "pieces" : "piece") fruit chews or dried figs",
                notes: isFr ? "Énergie progressive et coup de boost dans les côtes." : "Steady release plus quick boost for climbs and headwinds.",
                isRealFoodVerified: true
            ))
        }

        if let savoryCount = fuelSplit?.savoryResetCount, savoryCount > 0 {
            let activeFilters = riderSpecs.dietaryFilters ?? []
            if let savoryItem = PantryCatalog.defaultItems.first(where: {
                $0.slot == .onBikeSolid && $0.flavor == .savory && PantryCatalog.isItemCompliant($0, filters: activeFilters)
            }) {
                items.append(NutritionItem(
                    name: isFr ? savoryItem.nameFr : savoryItem.nameEn,
                    quantity: isFr ? "\(savoryCount) portion\(savoryCount > 1 ? "s" : "") salée\(savoryCount > 1 ? "s" : "")" : "\(savoryCount) savory serving\(savoryCount > 1 ? "s" : "")",
                    carbsGrams: Double(savoryCount) * savoryItem.carbsG,
                    proteinGrams: Double(savoryCount) * savoryItem.proteinG,
                    fatsGrams: 0,
                    kcals: Double(savoryCount) * savoryItem.kcal,
                    quantitativeLabel: isFr ? "\(savoryItem.nameFr) (\(savoryCount * Int(savoryItem.carbsG)) g glucides)" : "\(savoryItem.nameEn) (\(savoryCount * Int(savoryItem.carbsG))g carbs)",
                    portionLabel: scalePortionLabel(isFr ? savoryItem.portionLabelFr : savoryItem.portionLabelEn, units: savoryCount),
                    notes: isFr ? "Pause salée, environ toutes les 90 min." : "Salty break, about every 90 min.",
                    isRealFoodVerified: true,
                    isSavoryReset: true
                ))
            }
        }

        return items
    }

    public static func allocatePhase2OnBikeItems(
        targetOnBikeCarbsG: Double,
        liquidItem: PantryItem,
        rideHours: Double,
        lang: CadenceLang = .en,
        solidItems: [PantryItem]? = nil,
        hydrationPlan: HydrationPlanResult? = nil,
        fuelSplit: EffectiveFuelSplitResult? = nil,
        riderSpecs: RiderBikeSpecs = .defaultSpecs
    ) -> [NutritionItem] {
        let isFr = lang == .fr
        let bidonSizeMl = Int(hydrationPlan?.bidonSizeMl ?? 650)

        if targetOnBikeCarbsG <= 0 {
            return allocatePhase2OnBikeItems(
                targetOnBikeCarbsG: 0,
                preference: .realFood,
                rideHours: rideHours,
                lang: lang,
                hydrationPlan: hydrationPlan,
                fuelSplit: fuelSplit,
                riderSpecs: riderSpecs
            )
        }

        var items: [NutritionItem] = []

        let isHighCarb = liquidItem.carbsG >= 50 || liquidItem.id.contains("maltodextrin") || liquidItem.id.contains("isotonic")
        let liquidShare = fuelSplit?.effectiveLiquidRatio ?? (isHighCarb ? 0.5 : 0.35)
        let bottleScale = Double(bidonSizeMl) / 650.0
        let carbsPerBidon = max(0, JSCompat.jsRoundInt(liquidItem.carbsG * bottleScale))
        let kcalPerBidon = max(0, JSCompat.jsRoundInt(liquidItem.kcal * bottleScale))
        let proteinPerBidon = max(0, JSCompat.jsRoundInt(liquidItem.proteinG * bottleScale))
        let rawLiquidUnits = carbsPerBidon > 0 ? max(1, JSCompat.jsRoundInt((targetOnBikeCarbsG * liquidShare) / Double(carbsPerBidon))) : 0
        let totalBidonsNeeded = hydrationPlan?.totalBidonsNeeded ?? max(1, rawLiquidUnits)
        let liquidCarbBidons = min(totalBidonsNeeded, rawLiquidUnits)
        let pureWaterBidons = max(0, totalBidonsNeeded - liquidCarbBidons)
        let sodiumMgPerL = hydrationPlan?.sodiumMgPerL ?? 500
        let liquidCarbs = liquidCarbBidons * carbsPerBidon

        items.append(NutritionItem(
            name: isFr ? liquidItem.nameFr : liquidItem.nameEn,
            quantity: formatBottlePlan(carbBottles: liquidCarbBidons, waterBottles: pureWaterBidons, liquidItem: liquidItem, lang: lang, bidonSizeMl: bidonSizeMl),
            carbsGrams: Double(liquidCarbs),
            proteinGrams: Double(liquidCarbBidons * proteinPerBidon),
            fatsGrams: 0,
            kcals: Double(liquidCarbBidons * kcalPerBidon),
            quantitativeLabel: isFr
                ? "\(liquidItem.nameFr) (\(liquidCarbs) g glucides · \(totalBidonsNeeded) × \(bidonSizeMl) ml · ~\(sodiumMgPerL) mg sodium/L)"
                : "\(liquidItem.nameEn) (\(liquidCarbs)g carbs · \(totalBidonsNeeded) × \(bidonSizeMl) ml · ~\(sodiumMgPerL) mg sodium/L)",
            portionLabel: formatBottlePlan(carbBottles: liquidCarbBidons, waterBottles: pureWaterBidons, liquidItem: liquidItem, lang: lang),
            notes: isFr ? "Buvez par petites gorgées régulières, avec des électrolytes." : "Sip little and often, with electrolytes.",
            isRealFoodVerified: !liquidItem.id.contains("gel") && !liquidItem.id.contains("isotonic") && !liquidItem.id.contains("maltodextrin"),
            isLiquid: true,
            unitCount: liquidCarbBidons
        ))

        var remainingSolidCarbs = max(0.0, targetOnBikeCarbsG - Double(liquidCarbs))
        let solids = (solidItems ?? []).filter { $0.carbsG > 0 }

        var orderedIds: [String] = []
        var ledger: [String: (item: PantryItem, units: Int, resetUnits: Int)] = [:]
        func addUnits(_ item: PantryItem, _ units: Int, isReset: Bool) {
            if units <= 0 { return }
            if ledger[item.id] == nil {
                orderedIds.append(item.id)
                ledger[item.id] = (item, 0, 0)
            }
            ledger[item.id]!.units += units
            if isReset {
                ledger[item.id]!.resetUnits += units
            }
        }

        let savoryResetCount = fuelSplit?.savoryResetCount ?? 0
        var resetUnitsAllocated = 0
        if savoryResetCount > 0 && remainingSolidCarbs > 0 {
            let activeFilters = riderSpecs.dietaryFilters ?? []
            let savoryItem = solids.first(where: { $0.flavor == .savory })
                ?? PantryCatalog.defaultItems.first(where: {
                    $0.slot == .onBikeSolid && $0.flavor == .savory && $0.carbsG > 0 && PantryCatalog.isItemCompliant($0, filters: activeFilters)
                })
            if let sav = savoryItem {
                resetUnitsAllocated = max(1, min(savoryResetCount, Int(floor(remainingSolidCarbs / sav.carbsG))))
                addUnits(sav, resetUnitsAllocated, isReset: true)
                remainingSolidCarbs = max(0.0, remainingSolidCarbs - Double(resetUnitsAllocated) * sav.carbsG)
            }
        }

        let sweetNeutralSolids = solids.filter { $0.flavor != .savory }
        let allocationSolids = (resetUnitsAllocated > 0 && !sweetNeutralSolids.isEmpty) ? sweetNeutralSolids : solids

        for idx in 0..<allocationSolids.count {
            let item = allocationSolids[idx]
            let isLast = idx == allocationSolids.count - 1
            let slotsRemaining = allocationSolids.count - idx
            let slotTarget = remainingSolidCarbs / Double(slotsRemaining)
            var units = max(0, JSCompat.jsRoundInt(slotTarget / item.carbsG))
            if isLast && remainingSolidCarbs >= item.carbsG * 0.4 && units == 0 {
                units = 1
            }
            if units > 0 {
                remainingSolidCarbs = max(0.0, remainingSolidCarbs - Double(units) * item.carbsG)
                addUnits(item, units, isReset: false)
            }
        }

        for id in orderedIds {
            guard let entry = ledger[id] else { continue }
            let item = entry.item
            let units = entry.units
            let isReset = entry.resetUnits > 0
            let portion = isFr ? item.portionLabelFr : item.portionLabelEn
            let carbsTotal = Double(units) * item.carbsG
            let carbsInt = JSCompat.jsRoundInt(carbsTotal)

            items.append(NutritionItem(
                name: isFr ? item.nameFr : item.nameEn,
                quantity: isFr ? "\(units) portion\(units > 1 ? "s" : "")" : "\(units) serving\(units > 1 ? "s" : "")",
                carbsGrams: carbsTotal,
                proteinGrams: Double(units) * item.proteinG,
                fatsGrams: 0,
                kcals: Double(units) * item.kcal,
                quantitativeLabel: isFr ? "\(item.nameFr) (\(carbsInt) g glucides)" : "\(item.nameEn) (\(carbsInt)g carbs)",
                portionLabel: scalePortionLabel(portion, units: units),
                notes: isReset
                    ? (isFr ? "Pause salée, environ toutes les 90 min." : "Salty break, about every 90 min.")
                    : (item.flavor == .savory
                        ? (isFr ? "En-cas salé pour varier les saveurs." : "Salty snack for variety.")
                        : (isFr ? "Énergie facile à digérer." : "Easy-to-digest energy.")),
                isRealFoodVerified: !item.id.contains("gel") && !item.id.contains("isotonic") && !item.id.contains("maltodextrin"),
                isSavoryReset: isReset,
                unitCount: units
            ))
        }

        return items
    }

    public static func getRealFoodNutritionPlan(
        lockerArrivalTime: String = "08:30",
        breakRoomTime: String = "08:50",
        departureTime: String = "07:35",
        lang: CadenceLang = .en,
        options: RealFoodNutritionPlanOptions? = nil,
        riderSpecs: RiderBikeSpecs = .defaultSpecs
    ) -> [NutritionPhase] {
        let isFr = lang == .fr
        let gutCeilingGPerHr = max(25.0, min(120.0, options?.carbTargetGPerHr ?? riderSpecs.carbTargetGPerHr))
        let rideHours = max(0.1, options?.rideHours ?? 1.5)
        let pref = options?.nutritionPreference ?? riderSpecs.nutritionPreference
        let totalDays = options?.totalDays ?? 1
        let activeChips = options?.activeChips ?? []
        let logistics = options?.logistics
        let preRideStyle = logistics?.preRideStyle ?? "full-breakfast"
        let hasFridge = logistics?.hasDestinationFridge ?? true
        let isSplitRecovery = logistics?.splitPostRideRecovery ?? activeChips.contains("shower-locker")

        let compliantPantry = options?.compliantPantry ?? PantryCatalog.resolveCompliantPantry(specs: riderSpecs, hasDestinationFridge: hasFridge)
        let resolvedPostRidePantry = (!hasFridge && compliantPantry.postRide.requiresFridge == true)
            ? PantryCatalog.resolveCompliantPantry(specs: riderSpecs, hasDestinationFridge: false).postRide
            : compliantPantry.postRide

        let pctFtp = options?.pctFtp ?? 72.0
        let carbOxidation = options?.carbOxidationGramPerHour ?? JSCompat.jsRound(gutCeilingGPerHr * 1.8)
        let resolvedRiderLevel = options?.riderLevel ?? riderSpecs.riderLevel
        let resolvedCarbPacingMode = options?.carbPacingMode ?? riderSpecs.carbPacingMode
        let isLockedCarbTarget = options?.isLockedCarbTarget ?? (
            resolvedCarbPacingMode == "locked" ||
            (resolvedCarbPacingMode != "auto" && resolvedRiderLevel == .pro && gutCeilingGPerHr >= 60)
        )

        let modulated = calculateIntensityModulatedCarbTarget(IntensityModulatedCarbTargetParams(
            rideHours: rideHours,
            pctFtp: pctFtp,
            carbOxidationGramPerHour: carbOxidation,
            gutCeilingGPerHr: gutCeilingGPerHr,
            totalDays: totalDays,
            activeChips: activeChips,
            isLockedCarbTarget: isLockedCarbTarget
        ))

        let basePreRideCarbs = compliantPantry.preRide.carbsG
        var preDeficitG = 0.0
        var phase1Items: [NutritionItem] = []

        if preRideStyle == "light-liquid" {
            preDeficitG = max(0.0, basePreRideCarbs - 28.0)
            phase1Items = [
                NutritionItem(
                    name: isFr ? "Boisson glucidique légère (pur jus ou eau d’érable salée)" : "Light carb drink (pure juice or salted maple water)",
                    quantity: "250 ml",
                    carbsGrams: 28, proteinGrams: 0, fatsGrams: 0, kcals: 115,
                    quantitativeLabel: isFr ? "Boisson glucidique légère (250 ml, 28 g glucides)" : "Light carb drink (250 ml, 28 g carbs)",
                    portionLabel: isFr ? "1 petit verre de jus ou boisson légère" : "1 small glass of juice or light drink",
                    notes: isFr ? "Boisson légère, facile à digérer 20 min avant de partir." : "Light drink, easy on the stomach 20 min before you leave.",
                    isRealFoodVerified: true
                ),
                NutritionItem(
                    name: isFr ? "Double expresso" : "Double espresso",
                    quantity: isFr ? "60 ml (2 doses)" : "60 ml (2 shots)",
                    carbsGrams: 0, proteinGrams: 0, fatsGrams: 0, kcals: 5,
                    quantitativeLabel: isFr ? "Double expresso (60 ml, ~140 mg caféine)" : "Double espresso (60 ml, ~140 mg caffeine)",
                    portionLabel: isFr ? "1 café ou expresso" : "1 coffee or espresso",
                    notes: isFr ? "Un petit coup de fouet avant de partir." : "A quick pick-me-up before you leave.",
                    isRealFoodVerified: true
                ),
                NutritionItem(
                    name: isFr ? "Eau fraîche + pincée de sel" : "Water with a pinch of salt",
                    quantity: "300 ml",
                    carbsGrams: 0, proteinGrams: 0, fatsGrams: 0, kcals: 0,
                    quantitativeLabel: isFr ? "Eau fraîche + sel (300 ml)" : "Water with a pinch of salt (300 ml)",
                    portionLabel: isFr ? "1 grand verre d’eau salée" : "1 tall glass of salted water",
                    notes: isFr ? "Hydratation avant le départ avec une pincée de sel." : "Pre-ride water with a pinch of salt.",
                    isRealFoodVerified: true
                )
            ]
        } else if preRideStyle == "fasted-rollout" {
            preDeficitG = basePreRideCarbs
            phase1Items = [
                NutritionItem(
                    name: isFr ? "Double expresso" : "Double espresso",
                    quantity: isFr ? "60 ml (2 doses)" : "60 ml (2 shots)",
                    carbsGrams: 0, proteinGrams: 0, fatsGrams: 0, kcals: 5,
                    quantitativeLabel: isFr ? "Double expresso (60 ml, ~140 mg caféine, 0 g glucides)" : "Double espresso (60 ml, ~140 mg caffeine, 0 g carbs)",
                    portionLabel: isFr ? "1 café ou expresso" : "1 coffee or espresso",
                    notes: isFr ? "Un café court pour démarrer léger." : "A quick espresso for a light start.",
                    isRealFoodVerified: true
                ),
                NutritionItem(
                    name: isFr ? "Eau fraîche + pincée de sel" : "Water with a pinch of salt",
                    quantity: "350 ml",
                    carbsGrams: 0, proteinGrams: 0, fatsGrams: 0, kcals: 0,
                    quantitativeLabel: isFr ? "Eau fraîche + sel (350 ml)" : "Water with a pinch of salt (350 ml)",
                    portionLabel: isFr ? "1 grand verre d’eau salée" : "1 tall glass of salted water",
                    notes: isFr ? "Un grand verre d’eau avec une pincée de sel avant de rouler." : "A tall glass of water with a pinch of salt before rolling out.",
                    isRealFoodVerified: true
                )
            ]
        } else {
            preDeficitG = 0
            phase1Items = [
                NutritionItem(
                    name: isFr ? compliantPantry.preRide.nameFr : compliantPantry.preRide.nameEn,
                    quantity: isFr ? "1 portion" : "1 portion",
                    carbsGrams: compliantPantry.preRide.carbsG,
                    proteinGrams: compliantPantry.preRide.proteinG,
                    fatsGrams: 1,
                    kcals: compliantPantry.preRide.kcal,
                    quantitativeLabel: isFr
                        ? "\(compliantPantry.preRide.nameFr) (\(Int(compliantPantry.preRide.carbsG)) g glucides, \(Int(compliantPantry.preRide.proteinG)) g protéines)"
                        : "\(compliantPantry.preRide.nameEn) (\(Int(compliantPantry.preRide.carbsG)) g carbs, \(Int(compliantPantry.preRide.proteinG)) g protein)",
                    portionLabel: isFr ? compliantPantry.preRide.portionLabelFr : compliantPantry.preRide.portionLabelEn,
                    notes: isFr ? "Facile à digérer avant de partir." : "Easy to digest before you head out.",
                    isRealFoodVerified: !compliantPantry.preRide.id.contains("gel")
                ),
                NutritionItem(
                    name: isFr ? "Double expresso" : "Double espresso",
                    quantity: isFr ? "60 ml (2 doses)" : "60 ml (2 shots)",
                    carbsGrams: 0, proteinGrams: 0, fatsGrams: 0, kcals: 5,
                    quantitativeLabel: isFr ? "Double expresso (60 ml, ~140 mg caféine)" : "Double espresso (60 ml, ~140 mg caffeine)",
                    portionLabel: isFr ? "1 café ou expresso" : "1 coffee or espresso",
                    notes: isFr ? "Un petit coup de fouet avant de partir." : "A quick pick-me-up before you leave.",
                    isRealFoodVerified: true
                ),
                NutritionItem(
                    name: isFr ? "Eau fraîche + pincée de sel" : "Water with a pinch of salt",
                    quantity: "300 ml",
                    carbsGrams: 0, proteinGrams: 0, fatsGrams: 0, kcals: 0,
                    quantitativeLabel: isFr ? "Eau fraîche + sel (300 ml)" : "Water with a pinch of salt (300 ml)",
                    portionLabel: isFr ? "1 grand verre d’eau salée" : "1 tall glass of salted water",
                    notes: isFr ? "Hydratation avant le départ avec une pincée de sel." : "Pre-ride water with a pinch of salt.",
                    isRealFoodVerified: true
                )
            ]
        }

        let onBikeShiftWanted = JSCompat.jsRound(preDeficitG * 0.50)
        let maxOnBikeCarbs = max(25.0, JSCompat.jsRound(modulated.effectiveCeilingGPerHr * rideHours))
        let maxShiftAllowed = modulated.targetOnBikeCarbsG > 0 ? max(0.0, maxOnBikeCarbs - modulated.targetOnBikeCarbsG) : 0.0
        let effectiveOnBikeShift = min(onBikeShiftWanted, maxShiftAllowed)
        let finalOnBikeCarbsG = modulated.targetOnBikeCarbsG + effectiveOnBikeShift

        let hydrationPlan = options?.hydrationPlan ?? calculateHydrationPlan(HydrationPlanParams(
            rideHours: rideHours,
            tempC: options?.tempC ?? 18,
            legWatts: options?.legWatts ?? 150,
            bidonSizeMl: options?.bidonSizeMl ?? Double(riderSpecs.bidonSizeMl ?? 650),
            frameBottleSlots: options?.frameBottleSlots ?? riderSpecs.frameBottleSlots ?? 2,
            isShortRide: rideHours < 0.75 && totalDays == 1,
            activeChips: activeChips
        ))

        let fuelSplit = options?.fuelSplit ?? resolveEffectiveFuelSplit(FuelSplitParams(
            rideHours: rideHours,
            pctFtp: pctFtp,
            tempC: options?.tempC ?? 18,
            liquidCarbRatio: riderSpecs.liquidCarbRatio,
            autoModulateLiquidInHeatOrEffort: riderSpecs.autoModulateLiquidInHeatOrEffort,
            enableSavoryPalateResets: riderSpecs.enableSavoryPalateResets,
            isMultiDayTour: totalDays > 1
        ))

        let onBikeItems = allocatePhase2OnBikeItems(
            targetOnBikeCarbsG: finalOnBikeCarbsG,
            liquidItem: compliantPantry.onBikeLiquid,
            rideHours: rideHours,
            lang: lang,
            solidItems: compliantPantry.onBikeSolids,
            hydrationPlan: hydrationPlan,
            fuelSplit: fuelSplit,
            riderSpecs: riderSpecs
        )

        let recoveryCarbBonus = max(0.0, preDeficitG - effectiveOnBikeShift)
        let preRidePantry = compliantPantry.preRide

        let postRideItem = NutritionItem(
            name: isFr ? resolvedPostRidePantry.nameFr : resolvedPostRidePantry.nameEn,
            quantity: isFr ? "1 portion de récupération" : "1 recovery portion",
            carbsGrams: resolvedPostRidePantry.carbsG,
            proteinGrams: resolvedPostRidePantry.proteinG,
            fatsGrams: 0,
            kcals: resolvedPostRidePantry.kcal,
            quantitativeLabel: isFr
                ? "\(resolvedPostRidePantry.nameFr) (\(Int(resolvedPostRidePantry.carbsG)) g glucides, \(Int(resolvedPostRidePantry.proteinG)) g protéines)"
                : "\(resolvedPostRidePantry.nameEn) (\(Int(resolvedPostRidePantry.carbsG))g carbs, \(Int(resolvedPostRidePantry.proteinG))g protein)",
            portionLabel: isFr ? resolvedPostRidePantry.portionLabelFr : resolvedPostRidePantry.portionLabelEn,
            notes: isFr ? "Glucides et protéines pour bien récupérer." : "Carbs and protein to help you recover.",
            isRealFoodVerified: !resolvedPostRidePantry.id.contains("shake")
        )

        let bonusScale = preRidePantry.carbsG > 0 ? recoveryCarbBonus / preRidePantry.carbsG : 0.0
        let recoveryBonusItem: NutritionItem? = recoveryCarbBonus > 0 ? NutritionItem(
            name: isFr ? preRidePantry.nameFr : preRidePantry.nameEn,
            quantity: isFr ? "Portion du petit-déjeuner reportée" : "Breakfast portion moved to recovery",
            carbsGrams: recoveryCarbBonus,
            proteinGrams: JSCompat.jsRound(preRidePantry.proteinG * bonusScale),
            fatsGrams: 0,
            kcals: JSCompat.jsRound(preRidePantry.kcal * bonusScale),
            quantitativeLabel: isFr
                ? "\(preRidePantry.nameFr) (\(Int(recoveryCarbBonus)) g glucides)"
                : "\(preRidePantry.nameEn) (\(Int(recoveryCarbBonus))g carbs)",
            portionLabel: bonusScale >= 0.75
                ? (isFr ? preRidePantry.portionLabelFr : preRidePantry.portionLabelEn)
                : (isFr ? "Une demi-portion : \(preRidePantry.portionLabelFr)" : "Half portion: \(preRidePantry.portionLabelEn)"),
            notes: isFr ? "Le petit-déjeuner que vous avez allégé, à rattraper ici." : "The breakfast you kept light, enjoyed now instead.",
            isRealFoodVerified: !preRidePantry.id.contains("gel")
        ) : nil

        let dietaryFilters = riderSpecs.dietaryFilters ?? []
        let isVegan = dietaryFilters.contains(.vegan)
        let isGF = dietaryFilters.contains(.glutenFree)
        let isDairyFree = dietaryFilters.contains(.dairyFree) || isVegan
        let isNutFree = dietaryFilters.contains(.nutFree)
        let isLowFodmap = dietaryFilters.contains(.lowFodmap)

        let oatsItem: NutritionItem = !hasFridge ? NutritionItem(
            name: isGF
                ? (isFr ? "Galette d’avoine sans gluten ou flocons minute" : "Gluten-free oat bar or instant oats cup")
                : (isFr ? "Galette d’avoine ou flocons d’avoine minute" : "Packable oat bar or instant oats cup"),
            quantity: isFr ? "1 portion (65 g)" : "1 serving (65 g)",
            carbsGrams: 42, proteinGrams: 8, fatsGrams: 6, kcals: 255,
            quantitativeLabel: isFr
                ? "\(isGF ? "Galette d’avoine sans gluten" : "Galette d’avoine") (65 g, 42 g glucides, 8 g protéines)"
                : "\(isGF ? "GF oat bar" : "Packable oat bar") (65 g, 42 g carbs, 8 g protein)",
            portionLabel: isFr ? "1 galette ou bol d’avoine" : "1 oat bar or instant oats cup",
            notes: isFr ? "Se transporte dans le sac, sans frigo." : "Packs in your bag, no fridge needed.",
            isRealFoodVerified: true
        ) : NutritionItem(
            name: isGF
                ? (isFr ? "Flocons d’avoine sans gluten au lait végétal" : "Certified GF overnight oats with plant milk")
                : (isFr ? "Flocons d’avoine préparés au lait d’avoine & chia" : "Oat milk overnight oats with chia"),
            quantity: isFr ? "Bocal 250 g" : "250 g jar",
            carbsGrams: 42, proteinGrams: 8, fatsGrams: 6, kcals: 255,
            quantitativeLabel: isFr
                ? "\(isGF ? "Avoine sans gluten" : "Flocons d’avoine préparés") (250 g, 42 g glucides, 8 g protéines)"
                : "\(isGF ? "GF overnight oats" : "Oat milk overnight oats") (250 g jar, 42 g carbs, 8 g protein)",
            portionLabel: isFr ? "1 bocal d’avoine préparée" : "1 jar of prepared oats",
            notes: isFr ? "Préparé la veille, frais et rassasiant." : "Prepared the night before, cool and filling.",
            isRealFoodVerified: true
        )

        let fruitItem: NutritionItem = isLowFodmap ? NutritionItem(
            name: isFr ? "1 banane ferme ou portion de fraises" : "1 firm banana or fresh strawberries",
            quantity: "120 g",
            carbsGrams: 27, proteinGrams: 1, fatsGrams: 0, kcals: 105,
            quantitativeLabel: isFr ? "1 banane ferme (120 g, 27 g glucides)" : "1 firm banana (120 g, 27 g carbs)",
            portionLabel: isFr ? "1 portion de fruits frais" : "1 serving of fresh fruit",
            notes: isFr ? "Doux pour l’estomac." : "Gentle on the stomach.",
            isRealFoodVerified: true
        ) : NutritionItem(
            name: isFr ? "1 pomme croquante de saison" : "1 crisp seasonal apple",
            quantity: "140 g",
            carbsGrams: 19, proteinGrams: 0, fatsGrams: 0, kcals: 75,
            quantitativeLabel: isFr ? "1 pomme croquante (140 g, 19 g glucides)" : "1 crisp apple (140 g, 19 g carbs)",
            portionLabel: isFr ? "1 pomme croquante fraîche" : "1 crisp fresh apple",
            notes: isFr ? "Fruits frais et croquants." : "Fresh and crisp.",
            isRealFoodVerified: true
        )

        let nutOrSeedItem: NutritionItem = isNutFree ? NutritionItem(
            name: isFr ? "Graines de courge & tournesol grillées" : "Toasted pumpkin & sunflower seeds",
            quantity: "20 g",
            carbsGrams: 4, proteinGrams: 6, fatsGrams: 10, kcals: 125,
            quantitativeLabel: isFr ? "Graines de courge & tournesol (20 g, 10 g lipides)" : "Pumpkin & sunflower seeds (20 g, 10 g fats)",
            portionLabel: isFr ? "1 poignée de graines" : "1 small handful of seeds",
            notes: isFr ? "Croquant salé, garanti sans fruits à coque." : "Crunchy and savory, 100% nut-free.",
            isRealFoodVerified: true
        ) : NutritionItem(
            name: isFr ? "Cerneaux de noix" : "Raw walnuts",
            quantity: "20 g",
            carbsGrams: 3, proteinGrams: 3, fatsGrams: 13, kcals: 130,
            quantitativeLabel: isFr ? "Cerneaux de noix (20 g, 13 g lipides)" : "Walnuts (20 g, 13 g fats)",
            portionLabel: isFr ? "1 poignée de noix" : "1 small handful of walnuts",
            notes: isFr ? "Une petite poignée pour accompagner le repas." : "A small handful alongside your meal.",
            isRealFoodVerified: true
        )

        let breadLabelFr = isGF ? "1/2 pain sans gluten artisanal" : (isLowFodmap ? "1/2 pain au levain d’épeautre" : "1/2 sandwich baguette fraîche")
        let breadLabelEn = isGF ? "1/2 GF artisan roll" : (isLowFodmap ? "1/2 spelt sourdough roll" : "1/2 fresh baguette sandwich")

        let fillingLabelFr: String
        if !hasFridge {
            fillingLabelFr = isNutFree ? "purée de graines de tournesol & concombre" : "purée d’amandes ou beurre de cacahuète"
        } else if isLowFodmap {
            fillingLabelFr = isVegan ? "tofu grillé & concombre" : (isDairyFree ? "dinde rôtie & concombre" : "dinde ou comté affiné")
        } else {
            fillingLabelFr = isVegan ? "avocat & houmous" : "dinde ou avocat"
        }

        let fillingLabelEn: String
        if !hasFridge {
            fillingLabelEn = isNutFree ? "sunflower seed spread & cucumber" : "almond or peanut butter"
        } else if isLowFodmap {
            fillingLabelEn = isVegan ? "grilled tofu & cucumber" : (isDairyFree ? "roast turkey & cucumber" : "turkey or aged comté")
        } else {
            fillingLabelEn = isVegan ? "avocado & hummus" : "turkey or avocado"
        }

        let sandwichItem = NutritionItem(
            name: isFr ? "\(breadLabelFr) (\(fillingLabelFr))" : "\(breadLabelEn) (\(fillingLabelEn))",
            quantity: isFr ? "100 g (demi-sandwich)" : "100 g half sandwich",
            carbsGrams: 36,
            proteinGrams: isVegan ? 10 : 14,
            fatsGrams: 5,
            kcals: 245,
            quantitativeLabel: isFr
                ? "\(breadLabelFr) (100 g, 36 g glucides, \(isVegan ? "10 g" : "14 g") protéines)"
                : "\(breadLabelEn) (100 g, 36 g carbs, \(isVegan ? "10 g" : "14 g") protein)",
            portionLabel: isFr ? "1 demi-sandwich frais" : "1 half fresh sandwich",
            notes: isFr ? "Une part salée pour tenir toute la matinée." : "Something savory to keep you going through the morning.",
            isRealFoodVerified: true
        )

        let coffeeItem = NutritionItem(
            name: isFr ? "Café filtre ou thé chaud" : "Filter coffee or hot tea",
            quantity: isFr ? "Tasse 200 ml" : "200 ml mug",
            carbsGrams: 0, proteinGrams: 0, fatsGrams: 0, kcals: 2,
            quantitativeLabel: isFr ? "Café filtre ou thé (200 ml)" : "Filter coffee or tea (200 ml mug)",
            portionLabel: isFr ? "1 tasse de café ou thé" : "1 mug of coffee or tea",
            notes: isFr ? "Une boisson chaude pour bien démarrer la journée." : "A warm drink as you ease into the day.",
            isRealFoodVerified: true
        )

        let solved = options?.solvedTimeline
        let resolvedDeparture = solved?.departureTimeHHMM ?? departureTime
        let resolvedArrival = solved?.arrivalTimeHHMM ?? lockerArrivalTime
        let preBufferMin = preRideStyle == "full-breakfast" ? 45 : (preRideStyle == "light-liquid" ? 20 : 15)
        let resolvedPreRideWindow = solved?.preRideWindow ?? "\(TimelineEngine.subtractMinutesFromTime(resolvedDeparture, preBufferMin)) – \(resolvedDeparture)"
        let resolvedPostRideImmediateWindow = solved?.postRideImmediateWindow ?? "\(resolvedArrival) – \(TimelineEngine.addMinutesToTime(resolvedArrival, 10))"
        let resolvedPostRideMealWindow = solved?.postRideMealWindow ?? "\(breakRoomTime) – \(TimelineEngine.addMinutesToTime(breakRoomTime, 15))"
        let resolvedPostRideConsolidatedWindow = solved?.postRideConsolidatedWindow ?? "\(TimelineEngine.addMinutesToTime(resolvedArrival, 10)) – \(TimelineEngine.addMinutesToTime(resolvedArrival, 30))"

        let stage1Location = (logistics?.stage1LocationLabel?.isEmpty == false)
            ? logistics!.stage1LocationLabel!
            : (isFr ? "À l’arrivée" : "On arrival")
        let stage2Location = (logistics?.stage2LocationLabel?.isEmpty == false)
            ? logistics!.stage2LocationLabel!
            : (isFr ? "Salle de Pause / Bureau" : "Break Room / Office")

        let effRateInt = JSCompat.jsRoundInt(modulated.effectiveHourlyRateG)

        var phases: [NutritionPhase] = [
            NutritionPhase(
                phaseId: "pre-ride",
                title: isFr
                    ? (preRideStyle == "fasted-rollout" ? "Départ léger & hydratation" : (preRideStyle == "light-liquid" ? "Petite boisson avant de partir (20 min avant)" : "Petit-déjeuner avant de partir"))
                    : (preRideStyle == "fasted-rollout" ? "Light start & hydration" : (preRideStyle == "light-liquid" ? "Quick drink before you leave (20 min before)" : "Breakfast before you ride")),
                timeWindow: resolvedPreRideWindow,
                location: isFr ? "Domicile" : "Home",
                rules: isFr
                    ? (preRideStyle == "fasted-rollout" ? "Un café et un grand verre d’eau avant de partir, puis vous mangerez en route." : (preRideStyle == "light-liquid" ? "Une boisson légère 20 min avant de partir, facile à digérer." : "Un repas simple et digeste avant de prendre la route."))
                    : (preRideStyle == "fasted-rollout" ? "A coffee and a tall glass of water before you leave, then eat once you’re rolling." : (preRideStyle == "light-liquid" ? "A light drink 20 min before you leave, easy on the stomach." : "A simple, easy-to-digest meal before you head out.")),
                items: phase1Items
            ),
            NutritionPhase(
                phaseId: "on-bike",
                title: finalOnBikeCarbsG == 0
                    ? (isFr ? "Hydratation en selle (< 45 min)" : "On-bike hydration (< 45 min)")
                    : pref == .sportsFuel
                    ? (isFr ? "Ravito sportif en selle (\(effRateInt) g/h)" : "On-bike sports fueling (\(effRateInt) g/h)")
                    : pref == .mixed
                    ? (isFr ? "Ravito mixte en selle (\(effRateInt) g/h)" : "On-bike mixed fueling (\(effRateInt) g/h)")
                    : (isFr ? "Ravito naturel en selle (\(effRateInt) g/h)" : "On-bike real-food fueling (\(effRateInt) g/h)"),
                timeWindow: isFr ? "Du départ à l’arrivée (boire toutes les 15–20 min)" : "Rollout to arrival (sip every 15–20 min)",
                location: isFr ? "Sur la route" : "On the road",
                rules: finalOnBikeCarbsG == 0
                    ? (isFr ? "Sortie courte : vos réserves suffisent. Un bidon d’eau suffit pour la route." : "Short ride: your natural reserves are plenty. Plain water is all you need on the bike.")
                    : pref == .sportsFuel
                    ? (isFr ? "Calibré selon votre confort digestif (\(effRateInt) g/h) : boisson glucidique et gels d’appoint." : "Tuned to your digestion comfort (\(effRateInt) g/h): drink mix and pocket gels.")
                    : pref == .mixed
                    ? (isFr ? "Calibré sur \(effRateInt) g/h : vrais aliments pour rouler au train + 1 collation rapide pour les côtes." : "Tuned to \(effRateInt) g/h: real food for steady riding + 1 quick snack for the climbs.")
                    : (isFr ? "Calibré sur \(effRateInt) g/h avec des aliments simples et faciles à emporter." : "Tuned to \(effRateInt)g/h with simple, easy-to-carry foods."),
                items: onBikeItems
            )
        ]

        if isSplitRecovery {
            var breakItems = [oatsItem, fruitItem, nutOrSeedItem, sandwichItem, coffeeItem]
            if let bonus = recoveryBonusItem { breakItems.append(bonus) }
            phases.append(NutritionPhase(
                phaseId: "locker-refuel",
                title: isFr ? "Phase 1 : \(stage1Location)" : "Phase 1: \(stage1Location)",
                timeWindow: resolvedPostRideImmediateWindow,
                location: stage1Location,
                rules: isFr ? "Recharge immédiate post-effort. Consommation rapide avant la douche." : "Immediate post-effort replenishment. Consumed upon arrival before shower.",
                items: [postRideItem]
            ))
            phases.append(NutritionPhase(
                phaseId: "break-room",
                title: isFr ? "Phase 2 : \(stage2Location)" : "Phase 2: \(stage2Location)",
                timeWindow: resolvedPostRideMealWindow,
                location: stage2Location,
                rules: isFr ? "Petit-déjeuner ou collation partagée à l’espace de travail." : "Relaxed breakfast or meal before starting workday / daily activity.",
                items: breakItems
            ))
        } else {
            var arrivalItems = [postRideItem]
            if let bonus = recoveryBonusItem { arrivalItems.append(bonus) }
            arrivalItems.append(contentsOf: [sandwichItem, fruitItem, nutOrSeedItem, coffeeItem])
            phases.append(NutritionPhase(
                phaseId: "arrival-recovery",
                title: isFr ? "Repas Récupérateur d’Arrivée (\(stage1Location))" : "Arrival Recovery Meal (\(stage1Location))",
                timeWindow: resolvedPostRideConsolidatedWindow,
                location: stage1Location,
                rules: isFr ? "Repas complet et équilibré à destination (recharge glycogène + protéines complètes)." : "Consolidated recovery meal at destination (glycogen resynthesis + complete protein).",
                items: arrivalItems
            ))
        }

        return phases
    }
}
