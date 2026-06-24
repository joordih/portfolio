import Fluent
import FluentMongoDriver
import Vapor

public func configure(_ app: Application) async throws {
    let mongoURL = Environment.get("MONGO_URL") ?? "mongodb://localhost:27017/portfolio"
    try app.databases.use(.mongo(connectionString: mongoURL), as: .mongo)

    app.middleware.use(CORSMiddleware(configuration: .init(
        allowedOrigin: .custom(AppConfig.clientOrigin()),
        allowedMethods: [.GET, .POST, .PUT, .DELETE, .OPTIONS],
        allowedHeaders: [.accept, .authorization, .contentType, .origin],
        allowCredentials: true
    )))
    app.middleware.use(APIErrorMiddleware())

    app.sessions.use(.fluent)
    app.sessions.configuration.cookieName = "sid"
    app.sessions.configuration.cookieFactory = { sessionID in
        HTTPCookies.Value(
            string: sessionID.string,
            isSecure: AppConfig.isProduction(),
            isHTTPOnly: true,
            sameSite: .lax
        )
    }
    app.middleware.use(app.sessions.middleware)

    app.migrations.add(SessionRecord.migration)
    app.migrations.add(SeedData())

    try await app.autoMigrate()

    try routes(app)

    app.http.server.configuration.hostname = "0.0.0.0"
    app.http.server.configuration.port = Environment.get("PORT").flatMap(Int.init) ?? 8080
}
