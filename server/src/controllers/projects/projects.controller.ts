import { Request, Response, NextFunction } from "express";
import {
  listProjects,
  getProject,
  insertProject,
  updateProject,
  deleteProject,
  countProjects,
  displayProjectDescription,
  type ProjectRow,
} from "../../db.js";
import { requireAdmin } from "../../auth.js";
import { isAdminLogin } from "../../config.js";
import { projectToJson } from "../../github/github-project-import-service.js";

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

function toJson(row: ProjectRow) {
  return projectToJson({
    ...row,
    description: displayProjectDescription(row),
  });
}

export default class ProjectsController {
  list = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const isAdmin = isAdminLogin(req.session?.user?.login);
      const rows = await listProjects(!isAdmin);
      res.json(rows.map(toJson));
    } catch (error) {
      next(error);
    }
  };

  getById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const row = await getProject(String(req.params.id));
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
        const { title, description, url, numLabel, sortOrder, tags, techStack, isPublished } = req.body ?? {};
        const trimmedTitle = (title ?? "").trim();
        const trimmedDesc = (description ?? "").trim();
        const trimmedUrl = (url ?? "").trim();
        if (!trimmedTitle || !trimmedDesc || !trimmedUrl) {
          res.status(400).json({ error: "Title, description and url are required" });
          return;
        }
        const tagList = parseTags(tags);
        const techList = parseTags(techStack);
        const existingCount = await countProjects();
        const order = Number.isFinite(Number(sortOrder)) ? Number(sortOrder) : existingCount + 1;
        const label = (numLabel ?? String(order).padStart(2, "0")).trim();
        const row = await insertProject({
          sortOrder: order,
          numLabel: label,
          title: trimmedTitle,
          description: trimmedDesc,
          url: trimmedUrl,
          tags: tagList,
          techStack: techList,
          isPublished: isPublished ?? true,
          source: "manual",
          descriptionSource: "custom",
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
        const id = String(req.params.id);
        const existing = await getProject(id);
        if (!existing) {
          res.status(404).json({ error: "Not found" });
          return;
        }
        const {
          title,
          description,
          url,
          numLabel,
          sortOrder,
          tags,
          isPublished,
          descriptionSource,
          githubDescription,
          selectedLanguages,
          techStack,
        } = req.body ?? {};
        const row = await updateProject(id, {
          title: title !== undefined ? String(title).trim() : undefined,
          description: description !== undefined ? String(description).trim() : undefined,
          url: url !== undefined ? String(url).trim() : undefined,
          numLabel: numLabel !== undefined ? String(numLabel).trim() : undefined,
          sortOrder: sortOrder !== undefined ? Number(sortOrder) : undefined,
          tags: tags !== undefined ? parseTags(tags) : undefined,
          isPublished: isPublished !== undefined ? Boolean(isPublished) : undefined,
          descriptionSource: descriptionSource !== undefined ? String(descriptionSource) : undefined,
          githubDescription: githubDescription !== undefined ? String(githubDescription) : undefined,
          selectedLanguages: selectedLanguages !== undefined ? parseTags(selectedLanguages) : undefined,
          techStack: techStack !== undefined ? parseTags(techStack) : undefined,
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
        const id = String(req.params.id);
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