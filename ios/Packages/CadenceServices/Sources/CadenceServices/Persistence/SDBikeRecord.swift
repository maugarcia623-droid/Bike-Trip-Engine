import Foundation
import SwiftData
import CadenceCore

@Model
public final class SDBikeRecord {
    #Index<SDBikeRecord>([\.deletedAt, \.sortOrder], [\.needsSync])

    @Attribute(.unique) public var clientId: String
    public var schemaVersion: Int
    public var name: String
    public var category: String
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
        category: String = BikeCategory.gravel.rawValue,
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
        self.category = category
        self.sortOrder = sortOrder
        self.payloadData = payloadData
        self.clientUpdatedAt = clientUpdatedAt
        self.serverUpdatedAt = serverUpdatedAt
        self.deletedAt = deletedAt
        self.needsSync = needsSync
    }

    func decodeBike() throws -> BikeSpec {
        var bike = try PersistenceCodec.decode(BikeSpec.self, from: payloadData)
        if bike.id != clientId {
            bike.id = clientId
        }
        if bike.bikeCategory == nil, let parsedCategory = BikeCategory(rawValue: category) {
            bike.bikeCategory = parsedCategory
        }
        return bike
    }

    func toSyncRecord() throws -> SyncBikeRecord {
        SyncBikeRecord(
            clientId: clientId,
            bike: try decodeBike(),
            sortOrder: sortOrder,
            clientUpdatedAt: clientUpdatedAt,
            serverUpdatedAt: serverUpdatedAt,
            deletedAt: deletedAt,
            needsSync: needsSync
        )
    }
}
