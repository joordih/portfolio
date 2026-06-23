import { Router } from "express";
import ProjectsController from "../../controllers/projects/projects.controller.js";

class ProjectsRoutes {
  router = Router();
  controller = new ProjectsController();

  constructor() {
    this.router.get("/", this.controller.list);
    this.router.get("/:id", this.controller.getById);
    this.router.post("/", this.controller.create);
    this.router.put("/:id", this.controller.update);
    this.router.delete("/:id", this.controller.remove);
  }
}

export default new ProjectsRoutes().router;