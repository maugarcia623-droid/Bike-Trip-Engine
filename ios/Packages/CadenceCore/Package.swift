// swift-tools-version: 6.0
import PackageDescription

let package = Package(
    name: "CadenceCore",
    platforms: [
        .iOS(.v18),
        .watchOS(.v11),
        .macOS(.v15),
    ],
    products: [
        .library(
            name: "CadenceCore",
            targets: ["CadenceCore"]
        ),
    ],
    targets: [
        .target(
            name: "CadenceCore",
            swiftSettings: [
                .swiftLanguageMode(.v6),
            ]
        ),
        .testTarget(
            name: "CadenceCoreTests",
            dependencies: ["CadenceCore"],
            swiftSettings: [
                .swiftLanguageMode(.v6),
            ]
        ),
    ]
)
