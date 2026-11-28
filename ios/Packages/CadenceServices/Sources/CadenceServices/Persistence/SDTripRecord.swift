import Foundation
import SwiftData
import CadenceCore

@Model
public final class SDTripRecord {
    #Index<SDTripRecord>([\.deletedAt, \.clientUpdatedAt], [\.needsSync])

    @Attribute(.unique) public var clientId: String
    public var schemaVersion: Int
    public var name: String
    public var tag: String
    public var departureDate: String?
    public var sortOrder: Int
    public var payloadData: Data
    public var clientUpdatedAt: Date
    public var serverUpdatedAt: Date?
    public var deletedAt: Date?
    public var needsSync: Bool

    public init(
        clientId: String,
        schemaVersion: Int = 2,
        name: String,
        tag: String,
        departureDate: String? = nil,
        sortOrder: Int = 0,
        payloadData: Data,
        clientUpdatedAt: Date = Date(),
        serverUpdatedAt: Date? = nil,
        deletedAt: Date? = nil,
        needsSync: Bool = true
    ) {
        self.clientId = clientId
        self.schemaVersion = schemaVersion
        self.name = name
        self.tag = tag
        self.departureDate = departureDate
        self.sortOrder = sortOrder
        self.payloadData = payloadData
        self.clientUpdatedAt = clientUpdatedAt
        self.serverUpdatedAt = serverUpdatedAt
        self.deletedAt = deletedAt
        self.needsSync = needsSync
    }

    func decodeTrip() throws -> TripProfile {
        var trip = try PersistenceCodec.decode(TripProfile.self, from: payloadData)
        if trip.id != clientId {
            trip.id = clientId
        }
        return trip
    }

    func toSyncRecord() throws -> SyncTripRecord {
        SyncTripRecord(
            clientId: clientId,
            trip: try decodeTrip(),
            sortOrder: sortOrder,
            clientUpdatedAt: clientUpdatedAt,
            serverUpdatedAt: serverUpdatedAt,
            deletedAt: deletedAt,
            needsSync: needsSync
        )
    }
}
