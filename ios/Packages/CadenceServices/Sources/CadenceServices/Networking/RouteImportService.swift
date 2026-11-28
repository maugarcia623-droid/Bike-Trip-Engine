import Foundation
import CadenceCore

public enum RouteUrlProvider: String, Codable, Sendable, CaseIterable, Equatable {
    case komoot
    case bikemap
    case ridewithgps
    case strava
    case directFile = "direct-file"
    case unknown
}

public struct RouteUrlDetection: Sendable, Equatable {
    public var provider: RouteUrlProvider
    public var url: URL?
    public var routeId: String?

    public init(provider: RouteUrlProvider, url: URL? = nil, routeId: String? = nil) {
        self.provider = provider
        self.url = url
        self.routeId = routeId
    }
}

public struct RouteProxyPayload: Codable, Sendable, Equatable {
    public var ok: Bool?
    public var provider: RouteUrlProvider?
    public var routeId: String?
    public var format: String?
    public var fileName: String?
    public var content: String?
    public var contentBase64: String?
    public var reason: String?

    public init(
        ok: Bool? = nil,
        provider: RouteUrlProvider? = nil,
        routeId: String? = nil,
        format: String? = nil,
        fileName: String? = nil,
        content: String? = nil,
        contentBase64: String? = nil,
        reason: String? = nil
    ) {
        self.ok = ok
        self.provider = provider
        self.routeId = routeId
        self.format = format
        self.fileName = fileName
        self.content = content
        self.contentBase64 = contentBase64
        self.reason = reason
    }
}

public struct RouteUrlImportOutcome: Sendable, Equatable {
    public var ok: Bool
    public var provider: RouteUrlProvider
    public var routeId: String?
    public var parsed: GpxParseResult?
    public var fileName: String?
    public var guidanceEn: String?
    public var guidanceFr: String?

    public init(
        ok: Bool,
        provider: RouteUrlProvider,
        routeId: String? = nil,
        parsed: GpxParseResult? = nil,
        fileName: String? = nil,
        guidanceEn: String? = nil,
        guidanceFr: String? = nil
    ) {
        self.ok = ok
        self.provider = provider
        self.routeId = routeId
        self.parsed = parsed
        self.fileName = fileName
        self.guidanceEn = guidanceEn
        self.guidanceFr = guidanceFr
    }
}

public enum RouteFileImportError: Error, Sendable, Equatable {
    case invalidData
    case unsupportedFormat
    case tooShort
    case parseFailed
    case missingSharePayload
    case sharedPlanResolutionFailed
}

public enum PendingShareImportOutcome: Sendable, Equatable {
    case route(RouteUrlImportOutcome)
    case sharedPlan(SharedPlanDecodeResult)
}

public typealias RouteProxyInvoker = @Sendable (URL) async throws -> RouteProxyPayload?

private struct RouteProxyInvokeBody: Encodable, Sendable {
    let url: String
    let connectionKey: String
}

/// Imports cycling routes from provider share URLs (Komoot, Bikemap, RideWithGPS, Strava, direct GPX/TCX/FIT)
/// via the Supabase `route-proxy` Edge Function with unauthenticated direct fallback and
/// App Group `SDPendingShareImport` queue processing.
/// Mirrors `src/utils/routeUrlImporter.ts` and `src/utils/routeFileParser.ts`.
public actor RouteImportService {
    public static let defaultDirectFetchTimeoutSeconds: TimeInterval = 8.0

    private let urlSession: URLSession
    private let edgeFunctionClient: (any EdgeFunctionInvoking)?
    private let connectionKeyStore: any IntegrationConnectionKeyStore
    private let proxyInvoker: RouteProxyInvoker?
    private let directTimeoutSeconds: TimeInterval

    public init(
        urlSession: URLSession = .shared,
        configuration: SupabaseConfiguration? = nil,
        edgeFunctionClient: (any EdgeFunctionInvoking)? = nil,
        connectionKeyStore: (any IntegrationConnectionKeyStore)? = nil,
        authTokenProvider: (@Sendable () async -> String?)? = nil,
        proxyInvoker: RouteProxyInvoker? = nil,
        directTimeoutSeconds: TimeInterval = RouteImportService.defaultDirectFetchTimeoutSeconds
    ) {
        self.urlSession = urlSession
        self.connectionKeyStore = connectionKeyStore ?? UserDefaultsIntegrationKeyStore()
        self.proxyInvoker = proxyInvoker
        self.directTimeoutSeconds = max(0.01, directTimeoutSeconds)

        if let edgeFunctionClient {
            self.edgeFunctionClient = edgeFunctionClient
        } else if proxyInvoker == nil {
            let resolvedConfig = configuration ?? SupabaseConfiguration(urlSession: urlSession)
            self.edgeFunctionClient = SupabaseEdgeFunctionClient(
                configuration: resolvedConfig,
                authTokenProvider: authTokenProvider
            )
        } else {
            self.edgeFunctionClient = nil
        }
    }

    // MARK: - Pure Detection & Parsing

    private static func matchesDomain(_ host: String, _ domain: String) -> Bool {
        let cleanHost = host.lowercased()
        let cleanDomain = domain.lowercased()
        return cleanHost == cleanDomain || cleanHost.hasSuffix(".\(cleanDomain)")
    }

    private static func firstRegexCapture(_ text: String, pattern: String) -> String? {
        guard let regex = try? NSRegularExpression(pattern: pattern, options: [.caseInsensitive]) else {
            return nil
        }
        let ns = text as NSString
        let range = NSRange(location: 0, length: ns.length)
        guard let match = regex.firstMatch(in: text, options: [], range: range),
              match.numberOfRanges > 1,
              match.range(at: 1).location != NSNotFound else {
            return nil
        }
        return ns.substring(with: match.range(at: 1))
    }

    private static func matchesRegex(_ text: String, _ pattern: String) -> Bool {
        text.range(of: pattern, options: [.regularExpression, .caseInsensitive]) != nil
    }

    public nonisolated static func detectProvider(from rawInput: String) -> RouteUrlDetection {
        let trimmed = rawInput.trimmingCharacters(in: .whitespacesAndNewlines)
        let candidate: String
        if let httpRange = trimmed.range(of: #"https?://[^\s]+"#, options: [.regularExpression, .caseInsensitive]) {
            candidate = String(trimmed[httpRange])
        } else {
            candidate = trimmed
        }

        guard let parsedUrl = URL(string: candidate),
              let scheme = parsedUrl.scheme?.lowercased(),
              (scheme == "http" || scheme == "https"),
              let host = parsedUrl.host?.lowercased(),
              !host.isEmpty else {
            return RouteUrlDetection(provider: .unknown, url: nil, routeId: nil)
        }

        let path = parsedUrl.path
        if matchesRegex(path, #"\.(gpx|tcx|fit)$"#) {
            return RouteUrlDetection(provider: .directFile, url: parsedUrl, routeId: nil)
        }

        if matchesDomain(host, "komoot.com") ||
            matchesDomain(host, "komoot.de") ||
            matchesDomain(host, "komoot.fr") ||
            matchesDomain(host, "api.komoot.de") {
            let routeId = firstRegexCapture(path, pattern: #"/tour/(\d+)"#)
            return RouteUrlDetection(provider: .komoot, url: parsedUrl, routeId: routeId)
        }

        if matchesDomain(host, "bikemap.net") {
            let routeId = firstRegexCapture(path, pattern: #"/r/(\d+)"#)
            return RouteUrlDetection(provider: .bikemap, url: parsedUrl, routeId: routeId)
        }

        if matchesDomain(host, "ridewithgps.com") {
            let routeId = firstRegexCapture(path, pattern: #"/routes/(\d+)"#)
            return RouteUrlDetection(provider: .ridewithgps, url: parsedUrl, routeId: routeId)
        }

        if matchesDomain(host, "strava.com") || matchesDomain(host, "strava.app.link") {
            let routeId = firstRegexCapture(path, pattern: #"/routes/(\d+)"#)
            return RouteUrlDetection(provider: .strava, url: parsedUrl, routeId: routeId)
        }

        return RouteUrlDetection(provider: .unknown, url: parsedUrl, routeId: nil)
    }

    private nonisolated static func escapeXml(_ value: String) -> String {
        value
            .replacingOccurrences(of: "&", with: "&amp;")
            .replacingOccurrences(of: "<", with: "&lt;")
            .replacingOccurrences(of: ">", with: "&gt;")
            .replacingOccurrences(of: "\"", with: "&quot;")
            .replacingOccurrences(of: "'", with: "&apos;")
    }

    public nonisolated static func convertTrackPointsToGpx(
        _ points: [(lat: Double, lon: Double, ele: Double?)],
        name: String = "Cadence Route"
    ) -> String {
        let trkpts = points
            .filter { $0.lat.isFinite && $0.lon.isFinite }
            .map { pt in
                let eleTag: String
                if let ele = pt.ele, ele.isFinite {
                    eleTag = String(format: "<ele>%.1f</ele>", ele)
                } else {
                    eleTag = ""
                }
                return String(
                    format: "      <trkpt lat=\"%.6f\" lon=\"%.6f\">%@</trkpt>",
                    pt.lat,
                    pt.lon,
                    eleTag
                )
            }
            .joined(separator: "\n")

        return """
        <?xml version="1.0" encoding="UTF-8"?>
        <gpx version="1.1" creator="Cadence Route Proxy" xmlns="http://www.topografix.com/GPX/1/1">
          <trk>
            <name>\(escapeXml(name))</name>
            <trkseg>
        \(trkpts)
            </trkseg>
          </trk>
        </gpx>
        """
    }

    public nonisolated static func parseProxyPayload(
        _ payload: RouteProxyPayload?,
        fallbackProvider: RouteUrlProvider,
        fallbackRouteId: String? = nil
    ) -> RouteUrlImportOutcome? {
        guard let payload, payload.ok == true else { return nil }

        let provider = payload.provider ?? fallbackProvider
        let routeId = payload.routeId ?? fallbackRouteId
        let format = payload.format?.lowercased()

        if format == "fit", let b64 = payload.contentBase64,
           let data = Data(base64Encoded: b64, options: [.ignoreUnknownCharacters]) {
            let fileName = (payload.fileName?.isEmpty == false)
                ? payload.fileName!
                : "\(provider.rawValue)-\(routeId ?? "route").fit"
            guard let parsed = RouteFileParserEngine.parseFitFileData(data, fileName: fileName) else {
                return nil
            }
            return RouteUrlImportOutcome(
                ok: true,
                provider: provider,
                routeId: routeId,
                parsed: parsed,
                fileName: fileName
            )
        }

        if format == "tcx", let content = payload.content {
            let fileName = (payload.fileName?.isEmpty == false)
                ? payload.fileName!
                : "\(provider.rawValue)-\(routeId ?? "route").tcx"
            guard let parsed = TcxRouteParser.parseTcxContent(content, fileName: fileName) else {
                return nil
            }
            return RouteUrlImportOutcome(
                ok: true,
                provider: provider,
                routeId: routeId,
                parsed: parsed,
                fileName: fileName
            )
        }

        if let content = payload.content,
           (format == "gpx" || matchesRegex(content, #"<gpx\b"#)) {
            let fileName = (payload.fileName?.isEmpty == false)
                ? payload.fileName!
                : "\(provider.rawValue)-\(routeId ?? "route").gpx"
            guard let parsed = GpxParserEngine.parseGpxFileContent(content, fileNameHint: fileName) else {
                return nil
            }
            return RouteUrlImportOutcome(
                ok: true,
                provider: provider,
                routeId: routeId,
                parsed: parsed,
                fileName: fileName
            )
        }

        return nil
    }

    public nonisolated static func hasFitSignature(_ data: Data) -> Bool {
        guard data.count >= 12 else { return false }
        let slice = [UInt8](data[data.index(data.startIndex, offsetBy: 8)..<data.index(data.startIndex, offsetBy: 12)])
        return slice == [0x2E, 0x46, 0x49, 0x54] // ".FIT"
    }

    public nonisolated static func parseRouteData(
        _ data: Data,
        fileName: String = "route.gpx",
        contentType: String? = nil
    ) throws -> GpxParseResult {
        guard data.count >= 16 else {
            throw RouteFileImportError.tooShort
        }

        let lowerName = fileName.lowercased()
        let lowerContentType = (contentType ?? "").lowercased()

        if hasFitSignature(data) || lowerName.hasSuffix(".fit") {
            guard let parsed = RouteFileParserEngine.parseFitFileData(data, fileName: fileName) else {
                throw RouteFileImportError.parseFailed
            }
            return parsed
        }

        guard let text = String(data: data, encoding: .utf8) else {
            throw RouteFileImportError.invalidData
        }

        if matchesRegex(text, #"<TrainingCenterDatabase\b"#) || lowerName.hasSuffix(".tcx") || lowerContentType.contains("tcx") {
            guard let parsed = TcxRouteParser.parseTcxContent(text, fileName: fileName) else {
                throw RouteFileImportError.parseFailed
            }
            return parsed
        }

        if matchesRegex(text, #"<gpx\b"#) || lowerName.hasSuffix(".gpx") || lowerContentType.contains("gpx") {
            guard let parsed = GpxParserEngine.parseGpxFileContent(text, fileNameHint: fileName) else {
                throw RouteFileImportError.parseFailed
            }
            return parsed
        }

        throw RouteFileImportError.unsupportedFormat
    }

    // MARK: - Network Import

    public func importRoute(
        from rawInput: String,
        timeoutSeconds: TimeInterval? = nil
    ) async -> RouteUrlImportOutcome {
        let detection = Self.detectProvider(from: rawInput)
        let provider = detection.provider
        let routeId = detection.routeId
        let effectiveTimeout = max(0.01, timeoutSeconds ?? directTimeoutSeconds)

        guard let url = detection.url else {
            return RouteUrlImportOutcome(
                ok: false,
                provider: .unknown,
                guidanceEn: "Paste a valid https:// route link from Komoot, Bikemap, Ride with GPS, or a direct .gpx/.tcx/.fit URL.",
                guidanceFr: "Collez un lien https:// valide depuis Komoot, Bikemap, Ride with GPS ou un fichier .gpx/.tcx/.fit."
            )
        }

        if !Task.isCancelled {
            do {
                let payload: RouteProxyPayload?
                if let proxyInvoker {
                    payload = try await proxyInvoker(url)
                } else if let edgeFunctionClient {
                    let connectionKey = await connectionKeyStore.getOrCreateConnectionKey()
                    let req = RouteProxyInvokeBody(url: url.absoluteString, connectionKey: connectionKey)
                    payload = try await edgeFunctionClient.invoke(
                        "route-proxy",
                        body: req,
                        timeoutSeconds: effectiveTimeout
                    )
                } else {
                    payload = nil
                }

                if let outcome = Self.parseProxyPayload(payload, fallbackProvider: provider, fallbackRouteId: routeId) {
                    return outcome
                }
            } catch {
                if Task.isCancelled {
                    return Self.failureGuidance(provider: provider, routeId: routeId)
                }
            }
        }

        let candidateEndpoints = Self.buildCandidateEndpoints(
            provider: provider,
            url: url,
            routeId: routeId
        )

        for endpoint in candidateEndpoints {
            if Task.isCancelled { break }
            var request = URLRequest(url: endpoint, timeoutInterval: max(0.1, effectiveTimeout))
            request.httpMethod = "GET"

            do {
                let (data, http) = try await M4CRequestTimeoutRunner.perform(
                    request: request,
                    urlSession: urlSession,
                    timeoutSeconds: effectiveTimeout
                )
                guard (200...299).contains(http.statusCode), data.count >= 16 else {
                    continue
                }

                let contentType = (http.value(forHTTPHeaderField: "Content-Type") ?? "").lowercased()

                if Self.hasFitSignature(data) {
                    let name = "\(provider.rawValue)-\(routeId ?? "route").fit"
                    if let parsed = RouteFileParserEngine.parseFitFileData(data, fileName: name) {
                        return RouteUrlImportOutcome(
                            ok: true,
                            provider: provider,
                            routeId: routeId,
                            parsed: parsed,
                            fileName: name
                        )
                    }
                    continue
                }

                guard let text = String(data: data, encoding: .utf8) else {
                    continue
                }

                if Self.matchesRegex(text, #"<gpx\b"#) || contentType.contains("gpx") {
                    let name = "\(provider.rawValue)-\(routeId ?? "route").gpx"
                    if let parsed = GpxParserEngine.parseGpxFileContent(text, fileNameHint: name) {
                        return RouteUrlImportOutcome(
                            ok: true,
                            provider: provider,
                            routeId: routeId,
                            parsed: parsed,
                            fileName: name
                        )
                    }
                }

                if Self.matchesRegex(text, #"<TrainingCenterDatabase\b"#) || contentType.contains("tcx") {
                    let name = "\(provider.rawValue)-\(routeId ?? "route").tcx"
                    if let parsed = TcxRouteParser.parseTcxContent(text, fileName: name) {
                        return RouteUrlImportOutcome(
                            ok: true,
                            provider: provider,
                            routeId: routeId,
                            parsed: parsed,
                            fileName: name
                        )
                    }
                }
            } catch {
                if Task.isCancelled { break }
            }
        }

        return Self.failureGuidance(provider: provider, routeId: routeId)
    }

    private nonisolated static func buildCandidateEndpoints(
        provider: RouteUrlProvider,
        url: URL,
        routeId: String?
    ) -> [URL] {
        switch provider {
        case .directFile, .unknown:
            return [url]
        case .ridewithgps:
            guard let routeId,
                  let target = URL(string: "https://ridewithgps.com/routes/\(routeId).gpx?sub_format=track") else {
                return []
            }
            return [target]
        case .komoot:
            guard let routeId,
                  let target = URL(string: "https://www.komoot.com/api/v007/tours/\(routeId).gpx") else {
                return []
            }
            return [target]
        case .bikemap:
            guard let routeId,
                  let target = URL(string: "https://www.bikemap.net/en/r/\(routeId)/gpx/") else {
                return []
            }
            return [target]
        case .strava:
            return []
        }
    }

    private nonisolated static func failureGuidance(
        provider: RouteUrlProvider,
        routeId: String?
    ) -> RouteUrlImportOutcome {
        if provider == .strava {
            return RouteUrlImportOutcome(
                ok: false,
                provider: provider,
                routeId: routeId,
                guidanceEn: "Strava routes require account connection or manual export. In Strava, tap Export GPX / FIT and drop or share the file here.",
                guidanceFr: "Les parcours Strava nécessitent une connexion au compte ou un export manuel. Dans Strava, exportez le fichier .GPX ou .FIT puis déposez-le ici."
            )
        }

        let label: String
        switch provider {
        case .komoot: label = "Komoot"
        case .bikemap: label = "Bikemap"
        case .ridewithgps: label = "Ride with GPS"
        case .strava: label = "Strava"
        case .directFile: label = "URL"
        case .unknown: label = "Link"
        }

        return RouteUrlImportOutcome(
            ok: false,
            provider: provider,
            routeId: routeId,
            guidanceEn: "\(label) could not be fetched automatically (route may be private or require sign-in). In \(label), tap Export GPX / FIT and drop or share the file here.",
            guidanceFr: "\(label) n'a pas pu être importé automatiquement (parcours privé ou protégé). Dans \(label), exportez le fichier .GPX ou .FIT puis déposez-le ou partagez-le ici."
        )
    }

    // MARK: - App Group Share Queue Integration

    public func processPendingShareImport(
        _ item: PendingShareImportDTO,
        store: CadenceStore,
        planShareService: PlanShareService? = nil,
        lang: CadenceLang = .en,
        receiverSpecs: RiderBikeSpecs? = nil
    ) async throws -> PendingShareImportOutcome {
        try Task.checkCancellation()

        try await store.updatePendingShareImportStatus(
            id: item.id,
            status: .processing,
            errorMessage: nil,
            processedAt: nil
        )

        do {
            let outcome: PendingShareImportOutcome
            switch item.kind {
            case .file:
                guard let fileData = item.fileData else {
                    throw RouteFileImportError.missingSharePayload
                }
                let fileName = (item.fileName?.isEmpty == false) ? item.fileName! : "shared-route.gpx"
                let parsed = try Self.parseRouteData(
                    fileData,
                    fileName: fileName,
                    contentType: item.utTypeIdentifier
                )
                outcome = .route(RouteUrlImportOutcome(
                    ok: true,
                    provider: .directFile,
                    parsed: parsed,
                    fileName: fileName
                ))

            case .url, .text:
                let raw = (item.sourceUrl?.isEmpty == false ? item.sourceUrl : item.sharedText) ?? ""
                let trimmed = raw.trimmingCharacters(in: .whitespacesAndNewlines)
                guard !trimmed.isEmpty else {
                    throw RouteFileImportError.missingSharePayload
                }

                if let planShareService,
                   let shareURL = URL(string: trimmed),
                   PlanShareService.extractSharedPlanRef(from: shareURL) != nil {
                    let decodedOpt = await planShareService.resolveAndDecodeSharedPlan(
                        from: shareURL,
                        lang: lang,
                        receiverSpecs: receiverSpecs
                    )
                    try Task.checkCancellation()
                    guard let decoded = decodedOpt else {
                        throw RouteFileImportError.sharedPlanResolutionFailed
                    }
                    outcome = .sharedPlan(decoded)
                } else {
                    let routeOutcome = await importRoute(from: trimmed)
                    try Task.checkCancellation()
                    if !routeOutcome.ok {
                        let msg = lang == .fr
                            ? (routeOutcome.guidanceFr ?? routeOutcome.guidanceEn ?? "Route import failed")
                            : (routeOutcome.guidanceEn ?? routeOutcome.guidanceFr ?? "Route import failed")
                        try await store.updatePendingShareImportStatus(
                            id: item.id,
                            status: .failed,
                            errorMessage: msg,
                            processedAt: Date()
                        )
                        return .route(routeOutcome)
                    }
                    outcome = .route(routeOutcome)
                }

            case .planCode:
                guard let planShareService else {
                    throw RouteFileImportError.sharedPlanResolutionFailed
                }
                let rawCode = (item.sharedText?.isEmpty == false ? item.sharedText : item.sourceUrl) ?? ""
                let cleanCode: String
                if let url = URL(string: rawCode),
                   let ref = PlanShareService.extractSharedPlanRef(from: url),
                   let code = ref.code {
                    cleanCode = code
                } else {
                    cleanCode = rawCode.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
                }

                let tokenOpt = await planShareService.resolveShortPlanToken(code: cleanCode)
                try Task.checkCancellation()
                guard let token = tokenOpt,
                      var decoded = PlanShareCodec.decodePlanShareToken(token, lang: lang) else {
                    throw RouteFileImportError.sharedPlanResolutionFailed
                }
                if let receiverSpecs {
                    decoded.trip = PlanShareCodec.applyPersonalLensToSharedTrip(
                        decoded.trip,
                        receiverSpecs: receiverSpecs,
                        options: PersonalLensOptions(lang: lang)
                    )
                }
                outcome = .sharedPlan(decoded)

            case .planToken:
                let rawToken = (item.sharedText?.isEmpty == false ? item.sharedText : item.sourceUrl) ?? ""
                let token: String
                if let url = URL(string: rawToken),
                   let ref = PlanShareService.extractSharedPlanRef(from: url),
                   let extractedToken = ref.token {
                    token = extractedToken
                } else {
                    token = rawToken.trimmingCharacters(in: .whitespacesAndNewlines)
                }

                guard var decoded = PlanShareCodec.decodePlanShareToken(token, lang: lang) else {
                    throw RouteFileImportError.sharedPlanResolutionFailed
                }
                if let receiverSpecs {
                    decoded.trip = PlanShareCodec.applyPersonalLensToSharedTrip(
                        decoded.trip,
                        receiverSpecs: receiverSpecs,
                        options: PersonalLensOptions(lang: lang)
                    )
                }
                outcome = .sharedPlan(decoded)
            }

            try Task.checkCancellation()
            try await store.updatePendingShareImportStatus(
                id: item.id,
                status: .completed,
                errorMessage: nil,
                processedAt: Date()
            )
            return outcome
        } catch {
            if error is CancellationError || Task.isCancelled {
                try? await store.updatePendingShareImportStatus(
                    id: item.id,
                    status: .pending,
                    errorMessage: nil,
                    processedAt: nil
                )
                throw CancellationError()
            }
            try? await store.updatePendingShareImportStatus(
                id: item.id,
                status: .failed,
                errorMessage: String(describing: error),
                processedAt: Date()
            )
            throw error
        }
    }

    public func processPendingShareQueue(
        store: CadenceStore,
        planShareService: PlanShareService? = nil,
        lang: CadenceLang = .en,
        receiverSpecs: RiderBikeSpecs? = nil
    ) async throws -> [(id: String, result: Result<PendingShareImportOutcome, Error>)] {
        let pending = try await store.fetchPendingShareImports(status: .pending)
        var results: [(id: String, result: Result<PendingShareImportOutcome, Error>)] = []
        for item in pending {
            try Task.checkCancellation()
            do {
                let outcome = try await processPendingShareImport(
                    item,
                    store: store,
                    planShareService: planShareService,
                    lang: lang,
                    receiverSpecs: receiverSpecs
                )
                results.append((id: item.id, result: .success(outcome)))
            } catch {
                if error is CancellationError || Task.isCancelled {
                    throw CancellationError()
                }
                results.append((id: item.id, result: .failure(error)))
            }
        }
        return results
    }
}
