import FluentMongoDriver
import Vapor

struct SignatureDTO: Content {
    let id: String
    let login: String
    let avatarUrl: String?
    let message: String
    let createdAt: Int

    init(_ signature: Signature) {
        self.id = signature.id?.hexString ?? ""
        self.login = signature.login
        self.avatarUrl = signature.avatarUrl
        self.message = signature.message
        self.createdAt = signature.createdAt
    }
}

struct CreateSignatureBody: Content {
    let message: String?
}
