import { Application } from "express";
import portfolioRouter from "./portfolio/router.routes.js";
import signaturesRouter from "./signatures/signatures.routes.js";
import postsRouter from "./posts/posts.routes.js";
import projectsRouter from "./projects/projects.routes.js";
import meRouter from "./me/me.routes.js";
import githubRouter from "./github/github.routes.js";
import authRouter from "../auth.js";

export default class Route {
  constructor(app: Application) {
    app.use("/api/portfolio/routes", portfolioRouter);
    app.use("/api/signatures", signaturesRouter);
    app.use("/api/posts", postsRouter);
    app.use("/api/projects", projectsRouter);
    app.use("/api/me", meRouter);
    app.use("/api/github", githubRouter);
    app.use("/auth", authRouter);
  }
}