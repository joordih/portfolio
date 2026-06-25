import Vapor

struct AuthExchangeResult {
    let user: SessionUser
    let accessToken: String
    let scopes: String?
}

struct AuthService {
    let client: Client

    static func safeNext(_ next: String?) -> String {
        guard
            let next,
            next.hasPrefix("/"),
            !next.hasPrefix("//"),
            !next.contains("://")
        else {
            return "/guestbook"
        }
        return next
    }

    func exchangeCodeForUser(code: String, clientId: String, clientSecret: String) async throws -> AuthExchangeResult {
        let tokenResponse = try await client.post("https://github.com/login/oauth/access_token") { request in
            request.headers.contentType = .json
            request.headers.replaceOrAdd(name: .accept, value: "application/json")
            try request.content.encode([
                "client_id": clientId,
                "client_secret": clientSecret,
                "code": code
            ])
        }

        let token = try tokenResponse.content.decode(TokenResponse.self)
        guard let accessToken = token.access_token, !accessToken.isEmpty else {
            throw ServiceError.unauthorized("Missing access token")
        }

        let userResponse = try await client.get("https://api.github.com/user") { request in
            request.headers.bearerAuthorization = BearerAuthorization(token: accessToken)
            request.headers.replaceOrAdd(name: .userAgent, value: "portfolio-app")
        }

        let user = try userResponse.content.decode(GitHubUser.self)
        return AuthExchangeResult(
            user: SessionUser(id: user.id, login: user.login, avatarUrl: user.avatar_url),
            accessToken: accessToken,
            scopes: token.scope
        )
    }

    private struct TokenResponse: Content {
        let access_token: String?
        let scope: String?
    }

    private struct GitHubUser: Content {
        let id: Int
        let login: String
        let avatar_url: String?
    }
}