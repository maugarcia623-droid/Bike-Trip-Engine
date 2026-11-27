import Foundation

public struct TyrePressureInput: Codable, Sendable, Equatable {
    public var systemMassKg: Double
    public var tireWidthMm: Double
    public var isTubeless: Bool
    public var pavedPct: Double
    public var gravelPct: Double
    public var singletrackPct: Double
    public var gearWeightKg: Double?
    public var bikeCategory: BikeCategory?
    public var casingType: CasingType?
    public var isHookless: Bool?
    public var bikeName: String?

    public init(
        systemMassKg: Double,
        tireWidthMm: Double,
        isTubeless: Bool,
        pavedPct: Double,
        gravelPct: Double,
        singletrackPct: Double,
        gearWeightKg: Double? = nil,
        bikeCategory: BikeCategory? = nil,
        casingType: CasingType? = nil,
        isHookless: Bool? = nil,
        bikeName: String? = nil
    ) {
        self.systemMassKg = systemMassKg
        self.tireWidthMm = tireWidthMm
        self.isTubeless = isTubeless
        self.pavedPct = pavedPct
        self.gravelPct = gravelPct
        self.singletrackPct = singletrackPct
        self.gearWeightKg = gearWeightKg
        self.bikeCategory = bikeCategory
        self.casingType = casingType
        self.isHookless = isHookless
        self.bikeName = bikeName
    }
}

public struct TyrePressureResult: Codable, Sendable, Equatable {
    public let frontBar: Double
    public let rearBar: Double
    public let frontPsi: Int
    public let rearPsi: Int
    public let frontLoadPct: Int
    public let rearLoadPct: Int
    public let bikeCategory: BikeCategory
    public let casingType: CasingType
    public let isHookless: Bool
    public let hooklessCapped: Bool
}

public enum TyrePressureEngine {
    public static let barToPsi: Double = 14.5038

    public static func barToPsiValue(_ bar: Double) -> Int {
        guard bar.isFinite, bar > 0 else { return 0 }
        return JSCompat.jsRoundInt(bar * barToPsi)
    }

    public static func formatPair(
        frontBar: Double,
        rearBar: Double,
        unit: PressureUnit = .bar,
        lang: CadenceLang = .en
    ) -> String {
        if unit == .psi {
            return "\(barToPsiValue(frontBar))/\(barToPsiValue(rearBar)) PSI"
        }
        let f = JSCompat.jsFixed(frontBar, decimals: 1)
        let r = JSCompat.jsFixed(rearBar, decimals: 1)
        if lang == .fr {
            return "\(f.replacingOccurrences(of: ".", with: ","))/\(r.replacingOccurrences(of: ".", with: ",")) bar"
        }
        return "\(f)/\(r) bar"
    }

    public static func inferBikeCategory(
        tireWidthMm: Double,
        bikeName: String? = nil,
        explicitCategory: BikeCategory? = nil,
        gearWeightKg: Double = 0
    ) -> BikeCategory {
        if let explicitCategory { return explicitCategory }
        let lower = (bikeName ?? "").lowercased()
        if gearWeightKg >= 5 || lower.contains("tour") || lower.contains("randon") {
            return .touring
        }
        if lower.contains("mtb") || lower.contains("vtt") || lower.contains("xc") || tireWidthMm >= 48 {
            return .mtb
        }
        if lower.contains("urban") || lower.contains("city") || lower.contains("commut") || lower.contains("omnium") {
            return .urban
        }
        if lower.contains("grvl") || lower.contains("gravel") || tireWidthMm >= 34 {
            return .gravel
        }
        return .road
    }

    public static func getWheelLoadSplit(category: BikeCategory, gearWeightKg: Double = 0) -> (frontPct: Int, rearPct: Int) {
        switch category {
        case .road:
            return (45, 55)
        case .gravel:
            return gearWeightKg >= 4 ? (42, 58) : (44, 56)
        case .touring:
            return (42, 58)
        case .mtb, .urban:
            return (41, 59)
        }
    }

    public static func calculate(_ input: TyrePressureInput) -> TyrePressureResult {
        let widthMm = max(23.0, min(65.0, input.tireWidthMm > 0 ? input.tireWidthMm : 38.0))
        let totalMassKg = max(45.0, min(180.0, input.systemMassKg > 0 ? input.systemMassKg : 80.0))
        let gearKg = max(0.0, input.gearWeightKg ?? 0.0)

        let category = inferBikeCategory(
            tireWidthMm: widthMm,
            bikeName: input.bikeName,
            explicitCategory: input.bikeCategory,
            gearWeightKg: gearKg
        )
        let casingType: CasingType = input.casingType ?? (category == .road ? .supple : .standard)
        let isHookless = input.isHookless ?? false

        let split = getWheelLoadSplit(category: category, gearWeightKg: gearKg)
        let frontLoadKg = totalMassKg * (Double(split.frontPct) / 100.0)
        let rearLoadKg = totalMassKg * (Double(split.rearPct) / 100.0)

        func computeWheelBar(_ wheelLoadKg: Double) -> Double {
            3.55 * pow(wheelLoadKg / 40.0, 0.75) * pow(35.0 / widthMm, 1.65)
        }

        let casingFactor: Double = casingType == .supple ? 0.97 : (casingType == .reinforced ? 1.05 : 1.0)
        let totalPct = max(1.0, input.pavedPct + input.gravelPct + input.singletrackPct)
        let gravelRatio = max(0.0, min(1.0, input.gravelPct / totalPct))
        let singletrackRatio = max(0.0, min(1.0, input.singletrackPct / totalPct))

        let surfaceFactor = max(0.76, 1.0 - gravelRatio * 0.14 - singletrackRatio * 0.24)
        let tubeFactor = input.isTubeless ? 1.0 : 1.08
        let tubeFloorBonus = input.isTubeless ? 0.0 : 0.2

        let rawFront = computeWheelBar(frontLoadKg) * casingFactor * surfaceFactor * tubeFactor + tubeFloorBonus * 0.5
        let rawRear = computeWheelBar(rearLoadKg) * casingFactor * surfaceFactor * tubeFactor + tubeFloorBonus * 0.5

        let minSafeBar = input.isTubeless ? 1.4 : 1.7
        let maxSafeBar = isHookless ? 5.0 : 7.5
        let hooklessCapped = isHookless && (rawFront > 5.0 || rawRear > 5.0)

        let frontBar = JSCompat.roundTo(max(minSafeBar, min(maxSafeBar, rawFront)), decimals: 1)
        let rearBar = JSCompat.roundTo(max(minSafeBar + 0.1, min(maxSafeBar, rawRear)), decimals: 1)

        return TyrePressureResult(
            frontBar: frontBar,
            rearBar: rearBar,
            frontPsi: barToPsiValue(frontBar),
            rearPsi: barToPsiValue(rearBar),
            frontLoadPct: split.frontPct,
            rearLoadPct: split.rearPct,
            bikeCategory: category,
            casingType: casingType,
            isHookless: isHookless,
            hooklessCapped: hooklessCapped
        )
    }

    public static func buildInput(
        from bike: BikeSpec?,
        systemMassKg: Double,
        gearWeightKg: Double,
        pavedPct: Double,
        gravelPct: Double,
        singletrackPct: Double
    ) -> TyrePressureInput {
        TyrePressureInput(
            systemMassKg: systemMassKg,
            tireWidthMm: bike?.tireWidthMm ?? 38,
            isTubeless: bike?.isTubeless ?? true,
            pavedPct: pavedPct,
            gravelPct: gravelPct,
            singletrackPct: singletrackPct,
            gearWeightKg: gearWeightKg,
            bikeCategory: bike?.bikeCategory,
            casingType: bike?.casingType,
            isHookless: bike?.isHookless,
            bikeName: bike?.name
        )
    }
}
