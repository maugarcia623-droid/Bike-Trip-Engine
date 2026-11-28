import Foundation

public enum WaterGapCopy {
    /// Locale-aware one-decimal distance (`12.5` / `12,5`).
    public static func formatKm(_ km: Double, lang: CadenceLang = .en) -> String {
        let rounded = km.isFinite ? (JSCompat.jsRound(km * 10.0) / 10.0) : 0.0
        let safeVal = rounded == 0 ? 0.0 : rounded
        let formatter = NumberFormatter()
        formatter.numberStyle = .decimal
        formatter.locale = Locale(identifier: lang == .fr ? "fr-FR" : "en-US")
        formatter.minimumFractionDigits = 1
        formatter.maximumFractionDigits = 1
        formatter.usesGroupingSeparator = true
        return formatter.string(from: NSNumber(value: safeVal)) ?? JSCompat.jsFixed(safeVal, decimals: 1)
    }

    /// Actionable packing advice for a critical gap.
    /// Uses `extraPackableBidons` (bottles beyond frame cages), never the gap total.
    public static func formatCriticalGapAdvice(
        _ gap: WaterGapAlert? = nil,
        lang: CadenceLang = .en
    ) -> String {
        let isFr = lang == .fr
        let extra = gap?.extraPackableBidons ?? 0
        let start = gap.map { formatKm($0.startKm, lang: lang) } ?? "0"
        if extra > 0 {
            let plural = extra > 1 ? "s" : ""
            return isFr
                ? "Emportez \(extra) bidon\(plural) supplémentaire\(plural) ou prévoyez un point d’eau"
                : "Carry \(extra) extra bottle\(plural) or plan a refill stop"
        }
        return isFr
            ? "Remplissez tous vos bidons avant le km \(start)"
            : "Fill every bottle before km \(start)"
    }

    /// Compact `"18.3 km (~44 min) · 610 ml (47% of your bottles)"` detail line.
    public static func formatGapDetail(
        _ gap: WaterGapAlert,
        lang: CadenceLang = .en
    ) -> String {
        let isFr = lang == .fr
        let minutes = JSCompat.jsRoundInt((gap.gapHours ?? 0.0) * 60.0)
        let pct = gap.depletionPct ?? 0
        let mlRaw = gap.gapFluidNeedMl ?? 0
        let mlFormatter = NumberFormatter()
        mlFormatter.numberStyle = .decimal
        mlFormatter.locale = Locale(identifier: isFr ? "fr-FR" : "en-US")
        mlFormatter.maximumFractionDigits = 0
        mlFormatter.usesGroupingSeparator = true
        let ml = mlFormatter.string(from: NSNumber(value: mlRaw)) ?? String(mlRaw)

        let capacity: String
        if pct > 100 {
            capacity = isFr ? "plus que vos bidons" : "more than your bottles hold"
        } else {
            capacity = isFr ? "\(pct) % de vos bidons" : "\(pct)% of your bottles"
        }

        return "\(formatKm(gap.distanceKm, lang: lang)) km (~\(minutes) min) · \(ml) ml (\(capacity))"
    }
}
