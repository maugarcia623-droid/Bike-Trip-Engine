import Foundation

public struct GpxParseResult: Codable, Sendable, Equatable {
    public var trackName: String?
    public var originLabel: String
    public var destLabel: String
    public var coordinates: [LatLon]
    public var distanceKm: Double
    public var elevationGainM: Int
    public var elevationLossM: Int
    public var elevationProfile: [ElevationProfilePoint]
    public var terrainSummary: TerrainSummary
}

public enum RouteFileParserEngine {
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

    public static func buildResultFromPoints(
        points: [(lat: Double, lng: Double, ele: Double?)],
        trackName: String?,
        fileName: String
    ) -> GpxParseResult? {
        var coordinates: [LatLon] = []
        var rawEle: [Double] = []
        var cumDistKm: [Double] = []
        var totalDistKm = 0.0
        var hasRealEle = false

        for pt in points {
            guard pt.lat.isFinite, pt.lng.isFinite else { continue }
            if let prev = coordinates.last {
                totalDistKm += haversineKm(prev.lat, prev.lon, pt.lat, pt.lng)
            }
            coordinates.append(LatLon(lat: pt.lat, lon: pt.lng))
            cumDistKm.append(totalDistKm)
            if let ele = pt.ele, ele.isFinite {
                hasRealEle = true
                rawEle.append(ele)
            } else {
                rawEle.append(rawEle.last ?? 18.0)
            }
        }

        guard coordinates.count >= 2 else { return nil }

        let smoothedEle: [Double] = rawEle.enumerated().map { i, e in
            if i == 0 || i == rawEle.count - 1 { return e }
            return 0.25 * rawEle[i - 1] + 0.5 * e + 0.25 * rawEle[i + 1]
        }

        var elevationGainM = 0.0
        var elevationLossM = 0.0
        if hasRealEle {
            var anchor = smoothedEle[0]
            for i in 1..<smoothedEle.count {
                let diff = smoothedEle[i] - anchor
                if diff >= 2.0 {
                    elevationGainM += diff
                    anchor = smoothedEle[i]
                } else if diff <= -2.0 {
                    elevationLossM += abs(diff)
                    anchor = smoothedEle[i]
                }
            }
        } else {
            elevationGainM = JSCompat.jsRound(totalDistKm * 6.5)
            elevationLossM = JSCompat.jsRound(totalDistKm * 6.5)
        }

        let targetSamples = min(120, coordinates.count)
        let step = max(1, coordinates.count / targetSamples)
        var elevationProfile: [ElevationProfilePoint] = []

        var i = 0
        while i < coordinates.count {
            let dist = JSCompat.roundTo(cumDistKm[i], decimals: 2)
            let ele = JSCompat.roundTo(smoothedEle[i], decimals: 1)
            var gradePct = 0.0
            if let prev = elevationProfile.last {
                let dMeters = max(15.0, (dist - prev.distKm) * 1000.0)
                gradePct = JSCompat.roundTo(max(-25.0, min(25.0, ((ele - prev.eleM) / dMeters) * 100.0)), decimals: 1)
            }
            elevationProfile.append(ElevationProfilePoint(distKm: dist, eleM: ele, gradePct: gradePct))
            i += step
        }

        let lastIdx = coordinates.count - 1
        if let prev = elevationProfile.last, prev.distKm < JSCompat.roundTo(totalDistKm, decimals: 2) {
            let dist = JSCompat.roundTo(totalDistKm, decimals: 2)
            let ele = JSCompat.roundTo(smoothedEle[lastIdx], decimals: 1)
            let dMeters = max(15.0, (dist - prev.distKm) * 1000.0)
            let gradePct = JSCompat.roundTo(max(-25.0, min(25.0, ((ele - prev.eleM) / dMeters) * 100.0)), decimals: 1)
            elevationProfile.append(ElevationProfilePoint(distKm: dist, eleM: ele, gradePct: gradePct))
        }

        var storedCoords = coordinates
        if coordinates.count > 450 {
            let cStep = Int(ceil(Double(coordinates.count) / 450.0))
            storedCoords = coordinates.enumerated().compactMap { idx, c in
                (idx % cStep == 0 || idx == coordinates.count - 1) ? c : nil
            }
        }

        let roundedDistKm = max(0.5, JSCompat.roundTo(totalDistKm, decimals: 1))
        let roundedGainM = JSCompat.jsRoundInt(elevationGainM)
        let roundedLossM = JSCompat.jsRoundInt(elevationLossM)

        let cleanFileName = fileName.replacingOccurrences(of: #"\.(gpx|tcx|fit)$"#, with: "", options: [.regularExpression, .caseInsensitive])
        var originLabel = !cleanFileName.isEmpty ? cleanFileName : "Route Start"
        var destLabel = !cleanFileName.isEmpty ? "\(cleanFileName) Finish" : "Route Finish"

        if let tn = trackName, !tn.isEmpty {
            let parts = Self.splitByRegex(tn, pattern: #"\s*(?:->|→|↔|-|to|vers)\s*"#)
            if parts.count >= 2, !parts[0].trimmingCharacters(in: .whitespaces).isEmpty, !parts[1].trimmingCharacters(in: .whitespaces).isEmpty {
                originLabel = parts[0].trimmingCharacters(in: .whitespaces)
                destLabel = parts[parts.count - 1].trimmingCharacters(in: .whitespaces)
            } else {
                originLabel = tn
                destLabel = tn
            }
        }

        let terrainSummary = GpxParserEngine.buildTerrainSummaryFromProfile(
            elevationProfile,
            distanceKm: roundedDistKm,
            elevationGainM: Double(roundedGainM),
            titleHint: "\(trackName ?? "") \(fileName)",
            coordinates: storedCoords
        )

        return GpxParseResult(
            trackName: trackName,
            originLabel: originLabel,
            destLabel: destLabel,
            coordinates: storedCoords,
            distanceKm: roundedDistKm,
            elevationGainM: roundedGainM,
            elevationLossM: roundedLossM,
            elevationProfile: elevationProfile,
            terrainSummary: terrainSummary
        )
    }

    private static func splitByRegex(_ text: String, pattern: String) -> [String] {
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

    private struct FitFieldDef {
        var fieldNum: Int
        var size: Int
        var baseType: Int
    }

    private struct FitDefMessage {
        var globalMsgNum: Int
        var littleEndian: Bool
        var fields: [FitFieldDef]
        var devBytes: Int
    }

    private static let semicirclesToDeg = 180.0 / 2147483648.0

    private static func readUInt16(_ bytes: [UInt8], offset: Int, le: Bool) -> Int {
        let b0 = Int(bytes[offset])
        let b1 = Int(bytes[offset + 1])
        return le ? (b0 | (b1 << 8)) : ((b0 << 8) | b1)
    }

    private static func readUInt32(_ bytes: [UInt8], offset: Int, le: Bool) -> UInt32 {
        let b0 = UInt32(bytes[offset])
        let b1 = UInt32(bytes[offset + 1])
        let b2 = UInt32(bytes[offset + 2])
        let b3 = UInt32(bytes[offset + 3])
        return le ? (b0 | (b1 << 8) | (b2 << 16) | (b3 << 24)) : ((b0 << 24) | (b1 << 16) | (b2 << 8) | b3)
    }

    private static func readFitUint(_ bytes: [UInt8], offset: Int, size: Int, le: Bool) -> Int? {
        if size == 1 {
            let v = Int(bytes[offset])
            return v == 0xff ? nil : v
        }
        if size == 2 {
            let v = readUInt16(bytes, offset: offset, le: le)
            return v == 0xffff ? nil : v
        }
        if size == 4 {
            let v = readUInt32(bytes, offset: offset, le: le)
            return v == 0xffffffff ? nil : Int(v)
        }
        return nil
    }

    private static func readFitSint32(_ bytes: [UInt8], offset: Int, le: Bool) -> Int32? {
        let raw = Int32(bitPattern: readUInt32(bytes, offset: offset, le: le))
        return raw == 0x7fffffff ? nil : raw
    }

    private static func readFitString(_ bytes: [UInt8], offset: Int, length: Int) -> String {
        var slice: [UInt8] = []
        for i in 0..<length {
            let b = bytes[offset + i]
            if b == 0 { break }
            slice.append(b)
        }
        if slice.isEmpty { return "" }
        return String(decoding: slice, as: UTF8.self).trimmingCharacters(in: .whitespacesAndNewlines)
    }

    public static func parseFitFileData(_ data: Data, fileName: String = "route.fit") -> GpxParseResult? {
        let bytes = [UInt8](data)
        guard bytes.count >= 14 else { return nil }
        let headerSize = Int(bytes[0])
        guard headerSize >= 12, headerSize <= bytes.count else { return nil }

        let sig = String(bytes: bytes[8..<12], encoding: .ascii)
        guard sig == ".FIT" else { return nil }

        let dataSize = Int(readUInt32(bytes, offset: 4, le: true))
        let dataEnd = min(bytes.count, headerSize + dataSize)
        var pos = headerSize

        var definitions: [Int: FitDefMessage] = [:]
        var points: [(lat: Double, lng: Double, ele: Double?)] = []
        var courseName: String? = nil

        while pos < dataEnd {
            let recordHeader = Int(bytes[pos])
            pos += 1

            let isCompressedTimestamp = (recordHeader & 0x80) != 0
            let isDefinition = !isCompressedTimestamp && (recordHeader & 0x40) != 0
            let hasDevFields = !isCompressedTimestamp && (recordHeader & 0x20) != 0
            let localMsgType = isCompressedTimestamp ? ((recordHeader >> 5) & 0x03) : (recordHeader & 0x0f)

            if isDefinition {
                if pos + 5 > dataEnd { break }
                pos += 1 // reserved
                let arch = bytes[pos]
                let littleEndian = arch == 0
                pos += 1
                let globalMsgNum = readUInt16(bytes, offset: pos, le: littleEndian)
                pos += 2
                let numFields = Int(bytes[pos])
                pos += 1

                var fields: [FitFieldDef] = []
                for _ in 0..<numFields {
                    if pos + 3 > dataEnd { break }
                    fields.append(FitFieldDef(
                        fieldNum: Int(bytes[pos]),
                        size: Int(bytes[pos + 1]),
                        baseType: Int(bytes[pos + 2])
                    ))
                    pos += 3
                }

                var devBytes = 0
                if hasDevFields && pos < dataEnd {
                    let numDevFields = Int(bytes[pos])
                    pos += 1
                    for _ in 0..<numDevFields {
                        if pos + 3 > dataEnd { break }
                        devBytes += Int(bytes[pos + 1])
                        pos += 3
                    }
                }

                definitions[localMsgType] = FitDefMessage(
                    globalMsgNum: globalMsgNum,
                    littleEndian: littleEndian,
                    fields: fields,
                    devBytes: devBytes
                )
            } else {
                guard let def = definitions[localMsgType] else { break }
                var fieldOffset = pos
                var lat: Double? = nil
                var lng: Double? = nil
                var ele: Double? = nil
                var enhEle: Double? = nil

                for f in def.fields {
                    if fieldOffset + f.size > dataEnd {
                        fieldOffset = dataEnd
                        break
                    }
                    if def.globalMsgNum == 20 {
                        if f.fieldNum == 0 && f.size == 4, let raw = readFitSint32(bytes, offset: fieldOffset, le: def.littleEndian) {
                            lat = Double(raw) * semicirclesToDeg
                        } else if f.fieldNum == 1 && f.size == 4, let raw = readFitSint32(bytes, offset: fieldOffset, le: def.littleEndian) {
                            lng = Double(raw) * semicirclesToDeg
                        } else if f.fieldNum == 2 && f.size == 2, let raw = readFitUint(bytes, offset: fieldOffset, size: 2, le: def.littleEndian) {
                            ele = Double(raw) / 5.0 - 500.0
                        } else if f.fieldNum == 78 && f.size == 4, let raw = readFitUint(bytes, offset: fieldOffset, size: 4, le: def.littleEndian) {
                            enhEle = Double(raw) / 5.0 - 500.0
                        }
                    } else if def.globalMsgNum == 31 && f.fieldNum == 5 {
                        let name = readFitString(bytes, offset: fieldOffset, length: f.size)
                        if !name.isEmpty { courseName = name }
                    }
                    fieldOffset += f.size
                }

                if def.globalMsgNum == 20, let lat = lat, let lng = lng, abs(lat) <= 90, abs(lng) <= 180 {
                    points.append((lat: lat, lng: lng, ele: enhEle ?? ele))
                }
                pos = fieldOffset + def.devBytes
            }
        }

        return buildResultFromPoints(points: points, trackName: courseName, fileName: fileName)
    }
}
