import { Router, Request, Response, NextFunction } from "express";
import crypto from "crypto";
import { isAdminLogin, resolveClientOrigin, resolveGithubCallbackUrl } from "./config.js";
import { saveGitHubToken } from "./github/github-token-store.js";

function safeNext(next: unknown): string {
  if (typeof next !== "string" || !next.startsWith("/") || next.startsWith("//") || next.includes("://")) {
    return "/guestbook";
  }
  return next;
}

function afterAuthRedirect(req: Request, res: Response): void {
  const next = safeNext(req.session?.oauthNext);
  delete req.session!.oauthNext;
  res.redirect(`${resolveClientOrigin()}${next}`);
}

function fallbackRedirect(res: Response): void {
  res.redirect(`${resolveClientOrigin()}/guestbook`);
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  if (!req.session?.user) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  next();
}

export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  if (!req.session?.user || !isAdminLogin(req.session.user.login)) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  next();
}

const router = Router();

router.get("/github", (req: Request, res: Response) => {
  const clientId = process.env.GITHUB_CLIENT_ID;
  const callbackUrl = resolveGithubCallbackUrl();
  if (!clientId) {
    res.status(500).json({ error: "GitHub OAuth not configured" });
    return;
  }
  const state = crypto.randomBytes(16).toString("hex");
  req.session!.oauthState = state;
  req.session!.oauthNext = safeNext(req.query.next);
  const params = new URLSearchParams({
    client_id: clientId,
    scope: "read:user repo",
    redirect_uri: callbackUrl,
    state,
  });
  res.redirect(`https://github.com/login/oauth/authorize?${params}`);
});

router.get("/github/callback", async (req: Request, res: Response) => {
  const { code, state } = req.query;
  if (!code || typeof code !== "string" || state !== req.session?.oauthState) {
    fallbackRedirect(res);
    return;
  }
  delete req.session!.oauthState;

  const clientId = process.env.GITHUB_CLIENT_ID;
  const clientSecret = process.env.GITHUB_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    fallbackRedirect(res);
    return;
  }

  try {
    const tokenRes = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ client_id: clientId, client_secret: clientSecret, code }),
    });
    const tokenData = (await tokenRes.json()) as { access_token?: string; scope?: string };
    if (!tokenData.access_token) {
      fallbackRedirect(res);
      return;
    }

    const userRes = await fetch("https://api.github.com/user", {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
        "User-Agent": "portfolio-app",
      },
    });
    const user = (await userRes.json()) as { id: number; login: string; avatar_url: string };
    req.session!.user = { id: user.id, login: user.login, avatar_url: user.avatar_url };

    if (isAdminLogin(user.login)) {
      await saveGitHubToken(user.login, user.id, tokenData.access_token, tokenData.scope);
    }

    afterAuthRedirect(req, res);
  } catch {
    fallbackRedirect(res);
  }
});

router.post("/logout", (req: Request, res: Response) => {
  req.session = null;
  res.status(204).end();
});

export default router;