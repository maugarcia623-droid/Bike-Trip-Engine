import Foundation

public struct SynthesizedElevationResult: Codable, Sendable, Equatable {
    public var elevationProfile: [ElevationProfilePoint]
    public var terrainSummary: TerrainSummary

    public init(elevationProfile: [ElevationProfilePoint], terrainSummary: TerrainSummary) {
        self.elevationProfile = elevationProfile
        self.terrainSummary = terrainSummary
    }
}

public enum GpxParserEngine {
    static func inferSurfaceFromTitle(_ title: String) -> String {
        let lower = title.lowercased()
        if lower.contains("gravel") || lower.contains("grvl") || lower.contains("trail") ||
           lower.contains("sentier") || lower.contains("single") || lower.contains("vtt") ||
           lower.contains("offroad") || lower.contains("forest") {
            return "gravel"
        }
        if lower.contains("canal") || lower.contains("voie verte") || lower.contains("loire") ||
           lower.contains("bikepack") || lower.contains("mixed") || lower.contains("halage") {
            return "mixed"
        }
        return "road"
    }

    static func classifyDifficulty(distanceKm: Double, elevationGainM: Double, maxGradePct: Double) -> String {
        let mPerKm = distanceKm > 0 ? elevationGainM / distanceKm : 0.0
        if mPerKm >= 16 || elevationGainM >= 1600 || maxGradePct >= 13 { return "alpine" }
        if mPerKm >= 10 || elevationGainM >= 900 || distanceKm >= 110 { return "challenging" }
        if mPerKm >= 5.5 || elevationGainM >= 400 || distanceKm >= 55 { return "moderate" }
        return "easy"
    }

    public static func buildTerrainSummaryFromProfile(
        _ profile: [ElevationProfilePoint],
        distanceKm: Double,
        elevationGainM: Double,
        titleHint: String = "",
        coordinates: [LatLon]? = nil
    ) -> TerrainSummary {
        let surfaceBreakdown = SurfaceProfileEngine.computeSurfaceBreakdown(
            origin: titleHint,
            distanceKm: distanceKm,
            elevationGainM: elevationGainM,
            elevationProfile: profile,
            coordinates: coordinates
        )

        if profile.count < 2 {
            return TerrainSummary(
                flatPct: 65,
                rollingPct: 25,
                climbPct: 5,
                descentPct: 5,
                maxGradePct: 3.2,
                minEleM: 12,
                maxEleM: max(25, JSCompat.jsRound(12.0 + elevationGainM * 0.35)),
                surfaceLabel: inferSurfaceFromTitle(titleHint),
                difficultyLevel: classifyDifficulty(distanceKm: distanceKm, elevationGainM: elevationGainM, maxGradePct: 3.2),
                pavedPct: surfaceBreakdown.pavedPct,
                gravelPct: surfaceBreakdown.gravelPct,
                singletrackPct: surfaceBreakdown.singletrackPct,
                surfaceBreakdown: surfaceBreakdown
            )
        }

        var flatDist = 0.0
        var rollingDist = 0.0
        var climbDist = 0.0
        var descentDist = 0.0
        var maxGradePct = 0.0
        var minEleM = profile[0].eleM
        var maxEleM = profile[0].eleM

        for i in 1..<profile.count {
            let prev = profile[i - 1]
            let curr = profile[i]
            let segDist = max(0.01, curr.distKm - prev.distKm)
            let g = curr.gradePct

            if curr.eleM < minEleM { minEleM = curr.eleM }
            if curr.eleM > maxEleM { maxEleM = curr.eleM }
            if g > maxGradePct { maxGradePct = g }

            if g < -1.5 {
                descentDist += segDist
            } else if g <= 1.5 {
                flatDist += segDist
            } else if g <= 4.0 {
                rollingDist += segDist
            } else {
                climbDist += segDist
            }
        }

        let total = max(0.01, flatDist + rollingDist + climbDist + descentDist)
        let flatPct = JSCompat.jsRound((flatDist / total) * 100.0)
        let rollingPct = JSCompat.jsRound((rollingDist / total) * 100.0)
        let climbPct = JSCompat.jsRound((climbDist / total) * 100.0)
        let descentPct = max(0.0, 100.0 - flatPct - rollingPct - climbPct)
        let roundedMaxGrade = JSCompat.roundTo(max(0.5, maxGradePct), decimals: 1)

        return TerrainSummary(
            flatPct: flatPct,
            rollingPct: rollingPct,
            climbPct: climbPct,
            descentPct: descentPct,
            maxGradePct: roundedMaxGrade,
            minEleM: JSCompat.jsRound(minEleM),
            maxEleM: JSCompat.jsRound(maxEleM),
            surfaceLabel: inferSurfaceFromTitle(titleHint),
            difficultyLevel: classifyDifficulty(distanceKm: distanceKm, elevationGainM: elevationGainM, maxGradePct: roundedMaxGrade),
            pavedPct: surfaceBreakdown.pavedPct,
            gravelPct: surfaceBreakdown.gravelPct,
            singletrackPct: surfaceBreakdown.singletrackPct,
            surfaceBreakdown: surfaceBreakdown
        )
    }

    public static func synthesizeRouteElevationProfile(_ route: RouteParams) -> SynthesizedElevationResult {
        if let existing = route.elevationProfile, existing.count >= 3 {
            let summary: TerrainSummary
            if let ts = route.terrainSummary, ts.surfaceBreakdown != nil {
                summary = ts
            } else {
                let gain = route.elevationGainM ?? JSCompat.jsRound(route.distanceKm * 6.5)
                let hint = "\(route.origin ?? "") \(route.destination ?? "") \(route.gpxFileName ?? "")"
                summary = buildTerrainSummaryFromProfile(
                    existing,
                    distanceKm: route.distanceKm,
                    elevationGainM: gain,
                    titleHint: hint,
                    coordinates: route.coordinates
                )
            }
            let enriched = existing.enumerated().map { idx, pt -> ElevationProfilePoint in
                var copy = pt
                if copy.surfaceType == nil {
                    if let ps = summary.surfaceBreakdown?.pointSurfaces, idx < ps.count {
                        copy.surfaceType = ps[idx]
                    } else {
                        copy.surfaceType = .paved
                    }
                }
                return copy
            }
            return SynthesizedElevationResult(elevationProfile: enriched, terrainSummary: summary)
        }

        let distKm = max(2.0, route.distanceKm > 0 ? route.distanceKm : 30.0)
        let targetGainM = (route.elevationGainM != nil && route.elevationGainM! >= 0)
            ? route.elevationGainM!
            : JSCompat.jsRound(distKm * 6.5)

        let sampleCount = 48
        var rawEle: [Double] = []
        let baseEle = 18.0

        let seedOrigin = (route.origin?.isEmpty == false) ? route.origin! : "start"
        let seedDest = (route.destination?.isEmpty == false) ? route.destination! : "end"
        let seedText = "\(seedOrigin)-\(seedDest)-\(JSCompat.jsRoundInt(distKm))"
        var seed = 0
        for scalar in seedText.utf16 {
            seed = (seed * 31 + Int(scalar)) % 997
        }
        let phase1 = (Double(seed % 100) / 100.0) * Double.pi
        let phase2 = (Double((seed * 7) % 100) / 100.0) * Double.pi

        for i in 0...sampleCount {
            let t = Double(i) / Double(sampleCount)
            let wave =
                0.52 * sin(t * Double.pi * 2.2 + phase1) +
                0.31 * sin(t * Double.pi * 5.4 + phase2) +
                0.17 * sin(t * Double.pi * 9.0 + phase1 * 0.5)
            rawEle.append(wave)
        }

        var rawGain = 0.0
        var minRaw = rawEle[0]
        for i in 1..<rawEle.count {
            if rawEle[i] > rawEle[i - 1] { rawGain += rawEle[i] - rawEle[i - 1] }
            if rawEle[i] < minRaw { minRaw = rawEle[i] }
        }

        let scale = rawGain > 0.001 ? targetGainM / rawGain : 0.0
        var profile: [ElevationProfilePoint] = []
        profile.reserveCapacity(sampleCount + 1)

        for i in 0...sampleCount {
            let d = JSCompat.jsToFixedNumber((Double(i) / Double(sampleCount)) * distKm, decimals: 2)
            let ele = JSCompat.jsToFixedNumber(baseEle + (rawEle[i] - minRaw) * scale, decimals: 1)
            var gradePct = 0.0
            if i > 0 {
                let prev = profile[i - 1]
                let dMeters = max(25.0, (d - prev.distKm) * 1000.0)
                gradePct = JSCompat.jsToFixedNumber(max(-14.0, min(16.0, ((ele - prev.eleM) / dMeters) * 100.0)), decimals: 1)
            }
            profile.append(ElevationProfilePoint(distKm: d, eleM: ele, gradePct: gradePct))
        }

        let hint = "\(route.origin ?? "") \(route.destination ?? "") \(route.gpxFileName ?? "")"
        let terrainSummary = buildTerrainSummaryFromProfile(
            profile,
            distanceKm: distKm,
            elevationGainM: targetGainM,
            titleHint: hint,
            coordinates: route.coordinates
        )

        let enriched = profile.enumerated().map { idx, pt -> ElevationProfilePoint in
            var copy = pt
            if let ps = terrainSummary.surfaceBreakdown?.pointSurfaces, idx < ps.count {
                copy.surfaceType = ps[idx]
            } else {
                copy.surfaceType = .paved
            }
            return copy
        }

        return SynthesizedElevationResult(elevationProfile: enriched, terrainSummary: terrainSummary)
    }

    private final class GpxXmlDelegate: NSObject, XMLParserDelegate {
        var trkpts: [(lat: Double, lng: Double, ele: Double?)] = []
        var rtepts: [(lat: Double, lng: Double, ele: Double?)] = []
        var wpts: [(lat: Double, lng: Double, ele: Double?)] = []
        var trackName: String?

        private var currentPointTag: String?
        private var currentLat: Double?
        private var currentLon: Double?
        private var currentEleText = ""
        private var inEle = false
        private var inName = false
        private var currentNameText = ""
        private var elementStack: [String] = []
        private var foundFirstNamedTrack = false

        func parser(
            _ parser: XMLParser,
            didStartElement elementName: String,
            namespaceURI: String?,
            qualifiedName qName: String?,
            attributes attributeDict: [String: String] = [:]
        ) {
            let local = elementName.components(separatedBy: ":").last ?? elementName
            elementStack.append(local)
            if local == "trkpt" || local == "rtept" || local == "wpt" {
                currentPointTag = local
                currentLat = attributeDict["lat"].flatMap(Double.init)
                currentLon = attributeDict["lon"].flatMap(Double.init)
                currentEleText = ""
            } else if local == "ele", currentPointTag != nil {
                inEle = true
                currentEleText = ""
            } else if local == "name", trackName == nil, currentPointTag == nil {
                inName = true
                currentNameText = ""
            }
        }

        func parser(_ parser: XMLParser, foundCharacters string: String) {
            if inEle {
                currentEleText += string
            } else if inName {
                currentNameText += string
            }
        }

        func parser(
            _ parser: XMLParser,
            didEndElement elementName: String,
            namespaceURI: String?,
            qualifiedName qName: String?
        ) {
            let local = elementName.components(separatedBy: ":").last ?? elementName
            if local == "ele" {
                inEle = false
            } else if local == "name", inName {
                inName = false
                let trimmed = currentNameText.trimmingCharacters(in: .whitespacesAndNewlines)
                if !trimmed.isEmpty {
                    let isInTrkOrRte = elementStack.contains("trk") || elementStack.contains("rte")
                    if isInTrkOrRte || !foundFirstNamedTrack {
                        trackName = trimmed
                        if isInTrkOrRte { foundFirstNamedTrack = true }
                    }
                }
            } else if local == currentPointTag {
                if let lat = currentLat, let lon = currentLon {
                    let ele = Double(currentEleText.trimmingCharacters(in: .whitespacesAndNewlines))
                    let pt = (lat: lat, lng: lon, ele: ele)
                    if local == "trkpt" { trkpts.append(pt) }
                    else if local == "rtept" { rtepts.append(pt) }
                    else if local == "wpt" { wpts.append(pt) }
                }
                currentPointTag = nil
                currentLat = nil
                currentLon = nil
            }
            if !elementStack.isEmpty {
                elementStack.removeLast()
            }
        }
    }

    private static func haversineKm(_ lat1: Double, _ lon1: Double, _ lat2: Double, _ lon2: Double) -> Double {
        let R = 6371.0
        let dLat = JSCompat.toRad(lat2 - lat1)
        let dLon = JSCompat.toRad(lon2 - lon1)
        let a = sin(dLat / 2.0) * sin(dLat / 2.0) +
            cos(JSCompat.toRad(lat1)) * cos(JSCompat.toRad(lat2)) *
            sin(dLon / 2.0) * sin(dLon / 2.0)
        let c = 2.0 * atan2(sqrt(a), sqrt(1.0 - a))
        return R * c
    }

    public static func parseGpxFileContent(_ gpxText: String, fileNameHint: String = "") -> GpxParseResult? {
        guard let data = gpxText.data(using: .utf8) else { return nil }
        let delegate = GpxXmlDelegate()
        let parser = XMLParser(data: data)
        parser.delegate = delegate
        guard parser.parse() else { return nil }

        let chosenRaw: [(lat: Double, lng: Double, ele: Double?)]
        if delegate.trkpts.count >= 2 { chosenRaw = delegate.trkpts }
        else if delegate.rtepts.count >= 2 { chosenRaw = delegate.rtepts }
        else { chosenRaw = delegate.wpts }

        var rawPoints: [(lat: Double, lng: Double, ele: Double?, cumDistKm: Double)] = []
        var totalDistKm = 0.0

        for pt in chosenRaw {
            guard pt.lat.isFinite, pt.lng.isFinite else { continue }
            if let prev = rawPoints.last {
                let segKm = haversineKm(prev.lat, prev.lng, pt.lat, pt.lng)
                if segKm < 0.002 && rawPoints.count > 1 {
                    continue
                }
                totalDistKm += segKm
            }
            rawPoints.append((pt.lat, pt.lng, pt.ele, totalDistKm))
        }

        guard rawPoints.count >= 2 else { return nil }

        let cleanFileStem = fileNameHint
            .replacingOccurrences(of: #"\.gpx$"#, with: "", options: [.regularExpression, .caseInsensitive])
            .replacingOccurrences(of: #"[_-]+"#, with: " ", options: .regularExpression)
            .trimmingCharacters(in: .whitespacesAndNewlines)
        let rawTrackName = (delegate.trackName ?? "").trimmingCharacters(in: .whitespacesAndNewlines)
        let trackName = !rawTrackName.isEmpty ? rawTrackName : (!cleanFileStem.isEmpty ? cleanFileStem : "Custom GPX Route")

        var originLabel = "\(trackName) (Start)"
        var destLabel = "\(trackName) (Finish)"
        let arrowParts = splitByArrow(trackName)
        if arrowParts.count >= 2, !arrowParts[0].trimmingCharacters(in: .whitespaces).isEmpty, !arrowParts[arrowParts.count - 1].trimmingCharacters(in: .whitespaces).isEmpty {
            originLabel = arrowParts[0].trimmingCharacters(in: .whitespaces)
            destLabel = arrowParts[arrowParts.count - 1].trimmingCharacters(in: .whitespaces)
        } else {
            let first = rawPoints[0]
            let last = rawPoints[rawPoints.count - 1]
            let startEndDist = haversineKm(first.lat, first.lng, last.lat, last.lng)
            if startEndDist < 1.5 && totalDistKm > 4.0 {
                originLabel = trackName
                destLabel = "\(trackName) (Loop)"
            }
        }

        let hasElevation = rawPoints.contains { $0.ele != nil }
        let distanceKm = max(0.5, JSCompat.roundTo(totalDistKm, decimals: 1))

        var elevationGainM = 0.0
        var elevationLossM = 0.0
        var elevationProfile: [ElevationProfilePoint] = []

        if hasElevation {
            var lastKnownEle = rawPoints.first(where: { $0.ele != nil })?.ele ?? 20.0
            let filledEles = rawPoints.map { pt -> Double in
                if let e = pt.ele { lastKnownEle = e }
                return lastKnownEle
            }

            let smoothedEles: [Double] = filledEles.indices.map { idx in
                let start = max(0, idx - 2)
                let end = min(filledEles.count - 1, idx + 2)
                var sum = 0.0
                for k in start...end { sum += filledEles[k] }
                return sum / Double(end - start + 1)
            }

            var anchorEle = smoothedEles[0]
            for i in 1..<smoothedEles.count {
                let diff = smoothedEles[i] - anchorEle
                if diff >= 2.0 {
                    elevationGainM += diff
                    anchorEle = smoothedEles[i]
                } else if diff <= -2.0 {
                    elevationLossM += abs(diff)
                    anchorEle = smoothedEles[i]
                }
            }
            if elevationGainM == 0 && smoothedEles.count > 2 {
                for i in 1..<smoothedEles.count {
                    let d = smoothedEles[i] - smoothedEles[i - 1]
                    if d > 0 { elevationGainM += d }
                    else { elevationLossM += abs(d) }
                }
            }

            let targetSamples = min(360, max(16, rawPoints.count - 1))
            var cursor = 0
            for s in 0...targetSamples {
                let targetDist = (Double(s) / Double(targetSamples)) * totalDistKm
                while cursor < rawPoints.count - 2 && rawPoints[cursor + 1].cumDistKm < targetDist {
                    cursor += 1
                }
                let p0 = rawPoints[cursor]
                let p1 = rawPoints[min(rawPoints.count - 1, cursor + 1)]
                let e0 = smoothedEles[cursor]
                let e1 = smoothedEles[min(smoothedEles.count - 1, cursor + 1)]
                let span = p1.cumDistKm - p0.cumDistKm
                let ratio = span > 0.0001 ? max(0.0, min(1.0, (targetDist - p0.cumDistKm) / span)) : 0.0
                let interpEle = JSCompat.roundTo(e0 + (e1 - e0) * ratio, decimals: 1)
                let distVal = JSCompat.roundTo(targetDist, decimals: 3)

                var gradePct = 0.0
                if let prevSample = elevationProfile.last {
                    let dMeters = max(20.0, (distVal - prevSample.distKm) * 1000.0)
                    gradePct = JSCompat.roundTo(max(-22.0, min(24.0, ((interpEle - prevSample.eleM) / dMeters) * 100.0)), decimals: 1)
                }
                elevationProfile.append(ElevationProfilePoint(distKm: distVal, eleM: interpEle, gradePct: gradePct))
            }
        } else {
            elevationGainM = JSCompat.jsRound(distanceKm * 6.0)
            elevationLossM = elevationGainM
            let synthRoute = RouteParams(
                elevationGainM: elevationGainM,
                origin: originLabel,
                destination: destLabel,
                distanceKm: distanceKm,
                targetSpeedKmH: 24,
                urbanTrafficDelayMinutes: 0,
                gateSecurityDelayMinutes: 0
            )
            elevationProfile = synthesizeRouteElevationProfile(synthRoute).elevationProfile
        }

        let maxCoords = 1200
        let coordinates: [LatLon]
        if rawPoints.count <= maxCoords {
            coordinates = rawPoints.map { LatLon(lat: JSCompat.roundTo($0.lat, decimals: 5), lon: JSCompat.roundTo($0.lng, decimals: 5)) }
        } else {
            var peakIdx = 0
            var peakEle = -Double.infinity
            for (idx, p) in rawPoints.enumerated() {
                if let e = p.ele, e > peakEle {
                    peakEle = e
                    peakIdx = idx
                }
            }
            var selected = Set<Int>([0, rawPoints.count - 1])
            if peakIdx > 0 { selected.insert(peakIdx) }
            let step = Double(rawPoints.count - 1) / Double(maxCoords - 1)
            for i in 1..<(maxCoords - 1) {
                selected.insert(JSCompat.jsRoundInt(Double(i) * step))
            }
            coordinates = selected.sorted().map { idx in
                LatLon(lat: JSCompat.roundTo(rawPoints[idx].lat, decimals: 5), lon: JSCompat.roundTo(rawPoints[idx].lng, decimals: 5))
            }
        }

        let roundedGain = JSCompat.jsRoundInt(elevationGainM)
        let roundedLoss = JSCompat.jsRoundInt(elevationLossM)
        let terrainSummary = buildTerrainSummaryFromProfile(
            elevationProfile,
            distanceKm: distanceKm,
            elevationGainM: Double(roundedGain),
            titleHint: "\(trackName) \(fileNameHint)",
            coordinates: coordinates
        )
        elevationProfile = elevationProfile.enumerated().map { idx, pt in
            var copy = pt
            if let ps = terrainSummary.surfaceBreakdown?.pointSurfaces, idx < ps.count {
                copy.surfaceType = ps[idx]
            } else {
                copy.surfaceType = .paved
            }
            return copy
        }

        return GpxParseResult(
            trackName: trackName,
            originLabel: originLabel,
            destLabel: destLabel,
            coordinates: coordinates,
            distanceKm: distanceKm,
            elevationGainM: roundedGain,
            elevationLossM: roundedLoss,
            elevationProfile: elevationProfile,
            terrainSummary: terrainSummary
        )
    }

    private static func splitByArrow(_ text: String) -> [String] {
        let pattern = #"\s*(?:→|->|—|–|\s-\s|\sto\s|\svers\s)\s*"#
        guard let regex = try? NSRegularExpression(pattern: pattern, options: [.caseInsensitive]) else {
            return [text]
        }
        let ns = text as NSString
        let matches = regex.matches(in: text, options: [], range: NSRange(location: 0, length: ns.length))
        if matches.isEmpty { return [text] }
        var result: [String] = []
        var lastEnd = 0
        for m in matches {
            result.append(ns.substring(with: NSRange(location: lastEnd, length: m.range.location - lastEnd)))
            lastEnd = m.range.location + m.range.length
        }
        result.append(ns.substring(from: lastEnd))
        return result
    }
}
