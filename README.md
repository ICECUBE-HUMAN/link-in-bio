## Sinabro Workspace

Monorepo layout:

- `apps/frontend` - TanStack Start frontend worker
- `apps/backend` - Hono backend worker
- `packages/api` - Shared API contract package

Common commands:

- `bun install`
- `bun run dev`
- `bun run check`
- `bun run deploy:frontend`
- `bun run deploy:backend`

When deploying the profile-image crop change, run
`bun run --filter @grabbin/backend db:migrate` before
`bun run deploy:backend`.
