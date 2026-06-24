import FluentMongoDriver
import Foundation
import Vapor

struct ProjectDTO: Content {
    let id: String
    let sortOrder: Int
    let numLabel: String
    let title: String
    let description: String
    let url: String
    let tags: [String]
    let createdAt: Int
    let updatedAt: Int

    init(_ project: Project) {
        self.id = project.id?.hexString ?? ""
        self.sortOrder = project.sortOrder
        self.numLabel = project.numLabel
        self.title = project.title
        self.description = project.description
        self.url = project.url
        self.tags = project.tags
        self.createdAt = project.createdAt
        self.updatedAt = project.updatedAt
    }
}

enum TagsValue: Codable {
    case list([String])
    case string(String)

    init(from decoder: Decoder) throws {
        let container = try decoder.singleValueContainer()
        if let list = try? container.decode([String].self) {
            self = .list(list)
        } else {
            self = .string(try container.decode(String.self))
        }
    }

    func encode(to encoder: Encoder) throws {
        var container = encoder.singleValueContainer()
        switch self {
        case .list(let list): try container.encode(list)
        case .string(let value): try container.encode(value)
        }
    }

    func parsed() -> [String] {
        switch self {
        case .list(let list):
            return list
                .map { $0.trimmingCharacters(in: .whitespaces) }
                .filter { !$0.isEmpty }
        case .string(let value):
            return value
                .split(separator: ",")
                .map { $0.trimmingCharacters(in: .whitespaces) }
                .filter { !$0.isEmpty }
        }
    }
}

struct CreateProjectBody: Content {
    let title: String?
    let description: String?
    let url: String?
    let numLabel: String?
    let sortOrder: Int?
    let tags: TagsValue?
}

struct UpdateProjectBody: Content {
    let title: String?
    let description: String?
    let url: String?
    let numLabel: String?
    let sortOrder: Int?
    let tags: TagsValue?
}
