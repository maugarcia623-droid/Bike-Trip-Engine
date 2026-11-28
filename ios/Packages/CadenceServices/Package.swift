// swift-tools-version: 6.0
import PackageDescription

let package = Package(
    name: "CadenceServices",
    platforms: [
        .iOS(.v18),
        .macOS(.v15),
    ],
    products: [
        .library(
            name: "CadenceServices",
            targets: ["CadenceServices"]
        ),
    ],
    dependencies: [
        .package(path: "../CadenceCore"),
        .package(url: "https://github.com/supabase/supabase-swift.git", from: "2.0.0"),
    ],
    targets: [
        .target(
            name: "CadenceServices",
            dependencies: [
                .product(name: "CadenceCore", package: "CadenceCore"),
                .product(name: "Supabase", package: "supabase-swift"),
            ],
            swiftSettings: [
                .swiftLanguageMode(.v6),
            ]
        ),
        .testTarget(
            name: "CadenceServicesTests",
            dependencies: [
                "CadenceServices",
                .product(name: "CadenceCore", package: "CadenceCore"),
            ],
            swiftSettings: [
                .swiftLanguageMode(.v6),
            ]
        ),
    ]
)
