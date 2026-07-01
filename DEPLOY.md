# Despliegue (Supabase + Vercel + GitHub)

## Arquitectura

```
┌─────────────────┐     anon key + RLS      ┌──────────────────┐
│  React (src/)   │ ◄──────────────────────►│  Supabase        │
│  Vercel → dist/ │                         │  Postgres + Auth │
└────────┬────────┘                         │  Storage         │
         │                                  └────────▲─────────┘
         │ service_role (solo servidor)              │
         ▼                                           │
┌─────────────────┐     supabase db push      ┌──────┴───────────┐
│  api/users.js   │                         │  GitHub Actions  │
│  api/contact.js │                         │  (migrations)    │
└─────────────────┘                         └──────────────────┘
```

- **Frontend:** `src/` → `npm run build` → `dist/` en Vercel.
- **Datos:** PostgreSQL en Supabase con RLS; esquema versionado en `supabase/migrations/`.
- **Usuarios:** Supabase Auth; roles en `app_metadata.role`.
- **Admin API:** `api/users.js` usa `SUPABASE_SERVICE_ROLE_KEY` (solo en Vercel).

Los directorios `web/` y `local/` son legado y no se despliegan.

---

## 1. Crear proyecto Supabase

https://supabase.com → crear proyecto (tier gratis disponible).

Anota:

- **Project URL** → `SUPABASE_URL` / `VITE_SUPABASE_URL`
- **anon key** → `SUPABASE_ANON_KEY` / `VITE_SUPABASE_ANON_KEY`
- **service_role key** → `SUPABASE_SERVICE_ROLE_KEY` (secreta)
- **Database password** → `SUPABASE_DB_PASSWORD` (para CLI y GitHub Actions)
- **Project ref** (ID en la URL) → `SUPABASE_PROJECT_ID`

---

## 2. Aplicar el esquema de base de datos

### Opción A — CLI (recomendado)

```bash
npx supabase login
npx supabase link --project-ref TU_PROJECT_ID
npx supabase db push
```

Aplica todas las migraciones en `supabase/migrations/` en orden.

### Opción B — SQL Editor (sin CLI)

Supabase → **SQL Editor** → ejecutar cada archivo de `supabase/migrations/` **en orden alfabético**:

1. `20250101000000_bootstrap_schema.sql`
2. `20250301000000_migration_tracker.sql`
3. `20250301000001_record_legacy_baseline.sql`
4. `20250301000002_care_pathway.sql`

### Si la base ya existía (SQL pegado antes)

No vuelvas a ejecutar el bootstrap completo. Marca las migraciones como aplicadas:

```bash
export SUPABASE_PROJECT_ID=TU_PROJECT_ID
export SUPABASE_DB_PASSWORD='tu-password'
npm run db:repair-baseline
```

Verifica: `npx supabase migration list` (todas las baseline en `applied`).

### Scripts opcionales (una sola vez)

- `supabase/care_pathway_backfill.sql` — importar datos legacy al modelo `care_pathway` (solo si aplica).

---

## 3. Entornos dev + prod (base de datos)

Dos proyectos Supabase; **Vercel solo despliega frontend en `main`** (prod). La rama `dev` no genera preview en Vercel (plan free).

```
feature branch
      │
      ▼ merge
    dev ──push──► GitHub ──db push──► Supabase DEV   (datos copia de prod)
      │
      ▼ PR dev → main (guard si hay .sql)
    main ──push──► GitHub ──db push──► Supabase PROD
      │
      └──► Vercel Production (solo keys de prod)
```

### Secrets en GitHub (Actions)

| Secret | Dónde | Uso |
|--------|-------|-----|
| `SUPABASE_ACCESS_TOKEN` | Repo (Actions secrets) | Token de cuenta (compartido) |
| `SUPABASE_DEV_PROJECT_ID` | Environment **dev** o repo | Ref del proyecto dev |
| `SUPABASE_DEV_DB_PASSWORD` | Environment **dev** o repo | Password **Database** de dev |
| `SUPABASE_PROD_PROJECT_ID` | Environment **prod** o repo | Ref del proyecto prod |
| `SUPABASE_PROD_DB_PASSWORD` | Environment **prod** o repo | Password **Database** de prod |

Los workflows usan `environment: dev` / `environment: prod`. Los nombres del secret deben coincidir **exactamente** (p. ej. `SUPABASE_DEV_PROJECT_ID`, no `SUPABASE_PROJECT_ID`). El nombre del environment en GitHub debe ser `dev` y `prod` (minúsculas), o edita el workflow.

**Importante:** es la contraseña de **Database** (usuario `postgres`), **no** la anon key ni la service_role key. Se obtiene o resetea en Supabase → **Project Settings → Database → Database password**.

Si el workflow falla con `password authentication failed (28P01)`:

1. En Supabase del proyecto que falla (dev o prod) → **Reset database password** → copia la nueva.
2. Actualiza el secret correspondiente (`SUPABASE_DEV_DB_PASSWORD` o `SUPABASE_PROD_DB_PASSWORD`).
3. Verifica que `SUPABASE_DEV_PROJECT_ID` / `SUPABASE_PROD_PROJECT_ID` sea el **ref** del mismo proyecto Supabase.
4. Si la contraseña tiene caracteres raros (`@`, `#`, `$`), prueba resetear a una alfanumérica larga.
5. Supabase → **Database → Network Bans**: quita IPs bloqueadas por intentos fallidos.
6. Re-ejecuta el workflow (**Actions → Run workflow**).

Prueba local antes de GitHub:

```bash
export SUPABASE_ACCESS_TOKEN='...'
export SUPABASE_DB_PASSWORD='...'
npx supabase link --project-ref TU_REF --password "$SUPABASE_DB_PASSWORD"
npx supabase migration list
```

### Repair baseline (una vez por proyecto)

Si cada Supabase ya tenía el esquema aplicado a mano, enlaza y ejecuta (detecta migraciones y proyecto automáticamente):

```bash
npx supabase link --project-ref <ref-dev> --password "$SUPABASE_DB_PASSWORD"
npm run db:repair-baseline

npx supabase link --project-ref <ref-prod> --password "$SUPABASE_DB_PASSWORD"
npm run db:repair-baseline
```

Opcional: `export SUPABASE_PROJECT_ID=...` si no usas `supabase link` antes.

**Fallback SQL Editor** (si el CLI no conecta o `schema_migrations` no existe):

```bash
npm run db:repair-baseline:sql
```

Copia el output en Supabase → **SQL Editor**. El script crea `supabase_migrations.schema_migrations` (tabla del CLI, distinta de `public.schema_migrations`) y marca las migraciones como applied. Verifica:

```sql
select version, name from supabase_migrations.schema_migrations order by version;
```

### Proteger `main` (GitHub → Settings → Branches → Branch protection)

Recomendado para `main`:

- Require a pull request before merging
- Do not allow bypassing
- Require status checks: **Supabase migrations (PR guard)** (cuando hay SQL)
- Optional: require approval from someone else on PRs that touch `supabase/migrations/**`

El workflow `supabase-migrations-pr-guard.yml` **falla** si un PR a `main` con cambios SQL no viene de la rama `dev`.

### Flujo de un cambio SQL

```bash
npm run db:migration:new -- mi_cambio
git checkout dev && git add supabase/migrations/ && git commit && git push
# → se aplica en Supabase dev; probar app contra dev (.env local)
git checkout dev && git pull
# Abrir PR dev → main en GitHub → merge
# → se aplica en Supabase prod
```

---

## 4. Automatizar migraciones (referencia)

En el repositorio de GitHub → **Settings → Secrets and variables → Actions** (ver tabla arriba).

Workflows en `.github/workflows/`:

- **`supabase-migrations-dev.yml`** — push a `dev`
- **`supabase-migrations.yml`** — push a `main` (prod)
- **`supabase-migrations-pr-guard.yml`** — PR a `main` con SQL solo desde `dev`
- **`supabase-migrations-check.yml`** — validación en PR

---

## 5. Proveedores de acceso (Auth)

- **Phone:** Authentication → Providers → Phone (útil si creas usuarios con contraseña + auto-confirm).
- Desactiva *Allow new users to sign up* en Email y Phone si no quieres registro público directo (la landing usa pre-registro).

---

## 6. Primer administrador

El panel admin crea usuarios, pero el **primer** admin es manual:

1. **Authentication → Users → Add user** → correo o teléfono + contraseña → *Auto Confirm*.
2. **SQL Editor:**

```sql
update auth.users
   set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || '{"role":"admin"}'
 where email = 'TU-CORREO-ADMIN';
-- o: where phone = '+584141234567';
```

3. Ese usuario entra al panel y crea al resto (personal médico, asistentes, más admins).

Roles válidos: `super_admin`, `admin`, `personal_medico`, `registrador`.

---

## 7. Variables de entorno en Vercel

Variables de **producción** únicamente (proyecto Supabase **prod**). No hay preview Vercel en `dev` (ver `vercel.json`).

```bash
npx vercel
vercel env add SUPABASE_URL
vercel env add SUPABASE_ANON_KEY
vercel env add SUPABASE_SERVICE_ROLE_KEY
vercel env add CONTACT_EMAIL
vercel env add SMTP_USER
vercel env add SMTP_PASS
vercel --prod
```

`vercel.json` define el build:

```bash
VITE_SITE_URL=... VITE_SUPABASE_URL=... VITE_SUPABASE_ANON_KEY=... npm run build
```

Salida: `dist/`. Las rutas `/api/*` se detectan automáticamente.

---

## 8. Uso por rol

| Rol | Qué hace |
|-----|----------|
| **Asistente** | Captura pacientes, ve listado; sin triaje clínico ni notas de evolución. |
| **Personal médico** | Captura, triaje clínico, historial y tratamientos. |
| **Admin** | Todo el censo, usuarios, auditoría. |
| **Super admin** | Todo + centros de acopio e insumos globales. |

---

## Notas

- **Contraseñas:** Supabase Auth (bcrypt); no se guardan en claro en la app.
- **HTTPS:** Vercel lo provee; la geolocalización del navegador lo requiere.
- **Campos opcionales:** vacíos → `NULL` en Postgres.
- **Storage:** bucket `patient-photos` creado por la migración bootstrap.
- **Servidor local** (`npm start` → `local/server.js`, SQLite): solo respaldo offline; sin roles ni auditoría de Supabase.
