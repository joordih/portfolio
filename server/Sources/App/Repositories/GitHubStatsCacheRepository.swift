import Fluent
import FluentMongoDriver
import Vapor

protocol GitHubStatsCacheRepository {
    func find(key: String) async throws -> GitHubStatsCache?
    func upsert(key: String, payloadJson: String, expiresAt: Int) async throws
}

struct FluentGitHubStatsCacheRepository: GitHubStatsCacheRepository {
    let database: Database

    func find(key: String) async throws -> GitHubStatsCache? {
        try await GitHubStatsCache.query(on: database)
            .filter(\.$cacheKey == key)
            .first()
    }

    func upsert(key: String, payloadJson: String, expiresAt: Int) async throws {
        if let existing = try await find(key: key) {
            existing.payloadJson = payloadJson
            existing.expiresAt = expiresAt
            try await existing.update(on: database)
            return
        }

        let cache = GitHubStatsCache(
            cacheKey: key,
            payloadJson: payloadJson,
            expiresAt: expiresAt
        )
        try await cache.create(on: database)
    }
}