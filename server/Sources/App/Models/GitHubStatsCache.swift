import Fluent
import FluentMongoDriver
import Vapor

final class GitHubStatsCache: Model, @unchecked Sendable {
    static let schema = "github_stats_cache"

    @ID(custom: .id) var id: ObjectId?
    @Field(key: "cache_key") var cacheKey: String
    @Field(key: "payload_json") var payloadJson: String
    @Field(key: "expires_at") var expiresAt: Int

    init() {}

    init(cacheKey: String, payloadJson: String, expiresAt: Int) {
        self.cacheKey = cacheKey
        self.payloadJson = payloadJson
        self.expiresAt = expiresAt
    }
}