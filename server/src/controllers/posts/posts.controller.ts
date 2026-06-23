import { Request, Response, NextFunction } from "express";
import {
  listPosts,
  getPostBySlug,
  getPostById,
  insertPost,
  updatePost,
  deletePost,
} from "../../db.js";
import { requireAdmin } from "../../auth.js";
import { isAdminLogin } from "../../config.js";

function computeReadingLabel(html: string): string {
  const text = html.replace(/<[^>]+>/g, " ");
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  return `${Math.max(1, Math.round(words / 200))} min →`;
}

export default class PostsController {
  list = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const isAdmin = isAdminLogin(req.session?.user?.login);
      const includeDrafts = isAdmin && req.query.all === "1";
      const rows = await listPosts(includeDrafts);
      res.json(
        rows.map((r) => ({
          id: r.id,
          slug: r.slug,
          title: r.title,
          excerpt: r.excerpt,
          status: r.status,
          readingLabel: r.reading_label,
          dateLabel: r.date_label,
          createdAt: r.created_at,
        }))
      );
    } catch (error) {
      next(error);
    }
  };

  getBySlug = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const slug = String(req.params.slug);
      const row = await getPostBySlug(slug);
      if (!row) {
        res.status(404).json({ error: "Not found" });
        return;
      }
      const isAdmin = isAdminLogin(req.session?.user?.login);
      if (row.status !== "published" && !isAdmin) {
        res.status(404).json({ error: "Not found" });
        return;
      }
      res.json({
        id: row.id,
        slug: row.slug,
        title: row.title,
        excerpt: row.excerpt,
        contentHtml: row.content_html,
        contentJson: row.content_json,
        status: row.status,
        readingLabel: row.reading_label,
        dateLabel: row.date_label,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      });
    } catch (error) {
      next(error);
    }
  };

  create = [
    requireAdmin,
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      try {
        const { title, slug, excerpt, contentHtml, contentJson, status, dateLabel } = req.body ?? {};
        const trimmedTitle = (title ?? "").trim();
        const trimmedSlug = (slug ?? "").trim();
        if (!trimmedTitle || !trimmedSlug) {
          res.status(400).json({ error: "Title and slug are required" });
          return;
        }
        if (!["draft", "published"].includes(status)) {
          res.status(400).json({ error: "Invalid status" });
          return;
        }
        if (!contentHtml || !contentJson) {
          res.status(400).json({ error: "Content is required" });
          return;
        }
        const existing = await getPostBySlug(trimmedSlug);
        if (existing) {
          res.status(409).json({ error: "Slug already exists" });
          return;
        }
        const row = await insertPost({
          slug: trimmedSlug,
          title: trimmedTitle,
          excerpt: excerpt ?? null,
          contentHtml,
          contentJson: typeof contentJson === "string" ? contentJson : JSON.stringify(contentJson),
          status,
          readingLabel: computeReadingLabel(contentHtml),
          dateLabel: dateLabel ?? null,
        });
        res.status(201).json({ id: row.id, slug: row.slug });
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
        const existing = await getPostById(id);
        if (!existing) {
          res.status(404).json({ error: "Not found" });
          return;
        }
        const { title, slug, excerpt, contentHtml, contentJson, status, dateLabel } = req.body ?? {};
        if (status && !["draft", "published"].includes(status)) {
          res.status(400).json({ error: "Invalid status" });
          return;
        }
        const newSlug = slug !== undefined ? String(slug).trim() : existing.slug;
        if (newSlug !== existing.slug) {
          const conflict = await getPostBySlug(newSlug);
          if (conflict) {
            res.status(409).json({ error: "Slug already exists" });
            return;
          }
        }
        const html = contentHtml ?? existing.content_html;
        const row = await updatePost(id, {
          title: title !== undefined ? String(title).trim() : undefined,
          slug: newSlug,
          excerpt: excerpt !== undefined ? excerpt : undefined,
          contentHtml: contentHtml ?? undefined,
          contentJson: contentJson !== undefined ? (typeof contentJson === "string" ? contentJson : JSON.stringify(contentJson)) : undefined,
          status: status ?? undefined,
          readingLabel: contentHtml ? computeReadingLabel(html) : undefined,
          dateLabel: dateLabel !== undefined ? dateLabel : undefined,
        });
        res.json({ id: row!.id, slug: row!.slug });
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
        if (!(await deletePost(id))) {
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