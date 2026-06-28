# Despliegue gratis (Supabase + Vercel)

Arquitectura:
- **Frontend estático** (`web/`) → usa la *anon key* (pública) + RLS.
- **Función serverless** (`api/users.js`) → gestión de usuarios con la *service_role* (secreta, solo en Vercel).
- **Postgres (Supabase)** → datos, roles, RLS y auditoría por trigger.

## 1. Crear el proyecto Supabase (gratis)
https://supabase.com → *Start your project*.

## 2. Crear las tablas, roles y auditoría
- **SQL Editor → New query** → pega TODO [`supabase/schema.sql`](supabase/schema.sql) → **Run**.
- Crea: tabla `registros`, `audit_log`, función `is_admin()`, políticas RLS y el trigger de auditoría.

## 3. Proveedores de acceso
- Para login por teléfono: **Authentication → Providers → Phone** → actívalo (no necesita SMS si creas usuarios con contraseña + auto-confirm).
- **No hay registro público**: en **Email** y **Phone** desactiva *Allow new users to sign up*.

## 4. Crear el PRIMER admin (bootstrap)
El panel crea usuarios, pero el primer admin se crea a mano una sola vez:
1. **Authentication → Users → Add user** → correo o teléfono + contraseña → marca *Auto Confirm*.
2. **SQL Editor** → dale rol admin:
   ```sql
   update auth.users
      set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || '{"role":"admin"}'
    where email = 'TU-CORREO-ADMIN';   -- o:  where phone = '+584141234567';
   ```
3. Ese admin ya entra al **🛠️ Panel** y desde ahí crea a los demás (registradores o más admins).

## 5. Claves
- **Pública** → en [`web/config.js`](web/config.js): *Project URL* + clave *anon public*
  (Supabase → Project Settings → API). Es segura de exponer.
- **Secreta** → la clave *service_role* va SOLO como variable de entorno en Vercel (paso 6).
  Nunca la pongas en `web/` ni en el repo.

## 6. Desplegar en Vercel (desde la RAÍZ del repo, no desde `web/`)
```bash
npx vercel            # primer deploy + login (acepta los valores por defecto)
```
Luego carga las variables de entorno (server-side):
```bash
vercel env add SUPABASE_URL                 # pega tu Project URL
vercel env add SUPABASE_SERVICE_ROLE_KEY    # pega la clave service_role
vercel --prod
```
(O en el dashboard: Project → Settings → Environment Variables.)
`vercel.json` ya sirve `web/` como estático y `/api` se detecta solo.

## 7. Uso
- **Admin**: entra → ve 🛠️ Panel con estadísticas, crea/gestiona usuarios, ve la auditoría.
- **Registrador**: entra → solo el formulario; ve únicamente los registros que él creó; no edita nada.
- Cada INSERT/UPDATE/DELETE sobre un ciudadano queda en `audit_log` con el usuario que lo hizo.

---
### Notas
- **Contraseñas encriptadas**: Supabase Auth las guarda con bcrypt; no se almacenan en claro.
- **Geolocalización**: requiere HTTPS (Vercel lo da); si el usuario la niega, el registro se guarda igual.
- **Nada obligatorio**: los campos vacíos se guardan como `NULL`.
- El `server.js` local (Node + SQLite) sigue siendo solo el respaldo offline; no usa roles ni auditoría.
