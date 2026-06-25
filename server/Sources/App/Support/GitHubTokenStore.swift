import Vapor

enum GitHubTokenStore {
    static func sessionSecret() throws -> String {
        guard let secret = Environment.get("SESSION_SECRET"), !secret.isEmpty else {
            throw ServiceError.badRequest("SESSION_SECRET is not configured")
        }
        return secret
    }

    static func saveToken(
        for login: String,
        githubId: Int,
        accessToken: String,
        scopes: String?,
        repository: GitHubConnectionRepository
    ) async throws {
        let encrypted = try TokenCrypto.encrypt(accessToken, secret: try sessionSecret())
        _ = try await repository.upsert(
            githubId: githubId,
            login: login,
            accessTokenEncrypted: encrypted,
            scopes: scopes ?? "read:user repo",
            updatedAt: nowMillis()
        )
    }

    static func loadToken(
        for login: String,
        repository: GitHubConnectionRepository
    ) async throws -> String? {
        guard let connection = try await repository.findByLogin(login) else {
            return nil
        }
        return try TokenCrypto.decrypt(connection.accessTokenEncrypted, secret: try sessionSecret())
    }

    static func resolveStatsToken(
        connectionRepository: GitHubConnectionRepository
    ) async throws -> String? {
        if let pat = Environment.get("GITHUB_STATS_TOKEN"), !pat.isEmpty {
            return pat
        }

        let adminLogin = AppConfig.adminLogin()
        return try await loadToken(for: adminLogin, repository: connectionRepository)
    }
}