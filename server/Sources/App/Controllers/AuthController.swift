import Foundation
import Vapor

struct AuthController: RouteCollection {
    func boot(routes: RoutesBuilder) throws {
        routes.get("github", use: githubStart)
        routes.get("github", "callback", use: githubCallback)
        routes.post("logout", use: logout)
    }

    func githubStart(req: Request) async throws -> Response {
        guard let clientId = Environment.get("GITHUB_CLIENT_ID"), !clientId.isEmpty else {
            let response = Response(status: .internalServerError)
            try response.content.encode(ErrorBody(error: "GitHub OAuth not configured"))
            return response
        }

        let state = randomHexToken()
        req.session.data["oauthState"] = state
        req.session.data["oauthNext"] = AuthService.safeNext(req.query[String.self, at: "next"])

        var components = URLComponents(string: "https://github.com/login/oauth/authorize")
        components?.queryItems = [
            URLQueryItem(name: "client_id", value: clientId),
            URLQueryItem(name: "scope", value: "read:user repo"),
            URLQueryItem(name: "redirect_uri", value: AppConfig.githubCallbackURL()),
            URLQueryItem(name: "state", value: state)
        ]
        guard let url = components?.url?.absoluteString else {
            return fallbackRedirect(req)
        }
        return req.redirect(to: url)
    }

    func githubCallback(req: Request) async throws -> Response {
        let code = req.query[String.self, at: "code"]
        let state = req.query[String.self, at: "state"]
        let sessionState = req.session.data["oauthState"]
        guard let code, !code.isEmpty, let state, state == sessionState else {
            return fallbackRedirect(req)
        }
        req.session.data["oauthState"] = nil

        guard
            let clientId = Environment.get("GITHUB_CLIENT_ID"), !clientId.isEmpty,
            let clientSecret = Environment.get("GITHUB_CLIENT_SECRET"), !clientSecret.isEmpty
        else {
            return fallbackRedirect(req)
        }

        do {
            let service = AuthService(client: req.client)
            let result = try await service.exchangeCodeForUser(
                code: code,
                clientId: clientId,
                clientSecret: clientSecret
            )
            req.setSessionUser(result.user)

            if AppConfig.isAdminLogin(result.user.login) {
                try await GitHubTokenStore.saveToken(
                    for: result.user.login,
                    githubId: result.user.id,
                    accessToken: result.accessToken,
                    scopes: result.scopes,
                    repository: req.githubConnectionRepository
                )
            }

            return afterAuthRedirect(req)
        } catch {
            return fallbackRedirect(req)
        }
    }

    func logout(req: Request) async throws -> Response {
        req.session.destroy()
        return Response(status: .noContent)
    }

    private func afterAuthRedirect(_ req: Request) -> Response {
        let next = AuthService.safeNext(req.session.data["oauthNext"])
        req.session.data["oauthNext"] = nil
        return req.redirect(to: "\(AppConfig.clientOrigin())\(next)")
    }

    private func fallbackRedirect(_ req: Request) -> Response {
        req.redirect(to: "\(AppConfig.clientOrigin())/guestbook")
    }
}
