# CLAUDE.md

Instructions for Claude when working in this repository.

## Start Here

1. Read **`AGENTS.md`** first — project context, terminology, SQL migrations, validation rules.
2. Treat **`src/`** as the source of truth for the active app.
3. For deploy/Supabase setup, see **`DEPLOY.md`** and **`README.md`**.

## App Overview

- **Cividata**: React + Vite + TypeScript; deploys to Vercel from `dist/`.
- **Captura** = patient census intake; **Triaje clínico** = clinical visit assessment (`care_pathway`). Use `src/brand.ts` labels.
- **Registradores** capture patients only; clinical triage and notes require `canManageClinicalData()` roles.

## Development Style

- Preserve the original React/Tailwind visual style.
- Keep UI text in Spanish.
- Use existing component structure before new abstractions.
- Reuse `Paciente`, `NotaClinica`, and `CensoStats` from `src/types.ts`.
- Comments only for non-obvious decisions.

## Commands

```bash
npm run dev
npm run lint
npm run test      # when touching validation/types helpers
npm run build

# SQL (see AGENTS.md)
npm run db:migration:new -- name
npm run db:repair-baseline
```

## Database Changes

- **Never** add DDL only to `schema.sql` (it is a pointer file).
- Add timestamped files under `supabase/migrations/` via `npm run db:migration:new`.
- Migrations merge to `main` deploy automatically via GitHub Actions when secrets are set.

## Safety

- Never discard user edits unless explicitly asked.
- No destructive git without clear user approval.
- Do not commit, push, or open PRs unless requested.
- No real patient data, secrets, `.env` files, or clinical backups in the repo.

## Handoff

- Summarize changes briefly.
- State validation run (`lint`, `test`, `build`) or why skipped.
- Note uncertainty affecting the next step.
