import { describe, expect, it } from 'vitest';
import request from 'supertest';

import { createApp } from '../app';

const app = createApp();

const BLEU = 'perfume-bleu-de-chanel';
const COCO = 'perfume-coco-mademoiselle';
const FIVE = [BLEU, COCO, 'perfume-tobacco-vanille', 'perfume-black-orchid', 'perfume-replica-beach-walk'];
const columns = (html: string) => [...html.matchAll(/data-perfume-id="([^"]+)"/g)].map((m) => m[1]);

describe('compare router', () => {
  it('COMPARE-PAGE-1: shows one column per fragrance in link order with brand, linked name, pyramid and both histograms', async () => {
    const res = await request(app).get(`/compare?ids=${COCO},${BLEU}`);
    expect(res.status).toBe(200);
    expect(columns(res.text)).toEqual([COCO, BLEU]);
    expect(res.text).toContain('href="/fragrance/bleu-de-chanel"');
    expect(res.text).toContain('Chanel');
    expect(res.text).toContain('Grapefruit');
    expect(res.text).toContain(`id="histogram-${BLEU}-LONGEVITY"`);
    expect(res.text).toContain(`id="histogram-${BLEU}-SILLAGE"`);
    expect(res.text).not.toContain(`id="histogram-${BLEU}-GENDER"`);
  });

  it('COMPARE-PAGE-1: shows a single fragrance', async () => {
    const res = await request(app).get(`/compare?ids=${BLEU}`);
    expect(res.status).toBe(200);
    expect(columns(res.text)).toEqual([BLEU]);
  });

  it('COMPARE-PAGE-2: the same link shows the same fragrances and sets no cookie', async () => {
    const first = await request(app).get(`/compare?ids=${BLEU},${COCO}`);
    const second = await request(app).get(`/compare?ids=${BLEU},${COCO}`);
    expect(columns(second.text)).toEqual(columns(first.text));
    expect(first.headers['set-cookie']).toBeUndefined();
  });

  it('COMPARE-PAGE-3: rejects more than four distinct IDs without showing any', async () => {
    const res = await request(app).get(`/compare?ids=${FIVE.join(',')}`);
    expect(res.status).toBe(400);
    expect(res.text).toContain('You can compare up to 4 fragrances at a time.');
    expect(columns(res.text)).toEqual([]);
  });

  it('COMPARE-PAGE-3: counts repeated IDs once', async () => {
    const res = await request(app).get(`/compare?ids=${[...FIVE.slice(0, 4), BLEU].join(',')}`);
    expect(res.status).toBe(200);
    expect(columns(res.text)).toHaveLength(4);
  });

  it.each(['/compare', '/compare?ids=', '/compare?ids=%20,,'])('COMPARE-PAGE-4: %s asks for fragrance IDs', async (url) => {
    const res = await request(app).get(url);
    expect(res.status).toBe(400);
    expect(res.text).toContain('Add fragrance IDs to the link to compare them.');
  });

  it('COMPARE-PAGE-5: shows the known fragrances and counts the unknown ones', async () => {
    const one = await request(app).get(`/compare?ids=${BLEU},nope`);
    expect(one.status).toBe(200);
    expect(columns(one.text)).toEqual([BLEU]);
    expect(one.text).toContain('1 fragrance in this link could not be found.');
    const two = await request(app).get(`/compare?ids=nope,${BLEU},gone`);
    expect(two.text).toContain('2 fragrances in this link could not be found.');
  });

  it('COMPARE-PAGE-6: answers 404 when no ID is known', async () => {
    const res = await request(app).get('/compare?ids=nope,gone');
    expect(res.status).toBe(404);
    expect(res.text).toContain('None of the fragrances in this link could be found.');
  });

  it('COMPARE-PAGE-7: renders histograms without voting controls; the detail page keeps them', async () => {
    const compare = await request(app).get(`/compare?ids=${BLEU}`);
    expect(compare.text).not.toContain('hx-post');
    const detail = await request(app).get('/fragrance/bleu-de-chanel');
    expect(detail.text).toContain(`hx-post="/fragrance/${BLEU}/vote/LONGEVITY?bucket=0"`);
  });

  it('COMPARE-PAGE-8: columns keep full width inside a horizontal scroll container', async () => {
    const res = await request(app).get(`/compare?ids=${BLEU},${COCO}`);
    expect(res.text).toContain('overflow-x-auto');
    expect(res.text.match(/data-perfume-id="[^"]+"[^>]*class="[^"]*min-w-72 shrink-0/g)).toHaveLength(2);
  });

  it('accepts a repeated ids parameter and trims spaces', async () => {
    const res = await request(app).get(`/compare?ids=%20${BLEU}%20&ids=${COCO}`);
    expect(columns(res.text)).toEqual([BLEU, COCO]);
  });

  it('never reflects IDs from the link into the page', async () => {
    const res = await request(app).get('/compare?ids=%3Cscript%3Ealert(1)%3C%2Fscript%3E');
    expect(res.status).toBe(404);
    expect(res.text).not.toContain('alert(1)');
  });
});
