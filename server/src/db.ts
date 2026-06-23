import { createClient, type Client } from "@libsql/client";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { isProduction } from "./config.js";

function resolveClientConfig(): { url: string; authToken?: string } {
  if (process.env.LIBSQL_URL) {
    return {
      url: process.env.LIBSQL_URL,
      authToken: process.env.LIBSQL_AUTH_TOKEN,
    };
  }
  if (isProduction()) {
    throw new Error("LIBSQL_URL is required in production");
  }
  const dbPath = process.env.DATABASE_PATH ?? defaultLocalDbPath();
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  return { url: `file:${dbPath}` };
}

function isLocalFileDb(url: string): boolean {
  return url.startsWith("file:");
}

function defaultLocalDbPath(): string {
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  return path.join(__dirname, "..", "data.db");
}

let client: Client | null = null;
let initPromise: Promise<Client> | null = null;

async function getDb(): Promise<Client> {
  if (client) return client;
  if (!initPromise) {
    initPromise = initClient().catch((err) => {
      initPromise = null;
      throw err;
    });
  }
  return initPromise;
}

async function initClient(): Promise<Client> {
  const config = resolveClientConfig();
  const db = createClient(config);
  if (isLocalFileDb(config.url)) {
    await db.execute("PRAGMA journal_mode = WAL");
  }
  await initSchema(db);
  await seedIfEmpty(db);
  client = db;
  return db;
}

async function initSchema(db: Client): Promise<void> {
  await db.batch(
    [
    `CREATE TABLE IF NOT EXISTS signatures (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      github_id  INTEGER NOT NULL,
      login      TEXT    NOT NULL,
      avatar_url TEXT,
      message    TEXT    NOT NULL,
      created_at INTEGER NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS projects (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      sort_order  INTEGER NOT NULL DEFAULT 0,
      num_label   TEXT    NOT NULL,
      title       TEXT    NOT NULL,
      description TEXT    NOT NULL,
      url         TEXT    NOT NULL,
      tags        TEXT    NOT NULL,
      created_at  INTEGER NOT NULL,
      updated_at  INTEGER NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS posts (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      slug          TEXT    NOT NULL UNIQUE,
      title         TEXT    NOT NULL,
      excerpt       TEXT,
      content_html  TEXT    NOT NULL,
      content_json  TEXT    NOT NULL,
      status        TEXT    NOT NULL DEFAULT 'draft',
      reading_label TEXT,
      date_label    TEXT,
      created_at    INTEGER NOT NULL,
      updated_at    INTEGER NOT NULL
    )`,
    ],
    "write"
  );
}

async function seedIfEmpty(db: Client): Promise<void> {
  const sigCount = await db.execute("SELECT COUNT(*) as c FROM signatures");
  if (Number(sigCount.rows[0]?.c) === 0) {
    const now = Date.now();
    await db.batch(
      [
      {
        sql: "INSERT INTO signatures (github_id, login, avatar_url, message, created_at) VALUES (?, ?, ?, ?, ?)",
        args: [583231, "octocat", "https://github.com/octocat.png", "First signature on the wall.", now - 1000 * 60 * 60 * 26],
      },
      {
        sql: "INSERT INTO signatures (github_id, login, avatar_url, message, created_at) VALUES (?, ?, ?, ?, ?)",
        args: [9919, "github", "https://github.com/github.png", "Clean template — easy to fork and customize.", now - 1000 * 60 * 60 * 70],
      },
      ],
      "write"
    );
  }

  const projectCount = await db.execute("SELECT COUNT(*) as c FROM projects");
  if (Number(projectCount.rows[0]?.c) === 0) {
    const now = Date.now();
    const projects = [
      {
        sort_order: 1,
        num_label: "01",
        title: "Example API",
        description: "A REST API built with your stack of choice. Replace this entry from the dashboard.",
        url: "https://github.com",
        tags: ["TypeScript", "API"],
      },
      {
        sort_order: 2,
        num_label: "02",
        title: "Example App",
        description: "A frontend or full-stack project highlight. Edit title, description, and tags in the dashboard.",
        url: "https://github.com",
        tags: ["Web", "Open Source"],
      },
    ];
    for (const p of projects) {
      await db.execute({
        sql: `INSERT INTO projects (sort_order, num_label, title, description, url, tags, created_at, updated_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [p.sort_order, p.num_label, p.title, p.description, p.url, JSON.stringify(p.tags), now, now],
      });
    }
  }

  const postCount = await db.execute("SELECT COUNT(*) as c FROM posts");
  if (Number(postCount.rows[0]?.c) === 0) {
    const now = Date.now();
    const posts = [
      {
        slug: "welcome",
        title: "Welcome to your portfolio",
        dateLabel: new Date().toLocaleDateString("en", { year: "numeric", month: "2-digit" }).replace("/", " · "),
        readingLabel: "1 min →",
        html: "<p>Replace this post from the dashboard. The editor supports headings, lists, quotes, and pasted HTML.</p>",
        json: JSON.stringify({
          type: "doc",
          content: [
            {
              type: "paragraph",
              content: [{ type: "text", text: "Replace this post from the dashboard. The editor supports headings, lists, quotes, and pasted HTML." }],
            },
          ],
        }),
      },
    ];
    for (const p of posts) {
      await db.execute({
        sql: `INSERT INTO posts (slug, title, excerpt, content_html, content_json, status, reading_label, date_label, created_at, updated_at)
              VALUES (?, ?, ?, ?, ?, 'published', ?, ?, ?, ?)`,
        args: [p.slug, p.title, null, p.html, p.json, p.readingLabel, p.dateLabel, now, now],
      });
    }
  }
}

function asSignatureRow(row: Record<string, unknown>): SignatureRow {
  return {
    id: Number(row.id),
    github_id: Number(row.github_id),
    login: String(row.login),
    avatar_url: row.avatar_url == null ? null : String(row.avatar_url),
    message: String(row.message),
    created_at: Number(row.created_at),
  };
}

function asPostRow(row: Record<string, unknown>): PostRow {
  return {
    id: Number(row.id),
    slug: String(row.slug),
    title: String(row.title),
    excerpt: row.excerpt == null ? null : String(row.excerpt),
    content_html: String(row.content_html),
    content_json: String(row.content_json),
    status: String(row.status),
    reading_label: row.reading_label == null ? null : String(row.reading_label),
    date_label: row.date_label == null ? null : String(row.date_label),
    created_at: Number(row.created_at),
    updated_at: Number(row.updated_at),
  };
}

function asProjectRow(row: Record<string, unknown>): ProjectRow {
  return {
    id: Number(row.id),
    sort_order: Number(row.sort_order),
    num_label: String(row.num_label),
    title: String(row.title),
    description: String(row.description),
    url: String(row.url),
    tags: String(row.tags),
    created_at: Number(row.created_at),
    updated_at: Number(row.updated_at),
  };
}

export type SignatureRow = {
  id: number;
  github_id: number;
  login: string;
  avatar_url: string | null;
  message: string;
  created_at: number;
};

export type PostRow = {
  id: number;
  slug: string;
  title: string;
  excerpt: string | null;
  content_html: string;
  content_json: string;
  status: string;
  reading_label: string | null;
  date_label: string | null;
  created_at: number;
  updated_at: number;
};

export async function listSignatures(): Promise<SignatureRow[]> {
  const db = await getDb();
  const result = await db.execute("SELECT * FROM signatures ORDER BY created_at DESC");
  return result.rows.map((row) => asSignatureRow(row as Record<string, unknown>));
}

export async function insertSignature(
  githubId: number,
  login: string,
  avatarUrl: string | null,
  message: string
): Promise<SignatureRow> {
  const db = await getDb();
  const now = Date.now();
  const result = await db.execute({
    sql: "INSERT INTO signatures (github_id, login, avatar_url, message, created_at) VALUES (?, ?, ?, ?, ?)",
    args: [githubId, login, avatarUrl, message, now],
  });
  const row = await db.execute({
    sql: "SELECT * FROM signatures WHERE id = ?",
    args: [Number(result.lastInsertRowid)],
  });
  return asSignatureRow(row.rows[0] as Record<string, unknown>);
}

export async function getSignature(id: number): Promise<SignatureRow | undefined> {
  const db = await getDb();
  const result = await db.execute({ sql: "SELECT * FROM signatures WHERE id = ?", args: [id] });
  if (result.rows.length === 0) return undefined;
  return asSignatureRow(result.rows[0] as Record<string, unknown>);
}

export async function deleteSignature(id: number): Promise<boolean> {
  const db = await getDb();
  const result = await db.execute({ sql: "DELETE FROM signatures WHERE id = ?", args: [id] });
  return result.rowsAffected > 0;
}

export async function listPosts(includeDrafts: boolean): Promise<PostRow[]> {
  const db = await getDb();
  const result = includeDrafts
    ? await db.execute("SELECT * FROM posts ORDER BY created_at DESC")
    : await db.execute("SELECT * FROM posts WHERE status = 'published' ORDER BY created_at DESC");
  return result.rows.map((row) => asPostRow(row as Record<string, unknown>));
}

export async function getPostBySlug(slug: string): Promise<PostRow | undefined> {
  const db = await getDb();
  const result = await db.execute({ sql: "SELECT * FROM posts WHERE slug = ?", args: [slug] });
  if (result.rows.length === 0) return undefined;
  return asPostRow(result.rows[0] as Record<string, unknown>);
}

export async function getPostById(id: number): Promise<PostRow | undefined> {
  const db = await getDb();
  const result = await db.execute({ sql: "SELECT * FROM posts WHERE id = ?", args: [id] });
  if (result.rows.length === 0) return undefined;
  return asPostRow(result.rows[0] as Record<string, unknown>);
}

export async function insertPost(data: {
  slug: string;
  title: string;
  excerpt?: string | null;
  contentHtml: string;
  contentJson: string;
  status: string;
  readingLabel?: string | null;
  dateLabel?: string | null;
}): Promise<PostRow> {
  const db = await getDb();
  const now = Date.now();
  const result = await db.execute({
    sql: `INSERT INTO posts (slug, title, excerpt, content_html, content_json, status, reading_label, date_label, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      data.slug,
      data.title,
      data.excerpt ?? null,
      data.contentHtml,
      data.contentJson,
      data.status,
      data.readingLabel ?? null,
      data.dateLabel ?? null,
      now,
      now,
    ],
  });
  const row = await db.execute({
    sql: "SELECT * FROM posts WHERE id = ?",
    args: [Number(result.lastInsertRowid)],
  });
  return asPostRow(row.rows[0] as Record<string, unknown>);
}

export async function updatePost(
  id: number,
  data: Partial<{
    slug: string;
    title: string;
    excerpt: string | null;
    contentHtml: string;
    contentJson: string;
    status: string;
    readingLabel: string | null;
    dateLabel: string | null;
  }>
): Promise<PostRow | undefined> {
  const existing = await getPostById(id);
  if (!existing) return undefined;
  const now = Date.now();
  const db = await getDb();
  await db.execute({
    sql: `UPDATE posts SET
      slug = ?, title = ?, excerpt = ?, content_html = ?, content_json = ?,
      status = ?, reading_label = ?, date_label = ?, updated_at = ?
     WHERE id = ?`,
    args: [
      data.slug ?? existing.slug,
      data.title ?? existing.title,
      data.excerpt !== undefined ? data.excerpt : existing.excerpt,
      data.contentHtml ?? existing.content_html,
      data.contentJson ?? existing.content_json,
      data.status ?? existing.status,
      data.readingLabel !== undefined ? data.readingLabel : existing.reading_label,
      data.dateLabel !== undefined ? data.dateLabel : existing.date_label,
      now,
      id,
    ],
  });
  return getPostById(id);
}

export async function deletePost(id: number): Promise<boolean> {
  const db = await getDb();
  const result = await db.execute({ sql: "DELETE FROM posts WHERE id = ?", args: [id] });
  return result.rowsAffected > 0;
}

export type ProjectRow = {
  id: number;
  sort_order: number;
  num_label: string;
  title: string;
  description: string;
  url: string;
  tags: string;
  created_at: number;
  updated_at: number;
};

export async function listProjects(): Promise<ProjectRow[]> {
  const db = await getDb();
  const result = await db.execute("SELECT * FROM projects ORDER BY sort_order ASC, id ASC");
  return result.rows.map((row) => asProjectRow(row as Record<string, unknown>));
}

export async function getProject(id: number): Promise<ProjectRow | undefined> {
  const db = await getDb();
  const result = await db.execute({ sql: "SELECT * FROM projects WHERE id = ?", args: [id] });
  if (result.rows.length === 0) return undefined;
  return asProjectRow(result.rows[0] as Record<string, unknown>);
}

export async function insertProject(data: {
  sortOrder: number;
  numLabel: string;
  title: string;
  description: string;
  url: string;
  tags: string[];
}): Promise<ProjectRow> {
  const db = await getDb();
  const now = Date.now();
  const result = await db.execute({
    sql: `INSERT INTO projects (sort_order, num_label, title, description, url, tags, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [data.sortOrder, data.numLabel, data.title, data.description, data.url, JSON.stringify(data.tags), now, now],
  });
  const row = await db.execute({
    sql: "SELECT * FROM projects WHERE id = ?",
    args: [Number(result.lastInsertRowid)],
  });
  return asProjectRow(row.rows[0] as Record<string, unknown>);
}

export async function updateProject(
  id: number,
  data: Partial<{
    sortOrder: number;
    numLabel: string;
    title: string;
    description: string;
    url: string;
    tags: string[];
  }>
): Promise<ProjectRow | undefined> {
  const existing = await getProject(id);
  if (!existing) return undefined;
  const now = Date.now();
  const tags = data.tags ?? (JSON.parse(existing.tags) as string[]);
  const db = await getDb();
  await db.execute({
    sql: `UPDATE projects SET
      sort_order = ?, num_label = ?, title = ?, description = ?, url = ?, tags = ?, updated_at = ?
     WHERE id = ?`,
    args: [
      data.sortOrder ?? existing.sort_order,
      data.numLabel ?? existing.num_label,
      data.title ?? existing.title,
      data.description ?? existing.description,
      data.url ?? existing.url,
      JSON.stringify(tags),
      now,
      id,
    ],
  });
  return getProject(id);
}

export async function deleteProject(id: number): Promise<boolean> {
  const db = await getDb();
  const result = await db.execute({ sql: "DELETE FROM projects WHERE id = ?", args: [id] });
  return result.rowsAffected > 0;
}