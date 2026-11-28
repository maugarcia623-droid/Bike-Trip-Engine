import Foundation
import SwiftData
import CadenceCore

@ModelActor
public actor CadenceStore: SyncLocalStore {
    public static let maxUnpinnedCorridorEntries = 50
    public static let maxUnpinnedSurfaceEntries = 40

    // MARK: - Trips

    public func fetchActiveTrips() throws -> [TripProfile] {
        let descriptor = FetchDescriptor<SDTripRecord>(
            predicate: #Predicate { $0.deletedAt == nil },
            sortBy: [
                SortDescriptor(\SDTripRecord.sortOrder, order: .forward),
                SortDescriptor(\SDTripRecord.clientUpdatedAt, order: .reverse),
            ]
        )
        let rows = try modelContext.fetch(descriptor)
        return try rows.map { try $0.decodeTrip() }
    }

    public func fetchTrip(clientId: String) throws -> TripProfile? {
        let descriptor = FetchDescriptor<SDTripRecord>(
            predicate: #Predicate { $0.clientId == clientId && $0.deletedAt == nil }
        )
        return try modelContext.fetch(descriptor).first?.decodeTrip()
    }

    public func fetchAllTripRecordsIncludingDeleted() throws -> [SyncTripRecord] {
        let descriptor = FetchDescriptor<SDTripRecord>(
            sortBy: [
                SortDescriptor(\SDTripRecord.sortOrder, order: .forward),
                SortDescriptor(\SDTripRecord.clientUpdatedAt, order: .reverse),
            ]
        )
        return try modelContext.fetch(descriptor).map { try $0.toSyncRecord() }
    }

    public func upsertTrip(
        _ trip: TripProfile,
        sortOrder: Int? = nil,
        clientUpdatedAt: Date = Date(),
        markNeedsSync: Bool = true
    ) throws {
        let clientId = trip.id
        let payloadData = try PersistenceCodec.encode(trip)
        let normalizedDeparture = SyncTimestamp.normalizeDepartureDate(trip.departureDate)
        let existingDescriptor = FetchDescriptor<SDTripRecord>(
            predicate: #Predicate { $0.clientId == clientId }
        )

        if let existing = try modelContext.fetch(existingDescriptor).first {
            existing.schemaVersion = 2
            existing.name = trip.name
            existing.tag = trip.tag
            existing.departureDate = normalizedDeparture
            if let sortOrder {
                existing.sortOrder = sortOrder
            }
            existing.payloadData = payloadData
            existing.clientUpdatedAt = clientUpdatedAt
            existing.deletedAt = nil
            existing.needsSync = markNeedsSync
        } else {
            let resolvedSortOrder: Int
            if let sortOrder {
                resolvedSortOrder = sortOrder
            } else {
                let allCount = try modelContext.fetchCount(FetchDescriptor<SDTripRecord>())
                resolvedSortOrder = allCount
            }
            let record = SDTripRecord(
                clientId: clientId,
                schemaVersion: 2,
                name: trip.name,
                tag: trip.tag,
                departureDate: normalizedDeparture,
                sortOrder: resolvedSortOrder,
                payloadData: payloadData,
                clientUpdatedAt: clientUpdatedAt,
                serverUpdatedAt: nil,
                deletedAt: nil,
                needsSync: markNeedsSync
            )
            modelContext.insert(record)
        }
        try modelContext.save()
    }

    public func softDeleteTrip(
        clientId: String,
        deletedAt: Date = Date(),
        markNeedsSync: Bool = true
    ) throws {
        let descriptor = FetchDescriptor<SDTripRecord>(
            predicate: #Predicate { $0.clientId == clientId }
        )
        guard let existing = try modelContext.fetch(descriptor).first else { return }
        existing.deletedAt = deletedAt
        existing.clientUpdatedAt = deletedAt
        existing.needsSync = markNeedsSync
        try modelContext.save()
    }

    public func markTripsSynced(clientIds: [String], serverUpdatedAt: Date) throws {
        guard !clientIds.isEmpty else { return }
        let idSet = Set(clientIds)
        let rows = try modelContext.fetch(FetchDescriptor<SDTripRecord>())
        for row in rows where idSet.contains(row.clientId) {
            row.needsSync = false
            row.serverUpdatedAt = serverUpdatedAt
        }
        try modelContext.save()
    }

    // MARK: - SyncLocalStore (Trips)

    public func fetchSyncableTrips(includeDeleted: Bool) async throws -> [SyncTripRecord] {
        if includeDeleted {
            return try fetchAllTripRecordsIncludingDeleted()
        }
        let descriptor = FetchDescriptor<SDTripRecord>(
            predicate: #Predicate { $0.deletedAt == nil },
            sortBy: [
                SortDescriptor(\SDTripRecord.sortOrder, order: .forward),
                SortDescriptor(\SDTripRecord.clientUpdatedAt, order: .reverse),
            ]
        )
        return try modelContext.fetch(descriptor).map { try $0.toSyncRecord() }
    }

    public func upsertSyncedTrips(_ records: [SyncTripRecord]) async throws {
        guard !records.isEmpty else { return }
        for item in records {
            let clientId = item.clientId
            let payloadData = try PersistenceCodec.encode(item.trip)
            let normalizedDeparture = SyncTimestamp.normalizeDepartureDate(item.trip.departureDate)
            let descriptor = FetchDescriptor<SDTripRecord>(
                predicate: #Predicate { $0.clientId == clientId }
            )
            if let existing = try modelContext.fetch(descriptor).first {
                existing.schemaVersion = 2
                existing.name = item.trip.name
                existing.tag = item.trip.tag
                existing.departureDate = normalizedDeparture
                existing.sortOrder = item.sortOrder
                existing.payloadData = payloadData
                existing.clientUpdatedAt = item.clientUpdatedAt
                existing.serverUpdatedAt = item.serverUpdatedAt
                existing.deletedAt = item.deletedAt
                existing.needsSync = item.needsSync
            } else {
                let row = SDTripRecord(
                    clientId: clientId,
                    schemaVersion: 2,
                    name: item.trip.name,
                    tag: item.trip.tag,
                    departureDate: normalizedDeparture,
                    sortOrder: item.sortOrder,
                    payloadData: payloadData,
                    clientUpdatedAt: item.clientUpdatedAt,
                    serverUpdatedAt: item.serverUpdatedAt,
                    deletedAt: item.deletedAt,
                    needsSync: item.needsSync
                )
                modelContext.insert(row)
            }
        }
        try modelContext.save()
    }

    // MARK: - Bikes

    public func fetchActiveBikes() throws -> [BikeSpec] {
        let descriptor = FetchDescriptor<SDBikeRecord>(
            predicate: #Predicate { $0.deletedAt == nil },
            sortBy: [SortDescriptor(\SDBikeRecord.sortOrder, order: .forward)]
        )
        return try modelContext.fetch(descriptor).map { try $0.decodeBike() }
    }

    public func fetchBike(clientId: String) throws -> BikeSpec? {
        let descriptor = FetchDescriptor<SDBikeRecord>(
            predicate: #Predicate { $0.clientId == clientId && $0.deletedAt == nil }
        )
        return try modelContext.fetch(descriptor).first?.decodeBike()
    }

    public func fetchAllBikeRecordsIncludingDeleted() throws -> [SyncBikeRecord] {
        let descriptor = FetchDescriptor<SDBikeRecord>(
            sortBy: [SortDescriptor(\SDBikeRecord.sortOrder, order: .forward)]
        )
        return try modelContext.fetch(descriptor).map { try $0.toSyncRecord() }
    }

    public func upsertBike(
        _ bike: BikeSpec,
        sortOrder: Int? = nil,
        clientUpdatedAt: Date = Date(),
        markNeedsSync: Bool = true
    ) throws {
        let clientId = bike.id
        let payloadData = try PersistenceCodec.encode(bike)
        let categoryRaw = bike.bikeCategory?.rawValue ?? BikeCategory.gravel.rawValue
        let descriptor = FetchDescriptor<SDBikeRecord>(
            predicate: #Predicate { $0.clientId == clientId }
        )

        if let existing = try modelContext.fetch(descriptor).first {
            existing.schemaVersion = 2
            existing.name = bike.name
            existing.category = categoryRaw
            if let sortOrder {
                existing.sortOrder = sortOrder
            }
            existing.payloadData = payloadData
            existing.clientUpdatedAt = clientUpdatedAt
            existing.deletedAt = nil
            existing.needsSync = markNeedsSync
        } else {
            let resolvedSortOrder: Int
            if let sortOrder {
                resolvedSortOrder = sortOrder
            } else {
                resolvedSortOrder = try modelContext.fetchCount(FetchDescriptor<SDBikeRecord>())
            }
            let row = SDBikeRecord(
                clientId: clientId,
                schemaVersion: 2,
                name: bike.name,
                category: categoryRaw,
                sortOrder: resolvedSortOrder,
                payloadData: payloadData,
                clientUpdatedAt: clientUpdatedAt,
                serverUpdatedAt: nil,
                deletedAt: nil,
                needsSync: markNeedsSync
            )
            modelContext.insert(row)
        }
        try modelContext.save()
    }

    public func softDeleteBike(
        clientId: String,
        deletedAt: Date = Date(),
        markNeedsSync: Bool = true
    ) throws {
        let descriptor = FetchDescriptor<SDBikeRecord>(
            predicate: #Predicate { $0.clientId == clientId }
        )
        guard let existing = try modelContext.fetch(descriptor).first else { return }
        existing.deletedAt = deletedAt
        existing.clientUpdatedAt = deletedAt
        existing.needsSync = markNeedsSync
        try modelContext.save()
    }

    public func markBikesSynced(clientIds: [String], serverUpdatedAt: Date) throws {
        guard !clientIds.isEmpty else { return }
        let idSet = Set(clientIds)
        let rows = try modelContext.fetch(FetchDescriptor<SDBikeRecord>())
        for row in rows where idSet.contains(row.clientId) {
            row.needsSync = false
            row.serverUpdatedAt = serverUpdatedAt
        }
        try modelContext.save()
    }

    // MARK: - SyncLocalStore (Bikes)

    public func fetchSyncableBikes(includeDeleted: Bool) async throws -> [SyncBikeRecord] {
        if includeDeleted {
            return try fetchAllBikeRecordsIncludingDeleted()
        }
        let descriptor = FetchDescriptor<SDBikeRecord>(
            predicate: #Predicate { $0.deletedAt == nil },
            sortBy: [SortDescriptor(\SDBikeRecord.sortOrder, order: .forward)]
        )
        return try modelContext.fetch(descriptor).map { try $0.toSyncRecord() }
    }

    public func upsertSyncedBikes(_ records: [SyncBikeRecord]) async throws {
        guard !records.isEmpty else { return }
        for item in records {
            let clientId = item.clientId
            let payloadData = try PersistenceCodec.encode(item.bike)
            let categoryRaw = item.bike.bikeCategory?.rawValue ?? BikeCategory.gravel.rawValue
            let descriptor = FetchDescriptor<SDBikeRecord>(
                predicate: #Predicate { $0.clientId == clientId }
            )
            if let existing = try modelContext.fetch(descriptor).first {
                existing.schemaVersion = 2
                existing.name = item.bike.name
                existing.category = categoryRaw
                existing.sortOrder = item.sortOrder
                existing.payloadData = payloadData
                existing.clientUpdatedAt = item.clientUpdatedAt
                existing.serverUpdatedAt = item.serverUpdatedAt
                existing.deletedAt = item.deletedAt
                existing.needsSync = item.needsSync
            } else {
                let row = SDBikeRecord(
                    clientId: clientId,
                    schemaVersion: 2,
                    name: item.bike.name,
                    category: categoryRaw,
                    sortOrder: item.sortOrder,
                    payloadData: payloadData,
                    clientUpdatedAt: item.clientUpdatedAt,
                    serverUpdatedAt: item.serverUpdatedAt,
                    deletedAt: item.deletedAt,
                    needsSync: item.needsSync
                )
                modelContext.insert(row)
            }
        }
        try modelContext.save()
    }

    // MARK: - Rider Profile

    public func fetchRiderProfile() throws -> SyncRiderProfileRecord {
        if let record = try fetchStoredRiderProfileRecord() {
            return try record.toSyncRecord()
        }
        return SyncRiderProfileRecord(
            userId: nil,
            riderName: nil,
            activeTripClientId: nil,
            activeBikeClientId: RiderBikeSpecs.defaultSpecs.activeBikeId,
            specs: RiderSpecsCloudPayload(from: RiderBikeSpecs.defaultSpecs),
            profile: UserProfileDTO(),
            hasCompletedOnboarding: false,
            clientUpdatedAt: Date.distantPast,
            serverUpdatedAt: nil,
            needsSync: false
        )
    }

    public func fetchEffectiveRiderSpecs() throws -> RiderBikeSpecs {
        let activeBikes = try fetchActiveBikes()
        let totalBikeCount = try modelContext.fetchCount(FetchDescriptor<SDBikeRecord>())
        let resolvedBikes = (activeBikes.isEmpty && totalBikeCount == 0)
            ? RiderBikeSpecs.defaultBikes
            : activeBikes

        if let stored = try fetchStoredRiderProfileRecord() {
            let payload = try stored.decodeSpecsPayload()
            return payload.toRiderBikeSpecs(
                bikes: resolvedBikes,
                riderNameOverride: stored.riderName,
                activeBikeClientId: stored.activeBikeClientId
            )
        }

        var defaults = RiderBikeSpecs.defaultSpecs
        defaults.bikes = resolvedBikes
        if !resolvedBikes.contains(where: { $0.id == defaults.activeBikeId }) {
            defaults.activeBikeId = resolvedBikes.first?.id ?? ""
        }
        return defaults
    }

    public func saveRiderProfile(
        specs: RiderBikeSpecs,
        userProfile: UserProfileDTO? = nil,
        activeTripClientId: String? = nil,
        activeBikeClientId: String? = nil,
        hasCompletedOnboarding: Bool? = nil,
        userId: String? = nil,
        clientUpdatedAt: Date = Date(),
        markNeedsSync: Bool = true
    ) throws {
        let payload = RiderSpecsCloudPayload(from: specs)
        let specsData = try PersistenceCodec.encode(payload)
        let profileData = try userProfile.map { try PersistenceCodec.encode($0) }
        let resolvedActiveBike = activeBikeClientId ?? (specs.activeBikeId.isEmpty ? nil : specs.activeBikeId)

        if let existing = try fetchStoredRiderProfileRecord() {
            if let userId { existing.userId = userId }
            existing.riderName = specs.riderName ?? existing.riderName
            if let activeTripClientId { existing.activeTripClientId = activeTripClientId }
            if let resolvedActiveBike { existing.activeBikeClientId = resolvedActiveBike }
            existing.specsPayloadData = specsData
            if let profileData { existing.userProfilePayloadData = profileData }
            if let hasCompletedOnboarding { existing.hasCompletedOnboarding = hasCompletedOnboarding }
            existing.clientUpdatedAt = clientUpdatedAt
            existing.needsSync = markNeedsSync
        } else {
            let record = SDRiderProfileRecord(
                profileKey: SDRiderProfileRecord.primaryKey,
                userId: userId,
                schemaVersion: 2,
                riderName: specs.riderName,
                activeTripClientId: activeTripClientId,
                activeBikeClientId: resolvedActiveBike,
                specsPayloadData: specsData,
                userProfilePayloadData: profileData,
                hasCompletedOnboarding: hasCompletedOnboarding ?? false,
                clientUpdatedAt: clientUpdatedAt,
                serverUpdatedAt: nil,
                needsSync: markNeedsSync
            )
            modelContext.insert(record)
        }
        try modelContext.save()
    }

    public func markRiderProfileSynced(userId: String, serverUpdatedAt: Date) throws {
        guard let existing = try fetchStoredRiderProfileRecord() else { return }
        existing.userId = userId
        existing.needsSync = false
        existing.serverUpdatedAt = serverUpdatedAt
        try modelContext.save()
    }

    // MARK: - SyncLocalStore (Rider Profile)

    public func fetchSyncableRiderProfile() async throws -> SyncRiderProfileRecord? {
        guard let existing = try fetchStoredRiderProfileRecord() else {
            return nil
        }
        return try existing.toSyncRecord()
    }

    public func upsertSyncedRiderProfile(_ record: SyncRiderProfileRecord) async throws {
        let specsData = try PersistenceCodec.encode(record.specs)
        let profileData = try PersistenceCodec.encode(record.profile)

        if let existing = try fetchStoredRiderProfileRecord() {
            existing.userId = record.userId ?? existing.userId
            existing.riderName = record.riderName
            existing.activeTripClientId = record.activeTripClientId
            existing.activeBikeClientId = record.activeBikeClientId
            existing.specsPayloadData = specsData
            existing.userProfilePayloadData = profileData
            existing.hasCompletedOnboarding = record.hasCompletedOnboarding || !(record.profile.completedAt?.isEmpty ?? true)
            existing.clientUpdatedAt = record.clientUpdatedAt
            existing.serverUpdatedAt = record.serverUpdatedAt
            existing.needsSync = record.needsSync
        } else {
            let row = SDRiderProfileRecord(
                profileKey: SDRiderProfileRecord.primaryKey,
                userId: record.userId,
                schemaVersion: 2,
                riderName: record.riderName,
                activeTripClientId: record.activeTripClientId,
                activeBikeClientId: record.activeBikeClientId,
                specsPayloadData: specsData,
                userProfilePayloadData: profileData,
                hasCompletedOnboarding: record.hasCompletedOnboarding || !(record.profile.completedAt?.isEmpty ?? true),
                clientUpdatedAt: record.clientUpdatedAt,
                serverUpdatedAt: record.serverUpdatedAt,
                needsSync: record.needsSync
            )
            modelContext.insert(row)
        }
        try modelContext.save()
    }

    private func fetchStoredRiderProfileRecord() throws -> SDRiderProfileRecord? {
        let primaryKey = SDRiderProfileRecord.primaryKey
        let descriptor = FetchDescriptor<SDRiderProfileRecord>(
            predicate: #Predicate { $0.profileKey == primaryKey }
        )
        return try modelContext.fetch(descriptor).first
    }

    // MARK: - Offline Packs

    public func fetchOfflinePack(tripId: String) throws -> OfflinePackMeta? {
        let descriptor = FetchDescriptor<SDOfflinePackRecord>(
            predicate: #Predicate { $0.tripId == tripId }
        )
        return try modelContext.fetch(descriptor).first?.toMeta()
    }

    public func fetchAllOfflinePacks() throws -> [OfflinePackMeta] {
        let descriptor = FetchDescriptor<SDOfflinePackRecord>(
            sortBy: [SortDescriptor(\SDOfflinePackRecord.savedAt, order: .reverse)]
        )
        return try modelContext.fetch(descriptor).map { try $0.toMeta() }
    }

    public func saveOfflinePack(_ meta: OfflinePackMeta, pinnedCacheKeys: [String] = []) throws {
        let resolvedKeys = pinnedCacheKeys.isEmpty ? meta.pinnedCacheKeys : pinnedCacheKeys
        let keysData = try PersistenceCodec.encode(resolvedKeys)
        let tripId = meta.tripId
        let descriptor = FetchDescriptor<SDOfflinePackRecord>(
            predicate: #Predicate { $0.tripId == tripId }
        )

        var previousKeys = Set<String>()
        if let existing = try modelContext.fetch(descriptor).first {
            previousKeys = Set(try existing.decodePinnedCacheKeys())
            existing.tripName = meta.tripName
            existing.savedAt = meta.savedAt
            existing.distanceKm = meta.distanceKm
            existing.amenitiesCount = meta.amenitiesCount
            existing.hasSurface = meta.hasSurface
            existing.hasWeather = meta.hasWeather
            existing.tilesPrefetched = meta.tilesPrefetched
            existing.pinnedCacheKeysData = keysData
        } else {
            let record = SDOfflinePackRecord(
                tripId: meta.tripId,
                tripName: meta.tripName,
                savedAt: meta.savedAt,
                distanceKm: meta.distanceKm,
                amenitiesCount: meta.amenitiesCount,
                hasSurface: meta.hasSurface,
                hasWeather: meta.hasWeather,
                tilesPrefetched: meta.tilesPrefetched,
                pinnedCacheKeysData: keysData
            )
            modelContext.insert(record)
        }

        let resolvedKeySet = Set(resolvedKeys)
        if !resolvedKeySet.isEmpty {
            try updatePinnedState(for: resolvedKeySet, isPinned: true)
        }

        let droppedKeys = previousKeys.subtracting(resolvedKeySet)
        if !droppedKeys.isEmpty {
            let keysToUnpin = try unreferencedKeys(from: droppedKeys, excludingTripId: tripId)
            if !keysToUnpin.isEmpty {
                try updatePinnedState(for: keysToUnpin, isPinned: false)
            }
        }
        try modelContext.save()
    }

    public func deleteOfflinePack(tripId: String) throws {
        let descriptor = FetchDescriptor<SDOfflinePackRecord>(
            predicate: #Predicate { $0.tripId == tripId }
        )
        guard let target = try modelContext.fetch(descriptor).first else { return }
        let removedKeys = Set(try target.decodePinnedCacheKeys())
        modelContext.delete(target)

        if !removedKeys.isEmpty {
            let keysToUnpin = try unreferencedKeys(from: removedKeys, excludingTripId: tripId)
            if !keysToUnpin.isEmpty {
                try updatePinnedState(for: keysToUnpin, isPinned: false)
            }
        }
        try modelContext.save()
    }

    private func unreferencedKeys(
        from candidateKeys: Set<String>,
        excludingTripId tripId: String
    ) throws -> Set<String> {
        guard !candidateKeys.isEmpty else { return [] }
        let remainingPacks = try modelContext.fetch(FetchDescriptor<SDOfflinePackRecord>())
        var stillPinned = Set<String>()
        for pack in remainingPacks where pack.tripId != tripId {
            for key in try pack.decodePinnedCacheKeys() {
                stillPinned.insert(key)
            }
        }
        return candidateKeys.subtracting(stillPinned)
    }

    private func updatePinnedState(for keys: Set<String>, isPinned: Bool) throws {
        let corridorRows = try modelContext.fetch(FetchDescriptor<SDCachedCorridorScan>())
        for row in corridorRows where keys.contains(row.cacheKey) {
            row.isPinnedOffline = isPinned
        }

        let surfaceRows = try modelContext.fetch(FetchDescriptor<SDCachedSurface>())
        for row in surfaceRows where keys.contains(row.routeKey) {
            row.isPinnedOffline = isPinned
        }

        let weatherRows = try modelContext.fetch(FetchDescriptor<SDCachedWeather>())
        for row in weatherRows where keys.contains(row.compositeKey) || keys.contains(row.cacheKey) {
            row.isPinnedOffline = isPinned
        }
    }

    // MARK: - Corridor Amenities Cache

    public func fetchCachedCorridorScan(
        cacheKey: String,
        now: Date = Date(),
        allowExpired: Bool = false
    ) throws -> [StageAmenity]? {
        let descriptor = FetchDescriptor<SDCachedCorridorScan>(
            predicate: #Predicate { $0.cacheKey == cacheKey }
        )
        guard let row = try modelContext.fetch(descriptor).first else { return nil }
        if !allowExpired, !row.isPinnedOffline, let expiresAt = row.expiresAt, expiresAt <= now {
            return nil
        }
        row.lastAccessedAt = now
        try modelContext.save()
        return try row.decodeAmenities()
    }

    public func saveCachedCorridorScan(
        cacheKey: String,
        stageId: String,
        distanceKm: Double,
        amenities: [StageAmenity],
        ttlSeconds: TimeInterval = 21_600,
        pinOffline: Bool = false,
        now: Date = Date()
    ) throws {
        let payloadData = try PersistenceCodec.encode(amenities)
        let expiresAt: Date? = ttlSeconds > 0 ? now.addingTimeInterval(ttlSeconds) : nil
        let descriptor = FetchDescriptor<SDCachedCorridorScan>(
            predicate: #Predicate { $0.cacheKey == cacheKey }
        )

        if let existing = try modelContext.fetch(descriptor).first {
            existing.stageId = stageId
            existing.distanceKm = distanceKm
            existing.amenitiesCount = amenities.count
            existing.payloadData = payloadData
            existing.lastAccessedAt = now
            existing.expiresAt = expiresAt
            if pinOffline {
                existing.isPinnedOffline = true
            }
        } else {
            let row = SDCachedCorridorScan(
                cacheKey: cacheKey,
                stageId: stageId,
                distanceKm: distanceKm,
                amenitiesCount: amenities.count,
                payloadData: payloadData,
                createdAt: now,
                lastAccessedAt: now,
                expiresAt: expiresAt,
                isPinnedOffline: pinOffline
            )
            modelContext.insert(row)
        }

        try evictUnpinnedCorridorScansIfNeeded()
        try modelContext.save()
    }

    private func evictUnpinnedCorridorScansIfNeeded() throws {
        let descriptor = FetchDescriptor<SDCachedCorridorScan>(
            predicate: #Predicate { $0.isPinnedOffline == false },
            sortBy: [SortDescriptor(\SDCachedCorridorScan.lastAccessedAt, order: .forward)]
        )
        let unpinned = try modelContext.fetch(descriptor)
        if unpinned.count > Self.maxUnpinnedCorridorEntries {
            let excess = unpinned.count - Self.maxUnpinnedCorridorEntries
            for row in unpinned.prefix(excess) {
                modelContext.delete(row)
            }
        }
    }

    // MARK: - OSM Surface Cache

    public func fetchCachedSurface(
        routeKey: String,
        now: Date = Date(),
        allowExpired: Bool = false
    ) throws -> OsmSurfaceRouteData? {
        let descriptor = FetchDescriptor<SDCachedSurface>(
            predicate: #Predicate { $0.routeKey == routeKey }
        )
        guard let row = try modelContext.fetch(descriptor).first else { return nil }
        if !allowExpired, !row.isPinnedOffline, let expiresAt = row.expiresAt, expiresAt <= now {
            return nil
        }
        row.lastAccessedAt = now
        try modelContext.save()
        return try row.decodeSurface()
    }

    public func saveCachedSurface(
        _ data: OsmSurfaceRouteData,
        ttlSeconds: TimeInterval = 604_800,
        pinOffline: Bool = false,
        now: Date = Date()
    ) throws {
        let routeKey = data.routeKey
        let payloadData = try PersistenceCodec.encode(data)
        let expiresAt: Date? = ttlSeconds > 0 ? now.addingTimeInterval(ttlSeconds) : nil
        let descriptor = FetchDescriptor<SDCachedSurface>(
            predicate: #Predicate { $0.routeKey == routeKey }
        )

        if let existing = try modelContext.fetch(descriptor).first {
            existing.wayCount = data.wayCount
            existing.chunkCount = data.chunkCount
            existing.fetchedAtIso = data.fetchedAt
            existing.payloadData = payloadData
            existing.lastAccessedAt = now
            existing.expiresAt = expiresAt
            if pinOffline {
                existing.isPinnedOffline = true
            }
        } else {
            let row = SDCachedSurface(
                routeKey: routeKey,
                wayCount: data.wayCount,
                chunkCount: data.chunkCount,
                fetchedAtIso: data.fetchedAt,
                payloadData: payloadData,
                createdAt: now,
                lastAccessedAt: now,
                expiresAt: expiresAt,
                isPinnedOffline: pinOffline
            )
            modelContext.insert(row)
        }

        try evictUnpinnedSurfacesIfNeeded()
        try modelContext.save()
    }

    private func evictUnpinnedSurfacesIfNeeded() throws {
        let descriptor = FetchDescriptor<SDCachedSurface>(
            predicate: #Predicate { $0.isPinnedOffline == false },
            sortBy: [SortDescriptor(\SDCachedSurface.lastAccessedAt, order: .forward)]
        )
        let unpinned = try modelContext.fetch(descriptor)
        if unpinned.count > Self.maxUnpinnedSurfaceEntries {
            let excess = unpinned.count - Self.maxUnpinnedSurfaceEntries
            for row in unpinned.prefix(excess) {
                modelContext.delete(row)
            }
        }
    }

    // MARK: - Weather Cache

    public func fetchCachedWeather<T: Decodable & Sendable>(
        kind: WeatherCacheKind,
        cacheKey: String,
        as type: T.Type,
        now: Date = Date(),
        allowExpired: Bool = false
    ) throws -> T? {
        let compositeKey = SDCachedWeather.makeCompositeKey(kind: kind, cacheKey: cacheKey)
        let descriptor = FetchDescriptor<SDCachedWeather>(
            predicate: #Predicate { $0.compositeKey == compositeKey }
        )
        guard let row = try modelContext.fetch(descriptor).first else { return nil }
        if !allowExpired, !row.isPinnedOffline, let expiresAt = row.expiresAt, expiresAt <= now {
            return nil
        }
        row.lastAccessedAt = now
        try modelContext.save()
        return try PersistenceCodec.decode(T.self, from: row.payloadData)
    }

    public func saveCachedWeather<T: Encodable & Sendable>(
        kind: WeatherCacheKind,
        cacheKey: String,
        value: T,
        source: String? = nil,
        ttlSeconds: TimeInterval,
        pinOffline: Bool = false,
        now: Date = Date()
    ) throws {
        let compositeKey = SDCachedWeather.makeCompositeKey(kind: kind, cacheKey: cacheKey)
        let payloadData = try PersistenceCodec.encode(value)
        let expiresAt: Date? = ttlSeconds > 0 ? now.addingTimeInterval(ttlSeconds) : nil
        let descriptor = FetchDescriptor<SDCachedWeather>(
            predicate: #Predicate { $0.compositeKey == compositeKey }
        )

        if let existing = try modelContext.fetch(descriptor).first {
            existing.source = source
            existing.payloadData = payloadData
            existing.lastAccessedAt = now
            existing.expiresAt = expiresAt
            if pinOffline {
                existing.isPinnedOffline = true
            }
        } else {
            let row = SDCachedWeather(
                compositeKey: compositeKey,
                kind: kind.rawValue,
                cacheKey: cacheKey,
                source: source,
                payloadData: payloadData,
                createdAt: now,
                lastAccessedAt: now,
                expiresAt: expiresAt,
                isPinnedOffline: pinOffline
            )
            modelContext.insert(row)
        }

        try evictUnpinnedWeatherIfNeeded(kind: kind)
        try modelContext.save()
    }

    private func evictUnpinnedWeatherIfNeeded(kind: WeatherCacheKind) throws {
        let kindRaw = kind.rawValue
        let descriptor = FetchDescriptor<SDCachedWeather>(
            predicate: #Predicate { $0.kind == kindRaw && $0.isPinnedOffline == false },
            sortBy: [SortDescriptor(\SDCachedWeather.lastAccessedAt, order: .forward)]
        )
        let unpinned = try modelContext.fetch(descriptor)
        let cap = kind.maxUnpinnedEntries
        if unpinned.count > cap {
            let excess = unpinned.count - cap
            for row in unpinned.prefix(excess) {
                modelContext.delete(row)
            }
        }
    }

    // MARK: - Pending Share Imports

    public func enqueuePendingShareImport(_ item: PendingShareImportDTO) throws {
        let importId = item.id
        let descriptor = FetchDescriptor<SDPendingShareImport>(
            predicate: #Predicate { $0.importId == importId }
        )
        if let existing = try modelContext.fetch(descriptor).first {
            existing.kind = item.kind.rawValue
            existing.status = item.status.rawValue
            existing.sourceUrl = item.sourceUrl
            existing.sharedText = item.sharedText
            existing.fileName = item.fileName
            existing.utTypeIdentifier = item.utTypeIdentifier
            existing.fileData = item.fileData
            existing.errorMessage = item.errorMessage
            existing.createdAt = item.createdAt
            existing.processedAt = item.processedAt
        } else {
            let row = SDPendingShareImport(
                importId: item.id,
                kind: item.kind.rawValue,
                status: item.status.rawValue,
                sourceUrl: item.sourceUrl,
                sharedText: item.sharedText,
                fileName: item.fileName,
                utTypeIdentifier: item.utTypeIdentifier,
                fileData: item.fileData,
                errorMessage: item.errorMessage,
                createdAt: item.createdAt,
                processedAt: item.processedAt
            )
            modelContext.insert(row)
        }
        try modelContext.save()
    }

    public func fetchPendingShareImports(status: PendingShareStatus? = .pending) throws -> [PendingShareImportDTO] {
        let rows: [SDPendingShareImport]
        if let status {
            let statusRaw = status.rawValue
            let descriptor = FetchDescriptor<SDPendingShareImport>(
                predicate: #Predicate { $0.status == statusRaw },
                sortBy: [SortDescriptor(\SDPendingShareImport.createdAt, order: .forward)]
            )
            rows = try modelContext.fetch(descriptor)
        } else {
            let descriptor = FetchDescriptor<SDPendingShareImport>(
                sortBy: [SortDescriptor(\SDPendingShareImport.createdAt, order: .forward)]
            )
            rows = try modelContext.fetch(descriptor)
        }
        return rows.map { $0.toDTO() }
    }

    public func fetchPendingShareImport(id: String) throws -> PendingShareImportDTO? {
        let descriptor = FetchDescriptor<SDPendingShareImport>(
            predicate: #Predicate { $0.importId == id }
        )
        return try modelContext.fetch(descriptor).first?.toDTO()
    }

    public func updatePendingShareImportStatus(
        id: String,
        status: PendingShareStatus,
        errorMessage: String? = nil,
        processedAt: Date? = Date()
    ) throws {
        let descriptor = FetchDescriptor<SDPendingShareImport>(
            predicate: #Predicate { $0.importId == id }
        )
        guard let existing = try modelContext.fetch(descriptor).first else { return }
        existing.status = status.rawValue
        existing.errorMessage = errorMessage
        if status == .completed || status == .failed {
            existing.processedAt = processedAt ?? Date()
        } else if status == .pending {
            existing.processedAt = nil
        }
        try modelContext.save()
    }

    public func deletePendingShareImport(id: String) throws {
        let descriptor = FetchDescriptor<SDPendingShareImport>(
            predicate: #Predicate { $0.importId == id }
        )
        guard let existing = try modelContext.fetch(descriptor).first else { return }
        modelContext.delete(existing)
        try modelContext.save()
    }

    @discardableResult
    public func prunePendingShareImports(olderThan cutoff: Date) throws -> Int {
        let completedRaw = PendingShareStatus.completed.rawValue
        let failedRaw = PendingShareStatus.failed.rawValue
        let descriptor = FetchDescriptor<SDPendingShareImport>(
            predicate: #Predicate {
                ($0.status == completedRaw || $0.status == failedRaw) && $0.createdAt < cutoff
            }
        )
        let expired = try modelContext.fetch(descriptor)
        for row in expired {
            modelContext.delete(row)
        }
        if !expired.isEmpty {
            try modelContext.save()
        }
        return expired.count
    }
}
