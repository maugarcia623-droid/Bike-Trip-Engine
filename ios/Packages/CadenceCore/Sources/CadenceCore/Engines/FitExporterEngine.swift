import Foundation

public struct FitExportOptions: Sendable {
    public var includeFuelingCues: Bool
    public var includeClimbCues: Bool
    public var fuelIntervalMinutes: Int
    public var lang: CadenceLang
    public var ftpWatts: Double?
    public var carbTargetGPerHr: Double?
    public var nutritionPreference: NutritionPreference?
    public var carbPacingMode: String?
    public var isLockedCarbTarget: Bool?
    public var riderLevel: RiderLevel?
    public var exportTimestampMs: Double?

    public init(
        includeFuelingCues: Bool = true,
        includeClimbCues: Bool = true,
        fuelIntervalMinutes: Int = 35,
        lang: CadenceLang = .en,
        ftpWatts: Double? = nil,
        carbTargetGPerHr: Double? = nil,
        nutritionPreference: NutritionPreference? = nil,
        carbPacingMode: String? = nil,
        isLockedCarbTarget: Bool? = nil,
        riderLevel: RiderLevel? = nil,
        exportTimestampMs: Double? = nil
    ) {
        self.includeFuelingCues = includeFuelingCues
        self.includeClimbCues = includeClimbCues
        self.fuelIntervalMinutes = fuelIntervalMinutes
        self.lang = lang
        self.ftpWatts = ftpWatts
        self.carbTargetGPerHr = carbTargetGPerHr
        self.nutritionPreference = nutritionPreference
        self.carbPacingMode = carbPacingMode
        self.isLockedCarbTarget = isLockedCarbTarget
        self.riderLevel = riderLevel
        self.exportTimestampMs = exportTimestampMs
    }
}

public struct FitCoursePointPreview: Codable, Sendable, Equatable {
    public var timestamp: Int
    public var lat: Double
    public var lon: Double
    public var distanceMeters: Double
    public var type: Int
    public var name: String
}

public struct FitBinaryInspection: Codable, Sendable, Equatable {
    public var byteLength: Int
    public var headerSize: Int
    public var signature: String
    public var headerCrcValid: Bool
    public var fileCrcValid: Bool
    public var courseName: String
    public var recordCount: Int
    public var coursePointCount: Int
    public var coursePoints: [FitCoursePointPreview]
}

public enum FitExporterEngine {
    private static let fitEpochOffsetSec: UInt32 = 631065600
    private static let degToSemicircles: Double = 2147483648.0 / 180.0

    private static let crcTable: [UInt16] = [
        0x0000, 0xcc01, 0xd801, 0x1400, 0xf001, 0x3c00, 0x2800, 0xe401,
        0xa001, 0x6c00, 0x7800, 0xb401, 0x5000, 0x9c01, 0x8801, 0x4400
    ]

    public static func computeFitCrc16(_ bytes: [UInt8], start: Int = 0, end: Int? = nil) -> UInt16 {
        let endIdx = end ?? bytes.count
        var crc: UInt16 = 0
        for i in start..<endIdx {
            let byte = Int(bytes[i])
            var tmp = crcTable[Int(crc & 0xf)]
            crc = (crc >> 4) & 0x0fff
            crc = crc ^ tmp ^ crcTable[byte & 0xf]

            tmp = crcTable[Int(crc & 0xf)]
            crc = (crc >> 4) & 0x0fff
            crc = crc ^ tmp ^ crcTable[(byte >> 4) & 0xf]
        }
        return crc & 0xffff
    }

    private final class FitByteWriter {
        var buf: [UInt8] = []

        func writeUint8(_ v: Int) {
            buf.append(UInt8(truncatingIfNeeded: v))
        }

        func writeUint16LE(_ v: Int) {
            buf.append(UInt8(truncatingIfNeeded: v & 0xff))
            buf.append(UInt8(truncatingIfNeeded: (v >> 8) & 0xff))
        }

        func writeUint32LE(_ v: UInt32) {
            buf.append(UInt8(truncatingIfNeeded: v & 0xff))
            buf.append(UInt8(truncatingIfNeeded: (v >> 8) & 0xff))
            buf.append(UInt8(truncatingIfNeeded: (v >> 16) & 0xff))
            buf.append(UInt8(truncatingIfNeeded: (v >> 24) & 0xff))
        }

        func writeSint32LE(_ v: Double) {
            let i = Int32(JSCompat.jsRoundInt(v))
            writeUint32LE(UInt32(bitPattern: i))
        }

        func writeFixedString(_ text: String, byteLen: Int) {
            let maxBytes = max(0, byteLen - 1)
            let truncated = JSCompat.utf8Truncate(text, maxBytes: maxBytes)
            let utf8 = Array(truncated.utf8)
            for i in 0..<byteLen {
                buf.append(i < utf8.count ? utf8[i] : 0)
            }
        }
    }

    private static func mapAmenityToCoursePointType(_ category: AmenityCategory) -> Int {
        switch category {
        case .water, .cemetery: return 11
        case .food: return 10
        case .mechanix, .essentials: return 14
        case .bailout: return 0
        }
    }

    private static func mapCueToCoursePointType(_ direction: RouteCueDirection) -> Int {
        switch direction {
        case .left: return 6
        case .right: return 7
        case .slightLeft: return 19
        case .sharpLeft: return 20
        case .slightRight: return 21
        case .sharpRight: return 22
        case .straight: return 23
        default: return 0
        }
    }

    private static func mapClimbCategoryToCoursePointType(_ category: ClimbCategory) -> Int {
        switch category {
        case .hc: return 31
        case .cat1: return 30
        case .cat2: return 29
        case .cat3: return 28
        case .cat4, .hill: return 27
        }
    }

    private static func interpolateCoordAtDistM(
        coords: [LatLon],
        cumMeters: [Double],
        rawTotalM: Double,
        targetTotalM: Double,
        distM: Double
    ) -> LatLon {
        if coords.isEmpty { return LatLon(lat: 47.2184, lon: -1.5536) }
        if coords.count == 1 { return coords[0] }
        let scale = (targetTotalM > 0 && rawTotalM > 0) ? (rawTotalM / targetTotalM) : 1.0
        let rawDistM = max(0.0, min(rawTotalM, distM * scale))
        for i in 1..<coords.count {
            if cumMeters[i] >= rawDistM {
                let span = cumMeters[i] - cumMeters[i - 1]
                let t = span > 0 ? (rawDistM - cumMeters[i - 1]) / span : 0.0
                return LatLon(
                    lat: coords[i - 1].lat + (coords[i].lat - coords[i - 1].lat) * t,
                    lon: coords[i - 1].lon + (coords[i].lon - coords[i - 1].lon) * t
                )
            }
        }
        return coords[coords.count - 1]
    }

    private static func interpolateElevation(distKm: Double, profile: [ElevationProfilePoint]?) -> Double {
        guard let profile = profile, !profile.isEmpty else { return 20.0 }
        if distKm <= profile[0].distKm { return profile[0].eleM }
        for i in 1..<profile.count {
            if profile[i].distKm >= distKm {
                let p0 = profile[i - 1]
                let p1 = profile[i]
                let span = p1.distKm - p0.distKm
                let t = span > 0 ? (distKm - p0.distKm) / span : 0.0
                return p0.eleM + (p1.eleM - p0.eleM) * t
            }
        }
        return profile[profile.count - 1].eleM
    }

    public static func exportTripToFit(
        _ trip: TripProfile,
        options: FitExportOptions = FitExportOptions(),
        riderSpecs: RiderBikeSpecs = .defaultSpecs
    ) -> Data {
        let coords: [LatLon] = (trip.route.coordinates?.count ?? 0) >= 2
            ? trip.route.coordinates!
            : [LatLon(lat: 47.2184, lon: -1.5536), LatLon(lat: 47.2734, lon: -2.2139)]

        let cumMeters = OverpassWaterGapEngine.computeCumulativeDistances(coords)
        let rawTotalM = (cumMeters.last ?? 0) > 0 ? cumMeters.last! : 1000.0
        let targetTotalM = max(rawTotalM, trip.route.distanceKm * 1000.0)
        let physicsResult = PhysicsEngine.calculatePhysics(
            physics: trip.physics,
            route: trip.route,
            weather: trip.weather,
            lang: options.lang,
            ftpOverride: options.ftpWatts,
            riderSpecs: riderSpecs
        )
        let avgSpeedKmH = max(8.0, physicsResult.effectiveSpeedKmH > 0 ? physicsResult.effectiveSpeedKmH : (trip.route.targetSpeedKmH > 0 ? trip.route.targetSpeedKmH : 22.0))
        let totalMassKg =
            (trip.physics.riderWeightKg > 0 ? trip.physics.riderWeightKg : 70.0) +
            (trip.physics.bikeWeightKg > 0 ? trip.physics.bikeWeightKg : 9.0) +
            (trip.physics.gearWeightKg > 0 ? trip.physics.gearWeightKg : 2.0)

        let pacingProfile: [ElevationProfilePoint]
        if let existing = trip.route.elevationProfile, existing.count >= 2 {
            pacingProfile = existing
        } else {
            pacingProfile = GpxParserEngine.synthesizeRouteElevationProfile(trip.route).elevationProfile
        }

        let pacingCurve = ClimbSplitsEngine.buildClimbAdjustedPacingCurve(
            pacingProfile,
            totalDistanceKm: targetTotalM / 1000.0,
            avgFlatSpeedKmH: avgSpeedKmH,
            totalMassKg: totalMassKg
        )
        let totalElapsedSec = max(
            60,
            JSCompat.jsRoundInt(pacingCurve.last?.elapsedSec ?? (targetTotalM / max(2.0, avgSpeedKmH / 3.6)))
        )

        let timestampMs = options.exportTimestampMs ?? (Date().timeIntervalSince1970 * 1000.0)
        let unixSec = UInt32(max(0, Int(floor(timestampMs / 1000.0))))
        let nowFitSec: UInt32 = unixSec > fitEpochOffsetSec ? (unixSec - fitEpochOffsetSec) : 1

        let w = FitByteWriter()

        // Local msg 0: file_id (global 0)
        w.writeUint8(0x40); w.writeUint8(0); w.writeUint8(0); w.writeUint16LE(0); w.writeUint8(5)
        w.writeUint8(0); w.writeUint8(1); w.writeUint8(0)
        w.writeUint8(1); w.writeUint8(2); w.writeUint8(132)
        w.writeUint8(2); w.writeUint8(2); w.writeUint8(132)
        w.writeUint8(3); w.writeUint8(4); w.writeUint8(140)
        w.writeUint8(4); w.writeUint8(4); w.writeUint8(134)

        w.writeUint8(0x00)
        w.writeUint8(6)
        w.writeUint16LE(1)
        w.writeUint16LE(1)
        w.writeUint32LE(0x20261115)
        w.writeUint32LE(nowFitSec)

        // Local msg 1: course (global 31)
        w.writeUint8(0x41); w.writeUint8(0); w.writeUint8(0); w.writeUint16LE(31); w.writeUint8(1)
        w.writeUint8(5); w.writeUint8(24); w.writeUint8(7)

        w.writeUint8(0x01)
        w.writeFixedString(trip.name.isEmpty ? "Cadence Route" : trip.name, byteLen: 24)

        // Local msg 2: lap (global 19)
        w.writeUint8(0x42); w.writeUint8(0); w.writeUint8(0); w.writeUint16LE(19); w.writeUint8(9)
        w.writeUint8(253); w.writeUint8(4); w.writeUint8(134)
        w.writeUint8(2); w.writeUint8(4); w.writeUint8(134)
        w.writeUint8(3); w.writeUint8(4); w.writeUint8(133)
        w.writeUint8(4); w.writeUint8(4); w.writeUint8(133)
        w.writeUint8(5); w.writeUint8(4); w.writeUint8(133)
        w.writeUint8(6); w.writeUint8(4); w.writeUint8(133)
        w.writeUint8(7); w.writeUint8(4); w.writeUint8(134)
        w.writeUint8(8); w.writeUint8(4); w.writeUint8(134)
        w.writeUint8(9); w.writeUint8(4); w.writeUint8(134)

        w.writeUint8(0x02)
        w.writeUint32LE(nowFitSec)
        w.writeUint32LE(nowFitSec)
        w.writeSint32LE(coords[0].lat * degToSemicircles)
        w.writeSint32LE(coords[0].lon * degToSemicircles)
        w.writeSint32LE(coords[coords.count - 1].lat * degToSemicircles)
        w.writeSint32LE(coords[coords.count - 1].lon * degToSemicircles)
        w.writeUint32LE(UInt32(totalElapsedSec) * 1000)
        w.writeUint32LE(UInt32(totalElapsedSec) * 1000)
        w.writeUint32LE(UInt32(JSCompat.jsRoundInt(targetTotalM * 100.0)))

        // Local msg 3: event (global 21)
        w.writeUint8(0x43); w.writeUint8(0); w.writeUint8(0); w.writeUint16LE(21); w.writeUint8(3)
        w.writeUint8(253); w.writeUint8(4); w.writeUint8(134)
        w.writeUint8(0); w.writeUint8(1); w.writeUint8(0)
        w.writeUint8(1); w.writeUint8(1); w.writeUint8(0)

        w.writeUint8(0x03)
        w.writeUint32LE(nowFitSec)
        w.writeUint8(0)
        w.writeUint8(0)

        // Local msg 4: record (global 20)
        w.writeUint8(0x44); w.writeUint8(0); w.writeUint8(0); w.writeUint16LE(20); w.writeUint8(5)
        w.writeUint8(253); w.writeUint8(4); w.writeUint8(134)
        w.writeUint8(0); w.writeUint8(4); w.writeUint8(133)
        w.writeUint8(1); w.writeUint8(4); w.writeUint8(133)
        w.writeUint8(5); w.writeUint8(4); w.writeUint8(134)
        w.writeUint8(2); w.writeUint8(2); w.writeUint8(132)

        let distScale = rawTotalM > 0 ? (targetTotalM / rawTotalM) : 1.0
        for i in 0..<coords.count {
            let distM = cumMeters[i] * distScale
            let tSec = nowFitSec + UInt32(JSCompat.jsRoundInt(ClimbSplitsEngine.interpolateElapsedSecondsAtKm(pacingCurve, distM / 1000.0)))
            let eleM = interpolateElevation(distKm: distM / 1000.0, profile: trip.route.elevationProfile)
            let rawAlt = max(0, min(65534, JSCompat.jsRoundInt((eleM + 500.0) * 5.0)))

            w.writeUint8(0x04)
            w.writeUint32LE(tSec)
            w.writeSint32LE(coords[i].lat * degToSemicircles)
            w.writeSint32LE(coords[i].lon * degToSemicircles)
            w.writeUint32LE(UInt32(JSCompat.jsRoundInt(distM * 100.0)))
            w.writeUint16LE(rawAlt)
        }

        struct FitCoursePoint {
            var lat: Double
            var lon: Double
            var distM: Double
            var type: Int
            var name: String
        }

        var coursePoints: [FitCoursePoint] = []
        for stop in trip.pinnedAmenities ?? [] {
            let snapped = OverpassWaterGapEngine.snapToPolyline(lat: stop.lat, lon: stop.lon, coordinates: coords, cumDistancesMeters: cumMeters)
            let distM = max(0.0, min(targetTotalM, snapped.routeKm * 1000.0 * distScale))
            coursePoints.append(FitCoursePoint(
                lat: stop.lat,
                lon: stop.lon,
                distM: distM,
                type: mapAmenityToCoursePointType(stop.category),
                name: !stop.name.isEmpty ? stop.name : stop.category.rawValue
            ))
        }

        for cue in trip.route.cueSheet ?? [] {
            if cue.direction == .depart || cue.direction == .arrive { continue }
            coursePoints.append(FitCoursePoint(
                lat: cue.lat,
                lon: cue.lng,
                distM: max(0.0, min(targetTotalM, cue.distKm * 1000.0)),
                type: mapCueToCoursePointType(cue.direction),
                name: (cue.streetName?.isEmpty == false) ? cue.streetName! : cue.instruction
            ))
        }

        if options.includeFuelingCues || options.includeClimbCues {
            let splitSummary = ClimbSplitsEngine.computeClimbSplitsAndFueling(
                trip,
                physicsResult: physicsResult,
                lang: options.lang,
                options: ClimbSplitsOptions(
                    ftpWatts: options.ftpWatts,
                    carbTargetGPerHr: options.carbTargetGPerHr,
                    isLockedCarbTarget: options.isLockedCarbTarget,
                    carbPacingMode: options.carbPacingMode,
                    riderLevel: options.riderLevel,
                    nutritionPreference: options.nutritionPreference,
                    departureTimeHHMM: trip.departureTime,
                    checkpointIntervalMinutes: options.fuelIntervalMinutes
                ),
                riderSpecs: riderSpecs
            )

            if options.includeClimbCues {
                for climb in splitSummary.climbs {
                    let distM = max(0.0, min(targetTotalM, climb.startKm * 1000.0))
                    let coord = interpolateCoordAtDistM(coords: coords, cumMeters: cumMeters, rawTotalM: rawTotalM, targetTotalM: targetTotalM, distM: distM)
                    let catTag = climb.category == .hc ? "HC" : (climb.category == .hill ? "Climb" : "C\(climb.category.rawValue)")
                    let lenStr = climb.lengthKm == climb.lengthKm.rounded() ? String(Int(climb.lengthKm)) : String(climb.lengthKm)
                    let shortName = String("\(catTag) \(lenStr)km \(JSCompat.jsRoundInt(climb.avgGradePct))%".prefix(15))
                    coursePoints.append(FitCoursePoint(
                        lat: coord.lat,
                        lon: coord.lon,
                        distM: distM,
                        type: mapClimbCategoryToCoursePointType(climb.category),
                        name: shortName
                    ))
                }
            }

            if options.includeFuelingCues {
                for cp in splitSummary.checkpoints {
                    let distM = max(0.0, min(targetTotalM, cp.distKm * 1000.0))
                    let coord = interpolateCoordAtDistM(coords: coords, cumMeters: cumMeters, rawTotalM: rawTotalM, targetTotalM: targetTotalM, distM: distM)
                    coursePoints.append(FitCoursePoint(
                        lat: coord.lat,
                        lon: coord.lon,
                        distM: distM,
                        type: cp.kind == "hydration" ? 11 : 10,
                        name: String(cp.shortFitCue.prefix(15))
                    ))
                }
            }
        }

        coursePoints.sort { $0.distM < $1.distM }

        if !coursePoints.isEmpty {
            w.writeUint8(0x45); w.writeUint8(0); w.writeUint8(0); w.writeUint16LE(32); w.writeUint8(6)
            w.writeUint8(1); w.writeUint8(4); w.writeUint8(134)
            w.writeUint8(2); w.writeUint8(4); w.writeUint8(133)
            w.writeUint8(3); w.writeUint8(4); w.writeUint8(133)
            w.writeUint8(4); w.writeUint8(4); w.writeUint8(134)
            w.writeUint8(5); w.writeUint8(1); w.writeUint8(0)
            w.writeUint8(6); w.writeUint8(16); w.writeUint8(7)

            for cp in coursePoints {
                let tSec = nowFitSec + UInt32(JSCompat.jsRoundInt(ClimbSplitsEngine.interpolateElapsedSecondsAtKm(pacingCurve, cp.distM / 1000.0)))
                w.writeUint8(0x05)
                w.writeUint32LE(tSec)
                w.writeSint32LE(cp.lat * degToSemicircles)
                w.writeSint32LE(cp.lon * degToSemicircles)
                w.writeUint32LE(UInt32(JSCompat.jsRoundInt(cp.distM * 100.0)))
                w.writeUint8(cp.type)
                w.writeFixedString(cp.name, byteLen: 16)
            }
        }

        // Timer stop event
        w.writeUint8(0x03)
        w.writeUint32LE(nowFitSec + UInt32(totalElapsedSec))
        w.writeUint8(0)
        w.writeUint8(1)

        let dataBytes = w.buf
        let dataSize = dataBytes.count
        var totalBytes = [UInt8](repeating: 0, count: 14 + dataSize + 2)
        totalBytes[0] = 14
        totalBytes[1] = 0x20
        totalBytes[2] = UInt8(2132 & 0xff)
        totalBytes[3] = UInt8((2132 >> 8) & 0xff)
        totalBytes[4] = UInt8(dataSize & 0xff)
        totalBytes[5] = UInt8((dataSize >> 8) & 0xff)
        totalBytes[6] = UInt8((dataSize >> 16) & 0xff)
        totalBytes[7] = UInt8((dataSize >> 24) & 0xff)
        totalBytes[8] = UInt8(ascii: ".")
        totalBytes[9] = UInt8(ascii: "F")
        totalBytes[10] = UInt8(ascii: "I")
        totalBytes[11] = UInt8(ascii: "T")

        let headerCrc = computeFitCrc16(totalBytes, start: 0, end: 12)
        totalBytes[12] = UInt8(headerCrc & 0xff)
        totalBytes[13] = UInt8((headerCrc >> 8) & 0xff)

        for i in 0..<dataSize {
            totalBytes[14 + i] = dataBytes[i]
        }
        let fileCrc = computeFitCrc16(totalBytes, start: 0, end: 14 + dataSize)
        totalBytes[14 + dataSize] = UInt8(fileCrc & 0xff)
        totalBytes[14 + dataSize + 1] = UInt8((fileCrc >> 8) & 0xff)

        return Data(totalBytes)
    }

    public static func inspectFitBinary(_ data: Data) -> FitBinaryInspection {
        let bytes = [UInt8](data)
        let headerSize = Int(bytes[0])
        let sig = String(bytes: bytes[8..<12], encoding: .ascii) ?? ""
        let dataSize = Int(UInt32(bytes[4]) | (UInt32(bytes[5]) << 8) | (UInt32(bytes[6]) << 16) | (UInt32(bytes[7]) << 24))
        let expectedHdrCrc = UInt16(bytes[12]) | (UInt16(bytes[13]) << 8)
        let computedHdrCrc = computeFitCrc16(bytes, start: 0, end: 12)
        let expectedFileCrc = UInt16(bytes[14 + dataSize]) | (UInt16(bytes[15 + dataSize]) << 8)
        let computedFileCrc = computeFitCrc16(bytes, start: 0, end: 14 + dataSize)

        var pos = headerSize
        let dataEnd = headerSize + dataSize
        var defs: [Int: (globalMsgNum: Int, fields: [(fieldNum: Int, size: Int)])] = [:]
        var courseName = ""
        var recordCount = 0
        var coursePoints: [FitCoursePointPreview] = []

        func readU16(_ o: Int) -> Int { Int(bytes[o]) | (Int(bytes[o + 1]) << 8) }
        func readU32(_ o: Int) -> UInt32 {
            UInt32(bytes[o]) | (UInt32(bytes[o + 1]) << 8) | (UInt32(bytes[o + 2]) << 16) | (UInt32(bytes[o + 3]) << 24)
        }
        func readI32(_ o: Int) -> Int32 { Int32(bitPattern: readU32(o)) }

        while pos < dataEnd {
            let hdr = Int(bytes[pos])
            pos += 1
            let isDef = (hdr & 0x40) != 0
            let local = hdr & 0x0f
            if isDef {
                pos += 2 // reserved + arch
                let globalMsgNum = readU16(pos)
                pos += 2
                let numFields = Int(bytes[pos])
                pos += 1
                var fields: [(fieldNum: Int, size: Int)] = []
                for _ in 0..<numFields {
                    fields.append((Int(bytes[pos]), Int(bytes[pos + 1])))
                    pos += 3
                }
                defs[local] = (globalMsgNum, fields)
            } else {
                guard let def = defs[local] else { break }
                var fPos = pos
                if def.globalMsgNum == 31 {
                    var slice: [UInt8] = []
                    for b in bytes[fPos..<(fPos + 24)] {
                        if b == 0 { break }
                        slice.append(b)
                    }
                    courseName = String(decoding: slice, as: UTF8.self)
                } else if def.globalMsgNum == 20 {
                    recordCount += 1
                } else if def.globalMsgNum == 32 {
                    let timestamp = Int(readU32(fPos))
                    let lat = JSCompat.roundTo(Double(readI32(fPos + 4)) * (180.0 / 2147483648.0), decimals: 5)
                    let lon = JSCompat.roundTo(Double(readI32(fPos + 8)) * (180.0 / 2147483648.0), decimals: 5)
                    let distanceMeters = JSCompat.roundTo(Double(readU32(fPos + 12)) / 100.0, decimals: 1)
                    let type = Int(bytes[fPos + 16])
                    var slice: [UInt8] = []
                    for b in bytes[(fPos + 17)..<(fPos + 33)] {
                        if b == 0 { break }
                        slice.append(b)
                    }
                    let name = String(decoding: slice, as: UTF8.self)
                    coursePoints.append(FitCoursePointPreview(
                        timestamp: timestamp,
                        lat: lat,
                        lon: lon,
                        distanceMeters: distanceMeters,
                        type: type,
                        name: name
                    ))
                }
                for f in def.fields { fPos += f.size }
                pos = fPos
            }
        }

        return FitBinaryInspection(
            byteLength: bytes.count,
            headerSize: headerSize,
            signature: sig,
            headerCrcValid: expectedHdrCrc == computedHdrCrc,
            fileCrcValid: expectedFileCrc == computedFileCrc,
            courseName: courseName,
            recordCount: recordCount,
            coursePointCount: coursePoints.count,
            coursePoints: coursePoints
        )
    }
}
