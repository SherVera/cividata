import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vitest/config';

const SITE_URL_META_START = '<!-- site-url-meta:start -->';
const SITE_URL_META_END = '<!-- site-url-meta:end -->';

function normalizeSiteUrl(raw: string | undefined): string | null {
  const trimmed = raw?.trim();
  if (!trimmed) return null;
  const withoutTrailingSlash = trimmed.replace(/\/$/, '');
  if (/^https?:\/\//i.test(withoutTrailingSlash)) {
    return withoutTrailingSlash;
  }
  return `https://${withoutTrailingSlash}`;
}

const siteUrl = normalizeSiteUrl(process.env.VITE_SITE_URL);

function applySiteUrlMeta(html: string): string {
  if (!siteUrl) {
    const start = html.indexOf(SITE_URL_META_START);
    const end = html.indexOf(SITE_URL_META_END);
    if (start === -1 || end === -1) return html;
    return html.slice(0, start) + html.slice(end + SITE_URL_META_END.length);
  }
  return html
    .replaceAll('%SITE_URL%', siteUrl)
    .replaceAll(`${SITE_URL_META_START}\n`, '')
    .replaceAll(`${SITE_URL_META_END}\n`, '');
}

export default defineConfig(() => {
  return {
    plugins: [
      react(),
      tailwindcss(),
      {
        name: 'html-site-url',
        transformIndexHtml(html) {
          return applySiteUrlMeta(html);
        },
      },
    ],
    test: {
      environment: 'node',
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify; file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
