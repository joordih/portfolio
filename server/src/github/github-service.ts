import { mapGitHubRepo, type GitHubRepo, type GitHubRepoDetail } from "./types.js";

const USER_AGENT = "portfolio-app";

async function githubFetch<T>(url: string, accessToken: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${accessToken}`,
      "User-Agent": USER_AGENT,
      ...(init?.headers ?? {}),
    },
  });

  if (response.status === 401) {
    throw Object.assign(new Error("GitHub token expired or revoked"), { status: 401 });
  }
  if (!response.ok) {
    throw Object.assign(new Error(`GitHub API error: ${response.status}`), { status: response.status });
  }

  return response.json() as Promise<T>;
}

export async function listGitHubRepos(accessToken: string): Promise<GitHubRepo[]> {
  const all: GitHubRepo[] = [];

  for (let page = 1; page <= 10; page++) {
    const url = new URL("https://api.github.com/user/repos");
    url.searchParams.set("affiliation", "owner,collaborator,organization_member");
    url.searchParams.set("per_page", "100");
    url.searchParams.set("page", String(page));
    url.searchParams.set("sort", "updated");

    const repos = await githubFetch<
      Array<{
        id: number;
        full_name: string;
        name: string;
        owner: { login: string };
        html_url: string;
        description: string | null;
        private: boolean;
        default_branch?: string;
        pushed_at: string | null;
      }>
    >(url.toString(), accessToken);

    if (repos.length === 0) break;
    all.push(...repos.map(mapGitHubRepo));
    if (repos.length < 100) break;
  }

  return all.sort((a, b) => (b.pushedAt ?? "").localeCompare(a.pushedAt ?? ""));
}

export async function getGitHubRepoDetail(accessToken: string, fullName: string): Promise<GitHubRepoDetail> {
  const parts = fullName.split("/");
  if (parts.length !== 2) {
    throw Object.assign(new Error("Invalid repository name"), { status: 400 });
  }

  const [owner, repo] = parts;
  const repoData = await githubFetch<Parameters<typeof mapGitHubRepo>[0]>(
    `https://api.github.com/repos/${owner}/${repo}`,
    accessToken
  );

  let languages: string[] = [];
  try {
    const raw = await githubFetch<Record<string, number>>(
      `https://api.github.com/repos/${owner}/${repo}/languages`,
      accessToken
    );
    languages = Object.entries(raw)
      .sort((a, b) => b[1] - a[1])
      .map(([key]) => key);
  } catch {
    languages = [];
  }

  return { repo: mapGitHubRepo(repoData), languages };
}