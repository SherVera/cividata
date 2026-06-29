/**
 * Genera public/og-image.png (1200×630) para vistas previas en WhatsApp, etc.
 * Ejecutar: node scripts/generate-og-image.mjs
 */
import sharp from 'sharp';
import { fileURLToPath } from 'url';
import path from 'path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const width = 1200;
const height = 630;
const logoWidth = 720;

const logo = await sharp(path.join(root, 'cividata-primary.svg'))
  .resize(logoWidth)
  .png()
  .toBuffer();

await sharp({
  create: {
    width,
    height,
    channels: 4,
    background: '#f8fafc',
  },
})
  .composite([{ input: logo, gravity: 'center' }])
  .png({ compressionLevel: 9 })
  .toFile(path.join(root, 'public/og-image.png'));

console.log('Wrote public/og-image.png');
