import Vapor

func routes(_ app: Application) throws {
    let api = app.grouped("api")
    try api.grouped("portfolio", "routes").register(collection: PortfolioController())
    try api.grouped("signatures").register(collection: SignatureController())
    try api.grouped("posts").register(collection: PostController())
    try api.grouped("projects").register(collection: ProjectController())
    try api.grouped("me").register(collection: MeController())
    try app.grouped("auth").register(collection: AuthController())
}
