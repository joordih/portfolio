import Fluent
import FluentMongoDriver
import Vapor

protocol ProjectRepository {
    func all() async throws -> [Project]
    func allPublished() async throws -> [Project]
    func find(id: ObjectId) async throws -> Project?
    func findByGitHubRepoId(_ repoId: Int) async throws -> Project?
    func count() async throws -> Int
    func create(_ project: Project) async throws
    func update(_ project: Project) async throws
    func delete(id: ObjectId) async throws -> Bool
}

struct FluentProjectRepository: ProjectRepository {
    let database: Database

    func all() async throws -> [Project] {
        try await Project.query(on: database)
            .sort(\.$sortOrder, .ascending)
            .sort(\.$createdAt, .ascending)
            .all()
    }

    func allPublished() async throws -> [Project] {
        let projects = try await all()
        return projects.filter(\.resolvedIsPublished)
    }

    func find(id: ObjectId) async throws -> Project? {
        try await Project.find(id, on: database)
    }

    func findByGitHubRepoId(_ repoId: Int) async throws -> Project? {
        try await Project.query(on: database)
            .filter(\.$githubRepoId == repoId)
            .first()
    }

    func count() async throws -> Int {
        try await Project.query(on: database).count()
    }

    func create(_ project: Project) async throws {
        try await project.create(on: database)
    }

    func update(_ project: Project) async throws {
        try await project.update(on: database)
    }

    func delete(id: ObjectId) async throws -> Bool {
        guard let project = try await Project.find(id, on: database) else {
            return false
        }
        try await project.delete(on: database)
        return true
    }
}