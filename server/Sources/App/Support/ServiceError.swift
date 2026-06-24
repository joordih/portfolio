import Vapor

enum ServiceError: Error {
    case badRequest(String)
    case unauthorized(String)
    case forbidden(String)
    case notFound(String)
    case conflict(String)

    var status: HTTPResponseStatus {
        switch self {
        case .badRequest: return .badRequest
        case .unauthorized: return .unauthorized
        case .forbidden: return .forbidden
        case .notFound: return .notFound
        case .conflict: return .conflict
        }
    }

    var message: String {
        switch self {
        case .badRequest(let message),
             .unauthorized(let message),
             .forbidden(let message),
             .notFound(let message),
             .conflict(let message):
            return message
        }
    }
}

struct ErrorBody: Content {
    let error: String
}

struct APIErrorMiddleware: AsyncMiddleware {
    func respond(to request: Request, chainingTo next: AsyncResponder) async throws -> Response {
        do {
            return try await next.respond(to: request)
        } catch let error as ServiceError {
            return try Self.make(status: error.status, message: error.message)
        } catch let abort as AbortError {
            return try Self.make(status: abort.status, message: abort.reason)
        } catch {
            request.logger.report(error: error)
            return try Self.make(status: .internalServerError, message: "Internal server error")
        }
    }

    static func make(status: HTTPResponseStatus, message: String) throws -> Response {
        let response = Response(status: status)
        try response.content.encode(ErrorBody(error: message))
        return response
    }
}
