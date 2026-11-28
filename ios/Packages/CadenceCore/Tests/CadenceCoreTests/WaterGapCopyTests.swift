import Foundation
import Testing
@testable import CadenceCore

@Suite("WaterGapCopy Tests")
struct WaterGapCopyTests {
    @Test("formatKm rounding and locale formatting")
    func formatKmValues() {
        #expect(WaterGapCopy.formatKm(12.5, lang: .en) == "12.5")
        #expect(WaterGapCopy.formatKm(12.5, lang: .fr) == "12,5")
        #expect(WaterGapCopy.formatKm(12.04, lang: .en) == "12.0")
        #expect(WaterGapCopy.formatKm(12.04, lang: .fr) == "12,0")
        #expect(WaterGapCopy.formatKm(12.55, lang: .en) == "12.6")
        #expect(WaterGapCopy.formatKm(12.55, lang: .fr) == "12,6")
        #expect(WaterGapCopy.formatKm(1234.5, lang: .en) == "1,234.5")
        #expect(WaterGapCopy.formatKm(1234.5, lang: .fr) == "1\u{202F}234,5")
    }

    @Test("formatCriticalGapAdvice handles nil, zero extra, singular, and plural")
    func criticalGapAdvice() {
        #expect(WaterGapCopy.formatCriticalGapAdvice(nil, lang: .en) == "Fill every bottle before km 0")
        #expect(WaterGapCopy.formatCriticalGapAdvice(nil, lang: .fr) == "Remplissez tous vos bidons avant le km 0")

        let zeroGap = WaterGapAlert(startKm: 0, endKm: 65, distanceKm: 65, severity: .critical, extraPackableBidons: 0)
        #expect(WaterGapCopy.formatCriticalGapAdvice(zeroGap, lang: .en) == "Fill every bottle before km 0.0")
        #expect(WaterGapCopy.formatCriticalGapAdvice(zeroGap, lang: .fr) == "Remplissez tous vos bidons avant le km 0,0")

        let oneExtra = WaterGapAlert(startKm: 15, endKm: 80, distanceKm: 65, severity: .critical, extraPackableBidons: 1)
        #expect(WaterGapCopy.formatCriticalGapAdvice(oneExtra, lang: .en) == "Carry 1 extra bottle or plan a refill stop")
        #expect(WaterGapCopy.formatCriticalGapAdvice(oneExtra, lang: .fr) == "Emportez 1 bidon supplémentaire ou prévoyez un point d’eau")

        let twoExtra = WaterGapAlert(startKm: 15, endKm: 100, distanceKm: 85, severity: .critical, extraPackableBidons: 2)
        #expect(WaterGapCopy.formatCriticalGapAdvice(twoExtra, lang: .en) == "Carry 2 extra bottles or plan a refill stop")
        #expect(WaterGapCopy.formatCriticalGapAdvice(twoExtra, lang: .fr) == "Emportez 2 bidons supplémentaires ou prévoyez un point d’eau")
    }

    @Test("formatGapDetail covers under and over 100% bottle capacity in EN and FR")
    func gapDetailFormatting() {
        let under = WaterGapAlert(
            startKm: 10,
            endKm: 28.3,
            distanceKm: 18.3,
            severity: .caution,
            gapHours: 44.0 / 60.0,
            gapFluidNeedMl: 610,
            depletionPct: 47
        )
        #expect(WaterGapCopy.formatGapDetail(under, lang: .en) == "18.3 km (~44 min) · 610 ml (47% of your bottles)")
        #expect(WaterGapCopy.formatGapDetail(under, lang: .fr) == "18,3 km (~44 min) · 610 ml (47 % de vos bidons)")

        let over = WaterGapAlert(
            startKm: 20,
            endKm: 82.4,
            distanceKm: 62.4,
            severity: .critical,
            gapHours: 2.25,
            gapFluidNeedMl: 1350,
            depletionPct: 135
        )
        #expect(WaterGapCopy.formatGapDetail(over, lang: .en) == "62.4 km (~135 min) · 1,350 ml (more than your bottles hold)")
        #expect(WaterGapCopy.formatGapDetail(over, lang: .fr) == "62,4 km (~135 min) · 1\u{202F}350 ml (plus que vos bidons)")
    }
}
