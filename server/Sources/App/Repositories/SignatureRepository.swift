import Fluent
import FluentMongoDriver
import Vapor

protocol SignatureRepository {
    func all() async throws -> [Signature]
    func find(id: ObjectId) async throws -> Signature?
    func create(_ signature: Signature) async throws
    func delete(id: ObjectId) async throws -> Bool
}

struct FluentSignatureRepository: SignatureRepository {
    let database: Database

    func all() async throws -> [Signature] {
        try await Signature.query(on: database)
            .sort(\.$createdAt, .descending)
            .all()
    }

    func find(id: ObjectId) async throws -> Signature? {
        try await Signature.find(id, on: database)
    }

    func create(_ signature: Signature) async throws {
        try await signature.create(on: database)
    }

    func delete(id: ObjectId) async throws -> Bool {
        guard let signature = try await Signature.find(id, on: database) else {
            return false
        }
        try await signature.delete(on: database)
        return true
    }
}
