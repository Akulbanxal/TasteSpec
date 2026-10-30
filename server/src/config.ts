import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env
dotenv.config();

export interface ServerConfig {
  port: number;
  nodeEnv: string;
  qlooApiKey?: string;
  qlooApiBaseUrl: string;
  useQlooFixtures: boolean;
  clientDistPath: string;
}

export function loadConfig(): ServerConfig {
  const port = parseInt(process.env.PORT || '3001', 10);
  const nodeEnv = process.env.NODE_ENV || 'development';
  const qlooApiKey = process.env.QLOO_API_KEY?.trim() || undefined;
  const qlooApiBaseUrl = (process.env.QLOO_API_BASE_URL || 'https://hackathon.api.qloo.com').replace(/\/+$/, '').replace(/\/v2$/, '');
  const useQlooFixtures = process.env.USE_QLOO_FIXTURES === 'true';
  const clientDistPath = path.resolve(process.cwd(), 'client/dist');

  return {
    port,
    nodeEnv,
    qlooApiKey,
    qlooApiBaseUrl,
    useQlooFixtures,
    clientDistPath
  };
}
