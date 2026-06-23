export function resolveClientOrigin(): string {
  if (process.env.CLIENT_ORIGIN) {
    return process.env.CLIENT_ORIGIN.replace(/\/$/, "");
  }
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  return "http://localhost:5173";
}

export function resolveGithubCallbackUrl(): string {
  if (process.env.GITHUB_CALLBACK_URL) {
    return process.env.GITHUB_CALLBACK_URL;
  }
  return `${resolveClientOrigin()}/auth/github/callback`;
}

export function isProduction(): boolean {
  return process.env.NODE_ENV === "production" || Boolean(process.env.VERCEL);
}

export function getAdminLogin(): string {
  return process.env.ADMIN_LOGIN?.trim() || "admin";
}

export function isAdminLogin(login: string | undefined | null): boolean {
  return Boolean(login && login === getAdminLogin());
}