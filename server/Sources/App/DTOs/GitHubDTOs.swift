import Vapor

struct GitHubStatusDTO: Content {
    let connected: Bool
    let login: String?
    let scopes: String?
    let needsReauth: Bool
}

struct GitHubRepoDTO: Content {
    let id: Int
    let fullName: String
    let name: String
    let owner: String
    let htmlUrl: String
    let description: String?
    let isPrivate: Bool
    let defaultBranch: String
    let pushedAt: String?
}

struct GitHubRepoDetailDTO: Content {
    let repo: GitHubRepoDTO
    let languages: [String]
}

struct GitHubImportItemBody: Content {
    let githubRepoId: Int
    let fullName: String
    let isPublished: Bool?
    let descriptionSource: String?
    let customDescription: String?
    let selectedLanguages: [String]?
    let techStack: [String]?
}

struct GitHubImportBody: Content {
    let items: [GitHubImportItemBody]
}

struct GitHubImportResultDTO: Content {
    let imported: Int
    let projects: [ProjectDTO]
}

struct GitHubActivityDayDTO: Content {
    let date: String
    let count: Int
}

struct GitHubTopRepoDTO: Content {
    let fullName: String
    let url: String
    let commits: Int
}

struct GitHubActivityStatsDTO: Content {
    let lifetimeCommits: Int
    let peakCommitsInDay: Int
    let peakDay: String?
    let longestStreak: Int
    let yearCommits: Int
}

struct GitHubActivityDTO: Content {
    let year: Int
    let days: [GitHubActivityDayDTO]
    let stats: GitHubActivityStatsDTO
    let topPublicRepos: [GitHubTopRepoDTO]
}

struct GitHubActivityYearsDTO: Content {
    let years: [Int]
    let username: String
}