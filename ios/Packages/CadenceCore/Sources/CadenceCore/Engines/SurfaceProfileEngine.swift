import Foundation

public enum SurfaceProfileEngine {
    public static let defaultCorridorCoords: [LatLon] = [
        LatLon(lat: 47.2184, lon: -1.5536),
        LatLon(lat: 47.205, lon: -1.6),
        LatLon(lat: 47.235, lon: -1.72),
        LatLon(lat: 47.25, lon: -1.86),
        LatLon(lat: 47.28, lon: -2.05),
        LatLon(lat: 47.273, lon: -2.18),
        LatLon(lat: 47.284, lon: -2.208)
    ]

    private struct SectorBlueprint {
        var type: SurfaceType
        var sharePct: Double
        var nameEn: String
        var nameFr: String
        var surfaceDetailEn: String
        var surfaceDetailFr: String
        var technicality: SectorTechnicality
        var suitability38c: String
        var riderNoteEn: String
        var riderNoteFr: String
    }

    private static func haversineKm(_ a: LatLon, _ b: LatLon) -> Double {
        let R = 6371.0
        let dLat = JSCompat.toRad(b.lat - a.lat)
        let dLon = JSCompat.toRad(b.lon - a.lon)
        let lat1 = JSCompat.toRad(a.lat)
        let lat2 = JSCompat.toRad(b.lat)
        let sinDLat = sin(dLat / 2.0)
        let sinDLon = sin(dLon / 2.0)
        let h = sinDLat * sinDLat + cos(lat1) * cos(lat2) * sinDLon * sinDLon
        return 2.0 * R * asin(min(1.0, sqrt(h)))
    }

    public static func densifyRouteCoordinates(
        _ coords: [LatLon]?,
        minPoints: Int = 64
    ) -> [LatLon] {
        let source = (coords != nil && coords!.count >= 2) ? coords! : defaultCorridorCoords
        if source.count >= minPoints { return source }

        var segDists: [Double] = []
        var totalLen = 0.0
        for i in 1..<source.count {
            let d = max(0.001, haversineKm(source[i - 1], source[i]))
            segDists.append(d)
            totalLen += d
        }
        if totalLen <= 0 { return source }

        var result: [LatLon] = []
        for i in 0..<(source.count - 1) {
            let start = source[i]
            let end = source[i + 1]
            let share = segDists[i] / totalLen
            let steps = max(2, JSCompat.jsRoundInt(share * Double(minPoints)))
            for s in 0..<steps {
                let t = Double(s) / Double(steps)
                result.append(LatLon(
                    lat: JSCompat.roundTo(start.lat + (end.lat - start.lat) * t, decimals: 6),
                    lon: JSCompat.roundTo(start.lon + (end.lon - start.lon) * t, decimals: 6)
                ))
            }
        }
        result.append(source[source.count - 1])
        return result
    }

    private static func selectSectorBlueprints(
        origin: String?,
        destination: String?,
        gpxFileName: String?,
        waypoints: [RouteWaypoint]?,
        customChips: [String] = []
    ) -> [SectorBlueprint] {
        let wpNames = (waypoints ?? []).map { $0.name }
        let hay = ([origin ?? "", destination ?? "", gpxFileName ?? ""] + wpNames)
            .joined(separator: " ")
            .lowercased()

        let hasGravelChip = customChips.contains("gravel-trail-master") || customChips.contains("off-road-exploration")
        let hasBikepackingChip = customChips.contains("bivouac-camp") || customChips.contains("mountain-adventure")

        if hay.contains("brière") || hay.contains("briere") || hay.contains("kerhinet") {
            return [
                SectorBlueprint(type: .paved, sharePct: 18, nameEn: "Saint-Nazaire Rollout & Marsh Approach", nameFr: "Sortie de Saint-Nazaire & Approche Brière", surfaceDetailEn: "Smooth regional cycleway & quiet backroads", surfaceDetailFr: "Piste cyclable lisse & petites routes de marais", technicality: .smooth, suitability38c: "ideal", riderNoteEn: "Fast warm-up tarmac before entering the marsh tracks.", riderNoteFr: "Bitume roulant idéal pour s’échauffer avant les marais."),
                SectorBlueprint(type: .gravel, sharePct: 24, nameEn: "Chaussée de Rozé & White Shell Causeway", nameFr: "Chaussée de Rozé & Chemin Blanc des Chalandiers", surfaceDetailEn: "Compacted limestone & crushed oyster-shell doubletrack", surfaceDetailFr: "Calcaire compacté & chemin blanc coquillier", technicality: .smooth, suitability38c: "ideal", riderNoteEn: "Prime 38c territory — firm, flat, and reassuringly wide.", riderNoteFr: "Terrain rêvé en 38c : ferme, plat et très rassurant."),
                SectorBlueprint(type: .singletrack, sharePct: 12, nameEn: "Kerhinet Reedbed & Oak Singletrack", nameFr: "Sentier Monotrace de Kerhinet & Chênaie", surfaceDetailEn: "Narrow packed-earth trail with exposed tree roots & ruts", surfaceDetailFr: "Sentier étroit en terre battue avec racines affleurantes", technicality: .technical, suitability38c: "caution", riderNoteEn: "Watch line choice on 38c tires — unweight the front wheel over roots.", riderNoteFr: "Vigilance en 38c : soulagez la roue avant sur les racines."),
                SectorBlueprint(type: .paved, sharePct: 16, nameEn: "Saint-Lyphard Thatch Village Connector", nameFr: "Liaison Village de Chaumières (Saint-Lyphard)", surfaceDetailEn: "Quiet country lane with clean tarmac", surfaceDetailFr: "Petite route communale au bitume propre", technicality: .smooth, suitability38c: "ideal", riderNoteEn: "Smooth recovery section between off-road sectors.", riderNoteFr: "Portion bitumée reposante entre deux secteurs gravel."),
                SectorBlueprint(type: .gravel, sharePct: 16, nameEn: "Île de Fédrun Perimeter Track", nameFr: "Chemin de Ronde de l’Île de Fédrun", surfaceDetailEn: "Fine gravel & grassy meadow track", surfaceDetailFr: "Gravier fin & chemin de prairie", technicality: .moderate, suitability38c: "capable", riderNoteEn: "Slightly softer after rain — keep steady seated cadence on 38c.", riderNoteFr: "Un peu souple après la pluie — pédalez souple assis en 38c."),
                SectorBlueprint(type: .paved, sharePct: 14, nameEn: "Estuary Return Boulevard", nameFr: "Retour Voie Vélo Estuaire", surfaceDetailEn: "Dedicated cycle path back to finish", surfaceDetailFr: "Voie verte bitumée jusqu’à l’arrivée", technicality: .smooth, suitability38c: "ideal", riderNoteEn: "Easy spin home on smooth cycleway.", riderNoteFr: "Retour fluide sur piste cyclable.")
            ]
        }

        if hay.contains("redon") && (hay.contains("canal") || hay.contains("blain")) {
            return [
                SectorBlueprint(type: .paved, sharePct: 24, nameEn: "Erdre Valley Paved Greenway", nameFr: "Voie Verte Bitumée de la Vallée de l’Erdre", surfaceDetailEn: "Smooth riverside asphalt cycleway", surfaceDetailFr: "Enrobé lisse le long de l’Erdre", technicality: .smooth, suitability38c: "ideal", riderNoteEn: "Effortless rolling on sheltered cycle path.", riderNoteFr: "Rendement optimal sur voie verte abritée."),
                SectorBlueprint(type: .gravel, sharePct: 22, nameEn: "Quiheix to Blain Historic Towpath", nameFr: "Chemin de Halage Historique (Quiheix – Blain)", surfaceDetailEn: "Stabilized fine quarry sand & compacted gravel", surfaceDetailFr: "Sable de carrière stabilisé & gravier compacté", technicality: .smooth, suitability38c: "ideal", riderNoteEn: "Zero anxiety for 38c tires — flat, car-free, and predictable.", riderNoteFr: "Zéro stress en 38c : plat, sans voitures et très régulier."),
                SectorBlueprint(type: .paved, sharePct: 18, nameEn: "Château de Blain & Lock Crossings", nameFr: "Traversée de Blain & Passerelles d’Écluses", surfaceDetailEn: "Paved lock aprons & quiet village roads", surfaceDetailFr: "Abords d’écluses bitumés & petites routes", technicality: .smooth, suitability38c: "ideal", riderNoteEn: "Clean tarmac with gentle lock-bridge ramps.", riderNoteFr: "Bitume propre avec petites rampes de ponts d’écluses."),
                SectorBlueprint(type: .singletrack, sharePct: 6, nameEn: "Forêt du Gâvre Woodland Detour", nameFr: "Sentier Forestier du Gâvre", surfaceDetailEn: "Forest singletrack with pine needles & scattered stones", surfaceDetailFr: "Sentier sous-bois avec aiguilles de pin & pierres", technicality: .moderate, suitability38c: "capable", riderNoteEn: "Narrow forest path — keep two fingers on the brakes on 38c.", riderNoteFr: "Sentier étroit en sous-bois — gardez deux doigts sur les freins."),
                SectorBlueprint(type: .gravel, sharePct: 16, nameEn: "Oust Confluence Gravel Halage", nameFr: "Halage Gravel de la Confluence de l’Oust", surfaceDetailEn: "Rolled limestone towpath into Redon", surfaceDetailFr: "Chemin de halage en calcaire roulé vers Redon", technicality: .smooth, suitability38c: "ideal", riderNoteEn: "Fast, scenic gravel glide into Redon basin.", riderNoteFr: "Glisse fluide sur gravier roulant jusqu’au bassin de Redon."),
                SectorBlueprint(type: .paved, sharePct: 14, nameEn: "Redon Port & Station Approach", nameFr: "Approche Port & Gare de Redon", surfaceDetailEn: "Urban cycle lanes & dockside cobblestones", surfaceDetailFr: "Bandes cyclables urbaines & quais aménagés", technicality: .smooth, suitability38c: "ideal", riderNoteEn: "Smooth final approach to port and train hub.", riderNoteFr: "Approche finale aisée vers le port et la gare.")
            ]
        }

        if hay.contains("vercors") || hay.contains("drôme") || hay.contains("drome") || hay.contains("die") || hay.contains("roussillon") {
            return [
                SectorBlueprint(type: .paved, sharePct: 30, nameEn: "Valence to Crest Valley Warmup", nameFr: "Vallée de la Drôme (Valence – Crest)", surfaceDetailEn: "Secondary departmental road with grippy tarmac", surfaceDetailFr: "Route départementale secondaire au bitume adhérent", technicality: .smooth, suitability38c: "ideal", riderNoteEn: "38c tires roll smoothly here while saving energy for the climbs.", riderNoteFr: "Les pneus 38c filtrent les vibrations avant les cols."),
                SectorBlueprint(type: .gravel, sharePct: 16, nameEn: "Drôme Riverbank Limestone Track", nameFr: "Piste Calcaire des Berges de la Drôme", surfaceDetailEn: "Coarse white river gravel & farm track", surfaceDetailFr: "Gravier blanc de rivière & piste agricole", technicality: .moderate, suitability38c: "capable", riderNoteEn: "Chunkier stones in spots — lower pressure to ~2.4 bar helps 38c grip.", riderNoteFr: "Graviers plus gros par endroits — ~2,4 bar améliore le grip en 38c."),
                SectorBlueprint(type: .paved, sharePct: 32, nameEn: "Col de Rousset Foothill Switchbacks", nameFr: "Lacets d’Approche du Vercors", surfaceDetailEn: "Mountain tarmac climb & sweeping descent", surfaceDetailFr: "Ascension sur bitume de montagne & lacets", technicality: .smooth, suitability38c: "ideal", riderNoteEn: "38c width gives extra cornering confidence on alpine descents.", riderNoteFr: "La section 38c sécurise les trajectoires en descente."),
                SectorBlueprint(type: .singletrack, sharePct: 12, nameEn: "Plateau du Vercors Rocky Traverse", nameFr: "Traversée Rocailleuse du Plateau du Vercors", surfaceDetailEn: "Rocky alpine trail with loose limestone slabs", surfaceDetailFr: "Sentier d’altitude avec dalles calcaires et pierres mobiles", technicality: .technical, suitability38c: "caution", riderNoteEn: "Technical for 38c entry-level gravel — take it slow or walk rocky steps.", riderNoteFr: "Technique pour du 38c : réduisez l’allure sur les marches rocheuses."),
                SectorBlueprint(type: .gravel, sharePct: 10, nameEn: "High Meadow Forest Fire Road", nameFr: "Piste Forestière des Hauts Plateaux", surfaceDetailEn: "Packed forest dirt & fine gravel", surfaceDetailFr: "Terre forestière battue & gravier fin", technicality: .smooth, suitability38c: "ideal", riderNoteEn: "Wide forest track with forgiving grip.", riderNoteFr: "Piste forestière large et très tolérante.")
            ]
        }

        let hasOffroadKeyword =
            hay.contains("gravel") || hay.contains("trail") || hay.contains("chemin") ||
            hay.contains("forêt") || hay.contains("foret") || hay.contains("forest") ||
            hay.contains("halage") || hay.contains("towpath") || hay.contains("vtt") ||
            hay.contains("mtb") || hay.contains("dirt")

        if !hasGravelChip && !hasBikepackingChip && !hasOffroadKeyword {
            return [
                SectorBlueprint(
                    type: .paved,
                    sharePct: 100,
                    nameEn: "(Estimated) Paved Road Corridor",
                    nameFr: "(Estimé) Parcours Routier Bitumé",
                    surfaceDetailEn: "Estimated paved road — sync OSM surface data for exact sector breakdown",
                    surfaceDetailFr: "Bitume estimé — chargez la surface OSM pour le détail exact par secteur",
                    technicality: .smooth,
                    suitability38c: "ideal",
                    riderNoteEn: "Paved baseline assumed until live OpenStreetMap surface tags load.",
                    riderNoteFr: "Hypothèse bitume retenue en attendant les données OpenStreetMap."
                )
            ]
        }

        let gravelBoost: Double = hasGravelChip ? 12 : (hasBikepackingChip ? 6 : 0)
        let singletrackBoost: Double = hasGravelChip ? 4 : (hasBikepackingChip ? 2 : 0)

        let s1Paved = max(12.0, 28.0 - JSCompat.jsRound(gravelBoost * 0.5))
        let s2Gravel = 14.0 + JSCompat.jsRound(gravelBoost * 0.6)
        let s3Paved = max(12.0, 26.0 - JSCompat.jsRound((gravelBoost + singletrackBoost) * 0.5))
        let s4Singletrack = 6.0 + singletrackBoost
        let s5Gravel = 8.0 + JSCompat.jsRound(gravelBoost * 0.4)
        let s6Paved = max(10.0, 100.0 - (s1Paved + s2Gravel + s3Paved + s4Singletrack + s5Gravel))

        return [
            SectorBlueprint(type: .paved, sharePct: s1Paved, nameEn: "(Estimated) Urban Exit & Cycleway Rollout", nameFr: "(Estimé) Sortie Urbaine & Voie Cyclable", surfaceDetailEn: "Smooth asphalt cycle track & quiet collector road", surfaceDetailFr: "Piste cyclable bitumée & route secondaire fluide", technicality: .smooth, suitability38c: "ideal", riderNoteEn: "Smooth, fast tarmac — easy warm-up for 38 mm tires.", riderNoteFr: "Bitume lisse et roulant — mise en jambes idéale en 38 mm."),
            SectorBlueprint(type: .gravel, sharePct: s2Gravel, nameEn: "(Estimated) Compacted Unpaved Stretch", nameFr: "(Estimé) Chemin Stabilisé & Gravel", surfaceDetailEn: "Stabilized white limestone gravel (Voie Verte)", surfaceDetailFr: "Calcaire blanc stabilisé & gravier fin roulé", technicality: .smooth, suitability38c: "ideal", riderNoteEn: "Ideal for 38c entry-level gravel — firm surface with zero loose ruts.", riderNoteFr: "Idéal pour débuter en gravel 38c : sol ferme sans ornières."),
            SectorBlueprint(type: .paved, sharePct: s3Paved, nameEn: "(Estimated) Rural Lane Transition", nameFr: "(Estimé) Liaison Petites Routes Rurales", surfaceDetailEn: "Low-traffic rural tarmac with gentle rollers", surfaceDetailFr: "Petites routes de campagne à faible trafic", technicality: .smooth, suitability38c: "ideal", riderNoteEn: "Quiet paved sector connecting the two unpaved stretches.", riderNoteFr: "Portion bitumée calme reliant les deux secteurs non-revêtus."),
            SectorBlueprint(type: .singletrack, sharePct: s4Singletrack, nameEn: "(Estimated) Narrow Trail Section", nameFr: "(Estimé) Sentier Monotrace", surfaceDetailEn: "Narrow dirt path with tree roots & occasional stones", surfaceDetailFr: "Sentier étroit en terre avec quelques racines et pierres", technicality: .technical, suitability38c: "caution", riderNoteEn: "Most technical sector of the ride — relax your elbows & pick a clean line on 38c.", riderNoteFr: "Secteur le plus technique : fléchissez les coudes et soignez vos trajectoires en 38c."),
            SectorBlueprint(type: .gravel, sharePct: s5Gravel, nameEn: "(Estimated) Secondary Gravel Track", nameFr: "(Estimé) Piste Gravel Secondaire", surfaceDetailEn: "Fine crushed gravel with slight washboard texture", surfaceDetailFr: "Gravier concassé fin avec léger grain", technicality: .moderate, suitability38c: "capable", riderNoteEn: "38c tires handle this well — stay seated on any short rises for rear traction.", riderNoteFr: "Très bien géré en 38c — restez assis dans les relances pour garder l’adhérence."),
            SectorBlueprint(type: .paved, sharePct: s6Paved, nameEn: "(Estimated) Final Destination Approach", nameFr: "(Estimé) Approche Finale Bitumée", surfaceDetailEn: "Protected bike lane & smooth boulevard tarmac", surfaceDetailFr: "Bande cyclable protégée & bitume lisse jusqu’à l’arrivée", technicality: .smooth, suitability38c: "ideal", riderNoteEn: "Clean paved finish all the way to destination.", riderNoteFr: "Fin de parcours 100 % bitumée jusqu’à destination.")
        ]
    }

    public static func inferTireWidthMm(crr: Double? = nil, explicitWidthMm: Double? = nil) -> Double {
        if let explicit = explicitWidthMm, explicit >= 23, explicit <= 60 {
            return explicit
        }
        if let crr = crr, crr.isFinite {
            if crr <= 0.0045 { return 28 }
            if crr <= 0.0062 { return 38 }
            return 42
        }
        return 38
    }

    public static func computeSurfaceBreakdown(
        origin: String? = nil,
        destination: String? = nil,
        gpxFileName: String? = nil,
        distanceKm: Double = 22,
        elevationGainM: Double? = nil,
        elevationProfile: [ElevationProfilePoint]? = nil,
        coordinates: [LatLon]? = nil,
        waypoints: [RouteWaypoint]? = nil,
        crr: Double? = nil,
        tireWidthMm explicitTireWidthMm: Double? = nil,
        isTubeless explicitTubeless: Bool? = nil,
        riderWeightKg: Double? = nil,
        bikeWeightKg: Double? = nil,
        luggageWeightKg: Double? = nil,
        customChips: [String] = [],
        riderSpecs: RiderBikeSpecs = .defaultSpecs
    ) -> SurfaceBreakdown {
        let activeBike = riderSpecs.bikes.first(where: { $0.id == riderSpecs.activeBikeId }) ?? riderSpecs.bikes.first
        let effectiveCrr = crr ?? activeBike?.crr ?? 0.0055
        let tireWidthMm = inferTireWidthMm(crr: effectiveCrr, explicitWidthMm: explicitTireWidthMm ?? activeBike?.tireWidthMm)
        let isTubeless = explicitTubeless ?? activeBike?.isTubeless ?? true
        let systemMassKg = (riderWeightKg ?? riderSpecs.riderWeightKg) +
            (bikeWeightKg ?? activeBike?.weightKg ?? 10.9) +
            (luggageWeightKg ?? 2.0)

        let totalDistKm = max(0.1, distanceKm > 0 ? distanceKm : 22.0)
        let profilePoints = elevationProfile ?? []

        let denseCoords = densifyRouteCoordinates(coordinates, minPoints: 72)
        let blueprints = selectSectorBlueprints(
            origin: origin,
            destination: destination,
            gpxFileName: gpxFileName,
            waypoints: waypoints,
            customChips: customChips
        )
        let rawTotalShare = blueprints.reduce(0.0) { $0 + $1.sharePct }
        let safeTotalShare = rawTotalShare > 0 ? rawTotalShare : 100.0

        var cursorPct = 0.0
        let segments: [SurfaceSegment] = blueprints.enumerated().map { idx, bp in
            let isLast = idx == blueprints.count - 1
            let normShare = (bp.sharePct / safeTotalShare) * 100.0
            let startPct = cursorPct
            let endPct = isLast ? 100.0 : min(100.0, cursorPct + normShare)
            cursorPct = endPct

            let startKm = JSCompat.roundTo((startPct / 100.0) * totalDistKm, decimals: 1)
            let endKm = JSCompat.roundTo((endPct / 100.0) * totalDistKm, decimals: 1)
            let segDistKm = JSCompat.roundTo(max(0.2, endKm - startKm), decimals: 1)

            let maxIdx = denseCoords.count - 1
            let startCoordIdx = min(maxIdx, max(0, Int(floor((startPct / 100.0) * Double(maxIdx)))))
            let endCoordIdx = isLast
                ? maxIdx
                : min(maxIdx, max(startCoordIdx + 1, JSCompat.jsRoundInt((endPct / 100.0) * Double(maxIdx))))

            let segCoords = Array(denseCoords[startCoordIdx...endCoordIdx])
            let matchingPoints = profilePoints.filter { pt in
                let ptPct = totalDistKm > 0 ? (pt.distKm / totalDistKm) * 100.0 : 0.0
                return ptPct >= startPct - 1.0 && ptPct <= endPct + 1.0
            }

            let grades = matchingPoints.isEmpty ? [1.2] : matchingPoints.map { abs($0.gradePct) }
            let avgGradePct = JSCompat.roundTo(grades.reduce(0.0, +) / Double(grades.count), decimals: 1)
            let maxGradePct = JSCompat.roundTo(max(1.5, grades.max() ?? 1.5), decimals: 1)

            let segCrr: Double
            switch bp.type {
            case .paved: segCrr = 0.0042
            case .gravel: segCrr = 0.0064
            case .singletrack: segCrr = 0.0096
            }

            return SurfaceSegment(
                id: "surf-seg-\(idx + 1)",
                type: bp.type,
                startKm: startKm,
                endKm: endKm,
                distanceKm: segDistKm,
                startPct: JSCompat.jsRound(startPct),
                endPct: JSCompat.jsRound(endPct),
                startCoordIdx: startCoordIdx,
                endCoordIdx: endCoordIdx,
                coordinates: segCoords.count >= 2 ? segCoords : [denseCoords[0], denseCoords[denseCoords.count - 1]],
                nameEn: bp.nameEn,
                nameFr: bp.nameFr,
                surfaceDetailEn: bp.surfaceDetailEn,
                surfaceDetailFr: bp.surfaceDetailFr,
                avgGradePct: avgGradePct,
                maxGradePct: maxGradePct,
                effectiveCrr: segCrr,
                technicality: bp.technicality,
                suitability38c: bp.suitability38c,
                riderNoteEn: bp.riderNoteEn,
                riderNoteFr: bp.riderNoteFr,
                osmWayIds: nil,
                osmHighway: nil,
                osmSurfaceTag: nil,
                osmTrackType: nil,
                osmSmoothness: nil,
                osmMtbScale: nil,
                osmSacScale: nil,
                osmName: nil,
                osmRef: nil,
                isInferredFromHighway: nil
            )
        }

        let segLenSum = segments.reduce(0.0) { $0 + max(0.05, $1.endKm - $1.startKm) }
        let actualSegTotalKm = segLenSum > 0 ? segLenSum : totalDistKm

        var rawGravel = 0.0
        var rawSingle = 0.0
        var weightedCrrSum = 0.0

        for s in segments {
            let segLen = max(0.05, s.endKm - s.startKm)
            let pctSpan = (segLen / actualSegTotalKm) * 100.0
            weightedCrrSum += s.effectiveCrr * (segLen / actualSegTotalKm)
            switch s.type {
            case .paved: break
            case .gravel: rawGravel += pctSpan
            case .singletrack: rawSingle += pctSpan
            }
        }

        var singletrackPct = max(0.0, JSCompat.jsRound(rawSingle))
        let gravelPct = max(0.0, JSCompat.jsRound(rawGravel))
        if singletrackPct + gravelPct > 100 {
            singletrackPct = max(0.0, 100.0 - gravelPct)
        }
        let pavedPct = max(0.0, 100.0 - gravelPct - singletrackPct)

        let pavedKm = JSCompat.roundTo((pavedPct / 100.0) * totalDistKm, decimals: 1)
        let gravelKm = JSCompat.roundTo((gravelPct / 100.0) * totalDistKm, decimals: 1)
        let singletrackKm = JSCompat.roundTo(max(0.0, totalDistKm - pavedKm - gravelKm), decimals: 1)
        let weightedCrr = JSCompat.roundTo(weightedCrrSum, decimals: 4)

        let sampleCount = profilePoints.isEmpty ? 49 : profilePoints.count
        let pointSurfaces: [SurfaceType] = (0..<sampleCount).map { i in
            let km = !profilePoints.isEmpty
                ? profilePoints[i].distKm
                : (Double(i) / Double(max(1, sampleCount - 1))) * totalDistKm
            let found = segments.first(where: { km >= $0.startKm - 0.05 && km <= $0.endKm + 0.05 }) ?? segments.last
            return found?.type ?? .paved
        }

        let unpavedRatio = (gravelPct + singletrackPct) / 100.0
        let tyrePressure = TyrePressureEngine.calculate(TyrePressureInput(
            systemMassKg: systemMassKg,
            tireWidthMm: tireWidthMm,
            isTubeless: isTubeless,
            pavedPct: pavedPct,
            gravelPct: gravelPct,
            singletrackPct: singletrackPct,
            gearWeightKg: luggageWeightKg ?? 2,
            bikeCategory: activeBike?.bikeCategory,
            casingType: activeBike?.casingType,
            isHookless: activeBike?.isHookless,
            bikeName: activeBike?.name
        ))

        let recommendedFrontBar = tyrePressure.frontBar
        let recommendedRearBar = tyrePressure.rearBar
        let pressureUnit = riderSpecs.pressureUnit ?? .bar
        let pressureLabelEn = TyrePressureEngine.formatPair(
            frontBar: recommendedFrontBar, rearBar: recommendedRearBar, unit: pressureUnit, lang: .en
        )
        let pressureLabelFr = TyrePressureEngine.formatPair(
            frontBar: recommendedFrontBar, rearBar: recommendedRearBar, unit: pressureUnit, lang: .fr
        )

        let unpavedSegments = segments.filter { $0.type != .paved }
        let technicalSegments = segments.filter { $0.technicality == .technical || $0.suitability38c == "caution" }
        let maxUnpavedStretchKm = unpavedSegments.isEmpty
            ? 0.0
            : JSCompat.roundTo(unpavedSegments.map(\.distanceKm).max() ?? 0.0, decimals: 1)

        var overallLevel: GravelSuitabilityLevel = .ideal
        var scorePct = 95.0

        if tireWidthMm <= 30 && unpavedRatio > 0.15 {
            overallLevel = .technicalCaution
            scorePct = 58
        } else if singletrackPct >= 10 || !technicalSegments.isEmpty {
            overallLevel = (singletrackPct >= 12 || technicalSegments.count >= 3) ? .technicalCaution : .goodWithCare
            scorePct = overallLevel == .technicalCaution ? 76 : 88
        } else {
            overallLevel = .ideal
            scorePct = (unpavedRatio == 0 && tireWidthMm <= 30) ? 98 : 95
        }

        let firstTech = technicalSegments.first ?? unpavedSegments.first
        let techRangeStr = firstTech.map { "km \(formatJSNumber($0.startKm))–\(formatJSNumber($0.endKm))" } ?? ""
        let watchCount = !technicalSegments.isEmpty ? technicalSegments.count : unpavedSegments.count

        let wStr = formatJSNumber(tireWidthMm)
        let pavedStr = formatJSNumber(pavedPct)
        let gravelStr = formatJSNumber(gravelPct)
        let singleStr = formatJSNumber(singletrackPct)
        let gravelKmStr = formatJSNumber(gravelKm)
        let singleKmStr = formatJSNumber(singletrackKm)
        let unpavedTotalStr = formatJSNumber(gravelPct + singletrackPct)
        let smoothTotalStr = formatJSNumber(pavedPct + gravelPct)

        var headlineEn = "Ideal for \(wStr)c Gravel Setup"
        var headlineFr = "Idéal pour montage Gravel \(wStr)c"
        var summaryEn = (gravelPct + singletrackPct == 0)
            ? "100% paved route rolls fast and effortlessly on \(wStr)c tires (\(pressureLabelEn))."
            : "\(pavedStr)% paved and \(gravelStr)% compacted gravel roll smoothly on \(wStr)c tires (\(pressureLabelEn))."
        var summaryFr = (gravelPct + singletrackPct == 0)
            ? "Parcours 100 % bitumé très fluide en pneus \(wStr)c (\(pressureLabelFr))."
            : "\(pavedStr) % de bitume et \(gravelStr) % de chemin compacté passent avec fluidité en pneus \(wStr)c (\(pressureLabelFr))."

        if tireWidthMm <= 30 && unpavedRatio > 0.15 {
            headlineEn = "Caution on \(wStr)c Road Slicks · 38c+ Gravel Tires Advised"
            headlineFr = "Attention en pneus route \(wStr)c · Pneus Gravel 38c+ conseillés"
            summaryEn = "\(unpavedTotalStr)% of this route is unpaved (\(unpavedSegments.count) sectors). Switch to 38c gravel tires for puncture protection and grip."
            summaryFr = "\(unpavedTotalStr) % du parcours est non-revêtu (\(unpavedSegments.count) secteurs). Privilégiez des pneus gravel 38c pour l’adhérence et éviter les crevaisons."
        } else if overallLevel == .goodWithCare {
            headlineEn = "Great for \(wStr)c Gravel · \(watchCount) Trail Sector\(watchCount > 1 ? "s" : "") to Watch (\(techRangeStr))"
            headlineFr = "Adapté au Gravel \(wStr)c · \(watchCount) secteur\(watchCount > 1 ? "s" : "") à surveiller (\(techRangeStr))"
            summaryEn = "Gravel sectors (\(gravelKmStr) km) are confidence-inspiring on \(wStr)c tires. Ease off slightly on natural trail sectors (\(techRangeStr)) for clean line choice."
            summaryFr = "Les secteurs gravel (\(gravelKmStr) km) sont rassurants en \(wStr)c. Réduisez simplement l’allure sur les passages naturels (\(techRangeStr)) pour choisir une belle trace."
        } else if overallLevel == .technicalCaution {
            headlineEn = "Technical Trail Sectors (\(singleStr)%) · Line Care Needed on \(wStr)c"
            headlineFr = "Sentiers techniques (\(singleStr) %) · Vigilance requise en \(wStr)c"
            summaryEn = "While \(smoothTotalStr)% is smoother tarmac & gravel, \(singleKmStr) km (\(techRangeStr)) features uneven trail. Run \(pressureLabelEn) and stay light on the bars."
            summaryFr = "Si \(smoothTotalStr) % du tracé est roulant, \(singleKmStr) km (\(techRangeStr)) empruntent un sentier irrégulier. Gonflez à \(pressureLabelFr) et relâchez les bras."
        }

        let suitability = GravelSuitabilityAssessment(
            overallLevel: overallLevel,
            scorePct: scorePct,
            tireWidthMm: tireWidthMm,
            isTubeless: isTubeless,
            recommendedFrontBar: recommendedFrontBar,
            recommendedRearBar: recommendedRearBar,
            frontLoadPct: Double(tyrePressure.frontLoadPct),
            rearLoadPct: Double(tyrePressure.rearLoadPct),
            hooklessCapped: tyrePressure.hooklessCapped,
            headlineEn: headlineEn,
            headlineFr: headlineFr,
            summaryEn: summaryEn,
            summaryFr: summaryFr,
            unpavedCount: unpavedSegments.count,
            technicalCount: technicalSegments.count,
            maxUnpavedStretchKm: maxUnpavedStretchKm
        )

        return SurfaceBreakdown(
            pavedPct: pavedPct,
            gravelPct: gravelPct,
            singletrackPct: singletrackPct,
            pavedKm: pavedKm,
            gravelKm: gravelKm,
            singletrackKm: singletrackKm,
            weightedCrr: weightedCrr,
            segments: segments,
            pointSurfaces: pointSurfaces,
            suitability: suitability,
            dataSource: "heuristic-fallback",
            isLoadingOsm: nil,
            osmCoveragePct: nil,
            explicitTagPct: nil,
            osmWayCount: nil,
            osmError: nil,
            osmFetchedAt: nil
        )
    }

    private static func formatJSNumber(_ v: Double) -> String {
        if v == v.rounded() {
            return String(Int(v))
        }
        return String(v)
    }
}
