import Fluent
import Foundation
import Vapor

struct SeedData: AsyncMigration {
    func prepare(on database: Database) async throws {
        try await seedSignatures(on: database)
        try await seedProjects(on: database)
        try await seedPosts(on: database)
    }

    func revert(on database: Database) async throws {
        try await Signature.query(on: database).delete()
        try await Project.query(on: database).delete()
        try await Post.query(on: database).delete()
    }

    private func seedSignatures(on database: Database) async throws {
        guard try await Signature.query(on: database).count() == 0 else { return }
        let now = nowMillis()
        let hour = 1000 * 60 * 60
        let signatures = [
            Signature(
                githubId: 583231,
                login: "octocat",
                avatarUrl: "https://github.com/octocat.png",
                message: "First signature on the wall.",
                createdAt: now - hour * 26
            ),
            Signature(
                githubId: 9919,
                login: "github",
                avatarUrl: "https://github.com/github.png",
                message: "Clean template — easy to fork and customize.",
                createdAt: now - hour * 70
            )
        ]
        for signature in signatures {
            try await signature.create(on: database)
        }
    }

    private func seedProjects(on database: Database) async throws {
        guard try await Project.query(on: database).count() == 0 else { return }
        let now = nowMillis()
        let projects = [
            Project(
                sortOrder: 1,
                numLabel: "01",
                title: "Example API",
                description: "A REST API built with your stack of choice. Replace this entry from the dashboard.",
                url: "https://github.com",
                tags: ["TypeScript", "API"],
                createdAt: now,
                updatedAt: now
            ),
            Project(
                sortOrder: 2,
                numLabel: "02",
                title: "Example App",
                description: "A frontend or full-stack project highlight. Edit title, description, and tags in the dashboard.",
                url: "https://github.com",
                tags: ["Web", "Open Source"],
                createdAt: now,
                updatedAt: now
            )
        ]
        for project in projects {
            try await project.create(on: database)
        }
    }

    private func seedPosts(on database: Database) async throws {
        guard try await Post.query(on: database).count() == 0 else { return }
        let now = nowMillis()
        let contentHtml = "<p>Replace this post from the dashboard. The editor supports headings, lists, quotes, and pasted HTML.</p>"
        let contentJson = "{\"type\":\"doc\",\"content\":[{\"type\":\"paragraph\",\"content\":[{\"type\":\"text\",\"text\":\"Replace this post from the dashboard. The editor supports headings, lists, quotes, and pasted HTML.\"}]}]}"
        let formatter = DateFormatter()
        formatter.locale = Locale(identifier: "en_US")
        formatter.dateFormat = "MM' · 'yyyy"
        let post = Post(
            slug: "welcome",
            title: "Welcome to your portfolio",
            excerpt: nil,
            contentHtml: contentHtml,
            contentJson: contentJson,
            status: "published",
            readingLabel: "1 min →",
            dateLabel: formatter.string(from: Date()),
            createdAt: now,
            updatedAt: now
        )
        try await post.create(on: database)
    }
}
