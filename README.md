# Portfolio

Personal portfolio site with a static frontend, Express API, admin dashboard, blog, guestbook, GitHub integration, and GitHub OAuth. Deploys as a single Vercel project: the Vite build serves the SPA and API routes run as one serverless function.

Demo: [joordih.vercel.app](https://joordih.vercel.app)

## Features

| Page | What it does |
|------|--------------|
| Home | Hero, about, projects (from the API), contact |
| Stack | Tools and technologies |
| Blog | Posts with slug URLs; Tiptap editor in the dashboard |
| Guestbook | GitHub-authenticated wall signatures |
| Activity | GitHub contribution heatmap, lifetime stats, top public repositories |
| Dashboard | Admin for signatures, posts, and projects (`ADMIN_LOGIN`) |

## Stack

| Layer | Tech |
|-------|------|
| Frontend | Vite, TypeScript, native Web Components |
| Editor | Tiptap 3 (StarterKit + Link) |
| API | Express 5, TypeScript |
| Database | MongoDB (Docker locally, [MongoDB Atlas](https://www.mongodb.com/atlas) on Vercel) |
| Auth | GitHub OAuth, cookie sessions |
| Hosting | Vercel (SPA + serverless API) |

## Project structure

```
portfolio/
├── api/index.ts          # Vercel serverless entry (imports compiled server)
├── client/               # Vite SPA (Web Components)
├── server/               # Express API source
├── docker-compose.yml    # Local MongoDB
├── scripts/
│   └── copy-api-lib.mjs  # Copies server/dist → api/_lib at build time
├── vercel.json
└── package.json          # Root deps for the serverless bundle
```

## Local development

Node.js 20+, npm, and Docker (for MongoDB).

```bash
git clone https://github.com/joordih/portfolio.git
cd portfolio
npm run install:all
```

### 1. Environment

Copy `server/.env.example` to `server/.env` and fill in:

```bash
cp server/.env.example server/.env
```

| Variable | Required locally | Description |
|----------|------------------|-------------|
| `SESSION_SECRET` | yes | Random string for session cookies |
| `GITHUB_CLIENT_ID` | yes | GitHub OAuth App client ID |
| `GITHUB_CLIENT_SECRET` | yes | GitHub OAuth App client secret |
| `ADMIN_LOGIN` | yes | GitHub username allowed to use the dashboard |
| `CLIENT_ORIGIN` | no | Default `http://localhost:5173` |
| `GITHUB_CALLBACK_URL` | no | Default `{CLIENT_ORIGIN}/auth/github/callback` |
| `GITHUB_USERNAME` | no | GitHub login for `/activity` stats (defaults to `ADMIN_LOGIN`) |
| `GITHUB_STATS_TOKEN` | no | Optional PAT for activity stats |
| `MONGO_URL` | no | Default `mongodb://localhost:27017/portfolio` |

Create a [GitHub OAuth App](https://github.com/settings/developers) with scopes `read:user` and `repo`:

- Homepage URL: `http://localhost:5173`
- Callback URL: `http://localhost:5173/auth/github/callback`

### 2. Run

```bash
npm run dev:db       # MongoDB on :27017
npm run dev:api      # API on :8080
npm run dev:client   # Vite on :5173 (proxies /api and /auth)
```

On first API start, collections are created and seeded if empty.

## Deploy to Vercel

1. Import the repository in [Vercel](https://vercel.com/new). Build settings come from `vercel.json`.
2. Set environment variables:

| Variable | Required | Notes |
|----------|----------|-------|
| `SESSION_SECRET` | yes | Long random string |
| `GITHUB_CLIENT_ID` | yes | From your GitHub OAuth app |
| `GITHUB_CLIENT_SECRET` | yes | From your GitHub OAuth app |
| `ADMIN_LOGIN` | yes | Your GitHub username |
| `MONGO_URL` | yes | MongoDB Atlas connection string |
| `GITHUB_USERNAME` | no | For `/activity` stats |
| `GITHUB_STATS_TOKEN` | no | Optional PAT for activity in production |
| `CLIENT_ORIGIN` | no | Auto-detected from `VERCEL_URL` if unset |
| `GITHUB_CALLBACK_URL` | no | Auto-detected if unset |

3. Update the GitHub OAuth app for production:

- Homepage URL: `https://your-domain.vercel.app`
- Callback URL: `https://your-domain.vercel.app/auth/github/callback`

### Database (MongoDB Atlas)

Vercel serverless functions cannot persist a local database file. Use [MongoDB Atlas](https://www.mongodb.com/atlas) (free tier):

1. Create a free cluster
2. Add a database user and allow network access (`0.0.0.0/0` or Vercel IPs)
3. Copy the connection string into `MONGO_URL`

Collections and indexes are created automatically on first request when the database is empty.

## Customization

Fork the repo and adjust:

| What | Where |
|------|-------|
| Branding and copy | `client/src/components/home/`, `client/index.html` |
| Header and footer | `client/src/components/chrome/` |
| Admin user | `ADMIN_LOGIN` env var (your GitHub username) |
| Theme | CSS variables in `client/src/assets/root.css` |
| Seed data | `server/src/db.ts` (`seedIfEmpty`); production data lives in Atlas |

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev:db` | Start MongoDB via Docker Compose |
| `npm run dev:api` | API watch mode (port 8080) |
| `npm run dev:client` | Vite dev server (port 5173) |
| `npm run build` | Build server + copy to `api/_lib` + build client |
| `npm run typecheck` | TypeScript check (server + client) |

## License

MIT. See [LICENSE](LICENSE).