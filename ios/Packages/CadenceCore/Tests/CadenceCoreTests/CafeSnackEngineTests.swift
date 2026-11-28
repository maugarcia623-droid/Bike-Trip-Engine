import Foundation
import Testing
@testable import CadenceCore

@Suite("CafeSnackEngine Tests")
struct CafeSnackEngineTests {
    @Test("Legacy ration default detection")
    func legacyRationDetection() {
        #expect(CafeSnackEngine.isLegacyRationDefault(nil) == true)
        #expect(CafeSnackEngine.isLegacyRationDefault("") == true)
        #expect(CafeSnackEngine.isLegacyRationDefault("double espresso & almond pastry") == true)
        #expect(CafeSnackEngine.isLegacyRationDefault("  Double Espresso & Almond Pastry ") == true)
        #expect(CafeSnackEngine.isLegacyRationDefault("   ") == false)
        #expect(CafeSnackEngine.isLegacyRationDefault("Banana bread") == false)
    }

    @Test("Dietary filter precedence matrix (EN and FR)")
    func snackPrecedenceMatrix() {
        // Default
        #expect(CafeSnackEngine.getCafeSnackSuggestion(filters: [], lang: .en) == "An espresso and a pastry of your choice")
        #expect(CafeSnackEngine.getCafeSnackSuggestion(filters: [], lang: .fr) == "Un expresso et une viennoiserie de votre choix")

        // Nut-free only
        #expect(CafeSnackEngine.getCafeSnackSuggestion(filters: [.nutFree], lang: .en) == "An espresso and an apple turnover")
        #expect(CafeSnackEngine.getCafeSnackSuggestion(filters: [.nutFree], lang: .fr) == "Un expresso et un chausson aux pommes")

        // Dairy-free or Vegan
        #expect(CafeSnackEngine.getCafeSnackSuggestion(filters: [.dairyFree], lang: .en) == "An espresso and a plant-based pastry")
        #expect(CafeSnackEngine.getCafeSnackSuggestion(filters: [.vegan], lang: .fr) == "Un expresso et une viennoiserie végétale")

        // Vegan / Dairy-free + Nut-free
        #expect(CafeSnackEngine.getCafeSnackSuggestion(filters: [.vegan, .nutFree], lang: .en) == "An espresso and sourdough toast with jam")
        #expect(CafeSnackEngine.getCafeSnackSuggestion(filters: [.dairyFree, .nutFree], lang: .fr) == "Un expresso et un pain au levain avec confiture")

        // Gluten-free or Low-FODMAP overrides all others
        #expect(CafeSnackEngine.getCafeSnackSuggestion(filters: [.glutenFree], lang: .en) == "An espresso and a rice cake or a banana")
        #expect(CafeSnackEngine.getCafeSnackSuggestion(filters: [.lowFodmap], lang: .fr) == "Un expresso et une galette de riz ou une banane")
        #expect(CafeSnackEngine.getCafeSnackSuggestion(filters: [.glutenFree, .vegan, .nutFree], lang: .en) == "An espresso and a rice cake or a banana")
    }
}
