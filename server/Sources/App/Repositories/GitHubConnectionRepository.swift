import Fluent
import FluentMongoDriver
import Vapor

protocol GitHubConnectionRepository {
    func findByLogin(_ login: String) async throws -> GitHubConnection?
    func upsert(
        githubId: Int,
        login: String,
        accessTokenEncrypted: String,
        scopes: String,
        updatedAt: Int
    ) async throws -> GitHubConnection
}

struct FluentGitHubConnectionRepository: GitHubConnectionRepository {
    let database: Database

    func findByLogin(_ login: String) async throws -> GitHubConnection? {
        try await GitHubConnection.query(on: database)
            .filter(\.$login == login)
            .first()
    }

    func upsert(
        githubId: Int,
        login: String,
        accessTokenEncrypted: String,
        scopes: String,
        updatedAt: Int
    ) async throws -> GitHubConnection {
        if let existing = try await findByLogin(login) {
            existing.githubId = githubId
            existing.accessTokenEncrypted = accessTokenEncrypted
            existing.scopes = scopes
            existing.updatedAt = updatedAt
            try await existing.update(on: database)
            return existing
        }

        let connection = GitHubConnection(
            githubId: githubId,
            login: login,
            accessTokenEncrypted: accessTokenEncrypted,
            scopes: scopes,
            updatedAt: updatedAt
        )
        try await connection.create(on: database)
        return connection
    }
}