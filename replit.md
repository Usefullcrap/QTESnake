# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.

## Artifacts

- `snake-game` (`/`) — Classic Snake game. Single-page UI: title, stats, board, caption, inline auth panel, and leaderboard all on one screen — no sub-routes.
  - 10 points per apple.
  - Input queue (max 2 buffered moves), validated against the LAST queued direction (not the current direction) to prevent the classic two-key-in-one-tick instant-death bug.
  - Quick Time Events every 50 score (level 1 = 4 A/D presses in 4s; +1 press and +0.25s per level; -0.5s per mistake; expiry = game over).
  - Each cleared QTE shrinks the snake's tick interval by 5% (snake gets faster).
  - Escape key opens a pause menu (Resume / Reset). Pausing freezes both the snake loop and the QTE timer.
  - Authentication is in-house: a tiny inline form on the game page toggles between Log in and Sign up, posting `{username, password}` to our own API. Username 3–32 chars `[A-Za-z0-9_]`, password ≥ 6 chars. No email, no popups, no email verification.
  - Top-10 leaderboard panel sits tight against the right side of the play area, reading from `/api/leaderboard` (best score per user).
  - Signed-in players' final scores are POSTed to `/api/scores` on game-over.
- `api-server` — Express 5 API.
  - Cookie-based session auth (cookie name `snake_sid`, HttpOnly, SameSite=lax, 30-day TTL). `cookie-parser` then `loadSession` middleware populate `req.user` from the `sessions` table.
  - Routes: `/healthz`, `POST /auth/signup`, `POST /auth/login`, `POST /auth/logout`, `GET /auth/me`, `POST /scores` (gated by `requireUser`), `GET /leaderboard`.
  - Passwords hashed with `bcryptjs`. Session tokens are 32 random bytes, base64url.

## Database

- `users` — `{ id (serial PK), username (unique), passwordHash, createdAt }`.
- `sessions` — `{ token (PK), userId, createdAt, expiresAt }`, indexed by `userId`.
- `scores` — `{ id, userId (FK → users.id, ON DELETE CASCADE), score, createdAt }`. Indexed by score desc. Leaderboard reads `MAX(score) GROUP BY userId` joined to `users` for the username.
