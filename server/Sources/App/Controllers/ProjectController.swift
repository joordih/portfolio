import Vapor

struct ProjectController: RouteCollection {
    func boot(routes: RoutesBuilder) throws {
        routes.get(use: list)
        routes.get(":id", use: getById)
        let admin = routes.grouped(RequireAdmin())
        admin.post(use: create)
        admin.put(":id", use: update)
        admin.delete(":id", use: remove)
    }

    func list(req: Request) async throws -> [ProjectDTO] {
        let service = ProjectService(repository: req.projectRepository)
        let publishedOnly = !(req.sessionUser.map { AppConfig.isAdminLogin($0.login) } ?? false)
        return try await service.list(publishedOnly: publishedOnly).map(ProjectDTO.init)
    }

    func getById(req: Request) async throws -> ProjectDTO {
        let id = req.parameters.get("id") ?? ""
        let service = ProjectService(repository: req.projectRepository)
        return ProjectDTO(try await service.get(idString: id))
    }

    func create(req: Request) async throws -> Response {
        let body = try req.content.decode(CreateProjectBody.self)
        let service = ProjectService(repository: req.projectRepository)
        let project = try await service.create(body)
        let response = Response(status: .created)
        try response.content.encode(ProjectDTO(project))
        return response
    }

    func update(req: Request) async throws -> ProjectDTO {
        let id = req.parameters.get("id") ?? ""
        let body = try req.content.decode(UpdateProjectBody.self)
        let service = ProjectService(repository: req.projectRepository)
        return ProjectDTO(try await service.update(idString: id, body: body))
    }

    func remove(req: Request) async throws -> Response {
        let id = req.parameters.get("id") ?? ""
        let service = ProjectService(repository: req.projectRepository)
        try await service.delete(idString: id)
        return Response(status: .noContent)
    }
}
