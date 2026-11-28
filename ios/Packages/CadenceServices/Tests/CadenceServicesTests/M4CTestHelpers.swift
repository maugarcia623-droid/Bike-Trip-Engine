import Foundation
import CadenceCore
@testable import CadenceServices

/// Non-blocking cancellable delay URLProtocol for M4C timeout, cancellation, and coalescing tests.
/// Uses `DispatchQueue.global(qos: .userInitiated).asyncAfter` + `stopLoading()` cancellation (never `Thread.sleep`).
final class M4CAsyncDelayURLProtocol: URLProtocol, @unchecked Sendable {
    typealias Handler = @Sendable (URLRequest, Data?) throws -> (delay: TimeInterval, response: HTTPURLResponse, data: Data)

    static let mockIDHeader = "X-Cadence-M4C-Async-Mock-ID"
    private static let lock = NSLock()
    private nonisolated(unsafe) static var handlers: [String: Handler] = [:]

    private let stateLock = NSLock()
    private var pendingWorkItem: DispatchWorkItem?
    private var stopped = false

    static func registerSession(handler: @escaping Handler) -> (id: String, session: URLSession) {
        let id = UUID().uuidString
        lock.withLock {
            handlers[id] = handler
        }
        let config = URLSessionConfiguration.ephemeral
        config.protocolClasses = [M4CAsyncDelayURLProtocol.self]
        config.httpAdditionalHeaders = [mockIDHeader: id]
        return (id, URLSession(configuration: config))
    }

    static func unregister(id: String) {
        lock.withLock {
            _ = handlers.removeValue(forKey: id)
        }
    }

    private static func handler(for request: URLRequest) -> Handler? {
        guard let id = request.value(forHTTPHeaderField: mockIDHeader) else { return nil }
        return lock.withLock { handlers[id] }
    }

    override class func canInit(with request: URLRequest) -> Bool {
        request.value(forHTTPHeaderField: mockIDHeader) != nil
    }

    override class func canonicalRequest(for request: URLRequest) -> URLRequest {
        request
    }

    override func startLoading() {
        guard let handler = Self.handler(for: request) else {
            client?.urlProtocol(self, didFailWithError: URLError(.badServerResponse))
            return
        }

        let bodyData = MockURLProtocol.extractBody(from: request)

        do {
            let (delay, response, data) = try handler(request, bodyData)
            if delay <= 0 {
                let isStopped = stateLock.withLock { stopped }
                guard !isStopped else { return }
                client?.urlProtocol(self, didReceive: response, cacheStoragePolicy: .notAllowed)
                client?.urlProtocol(self, didLoad: data)
                client?.urlProtocolDidFinishLoading(self)
                return
            }

            let workItem = DispatchWorkItem { [weak self] in
                guard let self else { return }
                let isStopped = self.stateLock.withLock { self.stopped }
                guard !isStopped else { return }
                self.client?.urlProtocol(self, didReceive: response, cacheStoragePolicy: .notAllowed)
                self.client?.urlProtocol(self, didLoad: data)
                self.client?.urlProtocolDidFinishLoading(self)
            }
            let shouldSchedule = stateLock.withLock { () -> Bool in
                if stopped { return false }
                pendingWorkItem = workItem
                return true
            }
            if shouldSchedule {
                DispatchQueue.global(qos: .userInitiated).asyncAfter(deadline: .now() + delay, execute: workItem)
            }
        } catch {
            client?.urlProtocol(self, didFailWithError: error)
        }
    }

    override func stopLoading() {
        let item = stateLock.withLock { () -> DispatchWorkItem? in
            stopped = true
            let current = pendingWorkItem
            pendingWorkItem = nil
            return current
        }
        item?.cancel()
    }
}

enum M4CTestSupport {
    static func makeHTTPResponse(
        url: URL,
        statusCode: Int = 200,
        headers: [String: String] = ["Content-Type": "application/json"]
    ) -> HTTPURLResponse {
        HTTPURLResponse(
            url: url,
            statusCode: statusCode,
            httpVersion: "HTTP/1.1",
            headerFields: headers
        )!
    }

    static func makeJSONResponse(
        url: URL,
        statusCode: Int = 200,
        object: Any
    ) throws -> (HTTPURLResponse, Data) {
        let data = try JSONSerialization.data(withJSONObject: object, options: [])
        let response = makeHTTPResponse(url: url, statusCode: statusCode)
        return (response, data)
    }

    static func decodeJSONBody(_ data: Data?) -> [String: Any]? {
        guard let data else { return nil }
        return try? JSONSerialization.jsonObject(with: data) as? [String: Any]
    }

    static func makeCoordinates(
        count: Int,
        startLat: Double = 47.2184,
        startLon: Double = -1.5536,
        latStep: Double = 0.002,
        lonStep: Double = 0.003
    ) -> [LatLon] {
        (0..<count).map { idx in
            LatLon(
                lat: startLat + Double(idx) * latStep,
                lon: startLon + Double(idx) * lonStep
            )
        }
    }

    static func makeWavyCoordinates(
        count: Int,
        latStart: Double = 47.2,
        lonStart: Double = -1.5
    ) -> [LatLon] {
        (0..<count).map { i in
            let t = Double(i) / Double(max(1, count - 1))
            let lat = latStart + t * 0.4 + sin(t * .pi * 5.0) * 0.03
            let lon = lonStart + t * 0.6 + cos(t * .pi * 3.0) * 0.02
            return LatLon(lat: lat, lon: lon)
        }
    }

    static func makeSampleTrip(
        id: String = "trip-m4c-1",
        name: String = "Loire Valley Tempo",
        coordinateCount: Int = 20,
        distanceKm: Double = 48.0,
        departureDate: String = "2026-11-29",
        departureTime: String = "08:30",
        arriveAtMode: Bool = false
    ) -> TripProfile {
        let coords = makeCoordinates(count: coordinateCount)
        return TripProfile(
            departureDate: departureDate,
            departureTime: departureTime,
            id: id,
            name: name,
            tag: "SPORT",
            description: "Test ride",
            updatedAt: "2026-11-28T08:00:00Z",
            physics: PhysicsParams(
                luggageWeightKg: 2.0,
                riderWeightKg: 70.0,
                bikeWeightKg: 9.0,
                gearWeightKg: 2.0,
                cda: 0.34,
                crr: 0.0045
            ),
            route: RouteParams(
                elevationGainM: 380,
                origin: "Nantes",
                destination: "Angers",
                distanceKm: distanceKm,
                targetSpeedKmH: 27.0,
                pacingMode: "speed",
                urbanTrafficDelayMinutes: 0,
                gateSecurityDelayMinutes: 0,
                coordinates: coords,
                routeMode: "corridor"
            ),
            office: OfficeConstraints(
                shiftStartTime: "10:30",
                targetGateArrivalTime: "10:30",
                gateName: "Angers",
                lockerRefuelMinutes: 0,
                showerChangeMinutes: 0,
                breakRoomBreakfastMinutes: 0,
                strictNoFoodInOpenSpace: false,
                badgeRequiredForGate: false,
                notes: ""
            ),
            weather: WeatherCondition(
                isHeadwindActive: true,
                baseWindSpeedKmH: 12,
                windDirectionDegrees: 240,
                temperatureC: 14,
                precipitationRiskPercent: 10
            ),
            checklist: [],
            arriveAtMode: arriveAtMode
        )
    }

    static func makeSampleGpx(name: String = "Nantes -> Angers") -> String {
        """
        <?xml version="1.0" encoding="UTF-8"?>
        <gpx version="1.1" creator="CadenceTest" xmlns="http://www.topografix.com/GPX/1/1">
          <trk>
            <name>\(name)</name>
            <trkseg>
              <trkpt lat="47.2184" lon="-1.5536"><ele>18.0</ele></trkpt>
              <trkpt lat="47.2500" lon="-1.4200"><ele>42.0</ele></trkpt>
              <trkpt lat="47.3100" lon="-1.2100"><ele>29.0</ele></trkpt>
              <trkpt lat="47.4784" lon="-0.5632"><ele>35.0</ele></trkpt>
            </trkseg>
          </trk>
        </gpx>
        """
    }

    static func makeSampleTcx(courseName: String = "Loire Gravel Loop") -> String {
        """
        <?xml version="1.0" encoding="UTF-8"?>
        <TrainingCenterDatabase xmlns="http://www.garmin.com/xmlschemas/TrainingCenterDatabase/v2">
          <Courses>
            <Course>
              <Name>\(courseName)</Name>
              <Track>
                <Trackpoint>
                  <Position>
                    <LatitudeDegrees>47.2184</LatitudeDegrees>
                    <LongitudeDegrees>-1.5536</LongitudeDegrees>
                  </Position>
                  <AltitudeMeters>22.0</AltitudeMeters>
                </Trackpoint>
                <Trackpoint>
                  <Position>
                    <LatitudeDegrees>47.2684</LatitudeDegrees>
                    <LongitudeDegrees>-1.4536</LongitudeDegrees>
                  </Position>
                  <AltitudeMeters>68.0</AltitudeMeters>
                </Trackpoint>
                <Trackpoint>
                  <Position>
                    <LatitudeDegrees>47.3184</LatitudeDegrees>
                    <LongitudeDegrees>-1.3536</LongitudeDegrees>
                  </Position>
                  <AltitudeMeters>31.0</AltitudeMeters>
                </Trackpoint>
              </Track>
            </Course>
          </Courses>
        </TrainingCenterDatabase>
        """
    }
}
