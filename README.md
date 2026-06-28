# Censo Infantil & Historia Clínica

Aplicación web para **censo pediátrico comunitario** y **historia clínica**: registrar niños y niñas en campañas de salud, consultar fichas, dar seguimiento médico y visualizar estadísticas del censo. Pensada para equipos de campo con acceso controlado por roles.

La interfaz principal está en `src/` (React + Vite + TypeScript). El frontend desplegado se publica en Vercel desde `dist`. Los archivos antiguos en `web/` y el servidor local en `local/` no forman parte del despliegue actual.

## ¿Para qué sirve?

- **Registro de pacientes**: datos personales, vivienda, representante legal, salud y nutrición, escolaridad y esquema de vacunación.
- **Historia clínica**: notas de consulta con peso, estatura, motivo, diagnóstico y tratamiento.
- **Centros de acopio**: puntos de captura con geolocalización (mapa Leaflet + búsqueda OpenStreetMap) para asociar cada registro a un lugar de trabajo en campo.
- **Tablero de estadísticas**: totales, vacunación, escolaridad, registros recientes y métricas agregadas según el rol del usuario.
- **Administración de usuarios** (admin / super admin): alta, edición de contacto, restablecimiento de contraseña y habilitación de cuentas vía `api/users` en Vercel.
- **Respaldo e importación**: exportar e importar el censo en JSON para respaldos o migraciones controladas.

## Stack

| Capa | Tecnología |
|------|------------|
| Frontend | React 19, Vite, TypeScript, Tailwind CSS 4 |
| UI | `lucide-react`, `motion/react`, diseño mobile-first con navegación inferior |
| Mapas | Leaflet, Nominatim (OpenStreetMap) |
| Backend / datos | [Supabase](https://supabase.com) (Auth + PostgreSQL con RLS y auditoría) |
| Deploy | Vercel (`npm run build` → `dist`) |

## Roles

| Rol | Acceso |
|-----|--------|
| **Personal médico** | Registra pacientes, ve sus propios registros y estadísticas generales agregadas. |
| **Admin** | Ve y edita todo el censo, gestiona usuarios (personal médico), consulta auditoría. |
| **Super admin** | Todo lo anterior más gestión de admins y panel de centros de acopio. |

Los roles viven en `app_metadata.role` de Supabase y no pueden ser modificados por el usuario.

## Requisitos

- Node.js 22 o superior.
- Proyecto Supabase con el esquema aplicado (`supabase/schema.sql`).

## Configuración

Copia `.env.example` a `.env` y completa las variables:

```bash
cp .env.example .env
```

| Variable | Uso |
|----------|-----|
| `VITE_SUPABASE_URL` | URL del proyecto (expuesta al cliente React) |
| `VITE_SUPABASE_ANON_KEY` | Clave anónima (expuesta al cliente React) |
| `SUPABASE_URL` | Misma URL, para funciones servidor (`api/users`) |
| `SUPABASE_SERVICE_ROLE_KEY` | Solo en servidor; nunca en el frontend |

En Supabase → SQL Editor, ejecuta el contenido de `supabase/schema.sql` para crear tablas, políticas RLS, catálogos, centros de acopio y funciones de estadísticas.

## Uso local

```bash
npm install
npm run dev
```

Abrir `http://localhost:3000`. Sin variables `VITE_SUPABASE_*` la app no puede autenticar ni persistir datos.

## Comandos

```bash
npm run lint      # comprobación TypeScript
npm run build     # build de producción
npm run preview   # vista previa del build
npm start         # servidor legacy local/ (SQLite, no usado en producción)
```

## Deploy en Vercel

Vercel ejecuta el build con las variables de Supabase inyectadas:

```bash
VITE_SUPABASE_URL=$SUPABASE_URL VITE_SUPABASE_ANON_KEY=$SUPABASE_ANON_KEY npm run build
```

Configura en el panel de Vercel:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (necesaria para `api/users.js`)

La salida publicada es el directorio `dist`.

## Datos y seguridad

- La **fuente de verdad** es Supabase (tabla `patients`, catálogos, `collection_centers`, `audit_log`).
- Row Level Security limita qué filas ve o modifica cada rol.
- El login admite **correo** o **teléfono** (formato E.164) con contraseña.
- Solo se guarda en `localStorage` del navegador el historial reciente de centros de acopio (comodidad de UX).
- No subas respaldos JSON reales, archivos `.env` ni datos personales de pacientes al repositorio.
