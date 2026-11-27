import Foundation

public struct StemStickerPreset: Codable, Sendable, Equatable {
    public var id: String // "road" | "gravel"
    public var widthMm: Int
    public var minHeightMm: Int
    public var maxRows: Int
    public var labelEn: String
    public var labelFr: String
    public var dimLabel: String

    public init(id: String, widthMm: Int, minHeightMm: Int, maxRows: Int, labelEn: String, labelFr: String, dimLabel: String) {
        self.id = id
        self.widthMm = widthMm
        self.minHeightMm = minHeightMm
        self.maxRows = maxRows
        self.labelEn = labelEn
        self.labelFr = labelFr
        self.dimLabel = dimLabel
    }
}

public struct StemStickerNote: Codable, Sendable, Equatable {
    public var id: String
    public var km: Double
    public var label: String

    public init(id: String, km: Double, label: String) {
        self.id = id
        self.km = km
        self.label = label
    }
}

public struct StemStickerRow: Codable, Sendable, Equatable {
    public var id: String
    public var km: Double
    public var etaHHMM: String?
    public var kind: String // "start" | "climb" | "bakery" | "water" | "warning" | "fuel" | "custom" | "finish"
    public var title: String
    public var detail: String?
    public var tag: String?
    public var emphasis: Bool?

    public init(
        id: String,
        km: Double,
        etaHHMM: String? = nil,
        kind: String,
        title: String,
        detail: String? = nil,
        tag: String? = nil,
        emphasis: Bool? = nil
    ) {
        self.id = id
        self.km = km
        self.etaHHMM = etaHHMM
        self.kind = kind
        self.title = title
        self.detail = detail
        self.tag = tag
        self.emphasis = emphasis
    }
}

public struct StemStickerData: Codable, Sendable, Equatable {
    public var title: String
    public var subtitle: String
    public var distanceKm: Double
    public var elevationGainM: Int
    public var startTime: String
    public var finishHHMM: String
    public var movingLabel: String
    public var fuelCueLine: String
    public var tyrePressureLine: String
    public var rows: [StemStickerRow]

    public init(
        title: String,
        subtitle: String,
        distanceKm: Double,
        elevationGainM: Int,
        startTime: String,
        finishHHMM: String,
        movingLabel: String,
        fuelCueLine: String,
        tyrePressureLine: String,
        rows: [StemStickerRow]
    ) {
        self.title = title
        self.subtitle = subtitle
        self.distanceKm = distanceKm
        self.elevationGainM = elevationGainM
        self.startTime = startTime
        self.finishHHMM = finishHHMM
        self.movingLabel = movingLabel
        self.fuelCueLine = fuelCueLine
        self.tyrePressureLine = tyrePressureLine
        self.rows = rows
    }
}

public enum StemStickerEngine {
    public static let presets: [String: StemStickerPreset] = [
        "road": StemStickerPreset(
            id: "road",
            widthMm: 36,
            minHeightMm: 140,
            maxRows: 10,
            labelEn: "Narrow Road",
            labelFr: "Route fin",
            dimLabel: "3.6 × 14 cm"
        ),
        "gravel": StemStickerPreset(
            id: "gravel",
            widthMm: 46,
            minHeightMm: 155,
            maxRows: 13,
            labelEn: "Wide Gravel",
            labelFr: "Gravel large",
            dimLabel: "4.6 × 15.5 cm"
        ),
    ]

    public static func buildStemStickerData(
        trip: TripProfile,
        riderSpecs: RiderBikeSpecs? = nil,
        amenities: [StageAmenity] = [],
        selectedAmenityIds: [String]? = nil,
        customNotes: [StemStickerNote] = [],
        presetId: String = "gravel",
        includeFuelCues: Bool = true,
        includeClimbs: Bool = true,
        lang: CadenceLang = .en,
        now: Date = Date(),
        timeZone: TimeZone = TimeZone(identifier: "Europe/Paris") ?? .current
    ) -> StemStickerData {
        let isFr = lang == .fr
        let preset = presets[presetId] ?? presets["gravel"]!
        let activeBike = riderSpecs.map { BikeSpecsCatalog.getActiveBike($0) }

        let distKm = max(1.0, trip.route.distanceKm > 0 ? trip.route.distanceKm : 30.0)
        let elevGainM = max(0, JSCompat.jsRoundInt(trip.route.elevationGainM ?? 0))
        let startTime = (trip.departureTime?.isEmpty == false) ? trip.departureTime! : "08:30"
        let targetSpeedKmH = max(10.0, trip.route.targetSpeedKmH > 0 ? trip.route.targetSpeedKmH : 23.0)

        let rideDate: String
        if let stages = trip.stages, let idx = trip.activeStageIndex, idx >= 0 && idx < stages.count {
            rideDate = stages[idx].departureDate
        } else if let stages = trip.stages, !stages.isEmpty {
            rideDate = stages[0].departureDate
        } else if let dd = trip.departureDate, !dd.isEmpty {
            rideDate = dd
        } else {
            let fmt = DateFormatter()
            fmt.calendar = Calendar(identifier: .gregorian)
            fmt.timeZone = timeZone
            fmt.dateFormat = "yyyy-MM-dd"
            rideDate = fmt.string(from: now)
        }

        let phys = PhysicsEngine.calculatePhysics(
            physics: trip.physics,
            route: trip.route,
            weather: trip.weather,
            lang: lang,
            ftpOverride: riderSpecs?.ftpWatts,
            riderSpecs: riderSpecs ?? .defaultSpecs
        )
        let effectiveSpeed = max(10.0, phys.effectiveSpeedKmH > 0 ? phys.effectiveSpeedKmH : targetSpeedKmH)
        let rideHours = max(0.5, phys.movingTimeSeconds / 3600.0)

        let systemMassKg =
            (trip.physics.riderWeightKg > 0 ? trip.physics.riderWeightKg : (riderSpecs?.riderWeightKg ?? 72.0)) +
            (trip.physics.bikeWeightKg > 0 ? trip.physics.bikeWeightKg : (activeBike?.weightKg ?? 10.0)) +
            (trip.physics.luggageWeightKg ?? trip.physics.gearWeightKg)

        let pacingCurve: [PacingCurvePoint]?
        if let profile = trip.route.elevationProfile, profile.count >= 2 {
            pacingCurve = ClimbSplitsEngine.buildClimbAdjustedPacingCurve(
                profile,
                totalDistanceKm: distKm,
                avgFlatSpeedKmH: effectiveSpeed,
                totalMassKg: systemMassKg
            )
        } else {
            pacingCurve = nil
        }

        let finishEta = OverpassWaterGapEngine.calculateAmenityEtaDetails(
            departureTime: startTime,
            routeKm: distKm,
            effectiveSpeedKmH: effectiveSpeed,
            pacingCurve: pacingCurve
        )

        // Tyre pressure summary
        let surface: SurfaceBreakdown = trip.route.surfaceBreakdown ?? SurfaceProfileEngine.computeSurfaceBreakdown(
            origin: trip.route.origin,
            destination: trip.route.destination,
            gpxFileName: trip.route.gpxFileName,
            distanceKm: trip.route.distanceKm,
            elevationGainM: trip.route.elevationGainM,
            elevationProfile: trip.route.elevationProfile,
            coordinates: trip.route.coordinates,
            waypoints: trip.route.waypoints,
            crr: trip.physics.crr > 0 ? trip.physics.crr : activeBike?.crr,
            tireWidthMm: activeBike?.tireWidthMm ?? 38,
            isTubeless: activeBike?.isTubeless ?? true
        )
        let pressure = TyrePressureEngine.calculate(TyrePressureInput(
            systemMassKg: systemMassKg,
            tireWidthMm: activeBike?.tireWidthMm ?? 38,
            isTubeless: activeBike?.isTubeless ?? true,
            pavedPct: surface.pavedPct,
            gravelPct: surface.gravelPct,
            singletrackPct: surface.singletrackPct,
            bikeCategory: activeBike?.bikeCategory ?? .gravel,
            casingType: activeBike?.casingType ?? .standard,
            isHookless: activeBike?.isHookless ?? false
        ))
        let tyrePressureLine = riderSpecs?.pressureUnit == .psi
            ? "\(TyrePressureEngine.barToPsiValue(pressure.frontBar))/\(TyrePressureEngine.barToPsiValue(pressure.rearBar)) PSI"
            : "\(JSCompat.jsFixed(pressure.frontBar, decimals: 1))/\(JSCompat.jsFixed(pressure.rearBar, decimals: 1)) bar"

        // Hydration & Fuel rhythm line
        let bidonSizeMl = riderSpecs?.bidonSizeMl ?? 650
        let slots = riderSpecs?.frameBottleSlots ?? 2
        let hydration = NutritionEngine.calculateHydrationPlan(HydrationPlanParams(
            rideHours: rideHours,
            tempC: trip.weather.temperatureC,
            legWatts: phys.legWatts,
            bidonSizeMl: Double(bidonSizeMl),
            frameBottleSlots: slots
        ))
        let carbGPerHr = riderSpecs?.carbTargetGPerHr ?? 60
        let isLockedCarbTarget =
            riderSpecs?.carbPacingMode == "locked" ||
            (riderSpecs?.carbPacingMode != "auto" && riderSpecs?.riderLevel == .pro && carbGPerHr >= 60)
        let dynamicCarb = NutritionEngine.calculateIntensityModulatedCarbTarget(IntensityModulatedCarbTargetParams(
            rideHours: rideHours,
            pctFtp: phys.ftpPercent,
            carbOxidationGramPerHour: phys.carbOxidationGramPerHour,
            gutCeilingGPerHr: carbGPerHr,
            totalDays: max(1, trip.stages?.count ?? 1),
            activeChips: trip.customChips ?? [],
            isLockedCarbTarget: isLockedCarbTarget
        ))
        let effectiveCarbGPerHr = dynamicCarb.recommendedGPerHr
        let sipMin = trip.weather.temperatureC >= 24 ? 12 : 15
        let eatMin = effectiveCarbGPerHr >= 65 ? 20 : 25
        let isShortWaterOnly =
            (phys.movingTimeSeconds / 3600.0) < 0.75 &&
            max(1, trip.stages?.count ?? 1) == 1 &&
            !isLockedCarbTarget

        let fuelCueLine: String
        if isShortWaterOnly {
            fuelCueLine = isFr ? "1×\(bidonSizeMl) ml · Eau seule" : "1×\(bidonSizeMl) ml · Water only"
        } else {
            fuelCueLine = isFr
                ? "Manger /\(eatMin)m · Boire /\(sipMin)m · \(hydration.carriedOnFrameBidons)×\(bidonSizeMl)ml"
                : "Eat /\(eatMin)m · Sip /\(sipMin)m · \(hydration.carriedOnFrameBidons)×\(bidonSizeMl)ml"
        }

        let movingMinTotal = JSCompat.jsRoundInt(phys.movingTimeSeconds / 60.0)
        let movH = movingMinTotal / 60
        let movM = movingMinTotal % 60
        let movingLabel = movH > 0 ? "\(movH)h\(String(format: "%02d", movM))" : "\(movM) min"

        var middleRows: [StemStickerRow] = []

        // 1. Climbs
        if includeClimbs, elevGainM >= 150, let ep = trip.route.elevationProfile, ep.count >= 2 {
            let splits = ClimbSplitsEngine.computeClimbSplitsAndFueling(
                trip,
                physicsResult: phys,
                lang: lang,
                options: ClimbSplitsOptions(
                    ftpWatts: riderSpecs?.ftpWatts ?? 220,
                    carbTargetGPerHr: carbGPerHr,
                    carbPacingMode: riderSpecs?.carbPacingMode,
                    riderLevel: riderSpecs?.riderLevel,
                    nutritionPreference: riderSpecs?.nutritionPreference,
                    departureTimeHHMM: startTime
                )
            )
            for (idx, climb) in splits.climbs.prefix(5).enumerated() {
                let catTag = ClimbSplitsEngine.formatClimbCategoryLabel(climb.category, lang: lang)
                let climbEta = OverpassWaterGapEngine.calculateAmenityEtaDetails(
                    departureTime: startTime,
                    routeKm: climb.startKm,
                    effectiveSpeedKmH: effectiveSpeed,
                    pacingCurve: pacingCurve
                )
                middleRows.append(StemStickerRow(
                    id: "climb-\(idx)",
                    km: climb.startKm,
                    etaHHMM: climbEta.etaHHMM,
                    kind: "climb",
                    title: "\(catTag) · \(JSCompat.jsFixed(climb.lengthKm, decimals: 1)) km @ \(JSCompat.jsFixed(climb.avgGradePct, decimals: 1))%",
                    detail: "+\(climb.elevationGainM) m → km \(JSCompat.jsFixed(climb.endKm, decimals: 1))",
                    tag: "▲",
                    emphasis: climb.category == .hc || climb.category == .cat1 || climb.category == .cat2
                ))
            }
        }

        // 2. Stops & Water Gaps
        var mergedAmenities: [StageAmenity] = []
        var seenIds = Set<String>()
        for a in (trip.pinnedAmenities ?? []) + amenities {
            if seenIds.insert(a.id).inserted {
                mergedAmenities.append(a)
            }
        }
        let pinnedIds = Set((trip.pinnedAmenities ?? []).map { $0.id })

        if !mergedAmenities.isEmpty {
            let gaps = OverpassWaterGapEngine.calculateWaterGaps(
                amenities: mergedAmenities,
                totalDistanceKm: distKm,
                options: OverpassWaterGapEngine.WaterGapsOptions(
                    sectorSpeedKmH: effectiveSpeed,
                    targetFluidMlPerHr: Double(hydration.targetFluidMlPerHr),
                    bidonSizeMl: Double(bidonSizeMl),
                    frameBottleSlots: slots
                )
            )
            if let worstGap = gaps.criticalGaps.first ?? gaps.cautionGaps.first {
                middleRows.append(StemStickerRow(
                    id: "gap-\(JSCompat.jsToFixedNumber(worstGap.startKm, decimals: 1))",
                    km: worstGap.startKm,
                    kind: "warning",
                    title: isFr
                        ? "SEC \(JSCompat.jsFixed(worstGap.distanceKm, decimals: 0)) km (→ km \(JSCompat.jsFixed(worstGap.endKm, decimals: 0)))"
                        : "DRY \(JSCompat.jsFixed(worstGap.distanceKm, decimals: 0)) km (→ km \(JSCompat.jsFixed(worstGap.endKm, decimals: 0)))",
                    detail: isFr ? "Remplir tous les bidons" : "Fill all bottles here",
                    tag: "!",
                    emphasis: true
                ))
            }
        }

        var chosenFood: [StageAmenity] = []
        var chosenWater: [StageAmenity] = []
        if let sel = selectedAmenityIds {
            let allowedSet = Set(sel)
            let chosen = mergedAmenities.filter { allowedSet.contains($0.id) }.sorted { $0.routeKm < $1.routeKm }
            chosenFood = chosen.filter { $0.category == .food }
            chosenWater = chosen.filter { $0.category == .water || $0.category == .cemetery }
        } else {
            let foodCandidates = mergedAmenities
                .filter { $0.category == .food }
                .sorted { a, b in
                    let pa = pinnedIds.contains(a.id) ? 1 : 0
                    let pb = pinnedIds.contains(b.id) ? 1 : 0
                    if pa != pb { return pb < pa }
                    return a.routeKm < b.routeKm
                }
            var lastFoodKm = -999.0
            for a in foodCandidates {
                if pinnedIds.contains(a.id) || a.routeKm - lastFoodKm >= max(12.0, distKm / 4.0) {
                    chosenFood.append(a)
                    lastFoodKm = a.routeKm
                    if chosenFood.count >= 3 { break }
                }
            }

            let waterCandidates = mergedAmenities
                .filter { $0.category == .water || $0.category == .cemetery }
                .sorted { a, b in
                    let pa = pinnedIds.contains(a.id) ? 1 : 0
                    let pb = pinnedIds.contains(b.id) ? 1 : 0
                    if pa != pb { return pb < pa }
                    return a.routeKm < b.routeKm
                }
            var lastWaterKm = 0.0
            let waterSpacing = max(15.0, distKm / 3.5)
            for a in waterCandidates {
                if pinnedIds.contains(a.id) || (a.routeKm - lastWaterKm >= waterSpacing && distKm - a.routeKm >= 8.0) {
                    chosenWater.append(a)
                    lastWaterKm = a.routeKm
                    if chosenWater.count >= 3 { break }
                }
            }
        }

        for a in chosenFood {
            let eta = OverpassWaterGapEngine.calculateAmenityEtaDetails(
                departureTime: startTime,
                routeKm: a.routeKm,
                effectiveSpeedKmH: effectiveSpeed,
                pacingCurve: pacingCurve
            )
            let verdict = OpeningHoursParser.evaluateOpeningHoursAtArrival(
                openingHours: a.openingHours,
                targetDateStr: rideDate,
                arrivalTimeHHMM: eta.etaHHMM,
                lang: lang,
                timeZone: timeZone
            )
            let openNote: String?
            switch verdict?.status {
            case .open: openNote = isFr ? "Ouvert ✓" : "Open ✓"
            case .closed: openNote = isFr ? "Fermé ✗" : "Closed ✗"
            case .closingSoon: openNote = isFr ? "Ferme bientôt" : "Closing soon"
            default: openNote = nil
            }
            middleRows.append(StemStickerRow(
                id: "food-\(a.id)",
                km: a.routeKm,
                etaHHMM: eta.etaHHMM,
                kind: "bakery",
                title: String(a.name.prefix(22)),
                detail: openNote,
                tag: "☕",
                emphasis: verdict?.status == .closed
            ))
        }

        for a in chosenWater {
            let eta = OverpassWaterGapEngine.calculateAmenityEtaDetails(
                departureTime: startTime,
                routeKm: a.routeKm,
                effectiveSpeedKmH: effectiveSpeed,
                pacingCurve: pacingCurve
            )
            middleRows.append(StemStickerRow(
                id: "water-\(a.id)",
                km: a.routeKm,
                etaHHMM: eta.etaHHMM,
                kind: "water",
                title: String(a.name.prefix(22)),
                detail: a.category == .cemetery
                    ? (isFr ? "Robinet cimetière" : "Cemetery tap")
                    : (isFr ? "Point d’eau" : "Water tap"),
                tag: "💧"
            ))
        }

        // 3. Custom rider notes
        for note in customNotes {
            let eta = OverpassWaterGapEngine.calculateAmenityEtaDetails(
                departureTime: startTime,
                routeKm: note.km,
                effectiveSpeedKmH: effectiveSpeed,
                pacingCurve: pacingCurve
            )
            middleRows.append(StemStickerRow(
                id: "custom-\(note.id)",
                km: note.km,
                etaHHMM: eta.etaHHMM,
                kind: "custom",
                title: String(note.label.prefix(26)),
                tag: "★",
                emphasis: true
            ))
        }

        // 4. Optional periodic snack & bottle checkpoint reminders
        if includeFuelCues && rideHours >= 1.25 && middleRows.count < preset.maxRows - 3 {
            let stepKm = distKm >= 120 ? 30 : (distKm >= 70 ? 25 : 20)
            var km = stepKm
            while Double(km) < distKm - 8.0 {
                let hasNearby = middleRows.contains { abs($0.km - Double(km)) < 5.0 }
                if !hasNearby {
                    let eta = OverpassWaterGapEngine.calculateAmenityEtaDetails(
                        departureTime: startTime,
                        routeKm: Double(km),
                        effectiveSpeedKmH: effectiveSpeed,
                        pacingCurve: pacingCurve
                    )
                    middleRows.append(StemStickerRow(
                        id: "fuel-\(km)",
                        km: Double(km),
                        etaHHMM: eta.etaHHMM,
                        kind: "fuel",
                        title: isFr ? "Manger & boire" : "Eat snack & sip water",
                        tag: "●"
                    ))
                }
                km += stepKm
            }
        }

        let sortedMiddle = Array(middleRows.sorted { $0.km < $1.km }.prefix(max(2, preset.maxRows - 2)))

        let rows: [StemStickerRow] = [
            StemStickerRow(
                id: "start",
                km: 0,
                etaHHMM: startTime,
                kind: "start",
                title: String((trip.route.origin?.isEmpty == false ? trip.route.origin! : (isFr ? "Départ" : "Roll out")).prefix(22)),
                tag: "GO"
            )
        ] + sortedMiddle + [
            StemStickerRow(
                id: "finish",
                km: JSCompat.jsToFixedNumber(distKm, decimals: 1),
                etaHHMM: finishEta.etaHHMM,
                kind: "finish",
                title: String((trip.route.destination?.isEmpty == false ? trip.route.destination! : (isFr ? "Arrivée" : "Finish")).prefix(22)),
                tag: "FIN"
            )
        ]

        return StemStickerData(
            title: trip.name.isEmpty ? (isFr ? "Ma sortie vélo" : "My Bike Ride") : trip.name,
            subtitle: "\(JSCompat.jsFixed(distKm, decimals: 1)) km · +\(elevGainM) m · \(movingLabel)",
            distanceKm: distKm,
            elevationGainM: elevGainM,
            startTime: startTime,
            finishHHMM: finishEta.etaHHMM,
            movingLabel: movingLabel,
            fuelCueLine: fuelCueLine,
            tyrePressureLine: tyrePressureLine,
            rows: rows
        )
    }
}
