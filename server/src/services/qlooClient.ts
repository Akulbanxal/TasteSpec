import {
  SearchInputSchema,
  InsightsInputSchema,
  RawSearchResponseSchema,
  RawInsightsResponseSchema,
  type SearchInput,
  type InsightsInput,
  type NormalizedEntity,
  type NormalizedInsightItem,
  type QlooQueryResult
} from './qlooTypes.js';
import { QlooClientError } from './qlooErrors.js';
import { SimpleTtlCache } from './qlooCache.js';

export interface QlooClientOptions {
  apiKey?: string;
  baseUrl?: string;
  timeoutMs?: number;
  maxRetries?: number;
  enableCache?: boolean;
  fetchFn?: typeof fetch;
}

export class QlooClient {
  private readonly apiKey?: string;
  private readonly baseUrl: string;
  private readonly timeoutMs: number;
  private readonly maxRetries: number;
  private readonly fetchFn: typeof fetch;
  private readonly searchCache = new SimpleTtlCache<NormalizedEntity[]>(10 * 60 * 1000, 100);
  private readonly insightsCache = new SimpleTtlCache<NormalizedInsightItem[]>(10 * 60 * 1000, 100);
  private readonly enableCache: boolean;

  constructor(options: QlooClientOptions = {}) {
    this.apiKey = options.apiKey?.trim();
    // Normalize base URL: strip trailing slash and optional trailing /v2
    const rawBase = (options.baseUrl || 'https://hackathon.api.qloo.com').replace(/\/+$/, '');
    this.baseUrl = rawBase.replace(/\/v2$/, '');
    this.timeoutMs = options.timeoutMs ?? 8000;
    this.maxRetries = options.maxRetries ?? 2;
    this.enableCache = options.enableCache ?? true;
    this.fetchFn = options.fetchFn ?? globalThis.fetch;
  }

  public isKeyConfigured(): boolean {
    return Boolean(this.apiKey && this.apiKey.length > 0);
  }

  /**
   * Search for cultural entities by name and domain filter
   */
  public async searchEntities(input: SearchInput): Promise<QlooQueryResult<NormalizedEntity>> {
    // 1. Validate Input
    const parseResult = SearchInputSchema.safeParse(input);
    if (!parseResult.success) {
      throw new QlooClientError('INVALID_INPUT', 'Invalid search parameters', {
        safeDetails: parseResult.error.issues.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')
      });
    }

    const valid = parseResult.data;
    const cacheKey = `search:${valid.query.toLowerCase()}:${valid.type || 'all'}:${valid.limit || 10}`;

    // 2. Check Cache
    if (this.enableCache) {
      const cached = this.searchCache.get(cacheKey);
      if (cached) {
        return {
          data: cached.data,
          metadata: {
            provenance: 'cache',
            latencyMs: 0,
            timestamp: cached.cachedAt
          }
        };
      }
    }

    // 3. Check Credentials
    this.assertApiKeyConfigured('/search');

    // 4. Construct URL
    const url = new URL(`${this.baseUrl}/search`);
    url.searchParams.set('query', valid.query);
    if (valid.type) url.searchParams.set('type', valid.type);
    if (valid.limit) url.searchParams.set('limit', String(valid.limit));

    // 5. Execute with Timeout & Retries
    const startTime = Date.now();
    const rawData = await this.executeRequestWithRetry(url.toString(), '/search');
    const latencyMs = Date.now() - startTime;

    // 6. Validate & Normalize Schema
    const schemaResult = RawSearchResponseSchema.safeParse(rawData);
    if (!schemaResult.success) {
      throw new QlooClientError('SCHEMA_MISMATCH', 'Search response structure did not match expected schema', {
        endpoint: '/search',
        safeDetails: schemaResult.error.message.slice(0, 200)
      });
    }

    const entities = schemaResult.data;
    if (this.enableCache && entities.length > 0) {
      this.searchCache.set(cacheKey, entities);
    }

    return {
      data: entities,
      metadata: {
        provenance: 'live_network',
        latencyMs,
        timestamp: new Date().toISOString()
      }
    };
  }

  /**
   * Query cross-domain taste insights and affinities given seed entities
   */
  public async getInsights(input: InsightsInput): Promise<QlooQueryResult<NormalizedInsightItem>> {
    // 1. Validate Input
    const parseResult = InsightsInputSchema.safeParse(input);
    if (!parseResult.success) {
      throw new QlooClientError('INVALID_INPUT', 'Invalid insights parameters', {
        safeDetails: parseResult.error.issues.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')
      });
    }

    const valid = parseResult.data;
    const cacheKey = `insights:${valid.seedEntityIds.sort().join(',')}:${valid.filterType}:${valid.limit || 20}`;

    // 2. Check Cache
    if (this.enableCache) {
      const cached = this.insightsCache.get(cacheKey);
      if (cached) {
        return {
          data: cached.data,
          metadata: {
            provenance: 'cache',
            latencyMs: 0,
            timestamp: cached.cachedAt
          }
        };
      }
    }

    // 3. Check Credentials
    this.assertApiKeyConfigured('/insights');

    // 4. Construct URL: strictly /v2/insights query parameters
    const url = new URL(`${this.baseUrl}/v2/insights`);
    url.searchParams.set('signal.interests.entities', valid.seedEntityIds.join(','));
    url.searchParams.set('filter.type', valid.filterType);
    if (valid.limit) url.searchParams.set('limit', String(valid.limit));

    // 5. Execute
    const startTime = Date.now();
    const rawData = await this.executeRequestWithRetry(url.toString(), '/v2/insights');
    const latencyMs = Date.now() - startTime;

    // 6. Validate & Normalize Schema
    const schemaResult = RawInsightsResponseSchema.safeParse(rawData);
    if (!schemaResult.success) {
      throw new QlooClientError('SCHEMA_MISMATCH', 'Insights response structure did not match expected schema', {
        endpoint: '/insights',
        safeDetails: schemaResult.error.message.slice(0, 200)
      });
    }

    const items = schemaResult.data;
    if (this.enableCache && items.length > 0) {
      this.insightsCache.set(cacheKey, items);
    }

    return {
      data: items,
      metadata: {
        provenance: 'live_network',
        latencyMs,
        timestamp: new Date().toISOString()
      }
    };
  }

  /**
   * Query valid Qloo tag IDs using GET /v2/tags
   */
  public async getTags(query?: string): Promise<QlooQueryResult<{ id: string; name: string }>> {
    this.assertApiKeyConfigured('/v2/tags');
    const url = new URL(`${this.baseUrl}/v2/tags`);
    if (query?.trim()) {
      url.searchParams.set('query', query.trim());
    }

    const startTime = Date.now();
    const rawData = await this.executeRequestWithRetry(url.toString(), '/v2/tags');
    const latencyMs = Date.now() - startTime;

    const items = Array.isArray(rawData) ? rawData : (rawData as any)?.data || (rawData as any)?.results || [];
    const normalized = items.map((item: any) => ({
      id: item.id || item.tag_id || item.tag || 'unknown_id',
      name: item.name || item.tag || 'Unknown'
    }));

    return {
      data: normalized,
      metadata: {
        provenance: 'live_network',
        latencyMs,
        timestamp: new Date().toISOString()
      }
    };
  }

  /**
   * Helper method for verification testing of assembled URLs
   */
  public getBaseUrl(): string {
    return this.baseUrl;
  }

  private assertApiKeyConfigured(endpoint: string): void {
    if (!this.apiKey) {
      throw new QlooClientError('MISSING_API_KEY', 'Qloo API key is missing. Ensure QLOO_API_KEY is configured on the server.', {
        endpoint
      });
    }
  }

  private async executeRequestWithRetry(url: string, endpoint: string): Promise<unknown> {
    let attempt = 0;
    let delay = 300;

    while (attempt <= this.maxRetries) {
      attempt++;
      try {
        return await this.fetchWithTimeout(url, endpoint);
      } catch (err: any) {
        const isClientError = err instanceof QlooClientError;
        const statusCode = isClientError ? err.statusCode : undefined;

        // Never retry client errors (400, 401, 403, 404, schema/input issues)
        if (statusCode && statusCode >= 400 && statusCode < 500 && statusCode !== 429) {
          throw err;
        }

        // If rate-limited (429) or transient 5xx, retry with exponential backoff if attempts remain
        if (attempt <= this.maxRetries) {
          const jitter = Math.floor(Math.random() * 150);
          await new Promise(resolve => setTimeout(resolve, delay + jitter));
          delay *= 2;
          continue;
        }

        throw err;
      }
    }

    throw new QlooClientError('SERVER_ERROR', 'Exceeded maximum request attempts', { endpoint });
  }

  private async fetchWithTimeout(url: string, endpoint: string): Promise<unknown> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await this.fetchFn(url, {
        method: 'GET',
        headers: {
          'X-Api-Key': this.apiKey || '',
          'Content-Type': 'application/json'
        },
        signal: controller.signal
      });

      clearTimeout(timer);

      if (!response.ok) {
        const status = response.status;
        let safeErrorText = `HTTP status ${status}`;
        try {
          const raw = await response.text();
          safeErrorText = raw.slice(0, 200).replace(/key=[^&\s]+/gi, 'key=[REDACTED]');
        } catch {
          // Ignore body read failure
        }

        if (status === 401 || status === 403) {
          throw new QlooClientError('UNAUTHORIZED', 'Invalid or unauthorized Qloo API credentials', {
            statusCode: status,
            endpoint
          });
        }
        if (status === 404) {
          throw new QlooClientError('NOT_FOUND', 'Requested resource or entity not found', {
            statusCode: status,
            endpoint
          });
        }
        if (status === 429) {
          throw new QlooClientError('RATE_LIMITED', 'Qloo API rate limit exceeded. Retry later.', {
            statusCode: status,
            endpoint
          });
        }

        throw new QlooClientError('SERVER_ERROR', `Qloo API responded with HTTP ${status}`, {
          statusCode: status,
          endpoint,
          safeDetails: safeErrorText
        });
      }

      try {
        return await response.json();
      } catch {
        throw new QlooClientError('MALFORMED_JSON', 'Failed to parse JSON response from Qloo API', {
          endpoint
        });
      }
    } catch (err: any) {
      clearTimeout(timer);
      if (err instanceof QlooClientError) {
        throw err;
      }
      if (err.name === 'AbortError') {
        throw new QlooClientError('TIMEOUT', `Request timed out after ${this.timeoutMs}ms`, {
          endpoint
        });
      }
      throw new QlooClientError('NETWORK_ERROR', `Network failure contacting Qloo API: ${err.message}`, {
        endpoint
      });
    }
  }
}
