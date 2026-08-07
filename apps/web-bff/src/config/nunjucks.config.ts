import type { Application } from 'express';
import type { Response } from 'express';
import * as fs from 'node:fs';
import * as nunjucks from 'nunjucks';
import * as path from 'node:path';

// `views/` and `public/` are never copied into dist/, so their location has to
// be resolved relative to the repo rather than to __dirname — which differs
// between `tsx` (apps/web-bff/src/config) and the compiled build (dist/config).
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

export const WEB_BFF_ROOT = resolveWebBffRoot();
export const VIEWS_DIR = path.join(WEB_BFF_ROOT, 'views');
export const PUBLIC_DIR = path.join(WEB_BFF_ROOT, 'public');

const SHORT_DATE = new Intl.DateTimeFormat('en-US', { dateStyle: 'short' });

// R9 — autoescape stays on. Templates are hand-written markup; user-derived
// values are never passed through `| safe`.
export function setupNunjucks(app: Application): void {
  const env = nunjucks.configure(VIEWS_DIR, {
    autoescape: true,
    express: app,
    noCache: process.env.NODE_ENV !== 'production',
  });

  env.addFilter('formatDate', (dateStr: string): string => {
    const parsed = new Date(dateStr);
    return Number.isNaN(parsed.getTime()) ? '' : SHORT_DATE.format(parsed);
  });

  env.addFilter('percentage', (value: number, total: number): number =>
    total === 0 ? 0 : Math.round((value / total) * 100),
  );

  env.addFilter('imgFallback', (url: string | null | undefined): string =>
    url ?? '/static/images/placeholder-fragrance.jpg',
  );

  env.addGlobal('ASSET_BASE_PATH', process.env.ASSET_BASE_PATH ?? '');
}

// Renders a template, degrading to plain markup if the template is missing or
// throws. Reserved for the 404/error paths: a broken error page must not
// escalate a handled 404 into an unhandled exception. Success paths use
// res.render directly so a missing template fails loudly instead of silently
// serving a stub.
export function renderOrFallback(
  res: Response,
  status: number,
  template: string,
  context: Record<string, unknown>,
  fallbackBody: string,
): void {
  res.status(status).render(template, context, (err, html) => {
    if (err) {
      console.error(`[web-bff] failed to render ${template}:`, err.message);
      res.type('html').send(fallbackBody);
      return;
    }
    res.type('html').send(html);
  });
}

export const NOT_FOUND_FALLBACK =
  '<!DOCTYPE html><html lang="en"><body><h1>Page not found</h1></body></html>';

export const ERROR_FALLBACK =
  '<!DOCTYPE html><html lang="en"><body><h1>Something went wrong</h1></body></html>';
