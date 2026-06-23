import { Router } from "express";
import RouterController from "../../controllers/portfolio/router.controller.js";

class RouterRoutes {
  router = Router();
  controller = new RouterController();

  constructor() {
    this.router.get("/", this.controller.getRoutes);
  }
}

export default new RouterRoutes().router;