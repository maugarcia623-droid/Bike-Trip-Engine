import Foundation

public struct ResolvedCompliantPantry: Sendable, Equatable {
    public let preRide: PantryItem
    public let onBikeLiquid: PantryItem
    public let onBikeSolids: [PantryItem]
    public let postRide: PantryItem
    public let allCompliantItems: [PantryItem]
}

public enum PantryCatalog {
    public static let defaultItems: [PantryItem] = [
        // PRE-RIDE (4)
        PantryItem(
            id: "pre-baguette-honey", slot: .preRide,
            nameEn: "Toasted Baguette with Wildflower Honey", nameFr: "Baguette blanche grillée au miel de fleurs",
            portionLabelEn: "2 thick slices toasted bread & honey", portionLabelFr: "2 tranches de pain grillé & miel",
            carbsG: 62, proteinG: 6, kcal: 300, flavor: .sweet,
            compliance: [.vegan: false, .glutenFree: false, .dairyFree: true, .nutFree: true, .lowFodmap: false]
        ),
        PantryItem(
            id: "pre-oats-maple-banana", slot: .preRide,
            nameEn: "Oatmeal with Maple Syrup & Ripe Banana", nameFr: "Flocons d’avoine au sirop d’érable & banane",
            portionLabelEn: "1 bowl warm oatmeal with fruit", portionLabelFr: "1 bol de flocons d’avoine aux fruits",
            carbsG: 68, proteinG: 8, kcal: 340, flavor: .sweet,
            compliance: [.vegan: true, .glutenFree: true, .dairyFree: true, .nutFree: true, .lowFodmap: true]
        ),
        PantryItem(
            id: "pre-rice-porridge-jam", slot: .preRide,
            nameEn: "White Rice Porridge with Strawberry Jam", nameFr: "Riz au lait végétal doux & confiture",
            portionLabelEn: "1 bowl sweet rice porridge", portionLabelFr: "1 bol de riz doux à la confiture",
            carbsG: 72, proteinG: 5, kcal: 330, flavor: .sweet,
            compliance: [.vegan: true, .glutenFree: true, .dairyFree: true, .nutFree: true, .lowFodmap: true]
        ),
        PantryItem(
            id: "pre-savory-potato-hash", slot: .preRide,
            nameEn: "Steamed Baby Potato Hash with Olive Oil & Salt", nameFr: "Poêlée de pommes de terre vapeur & huile d’olive",
            portionLabelEn: "1 bowl savory seasoned potatoes", portionLabelFr: "1 bol de pommes de terre assaisonnées",
            carbsG: 58, proteinG: 6, kcal: 310, flavor: .savory,
            compliance: [.vegan: true, .glutenFree: true, .dairyFree: true, .nutFree: true, .lowFodmap: true]
        ),

        // ON-BIKE LIQUID (4)
        PantryItem(
            id: "liq-pressed-apple-grape", slot: .onBikeLiquid,
            nameEn: "50/50 Water & 100% Pressed Apple/Grape Juice", nameFr: "50/50 eau & pur jus pressé pomme/raisin",
            portionLabelEn: "1 bottle diluted fruit juice", portionLabelFr: "1 bidon de jus naturel dilué",
            carbsG: 36, proteinG: 0, kcal: 145, flavor: .sweet,
            compliance: [.vegan: true, .glutenFree: true, .dairyFree: true, .nutFree: true, .lowFodmap: false]
        ),
        PantryItem(
            id: "liq-maple-citrus-salted", slot: .onBikeLiquid,
            nameEn: "Maple Syrup, Lemon Juice & Sea Salt Bidon", nameFr: "Élixir eau, sirop d’érable, citron & sel de mer",
            portionLabelEn: "1 bottle maple citrus hydration", portionLabelFr: "1 bidon d’hydratation érable-citron",
            carbsG: 34, proteinG: 0, kcal: 136, flavor: .sweet,
            compliance: [.vegan: true, .glutenFree: true, .dairyFree: true, .nutFree: true, .lowFodmap: true]
        ),
        PantryItem(
            id: "liq-isotonic-36", slot: .onBikeLiquid,
            nameEn: "Isotonic Dual-Carb Drink Mix (Maltodextrin/Fructose)", nameFr: "Boisson isotonique glucidique 2:1",
            portionLabelEn: "1 bottle isotonic sports mix", portionLabelFr: "1 bidon de boisson isotonique",
            carbsG: 36, proteinG: 0, kcal: 144, flavor: .neutral,
            compliance: [.vegan: true, .glutenFree: true, .dairyFree: true, .nutFree: true, .lowFodmap: true]
        ),
        PantryItem(
            id: "liq-high-carb-cluster-60", slot: .onBikeLiquid,
            nameEn: "High-Carb Cluster Dextrin Fuel", nameFr: "Boisson haute énergie cluster dextrine",
            portionLabelEn: "1 bottle high-concentration carb fuel", portionLabelFr: "1 bidon concentré haute intensité",
            carbsG: 60, proteinG: 0, kcal: 240, flavor: .neutral,
            compliance: [.vegan: true, .glutenFree: true, .dairyFree: true, .nutFree: true, .lowFodmap: true]
        ),

        // ON-BIKE SOLID (12)
        PantryItem(
            id: "sol-medjool-date", slot: .onBikeSolid,
            nameEn: "Medjool Dates (Pitted)", nameFr: "Dattes Medjool dénoyautées",
            portionLabelEn: "1 plump date or dried fruit", portionLabelFr: "1 datte ou fruit sec",
            carbsG: 17, proteinG: 1, kcal: 68, flavor: .sweet,
            compliance: [.vegan: true, .glutenFree: true, .dairyFree: true, .nutFree: true, .lowFodmap: false]
        ),
        PantryItem(
            id: "sol-fruit-chew-fig", slot: .onBikeSolid,
            nameEn: "Artisanal Fruit Chews & Dried Figs", nameFr: "Pâtes de fruits artisanales & figues séchées",
            portionLabelEn: "1 fruit chew or dried fig", portionLabelFr: "1 pâte de fruits ou figue",
            carbsG: 12, proteinG: 0, kcal: 48, flavor: .sweet,
            compliance: [.vegan: true, .glutenFree: true, .dairyFree: true, .nutFree: true, .lowFodmap: false]
        ),
        PantryItem(
            id: "sol-ripe-banana", slot: .onBikeSolid,
            nameEn: "Fresh Firm-Ripe Banana", nameFr: "Banane mûre fraîche",
            portionLabelEn: "1 fresh banana", portionLabelFr: "1 banane fraîche",
            carbsG: 23, proteinG: 1, kcal: 95, flavor: .sweet,
            compliance: [.vegan: true, .glutenFree: true, .dairyFree: true, .nutFree: true, .lowFodmap: true]
        ),
        PantryItem(
            id: "sol-pain-depices", slot: .onBikeSolid,
            nameEn: "Traditional Spiced Honey Bread (Pain d’Épices)", nameFr: "Pain d’épices traditionnel au miel",
            portionLabelEn: "1 slice spiced honey cake", portionLabelFr: "1 tranche de pain d’épices",
            carbsG: 22, proteinG: 2, kcal: 98, flavor: .sweet,
            compliance: [.vegan: false, .glutenFree: false, .dairyFree: true, .nutFree: true, .lowFodmap: false]
        ),
        PantryItem(
            id: "sol-maple-oat-bar", slot: .onBikeSolid,
            nameEn: "Chewy Maple Oat Pocket Bar", nameFr: "Barre moelleuse avoine & érable",
            portionLabelEn: "1 oat flapjack pocket bar", portionLabelFr: "1 barre d’avoine de poche",
            carbsG: 28, proteinG: 3, kcal: 140, flavor: .sweet,
            compliance: [.vegan: true, .glutenFree: true, .dairyFree: true, .nutFree: true, .lowFodmap: true]
        ),
        PantryItem(
            id: "sol-almond-marzipan", slot: .onBikeSolid,
            nameEn: "Almond Marzipan / Pâte d’Amande", nameFr: "Pâte d’amande artisanale",
            portionLabelEn: "1 roll almond marzipan", portionLabelFr: "1 rouleau de pâte d’amande",
            carbsG: 16, proteinG: 3, kcal: 115, flavor: .sweet,
            compliance: [.vegan: true, .glutenFree: true, .dairyFree: true, .nutFree: false, .lowFodmap: true]
        ),
        PantryItem(
            id: "sol-salted-baby-potatoes", slot: .onBikeSolid,
            nameEn: "Boiled Baby Potatoes with Sea Salt", nameFr: "Grenailles vapeur salées à la fleur de sel",
            portionLabelEn: "2 salted baby potatoes", portionLabelFr: "2 petites pommes de terre salées",
            carbsG: 20, proteinG: 2, kcal: 92, flavor: .savory,
            compliance: [.vegan: true, .glutenFree: true, .dairyFree: true, .nutFree: true, .lowFodmap: true]
        ),
        PantryItem(
            id: "sol-savory-rice-cake", slot: .onBikeSolid,
            nameEn: "Savory Sushi Rice Cake with Soy & Sesame", nameFr: "Galette de riz japonais salée au sésame",
            portionLabelEn: "1 savory wrapped rice bar", portionLabelFr: "1 bouchée de riz salée",
            carbsG: 25, proteinG: 2, kcal: 125, flavor: .savory,
            compliance: [.vegan: true, .glutenFree: true, .dairyFree: true, .nutFree: true, .lowFodmap: true]
        ),
        PantryItem(
            id: "sol-salted-pretzels-gf", slot: .onBikeSolid,
            nameEn: "Gluten-Free Sea Salt Mini Pretzels", nameFr: "Mini bretzels sans gluten au sel de mer",
            portionLabelEn: "1 pocket handful salted pretzels", portionLabelFr: "1 poignée de bretzels salés",
            carbsG: 22, proteinG: 2, kcal: 100, flavor: .savory,
            compliance: [.vegan: true, .glutenFree: true, .dairyFree: true, .nutFree: true, .lowFodmap: true]
        ),
        PantryItem(
            id: "sol-gel-standard-25", slot: .onBikeSolid,
            nameEn: "Standard Hydrogel Energy Gel", nameFr: "Gel énergétique standard",
            portionLabelEn: "1 quick energy gel", portionLabelFr: "1 gel énergétique rapide",
            carbsG: 25, proteinG: 0, kcal: 100, flavor: .neutral,
            compliance: [.vegan: true, .glutenFree: true, .dairyFree: true, .nutFree: true, .lowFodmap: true]
        ),
        PantryItem(
            id: "sol-gel-dual-25", slot: .onBikeSolid,
            nameEn: "Dual-Source Fructose/Maltodextrin Gel", nameFr: "Gel énergétique double source 2:1",
            portionLabelEn: "1 dual-source climb gel", portionLabelFr: "1 gel d’appoint pour les bosses",
            carbsG: 25, proteinG: 0, kcal: 100, flavor: .sweet,
            compliance: [.vegan: true, .glutenFree: true, .dairyFree: true, .nutFree: true, .lowFodmap: false]
        ),
        PantryItem(
            id: "sol-gel-pro-high-40", slot: .onBikeSolid,
            nameEn: "High-Carb Hydrogel Pouch", nameFr: "Poche hydrogel haute concentration",
            portionLabelEn: "1 high-dose energy pouch", portionLabelFr: "1 poche d’énergie concentrée",
            carbsG: 40, proteinG: 0, kcal: 160, flavor: .neutral,
            compliance: [.vegan: true, .glutenFree: true, .dairyFree: true, .nutFree: true, .lowFodmap: true]
        ),

        // POST-RIDE RECOVERY (4)
        PantryItem(
            id: "rec-skyr-grape", slot: .postRideRecovery,
            nameEn: "Plain Greek Yogurt with Pure Grape Juice", nameFr: "Yaourt grec nature & pur jus de raisin noir",
            portionLabelEn: "1 bowl yogurt & fruit juice", portionLabelFr: "1 bol yaourt & jus de fruit",
            carbsG: 46, proteinG: 22, kcal: 275, flavor: .sweet,
            compliance: [.vegan: false, .glutenFree: true, .dairyFree: false, .nutFree: true, .lowFodmap: false],
            requiresFridge: true
        ),
        PantryItem(
            id: "rec-soy-yogurt-maple-tart", slot: .postRideRecovery,
            nameEn: "Organic Soy Yogurt with Maple & Tart Cherry", nameFr: "Yaourt de soja bio à l’érable & griotte",
            portionLabelEn: "1 bowl plant yogurt & cherry juice", portionLabelFr: "1 bol yaourt végétal & griotte",
            carbsG: 48, proteinG: 20, kcal: 285, flavor: .sweet,
            compliance: [.vegan: true, .glutenFree: true, .dairyFree: true, .nutFree: true, .lowFodmap: true],
            requiresFridge: true
        ),
        PantryItem(
            id: "rec-pea-rice-shake-banana", slot: .postRideRecovery,
            nameEn: "Plant Protein Shake (Pea/Rice) with Banana", nameFr: "Shake protéines végétales (pois/riz) & banane",
            portionLabelEn: "1 protein shake & whole fruit", portionLabelFr: "1 shake protéiné & fruit frais",
            carbsG: 52, proteinG: 24, kcal: 315, flavor: .sweet,
            compliance: [.vegan: true, .glutenFree: true, .dairyFree: true, .nutFree: true, .lowFodmap: true],
            requiresFridge: false
        ),
        PantryItem(
            id: "rec-savory-tofu-rice-bowl", slot: .postRideRecovery,
            nameEn: "Warm Jasmine Rice Bowl with Baked Tofu & Tamari", nameFr: "Bol de riz jasmin au tofu grillé & tamari",
            portionLabelEn: "1 warm savory recovery rice bowl", portionLabelFr: "1 bol chaud de riz & protéines",
            carbsG: 58, proteinG: 23, kcal: 360, flavor: .savory,
            compliance: [.vegan: true, .glutenFree: true, .dairyFree: true, .nutFree: true, .lowFodmap: true],
            requiresFridge: false
        ),
    ]

    public static func isItemCompliant(_ item: PantryItem, filters: [DietaryFilter]) -> Bool {
        if filters.isEmpty { return true }
        return filters.allSatisfy { item.isCompliant(with: $0) }
    }

    public static func defaultPantryIds(for preference: NutritionPreference?, styleOverride: String? = nil) -> [String] {
        if styleOverride == "savory-endurance" {
            return [
                "pre-savory-potato-hash",
                "liq-maple-citrus-salted",
                "sol-salted-baby-potatoes",
                "sol-savory-rice-cake",
                "sol-salted-pretzels-gf",
                "rec-savory-tofu-rice-bowl",
            ]
        }
        switch preference {
        case .sportsFuel:
            return [
                "pre-rice-porridge-jam",
                "liq-isotonic-36",
                "sol-gel-standard-25",
                "sol-gel-pro-high-40",
                "rec-pea-rice-shake-banana",
            ]
        case .mixed:
            return [
                "pre-baguette-honey",
                "liq-pressed-apple-grape",
                "sol-medjool-date",
                "sol-gel-standard-25",
                "rec-skyr-grape",
            ]
        case .realFood, .none:
            return [
                "pre-baguette-honey",
                "liq-pressed-apple-grape",
                "sol-medjool-date",
                "sol-fruit-chew-fig",
                "rec-skyr-grape",
            ]
        }
    }

    public static func resolveCompliantPantry(
        specs: RiderSpecs,
        hasDestinationFridge: Bool = true
    ) -> ResolvedCompliantPantry {
        let fullCatalog = defaultItems + (specs.customPantryItems ?? [])
        let filters = specs.dietaryFilters ?? []
        let allCompliant = fullCatalog.filter { isItemCompliant($0, filters: filters) }

        let compliantPre = allCompliant.filter { $0.slot == .preRide }
        let compliantLiq = allCompliant.filter { $0.slot == .onBikeLiquid }
        let compliantSol = allCompliant.filter { $0.slot == .onBikeSolid }
        let compliantPost = allCompliant.filter {
            $0.slot == .postRideRecovery && (hasDestinationFridge || $0.requiresFridge != true)
        }

        let activeIds: [String]
        if let ids = specs.activePantryIds, !ids.isEmpty {
            activeIds = ids
        } else {
            activeIds = defaultPantryIds(for: specs.nutritionPreference)
        }

        let preRide = compliantPre.first { activeIds.contains($0.id) }
            ?? compliantPre.first
            ?? defaultItems[0]
        let onBikeLiquid = compliantLiq.first { activeIds.contains($0.id) }
            ?? compliantLiq.first
            ?? defaultItems[4]

        let activeSolids = compliantSol.filter { activeIds.contains($0.id) }
        let onBikeSolids: [PantryItem]
        if !activeSolids.isEmpty {
            onBikeSolids = activeSolids
        } else if !compliantSol.isEmpty {
            onBikeSolids = Array(compliantSol.prefix(2))
        } else {
            onBikeSolids = [defaultItems[8]]
        }

        let postRide = compliantPost.first { activeIds.contains($0.id) }
            ?? compliantPost.first
            ?? defaultItems[22]

        return ResolvedCompliantPantry(
            preRide: preRide,
            onBikeLiquid: onBikeLiquid,
            onBikeSolids: onBikeSolids,
            postRide: postRide,
            allCompliantItems: allCompliant
        )
    }

    public static func getCafeSnackSuggestion(filters: [DietaryFilter] = [], lang: CadenceLang = .en) -> String {
        let isFr = lang == .fr
        let isRestricted = filters.contains(.glutenFree) || filters.contains(.vegan) || filters.contains(.dairyFree) || filters.contains(.lowFodmap)
        if isRestricted {
            return isFr
                ? "Double expresso & galette d’avoine à l’érable ou banane fraîche"
                : "Double espresso & maple oat bar or fresh banana"
        }
        if filters.contains(.nutFree) {
            return isFr
                ? "Double expresso & pain au chocolat ou brioche pur beurre"
                : "Double espresso & chocolate pastry or brioche"
        }
        return isFr
            ? "Double expresso & viennoiserie artisanale ou banane"
            : "Double espresso & artisanal bakery pastry or banana"
    }
}
