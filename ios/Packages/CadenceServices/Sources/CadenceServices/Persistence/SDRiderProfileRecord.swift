import Foundation
import SwiftData
import CadenceCore

@Model
public final class SDRiderProfileRecord {
    public static let primaryKey = "primary"

    @Attribute(.unique) public var profileKey: String
    public var userId: String?
    public var schemaVersion: Int
    public var riderName: String?
    public var activeTripClientId: String?
    public var activeBikeClientId: String?
    public var specsPayloadData: Data
    public var userProfilePayloadData: Data?
    public var hasCompletedOnboarding: Bool
    public var clientUpdatedAt: Date
    public var serverUpdatedAt: Date?
    public var needsSync: Bool

    public init(
        profileKey: String = SDRiderProfileRecord.primaryKey,
        userId: String? = nil,
        schemaVersion: Int = 2,
        riderName: String? = nil,
        activeTripClientId: String? = nil,
        activeBikeClientId: String? = nil,
        specsPayloadData: Data,
        userProfilePayloadData: Data? = nil,
        hasCompletedOnboarding: Bool = false,
        clientUpdatedAt: Date = Date(),
        serverUpdatedAt: Date? = nil,
        needsSync: Bool = true
    ) {
        self.profileKey = profileKey
        self.userId = userId
        self.schemaVersion = schemaVersion
        self.riderName = riderName
        self.activeTripClientId = activeTripClientId
        self.activeBikeClientId = activeBikeClientId
        self.specsPayloadData = specsPayloadData
        self.userProfilePayloadData = userProfilePayloadData
        self.hasCompletedOnboarding = hasCompletedOnboarding
        self.clientUpdatedAt = clientUpdatedAt
        self.serverUpdatedAt = serverUpdatedAt
        self.needsSync = needsSync
    }

    func decodeSpecsPayload() throws -> RiderSpecsCloudPayload {
        try PersistenceCodec.decode(RiderSpecsCloudPayload.self, from: specsPayloadData)
    }

    func decodeUserProfile() throws -> UserProfileDTO {
        guard let userProfilePayloadData else { return UserProfileDTO() }
        return try PersistenceCodec.decode(UserProfileDTO.self, from: userProfilePayloadData)
    }

    func toSyncRecord() throws -> SyncRiderProfileRecord {
        SyncRiderProfileRecord(
            userId: userId,
            riderName: riderName,
            activeTripClientId: activeTripClientId,
            activeBikeClientId: activeBikeClientId,
            specs: try decodeSpecsPayload(),
            profile: try decodeUserProfile(),
            hasCompletedOnboarding: hasCompletedOnboarding,
            clientUpdatedAt: clientUpdatedAt,
            serverUpdatedAt: serverUpdatedAt,
            needsSync: needsSync
        )
    }
}
