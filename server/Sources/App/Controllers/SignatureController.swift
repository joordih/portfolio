import Vapor

struct SignatureController: RouteCollection {
    func boot(routes: RoutesBuilder) throws {
        routes.get(use: list)
        let authed = routes.grouped(RequireAuth())
        authed.post(use: create)
        authed.delete(":id", use: remove)
    }

    func list(req: Request) async throws -> [SignatureDTO] {
        let service = SignatureService(repository: req.signatureRepository)
        return try await service.list().map(SignatureDTO.init)
    }

    func create(req: Request) async throws -> Response {
        guard let user = req.sessionUser else {
            throw ServiceError.unauthorized("Unauthorized")
        }
        let body = try req.content.decode(CreateSignatureBody.self)
        let service = SignatureService(repository: req.signatureRepository)
        let signature = try await service.create(user: user, message: body.message)
        let response = Response(status: .created)
        try response.content.encode(SignatureDTO(signature))
        return response
    }

    func remove(req: Request) async throws -> Response {
        guard let user = req.sessionUser else {
            throw ServiceError.unauthorized("Unauthorized")
        }
        let id = req.parameters.get("id") ?? ""
        let service = SignatureService(repository: req.signatureRepository)
        try await service.delete(idString: id, user: user)
        return Response(status: .noContent)
    }
}
