import { loadConfig } from './config.js';

interface SmokeTestResult {
  endpoint: string;
  url: string;
  status: number;
  latencyMs: number;
  hasUsefulResults: boolean;
  resultSummary?: string;
  error?: string;
}

async function runSmokeTest(): Promise<void> {
  console.log('====================================================');
  console.log('TASTESPEC — Qloo API Integration Smoke Test');
  console.log('====================================================');

  const config = loadConfig();

  // Check whether API key is configured
  if (!config.qlooApiKey) {
    console.log('[SMOKE TEST RESULT] NOT RUN: Missing API key');
    console.log('Reason: process.env.QLOO_API_KEY is not configured or empty.');
    console.log('To run live tests, set QLOO_API_KEY in your local .env file.');
    console.log('====================================================');
    // Exit with clear indication of test not running
    process.exit(0);
  }

  // Key is present - execute sanitized checks without printing the key
  console.log('[AUTH] API Key detected (Key is masked for security: ***' + config.qlooApiKey.slice(-4) + ')');
  console.log(`[CONFIG] Base URL: ${config.qlooApiBaseUrl}`);

  const results: SmokeTestResult[] = [];

  // Test 1: Search Endpoint with real resolvable seed (e.g. "Radiohead")
  const searchSeed = 'Radiohead';
  const searchUrl = `${config.qlooApiBaseUrl}/search?query=${encodeURIComponent(searchSeed)}&type=urn:entity:artist`;
  console.log(`\n[TEST 1] Testing Search endpoint with seed: "${searchSeed}"...`);
  console.log(`[URL 1] GET ${searchUrl}`);

  let resolvedEntityId: string | undefined;

  const t0 = Date.now();
  try {
    const res = await fetch(searchUrl, {
      method: 'GET',
      headers: {
        'X-Api-Key': config.qlooApiKey,
        'Content-Type': 'application/json'
      }
    });

    const latencyMs = Date.now() - t0;
    const status = res.status;

    if (!res.ok) {
      const errText = await res.text();
      results.push({
        endpoint: '/search',
        url: searchUrl.replace(config.qlooApiKey, '[REDACTED]'),
        status,
        latencyMs,
        hasUsefulResults: false,
        error: `HTTP ${status}: ${errText.slice(0, 150)}`
      });
      console.log(`[TEST 1 RESULT] HTTP ${status} in ${latencyMs}ms — Error`);
    } else {
      const data: any = await res.json();
      const items = Array.isArray(data.results) ? data.results : Array.isArray(data) ? data : data.data || [];
      const hasUseful = items.length > 0;
      
      if (hasUseful && items[0]) {
        resolvedEntityId = items[0].id || items[0].entity_id;
      }

      results.push({
        endpoint: '/search',
        url: searchUrl,
        status,
        latencyMs,
        hasUsefulResults: hasUseful,
        resultSummary: `Found ${items.length} matching entities. First resolved ID: ${resolvedEntityId || 'N/A'}`
      });
      console.log(`[TEST 1 RESULT] HTTP 200 in ${latencyMs}ms — Found ${items.length} items (Resolved ID: ${resolvedEntityId || 'none'}).`);
    }
  } catch (err: any) {
    results.push({
      endpoint: '/search',
      url: searchUrl,
      status: 0,
      latencyMs: Date.now() - t0,
      hasUsefulResults: false,
      error: err.message
    });
    console.log(`[TEST 1 RESULT] Network failure: ${err.message}`);
  }

  // Test 2: Insights Endpoint using GET /v2/insights
  const entityIdForInsights = resolvedEntityId || 'urn:entity:artist:radiohead';
  const insightsUrl = `${config.qlooApiBaseUrl}/v2/insights?signal.interests.entities=${encodeURIComponent(entityIdForInsights)}&filter.type=urn:tag`;
  console.log(`\n[TEST 2] Testing Insights endpoint with entity anchor: "${entityIdForInsights}"...`);
  console.log(`[URL 2] GET ${insightsUrl}`);

  const t1 = Date.now();
  try {
    const res = await fetch(insightsUrl, {
      method: 'GET',
      headers: {
        'X-Api-Key': config.qlooApiKey,
        'Content-Type': 'application/json'
      }
    });

    const latencyMs = Date.now() - t1;
    const status = res.status;

    if (!res.ok) {
      const errText = await res.text();
      results.push({
        endpoint: '/v2/insights',
        url: insightsUrl,
        status,
        latencyMs,
        hasUsefulResults: false,
        error: `HTTP ${status}: ${errText.slice(0, 150)}`
      });
      console.log(`[TEST 2 RESULT] HTTP ${status} in ${latencyMs}ms — Error`);
    } else {
      const data: any = await res.json();
      const items = Array.isArray(data)
        ? data
        : Array.isArray(data.results)
        ? data.results
        : Array.isArray(data.data)
        ? data.data
        : data.entities || [];
      const count = Array.isArray(items) ? items.length : 0;
      results.push({
        endpoint: '/v2/insights',
        url: insightsUrl,
        status,
        latencyMs,
        hasUsefulResults: count > 0,
        resultSummary: `Received ${count} insight items.`
      });
      console.log(`[TEST 2 RESULT] HTTP 200 in ${latencyMs}ms — Received ${count} insight items.`);
    }
  } catch (err: any) {
    results.push({
      endpoint: '/v2/insights',
      url: insightsUrl,
      status: 0,
      latencyMs: Date.now() - t1,
      hasUsefulResults: false,
      error: err.message
    });
    console.log(`[TEST 2 RESULT] Network failure: ${err.message}`);
  }

  // Output Sanitized Summary Table
  console.log('\n====================================================');
  console.log('SMOKE TEST EXECUTION SUMMARY:');
  for (const r of results) {
    console.log(`- ${r.endpoint}: Status=${r.status}, Latency=${r.latencyMs}ms, UsefulResults=${r.hasUsefulResults}`);
    if (r.resultSummary) console.log(`  Summary: ${r.resultSummary}`);
    if (r.error) console.log(`  Error: ${r.error}`);
  }
  console.log('====================================================\n');
}

runSmokeTest();
