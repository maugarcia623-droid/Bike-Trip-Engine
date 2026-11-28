import Foundation
import SwiftData

@Model
public final class SDPendingShareImport {
    #Index<SDPendingShareImport>([\.status, \.createdAt])

    @Attribute(.unique) public var importId: String
    public var kind: String
    public var status: String
    public var sourceUrl: String?
    public var sharedText: String?
    public var fileName: String?
    public var utTypeIdentifier: String?
    public var fileData: Data?
    public var errorMessage: String?
    public var createdAt: Date
    public var processedAt: Date?

    public init(
        importId: String,
        kind: String,
        status: String = PendingShareStatus.pending.rawValue,
        sourceUrl: String? = nil,
        sharedText: String? = nil,
        fileName: String? = nil,
        utTypeIdentifier: String? = nil,
        fileData: Data? = nil,
        errorMessage: String? = nil,
        createdAt: Date = Date(),
        processedAt: Date? = nil
    ) {
        self.importId = importId
        self.kind = kind
        self.status = status
        self.sourceUrl = sourceUrl
        self.sharedText = sharedText
        self.fileName = fileName
        self.utTypeIdentifier = utTypeIdentifier
        self.fileData = fileData
        self.errorMessage = errorMessage
        self.createdAt = createdAt
        self.processedAt = processedAt
    }

    func toDTO() -> PendingShareImportDTO {
        PendingShareImportDTO(
            id: importId,
            kind: PendingShareKind(rawValue: kind) ?? .text,
            status: PendingShareStatus(rawValue: status) ?? .pending,
            sourceUrl: sourceUrl,
            sharedText: sharedText,
            fileName: fileName,
            utTypeIdentifier: utTypeIdentifier,
            fileData: fileData,
            errorMessage: errorMessage,
            createdAt: createdAt,
            processedAt: processedAt
        )
    }
}
