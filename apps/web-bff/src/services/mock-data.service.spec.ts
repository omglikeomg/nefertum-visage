import { beforeEach, describe, expect, it } from 'vitest';
import type { Request } from 'express';

import { MockDataService } from './mock-data.service';
import type { ScaleMetric, ShelfKind } from '../types/domain.types';

const req = {} as Request;

const KNOWN_SLUG = 'bleu-de-chanel';
const KNOWN_ID = 'perfume-bleu-de-chanel';

describe('MockDataService', () => {
  let service: MockDataService;

  beforeEach(() => {
    service = new MockDataService();
  });

  describe('getPerfumeBySlug', () => {
    it('returns the perfume for a known slug', async () => {
      const perfume = await service.getPerfumeBySlug(req, KNOWN_SLUG);

      expect(perfume).not.toBeNull();
      expect(perfume?.name).toBe('Bleu de Chanel');
      expect(perfume?.brand.name).toBe('Chanel');
    });

    it('returns null for an unknown slug', async () => {
      expect(await service.getPerfumeBySlug(req, 'not-a-real-perfume')).toBeNull();
    });

    it('joins the note pyramid and scale histograms onto the result', async () => {
      const perfume = await service.getPerfumeBySlug(req, KNOWN_SLUG);

      expect(perfume?.notes.top.length).toBeGreaterThan(0);
      expect(perfume?.notes.heart.length).toBeGreaterThan(0);
      expect(perfume?.notes.base.length).toBeGreaterThan(0);
      expect(perfume?.scaleHistograms.length).toBe(4);
    });
  });

  describe('recordScaleVote', () => {
    it('increments the bucket and totalVotes, returning the updated histogram', async () => {
      const before = await service.getPerfumeBySlug(req, KNOWN_SLUG);
      const target = before?.scaleHistograms.find((h) => h.metric === 'LONGEVITY');
      const bucketBefore = target?.buckets[3] ?? 0;
      const totalBefore = target?.totalVotes ?? 0;

      const updated = await service.recordScaleVote(req, KNOWN_ID, 'LONGEVITY', 3);

      expect(updated).not.toBeNull();
      expect(updated?.metric).toBe('LONGEVITY');
      expect(updated?.buckets[3]).toBe(bucketBefore + 1);
      expect(updated?.totalVotes).toBe(totalBefore + 1);
    });

    it('returns null for an unknown perfumeId', async () => {
      expect(await service.recordScaleVote(req, 'nope', 'LONGEVITY', 2)).toBeNull();
    });

    it('returns null for an unknown metric', async () => {
      const bogus = 'NOT_A_METRIC' as ScaleMetric;

      expect(await service.recordScaleVote(req, KNOWN_ID, bogus, 2)).toBeNull();
    });

    it('returns null for an out-of-range bucket', async () => {
      expect(await service.recordScaleVote(req, KNOWN_ID, 'LONGEVITY', 99)).toBeNull();
      expect(await service.recordScaleVote(req, KNOWN_ID, 'LONGEVITY', -1)).toBeNull();
      expect(await service.recordScaleVote(req, KNOWN_ID, 'LONGEVITY', 1.5)).toBeNull();
    });

    it('does not leak mutations across service instances', async () => {
      await service.recordScaleVote(req, KNOWN_ID, 'LONGEVITY', 3);

      const fresh = new MockDataService();
      const perfume = await fresh.getPerfumeBySlug(req, KNOWN_SLUG);
      const histogram = perfume?.scaleHistograms.find((h) => h.metric === 'LONGEVITY');

      expect(histogram?.totalVotes).toBe(825);
    });
  });

  describe('updateShelf', () => {
    it('sets the current shelf', async () => {
      const result = await service.updateShelf(req, KNOWN_ID, 'HAVE');

      expect(result).toEqual({ currentShelf: 'HAVE' });
      expect(service.getCurrentShelf(KNOWN_ID)).toBe('HAVE');
    });

    it('accepts null to remove the perfume from a shelf', async () => {
      await service.updateShelf(req, KNOWN_ID, 'HAVE');

      const result = await service.updateShelf(req, KNOWN_ID, null);

      expect(result).toEqual({ currentShelf: null });
      expect(service.getCurrentShelf(KNOWN_ID)).toBeNull();
    });

    it('returns null for an unknown perfumeId', async () => {
      expect(await service.updateShelf(req, 'nope', 'HAVE')).toBeNull();
    });

    it('returns null for an invalid shelf kind', async () => {
      const bogus = 'NOT_A_SHELF' as ShelfKind;

      expect(await service.updateShelf(req, KNOWN_ID, bogus)).toBeNull();
    });
  });

  describe('listFeatured', () => {
    it('returns the five mock perfumes across three brands', async () => {
      const featured = await service.listFeatured();

      expect(featured).toHaveLength(5);
      expect(new Set(featured.map((p) => p.brand.name))).toEqual(
        new Set(['Chanel', 'Tom Ford', 'Maison Margiela']),
      );
    });
  });

  describe('getCurrentShelf', () => {
    it('returns null when the perfume is not on a shelf', () => {
      expect(service.getCurrentShelf(KNOWN_ID)).toBeNull();
    });
  });
});
