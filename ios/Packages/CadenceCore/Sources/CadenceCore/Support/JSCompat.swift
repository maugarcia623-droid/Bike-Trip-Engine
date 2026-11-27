import Foundation

/// Cross-language compatibility helpers ensuring exact parity with ECMAScript
/// rounding, fixed-decimal formatting, UTF-8 byte truncation, and deterministic dates.
public enum JSCompat {
    /// Matches JavaScript `Math.round(x)` (rounds half toward +infinity: `floor(x + 0.5)`).
    @inlinable
    public static func jsRound(_ value: Double) -> Double {
        guard value.isFinite else { return value }
        return floor(value + 0.5)
    }

    @inlinable
    public static func jsRoundInt(_ value: Double) -> Int {
        guard value.isFinite else { return 0 }
        return Int(floor(value + 0.5))
    }

    /// Matches `Number(x.toFixed(decimals))` for standard positive/negative values.
    @inlinable
    public static func roundTo(_ value: Double, decimals: Int) -> Double {
        guard value.isFinite else { return value }
        if decimals <= 0 { return jsRound(value) }
        let factor = pow(10.0, Double(decimals))
        return jsRound(value * factor) / factor
    }

    /// Exact ECMAScript `Number(x.toFixed(decimals))` on IEEE 754 binary64 values.
    @inlinable
    public static func jsToFixedNumber(_ value: Double, decimals: Int) -> Double {
        guard value.isFinite else { return value }
        if decimals <= 0 { return value < 0 ? -floor(-value + 0.5) : floor(value + 0.5) }
        let factor = pow(10.0, Double(decimals))
        let sign = value < 0 ? -1.0 : 1.0
        let absVal = abs(value)
        let scaled = absVal * factor
        var n = floor(scaled + 0.5)
        if scaled == n - 0.5, fma(absVal, factor, -(n - 0.5)) < 0.0 {
            n -= 1.0
        }
        return sign * (n / factor)
    }

    /// Matches `x.toFixed(decimals)` string formatting with `.` decimal separator.
    public static func jsFixed(_ value: Double, decimals: Int) -> String {
        guard value.isFinite else { return "0" }
        let rounded = roundTo(value, decimals: decimals)
        return String(format: "%.\(max(0, decimals))f", locale: Locale(identifier: "en_US_POSIX"), rounded)
    }

    /// Truncates a String cleanly on Unicode scalar boundaries so its UTF-8 byte length <= maxBytes.
    public static func utf8Truncate(_ text: String, maxBytes: Int) -> String {
        guard maxBytes > 0 else { return "" }
        if text.utf8.count <= maxBytes { return text }
        var result = ""
        result.reserveCapacity(min(text.count, maxBytes))
        var used = 0
        for scalar in text.unicodeScalars {
            let scalarBytes = scalar.utf8.count
            if used + scalarBytes > maxBytes { break }
            result.unicodeScalars.append(scalar)
            used += scalarBytes
        }
        return result
    }

    /// Parses `YYYY-MM-DD` as local noon in the given time zone (defaults to Europe/Paris for determinism).
    public static func parseYMDNoon(_ ymd: String, timeZone: TimeZone = TimeZone(identifier: "Europe/Paris") ?? .current) -> Date? {
        let parts = ymd.prefix(10).split(separator: "-").compactMap { Int($0) }
        guard parts.count == 3 else { return nil }
        var cal = Calendar(identifier: .gregorian)
        cal.timeZone = timeZone
        var comps = DateComponents()
        comps.year = parts[0]
        comps.month = parts[1]
        comps.day = parts[2]
        comps.hour = 12
        comps.minute = 0
        comps.second = 0
        return cal.date(from: comps)
    }

    /// Degrees to radians / radians to degrees.
    @inlinable
    public static func toRad(_ deg: Double) -> Double { deg * .pi / 180.0 }

    @inlinable
    public static func toDeg(_ rad: Double) -> Double { rad * 180.0 / .pi }

    /// Normalizes a modulo into [0, modulus).
    @inlinable
    public static func posMod(_ value: Double, _ modulus: Double) -> Double {
        let r = value.truncatingRemainder(dividingBy: modulus)
        return r < 0 ? r + modulus : r
    }

    @inlinable
    public static func posMod(_ value: Int, _ modulus: Int) -> Int {
        let r = value % modulus
        return r < 0 ? r + modulus : r
    }
}

public enum CadenceLang: String, Codable, Sendable, CaseIterable {
    case en
    case fr
}
