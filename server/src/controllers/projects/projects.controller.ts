import { Request, Response, NextFunction } from "express";
import {
  listProjects,
  getProject,
  insertProject,
  updateProject,
  deleteProject,
} from "../../db.js";
import { requireAdmin } from "../../auth.js";

function parseTags(raw: unknown): string[] {
  if (Array.isArray(raw)) return raw.map((t) => String(t).trim()).filter(Boolean);
  if (typeof raw === "string") {
    return raw
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
  }
  return [];
}

function toJson(row: { id: number; sort_order: number; num_label: string; title: string; description: string; url: string; tags: string; created_at: number; updated_at: number }) {
  return {
    id: row.id,
    sortOrder: row.sort_order,
    numLabel: row.num_label,
    title: row.title,
    description: row.description,
    url: row.url,
    tags: JSON.parse(row.tags) as string[],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export default class ProjectsController {
  list = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const rows = await listProjects();
      res.json(rows.map(toJson));
    } catch (error) {
      next(error);
    }
  };

  getById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const row = await getProject(Number(req.params.id));
      if (!row) {
        res.status(404).json({ error: "Not found" });
        return;
      }
      res.json(toJson(row));
    } catch (error) {
      next(error);
    }
  };

  create = [
    requireAdmin,
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      try {
        const { title, description, url, numLabel, sortOrder, tags } = req.body ?? {};
        const trimmedTitle = (title ?? "").trim();
        const trimmedDesc = (description ?? "").trim();
        const trimmedUrl = (url ?? "").trim();
        if (!trimmedTitle || !trimmedDesc || !trimmedUrl) {
          res.status(400).json({ error: "Title, description and url are required" });
          return;
        }
        const tagList = parseTags(tags);
        const existing = await listProjects();
        const order = Number.isFinite(Number(sortOrder)) ? Number(sortOrder) : existing.length + 1;
        const label = (numLabel ?? String(order).padStart(2, "0")).trim();
        const row = await insertProject({
          sortOrder: order,
          numLabel: label,
          title: trimmedTitle,
          description: trimmedDesc,
          url: trimmedUrl,
          tags: tagList,
        });
        res.status(201).json(toJson(row));
      } catch (error) {
        next(error);
      }
    },
  ];

  update = [
    requireAdmin,
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      try {
        const id = Number(req.params.id);
        const existing = await getProject(id);
        if (!existing) {
          res.status(404).json({ error: "Not found" });
          return;
        }
        const { title, description, url, numLabel, sortOrder, tags } = req.body ?? {};
        const row = await updateProject(id, {
          title: title !== undefined ? String(title).trim() : undefined,
          description: description !== undefined ? String(description).trim() : undefined,
          url: url !== undefined ? String(url).trim() : undefined,
          numLabel: numLabel !== undefined ? String(numLabel).trim() : undefined,
          sortOrder: sortOrder !== undefined ? Number(sortOrder) : undefined,
          tags: tags !== undefined ? parseTags(tags) : undefined,
        });
        res.json(toJson(row!));
      } catch (error) {
        next(error);
      }
    },
  ];

  remove = [
    requireAdmin,
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      try {
        const id = Number(req.params.id);
        if (!(await deleteProject(id))) {
          res.status(404).json({ error: "Not found" });
          return;
        }
        res.status(204).end();
      } catch (error) {
        next(error);
      }
    },
  ];
}