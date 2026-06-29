/**
 * Genera public/logo.png y public/logo-reverse.png desde los SVG en public/.
 * Ejecutar: npm run generate:logos
 */
import sharp from 'sharp';
import { fileURLToPath } from 'url';
import path from 'path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const publicDir = path.join(root, 'public');
const logoWidth = 854;

const variants = [
  { input: 'logo.svg', output: 'logo.png' },
  { input: 'logo-reverse.svg', output: 'logo-reverse.png' },
];

for (const { input, output } of variants) {
  await sharp(path.join(publicDir, input))
    .resize(logoWidth)
    .png({ compressionLevel: 9 })
    .toFile(path.join(publicDir, output));
  console.log(`Wrote public/${output}`);
}
