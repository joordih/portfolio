import FluentMongoDriver
import Vapor

struct PostListItemDTO: Content {
    let id: String
    let slug: String
    let title: String
    let excerpt: String?
    let status: String
    let readingLabel: String?
    let dateLabel: String?
    let createdAt: Int

    init(_ post: Post) {
        self.id = post.id?.hexString ?? ""
        self.slug = post.slug
        self.title = post.title
        self.excerpt = post.excerpt
        self.status = post.status
        self.readingLabel = post.readingLabel
        self.dateLabel = post.dateLabel
        self.createdAt = post.createdAt
    }
}

struct PostDTO: Content {
    let id: String
    let slug: String
    let title: String
    let excerpt: String?
    let contentHtml: String
    let contentJson: String
    let status: String
    let readingLabel: String?
    let dateLabel: String?
    let createdAt: Int
    let updatedAt: Int

    init(_ post: Post) {
        self.id = post.id?.hexString ?? ""
        self.slug = post.slug
        self.title = post.title
        self.excerpt = post.excerpt
        self.contentHtml = post.contentHtml
        self.contentJson = post.contentJson
        self.status = post.status
        self.readingLabel = post.readingLabel
        self.dateLabel = post.dateLabel
        self.createdAt = post.createdAt
        self.updatedAt = post.updatedAt
    }
}

struct PostMutationResult: Content {
    let id: String
    let slug: String
}

struct CreatePostBody: Content {
    let title: String?
    let slug: String?
    let excerpt: String?
    let contentHtml: String?
    let contentJson: String?
    let status: String?
    let dateLabel: String?
}

struct UpdatePostBody: Content {
    let title: String?
    let slug: String?
    let excerpt: String?
    let contentHtml: String?
    let contentJson: String?
    let status: String?
    let dateLabel: String?
}
