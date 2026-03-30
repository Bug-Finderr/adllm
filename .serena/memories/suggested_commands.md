# Suggested Commands

## Development
- `bun dev` — Start Next.js + Convex dev servers (via mprocs)
- `bun run dev:frontend` — Next.js only (with --turbopack)
- `bun run dev:convex` — Convex only

## Deployment
- `bun run build` — Next.js production build
- `bunx convex deploy` — Deploy Convex functions
- `bunx convex run ads:seed` — Seed default ads

## Linting
- `bun run lint` — Biome check + autofix

## Important
- Always use `bun` / `bunx`, never npm/npx/pnpm/yarn
- Per CLAUDE.md: Never run tests, build, lint, or compile commands directly
- Use serena MCP tools for type checking and diagnostics instead
