import Vapor

struct RequireAuth: AsyncMiddleware {
    func respond(to request: Request, chainingTo next: AsyncResponder) async throws -> Response {
        guard request.sessionUser != nil else {
            throw ServiceError.unauthorized("Unauthorized")
        }
        return try await next.respond(to: request)
    }
}

struct RequireAdmin: AsyncMiddleware {
    func respond(to request: Request, chainingTo next: AsyncResponder) async throws -> Response {
        guard let user = request.sessionUser, AppConfig.isAdminLogin(user.login) else {
            throw ServiceError.forbidden("Forbidden")
        }
        return try await next.respond(to: request)
    }
}
