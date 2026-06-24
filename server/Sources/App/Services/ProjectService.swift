import FluentMongoDriver
import Foundation
import Vapor

struct ProjectService {
    let repository: ProjectRepository

    func list() async throws -> [Project] {
        try await repository.all()
    }

    func get(idString: String) async throws -> Project {
        guard let id = try? ObjectId(idString) else {
            throw ServiceError.notFound("Not found")
        }
        guard let project = try await repository.find(id: id) else {
            throw ServiceError.notFound("Not found")
        }
        return project
    }

    func create(_ body: CreateProjectBody) async throws -> Project {
        let title = (body.title ?? "").trimmingCharacters(in: .whitespacesAndNewlines)
        let description = (body.description ?? "").trimmingCharacters(in: .whitespacesAndNewlines)
        let url = (body.url ?? "").trimmingCharacters(in: .whitespacesAndNewlines)
        guard !title.isEmpty, !description.isEmpty, !url.isEmpty else {
            throw ServiceError.badRequest("Title, description and url are required")
        }
        let tags = body.tags?.parsed() ?? []
        let existingCount = try await repository.count()
        let order = body.sortOrder ?? (existingCount + 1)
        let label = (body.numLabel ?? String(format: "%02d", order)).trimmingCharacters(in: .whitespaces)
        let now = nowMillis()
        let project = Project(
            sortOrder: order,
            numLabel: label,
            title: title,
            description: description,
            url: url,
            tags: tags,
            createdAt: now,
            updatedAt: now
        )
        try await repository.create(project)
        return project
    }

    func update(idString: String, body: UpdateProjectBody) async throws -> Project {
        guard let id = try? ObjectId(idString) else {
            throw ServiceError.notFound("Not found")
        }
        guard let project = try await repository.find(id: id) else {
            throw ServiceError.notFound("Not found")
        }
        if let title = body.title {
            project.title = title.trimmingCharacters(in: .whitespacesAndNewlines)
        }
        if let description = body.description {
            project.description = description.trimmingCharacters(in: .whitespacesAndNewlines)
        }
        if let url = body.url {
            project.url = url.trimmingCharacters(in: .whitespacesAndNewlines)
        }
        if let numLabel = body.numLabel {
            project.numLabel = numLabel.trimmingCharacters(in: .whitespaces)
        }
        if let sortOrder = body.sortOrder {
            project.sortOrder = sortOrder
        }
        if let tags = body.tags {
            project.tags = tags.parsed()
        }
        project.updatedAt = nowMillis()
        try await repository.update(project)
        return project
    }

    func delete(idString: String) async throws {
        guard let id = try? ObjectId(idString) else {
            throw ServiceError.notFound("Not found")
        }
        guard try await repository.delete(id: id) else {
            throw ServiceError.notFound("Not found")
        }
    }
}
