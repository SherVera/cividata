# Despliegue gratis con Supabase (≈15 min)

Todo el código ya está listo en `web/`. Solo faltan tus claves y subirlo.

## 1. Crear el proyecto Supabase (gratis)
- Entra a https://supabase.com → *Start your project* → crea un proyecto.
- Guarda la contraseña de la base que te pida (no la necesitas para esto, pero anótala).

## 2. Crear la tabla SQL
- En el panel: **SQL Editor → New query**.
- Pega TODO el contenido de [`supabase/schema.sql`](supabase/schema.sql) y pulsa **Run**.
- Esto crea la tabla `registros` (SQL/Postgres) y activa RLS (nadie sin sesión accede).

## 3. Crear usuarios (los que registrarán)
- **Authentication → Users → Add user** → pon correo + contraseña → marca *Auto Confirm User*.
- Repite por cada persona. (No hay auto-registro público: la app nunca llama a "sign up".)
- Recomendado: **Authentication → Sign In / Providers → Email** y desactiva *Allow new users to sign up*.

## 4. Pegar tus claves
- **Project Settings → API**. Copia:
  - *Project URL*
  - clave *anon public*
- Pégalas en [`web/config.js`](web/config.js). (La clave anon es pública y segura: la protección real es el login + RLS.)

## 5. Publicar la web en Vercel (gratis)
Es un sitio estático, no necesita build. Dos formas:

**A) CLI (lo más rápido):**
```bash
cd web
npx vercel --prod
```
Te pide iniciar sesión la primera vez y luego acepta los valores por defecto. Al terminar imprime tu URL pública (`https://algo.vercel.app`).

**B) Desde la web:** sube la carpeta `web/` a un repo de GitHub → en vercel.com *Add New → Project* → importas el repo. *Framework Preset:* **Other**, sin comando de build, *Root Directory:* `web`.

Alternativas igual de válidas: Netlify, Cloudflare Pages o Firebase Hosting.

## Listo
Abre la URL → inicia sesión → registra. Ve a *Ver registros* para la tabla.
Los datos viven en Postgres (SQL) en Supabase; puedes verlos también en **Table Editor → registros** o exportarlos a CSV desde ahí.

---
### Notas
- **Geolocalización**: el navegador la pide al abrir el formulario; requiere HTTPS (Netlify ya lo da). Si el usuario la niega, el registro se guarda igual.
- **Nada es obligatorio**: los campos vacíos se guardan como `NULL`.
- El servidor Node local (`server.js`) ya no se usa para esto; queda como alternativa offline si algún día lo quieres sin internet.
