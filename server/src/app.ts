import "dotenv/config";
import express, { Application, json, urlencoded, Request, Response, NextFunction } from "express";
import cors from "cors";
import cookieSession from "cookie-session";
import Route from "./routes/index.js";
import { isProduction, resolveClientOrigin } from "./config.js";

function createApp(): Application {
  const app = express();
  const clientOrigin = resolveClientOrigin();

  if (isProduction()) {
    app.set("trust proxy", 1);
  }

  app.use(
    cors({
      origin: clientOrigin,
      credentials: true,
    })
  );
  app.use(
    cookieSession({
      name: "sid",
      secret: process.env.SESSION_SECRET || "dev-secret",
      httpOnly: true,
      sameSite: "lax",
      secure: isProduction(),
    })
  );
  app.use(json());
  app.use(urlencoded({ extended: true }));

  new Route(app);

  app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  });

  return app;
}

const app = createApp();
export default app;