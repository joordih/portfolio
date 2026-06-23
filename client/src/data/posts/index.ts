export type PostListItem = {
  id: number;
  slug: string;
  title: string;
  excerpt: string | null;
  status: string;
  readingLabel: string | null;
  dateLabel: string | null;
  createdAt: number;
};

export type Post = PostListItem & {
  contentHtml: string;
  contentJson: string;
  updatedAt: number;
};

export async function getPosts(all = false): Promise<PostListItem[]> {
  const url = all ? "/api/posts?all=1" : "/api/posts";
  const res = await fetch(url, { credentials: "same-origin" });
  if (!res.ok) return [];
  return res.json() as Promise<PostListItem[]>;
}

export async function getPost(slug: string): Promise<Post | null> {
  const res = await fetch(`/api/posts/${encodeURIComponent(slug)}`, {
    credentials: "same-origin",
  });
  if (!res.ok) return null;
  return res.json() as Promise<Post>;
}

export async function createPost(data: {
  title: string;
  slug: string;
  excerpt?: string;
  contentHtml: string;
  contentJson: string;
  status: string;
  dateLabel?: string;
}): Promise<{ id: number; slug: string }> {
  const res = await fetch("/api/posts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "same-origin",
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to create post");
  return res.json() as Promise<{ id: number; slug: string }>;
}

export async function updatePost(
  id: number,
  data: {
    title?: string;
    slug?: string;
    excerpt?: string;
    contentHtml?: string;
    contentJson?: string;
    status?: string;
    dateLabel?: string;
  }
): Promise<{ id: number; slug: string }> {
  const res = await fetch(`/api/posts/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    credentials: "same-origin",
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to update post");
  return res.json() as Promise<{ id: number; slug: string }>;
}

export async function deletePost(id: number): Promise<void> {
  const res = await fetch(`/api/posts/${id}`, {
    method: "DELETE",
    credentials: "same-origin",
  });
  if (!res.ok) throw new Error("Failed to delete post");
}