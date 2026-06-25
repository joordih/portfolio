import { Router } from "express";
import GitHubController from "../../controllers/github/github.controller.js";

class GitHubRoutes {
  router = Router();
  controller = new GitHubController();

  constructor() {
    this.router.get("/status", ...this.controller.status);
    this.router.get("/repos", ...this.controller.listRepos);
    this.router.get("/repos/detail", ...this.controller.repoDetail);
    this.router.post("/projects/import", ...this.controller.importProjects);
    this.router.get("/activity/years", this.controller.activityYears);
    this.router.get("/activity/years/config", ...this.controller.activityYearsConfig);
    this.router.put("/activity/years/config", ...this.controller.updateActivityYearsConfig);
    this.router.get("/activity", this.controller.activity);
  }
}

export default new GitHubRoutes().router;