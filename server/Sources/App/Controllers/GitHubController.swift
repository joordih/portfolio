import Vapor

struct GitHubController: RouteCollection {
    func boot(routes: RoutesBuilder) throws {
        let admin = routes.grouped(RequireAdmin())
        admin.get("status", use: status)
        admin.get("repos", use: listRepos)
        admin.get("repos", "detail", use: repoDetail)
        admin.post("projects", "import", use: importProjects)

        routes.get("activity", "years", use: activityYears)
        routes.get("activity", use: activity)
    }

    func status(req: Request) async throws -> GitHubStatusDTO {
        let login = AppConfig.adminLogin()
        let connection = try await req.githubConnectionRepository.findByLogin(login)
        let token = try await GitHubTokenStore.loadToken(for: login, repository: req.githubConnectionRepository)

        return GitHubStatusDTO(
            connected: token != nil,
            login: connection?.login ?? login,
            scopes: connection?.scopes,
            needsReauth: connection != nil && token == nil
        )
    }

    func listRepos(req: Request) async throws -> [GitHubRepoDTO] {
        let service = try await makeGitHubService(req: req)
        return try await service.listRepos()
    }

    func repoDetail(req: Request) async throws -> GitHubRepoDetailDTO {
        guard let fullName = req.query[String.self, at: "fullName"], !fullName.isEmpty else {
            throw ServiceError.badRequest("fullName is required")
        }
        let service = try await makeGitHubService(req: req)
        return try await service.repoDetail(fullName: fullName)
    }

    func importProjects(req: Request) async throws -> GitHubImportResultDTO {
        let body = try req.content.decode(GitHubImportBody.self)
        let githubService = try await makeGitHubService(req: req)
        let importService = GitHubProjectImportService(
            projectRepository: req.projectRepository,
            githubService: githubService
        )
        return try await importService.importProjects(body.items)
    }

    func activityYears(req: Request) async throws -> GitHubActivityYearsDTO {
        let service = try await makeStatsService(req: req)
        return try await service.availableYears()
    }

    func activity(req: Request) async throws -> GitHubActivityDTO {
        let year = req.query[Int.self, at: "year"] ?? Calendar.current.component(.year, from: Date())
        let service = try await makeStatsService(req: req)
        return try await service.activity(for: year)
    }

    private func makeGitHubService(req: Request) async throws -> GitHubService {
        let login = AppConfig.adminLogin()
        guard let token = try await GitHubTokenStore.loadToken(for: login, repository: req.githubConnectionRepository) else {
            throw ServiceError.unauthorized("GitHub not connected. Re-authenticate from the dashboard.")
        }
        return GitHubService(client: req.client, accessToken: token)
    }

    private func makeStatsService(req: Request) async throws -> GitHubStatsService {
        guard let token = try await GitHubTokenStore.resolveStatsToken(connectionRepository: req.githubConnectionRepository) else {
            throw ServiceError.badRequest("GitHub activity is not configured")
        }
        return GitHubStatsService(
            client: req.client,
            cacheRepository: req.githubStatsCacheRepository,
            accessToken: token,
            username: AppConfig.githubUsername()
        )
    }
}