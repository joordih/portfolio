import { Request, Response, NextFunction } from "express";
import { isAdminLogin } from "../../config.js";

export default class MeController {
  getMe = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const user = req.session?.user ?? null;
      const isAdmin = isAdminLogin(user?.login);
      res.json({ user, isAdmin });
    } catch (error) {
      next(error);
    }
  };
}