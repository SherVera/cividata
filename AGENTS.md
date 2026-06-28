# AGENTS.md

Guidance for AI coding agents working in this repository.

## Project Context

- This is a React + Vite + TypeScript app for a pediatric census and clinical history system.
- The primary UI lives in `src/`; preserve the original React/Tailwind look and behavior.
- Vercel builds with `npm run build` and publishes `dist`.
- Older static files may exist under `web/`, but they are not the deployed frontend.

## Working Rules

- Keep visible copy in Spanish.
- Preserve patient data integrity and local persistence behavior.
- Reuse shared models from `src/types.ts` instead of duplicating patient interfaces.
- Prefer existing dependencies and patterns: React hooks, Tailwind classes, `lucide-react`, and `motion/react`.
- Do not overwrite user changes or revert unrelated work.
- Avoid broad refactors unless explicitly requested.

## Validation

- Run `npm run lint` after TypeScript/React changes.
- Run `npm run build` after frontend, dependency, config, or deploy changes.
- Fix errors introduced by your own changes before handing work back.

## Safety

- Do not add real patient data, backups, `.env` files, or secrets.
- Be careful with storage keys such as `censo_pacientes_v1`, `censo_admin_password_v1`, and `censo_is_authenticated`.
