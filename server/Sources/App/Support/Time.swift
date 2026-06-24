import Foundation

func nowMillis() -> Int {
    Int(Date().timeIntervalSince1970 * 1000)
}

func randomHexToken(byteCount: Int = 16) -> String {
    (0..<byteCount)
        .map { _ in String(format: "%02x", UInt8.random(in: 0...255)) }
        .joined()
}
