import { Router } from 'express';

import type { MockDataService } from '../services/mock-data.service';

const MAX_COMPARED_FRAGRANCES = 4;
const TITLE = 'Compare fragrances';

function parseIds(raw: unknown): string[] {
  const values = Array.isArray(raw) ? raw : [raw];
  const ids = values
    .filter((value): value is string => typeof value === 'string')
    .flatMap((value) => value.split(','))
    .map((id) => id.trim())
    .filter((id) => id !== '');

  return [...new Set(ids)];
}

export function createCompareRouter(mockData: MockDataService): Router {
  const router = Router();

  // GET /compare?ids=a,b,c — read-only side-by-side comparison.
  router.get('/', (req, res, next) => {
    const ids = parseIds(req.query.ids);

    if (ids.length === 0) {
      res.status(400).render('pages/compare.njk', {
        title: TITLE,
        perfumes: [],
        message: 'Add fragrance IDs to the link to compare them.',
        notice: null,
      });
      return;
    }

    if (ids.length > MAX_COMPARED_FRAGRANCES) {
      res.status(400).render('pages/compare.njk', {
        title: TITLE,
        perfumes: [],
        message: `You can compare up to ${MAX_COMPARED_FRAGRANCES} fragrances at a time.`,
        notice: null,
      });
      return;
    }

    mockData
      .getPerfumesForComparison(req, ids)
      .then((perfumes) => {
        if (perfumes.length === 0) {
          res.status(404).render('pages/compare.njk', {
            title: TITLE,
            perfumes: [],
            message: 'None of the fragrances in this link could be found.',
            notice: null,
          });
          return;
        }

        const missing = ids.length - perfumes.length;
        const notice =
          missing === 0
            ? null
            : `${missing} ${missing === 1 ? 'fragrance' : 'fragrances'} in this link could not be found.`;

        res.render('pages/compare.njk', { title: TITLE, perfumes, message: null, notice });
      })
      .catch(next);
  });

  return router;
}
