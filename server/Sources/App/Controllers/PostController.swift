import FluentMongoDriver
import Vapor

struct PostController: RouteCollection {
    func boot(routes: RoutesBuilder) throws {
        routes.get(use: list)
        routes.get(":slug", use: getBySlug)
        let admin = routes.grouped(RequireAdmin())
        admin.post(use: create)
        admin.put(":id", use: update)
        admin.delete(":id", use: remove)
    }

    func list(req: Request) async throws -> [PostListItemDTO] {
        let isAdmin = AppConfig.isAdminLogin(req.sessionUser?.login)
        let includeDrafts = isAdmin && req.query[String.self, at: "all"] == "1"
        let service = PostService(repository: req.postRepository)
        return try await service.list(includeDrafts: includeDrafts).map(PostListItemDTO.init)
    }

    func getBySlug(req: Request) async throws -> PostDTO {
        let slug = req.parameters.get("slug") ?? ""
        let isAdmin = AppConfig.isAdminLogin(req.sessionUser?.login)
        let service = PostService(repository: req.postRepository)
        let post = try await service.get(slug: slug, isAdmin: isAdmin)
        return PostDTO(post)
    }

    func create(req: Request) async throws -> Response {
        let body = try req.content.decode(CreatePostBody.self)
        let service = PostService(repository: req.postRepository)
        let post = try await service.create(body)
        let response = Response(status: .created)
        try response.content.encode(PostMutationResult(id: post.id?.hexString ?? "", slug: post.slug))
        return response
    }

    func update(req: Request) async throws -> PostMutationResult {
        let id = req.parameters.get("id") ?? ""
        let body = try req.content.decode(UpdatePostBody.self)
        let service = PostService(repository: req.postRepository)
        let post = try await service.update(idString: id, body: body)
        return PostMutationResult(id: post.id?.hexString ?? "", slug: post.slug)
    }

    func remove(req: Request) async throws -> Response {
        let id = req.parameters.get("id") ?? ""
        let service = PostService(repository: req.postRepository)
        try await service.delete(idString: id)
        return Response(status: .noContent)
    }
}
