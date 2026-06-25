import Vapor

struct GitHubService {
    let client: Client
    let accessToken: String

    func listRepos() async throws -> [GitHubRepoDTO] {
        var page = 1
        var all: [GitHubRepoDTO] = []

        while page <= 10 {
            let response = try await client.get("https://api.github.com/user/repos") { request in
                request.headers.bearerAuthorization = BearerAuthorization(token: accessToken)
                request.headers.replaceOrAdd(name: .userAgent, value: "portfolio-app")
                request.headers.replaceOrAdd(name: .accept, value: "application/vnd.github+json")
                try request.query.encode([
                    "affiliation": "owner,collaborator,organization_member",
                    "per_page": "100",
                    "page": String(page),
                    "sort": "updated"
                ])
            }

            guard response.status == .ok else {
                if response.status == .unauthorized {
                    throw ServiceError.unauthorized("GitHub token expired or revoked")
                }
                throw ServiceError.badRequest("Failed to fetch GitHub repositories")
            }

            let repos = try response.content.decode([GitHubRepoResponse].self)
            if repos.isEmpty { break }

            all.append(contentsOf: repos.map(Self.mapRepo))
            if repos.count < 100 { break }
            page += 1
        }

        return all.sorted { ($0.pushedAt ?? "") > ($1.pushedAt ?? "") }
    }

    func repoDetail(fullName: String) async throws -> GitHubRepoDetailDTO {
        let parts = fullName.split(separator: "/", maxSplits: 1).map(String.init)
        guard parts.count == 2 else {
            throw ServiceError.badRequest("Invalid repository name")
        }

        let owner = parts[0]
        let repo = parts[1]

        let repoResponse = try await client.get("https://api.github.com/repos/\(owner)/\(repo)") { request in
            request.headers.bearerAuthorization = BearerAuthorization(token: accessToken)
            request.headers.replaceOrAdd(name: .userAgent, value: "portfolio-app")
            request.headers.replaceOrAdd(name: .accept, value: "application/vnd.github+json")
        }

        guard repoResponse.status == .ok else {
            if repoResponse.status == .unauthorized {
                throw ServiceError.unauthorized("GitHub token expired or revoked")
            }
            throw ServiceError.notFound("Repository not found")
        }

        let repoData = try repoResponse.content.decode(GitHubRepoResponse.self)
        let languages = try await fetchLanguages(owner: owner, repo: repo)
        return GitHubRepoDetailDTO(repo: Self.mapRepo(repoData), languages: languages)
    }

    private func fetchLanguages(owner: String, repo: String) async throws -> [String] {
        let response = try await client.get("https://api.github.com/repos/\(owner)/\(repo)/languages") { request in
            request.headers.bearerAuthorization = BearerAuthorization(token: accessToken)
            request.headers.replaceOrAdd(name: .userAgent, value: "portfolio-app")
            request.headers.replaceOrAdd(name: .accept, value: "application/vnd.github+json")
        }

        guard response.status == .ok else { return [] }

        let raw = try response.content.decode([String: Double].self)
        return raw
            .sorted { $0.value > $1.value }
            .map(\.key)
    }

    private static func mapRepo(_ repo: GitHubRepoResponse) -> GitHubRepoDTO {
        GitHubRepoDTO(
            id: repo.id,
            fullName: repo.full_name,
            name: repo.name,
            owner: repo.owner.login,
            htmlUrl: repo.html_url,
            description: repo.description,
            isPrivate: repo.private,
            defaultBranch: repo.default_branch ?? "main",
            pushedAt: repo.pushed_at
        )
    }

    private struct GitHubRepoResponse: Content {
        let id: Int
        let full_name: String
        let name: String
        let owner: Owner
        let html_url: String
        let description: String?
        let `private`: Bool
        let default_branch: String?
        let pushed_at: String?

        struct Owner: Content {
            let login: String
        }
    }
}