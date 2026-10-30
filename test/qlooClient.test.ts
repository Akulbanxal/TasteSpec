import test from 'node:test';
import assert from 'node:assert/strict';
import { QlooClient } from '../server/src/services/qlooClient.js';
import { QlooClientError } from '../server/src/services/qlooErrors.js';

// ==========================================
// Synthetic Fixtures (Clearly synthetic for testing)
// ==========================================

const SYNTHETIC_SEARCH_FIXTURE = [
  {
    id: 'ent_synth_film_001',
    name: 'Synthetic Cinema Masterpiece',
    type: 'film',
    subtype: 'independent_drama',
    popularity: 88,
    tags: ['cerebral', 'atmospheric']
  },
  {
    id: 'ent_synth_film_002',
    name: 'Synthetic Soundscapes',
    type: 'music',
    subtype: 'post_rock',
    popularity: 76,
    tags: ['ambient', 'experimental']
  }
];

const SYNTHETIC_WRAPPED_INSIGHTS_FIXTURE = {
  data: [
    {
      id: 'tag_synth_natural_wine',
      name: 'Natural Wine Bar',
      type: 'tag',
      affinity: 0.89
    },
    {
      id: 'tag_synth_specialty_coffee',
      name: 'Specialty Pour-over',
      type: 'tag',
      affinity: 0.84
    }
  ]
};

// ==========================================
// Unit Tests: Input Validation & Missing Key
// ==========================================

test('QlooClient throws MISSING_API_KEY when key is omitted', async () => {
  const client = new QlooClient({ apiKey: undefined });

  await assert.rejects(
    async () => {
      await client.searchEntities({ query: 'Radiohead' });
    },
    (err: any) => {
      assert(err instanceof QlooClientError);
      assert.equal(err.code, 'MISSING_API_KEY');
      return true;
    }
  );
});

test('QlooClient validates search query input before network call', async () => {
  const client = new QlooClient({ apiKey: 'fake_key_for_test' });

  await assert.rejects(
    async () => {
      // Empty query should fail validation immediately
      await client.searchEntities({ query: '   ' });
    },
    (err: any) => {
      assert(err instanceof QlooClientError);
      assert.equal(err.code, 'INVALID_INPUT');
      return true;
    }
  );
});

test('QlooClient validates insights URN and seed inputs before network call', async () => {
  const client = new QlooClient({ apiKey: 'fake_key_for_test' });

  await assert.rejects(
    async () => {
      // Invalid URN format
      await client.getInsights({
        seedEntityIds: ['ent_1'],
        filterType: 'invalid-urn-without-prefix'
      });
    },
    (err: any) => {
      assert(err instanceof QlooClientError);
      assert.equal(err.code, 'INVALID_INPUT');
      return true;
    }
  );
});

// ==========================================
// Unit Tests: Synthetic Network & Normalization
// ==========================================

test('QlooClient parses and normalizes synthetic search results', async () => {
  const mockFetch: typeof fetch = async (input, init) => {
    // Assert auth header is properly attached
    const headers = init?.headers as Record<string, string>;
    assert.equal(headers['X-Api-Key'], 'synthetic_test_token');

    return new Response(JSON.stringify(SYNTHETIC_SEARCH_FIXTURE), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  };

  const client = new QlooClient({
    apiKey: 'synthetic_test_token',
    fetchFn: mockFetch,
    enableCache: false
  });

  const res = await client.searchEntities({ query: 'Synthetic Cinema', type: 'film' });
  assert.equal(res.metadata.provenance, 'live_network');
  assert.equal(res.data.length, 2);
  assert.equal(res.data[0].id, 'ent_synth_film_001');
  assert.equal(res.data[0].name, 'Synthetic Cinema Masterpiece');
  assert.equal(res.data[0].domain, 'film');
});

test('QlooClient parses and normalizes synthetic wrapped insights', async () => {
  const mockFetch: typeof fetch = async () => {
    return new Response(JSON.stringify(SYNTHETIC_WRAPPED_INSIGHTS_FIXTURE), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  };

  const client = new QlooClient({
    apiKey: 'synthetic_test_token',
    fetchFn: mockFetch,
    enableCache: false
  });

  const res = await client.getInsights({
    seedEntityIds: ['ent_synth_film_001'],
    filterType: 'urn:tag'
  });

  assert.equal(res.data.length, 2);
  assert.equal(res.data[0].id, 'tag_synth_natural_wine');
  assert.equal(res.data[0].name, 'Natural Wine Bar');
  assert.equal(res.data[0].affinityScore, 0.89);
});

test('QlooClient transparently handles caching with accurate provenance metadata', async () => {
  let callCount = 0;
  const mockFetch: typeof fetch = async () => {
    callCount++;
    return new Response(JSON.stringify(SYNTHETIC_SEARCH_FIXTURE), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  };

  const client = new QlooClient({
    apiKey: 'synthetic_test_token',
    fetchFn: mockFetch,
    enableCache: true
  });

  // Call 1: Live Network
  const res1 = await client.searchEntities({ query: 'CacheTest' });
  assert.equal(res1.metadata.provenance, 'live_network');
  assert.equal(callCount, 1);

  // Call 2: Returned from Cache (distinct provenance, zero fetch calls)
  const res2 = await client.searchEntities({ query: 'CacheTest' });
  assert.equal(res2.metadata.provenance, 'cache');
  assert.equal(callCount, 1);
});

test('QlooClient handles 401 Unauthorized distinctly without infinite retry', async () => {
  let callCount = 0;
  const mockFetch: typeof fetch = async () => {
    callCount++;
    return new Response(JSON.stringify({ message: 'Invalid API Key' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  };

  const client = new QlooClient({
    apiKey: 'bad_token',
    fetchFn: mockFetch,
    maxRetries: 3
  });

  await assert.rejects(
    async () => {
      await client.searchEntities({ query: 'Radiohead' });
    },
    (err: any) => {
      assert(err instanceof QlooClientError);
      assert.equal(err.code, 'UNAUTHORIZED');
      assert.equal(err.statusCode, 401);
      return true;
    }
  );

  // 401 should NOT be retried
  assert.equal(callCount, 1);
});

test('QlooClient handles timeouts cleanly', async () => {
  const mockFetch: typeof fetch = async (_input, init) => {
    return new Promise((_, reject) => {
      init?.signal?.addEventListener('abort', () => {
        const error = new Error('The operation was aborted');
        error.name = 'AbortError';
        reject(error);
      });
    });
  };

  const client = new QlooClient({
    apiKey: 'token',
    fetchFn: mockFetch,
    timeoutMs: 50,
    maxRetries: 0
  });

  await assert.rejects(
    async () => {
      await client.searchEntities({ query: 'TimeoutSeed' });
    },
    (err: any) => {
      assert(err instanceof QlooClientError);
      assert.equal(err.code, 'TIMEOUT');
      return true;
    }
  );
});

test('QlooClient constructs correct URL paths without double /v2 prefix', async () => {
  const capturedUrls: string[] = [];
  const mockFetch: typeof fetch = async (input, init) => {
    capturedUrls.push(input.toString());
    const headers = init?.headers as Record<string, string>;
    assert.equal(headers['X-Api-Key'], 'test_key');
    assert.equal(headers['Content-Type'], 'application/json');

    return new Response(JSON.stringify([]), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  };

  // Test with base URL ending with /v2
  const clientWithV2 = new QlooClient({
    baseUrl: 'https://hackathon.api.qloo.com/v2',
    apiKey: 'test_key',
    fetchFn: mockFetch,
    enableCache: false
  });

  await clientWithV2.searchEntities({ query: 'Radiohead' });
  await clientWithV2.getInsights({ seedEntityIds: ['ent_1'], filterType: 'urn:tag' });
  await clientWithV2.getTags('rock');

  assert.equal(capturedUrls[0], 'https://hackathon.api.qloo.com/search?query=Radiohead&limit=10');
  assert.equal(capturedUrls[1], 'https://hackathon.api.qloo.com/v2/insights?signal.interests.entities=ent_1&filter.type=urn%3Atag&limit=20');
  assert.equal(capturedUrls[2], 'https://hackathon.api.qloo.com/v2/tags?query=rock');

  // Verify none contain double /v2/v2
  for (const u of capturedUrls) {
    assert.equal(u.includes('/v2/v2'), false, `URL must not contain /v2/v2: ${u}`);
  }
});

test('QlooClient handles empty results array successfully without throwing', async () => {
  const mockFetch: typeof fetch = async () => {
    return new Response(JSON.stringify({ data: [] }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  };

  const client = new QlooClient({
    apiKey: 'test_key',
    fetchFn: mockFetch,
    enableCache: false
  });

  const res = await client.searchEntities({ query: 'NonexistentEntity' });
  assert.equal(res.data.length, 0);
  assert.equal(res.metadata.provenance, 'live_network');
});

test('QlooClient detects malformed responses and classifies as SCHEMA_MISMATCH', async () => {
  const mockFetch: typeof fetch = async () => {
    // Return completely unexpected schema object that is neither array nor { data: [] }
    return new Response(JSON.stringify({ unexpectedKey: 12345 }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  };

  const client = new QlooClient({
    apiKey: 'test_key',
    fetchFn: mockFetch,
    enableCache: false
  });

  await assert.rejects(
    async () => {
      await client.searchEntities({ query: 'Something' });
    },
    (err: any) => {
      assert(err instanceof QlooClientError);
      assert.equal(err.code, 'SCHEMA_MISMATCH');
      return true;
    }
  );
});

// ==========================================
// Live Tests (Skipped automatically if no live key is present)
// ==========================================

test('LIVE Qloo API Smoke Test (Skipped when QLOO_API_KEY is unset)', async (t) => {
  const liveKey = process.env.QLOO_API_KEY?.trim();
  if (!liveKey) {
    t.skip('Skipped live test: QLOO_API_KEY not provided in environment');
    return;
  }

  const client = new QlooClient({ apiKey: liveKey });
  const searchRes = await client.searchEntities({ query: 'Radiohead', type: 'music' });
  assert(searchRes.data.length > 0, 'Expected at least one live search entity');

  const firstId = searchRes.data[0].id;
  const insightsRes = await client.getInsights({
    seedEntityIds: [firstId],
    filterType: 'urn:tag'
  });

  assert(insightsRes.data.length > 0, 'Expected live insights results');
});

