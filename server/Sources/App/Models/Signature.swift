import Fluent
import FluentMongoDriver
import Vapor

final class Signature: Model, @unchecked Sendable {
    static let schema = "signatures"

    @ID(custom: .id) var id: ObjectId?
    @Field(key: "github_id") var githubId: Int
    @Field(key: "login") var login: String
    @OptionalField(key: "avatar_url") var avatarUrl: String?
    @Field(key: "message") var message: String
    @Field(key: "created_at") var createdAt: Int

    init() {}

    init(githubId: Int, login: String, avatarUrl: String?, message: String, createdAt: Int) {
        self.githubId = githubId
        self.login = login
        self.avatarUrl = avatarUrl
        self.message = message
        self.createdAt = createdAt
    }
}
