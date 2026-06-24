import Fluent
import FluentMongoDriver
import Vapor

final class Project: Model, @unchecked Sendable {
    static let schema = "projects"

    @ID(custom: .id) var id: ObjectId?
    @Field(key: "sort_order") var sortOrder: Int
    @Field(key: "num_label") var numLabel: String
    @Field(key: "title") var title: String
    @Field(key: "description") var description: String
    @Field(key: "url") var url: String
    @Field(key: "tags") var tags: [String]
    @Field(key: "created_at") var createdAt: Int
    @Field(key: "updated_at") var updatedAt: Int

    init() {}

    init(
        sortOrder: Int,
        numLabel: String,
        title: String,
        description: String,
        url: String,
        tags: [String],
        createdAt: Int,
        updatedAt: Int
    ) {
        self.sortOrder = sortOrder
        self.numLabel = numLabel
        self.title = title
        self.description = description
        self.url = url
        self.tags = tags
        self.createdAt = createdAt
        self.updatedAt = updatedAt
    }
}
