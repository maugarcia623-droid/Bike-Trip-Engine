import Foundation

public enum CafeSnackEngine {
    private static let legacyRationDefaults: Set<String> = [
        "double espresso & almond pastry",
    ]

    public static func isLegacyRationDefault(_ ration: String? = nil) -> Bool {
        guard let ration, !ration.isEmpty else { return true }
        return legacyRationDefaults.contains(
            ration.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
        )
    }

    public static func getCafeSnackSuggestion(
        filters: [DietaryFilter],
        lang: CadenceLang = .en
    ) -> String {
        let isFr = lang == .fr
        let vegan = filters.contains(.vegan)
        let glutenFree = filters.contains(.glutenFree) || filters.contains(.lowFodmap)
        let dairyFree = filters.contains(.dairyFree) || vegan
        let nutFree = filters.contains(.nutFree)

        if glutenFree {
            return isFr
                ? "Un expresso et une galette de riz ou une banane"
                : "An espresso and a rice cake or a banana"
        }
        if dairyFree {
            if nutFree {
                return isFr
                    ? "Un expresso et un pain au levain avec confiture"
                    : "An espresso and sourdough toast with jam"
            }
            return isFr
                ? "Un expresso et une viennoiserie végétale"
                : "An espresso and a plant-based pastry"
        }
        if nutFree {
            return isFr
                ? "Un expresso et un chausson aux pommes"
                : "An espresso and an apple turnover"
        }
        return isFr
            ? "Un expresso et une viennoiserie de votre choix"
            : "An espresso and a pastry of your choice"
    }
}
