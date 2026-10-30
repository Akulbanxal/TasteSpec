import express, { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import { loadConfig } from './config.js';
import { QlooClient } from './services/qlooClient.js';
import { ScenarioWorkflowService } from './services/scenarioWorkflowService.js';
import { EvaluationRunnerService } from './services/evalRunnerService.js';
import type { SystemHealthStatus } from '../../shared/src/index.js';

const config = loadConfig();
const app = express();

app.use(express.json());

const qlooClient = new QlooClient({
  apiKey: config.qlooApiKey,
  baseUrl: config.qlooApiBaseUrl
});

const workflowService = new ScenarioWorkflowService(qlooClient);
const runnerService = new EvaluationRunnerService(qlooClient);

const startTime = Date.now();

// Minimal health check endpoint - returns non-sensitive status only
app.get('/api/health', (_req: Request, res: Response) => {
  const health: SystemHealthStatus = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor((Date.now() - startTime) / 1000),
    environment: config.nodeEnv,
    qlooConfigured: Boolean(config.qlooApiKey),
    fixtureMode: config.useQlooFixtures,
    version: '0.1.0'
  };

  res.status(200).json(health);
});

// GET /api/scenarios - Return scenario templates
app.get('/api/scenarios', (_req: Request, res: Response) => {
  const templates = workflowService.getTemplates();
  res.status(200).json({ templates });
});

// POST /api/eval/run - Execute evaluation workflow directly
app.post('/api/eval/run', async (req: Request, res: Response) => {
  try {
    const result = await workflowService.runEvaluation(req.body);
    res.status(200).json(result);
  } catch (err: any) {
    res.status(400).json({
      error: err.message || 'Evaluation run failed'
    });
  }
});

// POST /api/eval/start - Start tracked evaluation run
app.post('/api/eval/start', async (req: Request, res: Response) => {
  try {
    const job = await runnerService.executeRun(req.body);
    res.status(200).json(job);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// GET /api/eval/:runId/status - Poll tracked evaluation run status and progress events
app.get('/api/eval/:runId/status', (req: Request, res: Response) => {
  const runId = String(req.params.runId);
  const status = runnerService.getJobStatus(runId);
  if (!status) {
    res.status(404).json({ error: 'Run identifier not found.' });
    return;
  }
  res.status(200).json(status);
});

// POST /api/eval/:runId/cancel - Explicit cancellation endpoint
app.post('/api/eval/:runId/cancel', (req: Request, res: Response) => {
  const runId = String(req.params.runId);
  const cancelled = runnerService.cancelJob(runId);
  res.status(200).json({ cancelled });
});

// Serve built client in production or when client/dist exists
if (fs.existsSync(config.clientDistPath)) {
  app.use(express.static(config.clientDistPath));
  app.get('*', (_req: Request, res: Response) => {
    res.sendFile(path.join(config.clientDistPath, 'index.html'));
  });
}

const server = app.listen(config.port, () => {
  console.log(`[TASTESPEC] Server listening on port ${config.port} (${config.nodeEnv})`);
  console.log(`[TASTESPEC] Qloo API configured: ${Boolean(config.qlooApiKey)} | Fixtures: ${config.useQlooFixtures}`);
});

export { app, server };
