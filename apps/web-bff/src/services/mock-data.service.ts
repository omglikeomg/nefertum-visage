import type { Request } from 'express';

import brandsJson from '../mocks/brands.json';
import histogramsJson from '../mocks/histograms.json';
import notesJson from '../mocks/notes.json';
import perfumesJson from '../mocks/perfumes.json';

import {
  SCALE_METRICS,
  SHELF_KINDS,
  type PerfumeDetailsBrand,
  type PerfumeDetailsNotePyramid,
  type PerfumeDetailsResult,
  type PerfumeDetailsScaleHistogram,
  type ScaleMetric,
  type ShelfKind,
} from '../types/domain.types';

// Derived from the domain types rather than re-listed, so the guards cannot
// drift from the union they validate.
const VALID_SHELVES: ReadonlySet<string> = new Set(SHELF_KINDS);
const VALID_METRICS: ReadonlySet<string> = new Set(SCALE_METRICS);

const BUCKET_MIN = 0;
const BUCKET_MAX = 4;

export function isShelfKind(value: string): value is ShelfKind {
  return VALID_SHELVES.has(value);
}

export function isScaleMetric(value: string): value is ScaleMetric {
  return VALID_METRICS.has(value);
}

// E13 — the mock JSON is parsed at module init. Anything malformed should fail
// loudly at boot rather than surfacing as an undefined deep inside a template.
function assert(condition: boolean, message: string): asserts condition {
  if (!condition) {
    throw new Error(`[web-bff] invalid mock data: ${message}`);
  }
}

interface RawPerfume {
  id: string;
  brandId: string;
  slug: string;
  name: string;
}

export class MockDataService {
  private readonly perfumeBySlug = new Map<string, PerfumeDetailsResult>();
  private readonly perfumeById = new Map<string, PerfumeDetailsResult>();
  private readonly currentShelf = new Map<string, ShelfKind>();

  constructor() {
    const brandById = new Map<string, PerfumeDetailsBrand>(
      brandsJson.map((brand) => [brand.id, brand]),
    );

    const notesBySlug = notesJson as Record<string, PerfumeDetailsNotePyramid>;
    const histogramsBySlug = histogramsJson as unknown as Record<
      string,
      PerfumeDetailsScaleHistogram[]
    >;

    for (const raw of perfumesJson as unknown as RawPerfume[]) {
      const brand = brandById.get(raw.brandId);
      assert(brand !== undefined, `perfume ${raw.slug} references unknown brand ${raw.brandId}`);

      const notes = notesBySlug[raw.slug];
      assert(notes !== undefined, `perfume ${raw.slug} has no note pyramid`);
      assert(
        Array.isArray(notes.top) && Array.isArray(notes.heart) && Array.isArray(notes.base),
        `perfume ${raw.slug} note pyramid is missing a tier`,
      );

      const scaleHistograms = histogramsBySlug[raw.slug];
      assert(Array.isArray(scaleHistograms), `perfume ${raw.slug} has no scale histograms`);
      for (const histogram of scaleHistograms) {
        assert(
          isScaleMetric(histogram.metric),
          `perfume ${raw.slug} has histogram with unknown metric ${histogram.metric}`,
        );
      }

      // Structured-clone so the in-memory vote mutations below never write back
      // into the imported JSON module cache.
      const perfume = {
        ...structuredClone(raw),
        brand,
        notes: structuredClone(notes),
        scaleHistograms: structuredClone(scaleHistograms),
      } as unknown as PerfumeDetailsResult;

      this.perfumeBySlug.set(perfume.slug, perfume);
      this.perfumeById.set(perfume.id, perfume);
    }

    assert(this.perfumeBySlug.size > 0, 'no perfumes loaded');
  }

  async getPerfumeBySlug(_req: Request, slug: string): Promise<PerfumeDetailsResult | null> {
    return this.perfumeBySlug.get(slug) ?? null;
  }

  async recordScaleVote(
    _req: Request,
    perfumeId: string,
    metric: ScaleMetric,
    bucket: number,
  ): Promise<PerfumeDetailsScaleHistogram | null> {
    if (!isScaleMetric(metric)) {
      return null;
    }

    if (!Number.isInteger(bucket) || bucket < BUCKET_MIN || bucket > BUCKET_MAX) {
      return null;
    }

    const perfume = this.perfumeById.get(perfumeId);
    if (perfume === undefined) {
      return null;
    }

    const histogram = perfume.scaleHistograms.find((entry) => entry.metric === metric);
    if (histogram === undefined) {
      return null;
    }

    const buckets = histogram.buckets as Record<number, number>;
    buckets[bucket] = (buckets[bucket] ?? 0) + 1;
    histogram.totalVotes += 1;

    return histogram;
  }

  async updateShelf(
    _req: Request,
    perfumeId: string,
    shelf: ShelfKind | null,
  ): Promise<{ currentShelf: ShelfKind | null } | null> {
    if (!this.perfumeById.has(perfumeId)) {
      return null;
    }

    if (shelf === null) {
      this.currentShelf.delete(perfumeId);
      return { currentShelf: null };
    }

    if (!isShelfKind(shelf)) {
      return null;
    }

    this.currentShelf.set(perfumeId, shelf);
    return { currentShelf: shelf };
  }

  async listFeatured(): Promise<PerfumeDetailsResult[]> {
    return [...this.perfumeBySlug.values()];
  }

  getCurrentShelf(perfumeId: string): ShelfKind | null {
    return this.currentShelf.get(perfumeId) ?? null;
  }
}
