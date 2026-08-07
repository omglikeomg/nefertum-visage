// Mirrors the source-of-truth types in nefertum-nest:
//   apps/api/src/application/catalog/perfume/queries/get-perfume-details/get-perfume-details.types.ts
//
// Drift between this file and that one is a bug (AC15). Two deliberate
// deviations, both forced by the transport boundary:
//
//   1. `PerfumeDetailsReview.createdAt` is `string` here, `Date` upstream.
//      The BFF receives JSON over the wire, where dates are ISO-8601 strings.
//   2. `AccordSource` and `ScaleMetric` are declared locally as string unions.
//      Upstream they come from `@prisma/client` and a domain value-object the
//      BFF does not depend on. Values verified against
//      repos/nefertum-nest/prisma/schema.prisma:22,37,87.
//
// Per hub-specs/specs/coding-standards.md these are `as const` / union types,
// never TypeScript `enum`.

export const SHELF_KINDS = [
  'HAVE',
  'HAD',
  'WANT',
  'WANT_TO_TRY',
  'FAVORITES',
  'CUSTOM',
] as const;
export type ShelfKind = (typeof SHELF_KINDS)[number];

export const SCALE_METRICS = ['GENDER', 'LONGEVITY', 'SILLAGE', 'VALUE'] as const;
export type ScaleMetric = (typeof SCALE_METRICS)[number];

export const ACCORD_SOURCES = ['MANUAL', 'COMPUTED'] as const;
export type AccordSource = (typeof ACCORD_SOURCES)[number];

export interface PerfumeDetailsBrand {
  id: string;
  name: string;
  slug: string;
}

export interface PerfumeDetailsCollection {
  id: string;
  name: string;
  slug: string;
}

export interface PerfumeDetailsPerfumer {
  id: string;
  name: string;
  slug: string;
  role: string;
}

export interface PerfumeDetailsNote {
  noteId: string;
  canonicalName: string;
  slug: string;
  order: number;
}

export interface PerfumeDetailsNotePyramid {
  top: PerfumeDetailsNote[];
  heart: PerfumeDetailsNote[];
  base: PerfumeDetailsNote[];
}

export interface PerfumeDetailsAccord {
  id: string;
  name: string;
  slug: string;
  source: AccordSource;
  weight: number;
}

export interface PerfumeDetailsScaleHistogram {
  metric: ScaleMetric;
  buckets: Readonly<Record<number, number>>;
  totalVotes: number;
}

export interface PerfumeDetailsRelation {
  perfumeId: string;
  name: string;
  slug: string;
  imageUrl: string | null;
  score: number;
  upvotes: number;
  downvotes: number;
}

export interface PerfumeDetailsReview {
  id: string;
  title: string | null;
  content: string;
  authorUsername: string;
  score: number;
  createdAt: string;
}

export interface PerfumeDetailsResult {
  id: string;
  brand: PerfumeDetailsBrand;
  collection: PerfumeDetailsCollection | null;
  name: string;
  slug: string;
  description: string | null;
  imageUrl: string | null;
  storeUrl: string | null;
  releaseYear: number | null;
  discontinued: boolean;
  discontinuationNotes: string | null;
  perfumers: PerfumeDetailsPerfumer[];
  notes: PerfumeDetailsNotePyramid;
  accords: PerfumeDetailsAccord[];
  scaleHistograms: PerfumeDetailsScaleHistogram[];
  remindsMeOf: PerfumeDetailsRelation[];
  peopleAlsoLike: PerfumeDetailsRelation[];
  latestReviews: PerfumeDetailsReview[];
}
