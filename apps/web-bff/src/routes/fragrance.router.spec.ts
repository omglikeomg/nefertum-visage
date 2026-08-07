import { describe, expect, it } from 'vitest';
import request from 'supertest';

import { createApp } from '../app';

// R33 — supertest runs against createApp() directly; no listening server, no
// port binding. MockDataService is deterministic, so it doubles as the fixture.
//
// The three success-path assertions from R33 (200 + rendered markup for a known
// slug, a valid vote and a valid shelf change) require the Nunjucks templates,
// which land in Stage 3. They are added to this spec in that stage. Everything
// asserted here is independent of the view layer.
const app = createApp();

const KNOWN_ID = 'perfume-bleu-de-chanel';

describe('fragrance router', () => {
  describe('GET /fragrance/:slug', () => {
    it('returns 404 for an unknown slug', async () => {
      const res = await request(app).get('/fragrance/not-a-real-perfume');

      expect(res.status).toBe(404);
      expect(res.text).toContain('Page not found');
    });
  });

  describe('POST /fragrance/:id/vote/:scale', () => {
    it('returns 400 when the bucket is out of range', async () => {
      const res = await request(app).post(`/fragrance/${KNOWN_ID}/vote/LONGEVITY?bucket=99`);

      expect(res.status).toBe(400);
    });

    it('returns 400 when the bucket is not a number', async () => {
      const res = await request(app).post(`/fragrance/${KNOWN_ID}/vote/LONGEVITY?bucket=abc`);

      expect(res.status).toBe(400);
    });

    it('returns 400 when the bucket is missing', async () => {
      const res = await request(app).post(`/fragrance/${KNOWN_ID}/vote/LONGEVITY`);

      expect(res.status).toBe(400);
    });

    it('returns 400 for an unknown scale metric', async () => {
      const res = await request(app).post(`/fragrance/${KNOWN_ID}/vote/NOT_A_METRIC?bucket=2`);

      expect(res.status).toBe(400);
    });

    it('returns 404 for an unknown perfume id', async () => {
      const res = await request(app).post('/fragrance/nope/vote/LONGEVITY?bucket=2');

      expect(res.status).toBe(404);
    });
  });

  describe('POST /fragrance/:id/shelf', () => {
    it('returns 400 for an unknown shelf kind', async () => {
      const res = await request(app)
        .post(`/fragrance/${KNOWN_ID}/shelf`)
        .type('form')
        .send({ shelf: 'NOT_A_SHELF' });

      expect(res.status).toBe(400);
    });

    it('returns 404 for an unknown perfume id', async () => {
      const res = await request(app).post('/fragrance/nope/shelf').type('form').send({ shelf: 'HAVE' });

      expect(res.status).toBe(404);
    });
  });
});
