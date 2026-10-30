import test from 'node:test';
import assert from 'node:assert/strict';
import { loadConfig } from '../server/dist/server/src/config.js';

test('loadConfig provides safe defaults without throwing', () => {
  const config = loadConfig();
  assert.equal(typeof config.port, 'number');
  assert.equal(typeof config.nodeEnv, 'string');
  assert.equal(typeof config.useQlooFixtures, 'boolean');
  assert.equal(typeof config.qlooApiBaseUrl, 'string');
});

test('loadConfig marks qlooApiKey undefined when env var is absent', () => {
  const originalKey = process.env.QLOO_API_KEY;
  delete process.env.QLOO_API_KEY;

  const config = loadConfig();
  assert.equal(config.qlooApiKey, undefined);

  if (originalKey) {
    process.env.QLOO_API_KEY = originalKey;
  }
});
