import { URL } from 'url';
import net from 'net';
import { type AgentRecommendationItem } from '../../../shared/src/evaluationModel.js';

export interface AdapterCallResult {
  recommendations: AgentRecommendationItem[];
  rawResponseText: string;
}

export class AgentAdapterError extends Error {
  public readonly code: string;
  constructor(code: string, message: string) {
    super(message);
    this.name = 'AgentAdapterError';
    this.code = code;
  }
}

/**
 * Validates a target URL to ensure strict SSRF protection.
 * Only HTTPS is allowed. Loopback, private IP ranges, link-local, and cloud metadata IPs are rejected.
 */
export function validateAdapterUrl(rawUrl: string): URL {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw new AgentAdapterError('INVALID_URL', 'Adapter target URL is not a valid URL.');
  }

  // 1. Enforce HTTPS only
  if (parsed.protocol !== 'https:') {
    throw new AgentAdapterError('INSECURE_PROTOCOL', 'Adapter URL must use HTTPS protocol.');
  }

  const hostname = parsed.hostname.toLowerCase();

  // 2. Reject localhost / loopback names
  if (hostname === 'localhost' || hostname.endsWith('.localhost') || hostname.endsWith('.local')) {
    throw new AgentAdapterError('SSRF_FORBIDDEN', 'Loopback and local hostnames are forbidden.');
  }

  // 3. Reject cloud metadata and internal IPs
  if (
    hostname === '169.254.169.254' ||
    hostname === 'metadata.google.internal' ||
    hostname === 'metadata.internal'
  ) {
    throw new AgentAdapterError('SSRF_FORBIDDEN', 'Requests to cloud metadata endpoints are strictly forbidden.');
  }

  // 4. Check raw IP addresses for private ranges
  if (net.isIP(hostname)) {
    if (isPrivateOrReservedIp(hostname)) {
      throw new AgentAdapterError('SSRF_FORBIDDEN', `Target IP address ${hostname} is private or reserved.`);
    }
  }

  return parsed;
}

function isPrivateOrReservedIp(ip: string): boolean {
  if (ip === '127.0.0.1' || ip === '::1' || ip === '0.0.0.0') return true;

  const parts = ip.split('.').map(p => parseInt(p, 10));
  if (parts.length === 4) {
    // 10.0.0.0/8
    if (parts[0] === 10) return true;
    // 172.16.0.0/12
    if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;
    // 192.168.0.0/16
    if (parts[0] === 192 && parts[1] === 168) return true;
    // 169.254.0.0/16 (link-local)
    if (parts[0] === 169 && parts[1] === 254) return true;
  }

  return false;
}

/**
 * Call a configured agent adapter safely without exposing Qloo credentials
 */
export async function invokeAgentAdapter(
  adapterUrl: string,
  scenarioContext: {
    personaName: string;
    seeds: Array<{ name: string; domain: string }>;
    targetDomain: string;
  },
  timeoutMs: number = 7000
): Promise<AdapterCallResult> {
  const verifiedUrl = validateAdapterUrl(adapterUrl);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(verifiedUrl.toString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'TasteSpec-AgentAdapter-Runner/1.0'
        // NOTE: Qloo API Key is NEVER forwarded or included
      },
      body: JSON.stringify({
        scenario: scenarioContext,
        instruction: `Provide recommendations in domain ${scenarioContext.targetDomain} tailored to persona ${scenarioContext.personaName}.`
      }),
      signal: controller.signal
    });

    clearTimeout(timer);

    if (!res.ok) {
      throw new AgentAdapterError('ADAPTER_HTTP_ERROR', `Adapter responded with HTTP status ${res.status}`);
    }

    const rawText = await res.text();
    let data: any;
    try {
      data = JSON.parse(rawText);
    } catch {
      throw new AgentAdapterError('MALFORMED_ADAPTER_JSON', 'Adapter response is not valid JSON.');
    }

    const itemsRaw = Array.isArray(data) ? data : data.recommendations || data.items || [];
    const recommendations: AgentRecommendationItem[] = itemsRaw.map((it: any) => ({
      rawName: typeof it === 'string' ? it : it.name || it.rawName || 'Unknown',
      domain: (it.domain || scenarioContext.targetDomain) as any,
      agentClaimedReasoning: it.reasoning || it.agentClaimedReasoning,
      agentClaimedAffinity: typeof it.claimedAffinity === 'number' ? it.claimedAffinity : it.agentClaimedAffinity
    }));

    return {
      recommendations,
      rawResponseText: rawText
    };
  } catch (err: any) {
    clearTimeout(timer);
    if (err instanceof AgentAdapterError) throw err;
    if (err.name === 'AbortError') {
      throw new AgentAdapterError('ADAPTER_TIMEOUT', `Adapter call timed out after ${timeoutMs}ms.`);
    }
    throw new AgentAdapterError('ADAPTER_NETWORK_ERROR', `Failed to reach adapter: ${err.message}`);
  }
}
