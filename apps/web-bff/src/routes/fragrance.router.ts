import { Router } from 'express';

import { NOT_FOUND_FALLBACK, renderOrFallback } from '../config/nunjucks.config';
import {
  isScaleMetric,
  isShelfKind,
  type MockDataService,
} from '../services/mock-data.service';

const BUCKET_MIN = 0;
const BUCKET_MAX = 4;

// R11 — one full-page route plus the two HTMX action endpoints.
export function createFragranceRouter(mockData: MockDataService): Router {
  const router = Router();

  // GET /fragrance/:slug — full page render.
  router.get('/:slug', (req, res, next) => {
    mockData
      .getPerfumeBySlug(req, req.params.slug)
      .then((perfume) => {
        if (perfume === null) {
          renderOrFallback(
            res,
            404,
            'pages/404.njk',
            { title: 'Not found' },
            NOT_FOUND_FALLBACK,
          );
          return;
        }

        // R19 — the shelf lives in mutation state, not in the static JSON.
        res.render('pages/fragrance-detail.njk', {
          title: `${perfume.brand.name} ${perfume.name}`,
          perfume: { ...perfume, userShelfStatus: mockData.getCurrentShelf(perfume.id) },
        });
      })
      .catch(next);
  });

  // POST /fragrance/:id/vote/:scale?bucket=N — HTMX histogram swap.
  router.post('/:id/vote/:scale', (req, res, next) => {
    const { id, scale } = req.params;

    if (!isScaleMetric(scale)) {
      res.status(400).type('text/plain').send(`Unknown scale metric: ${scale}`);
      return;
    }

    const bucket = Number.parseInt(String(req.query.bucket), 10);

    if (!Number.isInteger(bucket) || bucket < BUCKET_MIN || bucket > BUCKET_MAX) {
      res
        .status(400)
        .type('text/plain')
        .send(`Bucket must be an integer between ${BUCKET_MIN} and ${BUCKET_MAX}.`);
      return;
    }

    mockData
      .recordScaleVote(req, id, scale, bucket)
      .then((histogram) => {
        if (histogram === null) {
          res.status(404).type('text/plain').send('Unknown perfume.');
          return;
        }

        res.render('partials/htmx/histogram-partial.njk', {
          histogram,
          perfumeId: id,
          metric: scale,
        });
      })
      .catch(next);
  });

  // POST /fragrance/:id/shelf — HTMX shelf selector swap.
  router.post('/:id/shelf', (req, res, next) => {
    const { id } = req.params;
    const raw = typeof req.body?.shelf === 'string' ? req.body.shelf : '';

    if (raw !== '' && !isShelfKind(raw)) {
      res.status(400).type('text/plain').send(`Unknown shelf: ${raw}`);
      return;
    }

    const shelf = raw === '' ? null : raw;

    mockData
      .updateShelf(req, id, shelf)
      .then((result) => {
        if (result === null) {
          res.status(404).type('text/plain').send('Unknown perfume.');
          return;
        }

        res.render('partials/htmx/shelf-partial.njk', {
          perfumeId: id,
          currentShelf: result.currentShelf,
        });
      })
      .catch(next);
  });

  return router;
}
