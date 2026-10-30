import { z } from 'zod';
import type { EvaluationReport } from './evaluationModel.js';

export const EvaluationStageEnum = z.enum([
  'evaluation_started',
  'resolving_entities',
  'fetching_evidence',
  'validating_contract',
  'evaluating_output',
  'evaluation_completed',
  'evaluation_failed',
  'evaluation_cancelled'
]);

export type EvaluationStage = z.infer<typeof EvaluationStageEnum>;

export const EvaluationProgressEventSchema = z.object({
  runId: z.string(),
  stage: EvaluationStageEnum,
  timestamp: z.string(),
  summary: z.string(),
  progressPercent: z.number().min(0).max(100),
  errorCode: z.string().optional()
});

export type EvaluationProgressEvent = z.infer<typeof EvaluationProgressEventSchema>;

export interface EvaluationJobStatus {
  runId: string;
  stage: EvaluationStage;
  createdAt: string;
  updatedAt: string;
  events: EvaluationProgressEvent[];
  report?: EvaluationReport;
  error?: string;
  isTerminal: boolean;
}
