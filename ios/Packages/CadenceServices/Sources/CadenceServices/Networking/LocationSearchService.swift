import Foundation
import CadenceCore
#if canImport(MapKit)
import MapKit
#endif

public enum LocationSource: String, Codable, Sendable, CaseIterable, Equatable {
    case ban
    case photon
    case nominatim
    case preset
    case mapkit
}

public struct LocationSuggestion: Codable, Sendable, Equatable, Identifiable {
    public var id: String
    public var name: String
    public var secondaryText: String
    public var fullDisplayName: String
    public var coordinates: LatLon
    public var type: String?
    public var source: LocationSource?

    public init(
        id: String,
        name: String,
        secondaryText: String,
        fullDisplayName: String,
        coordinates: LatLon,
        type: String? = nil,
        source: LocationSource? = nil
    ) {
        self.id = id
        self.name = name
        self.secondaryText = secondaryText
        self.fullDisplayName = fullDisplayName
        self.coordinates = coordinates
        self.type = type
        self.source = source
    }
}

public struct SearchLocationOptions: Sendable, Equatable {
    public var lang: CadenceLang
    public var biasCoords: LatLon?
    public var limit: Int

    public init(
        lang: CadenceLang = .fr,
        biasCoords: LatLon? = nil,
        limit: Int = 7
    ) {
        self.lang = lang
        self.biasCoords = biasCoords
        self.limit = limit
    }
}

public protocol LocalSearchProviding: Sendable {
    func search(query: String, biasCoords: LatLon?, limit: Int) async throws -> [LocationSuggestion]
}

#if canImport(MapKit)
public struct MapKitLocalSearchProvider: LocalSearchProviding {
    public init() {}

    @MainActor
    public func search(
        query: String,
        biasCoords: LatLon?,
        limit: Int
    ) async throws -> [LocationSuggestion] {
        let request = MKLocalSearch.Request()
        request.naturalLanguageQuery = query
        if let biasCoords, biasCoords.lat.isFinite, biasCoords.lon.isFinite {
            request.region = MKCoordinateRegion(
                center: CLLocationCoordinate2D(latitude: biasCoords.lat, longitude: biasCoords.lon),
                span: MKCoordinateSpan(latitudeDelta: 0.5, longitudeDelta: 0.5)
            )
        }
        let search = MKLocalSearch(request: request)
        return try await withCheckedThrowingContinuation { continuation in
            search.start { response, error in
                if let error {
                    continuation.resume(throwing: error)
                    return
                }
                let maxItems = max(1, limit)
                let suggestions: [LocationSuggestion] = (response?.mapItems ?? [])
                    .prefix(maxItems)
                    .compactMap { item in
                        let coord = item.placemark.coordinate
                        guard coord.latitude.isFinite, coord.longitude.isFinite else { return nil }
                        let rawName = item.name?.trimmingCharacters(in: .whitespacesAndNewlines) ?? query
                        let locality = item.placemark.locality ?? item.placemark.administrativeArea ?? ""
                        let resolvedName = LocationSearchService.appendCityIfMissing(
                            baseName: rawName,
                            city: locality
                        )
                        let postalCity = [item.placemark.postalCode, item.placemark.locality]
                            .compactMap { $0?.trimmingCharacters(in: .whitespacesAndNewlines) }
                            .filter { !$0.isEmpty }
                            .joined(separator: " ")
                        let secondaryParts = [
                            item.placemark.thoroughfare,
                            postalCity.isEmpty ? nil : postalCity,
                            item.placemark.administrativeArea,
                            item.placemark.country,
                        ]
                        .compactMap { $0?.trimmingCharacters(in: .whitespacesAndNewlines) }
                        .filter { !$0.isEmpty && $0 != rawName }

                        let secondaryText = secondaryParts.joined(separator: " · ")
                        let fullDisplayName = secondaryText.isEmpty
                            ? resolvedName
                            : "\(resolvedName), \(secondaryText)"

                        return LocationSuggestion(
                            id: "mapkit-\(JSCompat.jsFixed(coord.latitude, decimals: 5))-\(JSCompat.jsFixed(coord.longitude, decimals: 5))-\(rawName)",
                            name: resolvedName,
                            secondaryText: secondaryText,
                            fullDisplayName: fullDisplayName,
                            coordinates: LatLon(coord.latitude, coord.longitude),
                            type: item.pointOfInterestCategory?.rawValue,
                            source: .mapkit
                        )
                    }
                continuation.resume(returning: suggestions)
            }
        }
    }
}
#endif

public protocol LocationGeocoding: Sendable {
    func geocodeLocation(_ query: String, lang: CadenceLang, biasCoords: LatLon?) async -> LatLon?
}

// MARK: - GeoJSON / Nominatim Wire DTOs

private enum CodableStringOrInt: Decodable, Sendable {
    case string(String)
    case int(Int64)
    case double(Double)

    init(from decoder: Decoder) throws {
        let container = try decoder.singleValueContainer()
        if let s = try? container.decode(String.self) {
            self = .string(s)
        } else if let i = try? container.decode(Int64.self) {
            self = .int(i)
        } else if let d = try? container.decode(Double.self) {
            self = .double(d)
        } else {
            throw DecodingError.typeMismatch(
                String.self,
                DecodingError.Context(codingPath: decoder.codingPath, debugDescription: "Expected string or number")
            )
        }
    }

    var stringValue: String {
        switch self {
        case .string(let s): return s
        case .int(let i): return String(i)
        case .double(let d):
            if d.truncatingRemainder(dividingBy: 1) == 0, abs(d) < Double(Int64.max) {
                return String(Int64(d))
            }
            return String(d)
        }
    }
}

private struct GeoJSONGeometry: Decodable, Sendable {
    let coordinates: [Double]?
}

private struct BanProperties: Decodable, Sendable {
    let id: String?
    let name: String?
    let label: String?
    let city: String?
    let postcode: String?
    let context: String?
    let type: String?
}

private struct BanFeature: Decodable, Sendable {
    let properties: BanProperties?
    let geometry: GeoJSONGeometry?
}

private struct BanFeatureCollection: Decodable, Sendable {
    let features: [BanFeature]?
}

private struct PhotonProperties: Decodable, Sendable {
    let osm_type: String?
    let osm_id: CodableStringOrInt?
    let osm_value: String?
    let name: String?
    let housenumber: String?
    let street: String?
    let city: String?
    let locality: String?
    let district: String?
    let postcode: String?
    let county: String?
    let state: String?
    let country: String?
    let type: String?
}

private struct PhotonFeature: Decodable, Sendable {
    let properties: PhotonProperties?
    let geometry: GeoJSONGeometry?
}

private struct PhotonFeatureCollection: Decodable, Sendable {
    let features: [PhotonFeature]?
}

private struct NominatimAddress: Decodable, Sendable {
    let city: String?
    let town: String?
    let village: String?
    let municipality: String?
    let hamlet: String?
    let suburb: String?
    let road: String?
    let county: String?
    let state: String?
}

private struct NominatimItem: Decodable, Sendable {
    let place_id: CodableStringOrInt?
    let lat: String?
    let lon: String?
    let name: String?
    let display_name: String?
    let type: String?
    let `class`: String?
    let address: NominatimAddress?
}

private enum PhotonRaceResult: Sendable {
    case photon(PhotonFeatureCollection?)
    case timeout
}

private enum FetchOutcome<U: Sendable>: Sendable {
    case loaded(U?)
    case timedOut
}

/// High-precision multi-provider geocoding & autocomplete actor combining
/// IGN BAN, Komoot Photon (500ms grace window), OSM Nominatim (User-Agent + 1 req/sec throttle),
/// and optional Apple MapKit (`MKLocalSearch`) fallback.
/// Mirrors `src/services/locationService.ts`.
public actor LocationSearchService: LocationGeocoding {
    public static let defaultNominatimUserAgent = "Cadence/1.0 (https://ridecadence.cc; support@ridecadence.cc)"
    public static let maxCacheSize = 120

    public static let banSearchBaseURL = "https://data.geopf.fr/geocodage/search/"
    public static let banReverseBaseURL = "https://data.geopf.fr/geocodage/reverse/"
    public static let photonSearchBaseURL = "https://photon.komoot.io/api/"
    public static let photonReverseBaseURL = "https://photon.komoot.io/reverse"
    public static let nominatimSearchBaseURL = "https://nominatim.openstreetmap.org/search"
    public static let nominatimReverseBaseURL = "https://nominatim.openstreetmap.org/reverse"

    public static let popularCyclingHubs: [LocationSuggestion] = [
        LocationSuggestion(
            id: "preset-rougiers",
            name: "Rougiers",
            secondaryText: "83170, Massif de la Sainte-Baume, Var",
            fullDisplayName: "Rougiers, 83170 Var, Provence-Alpes-Côte d’Azur, France",
            coordinates: LatLon(43.3925, 5.8503),
            type: "village",
            source: .preset
        ),
        LocationSuggestion(
            id: "preset-mazaugues",
            name: "Mazaugues",
            secondaryText: "83136, Massif de la Sainte-Baume, Var",
            fullDisplayName: "Mazaugues, 83136 Var, Provence-Alpes-Côte d’Azur, France",
            coordinates: LatLon(43.3486, 5.9228),
            type: "village",
            source: .preset
        ),
        LocationSuggestion(
            id: "preset-sainte-maxime",
            name: "Sainte-Maxime",
            secondaryText: "83120, Golfe de Saint-Tropez, Côte d’Azur",
            fullDisplayName: "Sainte-Maxime, 83120 Var, Côte d’Azur, France",
            coordinates: LatLon(43.3083, 6.6403),
            type: "city",
            source: .preset
        ),
        LocationSuggestion(
            id: "preset-st-raphael",
            name: "Saint-Raphaël",
            secondaryText: "83700, Corniche d’Or & Massif de l’Estérel",
            fullDisplayName: "Saint-Raphaël, 83700 Var, Côte d’Azur, France",
            coordinates: LatLon(43.4252, 6.7684),
            type: "city",
            source: .preset
        ),
        LocationSuggestion(
            id: "preset-hyeres",
            name: "Hyères",
            secondaryText: "83400, Presqu’île de Giens & Îles d’Or, Var",
            fullDisplayName: "Hyères, 83400 Var, Côte d’Azur, France",
            coordinates: LatLon(43.1206, 6.1286),
            type: "city",
            source: .preset
        ),
        LocationSuggestion(
            id: "preset-cannes",
            name: "Cannes",
            secondaryText: "06400, La Croisette & Baie de Cannes",
            fullDisplayName: "Cannes, 06400 Alpes-Maritimes, Côte d’Azur, France",
            coordinates: LatLon(43.5528, 7.0174),
            type: "city",
            source: .preset
        ),
        LocationSuggestion(
            id: "preset-nice",
            name: "Nice",
            secondaryText: "06000, Promenade des Anglais, Baie des Anges",
            fullDisplayName: "Nice, 06000 Alpes-Maritimes, Côte d’Azur, France",
            coordinates: LatLon(43.7102, 7.2620),
            type: "city",
            source: .preset
        ),
        LocationSuggestion(
            id: "preset-nantes",
            name: "Nantes",
            secondaryText: "44000, Loire-Atlantique, Pays de la Loire",
            fullDisplayName: "Nantes, 44000, Loire-Atlantique, France",
            coordinates: LatLon(47.2186, -1.5541),
            type: "city",
            source: .preset
        ),
        LocationSuggestion(
            id: "preset-st-nazaire",
            name: "Saint-Nazaire",
            secondaryText: "44600, Pont de Saint-Nazaire, Loire-Atlantique",
            fullDisplayName: "Saint-Nazaire, 44600, Loire-Atlantique, France",
            coordinates: LatLon(47.2734, -2.2139),
            type: "city",
            source: .preset
        ),
        LocationSuggestion(
            id: "preset-clisson",
            name: "Clisson",
            secondaryText: "44190, Vignoble Sèvre Nantaise, Loire-Atlantique",
            fullDisplayName: "Clisson, 44190, Loire-Atlantique, France",
            coordinates: LatLon(47.0872, -1.2825),
            type: "city",
            source: .preset
        ),
        LocationSuggestion(
            id: "preset-pornic",
            name: "Pornic",
            secondaryText: "44210, Côte de Jade, Loire-Atlantique",
            fullDisplayName: "Pornic, 44210, Loire-Atlantique, France",
            coordinates: LatLon(47.1158, -2.1026),
            type: "city",
            source: .preset
        ),
        LocationSuggestion(
            id: "preset-gare-nantes",
            name: "Gare de Nantes Nord",
            secondaryText: "Esplanade Pierre Semard, 44000 Nantes",
            fullDisplayName: "Gare de Nantes Nord, Esplanade Pierre Semard, 44000 Nantes",
            coordinates: LatLon(47.2174, -1.5434),
            type: "station",
            source: .preset
        ),
    ]

    public nonisolated static func defaultLocalSearchProvider() -> (any LocalSearchProviding)? {
        #if canImport(MapKit)
        return MapKitLocalSearchProvider()
        #else
        return nil
        #endif
    }

    private let urlSession: URLSession
    private let userAgent: String
    private let localSearchProvider: (any LocalSearchProviding)?
    private let nominatimMinInterval: Duration
    private let photonGraceWindow: Duration
    private let banTimeout: Duration
    private let photonTimeout: Duration
    private let nominatimTimeout: Duration
    private let clock: @Sendable () -> ContinuousClock.Instant
    private let sleeper: @Sendable (Duration) async throws -> Void

    private var suggestionCache: [String: [LocationSuggestion]] = [:]
    private var cacheOrder: [String] = []
    private var lastNominatimScheduledAt: ContinuousClock.Instant?

    public init(
        urlSession: URLSession = .shared,
        userAgent: String = LocationSearchService.defaultNominatimUserAgent,
        localSearchProvider: (any LocalSearchProviding)? = LocationSearchService.defaultLocalSearchProvider(),
        nominatimMinInterval: Duration = .seconds(1),
        photonGraceWindow: Duration = .milliseconds(500),
        banTimeout: Duration = .seconds(3),
        photonTimeout: Duration = .seconds(2),
        nominatimTimeout: Duration = .milliseconds(3500),
        now: @escaping @Sendable () -> ContinuousClock.Instant = { ContinuousClock.now },
        sleeper: @escaping @Sendable (Duration) async throws -> Void = { try await Task.sleep(for: $0) }
    ) {
        self.urlSession = urlSession
        self.userAgent = userAgent.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
            ? Self.defaultNominatimUserAgent
            : userAgent
        self.localSearchProvider = localSearchProvider
        self.nominatimMinInterval = nominatimMinInterval
        self.photonGraceWindow = photonGraceWindow
        self.banTimeout = banTimeout
        self.photonTimeout = photonTimeout
        self.nominatimTimeout = nominatimTimeout
        self.clock = now
        self.sleeper = sleeper
    }

    // MARK: - Public Pure Helpers

    public nonisolated static func appendCityIfMissing(baseName: String, city: String?) -> String {
        let trimmedBase = baseName.trimmingCharacters(in: .whitespacesAndNewlines)
        let trimmedCity = (city ?? "").trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmedCity.isEmpty else { return trimmedBase }
        if trimmedBase.lowercased().contains(trimmedCity.lowercased()) {
            return trimmedBase
        }
        return "\(trimmedBase), \(trimmedCity)"
    }

    public nonisolated static func formatTypeBadge(
        _ type: String?,
        lang: CadenceLang = .fr
    ) -> String {
        guard let type, !type.isEmpty else {
            return lang == .fr ? "Lieu" : "Place"
        }
        let t = type.lowercased()
        if t.contains("housenumber") || t.contains("address") {
            return lang == .fr ? "Adresse" : "Address"
        }
        if t.contains("street") {
            return lang == .fr ? "Rue" : "Street"
        }
        if t.contains("station") || t.contains("railway") || t.contains("train") {
            return lang == .fr ? "Gare" : "Station"
        }
        if t.contains("municipality") || t.contains("city") || t.contains("town") || t.contains("village") {
            return lang == .fr ? "Ville" : "City"
        }
        if t.contains("building") || t.contains("hotel") {
            return lang == .fr ? "Établissement" : "Venue"
        }
        if t.contains("peak") || t.contains("volcano") || t.contains("mountain") {
            return lang == .fr ? "Sommet" : "Peak"
        }
        return lang == .fr ? "Lieu" : "Place"
    }

    public func clearCache() {
        suggestionCache.removeAll()
        cacheOrder.removeAll()
    }

    // MARK: - Autocomplete Search

    public func searchLocationSuggestions(
        _ rawQuery: String,
        options: SearchLocationOptions = SearchLocationOptions()
    ) async throws -> [LocationSuggestion] {
        let query = rawQuery.trimmingCharacters(in: .whitespacesAndNewlines)
        if query.count < 2 { return [] }

        let lang = options.lang
        let limit = max(1, options.limit)
        let hasBiasCoords: Bool = {
            guard let b = options.biasCoords else { return false }
            return b.lat.isFinite && b.lon.isFinite
        }()
        let biasKey: String
        if hasBiasCoords, let b = options.biasCoords {
            biasKey = "\(Self.jsNumberString(b.lat)),\(Self.jsNumberString(b.lon))"
        } else {
            biasKey = "none"
        }
        let cacheKey = "\(query.lowercased())#\(lang.rawValue)#\(biasKey)"

        if let cached = suggestionCache[cacheKey] {
            return cached
        }

        let banURL = Self.buildBanSearchURL(
            query: query,
            limit: limit,
            biasCoords: hasBiasCoords ? options.biasCoords : nil
        )
        let photonURL = Self.buildPhotonSearchURL(
            query: query,
            limit: limit,
            lang: lang,
            biasCoords: hasBiasCoords ? options.biasCoords : nil
        )

        let session = self.urlSession
        let banTimeoutVal = self.banTimeout
        let photonTimeoutVal = self.photonTimeout

        let photonTask = Task<PhotonFeatureCollection?, Error> {
            guard let photonURL else { return nil }
            return try await Self.fetchJSONWithTimeout(
                url: photonURL,
                timeout: photonTimeoutVal,
                headers: ["Accept": "application/json"],
                urlSession: session,
                as: PhotonFeatureCollection.self
            )
        }

        let banData: BanFeatureCollection?
        do {
            if let banURL {
                banData = try await Self.fetchJSONWithTimeout(
                    url: banURL,
                    timeout: banTimeoutVal,
                    headers: [:],
                    urlSession: session,
                    as: BanFeatureCollection.self
                )
            } else {
                banData = nil
            }
        } catch {
            photonTask.cancel()
            throw error
        }

        do {
            try Task.checkCancellation()
        } catch {
            photonTask.cancel()
            throw error
        }

        let photonData: PhotonFeatureCollection?
        if let banFeatures = banData?.features, !banFeatures.isEmpty {
            let graceWindow = self.photonGraceWindow
            let raceResult = try await withThrowingTaskGroup(of: PhotonRaceResult.self) { group in
                group.addTask {
                    let result = try await withTaskCancellationHandler {
                        try await photonTask.value
                    } onCancel: {
                        photonTask.cancel()
                    }
                    return .photon(result)
                }
                group.addTask {
                    try await Task.sleep(for: graceWindow)
                    return .timeout
                }
                guard let first = try await group.next() else {
                    return PhotonRaceResult.timeout
                }
                group.cancelAll()
                return first
            }
            switch raceResult {
            case .photon(let collection):
                photonData = collection
            case .timeout:
                photonTask.cancel()
                photonData = nil
            }
        } else {
            photonData = try await withTaskCancellationHandler {
                try await photonTask.value
            } onCancel: {
                photonTask.cancel()
            }
        }

        try Task.checkCancellation()

        let banResults = (banData?.features ?? []).compactMap(Self.formatBanFeature)
        let photonResults = (photonData?.features ?? []).compactMap(Self.formatPhotonFeature)

        let isPoiQuery = query.range(
            of: #"\b(gare|station|aeroport|airport|hotel|chateau|château|pont|bridge|sommet|mont|lac|port|plage|beach)\b"#,
            options: [.regularExpression, .caseInsensitive]
        ) != nil
        let isAddressQuery =
            query.rangeOfCharacter(from: .decimalDigits) != nil ||
            query.range(
                of: #"\b(rue|av|avenue|bd|boulevard|chemin|route|allee|allée|impasse|quai|place|cours)\b"#,
                options: [.regularExpression, .caseInsensitive]
            ) != nil

        let merged: [LocationSuggestion]
        if isAddressQuery && !banResults.isEmpty {
            merged = banResults + photonResults
        } else if isPoiQuery {
            merged = photonResults + banResults
        } else if !banResults.isEmpty {
            merged = [banResults[0]] + photonResults + Array(banResults.dropFirst())
        } else {
            merged = photonResults + banResults
        }

        var deduped: [LocationSuggestion] = []
        var seenCoords: Set<String> = []
        for item in merged {
            let coordKey = "\(JSCompat.jsFixed(item.coordinates.lat, decimals: 3)),\(JSCompat.jsFixed(item.coordinates.lon, decimals: 3))"
            if seenCoords.insert(coordKey).inserted {
                deduped.append(item)
            }
        }

        if !deduped.isEmpty {
            let finalResults = Array(deduped.prefix(limit))
            setCache(key: cacheKey, results: finalResults)
            return finalResults
        }

        // 3. Last-resort OSM Nominatim fallback (strict User-Agent + 1 req/sec throttle)
        if let nomURL = Self.buildNominatimSearchURL(query: query, limit: limit, lang: lang) {
            try await throttleNominatim()
            let nomItems = try await Self.fetchJSONWithTimeout(
                url: nomURL,
                timeout: nominatimTimeout,
                headers: [
                    "Accept-Language": "\(lang.rawValue),en",
                    "User-Agent": userAgent,
                ],
                urlSession: session,
                as: [NominatimItem].self
            )
            let results = (nomItems ?? []).compactMap(Self.formatNominatimItem)
            if !results.isEmpty {
                setCache(key: cacheKey, results: results)
                return results
            }
        }

        // 4. Optional MapKit MKLocalSearch fallback
        if let localSearchProvider {
            do {
                let mkResults = try await localSearchProvider.search(
                    query: query,
                    biasCoords: hasBiasCoords ? options.biasCoords : nil,
                    limit: limit
                )
                if !mkResults.isEmpty {
                    let finalResults = Array(mkResults.prefix(limit))
                    setCache(key: cacheKey, results: finalResults)
                    return finalResults
                }
            } catch is CancellationError {
                throw CancellationError()
            } catch {
                // Graceful fallback to empty array
            }
        }

        return []
    }

    // MARK: - Geocode & Reverse Geocode

    public func geocodeLocation(
        _ query: String,
        lang: CadenceLang = .fr,
        biasCoords: LatLon? = nil
    ) async -> LatLon? {
        let trimmed = query.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty else { return nil }

        do {
            let suggestions = try await searchLocationSuggestions(
                trimmed,
                options: SearchLocationOptions(lang: lang, biasCoords: biasCoords, limit: 1)
            )
            return suggestions.first?.coordinates
        } catch {
            return nil
        }
    }

    public func reverseGeocodeLocation(
        lat: Double,
        lon: Double,
        lang: CadenceLang = .fr
    ) async -> String {
        let fallbackLabel = "\(JSCompat.jsFixed(lat, decimals: 4))°N, \(JSCompat.jsFixed(lon, decimals: 4))°E"

        // 1. Photon reverse geocoding (1.8s)
        if let photonURL = Self.buildPhotonReverseURL(lat: lat, lon: lon),
           let photonData = try? await Self.fetchJSONWithTimeout(
               url: photonURL,
               timeout: .milliseconds(1800),
               headers: [:],
               urlSession: urlSession,
               as: PhotonFeatureCollection.self
           ),
           let p = photonData.features?.first?.properties {
            let name = Self.nonEmpty(p.name)
                ?? Self.nonEmpty(p.street)
                ?? Self.nonEmpty(p.city)
                ?? Self.nonEmpty(p.locality)
                ?? Self.nonEmpty(p.district)
            let context: String
            if let city = Self.nonEmpty(p.city), city != name {
                context = city
            } else {
                context = Self.nonEmpty(p.county) ?? ""
            }
            if let name, !context.isEmpty {
                return "\(name) (\(context))"
            }
            if let name {
                return name
            }
        }

        // 2. BAN reverse geocoding (2.5s; lon then lat)
        if let banURL = Self.buildBanReverseURL(lat: lat, lon: lon),
           let banData = try? await Self.fetchJSONWithTimeout(
               url: banURL,
               timeout: .milliseconds(2500),
               headers: [:],
               urlSession: urlSession,
               as: BanFeatureCollection.self
           ),
           let p = banData.features?.first?.properties {
            if let city = Self.nonEmpty(p.city),
               let name = Self.nonEmpty(p.name),
               name != city {
                return "\(name), \(city)"
            }
            if let city = Self.nonEmpty(p.city) {
                return city
            }
            if let label = Self.nonEmpty(p.label) {
                return label
            }
        }

        // 3. Nominatim reverse geocoding (3.0s, throttled + User-Agent)
        if let nomURL = Self.buildNominatimReverseURL(lat: lat, lon: lon, lang: lang) {
            do {
                try await throttleNominatim()
                if let nomData = try await Self.fetchJSONWithTimeout(
                    url: nomURL,
                    timeout: .milliseconds(3000),
                    headers: [
                        "Accept-Language": "\(lang.rawValue),en",
                        "User-Agent": userAgent,
                    ],
                    urlSession: urlSession,
                    as: NominatimItem.self
                ) {
                    if let a = nomData.address {
                        let place = Self.nonEmpty(a.village)
                            ?? Self.nonEmpty(a.town)
                            ?? Self.nonEmpty(a.city)
                            ?? Self.nonEmpty(a.municipality)
                            ?? Self.nonEmpty(a.hamlet)
                            ?? Self.nonEmpty(a.suburb)
                            ?? Self.nonEmpty(a.road)
                            ?? Self.nonEmpty(nomData.name)
                        if let place {
                            let state = Self.nonEmpty(a.county) ?? Self.nonEmpty(a.state)
                            if let state, state != place {
                                return "\(place) (\(state))"
                            }
                            return place
                        }
                    }
                    if let displayName = Self.nonEmpty(nomData.display_name),
                       let short = displayName.split(separator: ",").first {
                        let trimmed = short.trimmingCharacters(in: .whitespacesAndNewlines)
                        if !trimmed.isEmpty {
                            return trimmed
                        }
                    }
                }
            } catch {
                // Fall back to coordinate label
            }
        }

        return fallbackLabel
    }

    // MARK: - Private Cache, Throttle & HTTP Helpers

    private func setCache(key: String, results: [LocationSuggestion]) {
        if suggestionCache[key] == nil {
            while cacheOrder.count >= Self.maxCacheSize {
                let oldest = cacheOrder.removeFirst()
                suggestionCache.removeValue(forKey: oldest)
            }
            cacheOrder.append(key)
        }
        suggestionCache[key] = results
    }

    private func throttleNominatim() async throws {
        let current = clock()
        let earliestNext: ContinuousClock.Instant
        if let last = lastNominatimScheduledAt {
            earliestNext = max(current, last + nominatimMinInterval)
        } else {
            earliestNext = current
        }
        lastNominatimScheduledAt = earliestNext
        if earliestNext > current {
            try await sleeper(earliestNext - current)
        }
    }

    private nonisolated static func fetchJSONWithTimeout<T: Decodable & Sendable>(
        url: URL,
        timeout: Duration,
        headers: [String: String],
        urlSession: URLSession,
        as type: T.Type
    ) async throws -> T? {
        try Task.checkCancellation()

        let timeoutSeconds = Double(timeout.components.seconds)
            + Double(timeout.components.attoseconds) / 1e18
        var request = URLRequest(url: url, timeoutInterval: max(0.1, timeoutSeconds))
        request.httpMethod = "GET"
        for (key, value) in headers {
            request.setValue(value, forHTTPHeaderField: key)
        }
        let finalRequest = request

        do {
            let outcome: FetchOutcome<T> = try await withThrowingTaskGroup(of: FetchOutcome<T>.self) { group in
                group.addTask {
                    do {
                        let (data, response) = try await urlSession.data(for: finalRequest)
                        guard let http = response as? HTTPURLResponse,
                              (200...299).contains(http.statusCode) else {
                            return .loaded(nil)
                        }
                        let decoded = try? JSONDecoder().decode(T.self, from: data)
                        return .loaded(decoded)
                    } catch is CancellationError {
                        throw CancellationError()
                    } catch {
                        return .loaded(nil)
                    }
                }
                group.addTask {
                    try await Task.sleep(for: timeout)
                    return .timedOut
                }

                guard let first = try await group.next() else {
                    return .timedOut
                }
                group.cancelAll()
                return first
            }

            try Task.checkCancellation()
            switch outcome {
            case .loaded(let value):
                return value
            case .timedOut:
                return nil
            }
        } catch is CancellationError {
            if Task.isCancelled {
                throw CancellationError()
            }
            return nil
        }
    }

    // MARK: - URL Builders

    private nonisolated static func buildBanSearchURL(
        query: String,
        limit: Int,
        biasCoords: LatLon?
    ) -> URL? {
        guard var comp = URLComponents(string: banSearchBaseURL) else { return nil }
        var items = [
            URLQueryItem(name: "q", value: query),
            URLQueryItem(name: "limit", value: String(limit)),
        ]
        if let biasCoords {
            items.append(URLQueryItem(name: "lat", value: jsNumberString(biasCoords.lat)))
            items.append(URLQueryItem(name: "lon", value: jsNumberString(biasCoords.lon)))
        }
        comp.queryItems = items
        return comp.url
    }

    private nonisolated static func buildBanReverseURL(lat: Double, lon: Double) -> URL? {
        guard var comp = URLComponents(string: banReverseBaseURL) else { return nil }
        comp.queryItems = [
            URLQueryItem(name: "lon", value: jsNumberString(lon)),
            URLQueryItem(name: "lat", value: jsNumberString(lat)),
        ]
        return comp.url
    }

    private nonisolated static func buildPhotonSearchURL(
        query: String,
        limit: Int,
        lang: CadenceLang,
        biasCoords: LatLon?
    ) -> URL? {
        guard var comp = URLComponents(string: photonSearchBaseURL) else { return nil }
        var items = [
            URLQueryItem(name: "q", value: query),
            URLQueryItem(name: "limit", value: String(limit)),
            URLQueryItem(name: "lang", value: lang.rawValue),
        ]
        if let biasCoords {
            items.append(URLQueryItem(name: "lat", value: jsNumberString(biasCoords.lat)))
            items.append(URLQueryItem(name: "lon", value: jsNumberString(biasCoords.lon)))
        }
        comp.queryItems = items
        return comp.url
    }

    private nonisolated static func buildPhotonReverseURL(lat: Double, lon: Double) -> URL? {
        guard var comp = URLComponents(string: photonReverseBaseURL) else { return nil }
        comp.queryItems = [
            URLQueryItem(name: "lat", value: jsNumberString(lat)),
            URLQueryItem(name: "lon", value: jsNumberString(lon)),
        ]
        return comp.url
    }

    private nonisolated static func buildNominatimSearchURL(
        query: String,
        limit: Int,
        lang: CadenceLang
    ) -> URL? {
        guard var comp = URLComponents(string: nominatimSearchBaseURL) else { return nil }
        comp.queryItems = [
            URLQueryItem(name: "q", value: query),
            URLQueryItem(name: "format", value: "json"),
            URLQueryItem(name: "addressdetails", value: "1"),
            URLQueryItem(name: "limit", value: String(limit)),
            URLQueryItem(name: "accept-language", value: lang.rawValue),
        ]
        return comp.url
    }

    private nonisolated static func buildNominatimReverseURL(
        lat: Double,
        lon: Double,
        lang: CadenceLang
    ) -> URL? {
        guard var comp = URLComponents(string: nominatimReverseBaseURL) else { return nil }
        comp.queryItems = [
            URLQueryItem(name: "lat", value: jsNumberString(lat)),
            URLQueryItem(name: "lon", value: jsNumberString(lon)),
            URLQueryItem(name: "format", value: "json"),
            URLQueryItem(name: "accept-language", value: lang.rawValue),
        ]
        return comp.url
    }

    // MARK: - Feature Formatters

    private nonisolated static func formatBanFeature(_ feature: BanFeature) -> LocationSuggestion? {
        guard let p = feature.properties,
              let coords = feature.geometry?.coordinates,
              coords.count >= 2 else {
            return nil
        }
        let lon = coords[0]
        let lat = coords[1]
        guard lat.isFinite, lon.isFinite else { return nil }

        let rawName = nonEmpty(p.name) ?? nonEmpty(p.label) ?? "Lieu"
        let name = appendCityIfMissing(baseName: rawName, city: p.city)
        var secondaryParts: [String] = []
        if let pc = nonEmpty(p.postcode), let city = nonEmpty(p.city) {
            secondaryParts.append("\(pc) \(city)")
        } else if let city = nonEmpty(p.city) {
            secondaryParts.append(city)
        }
        if let ctx = nonEmpty(p.context) {
            secondaryParts.append(ctx)
        }

        let secondaryText = secondaryParts.joined(separator: " · ")
        let fullDisplayName = nonEmpty(p.label) ?? (secondaryText.isEmpty ? name : "\(name), \(secondaryText)")

        return LocationSuggestion(
            id: "ban-\(nonEmpty(p.id) ?? UUID().uuidString)",
            name: name,
            secondaryText: secondaryText,
            fullDisplayName: fullDisplayName,
            coordinates: LatLon(lat, lon),
            type: nonEmpty(p.type) ?? "housenumber",
            source: .ban
        )
    }

    private nonisolated static func formatPhotonFeature(_ feature: PhotonFeature) -> LocationSuggestion? {
        guard let p = feature.properties,
              let coords = feature.geometry?.coordinates,
              coords.count >= 2 else {
            return nil
        }
        let lon = coords[0]
        let lat = coords[1]
        guard lat.isFinite, lon.isFinite else { return nil }

        let houseStreet: String? = {
            guard let hn = nonEmpty(p.housenumber) else { return nil }
            let combined = "\(hn) \(p.street ?? "")".trimmingCharacters(in: .whitespacesAndNewlines)
            return combined.isEmpty ? nil : combined
        }()
        let rawName = nonEmpty(p.name) ?? houseStreet ?? nonEmpty(p.street) ?? nonEmpty(p.city) ?? "Lieu"
        let name = appendCityIfMissing(baseName: rawName, city: p.city)

        var secondaryParts: [String] = []
        if let hn = nonEmpty(p.housenumber), let st = nonEmpty(p.street), rawName != "\(hn) \(st)" {
            secondaryParts.append("\(hn) \(st)")
        } else if let st = nonEmpty(p.street), rawName != st {
            secondaryParts.append(st)
        }

        if let pc = nonEmpty(p.postcode), let city = nonEmpty(p.city) {
            secondaryParts.append("\(pc) \(city)")
        } else if let city = nonEmpty(p.city), city != rawName {
            secondaryParts.append(city)
        }

        if let county = nonEmpty(p.county), county != p.city && county != rawName {
            secondaryParts.append(county)
        }
        if let state = nonEmpty(p.state), state != p.county && state != p.city {
            secondaryParts.append(state)
        }
        if let country = nonEmpty(p.country), country != "France" {
            secondaryParts.append(country)
        }

        let secondaryText = secondaryParts.joined(separator: " · ")
        let fullDisplayName = secondaryText.isEmpty ? name : "\(name), \(secondaryText)"

        return LocationSuggestion(
            id: "photon-\(nonEmpty(p.osm_type) ?? "x")-\(p.osm_id?.stringValue ?? UUID().uuidString)-\(jsNumberString(lat))-\(jsNumberString(lon))",
            name: name,
            secondaryText: secondaryText,
            fullDisplayName: fullDisplayName,
            coordinates: LatLon(lat, lon),
            type: nonEmpty(p.type) ?? nonEmpty(p.osm_value),
            source: .photon
        )
    }

    private nonisolated static func formatNominatimItem(_ item: NominatimItem) -> LocationSuggestion? {
        guard let latStr = nonEmpty(item.lat),
              let lonStr = nonEmpty(item.lon),
              let lat = Double(latStr),
              let lon = Double(lonStr),
              lat.isFinite,
              lon.isFinite else {
            return nil
        }

        let parts = (item.display_name ?? "")
            .split(separator: ",")
            .map { $0.trimmingCharacters(in: .whitespacesAndNewlines) }
        let city = nonEmpty(item.address?.city)
            ?? nonEmpty(item.address?.town)
            ?? nonEmpty(item.address?.village)
            ?? nonEmpty(item.address?.municipality)

        let rawName: String
        if let road = nonEmpty(item.address?.road),
           let first = parts.first,
           first.range(of: #"^\d+[a-zA-Z]?$"#, options: .regularExpression) != nil {
            rawName = "\(first) \(road)"
        } else {
            rawName = nonEmpty(item.name) ?? nonEmpty(parts.first) ?? "Lieu"
        }

        let name = appendCityIfMissing(baseName: rawName, city: city)
        let secondaryParts = Array(parts.dropFirst().prefix(3))
        let secondaryText = secondaryParts.joined(separator: " · ")

        return LocationSuggestion(
            id: "nominatim-\(item.place_id?.stringValue ?? UUID().uuidString)-\(jsNumberString(lat))-\(jsNumberString(lon))",
            name: name,
            secondaryText: secondaryText,
            fullDisplayName: nonEmpty(item.display_name) ?? name,
            coordinates: LatLon(lat, lon),
            type: nonEmpty(item.type) ?? nonEmpty(item.class),
            source: .nominatim
        )
    }

    private nonisolated static func nonEmpty(_ value: String?) -> String? {
        guard let value else { return nil }
        let trimmed = value.trimmingCharacters(in: .whitespacesAndNewlines)
        return trimmed.isEmpty ? nil : trimmed
    }

    private nonisolated static func jsNumberString(_ value: Double) -> String {
        guard value.isFinite else { return "0" }
        if value == 0 { return "0" }
        if value.truncatingRemainder(dividingBy: 1) == 0, abs(value) < Double(Int64.max) {
            return String(Int64(value))
        }
        return String(value)
    }
}
