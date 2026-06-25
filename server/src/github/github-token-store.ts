import { findGitHubConnectionByLogin, upsertGitHubConnection } from "../db.js";
import { getAdminLogin } from "../config.js";
import { decryptToken, encryptToken } from "./token-crypto.js";

function sessionSecret(): string {
  const secret = process.env.SESSION_SECRET?.trim();
  if (!secret) {
    throw new Error("SESSION_SECRET is not configured");
  }
  return secret;
}

export async function saveGitHubToken(
  login: string,
  githubId: number,
  accessToken: string,
  scopes: string | null | undefined
): Promise<void> {
  const encrypted = encryptToken(accessToken, sessionSecret());
  await upsertGitHubConnection({
    githubId,
    login,
    accessTokenEncrypted: encrypted,
    scopes: scopes ?? "read:user repo",
    updatedAt: Date.now(),
  });
}

export async function loadGitHubToken(login: string): Promise<string | null> {
  const connection = await findGitHubConnectionByLogin(login);
  if (!connection) return null;
  try {
    return decryptToken(connection.access_token_encrypted, sessionSecret());
  } catch {
    return null;
  }
}

export async function resolveStatsToken(): Promise<string | null> {
  const pat = process.env.GITHUB_STATS_TOKEN?.trim();
  if (pat) return pat;
  return loadGitHubToken(getAdminLogin());
}