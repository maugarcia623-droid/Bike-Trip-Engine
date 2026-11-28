import Foundation

public enum RideVerdict: String, Codable, Sendable, CaseIterable, Equatable {
    case go = "GO"
    case caution = "CAUTION"
    case noGo = "NO-GO"
}

public enum BriefProblemSeverity: String, Codable, Sendable, CaseIterable, Equatable {
    case critical
    case warning
    case info
    case clear
}

public struct RideBriefProblem: Codable, Sendable, Equatable {
    public var id: String
    public var severity: BriefProblemSeverity
    public var headline: String
    public var detail: String
    public var alternativeStop: StageAmenity?

    public init(
        id: String,
        severity: BriefProblemSeverity,
        headline: String,
        detail: String,
        alternativeStop: StageAmenity? = nil
    ) {
        self.id = id
        self.severity = severity
        self.headline = headline
        self.detail = detail
        self.alternativeStop = alternativeStop
    }
}

public enum RideBriefPriorityIconKey: String, Codable, Sendable, CaseIterable, Equatable {
    case lights
    case blocker
    case tyre
    case wind
    case rain
    case sun
    case fuel
}

public struct RideBriefPriorityItem: Codable, Sendable, Equatable, Identifiable {
    public var id: String
    public var theme: ChipTheme
    public var iconKey: RideBriefPriorityIconKey
    public var headline: String
    public var detail: String

    public init(
        id: String,
        theme: ChipTheme,
        iconKey: RideBriefPriorityIconKey,
        headline: String,
        detail: String
    ) {
        self.id = id
        self.theme = theme
        self.iconKey = iconKey
        self.headline = headline
        self.detail = detail
    }
}

public struct RideBriefBottlesSummary: Codable, Sendable, Equatable {
    public var carried: Int
    public var bidonSizeMl: Int
    public var refills: Int
    public var badgeLabel: String

    public init(carried: Int, bidonSizeMl: Int, refills: Int, badgeLabel: String) {
        self.carried = carried
        self.bidonSizeMl = bidonSizeMl
        self.refills = refills
        self.badgeLabel = badgeLabel
    }
}

public enum RideBriefCompanionIcon: String, Codable, Sendable, CaseIterable, Equatable {
    case wind
    case flame
    case thermometer
    case compass
}

public struct RideBriefCompanionNote: Codable, Sendable, Equatable {
    public var icon: RideBriefCompanionIcon
    public var text: String

    public init(icon: RideBriefCompanionIcon, text: String) {
        self.icon = icon
        self.text = text
    }
}

public struct RideBriefData: Codable, Sendable, Equatable {
    public var verdict: RideVerdict
    public var verdictReason: String
    public var leaveByHHMM: String
    public var arrivalHHMM: String
    public var movingTimeFormatted: String
    public var totalStopsMin: Int
    public var distanceKm: Double
    public var elevationGainM: Int
    public var departureDate: String?
    public var bikeName: String
    public var loopComparison: LoopDirectionComparison?
    public var tyrePressure: TyrePressureResult
    public var pressureUnit: PressureUnit
    public var isTubeless: Bool
    public var carbsPerHr: Int
    public var totalCarbsG: Int
    public var bottles: RideBriefBottlesSummary
    public var firstProblem: RideBriefProblem
    public var secondaryProblems: [RideBriefProblem]
    public var kit: KitRecommendation
    public var pinnedCount: Int
    public var scannedCount: Int
    public var archetypeLabel: String
    public var leavePodLabel: String
    public var targetContextLabel: String
    public var headline: String
    public var narrativeSummary: String
    public var totalDurationFormatted: String
    public var tempC: Int
    public var feelsLikeC: Int
    public var tireWidthMm: Int
    public var priorities: [RideBriefPriorityItem]
    public var blockerAlreadyFeatured: Bool
    public var readiness: RideReadinessResult
    public var companionNote: RideBriefCompanionNote?
    public var windInsight: HumanWindImpactResult?

    public init(
        verdict: RideVerdict,
        verdictReason: String,
        leaveByHHMM: String,
        arrivalHHMM: String,
        movingTimeFormatted: String,
        totalStopsMin: Int,
        distanceKm: Double,
        elevationGainM: Int,
        departureDate: String? = nil,
        bikeName: String,
        loopComparison: LoopDirectionComparison? = nil,
        tyrePressure: TyrePressureResult,
        pressureUnit: PressureUnit,
        isTubeless: Bool,
        carbsPerHr: Int,
        totalCarbsG: Int,
        bottles: RideBriefBottlesSummary,
        firstProblem: RideBriefProblem,
        secondaryProblems: [RideBriefProblem],
        kit: KitRecommendation,
        pinnedCount: Int,
        scannedCount: Int,
        archetypeLabel: String,
        leavePodLabel: String,
        targetContextLabel: String,
        headline: String,
        narrativeSummary: String,
        totalDurationFormatted: String,
        tempC: Int,
        feelsLikeC: Int,
        tireWidthMm: Int,
        priorities: [RideBriefPriorityItem],
        blockerAlreadyFeatured: Bool,
        readiness: RideReadinessResult,
        companionNote: RideBriefCompanionNote? = nil,
        windInsight: HumanWindImpactResult? = nil
    ) {
        self.verdict = verdict
        self.verdictReason = verdictReason
        self.leaveByHHMM = leaveByHHMM
        self.arrivalHHMM = arrivalHHMM
        self.movingTimeFormatted = movingTimeFormatted
        self.totalStopsMin = totalStopsMin
        self.distanceKm = distanceKm
        self.elevationGainM = elevationGainM
        self.departureDate = departureDate
        self.bikeName = bikeName
        self.loopComparison = loopComparison
        self.tyrePressure = tyrePressure
        self.pressureUnit = pressureUnit
        self.isTubeless = isTubeless
        self.carbsPerHr = carbsPerHr
        self.totalCarbsG = totalCarbsG
        self.bottles = bottles
        self.firstProblem = firstProblem
        self.secondaryProblems = secondaryProblems
        self.kit = kit
        self.pinnedCount = pinnedCount
        self.scannedCount = scannedCount
        self.archetypeLabel = archetypeLabel
        self.leavePodLabel = leavePodLabel
        self.targetContextLabel = targetContextLabel
        self.headline = headline
        self.narrativeSummary = narrativeSummary
        self.totalDurationFormatted = totalDurationFormatted
        self.tempC = tempC
        self.feelsLikeC = feelsLikeC
        self.tireWidthMm = tireWidthMm
        self.priorities = priorities
        self.blockerAlreadyFeatured = blockerAlreadyFeatured
        self.readiness = readiness
        self.companionNote = companionNote
        self.windInsight = windInsight
    }
}

public enum RideBriefEngine {
    private static func jsNum(_ value: Double) -> String {
        guard value.isFinite else { return "0" }
        let safe = value == 0 ? 0.0 : value
        if safe.truncatingRemainder(dividingBy: 1) == 0, abs(safe) < 9_007_199_254_740_992 {
            return String(Int64(safe))
        }
        return String(safe)
    }

    private static func formatLocaleInt(_ value: Int, isFr: Bool) -> String {
        let formatter = NumberFormatter()
        formatter.numberStyle = .decimal
        formatter.locale = Locale(identifier: isFr ? "fr-FR" : "en-US")
        formatter.maximumFractionDigits = 0
        formatter.usesGroupingSeparator = true
        return formatter.string(from: NSNumber(value: value)) ?? String(value)
    }

    private static func formatTotalBriefDuration(
        totalMinutes: Double,
        stopsMin: Int,
        isFr: Bool
    ) -> String {
        let safeMinutes = max(1, JSCompat.jsRoundInt(totalMinutes))
        let h = safeMinutes / 60
        let m = safeMinutes % 60
        let base = h > 0 ? "\(h)h \(String(format: "%02d", m))m" : "\(m)m"
        if stopsMin > 0 {
            return isFr ? "\(base) arrêts inclus" : "\(base) incl. stops"
        }
        return isFr ? "\(base) de selle" : "\(base) saddle"
    }

    private static func detectRouteProblems(
        trip: TripProfile,
        physics: PhysicsCalculationResult,
        leaveByHHMM: String,
        pinnedAmenities: [StageAmenity],
        corridorAmenities: [StageAmenity],
        hasWaterScan: Bool,
        bidonSizeMl: Int,
        frameBottleSlots: Int,
        targetFluidMlPerHr: Int,
        sectorForecast: RouteWeatherAnalysis?,
        lang: CadenceLang,
        timeZone: TimeZone
    ) -> (firstProblem: RideBriefProblem, secondaryProblems: [RideBriefProblem]) {
        let isFr = (lang == .fr)
        let totalKm = trip.route.distanceKm > 0 ? trip.route.distanceKm : 30.0
        let speedKmH = physics.effectiveSpeedKmH > 0 ? physics.effectiveSpeedKmH : (trip.route.targetSpeedKmH > 0 ? trip.route.targetSpeedKmH : 24.0)
        let targetDate: String?
        if let stages = trip.stages, !stages.isEmpty {
            let idx = max(0, min(trip.activeStageIndex ?? 0, stages.count - 1))
            targetDate = stages[idx].departureDate
        } else {
            targetDate = trip.departureDate
        }

        var problems: [RideBriefProblem] = []

        var poolMap: [String: StageAmenity] = [:]
        for p in pinnedAmenities {
            poolMap[p.id] = p
        }
        for a in corridorAmenities where poolMap[a.id] == nil {
            poolMap[a.id] = a
        }
        let allStops = poolMap.values.sorted { $0.routeKm < $1.routeKm }

        let stopsToAudit: [StageAmenity]
        if !pinnedAmenities.isEmpty {
            stopsToAudit = pinnedAmenities
        } else {
            stopsToAudit = Array(corridorAmenities.filter { $0.category == .food }.prefix(3))
        }

        for stop in stopsToAudit {
            guard let oh = stop.openingHours, !oh.isEmpty else { continue }
            let eta = OverpassWaterGapEngine.calculateAmenityEta(
                departureTime: leaveByHHMM,
                routeKm: stop.routeKm,
                effectiveSpeedKmH: speedKmH
            )
            guard let verdict = OpeningHoursParser.evaluateOpeningHoursAtArrival(
                openingHours: oh,
                targetDateStr: targetDate,
                arrivalTimeHHMM: eta,
                lang: lang,
                timeZone: timeZone
            ) else { continue }
            if verdict.status != .closed && verdict.status != .closingSoon {
                continue
            }

            let openAlt = allStops
                .filter { cand in
                    if cand.id == stop.id { return false }
                    if cand.category != stop.category && !(stop.category == .food && cand.category == .essentials) {
                        return false
                    }
                    guard let candOh = cand.openingHours, !candOh.isEmpty else { return false }
                    let candEta = OverpassWaterGapEngine.calculateAmenityEta(
                        departureTime: leaveByHHMM,
                        routeKm: cand.routeKm,
                        effectiveSpeedKmH: speedKmH
                    )
                    let candVerdict = OpeningHoursParser.evaluateOpeningHoursAtArrival(
                        openingHours: candOh,
                        targetDateStr: targetDate,
                        arrivalTimeHHMM: candEta,
                        lang: lang,
                        timeZone: timeZone
                    )
                    return candVerdict?.status == .open
                }
                .min { abs($0.routeKm - stop.routeKm) < abs($1.routeKm - stop.routeKm) }

            let altEta = openAlt.map {
                OverpassWaterGapEngine.calculateAmenityEta(
                    departureTime: leaveByHHMM,
                    routeKm: $0.routeKm,
                    effectiveSpeedKmH: speedKmH
                )
            }
            let isClosed = (verdict.status == .closed)

            let headline: String
            if let openAlt {
                let stopRouteKmStr = jsNum(stop.routeKm)
                let altRouteKmStr = jsNum(openAlt.routeKm)
                if isFr {
                    headline = "\(stop.name) \(isClosed ? "fermé" : "ferme bientôt") à \(eta) (km \(stopRouteKmStr)) → ouvert le plus proche : \(openAlt.name) au km \(altRouteKmStr)"
                } else {
                    headline = "\(stop.name) \(isClosed ? "closed" : "closing soon") at \(eta) (km \(stopRouteKmStr)) → nearest open: \(openAlt.name) at km \(altRouteKmStr)"
                }
            } else {
                let stopRouteKmStr = jsNum(stop.routeKm)
                if isFr {
                    headline = "\(stop.name) \(isClosed ? "fermé" : "ferme bientôt") à ton passage (\(eta), km \(stopRouteKmStr))"
                } else {
                    headline = "\(stop.name) \(isClosed ? "closed" : "closing soon") at arrival (\(eta), km \(stopRouteKmStr))"
                }
            }

            let detail: String
            if let openAlt, let altEta {
                let detourStr = jsNum(openAlt.detourMeters)
                if isFr {
                    let detourLabel = openAlt.detourMeters < 75 ? "sur la trace" : "+\(detourStr) m"
                    detail = "\(openAlt.name) est ouvert à \(altEta) (\(detourLabel)). Horaires initiaux : \(oh)."
                } else {
                    let detourLabel = openAlt.detourMeters < 75 ? "on route" : "+\(detourStr) m detour"
                    detail = "\(openAlt.name) is open at \(altEta) (\(detourLabel)). Listed hours: \(oh)."
                }
            } else {
                detail = verdict.detailLabel
            }

            problems.append(RideBriefProblem(
                id: "closed-\(stop.id)",
                severity: isClosed ? .critical : .warning,
                headline: headline,
                detail: detail,
                alternativeStop: openAlt
            ))
            break
        }

        if hasWaterScan {
            let gaps = OverpassWaterGapEngine.calculateWaterGaps(
                amenities: allStops,
                totalDistanceKm: totalKm,
                options: OverpassWaterGapEngine.WaterGapsOptions(
                    sectorSpeedKmH: speedKmH,
                    targetFluidMlPerHr: Double(targetFluidMlPerHr),
                    bidonSizeMl: Double(bidonSizeMl),
                    frameBottleSlots: frameBottleSlots
                )
            )

            if gaps.status == .critical, let g = gaps.criticalGaps.first {
                let startStr = jsNum(g.startKm)
                let endStr = jsNum(g.endKm)
                let distStr = jsNum(g.distanceKm)
                let depl = g.depletionPct ?? 100
                let needMl = g.gapFluidNeedMl ?? 0
                let capMl = g.onboardCapacityMl ?? (frameBottleSlots * bidonSizeMl)
                problems.append(RideBriefProblem(
                    id: "water-gap-critical",
                    severity: .critical,
                    headline: isFr
                        ? "Trou d’eau critique km \(startStr)–\(endStr) (\(distStr) km · \(depl)% d’autonomie)"
                        : "Critical water gap km \(startStr)–\(endStr) (\(distStr) km · \(depl)% depletion)",
                    detail: isFr
                        ? "Besoin estimé \(needMl) ml pour \(capMl) ml sur le cadre — prévois un bidon de plus ou une pause eau."
                        : "Estimated need \(needMl) ml vs \(capMl) ml on frame — pack an extra bottle or detour for water."
                ))
            } else if gaps.status == .caution, let g = gaps.cautionGaps.first {
                let startStr = jsNum(g.startKm)
                let endStr = jsNum(g.endKm)
                let distStr = jsNum(g.distanceKm)
                let depl = g.depletionPct ?? 70
                problems.append(RideBriefProblem(
                    id: "water-gap-caution",
                    severity: .warning,
                    headline: isFr
                        ? "Long secteur sans eau km \(startStr)–\(endStr) (\(distStr) km)"
                        : "Long dry stretch km \(startStr)–\(endStr) (\(distStr) km)",
                    detail: isFr
                        ? "Consomme ~\(depl) % de tes bidons — remplis avant le km \(startStr)."
                        : "Uses ~\(depl)% of bottle capacity — top up before km \(startStr)."
                ))
            }
        }

        let worstWindSector: RouteSectorForecast?
        if let sectors = sectorForecast?.sectors, !sectors.isEmpty {
            worstWindSector = sectors.max { $0.effectiveHeadwindKmH < $1.effectiveHeadwindKmH }
        } else {
            worstWindSector = nil
        }

        if let worstWindSector, worstWindSector.effectiveHeadwindKmH >= 18.0 {
            let startStr = jsNum(worstWindSector.startKm)
            let endStr = jsNum(worstWindSector.endKm)
            let effHw = JSCompat.jsRoundInt(worstWindSector.effectiveHeadwindKmH)
            problems.append(RideBriefProblem(
                id: "sector-headwind",
                severity: worstWindSector.effectiveHeadwindKmH >= 28.0 ? .critical : .warning,
                headline: isFr
                    ? "Gros vent de face km \(startStr)–\(endStr) (\(effHw) km/h)"
                    : "Heavy headwind km \(startStr)–\(endStr) (\(effHw) km/h)",
                detail: isFr
                    ? "Le vent ajoute environ +\(physics.windDelayMinutes) min vers \(worstWindSector.etaHHMM) — garde un peu d’énergie avant ce tronçon."
                    : "Wind adds around +\(physics.windDelayMinutes) min around \(worstWindSector.etaHHMM) — save a bit of energy before this stretch."
            ))
        } else if physics.powerDeltaWatts >= 20.0 && physics.windDelayMinutes >= 5 {
            problems.append(RideBriefProblem(
                id: "wind-tax",
                severity: physics.windDelayMinutes >= 12 ? .warning : .info,
                headline: isFr
                    ? "Le vent ralentit la sortie d’environ +\(physics.windDelayMinutes) min"
                    : "Wind slows this ride by about +\(physics.windDelayMinutes) min",
                detail: isFr
                    ? "Mieux vaut rouler aux sensations qu’en chassant ta vitesse moyenne habituelle."
                    : "Better to ride by feel than chase your usual average speed."
            ))
        }

        let maxRain = max(
            trip.weather.precipitationRiskPercent,
            sectorForecast?.worstCaseWeather.precipitationRiskPercent ?? 0.0
        )
        if maxRain >= 50.0 {
            let rainInt = JSCompat.jsRoundInt(maxRain)
            problems.append(RideBriefProblem(
                id: "rain-risk",
                severity: maxRain >= 75.0 ? .warning : .info,
                headline: isFr
                    ? "Pluie probable (\(rainInt) %) — routes humides"
                    : "Rain likely (\(rainInt)%) — expect wet roads",
                detail: isFr
                    ? "Prends un coupe-pluie, des verres clairs et retire 0,2 bar pour garder du grip."
                    : "Pack a rain shell, clear lenses, and drop 0.2 bar for extra cornering grip."
            ))
        }

        if problems.isEmpty {
            let noCorridorScan = corridorAmenities.isEmpty && (trip.route.coordinates?.isEmpty == false)
            let detail: String
            if noCorridorScan {
                detail = isFr
                    ? "Astuce : ouvre l’onglet Ravitaillement pour vérifier les fontaines et les boulangeries ouvertes."
                    : "Tip: open the Resupply tab to check live water stops and bakery opening hours."
            } else {
                detail = isFr
                    ? "\(pinnedAmenities.count) arrêt(s) épinglé(s) vérifié(s) pour ton passage."
                    : "\(pinnedAmenities.count) pinned stop(s) verified against your arrival window."
            }
            return (
                RideBriefProblem(
                    id: "all-clear",
                    severity: .clear,
                    headline: isFr
                        ? "Rien à signaler sur la trace ni côté météo"
                        : "All clear across weather, pace, and stops",
                    detail: detail
                ),
                []
            )
        }

        func rank(_ s: BriefProblemSeverity) -> Int {
            switch s {
            case .critical: return 0
            case .warning: return 1
            case .info: return 2
            case .clear: return 3
            }
        }
        problems.sort { rank($0.severity) < rank($1.severity) }

        return (problems[0], Array(problems.dropFirst().prefix(2)))
    }

    private struct CardMeta {
        let archetypeLabel: String
        let leavePodLabel: String
        let targetContextLabel: String
        let headline: String
        let narrativeSummary: String
        let totalDurationFormatted: String
        let tempC: Int
        let feelsLikeC: Int
        let tireWidthMm: Int
        let priorities: [RideBriefPriorityItem]
        let blockerAlreadyFeatured: Bool
        let companionNote: RideBriefCompanionNote?
    }

    private static func buildRideBriefCardMeta(
        trip: TripProfile,
        physics: PhysicsCalculationResult,
        timeline: ReverseTimelineCalculation,
        activeBike: BikeSpec,
        totalDistanceKm: Double,
        tyrePressure: TyrePressureResult,
        pressureUnit: PressureUnit,
        carbsPerHr: Int,
        totalCarbsG: Int,
        bottlesBadge: String,
        kit: KitRecommendation,
        firstProblem: RideBriefProblem,
        sectorForecast: RouteWeatherAnalysis?,
        finalVerdict: RideVerdict,
        lang: CadenceLang,
        telemetryMode: TelemetryMode?,
        showWatts: Bool,
        windInsight: HumanWindImpactResult,
        totalSweatLiters: Double,
        vis: RideVisibilityAnalysis,
        readiness: RideReadinessResult
    ) -> CardMeta {
        let isFr = (lang == .fr)
        let archMode = RideReadinessEngine.getArchetypeFromTag(tag: trip.tag, name: trip.name)
        let archetypeLabel: String
        let archWordEn: String
        switch archMode {
        case "SPORT":
            archetypeLabel = "Sport"
            archWordEn = "sport ride"
        case "BIKEPACKING":
            archetypeLabel = "Bikepacking"
            archWordEn = "stage"
        case "ESCAPADE":
            archetypeLabel = "Escapade"
            archWordEn = "escapade"
        default:
            archetypeLabel = isFr ? "Vélotaf" : "Commute"
            archWordEn = "commute"
        }

        let stopsMin = timeline.bufferMinutes
        let totalMinutes = max(1, timeline.pureMovingMinutes + stopsMin)
        let totalDurationFormatted = formatTotalBriefDuration(
            totalMinutes: Double(totalMinutes),
            stopsMin: stopsMin,
            isFr: isFr
        )

        let isDepartAt = (trip.arriveAtMode == false) && (trip.departureTime?.isEmpty == false)
        let leavePodLabel = isDepartAt
            ? (isFr ? "Départ prévu" : "Start time")
            : (isFr ? "Départ limite" : "Leave by")

        let targetContextLabel: String
        if isDepartAt {
            targetContextLabel = isFr
                ? "Fin estimée \(timeline.gateArrivalTime)"
                : "Est. \(timeline.gateArrivalTime) finish"
        } else if archMode == "COMMUTE" {
            targetContextLabel = isFr
                ? "Pour ton arrivée à \(timeline.shiftStartTime)"
                : "For your \(timeline.shiftStartTime) start"
        } else {
            targetContextLabel = isFr
                ? "Pour arriver vers \(timeline.gateArrivalTime)"
                : "For \(timeline.gateArrivalTime) finish"
        }

        let distRounded = totalDistanceKm >= 100.0
            ? String(JSCompat.jsRoundInt(totalDistanceKm))
            : jsNum(JSCompat.jsToFixedNumber(totalDistanceKm, decimals: 1))
        let tempC = JSCompat.jsRoundInt(trip.weather.temperatureC)
        let feelsLikeC = kit.feelsLikeC
        let baseWind = JSCompat.jsRoundInt(trip.weather.baseWindSpeedKmH)
        let gustsRaw = trip.weather.estuaryGustKmH.isFinite
            ? trip.weather.estuaryGustKmH
            : Double(JSCompat.jsRoundInt(Double(baseWind) * 1.4))
        let gusts = JSCompat.jsRoundInt(gustsRaw)
        let rainRisk = JSCompat.jsRoundInt(trip.weather.precipitationRiskPercent)
        let windCardinal = PhysicsEngine.degreesToCompassCardinal(
            trip.weather.windDirectionDegrees.isFinite ? trip.weather.windDirectionDegrees : 245.0,
            lang: lang
        )
        let tireWidthMm = JSCompat.jsRoundInt(BikeSpecsCatalog.resolveBikeTireWidthMm(activeBike))

        let gravelPct =
            trip.route.terrainSummary?.surfaceBreakdown?.gravelPct ??
            trip.route.terrainSummary?.gravelPct ??
            0.0
        let singletrackPct =
            trip.route.terrainSummary?.surfaceBreakdown?.singletrackPct ??
            trip.route.terrainSummary?.singletrackPct ??
            0.0
        let unpavedPct = JSCompat.jsRoundInt(gravelPct + singletrackPct)

        let daylightMin = max(0, JSCompat.jsRoundInt((Double(vis.daylightPercent) / 100.0) * Double(vis.movingMinutes)))
        let lumensCompact = vis.lightingGear.recommendedLumens.replacingOccurrences(of: " – ", with: "–")

        let loopComp = sectorForecast?.loopComparison
        let hasRecommendedLoopFlip = (loopComp?.isLoop == true) &&
            (loopComp?.recommendedDirection == .reverse) &&
            ((loopComp?.minutesSaved ?? 0) >= 2)
        let effectiveHeadwind = JSCompat.jsRoundInt(
            trip.weather.effectiveHeadwindKmH ?? (trip.weather.isHeadwindActive ? Double(baseWind) : 0.0)
        )
        let isHeadwindHard = effectiveHeadwind >= 18 || physics.windDelayMinutes >= 6
        let isLongRide = totalDistanceKm >= 55.0 || timeline.pureMovingMinutes >= 150
        let isTailwind = trip.weather.windDirection == "tailwind" && baseWind >= 12

        var headline: String
        if vis.daylightPercent == 0 {
            headline = isFr ? "Allume tes feux et roule tranquille." : "Lights on. Easy, steady ride."
        } else if readiness.level == "needs-change" {
            headline = isFr ? "Un petit ajustement avant de partir." : "Worth a quick tweak before you roll."
        } else if readiness.level == "worth-tweak" {
            headline = isFr ? "Presque prêt — jette un œil aux points clés." : "Almost set — check the flags below."
        } else {
            headline = isFr ? "Feu vert, bonne route." : "Good to roll."
        }

        let pressureFormatted = TyrePressureEngine.formatPair(
            frontBar: tyrePressure.frontBar,
            rearBar: tyrePressure.rearBar,
            unit: pressureUnit,
            lang: lang
        )
        let pressureSpacedFormatted = pressureFormatted.replacingOccurrences(of: "/", with: " / ")
        let wattsTail = showWatts
            ? " · ~\(JSCompat.jsRoundInt(physics.legWatts)) W (\(physics.powerZone))"
            : ""

        var narrativeSummary = isFr
            ? "Tes \(distRounded) km sur \(activeBike.name) s’annoncent simples — gonfle à \(pressureFormatted) et profite\(wattsTail)."
            : "\(distRounded) km on \(activeBike.name) looks straightforward — set \(pressureFormatted) and enjoy the ride\(wattsTail)."

        if finalVerdict == .noGo {
            headline = isFr ? "Mieux vaut reporter ou adapter." : "Best to wait or adjust."
            narrativeSummary = isFr
                ? "Conditions rudes sur ce parcours de \(distRounded) km — vérifie les rafales et l’adhérence avant de partir."
                : "Rough conditions on this \(distRounded) km \(archWordEn) — check the gusts and road grip before rolling out."
        } else if hasRecommendedLoopFlip, let loopComp {
            let reverseIsClockwise = (loopComp.forwardOrientation == .anticlockwise)
            let orientationLabelFr = reverseIsClockwise ? "sens horaire" : "sens antihoraire"
            let orientationLabelEn = reverseIsClockwise ? "clockwise" : "counter-clockwise"
            headline = isFr
                ? "Inverse la boucle, gagne \(loopComp.minutesSaved) min."
                : "Flip the loop. Save \(loopComp.minutesSaved) min."
            narrativeSummary = isFr
                ? "Partir dans le \(orientationLabelFr) met le vent \(windCardinal) dans ton dos pour rentrer plus léger\(wattsTail)."
                : "Riding \(orientationLabelEn) puts the \(windCardinal) wind behind you on the way back for a smoother finish\(wattsTail)."
        } else if archMode == "COMMUTE" && (vis.nightPercent >= 40 || isLongRide) {
            headline = isFr ? "Pars tranquille." : "Give yourself an easy start."
            narrativeSummary = isFr
                ? "Un vélotaf de \(distRounded) km, c’est déjà une vraie sortie — cale un rythme confortable pour arriver frais\(wattsTail)."
                : "A \(distRounded) km commute is a proper ride — settle into a comfortable rhythm and save your legs for the day\(wattsTail)."
        } else if isLongRide {
            headline = isFr ? "Gère la première moitié." : "Pace easy early, finish strong."
            narrativeSummary = isFr
                ? "\(distRounded) km sur \(activeBike.name), c’est une belle virée — mange tôt et garde de la réserve sur les premiers kilomètres\(wattsTail)."
                : "\(distRounded) km on \(activeBike.name) is a proper day out — eat early and keep the first half relaxed\(wattsTail)."
        } else if isHeadwindHard {
            let gradeLabel: String
            if windInsight.equivalentGradePct >= 0.5 {
                let eqGradeStr = JSCompat.jsFixed(windInsight.equivalentGradePct, decimals: 1)
                gradeLabel = isFr
                    ? "transforme le plat en côte à +\(eqGradeStr) %"
                    : "makes the flats feel like a +\(eqGradeStr)% climb"
            } else {
                gradeLabel = isFr
                    ? "ajoute ~\(physics.windDelayMinutes) min si tu forces"
                    : "adds ~\(physics.windDelayMinutes) min if you fight it"
            }
            headline = isFr ? "Roule souple face au vent." : "Steady effort into the breeze."
            narrativeSummary = isFr
                ? "Un vent \(windCardinal) de \(baseWind) km/h \(gradeLabel) — garde un coup de pédale fluide au lieu de courir après la moyenne\(wattsTail)."
                : "A \(baseWind) km/h \(windCardinal) breeze \(gradeLabel) — spin smooth instead of chasing your usual speed\(wattsTail)."
        } else if unpavedPct >= 30 {
            headline = isFr ? "Pression souple pour le gravel." : "Softer tyres, smoother gravel."
            narrativeSummary = isFr
                ? "Avec \(unpavedPct) % de chemins sur \(distRounded) km, \(pressureFormatted) sur \(activeBike.name) te garde du grip et du confort."
                : "With \(unpavedPct)% unpaved roads across \(distRounded) km, \(pressureFormatted) on \(activeBike.name) keeps steering planted and takes the buzz out of your hands."
        } else if isTailwind {
            headline = isFr ? "Joli vent dans le dos." : "Nice breeze at your back."
            narrativeSummary = isFr
                ? "Le vent \(windCardinal) pousse tes \(distRounded) km sur \(activeBike.name) — profite de l’élan gratuit."
                : "A supportive \(windCardinal) tailwind helps carry your \(distRounded) km \(archWordEn) on \(activeBike.name) — enjoy the free speed."
        }

        let realElevM = JSCompat.jsRoundInt(trip.route.elevationGainM ?? 0.0)
        let totalKcal = JSCompat.jsRoundInt(physics.totalKcalBurn)
        let croissantsEquiv = JSCompat.jsToFixedNumber(Double(totalKcal) / 260.0, decimals: 1)
        let croissantLabel = "croissant\(croissantsEquiv >= 1.5 ? "s" : "")"
        let chillDropC = max(0, tempC - feelsLikeC)

        var companionNote: RideBriefCompanionNote?
        if windInsight.ghostElevationM >= 150 && !hasRecommendedLoopFlip {
            let iconicSuffix = windInsight.iconicClimbComparison.map { " (\($0))" } ?? ""
            companionNote = RideBriefCompanionNote(
                icon: .wind,
                text: isFr
                    ? "Vrai dénivelé : \(realElevM) m · Le vent ajoute +\(windInsight.ghostElevationM) m de montée invisible\(iconicSuffix)."
                    : "Real climbing: \(realElevM) m · Wind adds +\(windInsight.ghostElevationM) m of invisible climbing\(iconicSuffix)."
            )
        } else if totalKcal >= 850 || totalSweatLiters >= 1.3 {
            let kcalStr = formatLocaleInt(totalKcal, isFr: isFr)
            let croissantsStr = jsNum(croissantsEquiv)
            let sweatStr = jsNum(totalSweatLiters)
            companionNote = RideBriefCompanionNote(
                icon: .flame,
                text: isFr
                    ? "Environ \(kcalStr) kcal brûlées (≈ \(croissantsStr) \(croissantLabel)) et ~\(sweatStr) L de sueur — pense à boire régulièrement."
                    : "Around \(kcalStr) kcal burned (≈ \(croissantsStr) \(croissantLabel)) and ~\(sweatStr) L of sweat — keep sipping steadily."
            )
        } else if chillDropC >= 3 && feelsLikeC <= 12 {
            companionNote = RideBriefCompanionNote(
                icon: .thermometer,
                text: isFr
                    ? "\(tempC) °C devant la porte, \(feelsLikeC) °C une fois lancé — une couche de plus aide bien sur les 20 premières minutes."
                    : "\(tempC)°C at the front door, \(feelsLikeC)°C once you’re rolling — an extra layer helps for the first 20 minutes."
            )
        } else if windInsight.ghostElevationM <= -150 {
            let absGhost = abs(windInsight.ghostElevationM)
            companionNote = RideBriefCompanionNote(
                icon: .compass,
                text: isFr
                    ? "Le vent de dos aujourd’hui t’offre l’équivalent de \(absGhost) m de descente gratuite sur le parcours."
                    : "Today’s tailwind gives you the equivalent of \(absGhost) m of free downhill across the ride."
            )
        }

        let priority1: RideBriefPriorityItem
        var blockerAlreadyFeatured = false
        let hasUrgentProblem =
            firstProblem.severity == .critical ||
            (firstProblem.severity == .warning &&
             (firstProblem.id == "cafe-closed" || firstProblem.id == "water-gap"))

        if vis.nightPercent >= 60 {
            priority1 = RideBriefPriorityItem(
                id: "visibility-night",
                theme: .purple,
                iconKey: .lights,
                headline: isFr ? "Éclairage requis sur tout le trajet" : "Lights on for the whole ride",
                detail: isFr
                    ? "\(daylightMin) min de jour · Phare \(lumensCompact)"
                    : "\(daylightMin) min daylight · Bring a \(lumensCompact) light"
            )
        } else if hasUrgentProblem {
            blockerAlreadyFeatured = true
            priority1 = RideBriefPriorityItem(
                id: "blocker-\(firstProblem.id)",
                theme: firstProblem.severity == .critical ? .rose : .amber,
                iconKey: .blocker,
                headline: firstProblem.headline,
                detail: firstProblem.detail
            )
        } else if vis.nightPercent > 0 ||
                  vis.twilightPercent >= 25 ||
                  vis.opticalHazardLevel == "critical" ||
                  vis.opticalHazardLevel == "elevated" {
            let lowLightPct = min(100, vis.nightPercent + vis.twilightPercent)
            priority1 = RideBriefPriorityItem(
                id: "visibility-twilight",
                theme: .amber,
                iconKey: .lights,
                headline: isFr ? "Passages à faible luminosité" : "Low-light sections ahead",
                detail: isFr
                    ? "\(lowLightPct)% pénombre · Optiques \(lumensCompact)"
                    : "\(lowLightPct)% twilight/dark · Pack \(lumensCompact) optics"
            )
        } else {
            let tubelessStr = activeBike.isTubeless ? "tubeless" : (isFr ? "chambre" : "tubes")
            let surfaceSuffix: String
            if unpavedPct > 0 {
                surfaceSuffix = isFr ? " · \(unpavedPct)% chemins" : " · \(unpavedPct)% unpaved"
            } else {
                surfaceSuffix = isFr ? " · 15% déflexion" : " · 15% drop"
            }
            priority1 = RideBriefPriorityItem(
                id: "tyre-pressure",
                theme: .sky,
                iconKey: .tyre,
                headline: isFr ? "Pneus : \(pressureSpacedFormatted)" : "Tyres: \(pressureSpacedFormatted)",
                detail: "\(tireWidthMm) mm \(tubelessStr)\(surfaceSuffix)"
            )
        }

        let priority2: RideBriefPriorityItem
        if rainRisk >= 35 {
            let gustsPartFr = gusts >= 30 ? " · rafales \(gusts) km/h" : ""
            let gustsPartEn = gusts >= 30 ? " · \(gusts) km/h gusts" : ""
            priority2 = RideBriefPriorityItem(
                id: "weather-rain",
                theme: .blue,
                iconKey: .rain,
                headline: isFr ? "Pluie \(rainRisk)%\(gustsPartFr)" : "Rain risk \(rainRisk)%\(gustsPartEn)",
                detail: isFr
                    ? "Vent \(windCardinal) · \(kit.tierBadge) + \(kit.upperBody)"
                    : "Wind from \(windCardinal) · \(kit.tierBadge) + \(kit.upperBody)"
            )
        } else if gusts >= 28 || baseWind >= 18 {
            priority2 = RideBriefPriorityItem(
                id: "weather-gusts",
                theme: .teal,
                iconKey: .wind,
                headline: isFr ? "Rafales jusqu'à \(gusts) km/h" : "Gusts reach \(gusts) km/h",
                detail: isFr
                    ? "Vent \(windCardinal) · Reste souple en zone exposée"
                    : "Wind from \(windCardinal) · Stay steady in exposed sections"
            )
        } else {
            let roadCondition = PhysicsEngine.classifyRoadSurfaceCondition(trip.weather)
            let roadSurfaceTextFr: String
            if rainRisk > 15 {
                roadSurfaceTextFr = "Pluie \(rainRisk)%"
            } else if roadCondition == .wet {
                roadSurfaceTextFr = "Routes mouillées"
            } else if roadCondition == .damp {
                roadSurfaceTextFr = "Chaussée humide"
            } else {
                roadSurfaceTextFr = "Routes sèches"
            }

            let roadSurfaceTextEn: String
            if rainRisk > 15 {
                roadSurfaceTextEn = "\(rainRisk)% rain"
            } else if roadCondition == .wet {
                roadSurfaceTextEn = "Wet roads"
            } else if roadCondition == .damp {
                roadSurfaceTextEn = "Damp roads"
            } else {
                roadSurfaceTextEn = "Dry roads"
            }

            let kitChipTheme = ChipTheme(rawValue: kit.tierTheme.rawValue) ?? .teal
            priority2 = RideBriefPriorityItem(
                id: "weather-calm",
                theme: kitChipTheme,
                iconKey: .sun,
                headline: isFr ? "Ciel calme · \(kit.tierBadge)" : "Calm skies · \(kit.tierBadge)",
                detail: isFr
                    ? "Vent \(windCardinal) \(baseWind) km/h · Ressenti \(feelsLikeC)°C · \(roadSurfaceTextFr)"
                    : "Wind \(windCardinal) \(baseWind) km/h · Feels like \(feelsLikeC)°C · \(roadSurfaceTextEn)"
            )
        }

        let isIntuitiveFuel = (telemetryMode == .intuitive)
        let isFuelFirstUnits = (telemetryMode == .fuelFirst)
        let fuelUnitsPerHr = max(1, JSCompat.jsRoundInt(Double(carbsPerHr) / 20.0))
        let priority3: RideBriefPriorityItem
        if carbsPerHr > 0 {
            let p3Headline: String
            if isIntuitiveFuel {
                p3Headline = isFr ? "Gorgée & bouchée toutes les 20 min" : "Sip & bite every 20 min"
            } else if isFuelFirstUnits {
                p3Headline = isFr ? "~\(fuelUnitsPerHr) en-cas / h" : "~\(fuelUnitsPerHr) snacks / hr"
            } else {
                p3Headline = isFr ? "Ravito régulier : \(carbsPerHr) g/h" : "Fuel regularly: \(carbsPerHr) g carbs/h"
            }
            let p3Detail: String
            if !isIntuitiveFuel && !isFuelFirstUnits && totalCarbsG > 0 {
                p3Detail = isFr ? "\(bottlesBadge) · \(totalCarbsG) g au total" : "\(bottlesBadge) · \(totalCarbsG) g total"
            } else {
                p3Detail = bottlesBadge
            }
            priority3 = RideBriefPriorityItem(
                id: "fuel-hydration",
                theme: .orange,
                iconKey: .fuel,
                headline: p3Headline,
                detail: p3Detail
            )
        } else {
            priority3 = RideBriefPriorityItem(
                id: "fuel-hydration",
                theme: .orange,
                iconKey: .fuel,
                headline: isFr ? "Hydrate-toi · Pas besoin de glucides en plus" : "Stay hydrated · No extra carbs needed",
                detail: isFr ? "\(bottlesBadge) · Ton repas d’avant départ suffit" : "\(bottlesBadge) · Pre-ride fuel covers energy"
            )
        }

        return CardMeta(
            archetypeLabel: archetypeLabel,
            leavePodLabel: leavePodLabel,
            targetContextLabel: targetContextLabel,
            headline: headline,
            narrativeSummary: narrativeSummary,
            totalDurationFormatted: totalDurationFormatted,
            tempC: tempC,
            feelsLikeC: feelsLikeC,
            tireWidthMm: tireWidthMm,
            priorities: [priority1, priority2, priority3],
            blockerAlreadyFeatured: blockerAlreadyFeatured,
            companionNote: companionNote
        )
    }

    public static func buildRideBrief(
        trip: TripProfile,
        physics: PhysicsCalculationResult,
        timeline: ReverseTimelineCalculation,
        riderSpecs: RiderBikeSpecs = .defaultSpecs,
        sectorForecast: RouteWeatherAnalysis? = nil,
        amenities: [StageAmenity]? = nil,
        hasWaterScan: Bool? = nil,
        lang: CadenceLang = .en,
        now: Date = Date(),
        timeZone: TimeZone = TimeZone(identifier: "Europe/Paris") ?? .current
    ) -> RideBriefData {
        let activeBike = BikeSpecsCatalog.getActiveBike(riderSpecs)
        let pinnedAmenities = trip.pinnedAmenities ?? []

        let activeStage: TripStage?
        if let stages = trip.stages, !stages.isEmpty {
            let idx = max(0, min(trip.activeStageIndex ?? 0, stages.count - 1))
            activeStage = stages[idx]
        } else {
            activeStage = nil
        }

        let totalDistanceKm = trip.route.distanceKm > 0 ? trip.route.distanceKm : 30.0
        let resolvedHasWaterScan = hasWaterScan ?? (amenities?.isEmpty == false)
        let cachedScan = amenities ?? []

        // 1. Tyre Pressure (continuous 15%-drop model)
        let bikeTireWidthMm = BikeSpecsCatalog.resolveBikeTireWidthMm(activeBike)
        let sb = trip.route.terrainSummary?.surfaceBreakdown
        let pavedPct = sb?.pavedPct ?? (bikeTireWidthMm >= 34.0 ? 55.0 : 95.0)
        let gravelPct = sb?.gravelPct ?? (bikeTireWidthMm >= 34.0 ? 40.0 : 5.0)
        let singletrackPct = sb?.singletrackPct ?? (bikeTireWidthMm >= 42.0 ? 5.0 : 0.0)
        let gearKg = trip.physics.luggageWeightKg ?? trip.physics.gearWeightKg

        let riderMass = riderSpecs.riderWeightKg > 0
            ? riderSpecs.riderWeightKg
            : (trip.physics.riderWeightKg > 0 ? trip.physics.riderWeightKg : 75.0)
        let bikeMass = activeBike.weightKg > 0
            ? activeBike.weightKg
            : (trip.physics.bikeWeightKg > 0 ? trip.physics.bikeWeightKg : 10.0)

        let tyrePressure = TyrePressureEngine.calculate(TyrePressureInput(
            systemMassKg: riderMass + bikeMass + gearKg,
            tireWidthMm: bikeTireWidthMm,
            isTubeless: activeBike.isTubeless,
            pavedPct: pavedPct,
            gravelPct: gravelPct,
            singletrackPct: singletrackPct,
            gearWeightKg: gearKg,
            bikeCategory: activeBike.bikeCategory,
            casingType: activeBike.casingType,
            isHookless: activeBike.isHookless,
            bikeName: activeBike.name
        ))

        // 2. Carbs / hour & hydration
        let movingHours = max(0.25, (physics.movingTimeSeconds > 0 ? physics.movingTimeSeconds : 3600.0) / 3600.0)
        let carbTarget = riderSpecs.carbTargetGPerHr
        let pctFtp = physics.ftpPercent
        let isLockedCarb =
            riderSpecs.carbPacingMode == "locked" ||
            (riderSpecs.carbPacingMode != "auto" &&
             riderSpecs.riderLevel == .pro &&
             carbTarget >= 60.0)

        let dynamicCarb = NutritionEngine.calculateIntensityModulatedCarbTarget(
            IntensityModulatedCarbTargetParams(
                rideHours: movingHours,
                pctFtp: pctFtp,
                carbOxidationGramPerHour: physics.carbOxidationGramPerHour > 0
                    ? physics.carbOxidationGramPerHour
                    : Double(JSCompat.jsRoundInt(carbTarget * 1.8)),
                gutCeilingGPerHr: carbTarget,
                totalDays: max(1, trip.stages?.count ?? 1),
                activeChips: trip.customChips ?? [],
                isLockedCarbTarget: isLockedCarb
            )
        )
        let carbsPerHr = JSCompat.jsRoundInt(dynamicCarb.recommendedGPerHr)
        let totalCarbsG = JSCompat.jsRoundInt(dynamicCarb.targetOnBikeCarbsG)

        let bidonSizeMl = riderSpecs.bidonSizeMl ?? 650
        let frameBottleSlots = riderSpecs.frameBottleSlots ?? 2
        let isShortRide = movingHours < 0.75 && (trip.stages?.count ?? 1) == 1
        let hydration = NutritionEngine.calculateHydrationPlan(HydrationPlanParams(
            rideHours: movingHours,
            tempC: sectorForecast?.worstCaseWeather.temperatureC ?? trip.weather.temperatureC,
            legWatts: physics.legWatts,
            bidonSizeMl: Double(bidonSizeMl),
            frameBottleSlots: frameBottleSlots,
            isShortRide: isShortRide,
            activeChips: trip.customChips ?? []
        ))

        let isFr = (lang == .fr)
        let bottlesBadge: String
        if hydration.plannedRefillBidons > 0 {
            if isFr {
                bottlesBadge = "\(hydration.carriedOnFrameBidons)× \(bidonSizeMl) ml + \(hydration.plannedRefillBidons) rech."
            } else {
                let plural = hydration.plannedRefillBidons > 1 ? "s" : ""
                bottlesBadge = "\(hydration.carriedOnFrameBidons)× \(bidonSizeMl) ml + \(hydration.plannedRefillBidons) refill\(plural)"
            }
        } else {
            bottlesBadge = "\(hydration.carriedOnFrameBidons)× \(bidonSizeMl) ml"
        }

        // 3. First Problem on the Route
        let (firstProblem, secondaryProblems) = detectRouteProblems(
            trip: trip,
            physics: physics,
            leaveByHHMM: timeline.hardDepartureTime,
            pinnedAmenities: pinnedAmenities,
            corridorAmenities: cachedScan,
            hasWaterScan: resolvedHasWaterScan,
            bidonSizeMl: bidonSizeMl,
            frameBottleSlots: frameBottleSlots,
            targetFluidMlPerHr: hydration.targetFluidMlPerHr,
            sectorForecast: sectorForecast,
            lang: lang,
            timeZone: timeZone
        )

        // 4. Kit call
        let kit = KitAdvisor.getKitRecommendation(
            weather: sectorForecast?.worstCaseWeather ?? trip.weather,
            solarPhase: .daylight,
            lang: lang,
            options: KitAdvisorOptions(
                ridingSpeedKmH: physics.effectiveSpeedKmH,
                coldestSectorLabel: sectorForecast?.coldestSectorLabel
            )
        )

        var finalVerdict = RideVerdict(rawValue: physics.goStatus) ?? .go
        var finalReason = physics.goStatusReason
        if firstProblem.severity == .critical && finalVerdict == .go {
            finalVerdict = .caution
            finalReason = firstProblem.headline
        }

        // 5. Readiness score
        let briefDepartureDate = activeStage?.departureDate ?? trip.departureDate
        let vis = SolarVisibilityEngine.calculateRideVisibility(
            trip: trip,
            customDate: briefDepartureDate,
            customRolloutTime: timeline.hardDepartureTime,
            effectiveSpeedOverrideKmH: physics.effectiveSpeedKmH,
            timeZone: timeZone
        )
        let realSurface = trip.route.terrainSummary?.surfaceBreakdown ?? trip.route.surfaceBreakdown
        let terrainGravelPct = realSurface?.gravelPct ?? trip.route.terrainSummary?.gravelPct
        let terrainSinglePct = realSurface?.singletrackPct ?? trip.route.terrainSummary?.singletrackPct

        let checklistItems = RideReadinessEngine.buildEffectiveChecklist(
            trip,
            riderSpecs: riderSpecs,
            lang: lang
        )
        let criticalItems = checklistItems.filter(\.critical)
        let logisticsProblems = ([firstProblem] + secondaryProblems).filter {
            $0.id.hasPrefix("closed-") || $0.id.hasPrefix("water-gap")
        }
        let flaggedProblems = logisticsProblems.filter {
            $0.severity == .critical || $0.severity == .warning
        }
        let worstLogistics = logisticsProblems.first
        let baseWindKmH = trip.weather.baseWindSpeedKmH
        let worstWeather = sectorForecast?.worstCaseWeather

        let readiness = RideReadinessEngine.computeRideReadiness(RideReadinessInput(
            lang: lang,
            weather: ReadinessWeatherInput(
                rainRiskPct: max(trip.weather.precipitationRiskPercent, worstWeather?.precipitationRiskPercent ?? 0.0),
                baseWindKmH: max(baseWindKmH, worstWeather?.baseWindSpeedKmH ?? 0.0),
                gustKmH: max(
                    trip.weather.estuaryGustKmH.isFinite ? trip.weather.estuaryGustKmH : Double(JSCompat.jsRoundInt(baseWindKmH * 1.4)),
                    worstWeather?.estuaryGustKmH ?? 0.0
                ),
                headwindKmH: trip.weather.effectiveHeadwindKmH ?? (trip.weather.isHeadwindActive ? baseWindKmH : 0.0),
                feelsLikeC: Double(kit.feelsLikeC)
            ),
            bike: ReadinessBikeInput(
                name: activeBike.name,
                category: activeBike.bikeCategory,
                tireWidthMm: bikeTireWidthMm,
                isTubeless: activeBike.isTubeless
            ),
            terrain: ReadinessTerrainInput(
                hasSurfaceData: terrainGravelPct != nil || terrainSinglePct != nil,
                gravelPct: terrainGravelPct ?? 0.0,
                singletrackPct: terrainSinglePct ?? 0.0,
                suitabilityLevel: realSurface?.suitability.overallLevel
            ),
            effort: ReadinessEffortInput(
                ftpPercent: physics.ftpPercent,
                movingHours: movingHours,
                powerZone: physics.powerZone,
                riderLevel: riderSpecs.riderLevel,
                plannedStopMinutes: Double(StationaryRecoveryEngine.getPlannedRestStopMinutes(trip, now: now)),
                isPreDawnWinter: StationaryRecoveryEngine.getStationaryRecoveryRuleForTrip(
                    trip,
                    overrideRolloutHHMM: timeline.hardDepartureTime,
                    now: now
                ).isRestricted
            ),
            checklist: ReadinessChecklistInput(
                total: checklistItems.count,
                checked: checklistItems.filter(\.checked).count,
                criticalTotal: criticalItems.count,
                criticalChecked: criticalItems.filter(\.checked).count
            ),
            light: ReadinessLightInput(
                nightPercent: Double(vis.nightPercent),
                twilightPercent: Double(vis.twilightPercent)
            ),
            route: ReadinessRouteInput(
                worstSeverity: worstLogistics?.severity.rawValue ?? "clear",
                issueCount: flaggedProblems.count,
                headline: worstLogistics?.headline
            ),
            goStatus: finalVerdict.rawValue
        ))

        let pressureUnit: PressureUnit = (riderSpecs.pressureUnit == .psi) ? .psi : .bar
        let showWatts = (riderSpecs.cockpitViewMode == .pro) || (riderSpecs.pacingInputMode == .power)
        let windInsight = WindInsightsEngine.calculateTripWindInsight(
            distanceKm: totalDistanceKm,
            targetSpeedKmH: trip.route.targetSpeedKmH > 0 ? trip.route.targetSpeedKmH : (physics.effectiveSpeedKmH > 0 ? physics.effectiveSpeedKmH : 24.0),
            riderWeightKg: riderSpecs.riderWeightKg > 0 ? riderSpecs.riderWeightKg : (trip.physics.riderWeightKg > 0 ? trip.physics.riderWeightKg : 74.0),
            bikeWeightKg: activeBike.weightKg > 0 ? activeBike.weightKg : (trip.physics.bikeWeightKg > 0 ? trip.physics.bikeWeightKg : 10.0),
            cda: trip.physics.cda,
            crr: trip.physics.crr,
            windSpeedKmH: trip.weather.baseWindSpeedKmH,
            effectiveHeadwindKmH: trip.weather.effectiveHeadwindKmH,
            isHeadwindActive: trip.weather.isHeadwindActive,
            windDirection: trip.weather.windDirection,
            windFromDegrees: trip.weather.windDirectionDegrees,
            temperatureC: trip.weather.temperatureC,
            ftpWatts: riderSpecs.ftpWatts,
            lang: lang
        )
        let totalSweatLiters = JSCompat.jsToFixedNumber((Double(hydration.sweatRateMlPerHr) * movingHours) / 1000.0, decimals: 1)

        let cardMeta = buildRideBriefCardMeta(
            trip: trip,
            physics: physics,
            timeline: timeline,
            activeBike: activeBike,
            totalDistanceKm: totalDistanceKm,
            tyrePressure: tyrePressure,
            pressureUnit: pressureUnit,
            carbsPerHr: carbsPerHr,
            totalCarbsG: totalCarbsG,
            bottlesBadge: bottlesBadge,
            kit: kit,
            firstProblem: firstProblem,
            sectorForecast: sectorForecast,
            finalVerdict: finalVerdict,
            lang: lang,
            telemetryMode: riderSpecs.telemetryMode,
            showWatts: showWatts,
            windInsight: windInsight,
            totalSweatLiters: totalSweatLiters,
            vis: vis,
            readiness: readiness
        )

        return RideBriefData(
            verdict: finalVerdict,
            verdictReason: finalReason,
            leaveByHHMM: timeline.hardDepartureTime,
            arrivalHHMM: timeline.gateArrivalTime,
            movingTimeFormatted: physics.movingTimeFormatted,
            totalStopsMin: timeline.bufferMinutes,
            distanceKm: totalDistanceKm,
            elevationGainM: JSCompat.jsRoundInt(trip.route.elevationGainM ?? 0.0),
            departureDate: activeStage?.departureDate ?? trip.departureDate,
            bikeName: activeBike.name,
            loopComparison: sectorForecast?.loopComparison,
            tyrePressure: tyrePressure,
            pressureUnit: pressureUnit,
            isTubeless: activeBike.isTubeless,
            carbsPerHr: carbsPerHr,
            totalCarbsG: totalCarbsG,
            bottles: RideBriefBottlesSummary(
                carried: hydration.carriedOnFrameBidons,
                bidonSizeMl: bidonSizeMl,
                refills: hydration.plannedRefillBidons,
                badgeLabel: bottlesBadge
            ),
            firstProblem: firstProblem,
            secondaryProblems: secondaryProblems,
            kit: kit,
            pinnedCount: pinnedAmenities.count,
            scannedCount: cachedScan.count,
            archetypeLabel: cardMeta.archetypeLabel,
            leavePodLabel: cardMeta.leavePodLabel,
            targetContextLabel: cardMeta.targetContextLabel,
            headline: cardMeta.headline,
            narrativeSummary: cardMeta.narrativeSummary,
            totalDurationFormatted: cardMeta.totalDurationFormatted,
            tempC: cardMeta.tempC,
            feelsLikeC: cardMeta.feelsLikeC,
            tireWidthMm: cardMeta.tireWidthMm,
            priorities: cardMeta.priorities,
            blockerAlreadyFeatured: cardMeta.blockerAlreadyFeatured,
            readiness: readiness,
            companionNote: cardMeta.companionNote,
            windInsight: windInsight
        )
    }
}
