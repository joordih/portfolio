import { Request, Response, NextFunction } from "express";
import { isAdminLogin } from "../../config.js";

export default class RouterController {
  getRoutes = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const checkPath = req.query.check as string | undefined;
      if (checkPath === "/dashboard") {
        const user = req.session?.user;
        if (!user || !isAdminLogin(user.login)) {
          res.status(403).json({ redirection: "/" });
          return;
        }
      }

      const routes: Record<string, string> = {
        "/": "home",
        "/stack": "stack",
        "/guestbook": "guestbook",
        "/blog": "blog",
        "/activity": "activity",
        "/dashboard": "dashboard",
      };

      res.status(200).json(routes);
    } catch (error) {
      next(error);
    }
  };
}