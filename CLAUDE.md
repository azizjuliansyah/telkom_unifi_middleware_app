# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Unifi Captive Portal Middleware — Node.js + Express application that sits between Unifi Controller and WiFi users. Uses PostgreSQL for local user management with optional fallback to external Verify API. Admin panel (EJS + vanilla JS) for CRUD operations on local users.

## Running the Project

```bash
npm install              # Install dependencies
npm start                # Production mode
npm run dev              # Development mode with auto-restart
```

**Development mode** uses `concurrently` to run:
- Server with `--watch` flag (auto-restart on file changes)
- Tailwind CSS watcher for compiling `src/public/css/input.css` → `main.css`
- BrowserSync for live reload at `localhost:3000`

## Architecture

### Authentication Flow (Priority Order)

1. User connects to WiFi → Unifi redirects to `/guest/s/:siteId/?id=<MAC>`
2. User submits credentials → POST `/guest/s/:siteId/login`
3. **Local users checked first** (PostgreSQL `local_users` table, `is_active=TRUE` only)
4. If not found locally → **fallback to Verify API** (`VERIFY_API_URL` env var)
5. If either succeeds → **authorize to Unifi** via API (`UNIFI_URL` + `UNIFI_API_KEY`)
6. On Unifi auth success → redirect user to original URL or Google

### Database (`src/db/database.js`)

- Uses `pg` (node-postgres) with connection pooling
- **Auto-initializes** on first run: creates `local_users`, `admin_users`, `session` tables
- Seeds default admin if `admin_users` is empty (username: `admin`, password from `ADMIN_DEFAULT_PASSWORD`)
- Session store persists to PostgreSQL via `connect-pg-simple`

### Key Modules

| Path | Purpose |
|------|---------|
| `src/routes/auth.js` | Captive portal login flow, MAC address handling via cookies |
| `src/routes/admin.js` | Admin panel routes, protected by `requireAdminAuth` middleware |
| `src/services/localUser.js` | CRUD for `local_users` table, all functions async |
| `src/services/verifyUser.js` | External Verify API fallback (axios) |
| `src/services/unifi.js` | Unifi authorize-guest API call (self-signed cert allowed) |
| `src/middleware/adminAuth.js` | Session-based admin auth, redirects or returns 401 JSON |
| `src/middleware/logger.js` | Request logging with MAC address from query params |

### ESM Specifics

`"type": "module"` in package.json — use `import/export` always:
- Import local files **must include `.js` extension**: `import x from './foo.js'`
- `__dirname` not available — use `fileURLToPath(import.meta.url)` pattern
- dotenv: `import 'dotenv/config'` at top of entry file

### Views

- **EJS templates** in `src/views/`
- Partials in `src/views/partials/`
- **Tailwind CSS** for styling — edit `src/public/css/input.css`, compiled to `main.css`

### Environment Variables (`.env`)

Required for operation:
- `SESSION_SECRET` — session encryption key
- `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD` — PostgreSQL connection
- `UNIFI_URL` — Unifi Controller URL (e.g., `https://controller:44301`)
- `UNIFI_API_KEY` — Unifi API key for guest authorization

Optional:
- `VERIFY_API_URL` — external API for user verification fallback
- `ADMIN_DEFAULT_PASSWORD` — default admin password on first run (default: `admin123`)
- `FORGOT_PASSWORD_URL` — link on login page
