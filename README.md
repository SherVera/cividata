# Censo Infantil

Web para registrar la *Ficha de Registro / Censo Infantil*. Sin dependencias externas — usa el SQLite y el servidor HTTP integrados de Node 22.

## Requisitos
- Node.js 22 o superior.

## Uso
```bash
ACCESS_PASSWORD="tu-clave-secreta" npm start
```
Abrir http://localhost:3000 → pide contraseña → formulario.

Variables de entorno (opcionales):
| Variable          | Por defecto       | Descripción                          |
|-------------------|-------------------|--------------------------------------|
| `ACCESS_PASSWORD` | `kidsalive2026`   | Contraseña de acceso compartida.     |
| `PORT`            | `3000`            | Puerto.                              |
| `DB_PATH`         | `./censo.db`      | Archivo SQLite.                      |

## Qué hace
- **Acceso protegido**: nadie ve los datos sin contraseña (cookie de sesión `HttpOnly`).
- **Formulario por módulos**, ningún campo es obligatorio: se puede guardar parcial.
- **Geolocalización del navegador** se guarda como metadata (`geo_lat`, `geo_lng`, `geo_accuracy`); si el usuario la niega, el registro se guarda igual.
- También se guarda como metadata: `created_at`, `ip`, `user_agent`.
- **Persistencia en SQL** (SQLite, tabla `registros`).
- `/registros` lista todo en tabla, con enlace a Google Maps por registro.

## Notas de seguridad para producción
- Servir detrás de HTTPS y añadir el flag `Secure` a la cookie.
- Cambiar `ACCESS_PASSWORD`.
- Las sesiones viven en memoria: reiniciar el proceso cierra todas las sesiones.
