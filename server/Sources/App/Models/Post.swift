import Fluent
import FluentMongoDriver
import Vapor

final class Post: Model, @unchecked Sendable {
    static let schema = "posts"

    @ID(custom: .id) var id: ObjectId?
    @Field(key: "slug") var slug: String
    @Field(key: "title") var title: String
    @OptionalField(key: "excerpt") var excerpt: String?
    @Field(key: "content_html") var contentHtml: String
    @Field(key: "content_json") var contentJson: String
    @Field(key: "status") var status: String
    @OptionalField(key: "reading_label") var readingLabel: String?
    @OptionalField(key: "date_label") var dateLabel: String?
    @Field(key: "created_at") var createdAt: Int
    @Field(key: "updated_at") var updatedAt: Int

    init() {}

    init(
        slug: String,
        title: String,
        excerpt: String?,
        contentHtml: String,
        contentJson: String,
        status: String,
        readingLabel: String?,
        dateLabel: String?,
        createdAt: Int,
        updatedAt: Int
    ) {
        self.slug = slug
        self.title = title
        self.excerpt = excerpt
        self.contentHtml = contentHtml
        self.contentJson = contentJson
        self.status = status
        self.readingLabel = readingLabel
        self.dateLabel = dateLabel
        self.createdAt = createdAt
        self.updatedAt = updatedAt
    }
}
