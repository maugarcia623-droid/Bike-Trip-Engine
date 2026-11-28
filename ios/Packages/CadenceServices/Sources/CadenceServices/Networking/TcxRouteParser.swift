import Foundation
import CadenceCore

/// Foundation `XMLParser`-based TCX parser mirroring `parseTcxFileContent` in `src/utils/routeFileParser.ts:163-197`.
/// Delegates trackpoint normalization, smoothing, hysteresis, and `TerrainSummary` generation to
/// `CadenceCore.RouteFileParserEngine.buildResultFromPoints`.
public enum TcxRouteParser {
    public static func parseTcxContent(
        _ xmlText: String,
        fileName: String = "route.tcx"
    ) -> GpxParseResult? {
        guard let data = xmlText.data(using: .utf8), !data.isEmpty else {
            return nil
        }

        let delegate = TcxXmlDelegate()
        let parser = XMLParser(data: data)
        parser.delegate = delegate
        guard parser.parse() else {
            return nil
        }

        let trackName = delegate.courseName ?? delegate.activityNotes ?? delegate.activityId
        return RouteFileParserEngine.buildResultFromPoints(
            points: delegate.points,
            trackName: trackName,
            fileName: fileName
        )
    }
}

private final class TcxXmlDelegate: NSObject, XMLParserDelegate {
    var points: [(lat: Double, lng: Double, ele: Double?)] = []
    var courseName: String?
    var activityNotes: String?
    var activityId: String?

    private var elementStack: [String] = []
    private var currentText = ""

    private var inTrackpoint = false
    private var tpLat: Double?
    private var tpLon: Double?
    private var tpEle: Double?

    private static func localTagName(_ rawName: String) -> String {
        if let idx = rawName.lastIndex(of: ":") {
            return String(rawName[rawName.index(after: idx)...])
        }
        return rawName
    }

    func parser(
        _ parser: XMLParser,
        didStartElement elementName: String,
        namespaceURI: String?,
        qualifiedName qName: String?,
        attributes attributeDict: [String: String] = [:]
    ) {
        let tag = Self.localTagName(elementName)
        elementStack.append(tag)
        currentText = ""

        if tag == "Trackpoint" {
            inTrackpoint = true
            tpLat = nil
            tpLon = nil
            tpEle = nil
        }
    }

    func parser(_ parser: XMLParser, foundCharacters string: String) {
        currentText += string
    }

    func parser(
        _ parser: XMLParser,
        didEndElement elementName: String,
        namespaceURI: String?,
        qualifiedName qName: String?
    ) {
        let tag = Self.localTagName(elementName)
        let trimmed = currentText.trimmingCharacters(in: .whitespacesAndNewlines)
        let parentTag = elementStack.count >= 2 ? elementStack[elementStack.count - 2] : nil

        if !trimmed.isEmpty {
            if tag == "Name", parentTag == "Course", courseName == nil {
                courseName = trimmed
            } else if tag == "Notes", parentTag == "Activity", activityNotes == nil {
                activityNotes = trimmed
            } else if tag == "Id", parentTag == "Activity", activityId == nil {
                activityId = trimmed
            }
        }

        if inTrackpoint {
            if tag == "LatitudeDegrees", parentTag == "Position" {
                if let val = Double(trimmed), val.isFinite {
                    tpLat = val
                }
            } else if tag == "LongitudeDegrees", parentTag == "Position" {
                if let val = Double(trimmed), val.isFinite {
                    tpLon = val
                }
            } else if tag == "AltitudeMeters", parentTag == "Trackpoint" {
                if let val = Double(trimmed), val.isFinite {
                    tpEle = val
                }
            } else if tag == "Trackpoint" {
                if let lat = tpLat, let lon = tpLon {
                    points.append((lat: lat, lng: lon, ele: tpEle))
                }
                inTrackpoint = false
                tpLat = nil
                tpLon = nil
                tpEle = nil
            }
        }

        if !elementStack.isEmpty {
            elementStack.removeLast()
        }
        currentText = ""
    }
}
