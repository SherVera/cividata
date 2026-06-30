# AGENTS.md

Guidance for AI coding agents working in this repository.

## Project Context

- **Cividata** (`kids-alive` on npm): React + Vite + TypeScript app for pediatric census and clinical history.
- Primary UI: `src/` → Vercel publishes `dist/`.
- `web/` and `local/` are legacy; not deployed.
- Backend: Supabase (Auth, PostgreSQL, RLS, Storage). Serverless APIs in `api/`.

## Terminology (UI copy in Spanish)

| Concept | UI label | Implementation |
|---------|----------|----------------|
| Patient census / intake | **Captura** | `patients`, `QuickPatientRegister`, `PatientForm` |
| Clinical urgency per visit | **Triaje clínico** | `care_episodes`, `care_triage`, `ClinicalTriagePanel` |
| Follow-up notes | Evolución / consultas | `clinical_notes`, `PatientDetails` |

Use constants from `src/brand.ts` (`CAPTURE_*`, `CLINICAL_TRIAGE_LABEL`). Do not use «triaje» for census capture in new UI text.

**Permissions:** `canManageClinicalData()` in `src/lib/authRoles.ts` — personal médico, admin, super admin only. Registradores (`registrador`) capture patients but cannot do clinical triage or add clinical notes.

## Repository Layout

```
src/                          # React app
  brand.ts                    # App name, capture vs clinical labels
  types.ts                    # Paciente, NotaClinica, CensoStats
  care-pathway/               # care_pathway API + types
  components/                 # UI (ClinicalTriagePanel, GlobalSupplyLedger, …)
api/                          # Vercel serverless (users, contact, …)
supabase/
  migrations/                 # Canonical SQL (timestamped)
  config.toml                 # Supabase CLI
  schema.sql                  # Pointer only — do not add DDL here
scripts/
  new-sql-migration.sh        # npm run db:migration:new
  supabase-repair-baseline.sh   # npm run db:repair-baseline
.github/workflows/            # Supabase migration CI
```

## Working Rules

- Keep visible copy in Spanish; public app name is **Cividata**.
- Preserve patient data integrity and local persistence behavior.
- Reuse models from `src/types.ts`; do not duplicate patient interfaces.
- Prefer existing patterns: React hooks, Tailwind, `lucide-react`, `motion/react`.
- Do not overwrite user changes or revert unrelated work.
- Avoid broad refactors unless explicitly requested.

## Validation

- `npm run lint` after TypeScript/React changes.
- `npm run test` after validation, types, or parsing helper changes.
- `npm run build` after frontend, dependency, config, or deploy changes.
- Fix errors you introduce before handing work back.

## Safety

- Do not add real patient data, backups, `.env` files, or secrets.
- Careful with storage keys: `censo_pacientes_v1`, `censo_admin_password_v1`, `censo_is_authenticated`.
- Do not commit `supabase/.temp/` or `.supabase/` (gitignored).

## SQL migrations (Supabase)

**All new DDL goes in `supabase/migrations/`** — one change per timestamped file. Do not edit `schema.sql` for deltas.

### Baseline migration order

| File | Purpose |
|------|---------|
| `20250101000000_bootstrap_schema.sql` | Full schema (patients, centers, supply, RLS, storage, …) |
| `20250301000000_migration_tracker.sql` | `public.schema_migrations` audit table |
| `20250301000001_record_legacy_baseline.sql` | Historical notes only (inserts) |
| `20250301000002_care_pathway.sql` | Clinical episodes, triage, diagnoses, treatments |

Legacy reference files (do not edit for new changes): `care_pathway.sql`, `supply_requests.sql`, `care_pathway_backfill.sql`.

### Commands

```bash
npm run db:migration:new -- short_name    # create new migration from _template.sql
npm run db:repair-baseline                # mark baseline applied on existing DB
npx supabase db push                      # apply pending to linked remote
npx supabase db start                       # local Postgres + all migrations (Docker)
npx supabase migration list                 # CLI-applied migrations
```

### Create a new migration

1. `npm run db:migration:new -- add_foo_column`
2. Edit the generated file: idempotent DDL (`IF NOT EXISTS`), wrap in `do $$ … if already in schema_migrations then return`.
3. Register in `public.schema_migrations` at the end (for SQL Editor users).
4. PR → merge **`dev`** → GitHub applies to **Supabase dev** (`supabase-migrations-dev.yml`).
5. Test against dev DB / app pointed at dev (local `.env` or manual).
6. PR **`dev` → `main`** → guard requires source branch `dev` for SQL changes → merge applies to **Supabase prod**.

**Never merge SQL to `main` except from `dev`.** Vercel deploys frontend only from `main` (prod Supabase keys).

### Existing database (one-time per project)

Run **`npm run db:repair-baseline` once per Supabase project** (dev and prod separately). The script reads migration files from `supabase/migrations/` and the linked project from `supabase link` (no hardcoded refs):

```bash
npx supabase link --project-ref <dev-ref> --password "$SUPABASE_DB_PASSWORD"
npm run db:repair-baseline

npx supabase link --project-ref <prod-ref> --password "$SUPABASE_DB_PASSWORD"
npm run db:repair-baseline
```

### GitHub Actions secrets

| Secret | Dónde | Source |
|--------|-------|--------|
| `SUPABASE_ACCESS_TOKEN` | Repo | supabase.com/dashboard/account/tokens (shared) |
| `SUPABASE_PROJECT_ID` | Environment **dev** / **prod** | Project ref de ese entorno |
| `SUPABASE_DB_PASSWORD` | Environment **dev** / **prod** | Database password (no anon/service) |

Workflows:

| File | Trigger | Target |
|------|---------|--------|
| `supabase-migrations-dev.yml` | push `dev` | Supabase **dev** |
| `supabase-migrations.yml` | push `main` | Supabase **prod** |
| `supabase-migrations-pr-guard.yml` | PR → `main` + SQL | Requires head branch `dev` |
| `supabase-migrations-check.yml` | PR | `db start` + `db lint` |

**Branch protection on `main` (GitHub UI):** require PR, block direct push, require status checks `Supabase migrations (PR guard)` and `Supabase migrations (check)` when changing SQL.

### Check what is applied

```sql
-- Manual tracker
select version, name, applied_at from public.schema_migrations order by version;
```

```bash
# CLI tracker
npx supabase migration list
```
