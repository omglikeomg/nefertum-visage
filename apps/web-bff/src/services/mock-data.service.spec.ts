import { beforeEach, describe, expect, it } from 'vitest';
import type { Request } from 'express';

import { MockDataService, toComparisonItem } from './mock-data.service';
import type { ScaleMetric, ShelfKind } from '../types/domain.types';

const req = {} as Request;

const KNOWN_SLUG = 'bleu-de-chanel';
const KNOWN_ID = 'perfume-bleu-de-chanel';
const COCO_ID = 'perfume-coco-mademoiselle';

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

  describe('getPerfumesForComparison', () => {
    it('COMPARE-API-1: returns brand, name, slug, notes and longevity then sillage histograms', async () => {
      const [item] = await service.getPerfumesForComparison(req, [KNOWN_ID]);
      expect(item).toMatchObject({
        id: KNOWN_ID,
        name: 'Bleu de Chanel',
        slug: KNOWN_SLUG,
        brand: { name: 'Chanel' },
      });
      expect(item.notes.top.map((n) => n.canonicalName)).toContain('Grapefruit');
      expect(item.scaleHistograms.map((h) => h.metric)).toEqual(['LONGEVITY', 'SILLAGE']);
    });

    it('COMPARE-API-2: keeps input order', async () => {
      const items = await service.getPerfumesForComparison(req, [COCO_ID, KNOWN_ID]);
      expect(items.map((p) => p.id)).toEqual([COCO_ID, KNOWN_ID]);
    });

    it('COMPARE-API-3: returns a repeated ID once', async () => {
      const items = await service.getPerfumesForComparison(req, [KNOWN_ID, COCO_ID, KNOWN_ID]);
      expect(items.map((p) => p.id)).toEqual([KNOWN_ID, COCO_ID]);
    });

    it('COMPARE-API-4: omits unknown IDs without an error', async () => {
      const items = await service.getPerfumesForComparison(req, ['nope', KNOWN_ID, '']);
      expect(items.map((p) => p.id)).toEqual([KNOWN_ID]);
    });

    it('COMPARE-API-5: rejects more than 50 IDs', async () => {
      await expect(
        service.getPerfumesForComparison(req, Array(51).fill(KNOWN_ID)),
      ).rejects.toThrow('At most 50 perfume IDs can be compared at once.');
    });

    it('does not share bucket state with the detail data', async () => {
      const [before] = await service.getPerfumesForComparison(req, [KNOWN_ID]);
      const longevityBefore = [...before.scaleHistograms[0].buckets];
      await service.recordScaleVote(req, KNOWN_ID, 'LONGEVITY', 0);
      expect(before.scaleHistograms[0].buckets).toEqual(longevityBefore);
      const [after] = await service.getPerfumesForComparison(req, [KNOWN_ID]);
      expect(after.scaleHistograms[0].buckets[0]).toBe(longevityBefore[0] + 1);
    });
  });

  describe('toComparisonItem', () => {
    it('COMPARE-API-6: converts buckets to five counts by code and zero-fills a missing metric', async () => {
      const perfume = (await service.getPerfumeBySlug(req, KNOWN_SLUG))!;
      const item = toComparisonItem({
        ...perfume,
        scaleHistograms: [
          { metric: 'LONGEVITY', buckets: { 0: 1, 1: 2, 2: 3, 3: 4, 4: 5 }, totalVotes: 15 },
        ],
      });
      expect(item.scaleHistograms).toEqual([
        { metric: 'LONGEVITY', buckets: [1, 2, 3, 4, 5], totalVotes: 15 },
        { metric: 'SILLAGE', buckets: [0, 0, 0, 0, 0], totalVotes: 0 },
      ]);
    });
  });
});
