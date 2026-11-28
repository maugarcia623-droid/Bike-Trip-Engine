import Foundation

public struct GpxExportOptions: Sendable, Equatable {
    public var ftpWatts: Double?
    public var carbTargetGPerHr: Double?
    public var carbPacingMode: String? // "auto" | "locked"
    public var isLockedCarbTarget: Bool?
    public var riderLevel: RiderLevel?
    public var nutritionPreference: NutritionPreference?

    public init(
        ftpWatts: Double? = nil,
        carbTargetGPerHr: Double? = nil,
        carbPacingMode: String? = nil,
        isLockedCarbTarget: Bool? = nil,
        riderLevel: RiderLevel? = nil,
        nutritionPreference: NutritionPreference? = nil
    ) {
        self.ftpWatts = ftpWatts
        self.carbTargetGPerHr = carbTargetGPerHr
        self.carbPacingMode = carbPacingMode
        self.isLockedCarbTarget = isLockedCarbTarget
        self.riderLevel = riderLevel
        self.nutritionPreference = nutritionPreference
    }
}

public enum GpxExporter {
    private struct TrackPointData {
        let lat: Double
        let lng: Double
        let eleM: Double
        let distanceMeters: Int
        let date: Date
        let timestamp: String
    }

    private struct TcxCoursePoint {
        let distKm: Double
        let lat: Double
        let lon: Double
        let ele: Double?
        let time: String
        let name: String
        let pointType: String
        let notes: String
    }

    private static func jsNum(_ value: Double) -> String {
        guard value.isFinite else { return "0" }
        let safe = value == 0 ? 0.0 : value
        if safe.truncatingRemainder(dividingBy: 1) == 0, abs(safe) < 9_007_199_254_740_992 {
            return String(Int64(safe))
        }
        return String(safe)
    }

    private static func formatIsoUtc(_ date: Date) -> String {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        formatter.timeZone = TimeZone(secondsFromGMT: 0)!
        return formatter.string(from: date)
    }

    private static func generateRadiusLoopCoordinates(
        center: LatLon,
        distanceKm: Double,
        sampleCount: Int = 64
    ) -> [LatLon] {
        let lat0 = center.lat
        let lng0 = center.lon
        let targetDist = max(2.0, distanceKm)
        let radiusKm = targetDist / (2.0 * Double.pi)
        let latKmPerDeg = 111.0
        let lngKmPerDegRaw = 111.0 * cos((lat0 * Double.pi) / 180.0)
        let lngKmPerDeg = lngKmPerDegRaw != 0 ? lngKmPerDegRaw : 1.0

        var coords: [LatLon] = []
        coords.reserveCapacity(sampleCount + 1)

        for i in 0...sampleCount {
            let t = (Double(i) / Double(sampleCount)) * 2.0 * Double.pi
            let dLatKm = radiusKm * sin(t)
            let dLngKm = radiusKm * (1.0 - cos(t))
            let lat = lat0 + dLatKm / latKmPerDeg
            let lng = lng0 + dLngKm / lngKmPerDeg
            coords.append(LatLon(
                lat: JSCompat.jsToFixedNumber(lat, decimals: 6),
                lon: JSCompat.jsToFixedNumber(lng, decimals: 6)
            ))
        }

        return coords
    }

    private static func resolveExportCoordinates(_ route: RouteParams) -> [LatLon] {
        if let coords = route.coordinates, coords.count >= 2 {
            return coords
        }

        if route.routeMode == "manual-radius" || (route.radiusMeters ?? 0) > 0 {
            let center: LatLon
            if let orig = route.originCoords {
                center = orig
            } else if let first = route.coordinates?.first {
                center = first
            } else {
                center = LatLon(lat: 47.2186, lon: -1.5541)
            }
            return generateRadiusLoopCoordinates(
                center: center,
                distanceKm: route.distanceKm > 0 ? route.distanceKm : 30.0
            )
        }

        return [
            LatLon(lat: 47.2184, lon: -1.5536),
            LatLon(lat: 47.205, lon: -1.6),
            LatLon(lat: 47.235, lon: -1.72),
            LatLon(lat: 47.25, lon: -1.86),
            LatLon(lat: 47.28, lon: -2.05),
            LatLon(lat: 47.273, lon: -2.18),
            LatLon(lat: 47.284, lon: -2.208),
        ]
    }

    private static func resolveStartDate(
        departureDate: String?,
        departureTime: String?,
        now: Date,
        timeZone: TimeZone
    ) -> Date {
        var cal = Calendar(identifier: .gregorian)
        cal.timeZone = timeZone

        var baseDate = now
        var parsedYmd: (year: Int, month: Int, day: Int)?

        if let dep = departureDate, !dep.isEmpty {
            let ymdParts = dep.prefix(10).split(separator: "-").compactMap { Int($0) }
            if ymdParts.count == 3, dep.range(of: #"^\d{4}-\d{2}-\d{2}$"#, options: .regularExpression) != nil {
                parsedYmd = (ymdParts[0], ymdParts[1], ymdParts[2])
                var utcCal = Calendar(identifier: .gregorian)
                utcCal.timeZone = TimeZone(secondsFromGMT: 0)!
                var comps = DateComponents()
                comps.year = ymdParts[0]
                comps.month = ymdParts[1]
                comps.day = ymdParts[2]
                comps.hour = 0
                comps.minute = 0
                comps.second = 0
                if let d = utcCal.date(from: comps) {
                    baseDate = d
                }
            } else {
                let isoWithFrac = ISO8601DateFormatter()
                isoWithFrac.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
                let isoPlain = ISO8601DateFormatter()
                isoPlain.formatOptions = [.withInternetDateTime]
                if let d = isoWithFrac.date(from: dep) ?? isoPlain.date(from: dep) {
                    baseDate = d
                }
            }
        }

        if let depTime = departureTime, !depTime.isEmpty {
            let parts = depTime.split(separator: ":").compactMap { Int($0) }
            if parts.count >= 2 {
                let h = parts[0]
                let m = parts[1]
                var comps: DateComponents
                if let ymd = parsedYmd {
                    comps = DateComponents()
                    comps.year = ymd.year
                    comps.month = ymd.month
                    comps.day = ymd.day
                } else {
                    comps = cal.dateComponents([.year, .month, .day], from: baseDate)
                }
                comps.hour = h
                comps.minute = m
                comps.second = 0
                comps.nanosecond = 0
                if let localDate = cal.date(from: comps) {
                    return localDate
                }
            }
        }

        return baseDate
    }

    private static func prepareStageTrackPoints(
        route: RouteParams,
        departureDate: String?,
        departureTime: String?,
        now: Date,
        timeZone: TimeZone
    ) -> [TrackPointData] {
        let coords = resolveExportCoordinates(route)
        let speedKmH = max(10.0, route.targetSpeedKmH > 0 ? route.targetSpeedKmH : 24.0)

        var profile = route.elevationProfile
        let profileSpanKm = (profile != nil && profile!.count >= 2) ? profile![profile!.count - 1].distKm : 0.0
        let routeDistKm = route.distanceKm > 0 ? route.distanceKm : 30.0
        let isProfileStale =
            profile == nil ||
            profile!.count < 2 ||
            abs(profileSpanKm - routeDistKm) > max(5.0, routeDistKm * 0.15)

        if isProfileStale {
            var synthRoute = route
            synthRoute.elevationProfile = nil
            synthRoute.terrainSummary = nil
            profile = GpxParserEngine.synthesizeRouteElevationProfile(synthRoute).elevationProfile
        }

        let startDate = resolveStartDate(
            departureDate: departureDate,
            departureTime: departureTime,
            now: now,
            timeZone: timeZone
        )

        var cumDists: [Double] = [0.0]
        cumDists.reserveCapacity(coords.count)
        var totalMeters = 0.0
        for i in 1..<coords.count {
            let d = OverpassWaterGapEngine.haversineDistanceMeters(
                lat1: coords[i - 1].lat,
                lon1: coords[i - 1].lon,
                lat2: coords[i].lat,
                lon2: coords[i].lon
            )
            totalMeters += d
            cumDists.append(totalMeters)
        }

        let targetTotalMeters = routeDistKm * 1000.0
        let scale = totalMeters > 10.0 ? targetTotalMeters / totalMeters : 1.0

        func getElevationAtDistKm(_ distKm: Double) -> Double {
            guard let prof = profile, !prof.isEmpty else { return 20.0 }
            if distKm <= prof[0].distKm { return prof[0].eleM }
            if distKm >= prof[prof.count - 1].distKm { return prof[prof.count - 1].eleM }
            for j in 1..<prof.count {
                if prof[j].distKm >= distKm {
                    let p0 = prof[j - 1]
                    let p1 = prof[j]
                    let span = p1.distKm - p0.distKm
                    let ratio = span > 0 ? (distKm - p0.distKm) / span : 0.0
                    return JSCompat.jsToFixedNumber(p0.eleM + (p1.eleM - p0.eleM) * ratio, decimals: 1)
                }
            }
            return 20.0
        }

        let pacingCurve = ClimbSplitsEngine.buildClimbAdjustedPacingCurve(
            profile ?? [],
            totalDistanceKm: targetTotalMeters / 1000.0,
            avgFlatSpeedKmH: speedKmH
        )

        return coords.enumerated().map { idx, c in
            let distM = cumDists[idx] * scale
            let distKm = distM / 1000.0
            let ele = getElevationAtDistKm(distKm)
            let timeOffsetSec = JSCompat.jsRoundInt(
                ClimbSplitsEngine.interpolateElapsedSecondsAtKm(pacingCurve, distKm)
            )
            let ptDate = startDate.addingTimeInterval(Double(timeOffsetSec))
            return TrackPointData(
                lat: c.lat,
                lng: c.lon,
                eleM: ele,
                distanceMeters: JSCompat.jsRoundInt(distM),
                date: ptDate,
                timestamp: formatIsoUtc(ptDate)
            )
        }
    }

    private static func resolveActivePinnedAmenities(_ trip: TripProfile) -> [StageAmenity] {
        if let pinned = trip.pinnedAmenities, !pinned.isEmpty {
            return pinned
        }
        if let stages = trip.stages, !stages.isEmpty {
            let activeIdx = max(0, min(trip.activeStageIndex ?? 0, stages.count - 1))
            return stages[activeIdx].pinnedAmenities ?? []
        }
        return []
    }

    private static func findNearestTrackPoint(
        _ points: [TrackPointData],
        targetDistKm: Double,
        lat: Double? = nil,
        lng: Double? = nil
    ) -> TrackPointData? {
        guard !points.isEmpty else { return nil }
        let targetMeters = targetDistKm * 1000.0
        var best = points[0]
        var bestDiff = Double.infinity

        for pt in points {
            let distDiff = abs(Double(pt.distanceMeters) - targetMeters)
            if distDiff < bestDiff {
                bestDiff = distDiff
                best = pt
            }
        }

        if let lat, let lng, bestDiff > 2000.0 {
            var bestGeo = Double.infinity
            for pt in points {
                let geo = OverpassWaterGapEngine.haversineDistanceMeters(
                    lat1: lat, lon1: lng, lat2: pt.lat, lon2: pt.lng
                )
                if geo < bestGeo {
                    bestGeo = geo
                    best = pt
                }
            }
        }

        return best
    }

    private static func buildTrackPointsXml(_ points: [TrackPointData]) -> String {
        var xml = ""
        for p in points {
            xml += "      <trkpt lat=\"\(JSCompat.jsFixed(p.lat, decimals: 6))\" lon=\"\(JSCompat.jsFixed(p.lng, decimals: 6))\">\n"
            xml += "        <ele>\(JSCompat.jsFixed(p.eleM, decimals: 1))</ele>\n"
            xml += "        <time>\(p.timestamp)</time>\n"
            xml += "      </trkpt>\n"
        }
        return xml
    }

    private static func escapeXml(_ unsafe: String) -> String {
        unsafe
            .replacingOccurrences(of: "&", with: "&amp;")
            .replacingOccurrences(of: "<", with: "&lt;")
            .replacingOccurrences(of: ">", with: "&gt;")
            .replacingOccurrences(of: "\"", with: "&quot;")
            .replacingOccurrences(of: "'", with: "&apos;")
    }

    private static func formatGpxPointElement(
        tag: String,
        indent: String,
        lat: Double,
        lon: Double,
        ele: Double? = nil,
        time: String? = nil,
        name: String,
        cmt: String? = nil,
        desc: String? = nil,
        sym: String? = nil,
        type: String? = nil
    ) -> String {
        var xml = "\(indent)<\(tag) lat=\"\(JSCompat.jsFixed(lat, decimals: 6))\" lon=\"\(JSCompat.jsFixed(lon, decimals: 6))\">\n"
        if let ele, ele.isFinite {
            xml += "\(indent)  <ele>\(JSCompat.jsFixed(ele, decimals: 1))</ele>\n"
        }
        if let time, !time.isEmpty {
            xml += "\(indent)  <time>\(escapeXml(time))</time>\n"
        }
        xml += "\(indent)  <name>\(escapeXml(name))</name>\n"
        if let cmt, !cmt.isEmpty {
            xml += "\(indent)  <cmt>\(escapeXml(cmt))</cmt>\n"
        }
        if let desc, !desc.isEmpty {
            xml += "\(indent)  <desc>\(escapeXml(desc))</desc>\n"
        }
        if let sym, !sym.isEmpty {
            xml += "\(indent)  <sym>\(escapeXml(sym))</sym>\n"
        }
        if let type, !type.isEmpty {
            xml += "\(indent)  <type>\(escapeXml(type))</type>\n"
        }
        xml += "\(indent)</\(tag)>\n"
        return xml
    }

    private static func buildStageWaypointsXml(
        route: RouteParams,
        points: [TrackPointData],
        pinnedAmenities: [StageAmenity],
        departureTime: String?,
        dayNumber: Int? = nil,
        lang: CadenceLang
    ) -> String {
        let resolvedDep = (departureTime?.isEmpty == false) ? departureTime! : "08:00"
        let dayTag = dayNumber.map { "Day \($0) " } ?? ""
        let speedKmH = max(10.0, route.targetSpeedKmH > 0 ? route.targetSpeedKmH : 24.0)
        var wptXml = ""

        if let startPt = points.first {
            let originLabel = (route.origin?.isEmpty == false) ? route.origin! : "Start"
            wptXml += formatGpxPointElement(
                tag: "wpt",
                indent: "  ",
                lat: startPt.lat,
                lon: startPt.lng,
                ele: startPt.eleM,
                time: startPt.timestamp,
                name: "\(dayTag)Start: \(originLabel)",
                cmt: "km 0.0 · Start \(resolvedDep)",
                desc: "\(dayTag)Departure from \(originLabel)",
                sym: "Flag, Green",
                type: "Start"
            )
        }

        if let waypoints = route.waypoints, !waypoints.isEmpty {
            for (wpIdx, wp) in waypoints.enumerated() {
                guard let wpCoords = wp.coordinates else { continue }
                let matchesPinned = pinnedAmenities.contains { p in
                    wp.sourceAmenityId == p.id ||
                    wp.id == "wp-poi-\(p.id)" ||
                    OverpassWaterGapEngine.haversineDistanceMeters(
                        lat1: p.lat, lon1: p.lon, lat2: wpCoords.lat, lon2: wpCoords.lon
                    ) < 60.0
                }
                if matchesPinned { continue }

                let distKm = wp.distanceFromStartKm ?? 0.0
                let distStr = JSCompat.jsFixed(distKm, decimals: 1)
                let nearPt = findNearestTrackPoint(points, targetDistKm: distKm, lat: wpCoords.lat, lng: wpCoords.lon)
                wptXml += formatGpxPointElement(
                    tag: "wpt",
                    indent: "  ",
                    lat: wpCoords.lat,
                    lon: wpCoords.lon,
                    ele: nearPt?.eleM,
                    time: nearPt?.timestamp,
                    name: "\(dayTag)Via \(wpIdx + 1): \(wp.name)",
                    cmt: "KM \(distStr)",
                    desc: "\(dayTag)Intermediate stop: \(wp.name) (KM \(distStr))",
                    sym: "Flag, Blue",
                    type: "Waypoint"
                )
            }
        }

        for amenity in pinnedAmenities {
            let nearPt = findNearestTrackPoint(points, targetDistKm: amenity.routeKm, lat: amenity.lat, lng: amenity.lon)
            let catLabel = CueSheetEngine.formatAmenityCategoryLabel(amenity.category, lang: lang)

            let depParts = resolvedDep.split(separator: ":").compactMap { Int($0) }
            let depH = depParts.count > 0 ? depParts[0] : 8
            let depM = depParts.count > 1 ? depParts[1] : 0
            let depMins = depH * 60 + depM
            let totalMins = JSCompat.posMod(
                depMins + JSCompat.jsRoundInt((amenity.routeKm / speedKmH) * 60.0),
                1440
            )
            let localEta = String(format: "%02d:%02d", totalMins / 60, totalMins % 60)
            let localNote = CueSheetEngine.formatAmenityCueNote(amenity, eta: localEta, lang: lang)

            let name = dayNumber.map { "D\($0) · \(amenity.name)" } ?? amenity.name
            let cmt = dayNumber.map { "Day \($0) · \(localNote.cmt)" } ?? localNote.cmt
            let desc = dayNumber.map { "Day \($0) · \(localNote.desc)" } ?? localNote.desc

            wptXml += formatGpxPointElement(
                tag: "wpt",
                indent: "  ",
                lat: amenity.lat,
                lon: amenity.lon,
                ele: amenity.elevationMeters ?? nearPt?.eleM,
                time: nearPt?.timestamp,
                name: name,
                cmt: cmt,
                desc: desc,
                sym: CueSheetEngine.getAmenityGpxSymbol(amenity.category),
                type: catLabel
            )
        }

        if points.count > 1, let endPt = points.last {
            let destLabel = (route.destination?.isEmpty == false) ? route.destination! : "Finish"
            let finishKm = JSCompat.jsFixed(Double(endPt.distanceMeters) / 1000.0, decimals: 1)
            wptXml += formatGpxPointElement(
                tag: "wpt",
                indent: "  ",
                lat: endPt.lat,
                lon: endPt.lng,
                ele: endPt.eleM,
                time: endPt.timestamp,
                name: "\(dayTag)Finish: \(destLabel)",
                cmt: "KM \(finishKm)",
                desc: "\(dayTag)Arrival at \(destLabel)",
                sym: "Flag, Red",
                type: "Finish"
            )
        }

        return wptXml
    }

    private static func buildStageCueRouteXml(
        route: RouteParams,
        points: [TrackPointData],
        pinnedAmenities: [StageAmenity],
        departureTime: String?,
        routeName: String,
        routeNumber: Int? = nil,
        dayPrefix: String? = nil,
        lang: CadenceLang
    ) -> String {
        let coords = points.map { LatLon(lat: $0.lat, lon: $0.lng) }
        let cueEntries = CueSheetEngine.buildStageCueSheet(
            route: route,
            coords: coords,
            pinnedAmenities: pinnedAmenities,
            departureTime: (departureTime?.isEmpty == false) ? departureTime! : "08:00",
            speedKmH: route.targetSpeedKmH > 0 ? route.targetSpeedKmH : 24.0,
            dayPrefix: dayPrefix,
            lang: lang
        )

        if cueEntries.isEmpty { return "" }

        var rteptsXml = ""
        for cue in cueEntries {
            let nearPt = findNearestTrackPoint(points, targetDistKm: cue.distKm, lat: cue.lat, lng: cue.lng)
            rteptsXml += formatGpxPointElement(
                tag: "rtept",
                indent: "    ",
                lat: cue.lat,
                lon: cue.lng,
                ele: cue.amenity?.elevationMeters ?? nearPt?.eleM,
                time: nearPt?.timestamp,
                name: cue.shortName,
                cmt: cue.cmt,
                desc: cue.desc,
                sym: cue.sym,
                type: cue.typeLabel
            )
        }

        let numberXml = routeNumber.map { "    <number>\($0)</number>\n" } ?? ""
        return "  <rte>\n    <name>\(escapeXml(routeName))</name>\n    <desc>\(escapeXml("Turn-by-turn navigation & resupply cue sheet (\(cueEntries.count) cues)"))</desc>\n\(numberXml)\(rteptsXml)  </rte>\n"
    }

    private static func mapClimbCategoryToTcxPointType(_ cat: ClimbCategory) -> TcxPointType {
        switch cat {
        case .hc:
            return .horsCategory
        case .cat1:
            return .firstCategory
        case .cat2:
            return .secondCategory
        case .cat3:
            return .thirdCategory
        case .cat4:
            return .fourthCategory
        case .hill:
            return .generic
        }
    }

    private static func buildClimbAndFuelGpxWaypointsXml(
        trip: TripProfile,
        points: [TrackPointData],
        lang: CadenceLang,
        options: GpxExportOptions,
        riderSpecs: RiderBikeSpecs
    ) -> String {
        if points.isEmpty { return "" }
        let physicsResult = PhysicsEngine.calculatePhysics(
            physics: trip.physics,
            route: trip.route,
            weather: trip.weather,
            lang: lang,
            ftpOverride: options.ftpWatts,
            riderSpecs: riderSpecs
        )
        let splitSummary = ClimbSplitsEngine.computeClimbSplitsAndFueling(
            trip,
            physicsResult: physicsResult,
            lang: lang,
            options: ClimbSplitsOptions(
                ftpWatts: options.ftpWatts,
                carbTargetGPerHr: options.carbTargetGPerHr,
                isLockedCarbTarget: options.isLockedCarbTarget,
                carbPacingMode: options.carbPacingMode,
                riderLevel: options.riderLevel,
                nutritionPreference: options.nutritionPreference,
                departureTimeHHMM: trip.departureTime
            ),
            riderSpecs: riderSpecs
        )

        var xml = ""
        for climb in splitSummary.climbs {
            guard let pt = findNearestTrackPoint(points, targetDistKm: climb.startKm) else { continue }
            let catLabel = ClimbSplitsEngine.formatClimbCategoryLabel(climb.category, lang: lang)
            let etaPart = climb.etaStartHHMM.map { " · ETA \($0)" } ?? ""
            let desc = "\(jsNum(climb.lengthKm)) km @ \(jsNum(climb.avgGradePct))% (+\(climb.elevationGainM) m) · \(climb.targetWatts)W (\(jsNum(climb.ftpPercent))% FTP, \(jsNum(climb.wattsPerKg)) W/kg) · \(climb.durationFormatted)\(etaPart) · \(climb.fuelingCue)"
            xml += formatGpxPointElement(
                tag: "wpt",
                indent: "  ",
                lat: pt.lat,
                lon: pt.lng,
                ele: pt.eleM,
                time: pt.timestamp,
                name: String("\(catLabel) \(climb.name)".prefix(48)),
                cmt: climb.fuelingCue,
                desc: desc,
                sym: "Summit",
                type: "Climb"
            )
        }

        for cp in splitSummary.checkpoints {
            guard let pt = findNearestTrackPoint(points, targetDistKm: cp.distKm) else { continue }
            let etaPart = cp.etaHHMM.map { " · ETA \($0)" } ?? ""
            xml += formatGpxPointElement(
                tag: "wpt",
                indent: "  ",
                lat: pt.lat,
                lon: pt.lng,
                ele: pt.eleM,
                time: pt.timestamp,
                name: String(cp.label.prefix(48)),
                cmt: cp.shortFitCue,
                desc: "\(cp.detail)\(etaPart)",
                sym: cp.kind == "hydration" ? "Drinking Water" : "Food",
                type: cp.kind == "hydration" ? "Hydration" : "Fueling"
            )
        }

        return xml
    }

    public static func exportTripToGpx(
        _ trip: TripProfile,
        options: GpxExportOptions = GpxExportOptions(),
        lang: CadenceLang = .en,
        now: Date = Date(),
        timeZone: TimeZone = TimeZone(identifier: "Europe/Paris") ?? .current,
        riderSpecs: RiderBikeSpecs = .defaultSpecs
    ) -> String {
        let points = prepareStageTrackPoints(
            route: trip.route,
            departureDate: trip.departureDate,
            departureTime: trip.departureTime,
            now: now,
            timeZone: timeZone
        )
        let pinnedAmenities = resolveActivePinnedAmenities(trip)
        let originLabel = (trip.route.origin?.isEmpty == false) ? trip.route.origin! : "Start"
        let destLabel = (trip.route.destination?.isEmpty == false) ? trip.route.destination! : "Finish"
        let trackName = !trip.name.isEmpty ? trip.name : "\(originLabel) → \(destLabel)"
        let description = !trip.description.isEmpty
            ? trip.description
            : "\(jsNum(trip.route.distanceKm)) km ride · Planned with Cadence (ridecadence.cc)"
        let time = points.first?.timestamp ?? formatIsoUtc(now)

        let wptXml =
            buildStageWaypointsXml(
                route: trip.route,
                points: points,
                pinnedAmenities: pinnedAmenities,
                departureTime: trip.departureTime,
                lang: lang
            ) +
            buildClimbAndFuelGpxWaypointsXml(
                trip: trip,
                points: points,
                lang: lang,
                options: options,
                riderSpecs: riderSpecs
            )

        let rteXml = buildStageCueRouteXml(
            route: trip.route,
            points: points,
            pinnedAmenities: pinnedAmenities,
            departureTime: trip.departureTime,
            routeName: "\(trackName) — Cue Sheet",
            lang: lang
        )

        let trkptsXml = buildTrackPointsXml(points)

        return """
        <?xml version="1.0" encoding="UTF-8"?>
        <gpx version="1.1" creator="Cadence (ridecadence.cc)"
          xmlns="http://www.topografix.com/GPX/1/1"
          xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
          xsi:schemaLocation="http://www.topografix.com/GPX/1/1 http://www.topografix.com/GPX/1/1/gpx.xsd">
          <metadata>
            <name>\(escapeXml(trackName))</name>
            <desc>\(escapeXml(description))</desc>
            <time>\(time)</time>
          </metadata>
        \(wptXml)\(rteXml)  <trk>
            <name>\(escapeXml(trackName))</name>
            <desc>\(escapeXml(description))</desc>
            <trkseg>
        \(trkptsXml)    </trkseg>
          </trk>
        </gpx>
        """
    }

    public static func exportEntireTourToGpx(
        _ trip: TripProfile,
        options: GpxExportOptions = GpxExportOptions(),
        lang: CadenceLang = .en,
        now: Date = Date(),
        timeZone: TimeZone = TimeZone(identifier: "Europe/Paris") ?? .current,
        riderSpecs: RiderBikeSpecs = .defaultSpecs
    ) -> String {
        let stages = StageManagerEngine.resolveLiveStages(trip, now: now)
        if stages.count <= 1 {
            return exportTripToGpx(
                trip,
                options: options,
                lang: lang,
                now: now,
                timeZone: timeZone,
                riderSpecs: riderSpecs
            )
        }

        let totals = StageManagerEngine.getExpeditionTotals(trip, now: now)
        let fallbackOrigin = totals.originCity.isEmpty ? "Tour" : totals.originCity
        let fallbackDest = totals.finalDestinationCity.isEmpty ? "Finish" : totals.finalDestinationCity
        let tourName = escapeXml(
            !trip.name.isEmpty ? trip.name : "\(fallbackOrigin) → \(fallbackDest) (\(totals.totalDays)d)"
        )
        let tourDesc = escapeXml(
            "\(totals.totalDays)-stage Tour · \(jsNum(totals.totalDistanceKm)) km total · +\(totals.totalElevationM) m elevation · Exported from Cadence"
        )

        var wptXml = ""
        var rteXml = ""
        var trksXml = ""
        var metadataTime = formatIsoUtc(now)

        for (idx, stage) in stages.enumerated() {
            let pts = prepareStageTrackPoints(
                route: stage.route,
                departureDate: stage.departureDate,
                departureTime: stage.departureTime,
                now: now,
                timeZone: timeZone
            )
            if idx == 0, let firstPt = pts.first {
                metadataTime = firstPt.timestamp
            }

            let stagePinned = stage.pinnedAmenities ?? []

            wptXml += buildStageWaypointsXml(
                route: stage.route,
                points: pts,
                pinnedAmenities: stagePinned,
                departureTime: stage.departureTime,
                dayNumber: stage.dayNumber,
                lang: lang
            )

            let originLabel = (stage.route.origin?.isEmpty == false) ? stage.route.origin! : "Start"
            let destLabel = (stage.route.destination?.isEmpty == false) ? stage.route.destination! : "Finish"
            rteXml += buildStageCueRouteXml(
                route: stage.route,
                points: pts,
                pinnedAmenities: stagePinned,
                departureTime: stage.departureTime,
                routeName: "Day \(stage.dayNumber) Cue Sheet: \(originLabel) → \(destLabel)",
                routeNumber: stage.dayNumber,
                dayPrefix: "D\(stage.dayNumber)",
                lang: lang
            )

            let stageName = escapeXml(
                "Day \(stage.dayNumber): \(originLabel) → \(destLabel) (\(jsNum(stage.route.distanceKm)) km)"
            )
            let stageDesc = escapeXml(
                "Stage \(stage.dayNumber)/\(stages.count) · \(stage.departureDate) \(stage.departureTime) · +\(JSCompat.jsRoundInt(stage.route.elevationGainM ?? 0)) m"
            )
            let trkptsXml = buildTrackPointsXml(pts)

            trksXml += "  <trk>\n    <name>\(stageName)</name>\n    <desc>\(stageDesc)</desc>\n    <number>\(stage.dayNumber)</number>\n    <trkseg>\n\(trkptsXml)    </trkseg>\n  </trk>\n"
        }

        return """
        <?xml version="1.0" encoding="UTF-8"?>
        <gpx version="1.1" creator="Cadence - Tour Engine"
          xmlns="http://www.topografix.com/GPX/1/1"
          xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
          xsi:schemaLocation="http://www.topografix.com/GPX/1/1 http://www.topografix.com/GPX/1/1/gpx.xsd">
          <metadata>
            <name>\(tourName)</name>
            <desc>\(tourDesc)</desc>
            <time>\(metadataTime)</time>
          </metadata>
        \(wptXml)\(rteXml)\(trksXml)</gpx>
        """
    }

    public static func exportStageToGpx(
        _ trip: TripProfile,
        stageIndex: Int,
        options: GpxExportOptions = GpxExportOptions(),
        lang: CadenceLang = .en,
        now: Date = Date(),
        timeZone: TimeZone = TimeZone(identifier: "Europe/Paris") ?? .current,
        riderSpecs: RiderBikeSpecs = .defaultSpecs
    ) -> String {
        let stages = StageManagerEngine.resolveLiveStages(trip, now: now)
        guard !stages.isEmpty else {
            return exportTripToGpx(
                trip,
                options: options,
                lang: lang,
                now: now,
                timeZone: timeZone,
                riderSpecs: riderSpecs
            )
        }
        let clampedIdx = max(0, min(stageIndex, stages.count - 1))
        let stage = stages[clampedIdx]

        let stageOrigin = (stage.route.origin?.isEmpty == false) ? stage.route.origin! : "Start"
        let stageDest = (stage.route.destination?.isEmpty == false) ? stage.route.destination! : "Finish"
        let tripTitle = !trip.name.isEmpty ? trip.name : "Tour"

        var stageTripProxy = trip
        stageTripProxy.name = "\(tripTitle) — Day \(stage.dayNumber) (\(stageOrigin) → \(stageDest))"
        stageTripProxy.departureDate = stage.departureDate
        stageTripProxy.departureTime = stage.departureTime
        stageTripProxy.route = stage.route
        stageTripProxy.office = stage.office
        stageTripProxy.weather = stage.weather
        stageTripProxy.customChips = stage.customChips
        stageTripProxy.pinnedAmenities = stage.pinnedAmenities
        stageTripProxy.stages = nil
        stageTripProxy.activeStageIndex = nil

        return exportTripToGpx(
            stageTripProxy,
            options: options,
            lang: lang,
            now: now,
            timeZone: timeZone,
            riderSpecs: riderSpecs
        )
    }

    public static func exportTripToTcx(
        _ trip: TripProfile,
        options: GpxExportOptions = GpxExportOptions(),
        lang: CadenceLang = .en,
        now: Date = Date(),
        timeZone: TimeZone = TimeZone(identifier: "Europe/Paris") ?? .current,
        riderSpecs: RiderBikeSpecs = .defaultSpecs
    ) -> String {
        let points = prepareStageTrackPoints(
            route: trip.route,
            departureDate: trip.departureDate,
            departureTime: trip.departureTime,
            now: now,
            timeZone: timeZone
        )
        let pinnedAmenities = resolveActivePinnedAmenities(trip)
        let originLabel = (trip.route.origin?.isEmpty == false) ? trip.route.origin! : "Start"
        let destLabel = (trip.route.destination?.isEmpty == false) ? trip.route.destination! : "Finish"
        let rawCourseName = !trip.name.isEmpty ? trip.name : "\(originLabel) - \(destLabel)"
        let courseName = escapeXml(String(rawCourseName.prefix(30)))

        let totalMeters = points.last?.distanceMeters ?? 0
        let speedKmH = max(10.0, trip.route.targetSpeedKmH > 0 ? trip.route.targetSpeedKmH : 24.0)
        let totalTimeSeconds: Int
        if points.count >= 2, let first = points.first, let last = points.last {
            totalTimeSeconds = max(60, JSCompat.jsRoundInt(last.date.timeIntervalSince(first.date)))
        } else {
            totalTimeSeconds = JSCompat.jsRoundInt((Double(totalMeters) / (speedKmH * 1000.0)) * 3600.0)
        }

        let startLat = points.first?.lat ?? 47.2186
        let startLng = points.first?.lng ?? -1.5541
        let endLat = points.last?.lat ?? startLat
        let endLng = points.last?.lng ?? startLng

        let targetWatts: Int?
        if let w = trip.route.targetEffortWatts, w > 0 {
            targetWatts = JSCompat.jsRoundInt(w)
        } else {
            targetWatts = nil
        }

        var trackpointsXml = ""
        for p in points {
            trackpointsXml += "          <Trackpoint>\n"
            trackpointsXml += "            <Time>\(p.timestamp)</Time>\n"
            trackpointsXml += "            <Position>\n"
            trackpointsXml += "              <LatitudeDegrees>\(JSCompat.jsFixed(p.lat, decimals: 6))</LatitudeDegrees>\n"
            trackpointsXml += "              <LongitudeDegrees>\(JSCompat.jsFixed(p.lng, decimals: 6))</LongitudeDegrees>\n"
            trackpointsXml += "            </Position>\n"
            trackpointsXml += "            <AltitudeMeters>\(JSCompat.jsFixed(p.eleM, decimals: 1))</AltitudeMeters>\n"
            trackpointsXml += "            <DistanceMeters>\(JSCompat.jsFixed(Double(p.distanceMeters), decimals: 1))</DistanceMeters>\n"
            if let watts = targetWatts {
                trackpointsXml += "            <Extensions>\n"
                trackpointsXml += "              <TPX xmlns=\"http://www.garmin.com/xmlschemas/ActivityExtension/v2\">\n"
                trackpointsXml += "                <Watts>\(watts)</Watts>\n"
                trackpointsXml += "              </TPX>\n"
                trackpointsXml += "            </Extensions>\n"
            }
            trackpointsXml += "          </Trackpoint>\n"
        }

        let coords = points.map { LatLon(lat: $0.lat, lon: $0.lng) }
        let cueEntries = CueSheetEngine.buildStageCueSheet(
            route: trip.route,
            coords: coords,
            pinnedAmenities: pinnedAmenities,
            departureTime: (trip.departureTime?.isEmpty == false) ? trip.departureTime! : "08:00",
            speedKmH: speedKmH,
            lang: lang
        )

        let physicsResult = PhysicsEngine.calculatePhysics(
            physics: trip.physics,
            route: trip.route,
            weather: trip.weather,
            lang: lang,
            ftpOverride: options.ftpWatts,
            riderSpecs: riderSpecs
        )
        let splitSummary = ClimbSplitsEngine.computeClimbSplitsAndFueling(
            trip,
            physicsResult: physicsResult,
            lang: lang,
            options: ClimbSplitsOptions(
                ftpWatts: options.ftpWatts,
                carbTargetGPerHr: options.carbTargetGPerHr,
                isLockedCarbTarget: options.isLockedCarbTarget,
                carbPacingMode: options.carbPacingMode,
                riderLevel: options.riderLevel,
                nutritionPreference: options.nutritionPreference,
                departureTimeHHMM: trip.departureTime
            ),
            riderSpecs: riderSpecs
        )

        var allCoursePoints: [TcxCoursePoint] = []
        let fallbackTime = points.first?.timestamp ?? formatIsoUtc(now)

        for cue in cueEntries {
            let nearPt = findNearestTrackPoint(points, targetDistKm: cue.distKm, lat: cue.lat, lng: cue.lng)
            allCoursePoints.append(TcxCoursePoint(
                distKm: cue.distKm,
                lat: cue.lat,
                lon: cue.lng,
                ele: cue.amenity?.elevationMeters ?? nearPt?.eleM,
                time: nearPt?.timestamp ?? fallbackTime,
                name: String(cue.shortName.prefix(30)),
                pointType: cue.tcxPointType.rawValue,
                notes: cue.desc
            ))
        }

        for climb in splitSummary.climbs {
            guard let nearPt = findNearestTrackPoint(points, targetDistKm: climb.startKm) else { continue }
            let catTag = climb.category == .hc ? "HC" : (climb.category == .hill ? "Climb" : "C\(climb.category.rawValue)")
            let etaPart = climb.etaStartHHMM.map { " · ETA \($0)" } ?? ""
            allCoursePoints.append(TcxCoursePoint(
                distKm: climb.startKm,
                lat: nearPt.lat,
                lon: nearPt.lng,
                ele: nearPt.eleM,
                time: nearPt.timestamp,
                name: String("\(catTag) \(jsNum(climb.lengthKm))km \(JSCompat.jsRoundInt(climb.avgGradePct))%".prefix(30)),
                pointType: mapClimbCategoryToTcxPointType(climb.category).rawValue,
                notes: "\(climb.targetWatts)W (\(jsNum(climb.ftpPercent))% FTP, \(jsNum(climb.wattsPerKg)) W/kg) · \(climb.durationFormatted)\(etaPart) · \(climb.fuelingCue)"
            ))
        }

        for cp in splitSummary.checkpoints {
            guard let nearPt = findNearestTrackPoint(points, targetDistKm: cp.distKm) else { continue }
            let etaPart = cp.etaHHMM.map { " (ETA \($0))" } ?? ""
            allCoursePoints.append(TcxCoursePoint(
                distKm: cp.distKm,
                lat: nearPt.lat,
                lon: nearPt.lng,
                ele: nearPt.eleM,
                time: nearPt.timestamp,
                name: String(cp.shortFitCue.prefix(30)),
                pointType: cp.kind == "hydration" ? "Water" : "Food",
                notes: "\(cp.detail)\(etaPart)"
            ))
        }

        allCoursePoints.sort { $0.distKm < $1.distKm }

        var coursePointsXml = ""
        for cp in allCoursePoints {
            coursePointsXml += "      <CoursePoint>\n"
            coursePointsXml += "        <Name>\(escapeXml(cp.name))</Name>\n"
            coursePointsXml += "        <Time>\(cp.time)</Time>\n"
            coursePointsXml += "        <Position>\n"
            coursePointsXml += "          <LatitudeDegrees>\(JSCompat.jsFixed(cp.lat, decimals: 6))</LatitudeDegrees>\n"
            coursePointsXml += "          <LongitudeDegrees>\(JSCompat.jsFixed(cp.lon, decimals: 6))</LongitudeDegrees>\n"
            coursePointsXml += "        </Position>\n"
            if let ele = cp.ele, ele.isFinite {
                coursePointsXml += "        <AltitudeMeters>\(JSCompat.jsFixed(ele, decimals: 1))</AltitudeMeters>\n"
            }
            coursePointsXml += "        <PointType>\(cp.pointType)</PointType>\n"
            coursePointsXml += "        <Notes>\(escapeXml(cp.notes))</Notes>\n"
            coursePointsXml += "      </CoursePoint>\n"
        }

        return """
        <?xml version="1.0" encoding="UTF-8"?>
        <TrainingCenterDatabase
          xmlns="http://www.garmin.com/xmlschemas/TrainingCenterDatabase/v2"
          xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
          xsi:schemaLocation="http://www.garmin.com/xmlschemas/TrainingCenterDatabase/v2 http://www.garmin.com/xmlschemas/TrainingCenterDatabasev2.xsd">
          <Courses>
            <Course>
              <Name>\(courseName)</Name>
              <Lap>
                <TotalTimeSeconds>\(totalTimeSeconds)</TotalTimeSeconds>
                <DistanceMeters>\(JSCompat.jsFixed(Double(totalMeters), decimals: 1))</DistanceMeters>
                <BeginPosition>
                  <LatitudeDegrees>\(JSCompat.jsFixed(startLat, decimals: 6))</LatitudeDegrees>
                  <LongitudeDegrees>\(JSCompat.jsFixed(startLng, decimals: 6))</LongitudeDegrees>
                </BeginPosition>
                <EndPosition>
                  <LatitudeDegrees>\(JSCompat.jsFixed(endLat, decimals: 6))</LatitudeDegrees>
                  <LongitudeDegrees>\(JSCompat.jsFixed(endLng, decimals: 6))</LongitudeDegrees>
                </EndPosition>
                <Intensity>Active</Intensity>
              </Lap>
              <Track>
        \(trackpointsXml)      </Track>
        \(coursePointsXml)    </Course>
          </Courses>
        </TrainingCenterDatabase>
        """
    }
}
