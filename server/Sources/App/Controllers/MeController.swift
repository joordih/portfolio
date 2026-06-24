import Vapor

struct MeController: RouteCollection {
    func boot(routes: RoutesBuilder) throws {
        routes.get(use: getMe)
    }

    func getMe(req: Request) async throws -> MeResponse {
        let user = req.sessionUser
        return MeResponse(user: user, isAdmin: AppConfig.isAdminLogin(user?.login))
    }
}
