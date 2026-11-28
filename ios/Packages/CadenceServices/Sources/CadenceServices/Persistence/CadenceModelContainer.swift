import Foundation
import SwiftData

public enum CadenceModelContainer {
    public static let appGroupIdentifier = "group.cc.ridecadence.app"
    public static let storeFileName = "Cadence.sqlite"

    public static let schema = Schema([
        SDTripRecord.self,
        SDBikeRecord.self,
        SDRiderProfileRecord.self,
        SDOfflinePackRecord.self,
        SDCachedCorridorScan.self,
        SDCachedSurface.self,
        SDCachedWeather.self,
        SDPendingShareImport.self,
    ])

    public static func makeContainer(
        inMemory: Bool = false,
        storeURL: URL? = nil,
        appGroupIdentifier: String = CadenceModelContainer.appGroupIdentifier,
        allowUnentitledFallback: Bool = true
    ) throws -> ModelContainer {
        let config: ModelConfiguration
        if inMemory {
            config = ModelConfiguration(
                "Cadence",
                schema: schema,
                isStoredInMemoryOnly: true
            )
        } else if let storeURL {
            try FileManager.default.createDirectory(
                at: storeURL.deletingLastPathComponent(),
                withIntermediateDirectories: true
            )
            config = ModelConfiguration(
                "Cadence",
                schema: schema,
                url: storeURL
            )
        } else if let groupURL = FileManager.default.containerURL(
            forSecurityApplicationGroupIdentifier: appGroupIdentifier
        ),
            FileManager.default.fileExists(atPath: groupURL.path),
            FileManager.default.isWritableFile(atPath: groupURL.path) {
            let dbURL = groupURL.appendingPathComponent(storeFileName)
            let groupConfig = ModelConfiguration(
                "Cadence",
                schema: schema,
                url: dbURL
            )
            if allowUnentitledFallback {
                if let container = try? ModelContainer(for: schema, configurations: [groupConfig]) {
                    return container
                }
                config = try makeUnentitledFallbackConfiguration()
            } else {
                config = groupConfig
            }
        } else if allowUnentitledFallback {
            config = try makeUnentitledFallbackConfiguration()
        } else {
            config = ModelConfiguration(
                "Cadence",
                schema: schema,
                groupContainer: .identifier(appGroupIdentifier)
            )
        }

        return try ModelContainer(for: schema, configurations: [config])
    }

    private static func makeUnentitledFallbackConfiguration() throws -> ModelConfiguration {
        let fallbackDir = FileManager.default.urls(
            for: .applicationSupportDirectory,
            in: .userDomainMask
        ).first ?? FileManager.default.temporaryDirectory
        let cadenceDir = fallbackDir.appendingPathComponent("Cadence", isDirectory: true)
        try FileManager.default.createDirectory(at: cadenceDir, withIntermediateDirectories: true)
        // Note: SwiftData's ModelConfiguration(url:) initializer inherently bypasses App Group
        // container resolution and does not accept a `groupContainer:` parameter.
        return ModelConfiguration(
            "Cadence",
            schema: schema,
            url: cadenceDir.appendingPathComponent(storeFileName)
        )
    }

    public static func makeStore(
        inMemory: Bool = false,
        storeURL: URL? = nil,
        appGroupIdentifier: String = CadenceModelContainer.appGroupIdentifier,
        allowUnentitledFallback: Bool = true
    ) throws -> CadenceStore {
        let container = try makeContainer(
            inMemory: inMemory,
            storeURL: storeURL,
            appGroupIdentifier: appGroupIdentifier,
            allowUnentitledFallback: allowUnentitledFallback
        )
        return CadenceStore(modelContainer: container)
    }
}
