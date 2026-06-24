import Fluent
import FluentMongoDriver
import Vapor

protocol PostRepository {
    func all(includeDrafts: Bool) async throws -> [Post]
    func find(id: ObjectId) async throws -> Post?
    func find(slug: String) async throws -> Post?
    func create(_ post: Post) async throws
    func update(_ post: Post) async throws
    func delete(id: ObjectId) async throws -> Bool
}

struct FluentPostRepository: PostRepository {
    let database: Database

    func all(includeDrafts: Bool) async throws -> [Post] {
        var query = Post.query(on: database).sort(\.$createdAt, .descending)
        if !includeDrafts {
            query = query.filter(\.$status == "published")
        }
        return try await query.all()
    }

    func find(id: ObjectId) async throws -> Post? {
        try await Post.find(id, on: database)
    }

    func find(slug: String) async throws -> Post? {
        try await Post.query(on: database)
            .filter(\.$slug == slug)
            .first()
    }

    func create(_ post: Post) async throws {
        try await post.create(on: database)
    }

    func update(_ post: Post) async throws {
        try await post.update(on: database)
    }

    func delete(id: ObjectId) async throws -> Bool {
        guard let post = try await Post.find(id, on: database) else {
            return false
        }
        try await post.delete(on: database)
        return true
    }
}
