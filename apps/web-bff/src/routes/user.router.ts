import { Router } from 'express';

import type { MockDataService } from '../services/mock-data.service';

// R12 — v1 placeholder. The full profile is a follow-up request.
export function createUserRouter(_mockData: MockDataService): Router {
  const router = Router();

  router.get('/:username', (req, res) => {
    const { username } = req.params;
    res.render('pages/user.njk', { title: username, username });
  });

  return router;
}
