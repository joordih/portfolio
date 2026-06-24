import Vapor

struct PortfolioController: RouteCollection {
    func boot(routes: RoutesBuilder) throws {
        routes.get(use: list)
    }

    func list(req: Request) async throws -> Response {
        if req.query[String.self, at: "check"] == "/dashboard" {
            guard let user = req.sessionUser, AppConfig.isAdminLogin(user.login) else {
                let response = Response(status: .forbidden)
                try response.content.encode(RedirectionBody(redirection: "/"))
                return response
            }
        }

        let routeMap = [
            "/": "home",
            "/stack": "stack",
            "/guestbook": "guestbook",
            "/blog": "blog",
            "/dashboard": "dashboard"
        ]
        let response = Response(status: .ok)
        try response.content.encode(routeMap)
        return response
    }
}
