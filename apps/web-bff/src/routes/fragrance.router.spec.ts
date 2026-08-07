import { describe, expect, it } from 'vitest';
import request from 'supertest';

import { createApp } from '../app';

// R33 — supertest runs against createApp() directly; no listening server, no
// port binding. MockDataService is deterministic, so it doubles as the fixture.
const app = createApp();

const KNOWN_ID = 'perfume-bleu-de-chanel';
const KNOWN_SLUG = 'bleu-de-chanel';

describe('fragrance router', () => {
  describe('GET /fragrance/:slug', () => {
    it('returns 200 with the perfume name for a known slug', async () => {
      const res = await request(app).get(`/fragrance/${KNOWN_SLUG}`);

      expect(res.status).toBe(200);
      expect(res.text).toContain('Bleu de Chanel');
      expect(res.text).toContain('Chanel');
    });

    it('renders the note pyramid, histograms and shelf selector', async () => {
      const res = await request(app).get(`/fragrance/${KNOWN_SLUG}`);

      expect(res.text).toContain('Grapefruit');
      expect(res.text).toContain(`id="histogram-${KNOWN_ID}-LONGEVITY"`);
      expect(res.text).toContain(`id="shelf-selector-${KNOWN_ID}"`);
    });

    it('returns 404 for an unknown slug', async () => {
      const res = await request(app).get('/fragrance/not-a-real-perfume');

      expect(res.status).toBe(404);
      expect(res.text).toContain('Page not found');
    });
  });

  describe('POST /fragrance/:id/vote/:scale', () => {
    it('returns 200 with the swapped histogram markup for a valid vote', async () => {
      const res = await request(app).post(`/fragrance/${KNOWN_ID}/vote/LONGEVITY?bucket=3`);

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toMatch(/text\/html/);
      expect(res.text).toContain(`id="histogram-${KNOWN_ID}-LONGEVITY"`);

      // AC5 — the partial must carry all five bars for the outerHTML swap.
      const bars = res.text.match(
        new RegExp(`hx-post="/fragrance/${KNOWN_ID}/vote/LONGEVITY\\?bucket=\\d"`, 'g'),
      );
      expect(bars).toHaveLength(5);
    });

    it('increments the chosen bucket across requests', async () => {
      const read = async (): Promise<number> => {
        const res = await request(app).post(`/fragrance/${KNOWN_ID}/vote/GENDER?bucket=2`);
        const match = res.text.match(/Bal<br>(\d+)/);
        return Number(match?.[1] ?? 0);
      };

      const first = await read();
      const second = await read();

      expect(second).toBe(first + 1);
    });

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
    it('returns 200 with the shelf selector showing the new shelf selected', async () => {
      const res = await request(app)
        .post(`/fragrance/${KNOWN_ID}/shelf`)
        .type('form')
        .send({ shelf: 'HAVE' });

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toMatch(/text\/html/);
      expect(res.text).toContain(`id="shelf-selector-${KNOWN_ID}"`);
      expect(res.text).toContain('<option value="HAVE" selected>');
    });

    it('treats an empty shelf value as removal', async () => {
      await request(app).post(`/fragrance/${KNOWN_ID}/shelf`).type('form').send({ shelf: 'HAVE' });

      const res = await request(app)
        .post(`/fragrance/${KNOWN_ID}/shelf`)
        .type('form')
        .send({ shelf: '' });

      expect(res.status).toBe(200);
      expect(res.text).not.toContain('<option value="HAVE" selected>');
    });

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
