# CLAUDE.md

Instructions for Claude when working in this repository.

## Start Here

- Read `AGENTS.md` first and follow its repository-wide guidance.
- Treat `src/` as the source of truth for the active app.
- The app is React + Vite + TypeScript and deploys to Vercel from `dist`.

## Development Style

- Preserve the original React/Tailwind visual style.
- Keep UI text in Spanish.
- Use the existing component structure before creating new abstractions.
- Reuse `Paciente`, `NotaClinica`, and `CensoStats` from `src/types.ts`.
- Add comments only when they explain non-obvious decisions.

## Commands

```bash
npm run dev
npm run lint
npm run build
```

## Safety

- Never discard user edits unless explicitly asked.
- Do not run destructive git commands without clear user approval.
- Do not commit, push, or create pull requests unless requested.
- Do not add real patient data, secrets, `.env` files, or clinical backups.

## Handoff

- Summarize changes briefly.
- Include validation performed, or explain why validation was not run.
- Note any uncertainty that affects the next step.
