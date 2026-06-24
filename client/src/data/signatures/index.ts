export type Signature = {
  id: string;
  login: string;
  avatarUrl: string | null;
  message: string;
  createdAt: number;
};

export type User = {
  id: number;
  login: string;
  avatar_url: string;
};

export async function getSignatures(): Promise<Signature[]> {
  const res = await fetch("/api/signatures", { credentials: "same-origin" });
  if (!res.ok) return [];
  return res.json() as Promise<Signature[]>;
}

export async function postSignature(message: string): Promise<Signature> {
  const res = await fetch("/api/signatures", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "same-origin",
    body: JSON.stringify({ message }),
  });
  if (!res.ok) throw new Error("Failed to post signature");
  return res.json() as Promise<Signature>;
}

export async function deleteSignature(id: string): Promise<void> {
  const res = await fetch(`/api/signatures/${id}`, {
    method: "DELETE",
    credentials: "same-origin",
  });
  if (!res.ok) throw new Error("Failed to delete signature");
}

export type MeResponse = {
  user: User | null;
  isAdmin: boolean;
};

export async function getMe(): Promise<MeResponse> {
  const res = await fetch("/api/me", { credentials: "same-origin" });
  if (!res.ok) return { user: null, isAdmin: false };
  return res.json() as Promise<MeResponse>;
}

export function avatarFor(u: string): string {
  const s = (u || "?").toString();
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  const hue = h % 360;
  const ch = s.replace(/[^a-z0-9]/gi, "").charAt(0).toUpperCase() || "?";
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='64' height='64'><rect width='64' height='64' rx='32' fill='hsl(${hue},42%,32%)'/><text x='32' y='42' font-family='monospace' font-size='28' fill='hsl(${hue},55%,82%)' text-anchor='middle'>${ch}</text></svg>`;
  return "data:image/svg+xml;utf8," + encodeURIComponent(svg);
}

export function ago(ts: number): string {
  const d = (Date.now() - ts) / 1000;
  if (d < 60) return "just now";
  if (d < 3600) return Math.floor(d / 60) + "m ago";
  if (d < 86400) return Math.floor(d / 3600) + "h ago";
  return Math.floor(d / 86400) + "d ago";
}