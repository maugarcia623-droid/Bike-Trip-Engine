import Foundation
@testable import CadenceServices

/// Non-blocking cancellable delay URLProtocol for deterministic timeout & cancellation testing.
/// Uses `DispatchQueue.global().asyncAfter` + `stopLoading()` cancellation (never `Thread.sleep`).
final class OverpassAsyncDelayURLProtocol: URLProtocol, @unchecked Sendable {
    typealias Handler = @Sendable (URLRequest, Data?) throws -> (delay: TimeInterval, response: HTTPURLResponse, data: Data)

    private static let mockIDHeader = "X-Cadence-Overpass-Async-Mock-ID"
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
        config.protocolClasses = [OverpassAsyncDelayURLProtocol.self]
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

enum OverpassTestSupport {
    static func makeHTTPResponse(url: URL, statusCode: Int = 200) -> HTTPURLResponse {
        HTTPURLResponse(
            url: url,
            statusCode: statusCode,
            httpVersion: "HTTP/1.1",
            headerFields: ["Content-Type": "application/json"]
        )!
    }

    static func decodeFormDataQuery(from bodyData: Data?) -> String? {
        guard let bodyData, let raw = String(data: bodyData, encoding: .utf8),
              raw.hasPrefix("data=") else {
            return nil
        }
        let encoded = String(raw.dropFirst("data=".count))
        return encoded.removingPercentEncoding
    }
}
