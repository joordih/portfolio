import Fluent
import FluentMongoDriver
import Vapor

final class GitHubConnection: Model, @unchecked Sendable {
    static let schema = "github_connections"

    @ID(custom: .id) var id: ObjectId?
    @Field(key: "github_id") var githubId: Int
    @Field(key: "login") var login: String
    @Field(key: "access_token_encrypted") var accessTokenEncrypted: String
    @Field(key: "scopes") var scopes: String
    @Field(key: "updated_at") var updatedAt: Int

    init() {}

    init(
        githubId: Int,
        login: String,
        accessTokenEncrypted: String,
        scopes: String,
        updatedAt: Int
    ) {
        self.githubId = githubId
        self.login = login
        self.accessTokenEncrypted = accessTokenEncrypted
        self.scopes = scopes
        self.updatedAt = updatedAt
    }
}