import Fluent
import FluentMongoDriver
import Vapor

final class Project: Model, @unchecked Sendable {
    static let schema = "projects"

    @ID(custom: .id) var id: ObjectId?
    @Field(key: "sort_order") var sortOrder: Int
    @Field(key: "num_label") var numLabel: String
    @Field(key: "title") var title: String
    @Field(key: "description") var description: String
    @Field(key: "url") var url: String
    @Field(key: "tags") var tags: [String]
    @OptionalField(key: "github_repo_id") var githubRepoId: Int?
    @OptionalField(key: "github_full_name") var githubFullName: String?
    @OptionalField(key: "is_published") var isPublished: Bool?
    @OptionalField(key: "is_private") var isPrivate: Bool?
    @OptionalField(key: "description_source") var descriptionSource: String?
    @OptionalField(key: "github_description") var githubDescription: String?
    @OptionalField(key: "github_languages") var githubLanguages: [String]?
    @OptionalField(key: "selected_languages") var selectedLanguages: [String]?
    @OptionalField(key: "tech_stack") var techStack: [String]?
    @OptionalField(key: "source") var source: String?
    @Field(key: "created_at") var createdAt: Int
    @Field(key: "updated_at") var updatedAt: Int

    init() {}

    init(
        sortOrder: Int,
        numLabel: String,
        title: String,
        description: String,
        url: String,
        tags: [String],
        githubRepoId: Int? = nil,
        githubFullName: String? = nil,
        isPublished: Bool? = true,
        isPrivate: Bool? = nil,
        descriptionSource: String? = "custom",
        githubDescription: String? = nil,
        githubLanguages: [String]? = nil,
        selectedLanguages: [String]? = nil,
        techStack: [String]? = nil,
        source: String? = "manual",
        createdAt: Int,
        updatedAt: Int
    ) {
        self.sortOrder = sortOrder
        self.numLabel = numLabel
        self.title = title
        self.description = description
        self.url = url
        self.tags = tags
        self.githubRepoId = githubRepoId
        self.githubFullName = githubFullName
        self.isPublished = isPublished
        self.isPrivate = isPrivate
        self.descriptionSource = descriptionSource
        self.githubDescription = githubDescription
        self.githubLanguages = githubLanguages
        self.selectedLanguages = selectedLanguages
        self.techStack = techStack
        self.source = source
        self.createdAt = createdAt
        self.updatedAt = updatedAt
    }

    var resolvedIsPublished: Bool {
        isPublished ?? true
    }

    var resolvedSource: String {
        source ?? "manual"
    }

    var resolvedDescriptionSource: String {
        descriptionSource ?? "custom"
    }

    func displayDescription() -> String {
        if resolvedDescriptionSource == "github", let githubDescription, !githubDescription.isEmpty {
            return githubDescription
        }
        return description
    }
}