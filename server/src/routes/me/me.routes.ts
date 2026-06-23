import { Router } from "express";
import MeController from "../../controllers/me/me.controller.js";

class MeRoutes {
  router = Router();
  controller = new MeController();

  constructor() {
    this.router.get("/", this.controller.getMe);
  }
}

export default new MeRoutes().router;