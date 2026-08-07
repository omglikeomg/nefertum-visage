import express, {
  type Application,
  type NextFunction,
  type Request,
  type Response,
} from 'express';
import helmet from 'helmet';
import nunjucks from 'nunjucks';
import * as fs from 'node:fs';
import * as path from 'node:path';

// `views/` and `public/` are never copied into dist/, so their location has to
// be resolved relative to the repo rather than to __dirname — which differs
// between `tsx` (apps/web-bff/src) and the compiled build (dist/).
function resolveWebBffRoot(): string {
  let dir = __dirname;

  for (let depth = 0; depth < 6; depth += 1) {
    const candidate = path.join(dir, 'apps', 'web-bff');
    if (fs.existsSync(candidate)) {
      return candidate;
    }
    dir = path.dirname(dir);
  }

  throw new Error('[web-bff] could not locate apps/web-bff from ' + __dirname);
}

const WEB_BFF_ROOT = resolveWebBffRoot();
const VIEWS_DIR = path.join(WEB_BFF_ROOT, 'views');
const PUBLIC_DIR = path.join(WEB_BFF_ROOT, 'public');

// Renders a template, degrading to plain markup if the template is missing or
// throws. Without this a broken error page turns a handled 404 into an
// unhandled exception.
function renderOrFallback(
  res: Response,
  status: number,
  template: string,
  context: Record<string, unknown>,
  fallbackBody: string,
): void {
  res.status(status).render(template, context, (err, html) => {
    if (err) {
      console.error('[web-bff] failed to render ' + template + ':', err.message);
      res.type('html').send(fallbackBody);
      return;
    }
    res.type('html').send(html);
  });
}

export function createApp(): Application {
  const app = express();

  app.use(helmet());
  app.use(express.urlencoded({ extended: true }));
  app.use(express.json());

  // Nunjucks is configured inline here in Stage 1; Stage 2 extracts this into
  // config/nunjucks.config.ts and registers the filters and global.
  app.set('view engine', 'njk');
  nunjucks.configure(VIEWS_DIR, {
    autoescape: true,
    express: app,
    noCache: process.env.NODE_ENV !== 'production',
  });

  app.use('/static', express.static(PUBLIC_DIR));

  // Routers are wired in Stage 2.

  app.use((req: Request, res: Response) => {
    renderOrFallback(
      res,
      404,
      'pages/404.njk',
      { title: 'Not found' },
      '<!DOCTYPE html><html lang="en"><body><h1>Page not found</h1></body></html>',
    );
  });

  app.use((err: Error, req: Request, res: Response, _next: NextFunction) => {
    console.error('[web-bff] error:', err);
    renderOrFallback(
      res,
      500,
      'pages/error.njk',
      { title: 'Error' },
      '<!DOCTYPE html><html lang="en"><body><h1>Something went wrong</h1></body></html>',
    );
  });

  return app;
}
