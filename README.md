# Go Global — Education Abroad

A landing site for an education-abroad agency, with an admin panel for editing
content (countries, universities, testimonials, FAQs, contact info).

- **Frontend**: React 19 + Vite + Tailwind (CDN) + framer-motion
- **Backend**: Express 5 (Node 20)
- **Storage**: PostgreSQL in production, `store.json` fallback for local dev
- **Deploy target**: Railway (Nixpacks)

## Local development

```bash
npm install
npm run dev
```

Open http://localhost:3000 — admin at http://localhost:3000/admin
(default credentials `admin` / `admin123`).

## Production build

```bash
npm run build
npm start
```

## Environment variables

| Variable          | Purpose                                                    |
| ----------------- | ---------------------------------------------------------- |
| `PORT`            | HTTP port (Railway sets this automatically)                |
| `NODE_ENV`        | `production` enables static serving from `dist/`           |
| `DATABASE_URL`    | Postgres connection string. Empty → local file store.      |
| `ADMIN_USERNAME`  | Admin panel username (default `admin`)                     |
| `ADMIN_PASSWORD`  | Admin panel password (default `admin123` — **change!**)    |

## Deploying to Railway

1. Create a new project on Railway.
2. Add a **PostgreSQL** plugin — `DATABASE_URL` is injected automatically.
3. Connect this repository as a service.
4. Set `ADMIN_PASSWORD` (and optionally `ADMIN_USERNAME`) in service variables.
5. Generate a public domain in the service's Networking settings.

On the first start, the server creates the `site_data` table and seeds it from
`store.json`. The admin panel writes back to that single row.
