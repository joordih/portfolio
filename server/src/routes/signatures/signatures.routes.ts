import { Router } from "express";
import SignaturesController from "../../controllers/signatures/signatures.controller.js";

class SignaturesRoutes {
  router = Router();
  controller = new SignaturesController();

  constructor() {
    this.router.get("/", this.controller.list);
    this.router.post("/", this.controller.create);
    this.router.delete("/:id", this.controller.remove);
  }
}

export default new SignaturesRoutes().router;