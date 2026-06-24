import FluentMongoDriver
import Foundation
import Vapor

struct PostService {
    let repository: PostRepository

    func list(includeDrafts: Bool) async throws -> [Post] {
        try await repository.all(includeDrafts: includeDrafts)
    }

    func get(slug: String, isAdmin: Bool) async throws -> Post {
        guard let post = try await repository.find(slug: slug) else {
            throw ServiceError.notFound("Not found")
        }
        if post.status != "published" && !isAdmin {
            throw ServiceError.notFound("Not found")
        }
        return post
    }

    func create(_ body: CreatePostBody) async throws -> Post {
        let title = (body.title ?? "").trimmingCharacters(in: .whitespacesAndNewlines)
        let slug = (body.slug ?? "").trimmingCharacters(in: .whitespacesAndNewlines)
        guard !title.isEmpty, !slug.isEmpty else {
            throw ServiceError.badRequest("Title and slug are required")
        }
        let status = body.status ?? ""
        guard status == "draft" || status == "published" else {
            throw ServiceError.badRequest("Invalid status")
        }
        guard
            let contentHtml = body.contentHtml, !contentHtml.isEmpty,
            let contentJson = body.contentJson, !contentJson.isEmpty
        else {
            throw ServiceError.badRequest("Content is required")
        }
        if try await repository.find(slug: slug) != nil {
            throw ServiceError.conflict("Slug already exists")
        }
        let now = nowMillis()
        let post = Post(
            slug: slug,
            title: title,
            excerpt: body.excerpt,
            contentHtml: contentHtml,
            contentJson: contentJson,
            status: status,
            readingLabel: Self.readingLabel(forHTML: contentHtml),
            dateLabel: body.dateLabel,
            createdAt: now,
            updatedAt: now
        )
        try await repository.create(post)
        return post
    }

    func update(idString: String, body: UpdatePostBody) async throws -> Post {
        guard let id = try? ObjectId(idString) else {
            throw ServiceError.notFound("Not found")
        }
        guard let post = try await repository.find(id: id) else {
            throw ServiceError.notFound("Not found")
        }
        if let status = body.status, status != "draft", status != "published" {
            throw ServiceError.badRequest("Invalid status")
        }
        let newSlug = body.slug.map { $0.trimmingCharacters(in: .whitespacesAndNewlines) } ?? post.slug
        if newSlug != post.slug, try await repository.find(slug: newSlug) != nil {
            throw ServiceError.conflict("Slug already exists")
        }
        if let title = body.title {
            post.title = title.trimmingCharacters(in: .whitespacesAndNewlines)
        }
        post.slug = newSlug
        if let excerpt = body.excerpt {
            post.excerpt = excerpt
        }
        if let contentHtml = body.contentHtml {
            post.contentHtml = contentHtml
            post.readingLabel = Self.readingLabel(forHTML: contentHtml)
        }
        if let contentJson = body.contentJson {
            post.contentJson = contentJson
        }
        if let status = body.status {
            post.status = status
        }
        if let dateLabel = body.dateLabel {
            post.dateLabel = dateLabel
        }
        post.updatedAt = nowMillis()
        try await repository.update(post)
        return post
    }

    func delete(idString: String) async throws {
        guard let id = try? ObjectId(idString) else {
            throw ServiceError.notFound("Not found")
        }
        guard try await repository.delete(id: id) else {
            throw ServiceError.notFound("Not found")
        }
    }

    static func readingLabel(forHTML html: String) -> String {
        let stripped = html.replacingOccurrences(
            of: "<[^>]+>",
            with: " ",
            options: .regularExpression
        )
        let words = stripped
            .split(whereSeparator: { $0 == " " || $0 == "\n" || $0 == "\t" || $0 == "\r" })
            .filter { !$0.isEmpty }
        let minutes = max(1, Int((Double(words.count) / 200.0).rounded()))
        return "\(minutes) min →"
    }
}
