// Genera web/config.js en tiempo de build a partir de variables de entorno.
// Vercel lo ejecuta como buildCommand. Las claves NO viven en el repo.
const fs = require('node:fs');
const path = require('node:path');

const url = process.env.SUPABASE_URL || '';
const anon = process.env.SUPABASE_ANON_KEY || '';
if (!url || !anon) {
  console.warn('⚠️  Falta SUPABASE_URL o SUPABASE_ANON_KEY; config.js quedará vacío.');
}

fs.writeFileSync(
  path.join(__dirname, '..', 'web', 'config.js'),
  `// Generado en build desde variables de entorno. No editar a mano.\n` +
  `window.SUPABASE_URL = ${JSON.stringify(url)};\n` +
  `window.SUPABASE_ANON_KEY = ${JSON.stringify(anon)};\n`
);
console.log('✅ web/config.js generado');
