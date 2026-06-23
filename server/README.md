# Portfolio API

Express backend for the portfolio app. See the [root README](../README.md) for full setup, deployment, and environment variables.

## Quick start

```bash
cp .env.example .env
# Fill in SESSION_SECRET, GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET, ADMIN_LOGIN

npm install
npm run dev
```

Runs on port 8080 (override with `PORT` in `.env`).

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Watch mode with tsx |
| `npm run build` | Compile to `dist/` |
| `npm run start` | Run compiled server |
| `npm run typecheck` | TypeScript check |

## Routes

| Path | Description |
|------|-------------|
| `GET /api/signatures` | List guestbook signatures |
| `POST /api/signatures` | Create signature (auth required) |
| `DELETE /api/signatures/:id` | Delete signature (author or admin) |
| `GET /api/posts` | List posts (`?all=1` includes drafts for admin) |
| `GET /api/posts/:slug` | Get post by slug |
| `POST/PUT/DELETE /api/posts` | Admin CRUD |
| `GET /api/projects` | List projects |
| `POST/PUT/DELETE /api/projects` | Admin CRUD |
| `GET /api/me` | Current session user + `isAdmin` |
| `GET /api/portfolio/routes` | Client-side route map |
| `GET /auth/github` | Start GitHub OAuth |
| `GET /auth/github/callback` | OAuth callback |
| `POST /auth/logout` | End session |