# Censo Infantil & Historia Clinica

App React + Vite + TypeScript para registrar pacientes pediatricos, gestionar censo comunitario y mantener historia clinica local.

La interfaz principal esta en `src/` y conserva el estilo original del repo: React, Tailwind, tarjetas redondeadas, paleta slate/blue, `lucide-react` y animaciones con `motion/react`.

## Requisitos

- Node.js 22 o superior.

## Uso Local

```bash
npm install
npm run dev
```

Abrir `http://localhost:3000`.

## Comandos

```bash
npm run lint
npm run build
npm run preview
```

## Deploy en Vercel

Vercel ejecuta:

```bash
npm run build
```

Y publica:

```bash
dist
```

## Datos

La app es offline-first: guarda pacientes y configuracion en el navegador mediante `localStorage` y `sessionStorage`.

No subas respaldos JSON reales, archivos `.env` ni datos personales de pacientes.
