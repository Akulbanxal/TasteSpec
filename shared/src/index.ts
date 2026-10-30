/**
 * TASTESPEC Shared Contracts and Types
 */

export type EvaluationVerdict = 'SUPPORTED' | 'UNSUPPORTED' | 'UNVERIFIABLE' | 'CONSTRAINT_VIOLATION';

export interface SystemHealthStatus {
  status: 'healthy' | 'degraded';
  timestamp: string;
  uptimeSeconds: number;
  environment: string;
  qlooConfigured: boolean;
  fixtureMode: boolean;
  version: string;
}

export interface CulturalScenario {
  id: string;
  title: string;
  personaName: string;
  description: string;
  seedEntities: Array<{
    name: string;
    domain: string;
    qlooId?: string;
  }>;
  targetDomain: string;
  constraints: {
    minAffinityScore: number;
    forbiddenAttributes?: string[];
    requiredAttributes?: string[];
  };
}

export interface AgentOutputItem {
  name: string;
  domain: string;
  reasoning?: string;
}

export interface AgentOutputPayload {
  scenarioId: string;
  recommendations: AgentOutputItem[];
  rawText?: string;
}

// Re-export shared evaluation data model
export * from './evaluationModel.js';
export * from './progressEvents.js';
export * from './evidenceLedger.js';
