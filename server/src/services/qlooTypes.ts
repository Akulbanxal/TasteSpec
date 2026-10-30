import { z } from 'zod';

// ==========================================
// Input Validation Schemas
// ==========================================

export const SearchInputSchema = z.object({
  query: z.string().trim().min(1, 'Search query must not be empty').max(200, 'Search query too long'),
  type: z.enum(['music', 'film', 'brand', 'place', 'book', 'podcast', 'tv', 'person']).optional(),
  limit: z.number().int().min(1).max(50).default(10).optional()
});

export type SearchInput = z.infer<typeof SearchInputSchema>;

export const InsightsInputSchema = z.object({
  seedEntityIds: z.array(z.string().trim().min(1)).min(1, 'At least one seed entity ID is required').max(10),
  filterType: z.string().trim().regex(/^urn:[a-z0-9_:-]+$/, 'filterType must be a valid URN (e.g., urn:tag, urn:entity:brand)'),
  limit: z.number().int().min(1).max(50).default(20).optional()
});

export type InsightsInput = z.infer<typeof InsightsInputSchema>;

// ==========================================
// Normalized Domain Types
// ==========================================

export interface NormalizedEntity {
  id: string;
  name: string;
  domain?: string;
  type?: string;
  attributes?: string[];
  popularity?: number;
}

export interface NormalizedInsightItem {
  id: string;
  name: string;
  type: string;
  affinityScore?: number;
}

export interface QlooResponseMetadata {
  provenance: 'live_network' | 'cache' | 'fixture';
  latencyMs: number;
  timestamp: string;
}

export interface QlooQueryResult<T> {
  data: T[];
  metadata: QlooResponseMetadata;
}

// ==========================================
// Raw Response Schemas (Derived strictly from verified docs)
// ==========================================

export const RawEntitySchema = z.object({
  id: z.string().optional(),
  entity_id: z.string().optional(),
  name: z.string().optional().default('Unknown'),
  type: z.string().optional(),
  subtype: z.string().optional(),
  domain: z.string().optional(),
  popularity: z.number().optional(),
  tags: z.array(z.string()).optional()
}).transform((raw): NormalizedEntity => {
  return {
    id: raw.id || raw.entity_id || 'unknown_id',
    name: raw.name,
    domain: raw.domain || raw.type,
    type: raw.subtype || raw.type,
    attributes: raw.tags,
    popularity: raw.popularity
  };
});

export const RawInsightItemSchema = z.object({
  id: z.string().optional(),
  tag_id: z.string().optional(),
  entity_id: z.string().optional(),
  name: z.string().optional(),
  tag: z.string().optional(),
  type: z.string().optional(),
  score: z.number().optional(),
  affinity: z.number().optional()
}).transform((raw): NormalizedInsightItem => {
  return {
    id: raw.id || raw.entity_id || raw.tag_id || 'unknown_id',
    name: raw.name || raw.tag || 'Unknown',
    type: raw.type || 'unknown',
    affinityScore: raw.affinity !== undefined ? raw.affinity : raw.score
  };
});

// Envelopes can be raw arrays or wrapped under data/results
export const RawSearchResponseSchema = z.union([
  z.array(RawEntitySchema),
  z.object({ data: z.array(RawEntitySchema) }).transform(obj => obj.data),
  z.object({ results: z.array(RawEntitySchema) }).transform(obj => obj.results)
]);

export const RawInsightsResponseSchema = z.union([
  z.array(RawInsightItemSchema),
  z.object({ data: z.array(RawInsightItemSchema) }).transform(obj => obj.data),
  z.object({ results: z.array(RawInsightItemSchema) }).transform(obj => obj.results)
]);
