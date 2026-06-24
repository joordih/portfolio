import Foundation
import Vapor

struct SessionUser: Content {
    let id: Int
    let login: String
    let avatarUrl: String?

    enum CodingKeys: String, CodingKey {
        case id
        case login
        case avatarUrl = "avatar_url"
    }
}

extension Request {
    var sessionUser: SessionUser? {
        guard
            let raw = session.data["user"],
            let data = raw.data(using: .utf8),
            let user = try? JSONDecoder().decode(SessionUser.self, from: data)
        else {
            return nil
        }
        return user
    }

    func setSessionUser(_ user: SessionUser?) {
        guard
            let user,
            let data = try? JSONEncoder().encode(user),
            let raw = String(data: data, encoding: .utf8)
        else {
            session.data["user"] = nil
            return
        }
        session.data["user"] = raw
    }
}
