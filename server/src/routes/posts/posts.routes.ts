import { Router } from "express";
import PostsController from "../../controllers/posts/posts.controller.js";

class PostsRoutes {
  router = Router();
  controller = new PostsController();

  constructor() {
    this.router.get("/", this.controller.list);
    this.router.get("/:slug", this.controller.getBySlug);
    this.router.post("/", this.controller.create);
    this.router.put("/:id", this.controller.update);
    this.router.delete("/:id", this.controller.remove);
  }
}

export default new PostsRoutes().router;