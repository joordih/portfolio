import Fluent
import FluentMongoDriver
import Vapor

final class SiteSetting: Model, @unchecked Sendable {
    static let schema = "site_settings"

    @ID(custom: .id) var id: ObjectId?
    @Field(key: "key") var key: String
    @Field(key: "value") var value: [Int]
    @Field(key: "updated_at") var updatedAt: Int

    init() {}

    init(key: String, value: [Int], updatedAt: Int) {
        self.key = key
        self.value = value
        self.updatedAt = updatedAt
    }
}