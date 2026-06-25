import FluentMongoDriver
import Vapor

struct GitHubProjectImportService {
    let projectRepository: ProjectRepository
    let githubService: GitHubService

    func importProjects(_ items: [GitHubImportItemBody]) async throws -> GitHubImportResultDTO {
        guard !items.isEmpty else {
            throw ServiceError.badRequest("No repositories selected")
        }

        var results: [Project] = []
        let existingCount = try await projectRepository.count()

        for (index, item) in items.enumerated() {
            let detail = try await githubService.repoDetail(fullName: item.fullName)
            let repo = detail.repo
            let githubLanguages = detail.languages
            let selectedLanguages = item.selectedLanguages ?? githubLanguages
            let descriptionSource = item.descriptionSource ?? "github"
            let customDescription = item.customDescription?.trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
            let techStack = item.techStack ?? []
            let now = nowMillis()

            let project: Project
            if let existing = try await projectRepository.findByGitHubRepoId(repo.id) {
                existing.title = repo.name
                existing.url = repo.htmlUrl
                existing.githubFullName = repo.fullName
                existing.isPrivate = repo.isPrivate
                existing.githubDescription = repo.description
                existing.githubLanguages = githubLanguages
                existing.selectedLanguages = selectedLanguages
                existing.techStack = techStack
                existing.descriptionSource = descriptionSource
                existing.description = customDescription.isEmpty ? (repo.description ?? "") : customDescription
                existing.isPublished = item.isPublished ?? existing.resolvedIsPublished
                existing.source = "github"
                existing.updatedAt = now
                try await projectRepository.update(existing)
                project = existing
            } else {
                let order = existingCount + index + 1
                project = Project(
                    sortOrder: order,
                    numLabel: String(format: "%02d", order),
                    title: repo.name,
                    description: customDescription.isEmpty ? (repo.description ?? repo.name) : customDescription,
                    url: repo.htmlUrl,
                    tags: [],
                    githubRepoId: repo.id,
                    githubFullName: repo.fullName,
                    isPublished: item.isPublished ?? true,
                    isPrivate: repo.isPrivate,
                    descriptionSource: descriptionSource,
                    githubDescription: repo.description,
                    githubLanguages: githubLanguages,
                    selectedLanguages: selectedLanguages,
                    techStack: techStack,
                    source: "github",
                    createdAt: now,
                    updatedAt: now
                )
                try await projectRepository.create(project)
            }

            results.append(project)
        }

        return GitHubImportResultDTO(
            imported: results.count,
            projects: results.map(ProjectDTO.init)
        )
    }
}