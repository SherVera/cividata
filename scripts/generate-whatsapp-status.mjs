/**
 * Genera imagen vertical 9:16 para estado de WhatsApp.
 * Salida: public/whatsapp-status.jpg y public/whatsapp-status.png (1080×1920)
 * Ejecutar: npm run generate:whatsapp-status
 */
import sharp from 'sharp';
import { fileURLToPath } from 'url';
import path from 'path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const publicDir = path.join(root, 'public');
const width = 1080;
const height = 1920;
const logoWidth = 720;
const tagline = 'Solo personal de salud';
const subtitle = 'Datos del paciente resguardados. Sin información en público.';
const cta = 'Solicite su acceso en el formulario de la web.';
const share = '¿Conoce a alguien del personal de salud? Compártalo.';

const backgroundSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0.2" y2="1">
      <stop offset="0%" stop-color="#0e9488"/>
      <stop offset="100%" stop-color="#0c6b62"/>
    </linearGradient>
  </defs>
  <rect width="100%" height="100%" fill="url(#bg)"/>
  <circle cx="920" cy="180" r="220" fill="#ffffff" fill-opacity="0.06"/>
  <circle cx="120" cy="1680" r="280" fill="#ffffff" fill-opacity="0.05"/>
</svg>`;

const captionSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="300">
  <text x="50%" y="48" text-anchor="middle" fill="#ffffff" font-family="system-ui, -apple-system, Segoe UI, sans-serif" font-size="38" font-weight="700">${tagline}</text>
  <text x="50%" y="100" text-anchor="middle" fill="#ffffff" fill-opacity="0.92" font-family="system-ui, -apple-system, Segoe UI, sans-serif" font-size="26">${subtitle}</text>
  <text x="50%" y="168" text-anchor="middle" fill="#ffffff" fill-opacity="0.9" font-family="system-ui, -apple-system, Segoe UI, sans-serif" font-size="23" font-weight="600">${cta}</text>
  <text x="50%" y="248" text-anchor="middle" fill="#F4A53A" font-family="system-ui, -apple-system, Segoe UI, sans-serif" font-size="28" font-weight="700">${share}</text>
</svg>`;

const logoBuf = await sharp(path.join(publicDir, 'logo-reverse.svg'))
  .resize(logoWidth)
  .png()
  .toBuffer();
const { height: logoHeight = 260 } = await sharp(logoBuf).metadata();

const captionBuf = await sharp(Buffer.from(captionSvg)).png().toBuffer();
const { height: captionHeight = 300 } = await sharp(captionBuf).metadata();

const blockHeight = logoHeight + 48 + captionHeight;
const logoTop = Math.round((height - blockHeight) / 2);
const captionTop = logoTop + logoHeight + 48;
const logoLeft = Math.round((width - logoWidth) / 2);

const composed = await sharp(Buffer.from(backgroundSvg))
  .composite([
    { input: logoBuf, top: logoTop, left: logoLeft },
    { input: captionBuf, top: captionTop, left: 0 },
  ])
  .png()
  .toBuffer();

await sharp(composed)
  .png({ compressionLevel: 9 })
  .toFile(path.join(publicDir, 'whatsapp-status.png'));

await sharp(composed)
  .jpeg({ quality: 92, mozjpeg: true })
  .toFile(path.join(publicDir, 'whatsapp-status.jpg'));

console.log('Wrote public/whatsapp-status.png (1080×1920)');
console.log('Wrote public/whatsapp-status.jpg (1080×1920, recomendado para subir)');
