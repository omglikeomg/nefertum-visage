import { Router } from 'express';

import type { MockDataService } from '../services/mock-data.service';

// R10 — the home page. `listFeatured()` returns all five mock perfumes.
export function createIndexRouter(mockData: MockDataService): Router {
  const router = Router();

  router.get('/', (_req, res, next) => {
    mockData
      .listFeatured()
      .then((featuredPerfumes) => {
        res.render('pages/home.njk', { title: 'Nefertum', featuredPerfumes });
      })
      .catch(next);
  });

  return router;
}
