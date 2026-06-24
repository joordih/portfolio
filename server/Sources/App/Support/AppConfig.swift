import Foundation
import Vapor

enum AppConfig {
    static func clientOrigin() -> String {
        if let origin = Environment.get("CLIENT_ORIGIN"), !origin.isEmpty {
            return trimTrailingSlash(origin)
        }
        if let production = Environment.get("VERCEL_PROJECT_PRODUCTION_URL"), !production.isEmpty {
            return "https://\(production)"
        }
        if let vercel = Environment.get("VERCEL_URL"), !vercel.isEmpty {
            return "https://\(vercel)"
        }
        return "http://localhost:5173"
    }

    static func githubCallbackURL() -> String {
        if let callback = Environment.get("GITHUB_CALLBACK_URL"), !callback.isEmpty {
            return callback
        }
        return "\(clientOrigin())/auth/github/callback"
    }

    static func isProduction() -> Bool {
        if let node = Environment.get("NODE_ENV"), node == "production" {
            return true
        }
        return Environment.get("VERCEL") != nil
    }

    static func adminLogin() -> String {
        let login = Environment.get("ADMIN_LOGIN")?.trimmingCharacters(in: .whitespaces) ?? ""
        return login.isEmpty ? "admin" : login
    }

    static func isAdminLogin(_ login: String?) -> Bool {
        guard let login else { return false }
        return login == adminLogin()
    }

    private static func trimTrailingSlash(_ value: String) -> String {
        value.hasSuffix("/") ? String(value.dropLast()) : value
    }
}
