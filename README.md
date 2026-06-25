# Portfolio

Personal portfolio site with a static frontend, a Swift (Vapor) API, admin dashboard, blog, guestbook, and GitHub OAuth. The frontend is a Vite SPA; the backend is a layered Vapor + Fluent service backed by MongoDB.

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
| API | Vapor 4, Fluent, Swift |
| Database | MongoDB (Fluent Mongo driver) |
| Auth | GitHub OAuth, Fluent-backed sessions |
| Runtime | Docker + docker-compose (Vapor + MongoDB) |

## Architecture

The API follows a layered structure:

```
Controller → Service → Repository → Model → MongoDB
```

| Layer | Responsibility | Location |
|-------|----------------|----------|
| Controllers | HTTP routing, request decoding, response encoding | `server/Sources/App/Controllers` |
| Services | Business logic and validation | `server/Sources/App/Services` |
| Repositories | Data access via Fluent | `server/Sources/App/Repositories` |
| Models | Fluent models mapped to MongoDB collections | `server/Sources/App/Models` |

## Project structure

```
portfolio/
├── client/                 # Vite SPA (Web Components)
├── server/                 # Vapor API (Swift)
│   ├── Sources/App/        # Controllers, Services, Repositories, Models, Migrations
│   ├── Package.swift
│   └── Dockerfile
├── docker-compose.yml      # Vapor API + MongoDB
└── package.json
```

## Local development

Docker (with Compose) for the API and database, plus Node.js 20+ and npm for the client.

```bash
git clone https://github.com/joordih/portfolio.git
cd portfolio
npm run install:all
```

### 1. Environment

Copy `server/.env.example` to `server/.env` and fill in the GitHub OAuth values. For docker-compose you can instead export the same variables in your shell (they are read by `docker-compose.yml`).

| Variable | Required locally | Description |
|----------|------------------|-------------|
| `SESSION_SECRET` | yes | Random string for session cookies |
| `GITHUB_CLIENT_ID` | yes | GitHub OAuth App client ID |
| `GITHUB_CLIENT_SECRET` | yes | GitHub OAuth App client secret |
| `ADMIN_LOGIN` | yes | GitHub username allowed to use the dashboard |
| `CLIENT_ORIGIN` | no | Default `http://localhost:5173` |
| `GITHUB_CALLBACK_URL` | no | Default `{CLIENT_ORIGIN}/auth/github/callback` |
| `GITHUB_USERNAME` | no | GitHub login used for `/activity` stats (defaults to `ADMIN_LOGIN`) |
| `GITHUB_STATS_TOKEN` | no | Optional PAT for activity stats in production |
| `MONGO_URL` | no | Default `mongodb://localhost:27017/portfolio` (compose sets `mongodb://mongo:27017/portfolio`) |

Create a [GitHub OAuth App](https://github.com/settings/developers) with scopes `read:user` and `repo` (admin token storage for repository import and activity):

- Homepage URL: `http://localhost:5173`
- Callback URL: `http://localhost:5173/auth/github/callback`

### 2. Run

Two terminals:

```bash
npm run dev:api      # MongoDB + Vapor API on :8080 (docker compose)
npm run dev:client   # Vite on :5173 (proxies /api and /auth to :8080)
```

The Vite dev server proxies `/api` and `/auth` to the API, so the SPA and API share an origin during development. On first start, MongoDB collections are created and seeded if empty.

To run only the database (and run the API yourself with a local Swift toolchain via `swift run` inside `server/`), use `npm run dev:db`.

## Deploy

The Vapor app runs as a long-lived container. Build the image from `server/Dockerfile` and run it on any container host (Fly.io, Railway, Render, a VPS, etc.).

| Variable | Required | Notes |
|----------|----------|-------|
| `SESSION_SECRET` | yes | Long random string |
| `GITHUB_CLIENT_ID` | yes | From your GitHub OAuth app |
| `GITHUB_CLIENT_SECRET` | yes | From your GitHub OAuth app |
| `ADMIN_LOGIN` | yes | Your GitHub username |
| `MONGO_URL` | yes | e.g. a [MongoDB Atlas](https://www.mongodb.com/atlas) `mongodb+srv://...` connection string |
| `CLIENT_ORIGIN` | yes | Public origin of the SPA |
| `GITHUB_CALLBACK_URL` | no | Defaults to `{CLIENT_ORIGIN}/auth/github/callback` |
| `GITHUB_USERNAME` | no | Public GitHub login for activity page |
| `GITHUB_STATS_TOKEN` | no | Optional PAT if admin OAuth token is unavailable |
| `NODE_ENV` | no | Set to `production` behind HTTPS so session cookies are marked `Secure` |

Update the GitHub OAuth app for production:

- Homepage URL: `https://your-domain`
- Callback URL: `https://your-domain/auth/github/callback`

Serve the built SPA (`npm run build:client`, output in `client/dist`) and proxy `/api` and `/auth` to the Vapor container so the SPA and API share one origin.

## Customization

| What | Where |
|------|-------|
| Branding and copy | `client/src/components/home/`, `client/index.html` |
| Header and footer | `client/src/components/chrome/` |
| Admin user | `ADMIN_LOGIN` env var (your GitHub username) |
| Theme | CSS variables in `client/src/assets/root.css` |
| Seed data | `server/Sources/App/Migrations/SeedData.swift` |

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev:api` | MongoDB + Vapor API via docker compose (port 8080) |
| `npm run dev:db` | MongoDB only via docker compose (port 27017) |
| `npm run dev:client` | Vite dev server (port 5173) |
| `npm run build:client` | Build the client SPA |
| `npm run typecheck` | TypeScript check (client) |

API tests (pure business logic) run from `server/` with `swift test`.

## License

MIT. See [LICENSE](LICENSE).
