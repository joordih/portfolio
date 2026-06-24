import Vapor

struct MeResponse: Content {
    let user: SessionUser?
    let isAdmin: Bool
}

struct RedirectionBody: Content {
    let redirection: String
}
