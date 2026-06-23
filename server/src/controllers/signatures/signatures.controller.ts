import { Request, Response, NextFunction } from "express";
import { listSignatures, insertSignature, getSignature, deleteSignature } from "../../db.js";
import { requireAuth } from "../../auth.js";
import { isAdminLogin } from "../../config.js";
const MAX_MESSAGE_LENGTH = 500;

export default class SignaturesController {
  list = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const rows = await listSignatures();
      res.json(
        rows.map((r) => ({
          id: r.id,
          login: r.login,
          avatarUrl: r.avatar_url,
          message: r.message,
          createdAt: r.created_at,
        }))
      );
    } catch (error) {
      next(error);
    }
  };

  create = [
    requireAuth,
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      try {
        const message = (req.body?.message ?? "").trim();
        if (!message) {
          res.status(400).json({ error: "Message is required" });
          return;
        }
        if (message.length > MAX_MESSAGE_LENGTH) {
          res.status(400).json({ error: "Message too long" });
          return;
        }
        const user = req.session!.user!;
        const row = await insertSignature(user.id, user.login, user.avatar_url, message);
        res.status(201).json({
          id: row.id,
          login: row.login,
          avatarUrl: row.avatar_url,
          message: row.message,
          createdAt: row.created_at,
        });
      } catch (error) {
        next(error);
      }
    },
  ];

  remove = [
    requireAuth,
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      try {
        const id = Number(req.params.id);
        const sig = await getSignature(id);
        if (!sig) {
          res.status(404).json({ error: "Not found" });
          return;
        }
        const user = req.session!.user!;
        const isAuthor = sig.github_id === user.id;
        const isAdmin = isAdminLogin(user.login);
        if (!isAuthor && !isAdmin) {
          res.status(403).json({ error: "Forbidden" });
          return;
        }
        await deleteSignature(id);
        res.status(204).end();
      } catch (error) {
        next(error);
      }
    },
  ];
}