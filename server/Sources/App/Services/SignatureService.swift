import FluentMongoDriver
import Foundation
import Vapor

struct SignatureService {
    let repository: SignatureRepository

    private let maxMessageLength = 500

    func list() async throws -> [Signature] {
        try await repository.all()
    }

    func create(user: SessionUser, message rawMessage: String?) async throws -> Signature {
        let message = (rawMessage ?? "").trimmingCharacters(in: .whitespacesAndNewlines)
        guard !message.isEmpty else {
            throw ServiceError.badRequest("Message is required")
        }
        guard message.count <= maxMessageLength else {
            throw ServiceError.badRequest("Message too long")
        }
        let signature = Signature(
            githubId: user.id,
            login: user.login,
            avatarUrl: user.avatarUrl,
            message: message,
            createdAt: nowMillis()
        )
        try await repository.create(signature)
        return signature
    }

    func delete(idString: String, user: SessionUser) async throws {
        guard let id = try? ObjectId(idString) else {
            throw ServiceError.notFound("Not found")
        }
        guard let signature = try await repository.find(id: id) else {
            throw ServiceError.notFound("Not found")
        }
        let isAuthor = signature.githubId == user.id
        let isAdmin = AppConfig.isAdminLogin(user.login)
        guard isAuthor || isAdmin else {
            throw ServiceError.forbidden("Forbidden")
        }
        _ = try await repository.delete(id: id)
    }
}
