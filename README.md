# Cividata

Aplicación web **Cividata** para **censo pediátrico comunitario** e **historia clínica**: captura de pacientes en campo, triaje clínico por visita, seguimiento médico, insumos por centro de acopio y estadísticas del censo. Pensada para equipos de brigada con acceso controlado por roles y uso intensivo en teléfonos.

La interfaz activa está en `src/` (React + Vite + TypeScript). Vercel publica `dist/`. Los archivos en `web/` y el servidor `local/` son legado y **no** forman parte del despliegue actual.

## ¿Para qué sirve?

| Módulo | Descripción |
|--------|-------------|
| **Captura en censo** | Alta rápida o completa del paciente (datos personales, salud, escolaridad, foto, geolocalización). |
| **Triaje clínico** | Evaluación de urgencia y motivo por visita (`care_pathway`); solo personal médico, admin o super admin. |
| **Historia clínica** | Notas de evolución (peso, estatura, diagnóstico, tratamiento) y registro clínico en el episodio activo. |
| **Centros de acopio** | Puntos de captura con mapa (Leaflet + OpenStreetMap), inventario de necesidades y recepciones. |
| **Tablero** | Métricas agregadas con enlaces a listados y módulos según el rol. |
| **Administración** | Gestión de usuarios, pre-registros y auditoría (`api/users` en Vercel). |
| **Respaldo** | Exportar e importar el censo en JSON. |

### Terminología en la UI

- **Captura** — registro inicial del paciente en brigada o centro (antes «triaje» en pantallas de censo).
- **Triaje clínico** — evaluación médica de la visita actual (tablas `care_episodes`, `care_triage`, etc.).

Constantes en `src/brand.ts`.

## Stack

| Capa | Tecnología |
|------|------------|
| Frontend | React 19, Vite 6, TypeScript, Tailwind CSS 4 |
| UI | `lucide-react`, `motion/react`, navegación inferior en móvil |
| Mapas | Leaflet, Nominatim (OpenStreetMap) |
| Backend / datos | [Supabase](https://supabase.com) (Auth, PostgreSQL, RLS, Storage) |
| API serverless | Vercel Functions (`api/users.js`, `api/contact.js`, …) |
| Migraciones DB | Supabase CLI + GitHub Actions (`supabase/migrations/`) |
| Deploy frontend | Vercel (`npm run build` → `dist`) |

## Roles

| Rol | Acceso |
|-----|--------|
| **Asistente** (`registrador`) | Captura pacientes, consulta listado; sin triaje clínico ni evolución médica. |
| **Personal médico** | Captura, triaje clínico, historial, tratamientos y sus registros. |
| **Admin** | Todo el censo, gestión de usuarios y auditoría. |
| **Super admin** | Todo lo anterior + panel de centros de acopio y gestión de admins. |

Los roles viven en `app_metadata.role` de Supabase Auth.

## Estructura del repositorio

```
src/                    # App React (fuente de verdad del frontend)
api/                    # Funciones serverless Vercel
supabase/
  migrations/           # Migraciones SQL (canónico; GitHub las aplica en main)
  config.toml           # Config Supabase CLI
  schema.sql            # Puntero legacy → ver bootstrap migration
  care_pathway.sql      # Referencia legacy (contenido en migrations/)
local/                  # Servidor SQLite offline (no producción)
web/                    # Frontend estático antiguo (no desplegado)
```

## Requisitos

- Node.js 22+
- Proyecto [Supabase](https://supabase.com) con migraciones aplicadas
- Para migraciones locales: [Supabase CLI](https://supabase.com/docs/guides/cli) y Docker (opcional, `supabase db start`)

## Configuración

Crea `.env` en la raíz con al menos:

| Variable | Uso |
|----------|-----|
| `VITE_SUPABASE_URL` | URL del proyecto (cliente React) |
| `VITE_SUPABASE_ANON_KEY` | Clave anónima (cliente React) |
| `VITE_CONTACT_EMAIL` | Correo visible en landing y formulario de contacto |
| `SUPABASE_URL` | Misma URL para `api/*` |
| `SUPABASE_SERVICE_ROLE_KEY` | Solo servidor; nunca en el frontend |
| `CONTACT_EMAIL` | Destino del formulario público |
| `SMTP_USER` / `SMTP_PASS` | Envío de correo (`api/contact.js`) |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE` | Opcionales (por defecto Gmail / 587) |

### Base de datos (primera vez)

**Proyecto nuevo:**

```bash
npx supabase login
npx supabase link --project-ref TU_PROJECT_ID
npx supabase db push
```

**Proyecto que ya tenía SQL pegado a mano** (una sola vez):

```bash
export SUPABASE_PROJECT_ID=TU_PROJECT_ID
export SUPABASE_DB_PASSWORD='tu-password'
npm run db:repair-baseline
```

Orden de migraciones baseline:

1. `20250101000000_bootstrap_schema.sql` — esquema completo  
2. `20250301000000_migration_tracker.sql`  
3. `20250301000001_record_legacy_baseline.sql`  
4. `20250301000002_care_pathway.sql` — triaje clínico  

Detalle completo en [`AGENTS.md`](AGENTS.md) y [`DEPLOY.md`](DEPLOY.md).

## Uso local

```bash
npm install
npm run dev
```

Abrir `http://localhost:3000`. Sin `VITE_SUPABASE_*` la app no autentica ni persiste datos.

## Comandos

```bash
npm run dev              # desarrollo (puerto 3000)
npm run lint             # TypeScript
npm run test             # Vitest
npm run build            # build producción → dist/
npm run preview          # vista previa del build

npm run db:migration:new -- nombre   # nueva migración SQL
npm run db:repair-baseline           # marcar baseline en DB existente

npm start                # servidor legacy SQLite (local/, no producción)
```

## Deploy

### Frontend (Vercel)

Variables en Vercel (Production, Preview, Development):

- `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- `CONTACT_EMAIL`, `SMTP_*` (formulario de contacto)

`vercel.json` en la raíz define el build hacia `dist/` y detecta `/api` automáticamente.

### Base de datos (dev + prod)

| Rama | Supabase | Automático |
|------|----------|------------|
| `dev` | Dev (copia de prod) | `supabase-migrations-dev.yml` |
| `main` | Prod | `supabase-migrations.yml` |

Flujo: cambio SQL → merge `dev` → probar → PR `dev` → `main`. Vercel solo en `main` (prod).

Secrets GitHub: `SUPABASE_DEV_*` y `SUPABASE_PROD_*` (ver [`DEPLOY.md`](DEPLOY.md)).

## Datos y seguridad

- Fuente de verdad: Supabase (`patients`, catálogos, `collection_centers`, `care_*`, insumos, auditoría).
- RLS limita lectura y escritura por rol.
- Login por **correo** o **teléfono** (E.164) + contraseña.
- No subir `.env`, respaldos JSON con datos reales ni secretos al repositorio.

## Documentación adicional

- [`AGENTS.md`](AGENTS.md) — guía para agentes de código y migraciones SQL  
- [`DEPLOY.md`](DEPLOY.md) — despliegue paso a paso (Supabase + Vercel + GitHub)  
- [`CLAUDE.md`](CLAUDE.md) — instrucciones breves para Claude en este repo  
