import { MongoClient, ObjectId, type Db, type Document, type WithId } from "mongodb";
import { resolveMongoUrl } from "./config.js";

const COLLECTIONS = {
  signatures: "signatures",
  projects: "projects",
  posts: "posts",
  githubConnections: "github_connections",
  githubStatsCache: "github_stats_cache",
  siteSettings: "site_settings",
} as const;

const SETTING_KEYS = {
  activityYears: "activity_years",
} as const;

let client: MongoClient | null = null;
let db: Db | null = null;
let initPromise: Promise<Db> | null = null;

function idHex(doc: { _id?: ObjectId }): string {
  return doc._id?.toHexString() ?? "";
}

function parseObjectId(id: string): ObjectId | null {
  if (!ObjectId.isValid(id)) return null;
  return new ObjectId(id);
}

async function getDb(): Promise<Db> {
  if (db) return db;
  if (!initPromise) {
    initPromise = initClient().catch((err) => {
      initPromise = null;
      throw err;
    });
  }
  return initPromise;
}

async function initClient(): Promise<Db> {
  const mongoClient = new MongoClient(resolveMongoUrl(), {
    maxPoolSize: 10,
  });
  await mongoClient.connect();
  const database = mongoClient.db();
  await ensureIndexes(database);
  await seedIfEmpty(database);
  client = mongoClient;
  db = database;
  return database;
}

async function ensureIndexes(database: Db): Promise<void> {
  await Promise.all([
    database.collection(COLLECTIONS.githubConnections).createIndex({ login: 1 }, { unique: true }),
    database.collection(COLLECTIONS.githubStatsCache).createIndex({ cache_key: 1 }, { unique: true }),
    database.collection(COLLECTIONS.projects).createIndex({ github_repo_id: 1 }, { sparse: true }),
    database.collection(COLLECTIONS.posts).createIndex({ slug: 1 }, { unique: true }),
    database.collection(COLLECTIONS.siteSettings).createIndex({ key: 1 }, { unique: true }),
  ]);
}

type SiteSettingDoc = {
  key: string;
  value: unknown;
  updated_at: number;
};

async function seedIfEmpty(database: Db): Promise<void> {
  const now = Date.now();
  const hour = 1000 * 60 * 60;

  const sigCount = await database.collection(COLLECTIONS.signatures).countDocuments();
  if (sigCount === 0) {
    await database.collection(COLLECTIONS.signatures).insertMany([
      {
        github_id: 583231,
        login: "octocat",
        avatar_url: "https://github.com/octocat.png",
        message: "First signature on the wall.",
        created_at: now - hour * 26,
      },
      {
        github_id: 9919,
        login: "github",
        avatar_url: "https://github.com/github.png",
        message: "Clean template — easy to fork and customize.",
        created_at: now - hour * 70,
      },
    ]);
  }

  const projectCount = await database.collection(COLLECTIONS.projects).countDocuments();
  if (projectCount === 0) {
    await database.collection(COLLECTIONS.projects).insertMany([
      {
        sort_order: 1,
        num_label: "01",
        title: "Example API",
        description: "A REST API built with your stack of choice. Replace this entry from the dashboard.",
        url: "https://github.com",
        tags: ["TypeScript", "API"],
        is_published: true,
        source: "manual",
        description_source: "custom",
        github_languages: [],
        selected_languages: [],
        tech_stack: [],
        created_at: now,
        updated_at: now,
      },
      {
        sort_order: 2,
        num_label: "02",
        title: "Example App",
        description: "A frontend or full-stack project highlight. Edit title, description, and tags in the dashboard.",
        url: "https://github.com",
        tags: ["Web", "Open Source"],
        is_published: true,
        source: "manual",
        description_source: "custom",
        github_languages: [],
        selected_languages: [],
        tech_stack: [],
        created_at: now,
        updated_at: now,
      },
    ]);
  }

  const postCount = await database.collection(COLLECTIONS.posts).countDocuments();
  if (postCount === 0) {
    await database.collection(COLLECTIONS.posts).insertOne({
      slug: "welcome",
      title: "Welcome to your portfolio",
      excerpt: null,
      content_html:
        "<p>Replace this post from the dashboard. The editor supports headings, lists, quotes, and pasted HTML.</p>",
      content_json: JSON.stringify({
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [
              {
                type: "text",
                text: "Replace this post from the dashboard. The editor supports headings, lists, quotes, and pasted HTML.",
              },
            ],
          },
        ],
      }),
      status: "published",
      reading_label: "1 min →",
      date_label: new Date().toLocaleDateString("en", { year: "numeric", month: "2-digit" }).replace("/", " · "),
      created_at: now,
      updated_at: now,
    });
  }
}

export type SignatureDoc = {
  _id?: ObjectId;
  github_id: number;
  login: string;
  avatar_url: string | null;
  message: string;
  created_at: number;
};

export type ProjectDoc = {
  _id?: ObjectId;
  sort_order: number;
  num_label: string;
  title: string;
  description: string;
  url: string;
  tags: string[];
  github_repo_id?: number | null;
  github_full_name?: string | null;
  is_published?: boolean | null;
  is_private?: boolean | null;
  description_source?: string | null;
  github_description?: string | null;
  github_languages?: string[] | null;
  selected_languages?: string[] | null;
  tech_stack?: string[] | null;
  source?: string | null;
  created_at: number;
  updated_at: number;
};

export type PostDoc = {
  _id?: ObjectId;
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

export type GitHubConnectionDoc = {
  _id?: ObjectId;
  github_id: number;
  login: string;
  access_token_encrypted: string;
  scopes: string;
  updated_at: number;
};

export type GitHubStatsCacheDoc = {
  _id?: ObjectId;
  cache_key: string;
  payload_json: string;
  expires_at: number;
};

export type SignatureRow = SignatureDoc & { id: string };
export type ProjectRow = ProjectDoc & { id: string };
export type PostRow = PostDoc & { id: string };

function asSignatureRow(doc: WithId<SignatureDoc>): SignatureRow {
  return { ...doc, id: idHex(doc) };
}

function asProjectRow(doc: WithId<ProjectDoc>): ProjectRow {
  return { ...doc, id: idHex(doc) };
}

function asPostRow(doc: WithId<PostDoc>): PostRow {
  return { ...doc, id: idHex(doc) };
}

export async function listSignatures(): Promise<SignatureRow[]> {
  const database = await getDb();
  const docs = await database
    .collection<SignatureDoc>(COLLECTIONS.signatures)
    .find()
    .sort({ created_at: -1 })
    .toArray();
  return docs.map(asSignatureRow);
}

export async function insertSignature(
  githubId: number,
  login: string,
  avatarUrl: string | null,
  message: string
): Promise<SignatureRow> {
  const database = await getDb();
  const now = Date.now();
  const doc: SignatureDoc = {
    github_id: githubId,
    login,
    avatar_url: avatarUrl,
    message,
    created_at: now,
  };
  const result = await database.collection<SignatureDoc>(COLLECTIONS.signatures).insertOne(doc);
  return asSignatureRow({ ...doc, _id: result.insertedId });
}

export async function getSignature(id: string): Promise<SignatureRow | undefined> {
  const oid = parseObjectId(id);
  if (!oid) return undefined;
  const database = await getDb();
  const doc = await database.collection<SignatureDoc>(COLLECTIONS.signatures).findOne({ _id: oid });
  return doc ? asSignatureRow(doc) : undefined;
}

export async function deleteSignature(id: string): Promise<boolean> {
  const oid = parseObjectId(id);
  if (!oid) return false;
  const database = await getDb();
  const result = await database.collection(COLLECTIONS.signatures).deleteOne({ _id: oid });
  return result.deletedCount > 0;
}

export async function listPosts(includeDrafts: boolean): Promise<PostRow[]> {
  const database = await getDb();
  const filter: Document = includeDrafts ? {} : { status: "published" };
  const docs = await database
    .collection<PostDoc>(COLLECTIONS.posts)
    .find(filter)
    .sort({ created_at: -1 })
    .toArray();
  return docs.map(asPostRow);
}

export async function getPostBySlug(slug: string): Promise<PostRow | undefined> {
  const database = await getDb();
  const doc = await database.collection<PostDoc>(COLLECTIONS.posts).findOne({ slug });
  return doc ? asPostRow(doc) : undefined;
}

export async function getPostById(id: string): Promise<PostRow | undefined> {
  const oid = parseObjectId(id);
  if (!oid) return undefined;
  const database = await getDb();
  const doc = await database.collection<PostDoc>(COLLECTIONS.posts).findOne({ _id: oid });
  return doc ? asPostRow(doc) : undefined;
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
  const database = await getDb();
  const now = Date.now();
  const doc: PostDoc = {
    slug: data.slug,
    title: data.title,
    excerpt: data.excerpt ?? null,
    content_html: data.contentHtml,
    content_json: data.contentJson,
    status: data.status,
    reading_label: data.readingLabel ?? null,
    date_label: data.dateLabel ?? null,
    created_at: now,
    updated_at: now,
  };
  const result = await database.collection<PostDoc>(COLLECTIONS.posts).insertOne(doc);
  return asPostRow({ ...doc, _id: result.insertedId });
}

export async function updatePost(
  id: string,
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
  const oid = parseObjectId(id);
  if (!oid) return undefined;
  const now = Date.now();
  const database = await getDb();
  const update: Partial<PostDoc> = {
    slug: data.slug ?? existing.slug,
    title: data.title ?? existing.title,
    excerpt: data.excerpt !== undefined ? data.excerpt : existing.excerpt,
    content_html: data.contentHtml ?? existing.content_html,
    content_json: data.contentJson ?? existing.content_json,
    status: data.status ?? existing.status,
    reading_label: data.readingLabel !== undefined ? data.readingLabel : existing.reading_label,
    date_label: data.dateLabel !== undefined ? data.dateLabel : existing.date_label,
    updated_at: now,
  };
  await database.collection<PostDoc>(COLLECTIONS.posts).updateOne({ _id: oid }, { $set: update });
  return getPostById(id);
}

export async function deletePost(id: string): Promise<boolean> {
  const oid = parseObjectId(id);
  if (!oid) return false;
  const database = await getDb();
  const result = await database.collection(COLLECTIONS.posts).deleteOne({ _id: oid });
  return result.deletedCount > 0;
}

export async function listProjects(publishedOnly = false): Promise<ProjectRow[]> {
  const database = await getDb();
  const filter: Document = publishedOnly ? { is_published: { $ne: false } } : {};
  const docs = await database
    .collection<ProjectDoc>(COLLECTIONS.projects)
    .find(filter)
    .sort({ sort_order: 1, created_at: 1 })
    .toArray();
  return docs.map(asProjectRow);
}

export async function getProject(id: string): Promise<ProjectRow | undefined> {
  const oid = parseObjectId(id);
  if (!oid) return undefined;
  const database = await getDb();
  const doc = await database.collection<ProjectDoc>(COLLECTIONS.projects).findOne({ _id: oid });
  return doc ? asProjectRow(doc) : undefined;
}

export async function findProjectByGitHubRepoId(repoId: number): Promise<ProjectRow | undefined> {
  const database = await getDb();
  const doc = await database.collection<ProjectDoc>(COLLECTIONS.projects).findOne({ github_repo_id: repoId });
  return doc ? asProjectRow(doc) : undefined;
}

export async function countProjects(): Promise<number> {
  const database = await getDb();
  return database.collection(COLLECTIONS.projects).countDocuments();
}

export async function insertProject(data: {
  sortOrder: number;
  numLabel: string;
  title: string;
  description: string;
  url: string;
  tags: string[];
  githubRepoId?: number | null;
  githubFullName?: string | null;
  isPublished?: boolean;
  isPrivate?: boolean | null;
  descriptionSource?: string;
  githubDescription?: string | null;
  githubLanguages?: string[];
  selectedLanguages?: string[];
  techStack?: string[];
  source?: string;
}): Promise<ProjectRow> {
  const database = await getDb();
  const now = Date.now();
  const doc: ProjectDoc = {
    sort_order: data.sortOrder,
    num_label: data.numLabel,
    title: data.title,
    description: data.description,
    url: data.url,
    tags: data.tags,
    github_repo_id: data.githubRepoId ?? null,
    github_full_name: data.githubFullName ?? null,
    is_published: data.isPublished ?? true,
    is_private: data.isPrivate ?? null,
    description_source: data.descriptionSource ?? "custom",
    github_description: data.githubDescription ?? null,
    github_languages: data.githubLanguages ?? [],
    selected_languages: data.selectedLanguages ?? [],
    tech_stack: data.techStack ?? [],
    source: data.source ?? "manual",
    created_at: now,
    updated_at: now,
  };
  const result = await database.collection<ProjectDoc>(COLLECTIONS.projects).insertOne(doc);
  return asProjectRow({ ...doc, _id: result.insertedId });
}

export async function updateProject(
  id: string,
  data: Partial<{
    sortOrder: number;
    numLabel: string;
    title: string;
    description: string;
    url: string;
    tags: string[];
    githubRepoId: number | null;
    githubFullName: string | null;
    isPublished: boolean;
    isPrivate: boolean | null;
    descriptionSource: string;
    githubDescription: string | null;
    githubLanguages: string[];
    selectedLanguages: string[];
    techStack: string[];
    source: string;
  }>
): Promise<ProjectRow | undefined> {
  const existing = await getProject(id);
  if (!existing) return undefined;
  const oid = parseObjectId(id);
  if (!oid) return undefined;
  const now = Date.now();
  const database = await getDb();
  const update: Partial<ProjectDoc> = {
    sort_order: data.sortOrder ?? existing.sort_order,
    num_label: data.numLabel ?? existing.num_label,
    title: data.title ?? existing.title,
    description: data.description ?? existing.description,
    url: data.url ?? existing.url,
    tags: data.tags ?? existing.tags,
    github_repo_id: data.githubRepoId !== undefined ? data.githubRepoId : existing.github_repo_id,
    github_full_name: data.githubFullName !== undefined ? data.githubFullName : existing.github_full_name,
    is_published: data.isPublished !== undefined ? data.isPublished : existing.is_published,
    is_private: data.isPrivate !== undefined ? data.isPrivate : existing.is_private,
    description_source: data.descriptionSource !== undefined ? data.descriptionSource : existing.description_source,
    github_description: data.githubDescription !== undefined ? data.githubDescription : existing.github_description,
    github_languages: data.githubLanguages !== undefined ? data.githubLanguages : existing.github_languages,
    selected_languages: data.selectedLanguages !== undefined ? data.selectedLanguages : existing.selected_languages,
    tech_stack: data.techStack !== undefined ? data.techStack : existing.tech_stack,
    source: data.source !== undefined ? data.source : existing.source,
    updated_at: now,
  };
  await database.collection<ProjectDoc>(COLLECTIONS.projects).updateOne({ _id: oid }, { $set: update });
  return getProject(id);
}

export async function deleteProject(id: string): Promise<boolean> {
  const oid = parseObjectId(id);
  if (!oid) return false;
  const database = await getDb();
  const result = await database.collection(COLLECTIONS.projects).deleteOne({ _id: oid });
  return result.deletedCount > 0;
}

export async function findGitHubConnectionByLogin(login: string): Promise<GitHubConnectionDoc | undefined> {
  const database = await getDb();
  return (await database.collection<GitHubConnectionDoc>(COLLECTIONS.githubConnections).findOne({ login })) ?? undefined;
}

export async function upsertGitHubConnection(data: {
  githubId: number;
  login: string;
  accessTokenEncrypted: string;
  scopes: string;
  updatedAt: number;
}): Promise<void> {
  const database = await getDb();
  await database.collection<GitHubConnectionDoc>(COLLECTIONS.githubConnections).updateOne(
    { login: data.login },
    {
      $set: {
        github_id: data.githubId,
        login: data.login,
        access_token_encrypted: data.accessTokenEncrypted,
        scopes: data.scopes,
        updated_at: data.updatedAt,
      },
    },
    { upsert: true }
  );
}

export async function findGitHubStatsCache(key: string): Promise<GitHubStatsCacheDoc | undefined> {
  const database = await getDb();
  return (await database.collection<GitHubStatsCacheDoc>(COLLECTIONS.githubStatsCache).findOne({ cache_key: key })) ?? undefined;
}

export async function upsertGitHubStatsCache(key: string, payloadJson: string, expiresAt: number): Promise<void> {
  const database = await getDb();
  await database.collection<GitHubStatsCacheDoc>(COLLECTIONS.githubStatsCache).updateOne(
    { cache_key: key },
    { $set: { cache_key: key, payload_json: payloadJson, expires_at: expiresAt } },
    { upsert: true }
  );
}

export async function getActivityYearsSetting(): Promise<number[] | null> {
  const database = await getDb();
  const doc = await database
    .collection<SiteSettingDoc>(COLLECTIONS.siteSettings)
    .findOne({ key: SETTING_KEYS.activityYears });

  if (!doc || !Array.isArray(doc.value)) return null;

  const years = doc.value.filter((year): year is number => typeof year === "number" && Number.isInteger(year));
  return years.length > 0 ? years : null;
}

export async function setActivityYearsSetting(years: number[]): Promise<number[]> {
  const database = await getDb();
  const normalized = [...new Set(years)].sort((a, b) => b - a);

  await database.collection<SiteSettingDoc>(COLLECTIONS.siteSettings).updateOne(
    { key: SETTING_KEYS.activityYears },
    {
      $set: {
        key: SETTING_KEYS.activityYears,
        value: normalized,
        updated_at: Date.now(),
      },
    },
    { upsert: true }
  );

  return normalized;
}

export function displayProjectDescription(project: ProjectRow): string {
  if (project.description_source === "github" && project.github_description) {
    return project.github_description;
  }
  return project.description;
}