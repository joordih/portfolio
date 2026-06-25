import { Request, Response, NextFunction } from "express";
import { getAdminLogin, isAdminLogin } from "../../config.js";
import { findGitHubConnectionByLogin } from "../../db.js";
import { requireAdmin } from "../../auth.js";
import { loadGitHubToken, resolveStatsToken } from "../../github/github-token-store.js";
import { listGitHubRepos, getGitHubRepoDetail } from "../../github/github-service.js";
import {
  getActivity,
  getActivityYears,
  resolveActivityYears,
} from "../../github/github-stats-service.js";
import { setActivityYearsSetting } from "../../db.js";
import { importGitHubProjects } from "../../github/github-project-import-service.js";
import type { GitHubImportItem } from "../../github/types.js";

async function makeGitHubServiceToken(req: Request): Promise<string> {
  const login = getAdminLogin();
  const token = await loadGitHubToken(login);
  if (!token) {
    throw Object.assign(new Error("GitHub not connected. Re-authenticate from the dashboard."), { status: 401 });
  }
  return token;
}

export default class GitHubController {
  status = [
    requireAdmin,
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      try {
        const login = getAdminLogin();
        const connection = await findGitHubConnectionByLogin(login);
        const token = await loadGitHubToken(login);
        res.json({
          connected: token != null,
          login: connection?.login ?? login,
          scopes: connection?.scopes ?? null,
          needsReauth: connection != null && token == null,
        });
      } catch (error) {
        next(error);
      }
    },
  ];

  listRepos = [
    requireAdmin,
    async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
      try {
        const token = await makeGitHubServiceToken(_req);
        const repos = await listGitHubRepos(token);
        res.json(repos);
      } catch (error) {
        const status = (error as { status?: number }).status;
        if (status) {
          res.status(status).json({ error: (error as Error).message });
          return;
        }
        next(error);
      }
    },
  ];

  repoDetail = [
    requireAdmin,
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      try {
        const fullName = String(req.query.fullName ?? "").trim();
        if (!fullName) {
          res.status(400).json({ error: "fullName is required" });
          return;
        }
        const token = await makeGitHubServiceToken(req);
        const detail = await getGitHubRepoDetail(token, fullName);
        res.json(detail);
      } catch (error) {
        const status = (error as { status?: number }).status ?? 400;
        res.status(status).json({ error: (error as Error).message });
      }
    },
  ];

  importProjects = [
    requireAdmin,
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      try {
        const items = (req.body?.items ?? []) as GitHubImportItem[];
        const token = await makeGitHubServiceToken(req);
        const result = await importGitHubProjects(token, items);
        res.json(result);
      } catch (error) {
        const status = (error as { status?: number }).status ?? 400;
        res.status(status).json({ error: (error as Error).message });
      }
    },
  ];

  activityYears = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const token = await resolveStatsToken();
      if (!token) {
        res.status(400).json({ error: "GitHub activity is not configured" });
        return;
      }
      const payload = await getActivityYears(token);
      res.json(payload);
    } catch (error) {
      next(error);
    }
  };

  activityYearsConfig = [
    requireAdmin,
    async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
      try {
        const years = await resolveActivityYears();
        res.json({ years });
      } catch (error) {
        next(error);
      }
    },
  ];

  updateActivityYearsConfig = [
    requireAdmin,
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      try {
        const rawYears = req.body?.years;
        if (!Array.isArray(rawYears)) {
          res.status(400).json({ error: "years must be an array of integers" });
          return;
        }

        const years = rawYears.map((year) => Number(year)).filter((year) => Number.isInteger(year));
        if (years.length === 0) {
          res.status(400).json({ error: "At least one valid year is required" });
          return;
        }

        const currentYear = new Date().getFullYear();
        const invalid = years.find((year) => year < 2008 || year > currentYear);
        if (invalid !== undefined) {
          res.status(400).json({ error: `Year ${invalid} is out of range (2008–${currentYear})` });
          return;
        }

        const saved = await setActivityYearsSetting(years);
        res.json({ years: saved });
      } catch (error) {
        next(error);
      }
    },
  ];

  activity = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const token = await resolveStatsToken();
      if (!token) {
        res.status(400).json({ error: "GitHub activity is not configured" });
        return;
      }
      const year = Number(req.query.year) || new Date().getFullYear();
      const payload = await getActivity(token, year);
      res.json(payload);
    } catch (error) {
      const status = (error as { status?: number }).status ?? 400;
      res.status(status).json({ error: (error as Error).message });
    }
  };
}