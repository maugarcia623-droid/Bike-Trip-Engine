import Foundation

public typealias ArchetypeMode = String // "BIKEPACKING" | "SPORT" | "COMMUTE" | "ESCAPADE"

public struct ChecklistGenerationOptions: Sendable {
    public var lang: CadenceLang
    public var includePunctureKit: Bool
    public var includeExtraRavito: Bool
    public var customChips: [String]
    public var totalDays: Int
    public var isTubeless: Bool
    public var carbTargetGPerHr: Double
    public var nutritionPreference: NutritionPreference
    public var bidonSizeMl: Int?
    public var frameBottleSlots: Int?
    public var rideHours: Double?
    public var legWatts: Double?

    public init(
        lang: CadenceLang = .en,
        includePunctureKit: Bool = false,
        includeExtraRavito: Bool = false,
        customChips: [String] = [],
        totalDays: Int = 1,
        isTubeless: Bool = false,
        carbTargetGPerHr: Double = 60,
        nutritionPreference: NutritionPreference = .realFood,
        bidonSizeMl: Int? = nil,
        frameBottleSlots: Int? = nil,
        rideHours: Double? = nil,
        legWatts: Double? = nil
    ) {
        self.lang = lang
        self.includePunctureKit = includePunctureKit
        self.includeExtraRavito = includeExtraRavito
        self.customChips = customChips
        self.totalDays = totalDays
        self.isTubeless = isTubeless
        self.carbTargetGPerHr = carbTargetGPerHr
        self.nutritionPreference = nutritionPreference
        self.bidonSizeMl = bidonSizeMl
        self.frameBottleSlots = frameBottleSlots
        self.rideHours = rideHours
        self.legWatts = legWatts
    }
}

public typealias ReadinessLevel = String // "needs-change" | "worth-tweak" | "good-to-go"

public struct ReadinessBandRange: Codable, Sendable, Equatable {
    public var min: Int
    public var max: Int

    public init(min: Int, max: Int) {
        self.min = min
        self.max = max
    }
}

public struct ReadinessWeatherInput: Codable, Sendable, Equatable {
    public var rainRiskPct: Double
    public var baseWindKmH: Double
    public var gustKmH: Double
    public var headwindKmH: Double
    public var feelsLikeC: Double

    public init(rainRiskPct: Double, baseWindKmH: Double, gustKmH: Double, headwindKmH: Double, feelsLikeC: Double) {
        self.rainRiskPct = rainRiskPct
        self.baseWindKmH = baseWindKmH
        self.gustKmH = gustKmH
        self.headwindKmH = headwindKmH
        self.feelsLikeC = feelsLikeC
    }
}

public struct ReadinessBikeInput: Codable, Sendable, Equatable {
    public var name: String?
    public var category: BikeCategory?
    public var tireWidthMm: Double
    public var isTubeless: Bool

    public init(name: String? = nil, category: BikeCategory? = nil, tireWidthMm: Double, isTubeless: Bool) {
        self.name = name
        self.category = category
        self.tireWidthMm = tireWidthMm
        self.isTubeless = isTubeless
    }
}

public struct ReadinessTerrainInput: Codable, Sendable, Equatable {
    public var hasSurfaceData: Bool
    public var gravelPct: Double
    public var singletrackPct: Double
    public var suitabilityLevel: GravelSuitabilityLevel?

    public init(hasSurfaceData: Bool, gravelPct: Double, singletrackPct: Double, suitabilityLevel: GravelSuitabilityLevel? = nil) {
        self.hasSurfaceData = hasSurfaceData
        self.gravelPct = gravelPct
        self.singletrackPct = singletrackPct
        self.suitabilityLevel = suitabilityLevel
    }
}

public struct ReadinessEffortInput: Codable, Sendable, Equatable {
    public var ftpPercent: Double
    public var movingHours: Double
    public var powerZone: String?
    public var riderLevel: RiderLevel?
    public var plannedStopMinutes: Double?
    public var isPreDawnWinter: Bool?

    public init(
        ftpPercent: Double,
        movingHours: Double,
        powerZone: String? = nil,
        riderLevel: RiderLevel? = nil,
        plannedStopMinutes: Double? = nil,
        isPreDawnWinter: Bool? = nil
    ) {
        self.ftpPercent = ftpPercent
        self.movingHours = movingHours
        self.powerZone = powerZone
        self.riderLevel = riderLevel
        self.plannedStopMinutes = plannedStopMinutes
        self.isPreDawnWinter = isPreDawnWinter
    }
}

public struct ReadinessChecklistInput: Codable, Sendable, Equatable {
    public var total: Int
    public var checked: Int
    public var criticalTotal: Int
    public var criticalChecked: Int

    public init(total: Int, checked: Int, criticalTotal: Int, criticalChecked: Int) {
        self.total = total
        self.checked = checked
        self.criticalTotal = criticalTotal
        self.criticalChecked = criticalChecked
    }
}

public struct ReadinessLightInput: Codable, Sendable, Equatable {
    public var nightPercent: Double
    public var twilightPercent: Double

    public init(nightPercent: Double, twilightPercent: Double) {
        self.nightPercent = nightPercent
        self.twilightPercent = twilightPercent
    }
}

public struct ReadinessRouteInput: Codable, Sendable, Equatable {
    public var worstSeverity: String // "critical" | "warning" | "info" | "clear"
    public var issueCount: Int
    public var headline: String?

    public init(worstSeverity: String, issueCount: Int, headline: String? = nil) {
        self.worstSeverity = worstSeverity
        self.issueCount = issueCount
        self.headline = headline
    }
}

public struct RideReadinessInput: Codable, Sendable, Equatable {
    public var lang: CadenceLang?
    public var weather: ReadinessWeatherInput
    public var bike: ReadinessBikeInput
    public var terrain: ReadinessTerrainInput
    public var effort: ReadinessEffortInput
    public var checklist: ReadinessChecklistInput
    public var light: ReadinessLightInput
    public var route: ReadinessRouteInput
    public var goStatus: String // "GO" | "CAUTION" | "NO-GO"

    public init(
        lang: CadenceLang? = .en,
        weather: ReadinessWeatherInput,
        bike: ReadinessBikeInput,
        terrain: ReadinessTerrainInput,
        effort: ReadinessEffortInput,
        checklist: ReadinessChecklistInput,
        light: ReadinessLightInput,
        route: ReadinessRouteInput,
        goStatus: String = "GO"
    ) {
        self.lang = lang
        self.weather = weather
        self.bike = bike
        self.terrain = terrain
        self.effort = effort
        self.checklist = checklist
        self.light = light
        self.route = route
        self.goStatus = goStatus
    }
}

public struct ReadinessFactor: Codable, Sendable, Equatable {
    public var id: String
    public var label: String
    public var score: Int
    public var weight: Double
    public var pointsLost: Double
    public var note: String
    public var tip: String?
    public var action: String?
    public var ctaLabel: String?
    public var applicable: Bool

    public init(
        id: String,
        label: String,
        score: Int,
        weight: Double,
        pointsLost: Double,
        note: String,
        tip: String? = nil,
        action: String? = nil,
        ctaLabel: String? = nil,
        applicable: Bool
    ) {
        self.id = id
        self.label = label
        self.score = score
        self.weight = weight
        self.pointsLost = pointsLost
        self.note = note
        self.tip = tip
        self.action = action
        self.ctaLabel = ctaLabel
        self.applicable = applicable
    }
}

public struct ReadinessTopLift: Codable, Sendable, Equatable {
    public var factorId: String
    public var tip: String
    public var gain: Int
    public var action: String
    public var ctaLabel: String

    public init(factorId: String, tip: String, gain: Int, action: String, ctaLabel: String) {
        self.factorId = factorId
        self.tip = tip
        self.gain = gain
        self.action = action
        self.ctaLabel = ctaLabel
    }
}

public struct RideReadinessResult: Codable, Sendable, Equatable {
    public var score: Int
    public var level: ReadinessLevel
    public var label: String
    public var summary: String
    public var factors: [ReadinessFactor]
    public var topLift: ReadinessTopLift?
    public var capReason: String?

    public init(
        score: Int,
        level: ReadinessLevel,
        label: String,
        summary: String,
        factors: [ReadinessFactor],
        topLift: ReadinessTopLift? = nil,
        capReason: String? = nil
    ) {
        self.score = score
        self.level = level
        self.label = label
        self.summary = summary
        self.factors = factors
        self.topLift = topLift
        self.capReason = capReason
    }
}

public enum RideReadinessEngine {
    public static let readinessBands: [String: ReadinessBandRange] = [
        "needs-change": ReadinessBandRange(min: 0, max: 44),
        "worth-tweak": ReadinessBandRange(min: 45, max: 74),
        "good-to-go": ReadinessBandRange(min: 75, max: 100),
    ]

    private static let factorWeights: [String: Double] = [
        "weather": 25,
        "terrain": 20,
        "effort": 20,
        "checklist": 15,
        "light": 10,
        "route": 10,
    ]

    public static func getReadinessLevel(_ score: Int) -> ReadinessLevel {
        if score >= 75 { return "good-to-go" }
        if score >= 45 { return "worth-tweak" }
        return "needs-change"
    }

    private static func stripDiacriticsUpper(_ text: String) -> String {
        text.folding(options: [.diacriticInsensitive, .caseInsensitive], locale: Locale(identifier: "en_US_POSIX"))
            .uppercased()
            .trimmingCharacters(in: .whitespacesAndNewlines)
    }

    public static func getArchetypeFromTag(tag: String? = nil, name: String? = nil) -> ArchetypeMode {
        let cleanTag = stripDiacriticsUpper(tag ?? "")
        if cleanTag.contains("VELOTAF") || cleanTag.contains("COMMUTE") || cleanTag.contains("TAF") ||
            cleanTag.contains("BOULOT") || cleanTag.contains("TRAVAIL") || cleanTag.contains("WORK") ||
            cleanTag.contains("OFFICE") {
            return "COMMUTE"
        }
        if cleanTag.contains("BIKEPACK") || cleanTag.contains("BIVOUAC") ||
            cleanTag.contains("ADVENTURE") || cleanTag.contains("AVENTURE") {
            return "BIKEPACKING"
        }
        if cleanTag.contains("SPORT") || cleanTag.contains("FONDO") || cleanTag.contains("TEMPO") ||
            cleanTag.contains("TRAINING") || cleanTag.contains("ENTRAINEMENT") || cleanTag.contains("CYCLOSPORTIVE") ||
            cleanTag.contains("COURSE") || cleanTag.contains("RACE") {
            return "SPORT"
        }
        if cleanTag.contains("ESCAPADE") || cleanTag.contains("HOTEL") || cleanTag.contains("LEISURE") ||
            cleanTag.contains("WEEKEND") || cleanTag.contains("WEEK-END") || cleanTag.contains("TOURING") ||
            cleanTag.contains("SEJOUR") || cleanTag.contains("ECHAPPEE") {
            return "ESCAPADE"
        }

        let cleanName = stripDiacriticsUpper(name ?? "")
        if cleanName.contains("VELOTAF") || cleanName.contains("COMMUTE") || cleanName.contains("TAF") ||
            cleanName.contains("BOULOT") || cleanName.contains("TRAVAIL") || cleanName.contains("WORK") ||
            cleanName.contains("OFFICE") {
            return "COMMUTE"
        }
        if cleanName.contains("BIKEPACK") || cleanName.contains("BIVOUAC") ||
            cleanName.contains("ADVENTURE") || cleanName.contains("AVENTURE") {
            return "BIKEPACKING"
        }
        if cleanName.contains("SPORT") || cleanName.contains("FONDO") || cleanName.contains("TEMPO") ||
            cleanName.contains("TRAINING") || cleanName.contains("ENTRAINEMENT") || cleanName.contains("CYCLOSPORTIVE") ||
            cleanName.contains("COURSE") || cleanName.contains("RACE") {
            return "SPORT"
        }
        if cleanName.contains("ESCAPADE") || cleanName.contains("HOTEL") || cleanName.contains("LEISURE") ||
            cleanName.contains("WEEKEND") || cleanName.contains("WEEK-END") || cleanName.contains("TOURING") ||
            cleanName.contains("SEJOUR") || cleanName.contains("ECHAPPEE") {
            return "ESCAPADE"
        }

        return "COMMUTE"
    }

    public static func generateTripChecklist(
        tag: String = "VÉLOTAF",
        distanceKm: Double = 35,
        weather: WeatherCondition? = nil,
        options: ChecklistGenerationOptions = ChecklistGenerationOptions(),
        riderSpecs: RiderBikeSpecs = .defaultSpecs
    ) -> [ChecklistItem] {
        let isFr = options.lang == .fr
        let totalDays = options.totalDays > 0 ? options.totalDays : 1
        let activeChips = options.customChips
        let isTubeless = options.isTubeless
        let carbTarget = options.carbTargetGPerHr
        let nutritionPref = options.nutritionPreference
        let telemetryMode = riderSpecs.telemetryMode ?? .quantitative
        let isQuant = telemetryMode == .quantitative
        let isFuelFirst = telemetryMode == .fuelFirst
        let fuelUnitsPerHr = max(1, JSCompat.jsRoundInt(carbTarget / 20.0))
        let bidonSizeMl = options.bidonSizeMl ?? riderSpecs.bidonSizeMl ?? 650
        let frameBottleSlots = options.frameBottleSlots ?? riderSpecs.frameBottleSlots ?? 2
        let rideHours = options.rideHours ?? max(0.25, distanceKm / 25.0)
        let hydrationPlan = NutritionEngine.calculateHydrationPlan(HydrationPlanParams(
            rideHours: rideHours,
            tempC: weather?.temperatureC ?? 18,
            legWatts: options.legWatts ?? 150,
            bidonSizeMl: Double(bidonSizeMl),
            frameBottleSlots: frameBottleSlots,
            isShortRide: rideHours < 0.75 && totalDays == 1,
            activeChips: activeChips
        ))

        let hydrationChecklistLabel: String
        if hydrationPlan.plannedRefillBidons == 0 {
            if isQuant {
                hydrationChecklistLabel = isFr
                    ? "\(hydrationPlan.carriedOnFrameBidons)× bidon(s) de \(bidonSizeMl) ml sur le vélo (\(hydrationPlan.totalFluidNeedMl) ml cible)"
                    : "\(hydrationPlan.carriedOnFrameBidons)× \(bidonSizeMl) ml bottle(s) on bike (\(hydrationPlan.totalFluidNeedMl) ml target)"
            } else {
                hydrationChecklistLabel = isFr
                    ? "\(hydrationPlan.carriedOnFrameBidons)× bidon(s) de \(bidonSizeMl) ml sur le vélo"
                    : "\(hydrationPlan.carriedOnFrameBidons)× \(bidonSizeMl) ml bottle(s) on bike"
            }
        } else {
            hydrationChecklistLabel = isFr
                ? "\(hydrationPlan.carriedOnFrameBidons)× bidon(s) de \(bidonSizeMl) ml sur cadre + \(hydrationPlan.plannedRefillBidons) recharge(s) prévue(s) en route"
                : "\(hydrationPlan.carriedOnFrameBidons)× \(bidonSizeMl) ml bottle(s) on frame + \(hydrationPlan.plannedRefillBidons) planned refill(s) on route"
        }

        let t = stripDiacriticsUpper(tag)
        let isCommute = t.contains("VELOTAF") || t.contains("COMMUTE") || t.contains("TAF") || t.contains("BOULOT") || t.contains("WORK") || t.contains("OFFICE")
        let isEscapade = !isCommute && (t.contains("ESCAPADE") || t.contains("HOTEL") || t.contains("LEISURE") || t.contains("WEEKEND") || t.contains("WEEK-END") || t.contains("TOURING") || t.contains("SEJOUR") || t.contains("ECHAPPEE"))
        let isSport = !isCommute && (t.contains("SPORT") || t.contains("TRAINING") || t.contains("RACE") || t.contains("FONDO") || t.contains("TEMPO"))
        let isBikepacking = !isCommute && (t.contains("BIKEPACKING") || t.contains("BIVOUAC"))

        let bar = isTubeless
            ? (distanceKm > 60 ? "2.4" : "2.6")
            : (distanceKm > 60 ? "3.0" : "3.2")

        var items: [ChecklistItem] = [
            ChecklistItem(
                id: "mech-pressure",
                label: isTubeless
                    ? (isFr
                        ? "Pression Tubeless calibrée à \(bar.replacingOccurrences(of: ".", with: ",")) bar & préventif vérifié"
                        : "Tubeless tire pressure calibrated to \(bar) bar & sealant checked")
                    : (isFr
                        ? "Pression des pneus calibrée à \(bar.replacingOccurrences(of: ".", with: ",")) bar"
                        : "Tire pressure calibrated to \(bar) bar"),
                category: "mechanics",
                checked: false,
                critical: false
            ),
            ChecklistItem(
                id: "mech-spares",
                label: isTubeless
                    ? (isFr
                        ? (distanceKm > 50 ? "Multi-outil, mèches tubeless, cartouche CO2 & chambre de secours" : "Multi-outil, mèches tubeless & gonfleur CO2 / mini-pompe")
                        : (distanceKm > 50 ? "Multi-tool, tubeless plug darts, CO2 inflator & backup micro-tube" : "Multi-tool, tubeless plug kit & CO2 / mini pump"))
                    : (isFr
                        ? (distanceKm > 50 ? "Multi-outil, 2 démonte-pneus, chambre à air & mini-pompe (kit anti-crève)" : "Multi-outil & kit anti-crève (chambre à air)")
                        : (distanceKm > 50 ? "Multi-tool, 2× tire levers, spare tube & mini pump" : "Multi-tool & spare tube")),
                category: "mechanics",
                checked: false,
                critical: true
            ),
        ]

        if options.includePunctureKit {
            items.append(ChecklistItem(
                id: "mech-puncture-kit",
                label: isFr
                    ? "Kit anti-crève renforcé : mèches tubeless, cartouche CO2 & chambre à air"
                    : "Full anti-puncture kit: tubeless plugs, CO2 cartridge & spare tube",
                category: "mechanics",
                checked: false,
                critical: true
            ))
        }

        if let tempC = weather?.temperatureC, tempC < 9 {
            items.append(ChecklistItem(
                id: "gear-thermal",
                label: isFr ? "Gants thermiques coupe-vent & tour de cou" : "Thermal windproof gloves & neck gaiter",
                category: "gear",
                checked: false,
                critical: true
            ))
        }

        let hasOvernightStayChip =
            activeChips.contains("hotel-stay") ||
            activeChips.contains("bed-and-breakfast") ||
            activeChips.contains("long-distance-endurance") ||
            activeChips.contains("local-gastronomy") ||
            activeChips.contains("wine-tasting") ||
            activeChips.contains("spa-wellness")
        let isEscapadeCoffeeDay =
            isEscapade &&
            totalDays <= 1 &&
            activeChips.contains("coffee-stop") &&
            !hasOvernightStayChip

        if isEscapadeCoffeeDay {
            items.append(contentsOf: [
                ChecklistItem(id: "esc-daypack", label: isFr ? "Coupe-vent léger, kit crevaison & moyen de paiement pour la pause café" : "Light wind vest, flat repair kit & payment card for coffee stop", category: "gear", checked: false, critical: true),
                ChecklistItem(id: "esc-fuel", label: hydrationChecklistLabel, category: "nutrition", checked: false, critical: true),
                ChecklistItem(id: "esc-lights", label: isFr ? "Éclairage avant & feu arrière flash de sécurité" : "Front touring headlight & rear safety flasher", category: "mechanics", checked: false, critical: true),
            ])
        } else if isEscapade {
            items.append(contentsOf: [
                ChecklistItem(id: "esc-id", label: isFr ? "Check-in Hôtel : confirmation de réservation, pièce d’identité & CB" : "Hotel Check-in: booking confirmation, ID & payment card", category: "logistics", checked: false, critical: true),
                ChecklistItem(id: "esc-pannier", label: isFr ? "Répartition du poids sacoches / sac de selle & sac étanche" : "Pannier / Saddlebag weight distribution & dry-bag waterproofing", category: "gear", checked: false, critical: true),
                ChecklistItem(id: "esc-charge", label: isFr ? "Recharge du soir & récupération (GPS, phares, batterie & étirements)" : "Evening charging & recovery (GPS, lights, power bank & recovery kit)", category: "gear", checked: false, critical: true),
                ChecklistItem(id: "esc-clothes", label: isFr ? "Tenue civile pour le soir & chaussures de marche légères" : "Casual off-bike evening clothes & walking shoes", category: "gear", checked: false, critical: true),
                ChecklistItem(id: "esc-lock", label: isFr ? "Antivol compact pour le local vélo de l’hôtel" : "Compact bike lock for overnight hotel storage", category: "mechanics", checked: false, critical: true),
                ChecklistItem(id: "esc-fuel", label: hydrationChecklistLabel, category: "nutrition", checked: false, critical: true),
                ChecklistItem(id: "esc-lights", label: isFr ? "Éclairage avant & feu arrière flash de sécurité" : "Front touring headlight & rear safety flasher", category: "mechanics", checked: false, critical: true),
            ])
        } else if isSport {
            let carbInt = Int(carbTarget.rounded())
            let fuelLabel: String
            if nutritionPref == .realFood {
                if isQuant {
                    fuelLabel = isFr
                        ? "Ravito aliments vrais (~\(carbInt) g/h : dattes, pâtes de fruits) & bidons électrolytes"
                        : "Whole-food ride fuel (~\(carbInt) g/h: dates, fruit chews) & electrolyte bottles"
                } else if isFuelFirst {
                    fuelLabel = isFr
                        ? "Ravito aliments vrais (~\(fuelUnitsPerHr) unités/h : dattes, pâtes de fruits) & bidons électrolytes"
                        : "Whole-food ride fuel (~\(fuelUnitsPerHr) fuel units/hr: dates, fruit chews) & electrolyte bottles"
                } else {
                    fuelLabel = isFr
                        ? "Ravito aliments vrais (dattes, pâtes de fruits) & bidons électrolytes"
                        : "Whole-food ride fuel (dates, fruit chews) & electrolyte bottles"
                }
            } else {
                if isQuant {
                    fuelLabel = isFr
                        ? "Boisson glucidique en bidons (~\(carbInt) g/h) & gels ravito"
                        : "Carb mix in bottles (~\(carbInt) g/h) & energy gels"
                } else if isFuelFirst {
                    fuelLabel = isFr
                        ? "Boisson glucidique en bidons (~\(fuelUnitsPerHr) unités/h) & collations rapides"
                        : "Hydration drink in bottles (~\(fuelUnitsPerHr) fuel units/hr) & pocket snacks"
                } else {
                    fuelLabel = isFr
                        ? "Boisson en bidons & collations de poche"
                        : "Hydration bottles & pocket snacks"
                }
            }
            items.append(contentsOf: [
                ChecklistItem(id: "sport-fuel", label: fuelLabel, category: "nutrition", checked: false, critical: true),
                ChecklistItem(id: "sport-computer", label: isFr ? "Compteur GPS synchronisé avec capteurs" : "GPS computer synced with sensors", category: "gear", checked: false, critical: true),
                ChecklistItem(id: "sport-kit", label: isFr ? "Tenue aéro ajustée & gilet coupe-vent léger" : "Aero kit & lightweight wind gilet", category: "gear", checked: false, critical: true),
            ])
            if !isTubeless {
                items.append(ChecklistItem(id: "sport-plugs", label: isFr ? "Cartouche CO2 rapide & démonte-pneus ultra-plats" : "Quick CO2 inflator & low-profile tire levers", category: "mechanics", checked: false, critical: true))
            }
        } else if isBikepacking {
            items.append(contentsOf: [
                ChecklistItem(id: "bp-pannier", label: isFr ? "Répartition du poids sacoches / sac de selle (équilibre du vélo)" : "Pannier / Saddlebag weight distribution (balanced load)", category: "gear", checked: false, critical: true),
                ChecklistItem(id: "bp-sleep", label: isFr ? "Sac de bivouac / tente compacte & matelas isolant" : "Bivouac bag / compact tent & sleeping pad", category: "gear", checked: false, critical: true),
                ChecklistItem(id: "bp-power", label: isFr ? "Recharge du soir & récupération (batterie 20 000 mAh, câbles & repos)" : "Evening charging & recovery (20,000mAh power bank, cables & rest kit)", category: "gear", checked: false, critical: true),
                ChecklistItem(id: "bp-water", label: isFr ? "Flasque filtrante + capacité hydrique de 2 L" : "Water filtration flask + 2L hydration capacity", category: "nutrition", checked: false, critical: true),
                ChecklistItem(id: "bp-chain", label: isFr ? "Dérive-chaîne, maillons rapides & patte de dérailleur" : "Chain tool, quick-links & spare hanger", category: "mechanics", checked: false, critical: true),
            ])
            if totalDays > 1 {
                items.append(contentsOf: [
                    ChecklistItem(
                        id: "bp-kit-rotation",
                        label: isFr
                            ? "Rotation textile (\(totalDays) jours) : rechanges cuissard, crème chamois & tenue de soir en sac étanche"
                            : "Multi-day kit rotation: \(totalDays)x base layers / chamois cream & evening camp clothes in dry-bag",
                        category: "gear",
                        checked: false,
                        critical: true
                    ),
                    ChecklistItem(
                        id: "bp-charging-autonomy",
                        label: isFr
                            ? "Recharge du soir multi-étapes (\(totalDays) jours) : chargeur multi-ports USB-C (GPS, radar, phares)"
                            : "Evening charging & autonomy (\(totalDays) days): multi-port USB-C splitter for GPS, radar & 800-1000lm lights",
                        category: "gear",
                        checked: false,
                        critical: true
                    ),
                    ChecklistItem(
                        id: "bp-multiday-logistics",
                        label: isFr
                            ? "Check-in Hôtel / bivouacs & billets train vélo sauvegardés hors-ligne (\(totalDays) étapes)"
                            : "Hotel Check-in / bivouac stops & rail bike passes saved offline (\(totalDays) stages)",
                        category: "logistics",
                        checked: false,
                        critical: true
                    ),
                ])
            }
        } else {
            items.append(contentsOf: [
                ChecklistItem(id: "chk-bidon", label: hydrationChecklistLabel, category: "nutrition", checked: false, critical: true),
                ChecklistItem(id: "com-badge", label: isFr ? "Badge d'accès entreprise & identifiants" : "Security badge & credentials", category: "logistics", checked: false, critical: true),
                ChecklistItem(id: "com-laptop", label: isFr ? "Ordinateur portable pro & chargeur USB-C" : "Work laptop & USB-C charger", category: "gear", checked: false, critical: false),
                ChecklistItem(id: "com-clothes", label: isFr ? "Tenue de travail propre rangée en sac étanche" : "Clean work clothes packed in dry-bag", category: "gear", checked: false, critical: false),
                ChecklistItem(id: "com-shower", label: isFr ? "Trousse de douche & serviette microfibre séchage rapide" : "Shower kit & microfiber quick-dry towel", category: "gear", checked: false, critical: false),
                ChecklistItem(id: "com-lock", label: isFr ? "Antivol U haute sécurité pour le parking vélo" : "Heavy-duty bike lock", category: "mechanics", checked: false, critical: true),
                ChecklistItem(id: "com-recovery", label: isFr ? "Collation de récupération prête dans le sac" : "Recovery snack packed", category: "nutrition", checked: false, critical: false),
            ])
        }

        if options.includeExtraRavito {
            items.append(ChecklistItem(
                id: "ravito-extra",
                label: isFr
                    ? "Rations ravito supplémentaires (pâtes de fruits, dattes & électrolytes)"
                    : "Extra whole-food fueling rations & electrolytes packed",
                category: "nutrition",
                checked: false,
                critical: false
            ))
        }

        if activeChips.contains("mountain-adventure") {
            items.append(contentsOf: [
                ChecklistItem(id: "chip-mountain-plugs", label: isFr ? "Mèches tubeless haute montagne, plaquettes de rechange & cartouches CO2" : "High-mountain tubeless plug darts, spare brake pads & CO2 canisters", category: "mechanics", checked: false, critical: true),
                ChecklistItem(id: "chip-mountain-topo", label: isFr ? "Tracés GPS topographiques hors-ligne & secours montagne" : "Offline topographic GPS trail maps & emergency contacts", category: "gear", checked: false, critical: true),
            ])
        }

        if activeChips.contains("night-ride") {
            items.append(contentsOf: [
                ChecklistItem(id: "chip-night-beam", label: isFr ? "Phare avant 800+ lumens chargé & feu arrière clignotant puissant" : "High-beam headlight (800+ lumens) fully charged & rear flasher", category: "mechanics", checked: false, critical: true),
                ChecklistItem(id: "chip-night-hivis", label: isFr ? "Baudrier / gilet haute visibilité & bandes réfléchissantes de cheville" : "Reflective sash/vest & reflective ankle bands", category: "gear", checked: false, critical: true),
            ])
        }

        if activeChips.contains("coffee-stop") {
            items.append(ChecklistItem(
                id: "chip-coffee-lock",
                label: isFr ? "Antivol de cadre rapide & moyen de paiement pour la pause café" : "Compact cafe frame lock & contactless payment for coffee pause",
                category: "logistics",
                checked: false,
                critical: false
            ))
        }

        if activeChips.contains("picnic-outing") {
            items.append(ChecklistItem(
                id: "chip-picnic-pannier",
                label: isFr ? "Sacoche isotherme avec victuailles fraîches, couverts & couteau pliant" : "Insulated picnic pannier with fresh provisions, cutlery & folding knife",
                category: "gear",
                checked: false,
                critical: true
            ))
        }

        if activeChips.contains("wine-tasting") || activeChips.contains("local-gastronomy") {
            items.append(ChecklistItem(
                id: "chip-wine-sleeves",
                label: isFr ? "Manchons de protection matelassés pour bouteilles de vin en sacoche" : "Padded bottle protective sleeves for pannier wine transport",
                category: "gear",
                checked: false,
                critical: false
            ))
        }

        if activeChips.contains("emergency-first-aid") {
            items.append(ChecklistItem(
                id: "chip-first-aid",
                label: isFr ? "Trousse de secours : pansements compressifs, antiseptique & couverture de survie" : "Wilderness trauma kit: sterile dressings, antiseptic & space blanket",
                category: "gear",
                checked: false,
                critical: true
            ))
        }

        if activeChips.contains("solar-power-recharge") {
            items.append(ChecklistItem(
                id: "chip-solar-bank",
                label: isFr ? "Batterie externe 20 000 mAh renforcée & faisceau de câbles étanches" : "Rugged 20,000mAh battery pack & weatherproof charging cables",
                category: "gear",
                checked: false,
                critical: true
            ))
        }

        if activeChips.contains("bad-weather-prep") {
            items.append(ChecklistItem(
                id: "chip-bad-weather",
                label: isFr ? "Garde-boue intégraux vérifiés & veste pluie Gore-Tex Shakedry" : "Full mudguards inspected & Gore-Tex Shakedry rain shell stowed",
                category: "gear",
                checked: false,
                critical: true
            ))
        }

        if activeChips.contains("bivouac-camp") {
            items.append(ChecklistItem(
                id: "chip-bivouac-kit",
                label: isFr ? "Abri bivouac ultraléger, matelas gonflable isolant & flasque filtrante" : "Ultralight bivouac shelter, insulated sleeping pad & water filter flask",
                category: "gear",
                checked: false,
                critical: true
            ))
        }

        if activeChips.contains("hydration-electrolytes") {
            let carbInt = Int(carbTarget.rounded())
            items.append(ChecklistItem(
                id: "chip-hydration-fuel",
                label: isFr ? "Mélange glucidique calibré (~\(carbInt) g/h) & capsules de sodium" : "Calibrated carb drink mix (~\(carbInt) g/h) & sodium salt tabs",
                category: "nutrition",
                checked: false,
                critical: true
            ))
        }

        if activeChips.contains("cargo-laptop-pack") {
            items.append(ChecklistItem(
                id: "chip-cargo-laptop",
                label: isFr ? "Ordinateur pro 15\" dans housse étanche IPX6 & chargeur USB-C" : "15\" Work laptop inside IPX6 waterproof dry sleeve & USB-C charger",
                category: "gear",
                checked: false,
                critical: true
            ))
        }

        if activeChips.contains("gravel-trail-master") || activeChips.contains("off-road-exploration") {
            items.append(ChecklistItem(
                id: "chip-gravel-pressure",
                label: isFr ? "Pression tout-terrain ajustée à 2,4–2,8 bar & outil mèches prêt" : "Trail tire pressure lowered to 2.4-2.8 bar & plug tool mounted",
                category: "mechanics",
                checked: false,
                critical: true
            ))
        }

        if activeChips.contains("paceline-drafting") || activeChips.contains("fast-group-ride") {
            items.append(ChecklistItem(
                id: "chip-paceline-radar",
                label: isFr ? "Radar arrière Garmin Varia chargé & signaux de peloton synchronisés" : "Rear Garmin Varia radar charged & peloton hand signals briefed",
                category: "gear",
                checked: false,
                critical: true
            ))
        }

        if activeChips.contains("shower-locker") {
            items.append(ChecklistItem(
                id: "chip-shower-kit",
                label: isFr ? "Serviette microfibre, trousse de toilette & tenue propre sous sac étanche" : "Microfiber quick-dry towel, toiletries & fresh change of clothes in dry bag",
                category: "gear",
                checked: false,
                critical: true
            ))
        }

        if activeChips.contains("historical-tour") {
            items.append(ChecklistItem(
                id: "chip-historical-shoes",
                label: isFr ? "Chaussures confortables pour la marche & antivol sécurisé de visite" : "Comfortable walking shoes & secure bike lock for monuments",
                category: "logistics",
                checked: false,
                critical: false
            ))
        }

        if activeChips.contains("photography-spots") {
            items.append(ChecklistItem(
                id: "chip-camera-bag",
                label: isFr ? "Sacoche appareil photo étanche de guidon & lingette microfibre" : "Handlebar weatherproof camera bag, lens cloth & spare battery",
                category: "gear",
                checked: false,
                critical: false
            ))
        }

        if activeChips.contains("spa-wellness") {
            items.append(ChecklistItem(
                id: "chip-spa-pack",
                label: isFr ? "Maillot de bain, sandales & chaussettes de récupération pour le spa" : "Swimsuit, sandals & recovery compression socks for thermal spa",
                category: "gear",
                checked: false,
                critical: false
            ))
        }

        if activeChips.contains("interval-training") {
            items.append(ChecklistItem(
                id: "chip-interval-workout",
                label: isFr ? "Séance de fractionné par intervalles synchronisée sur le compteur GPS" : "Structured threshold interval workout synced to GPS head unit",
                category: "gear",
                checked: false,
                critical: false
            ))
        }

        if activeChips.contains("climbing-kom-hunt") {
            items.append(ChecklistItem(
                id: "chip-kom-climb",
                label: isFr ? "Grand pignon de montagne vérifié (32/34D) & chaîne dégraissée" : "Low-ratio climbing cog checked (32/34T) & freshly waxed chain",
                category: "mechanics",
                checked: false,
                critical: true
            ))
        }

        let isLowVisibilityOrDark =
            (weather?.visibilityKm != nil && weather!.visibilityKm < 5) ||
            weather?.isDay == false
        if isLowVisibilityOrDark && !items.contains(where: { $0.id == "chip-night-beam" || $0.id == "chk-lights" }) {
            items.append(ChecklistItem(
                id: "vis-lowlight-beam",
                label: isFr
                    ? "Éclairage puissant 800–1000 lm & équipement réfléchissant (visibilité réduite météo)"
                    : "High-output 800–1000 lm headlight & reflective gear (low weather visibility)",
                category: "gear",
                checked: false,
                critical: true
            ))
        }

        return items
    }

    public static func buildEffectiveChecklist(
        _ trip: TripProfile,
        riderSpecs: RiderBikeSpecs,
        lang: CadenceLang
    ) -> [ChecklistItem] {
        let activeBike = BikeSpecsCatalog.getActiveBike(riderSpecs)
        let activeChips = trip.customChips ?? []
        let archetype = getArchetypeFromTag(tag: trip.tag, name: trip.name)
        let hasRavitoChip = activeChips.contains("hydration-electrolytes") || activeChips.contains("picnic-outing")

        let generated = generateTripChecklist(
            tag: trip.tag,
            distanceKm: trip.route.distanceKm,
            weather: trip.weather,
            options: ChecklistGenerationOptions(
                lang: lang,
                includePunctureKit: (trip.route.distanceKm > 45 || archetype == "BIKEPACKING" || archetype == "SPORT") && !activeBike.isTubeless,
                includeExtraRavito: trip.route.distanceKm > 60 && !hasRavitoChip,
                customChips: activeChips,
                totalDays: max(1, trip.stages?.count ?? 1),
                isTubeless: activeBike.isTubeless,
                carbTargetGPerHr: riderSpecs.carbTargetGPerHr,
                nutritionPreference: riderSpecs.nutritionPreference
            ),
            riderSpecs: riderSpecs
        )

        var checkedMap: [String: Bool] = [:]
        for item in trip.checklist {
            checkedMap[item.id] = item.checked
        }
        var customItems: [ChecklistItem] = []
        for item in trip.checklist {
            if !generated.contains(where: { $0.id == item.id }) {
                customItems.append(item)
            }
        }

        return generated.map { item in
            var copy = item
            copy.checked = checkedMap[item.id] ?? item.checked
            return copy
        } + customItems
    }

    // MARK: - Readiness Helpers

    private static func clamp(_ v: Double, lo: Double = 0, hi: Double = 100) -> Double {
        min(hi, max(lo, v))
    }

    private static func interpolate(_ x: Double, stops: [(Double, Double)]) -> Double {
        if x <= stops[0].0 { return stops[0].1 }
        for i in 1..<stops.count {
            let (x1, y1) = stops[i]
            if x <= x1 {
                let (x0, y0) = stops[i - 1]
                return y0 + ((x - x0) / (x1 - x0)) * (y1 - y0)
            }
        }
        return stops[stops.count - 1].1
    }

    private static func formatHours(_ h: Double) -> String {
        let total = max(1, JSCompat.jsRoundInt(h * 60.0))
        let hh = total / 60
        let mm = total % 60
        return hh > 0 ? "\(hh)h \(String(format: "%02d", mm))" : "\(mm) min"
    }

    private static let gravelToleranceByWidth: [(Double, Double)] = [
        (23, 2), (25, 4), (28, 8), (32, 20), (35, 35),
        (38, 55), (40, 70), (45, 90), (50, 100),
    ]

    private struct RawFactorScore {
        let id: String
        let label: String
        let applicable: Bool
        let score: Double
        let note: String
        let tip: String?
        let action: String?
        let ctaLabel: String?
    }

    private static func scoreWeather(_ w: ReadinessWeatherInput, isFr: Bool) -> (score: Double, note: String, tip: String?, action: String?, ctaLabel: String?) {
        let rainPen = w.rainRiskPct <= 5 ? 0.0 : (w.rainRiskPct - 5.0) * 0.65
        let gustPen = clamp((w.gustKmH - 18.0) * 1.25, lo: 0, hi: 50)
        let basePen = clamp((w.baseWindKmH - 10.0) * 1.4, lo: 0, hi: 45)
        let headPen = clamp((w.headwindKmH - 8.0) * 0.7, lo: 0, hi: 18)
        let windPen = max(gustPen, basePen) + headPen * 0.45
        let t = w.feelsLikeC
        let tempPen = t < 12 ? clamp((12.0 - t) * 2.2, lo: 0, hi: 40) : (t > 24 ? clamp((t - 24.0) * 3.2, lo: 0, hi: 40) : 0.0)
        let score = clamp(100.0 - (rainPen + windPen + tempPen))

        let parts = [
            isFr ? "Pluie \(JSCompat.jsRoundInt(w.rainRiskPct))%" : "Rain \(JSCompat.jsRoundInt(w.rainRiskPct))%",
            isFr ? "rafales \(JSCompat.jsRoundInt(w.gustKmH)) km/h" : "gusts \(JSCompat.jsRoundInt(w.gustKmH)) km/h",
            isFr ? "ressenti \(JSCompat.jsRoundInt(t))°C" : "feels \(JSCompat.jsRoundInt(t))°C",
        ]

        var tip: String?
        let worst = max(rainPen, windPen, tempPen)
        if worst >= 8 {
            if worst == rainPen {
                tip = isFr ? "Décalez la sortie ou prenez une veste imperméable" : "Shift the window or pack a rain shell"
            } else if worst == windPen {
                tip = isFr ? "Choisis un créneau moins venté" : "Pick a calmer window"
            } else {
                tip = t < 8
                    ? (isFr ? "Pars plus tard dans la journée ou couvre-toi bien" : "Ride later in the day or layer up")
                    : (isFr ? "Pars plus tôt, à la fraîche" : "Ride earlier, before the heat")
            }
        }
        let action: String? = tip != nil ? "weather-window" : nil
        let ctaLabel: String? = tip != nil ? (isFr ? "Ajuster le créneau" : "Adjust window") : nil
        return (score, parts.joined(separator: " · "), tip, action, ctaLabel)
    }

    private static func scoreTerrain(_ bike: ReadinessBikeInput, terrain: ReadinessTerrainInput, isFr: Bool) -> (score: Double, note: String, tip: String?, action: String?, ctaLabel: String?) {
        let cat = bike.category
        let width = bike.tireWidthMm > 0 ? bike.tireWidthMm : 32.0
        let gravel = max(0.0, terrain.gravelPct)
        let single = max(0.0, terrain.singletrackPct)
        let unpaved = gravel + single

        var gravelTol = interpolate(width, stops: gravelToleranceByWidth)
        if cat == .road && width < 32 { gravelTol = min(gravelTol, 10) }
        if cat == .gravel { gravelTol += 10 }
        if cat == .mtb { gravelTol = 100 }

        var singleTol = 3.0
        if cat == .mtb { singleTol = 100 }
        else if width >= 45 { singleTol = 45 }
        else if width >= 40 { singleTol = 25 }
        else if width >= 35 { singleTol = 10 }
        if cat == .road { singleTol = min(singleTol, 2) }

        var penalty = max(0.0, gravel - gravelTol) * 1.8 + max(0.0, single - singleTol) * 3.0
        if !bike.isTubeless && unpaved >= 20 && cat != .mtb { penalty += 8 }
        if cat == .mtb && unpaved < 10 { penalty += 10 }
        if terrain.suitabilityLevel == .technicalCaution { penalty = max(penalty, 35) }
        else if terrain.suitabilityLevel == .goodWithCare { penalty = max(penalty, 12) }

        let score = clamp(100.0 - penalty)
        let catLabel: String
        if let cat = cat {
            switch cat {
            case .road: catLabel = isFr ? "Route" : "Road"
            case .gravel: catLabel = "Gravel"
            case .mtb: catLabel = isFr ? "VTT" : "MTB"
            case .urban: catLabel = isFr ? "Ville" : "City"
            case .touring: catLabel = isFr ? "Rando" : "Touring"
            }
        } else {
            catLabel = bike.name ?? (isFr ? "Vélo" : "Bike")
        }

        let surface: String
        if !terrain.hasSurfaceData {
            surface = isFr ? "surface supposée goudron" : "surface assumed paved"
        } else if unpaved < 1 {
            surface = isFr ? "100% goudron" : "100% paved"
        } else {
            surface = isFr ? "\(JSCompat.jsRoundInt(unpaved))% chemins" : "\(JSCompat.jsRoundInt(unpaved))% unpaved"
        }
        let note = "\(catLabel) \(JSCompat.jsRoundInt(width)) mm · \(surface)"

        var tip: String?
        if score < 92 {
            if cat == .mtb && unpaved < 10 {
                tip = isFr ? "Un vélo route ou gravel irait plus vite ici" : "A road or gravel bike would be faster here"
            } else if single > singleTol {
                tip = isFr ? "Prends un VTT ou des pneus ≥ 45 mm" : "Take an MTB or ≥ 45 mm tyres"
            } else if gravel > gravelTol {
                let needed = gravel > 70 ? 45 : (gravel > 45 ? 40 : (gravel > 25 ? 35 : 32))
                tip = isFr ? "Passe à des pneus ≥ \(needed) mm" : "Switch to ≥ \(needed) mm tyres"
            } else if !bike.isTubeless && unpaved >= 20 {
                tip = isFr ? "Emportez chambres et rustines" : "Carry spare tubes and a patch kit"
            } else {
                tip = isFr ? "Roulez prudemment sur les secteurs techniques" : "Take the technical sectors steady"
            }
        }
        let action: String? = tip != nil ? "bike-terrain" : nil
        let ctaLabel: String? = tip != nil ? (isFr ? "Changer de vélo" : "Switch bike") : nil
        return (score, note, tip, action, ctaLabel)
    }

    private static func scoreEffort(_ e: ReadinessEffortInput, isFr: Bool) -> (score: Double, note: String, tip: String?, action: String?, ctaLabel: String?) {
        let IF = max(0.0, e.ftpPercent) / 100.0
        let hours = max(0.1, e.movingHours)
        let tss = Double(JSCompat.jsRoundInt(hours * IF * IF * 100.0))
        let levelFactor = e.riderLevel == .pro ? 1.5 : (e.riderLevel == .occasional ? 0.7 : 1.0)
        let plannedStopMin = max(0, JSCompat.jsRoundInt(e.plannedStopMinutes ?? 0))

        let intensityPen = max(0.0, IF - 0.70) * 135.0 * clamp(hours, lo: 0.5, hi: 1.5)
        let loadStart = 70.0 * levelFactor
        let rawLoadPen = clamp((tss - loadStart) * (0.24 / levelFactor), lo: 0, hi: 55)
        let stopRelief = (rawLoadPen > 0 && plannedStopMin > 0)
            ? clamp((Double(plannedStopMin) / 60.0) * 28.0, lo: 0, hi: min(rawLoadPen * 0.65, 28))
            : 0.0
        let loadPen = max(0.0, rawLoadPen - stopRelief)
        let score = clamp(100.0 - (intensityPen + loadPen))

        let zone = (e.powerZone?.isEmpty == false) ? "\(e.powerZone!) · " : ""
        let stopNote: String
        if plannedStopMin >= 15 {
            stopNote = isFr ? " · pause \(plannedStopMin) min" : " · \(plannedStopMin) min stop"
        } else if e.isPreDawnWinter == true && plannedStopMin > 0 {
            stopNote = isFr ? " · pause \(plannedStopMin) min max" : " · \(plannedStopMin) min max stop"
        } else {
            stopNote = ""
        }
        let note = "\(zone)\(formatHours(hours)) · \(JSCompat.jsRoundInt(e.ftpPercent))% FTP\(stopNote)"

        var tip: String?
        var action: String?
        var ctaLabel: String?
        if score < 90 {
            if intensityPen >= loadPen {
                tip = isFr ? "Baisse l’allure d’une zone" : "Ease the pace by one zone"
                action = "effort-pace"
                ctaLabel = isFr ? "Baisser l’allure" : "Ease pace"
            } else if e.isPreDawnWinter == true {
                tip = isFr
                    ? "Raccourcissez la trace (pauses limitées à 5 min avant l’aube en hiver)"
                    : "Shorten the route (stops capped at 5 min pre-dawn in winter)"
                action = "effort-load"
                ctaLabel = isFr ? "Raccourcir la trace" : "Shorten route"
            } else if plannedStopMin >= 30 {
                tip = isFr ? "Raccourcissez la trace ou allongez la pause" : "Shorten the route or extend your stop"
                action = "effort-load"
                ctaLabel = isFr ? "Ajuster trace / pause" : "Adjust route / stop"
            } else {
                tip = isFr ? "Raccourcissez la trace ou prévoyez une pause longue" : "Shorten the route or plan a long stop"
                action = "effort-load"
                ctaLabel = isFr ? "Ajouter pause / raccourcir" : "Add stop / shorten"
            }
        }
        return (score, note, tip, action, ctaLabel)
    }

    private static func scoreChecklist(_ c: ReadinessChecklistInput, isFr: Bool) -> (score: Double, applicable: Bool, note: String, tip: String?, action: String?, ctaLabel: String?) {
        if c.total <= 0 {
            return (100, false, isFr ? "Aucune check-list" : "No checklist", nil, nil, nil)
        }
        let critLeft = max(0, c.criticalTotal - c.criticalChecked)
        let nonCritTotal = max(0, c.total - c.criticalTotal)
        let nonCritLeft = max(0, nonCritTotal - (c.checked - c.criticalChecked))
        var score: Double
        if c.criticalTotal > 0 && nonCritTotal > 0 {
            score = 100.0 - (Double(critLeft) / Double(c.criticalTotal)) * 70.0 - (Double(nonCritLeft) / Double(nonCritTotal)) * 30.0
        } else {
            score = (Double(c.checked) / Double(c.total)) * 100.0
        }
        score = clamp(score)
        let critSuffix = critLeft > 0
            ? (isFr ? " · \(critLeft) essentiel\(critLeft > 1 ? "s" : "")" : " · \(critLeft) essential left")
            : ""
        let note = isFr
            ? "\(c.checked) sur \(c.total) cochés\(critSuffix)"
            : "\(c.checked) of \(c.total) checked\(critSuffix)"
        let left = c.total - c.checked
        let tip: String?
        if left == 0 {
            tip = nil
        } else if critLeft > 0 {
            tip = isFr
                ? "Cochez \(critLeft) élément\(critLeft > 1 ? "s" : "") essentiel\(critLeft > 1 ? "s" : "")"
                : "Tick \(critLeft) essential item\(critLeft > 1 ? "s" : "")"
        } else {
            tip = isFr
                ? "Finissez la check-list (\(left) restant\(left > 1 ? "s" : ""))"
                : "Finish your checklist (\(left) left)"
        }
        let action: String? = tip != nil ? "checklist" : nil
        let ctaLabel: String? = tip != nil ? (isFr ? "Voir la check-list" : "Review checklist") : nil
        return (score, true, note, tip, action, ctaLabel)
    }

    private static func scoreLight(_ l: ReadinessLightInput, isFr: Bool) -> (score: Double, note: String, tip: String?, action: String?, ctaLabel: String?) {
        let night = clamp(l.nightPercent)
        let twilight = clamp(l.twilightPercent)
        let score = clamp(100.0 - (night * 0.55 + twilight * 0.2))
        let daylight = clamp(100.0 - night - twilight)
        let note: String
        if night >= 1 {
            note = isFr ? "\(JSCompat.jsRoundInt(night))% de nuit" : "\(JSCompat.jsRoundInt(night))% in the dark"
        } else if twilight >= 1 {
            note = isFr ? "\(JSCompat.jsRoundInt(twilight))% pénombre" : "\(JSCompat.jsRoundInt(twilight))% twilight"
        } else {
            note = isFr ? "\(JSCompat.jsRoundInt(daylight))% de jour" : "\(JSCompat.jsRoundInt(daylight))% daylight"
        }
        let tip: String? = score < 92 ? (isFr ? "Pars plus tôt ou charge tes éclairages" : "Leave earlier or charge your lights") : nil
        let action: String? = tip != nil ? "daylight-window" : nil
        let ctaLabel: String? = tip != nil ? (isFr ? "Décaler le départ" : "Shift departure") : nil
        return (score, note, tip, action, ctaLabel)
    }

    private static func scoreRoute(_ r: ReadinessRouteInput, isFr: Bool) -> (score: Double, note: String, tip: String?, action: String?, ctaLabel: String?) {
        let base: Double = r.worstSeverity == "critical" ? 30 : (r.worstSeverity == "warning" ? 65 : (r.worstSeverity == "info" ? 88 : 100))
        let extras = Double(max(0, r.issueCount - 1)) * 6.0
        let score = clamp(base - extras)
        let note: String
        if r.worstSeverity == "clear" {
            note = isFr ? "Aucun point bloquant" : "No blockers"
        } else if r.issueCount > 0 {
            note = isFr
                ? "\(r.issueCount) point\(r.issueCount > 1 ? "s" : "") à vérifier"
                : "\(r.issueCount) issue\(r.issueCount > 1 ? "s" : "") flagged"
        } else {
            note = isFr ? "Info à noter" : "Minor note"
        }
        let tip: String? = score < 90 ? (isFr ? "Réglez le point signalé sur la trace" : "Sort the flagged stop or water gap") : nil
        let action: String? = tip != nil ? "route-stops" : nil
        let ctaLabel: String? = tip != nil ? (isFr ? "Voir les arrêts" : "Review stops") : nil
        return (score, note, tip, action, ctaLabel)
    }

    public static func computeRideReadiness(_ input: RideReadinessInput) -> RideReadinessResult {
        let isFr = input.lang == .fr

        let w = scoreWeather(input.weather, isFr: isFr)
        let t = scoreTerrain(input.bike, terrain: input.terrain, isFr: isFr)
        let e = scoreEffort(input.effort, isFr: isFr)
        let c = scoreChecklist(input.checklist, isFr: isFr)
        let l = scoreLight(input.light, isFr: isFr)
        let r = scoreRoute(input.route, isFr: isFr)

        let raw: [RawFactorScore] = [
            RawFactorScore(id: "weather", label: isFr ? "Météo" : "Weather", applicable: true, score: w.score, note: w.note, tip: w.tip, action: w.action, ctaLabel: w.ctaLabel),
            RawFactorScore(id: "terrain", label: isFr ? "Vélo & terrain" : "Bike & terrain", applicable: true, score: t.score, note: t.note, tip: t.tip, action: t.action, ctaLabel: t.ctaLabel),
            RawFactorScore(id: "effort", label: isFr ? "Effort" : "Effort", applicable: true, score: e.score, note: e.note, tip: e.tip, action: e.action, ctaLabel: e.ctaLabel),
            RawFactorScore(id: "checklist", label: isFr ? "Check-list" : "Checklist", applicable: c.applicable, score: c.score, note: c.note, tip: c.tip, action: c.action, ctaLabel: c.ctaLabel),
            RawFactorScore(id: "light", label: isFr ? "Lumière" : "Daylight", applicable: true, score: l.score, note: l.note, tip: l.tip, action: l.action, ctaLabel: l.ctaLabel),
            RawFactorScore(id: "route", label: isFr ? "Trace & arrêts" : "Route & stops", applicable: true, score: r.score, note: r.note, tip: r.tip, action: r.action, ctaLabel: r.ctaLabel),
        ]

        let sumW = raw.reduce(0.0) { $0 + ($1.applicable ? (factorWeights[$1.id] ?? 0) : 0) }
        let totalWeight = sumW > 0 ? sumW : 1.0

        let factors: [ReadinessFactor] = raw.map { f in
            let weight = f.applicable ? (factorWeights[f.id] ?? 0) / totalWeight : 0.0
            let scoreInt = JSCompat.jsRoundInt(f.score)
            let pointsLost = weight * Double(100 - scoreInt)
            return ReadinessFactor(
                id: f.id,
                label: f.label,
                score: scoreInt,
                weight: weight,
                pointsLost: pointsLost,
                note: f.note,
                tip: f.tip,
                action: f.action,
                ctaLabel: f.ctaLabel,
                applicable: f.applicable
            )
        }

        let weighted = factors.reduce(0.0) { $0 + $1.weight * Double($1.score) }
        var score = JSCompat.jsRoundInt(weighted)
        var capReason: String?

        let applicable = factors.filter { $0.applicable }
        if let weakest = applicable.dropFirst().reduce(applicable.first, { m, f in (f.score < (m?.score ?? Int.max)) ? f : m }) {
            if weakest.score < 50 {
                let drag = JSCompat.jsRoundInt(Double(50 - weakest.score) * 0.45)
                if drag >= 2 {
                    score = max(weakest.score, score - drag)
                    capReason = isFr
                        ? "Freiné par \(weakest.label.lowercased()) (\(weakest.score)/100)"
                        : "Pulled down by \(weakest.label.lowercased()) (\(weakest.score)/100)"
                }
            }
        }
        if input.goStatus == "NO-GO" && score > 40 {
            score = 40
            capReason = isFr ? "Conditions de vent sévères" : "Severe wind conditions"
        }
        score = max(0, min(100, score))

        let level = getReadinessLevel(score)
        let label: String
        let summary: String
        switch level {
        case "good-to-go":
            label = isFr ? "Prêt à rouler" : "Good to go"
            summary = isFr ? "Les conditions sont alignées — tu peux y aller." : "Conditions line up. Good to go."
        case "worth-tweak":
            label = isFr ? "À ajuster" : "Worth a tweak"
            summary = isFr ? "Faisable — un ou deux ajustements la rendront plus agréable." : "Rideable. A tweak or two will make it better."
        default:
            label = isFr ? "À revoir" : "Needs a change"
            summary = isFr ? "Pas mal de points à revoir avant de partir." : "A few things are off — worth adjusting before you roll."
        }

        let liftable = factors
            .filter { $0.applicable && $0.tip != nil && $0.action != nil && $0.ctaLabel != nil && $0.pointsLost >= 1 }
            .sorted { $0.pointsLost > $1.pointsLost }
            .first
        let topLift = liftable.map {
            ReadinessTopLift(
                factorId: $0.id,
                tip: $0.tip!,
                gain: max(1, JSCompat.jsRoundInt($0.pointsLost)),
                action: $0.action!,
                ctaLabel: $0.ctaLabel!
            )
        }

        return RideReadinessResult(
            score: score,
            level: level,
            label: label,
            summary: summary,
            factors: factors,
            topLift: topLift,
            capReason: capReason
        )
    }
}
