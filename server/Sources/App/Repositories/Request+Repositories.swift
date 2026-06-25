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

    var githubConnectionRepository: GitHubConnectionRepository {
        FluentGitHubConnectionRepository(database: db)
    }

    var githubStatsCacheRepository: GitHubStatsCacheRepository {
        FluentGitHubStatsCacheRepository(database: db)
    }

    var siteSettingRepository: SiteSettingRepository {
        FluentSiteSettingRepository(database: db)
    }
}
