#if canImport(CryptoKit)
import CryptoKit
#else
import Crypto
#endif
import Foundation

enum TokenCrypto {
    enum Error: Swift.Error {
        case invalidCiphertext
        case invalidPlaintext
    }

    static func encrypt(_ plaintext: String, secret: String) throws -> String {
        let key = SymmetricKey(data: SHA256.hash(data: Data(secret.utf8)))
        let sealed = try AES.GCM.seal(Data(plaintext.utf8), using: key)
        guard let combined = sealed.combined else {
            throw Error.invalidPlaintext
        }
        return combined.base64EncodedString()
    }

    static func decrypt(_ ciphertext: String, secret: String) throws -> String {
        guard let data = Data(base64Encoded: ciphertext) else {
            throw Error.invalidCiphertext
        }
        let key = SymmetricKey(data: SHA256.hash(data: Data(secret.utf8)))
        let sealed = try AES.GCM.SealedBox(combined: data)
        let decrypted = try AES.GCM.open(sealed, using: key)
        guard let plaintext = String(data: decrypted, encoding: .utf8) else {
            throw Error.invalidPlaintext
        }
        return plaintext
    }
}