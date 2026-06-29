import type { Connect, Plugin } from 'vite';
import type { IncomingMessage, ServerResponse } from 'node:http';

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (chunk) => {
      data += chunk;
    });
    req.on('end', () => resolve(data));
    req.on('error', reject);
  });
}

function invokeVercelHandler(
  handler: (req: { method?: string; body?: unknown }, res: {
    status: (code: number) => { json: (payload: unknown) => void };
    json: (payload: unknown) => void;
  }) => Promise<void> | void,
  req: IncomingMessage,
  res: ServerResponse,
  bodyText: string
): Promise<void> {
  return new Promise((resolve, reject) => {
    let settled = false;
    const finish = () => {
      if (!settled) {
        settled = true;
        resolve();
      }
    };

    const mockRes = {
      statusCode: 200,
      status(code: number) {
        this.statusCode = code;
        return this;
      },
      json(payload: unknown) {
        if (settled) return this;
        settled = true;
        res.statusCode = this.statusCode || 200;
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.end(JSON.stringify(payload));
        resolve();
        return this;
      },
    };

    let body: unknown = {};
    if (bodyText.trim()) {
      try {
        body = JSON.parse(bodyText);
      } catch {
        res.statusCode = 400;
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.end(JSON.stringify({ error: 'JSON inválido en el cuerpo de la solicitud.' }));
        finish();
        return;
      }
    }

    Promise.resolve(
      handler({
        method: req.method,
        body,
      }, mockRes)
    )
      .then(() => {
        if (!settled) {
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json; charset=utf-8');
          res.end(JSON.stringify({ error: 'El servidor de IA no respondió.' }));
          finish();
        }
      })
      .catch((err) => {
        if (!settled) {
          reject(err);
        }
      });
  });
}

/** En `npm run dev`, ejecuta `api/*.js` como en Vercel (lee `.env` vía vite.config). */
export function localVercelApiPlugin(apiFiles: Record<string, string>): Plugin {
  const routes = Object.fromEntries(
    Object.entries(apiFiles).map(([route, file]) => [`/api/${route}`, file])
  );

  const middleware: Connect.NextHandleFunction = async (req, res, next) => {
    const pathname = req.url?.split('?')[0] ?? '';
    const handlerPath = routes[pathname];
    if (!handlerPath) return next();

    if (req.method === 'OPTIONS') {
      res.statusCode = 204;
      res.end();
      return;
    }

    try {
      const bodyText = req.method === 'POST' || req.method === 'PUT' ? await readBody(req) : '';
      const importPath =
        process.env.NODE_ENV === 'production'
          ? handlerPath
          : `${handlerPath}?t=${Date.now()}`;
      const module = await import(importPath);
      const handler = module.default;
      if (typeof handler !== 'function') {
        res.statusCode = 500;
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.end(JSON.stringify({ error: 'Handler de API inválido.' }));
        return;
      }
      await invokeVercelHandler(handler, req, res, bodyText);
    } catch (err) {
      console.error(`[local-api] ${pathname}`, err);
      res.statusCode = 500;
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.end(JSON.stringify({ error: 'Error interno del servidor de IA en desarrollo.' }));
    }
  };

  return {
    name: 'cividata-local-vercel-api',
    configureServer(server) {
      server.middlewares.use(middleware);
    },
  };
}
