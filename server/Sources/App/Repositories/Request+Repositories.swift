import Vapor

extension Request {
    var signatureRepository: SignatureRepository {
        FluentSignatureRepository(database: db)
    }

    var postRepository: PostRepository {
        FluentPostRepository(database: db)
    }

    var projectRepository: ProjectRepository {
        FluentProjectRepository(database: db)
    }
}
