import { tool } from 'ai';
import { z } from 'zod';

/**
 * Interface representing the JSON-RPC 2.0 structure used by the Model Context Protocol (MCP)
 */
interface McpJsonRpcRequest {
  jsonrpc: '2.0';
  id: string | number;
  method: 'tools/call';
  params: {
    name: string;
    arguments: Record<string, unknown>;
  };
}

interface McpContentItem {
  type: string;
  text?: string;
  data?: unknown;
}

interface McpJsonRpcResponse {
  jsonrpc: '2.0';
  id: string | number;
  result?: {
    content?: McpContentItem[];
    isError?: boolean;
    [key: string]: unknown;
  };
  error?: {
    code: number;
    message: string;
    data?: unknown;
  };
}

/**
 * Direct GROQ query to Sanity Content Lake as a resilient fallback
 * for the Knowledge Base when Sanity Context MCP server is in configuration or offline.
 */
async function querySanityKnowledgeLake(query: string) {
  const projectId = process.env.SANITY_PROJECT_ID;
  const dataset = process.env.SANITY_DATASET || 'production';
  const token = process.env.SANITY_ORGANIZATION_TOKEN;

  if (!projectId) return null;

  const groq = `*[_type == "movie"]{
    _id,
    title,
    releaseYear,
    synopsis,
    cbfcRating->{ ratingCode, minimumAge, description },
    triggerWarnings[]->{ hazard, severity, category, clinicalDescription, timestamps, affectedDemographics },
    "applicableRules": *[_type == "accessibilityRule" && references(^.triggerWarnings[]._ref)]{
      ruleCode,
      title,
      targetDemographic,
      restrictionLevel,
      triggerCondition,
      restrictionDetails,
      source
    }
  }`;

  const url = `https://${projectId}.api.sanity.io/v2024-01-01/data/query/${dataset}?query=${encodeURIComponent(groq)}`;

  try {
    const response = await fetch(url, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      cache: 'no-store',
    });

    if (!response.ok) return null;
    const data = await response.json();
    const allMovies: any[] = data.result || [];

    const lowerQuery = query.toLowerCase();

    // 1. Direct title match in user prompt (e.g. "Inception", "The Dark Knight", "Oppenheimer")
    const titleMatches = allMovies.filter((m) =>
      lowerQuery.includes(m.title.toLowerCase())
    );
    if (titleMatches.length > 0) return titleMatches;

    // 2. Discovery / Multi-constraint queries (e.g. "suggest a thriller for an epileptic minor", "what is safe?"):
    // Return the full verified catalog so the agent can perform full-dataset constraint evaluation and safe filtering!
    return allMovies;
  } catch (err) {
    console.error('FlixGuard Content Lake query error:', err);
    return null;
  }
}

/**
 * Invoke tool via Model Context Protocol (MCP) HTTP JSON-RPC 2.0 endpoint.
 */
export async function callSanityContextMcp(
  toolName: string,
  args: Record<string, unknown>
): Promise<unknown> {
  const mcpUrl = process.env.SANITY_CONTEXT_MCP_URL;
  const orgToken = process.env.SANITY_ORGANIZATION_TOKEN;

  if (!mcpUrl) {
    throw new Error('SANITY_CONTEXT_MCP_URL environment variable is not defined.');
  }

  const payload: McpJsonRpcRequest = {
    jsonrpc: '2.0',
    id: `mcp-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
    method: 'tools/call',
    params: {
      name: toolName,
      arguments: args,
    },
  };

  const response = await fetch(mcpUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${orgToken || ''}`,
      'X-Sanity-Organization-Token': orgToken || '',
      Accept: 'application/json, text/event-stream',
    },
    body: JSON.stringify(payload),
    cache: 'no-store',
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => '');
    throw new Error(
      `Sanity Context MCP server error (HTTP ${response.status}): ${errorText || response.statusText}`
    );
  }

  const jsonRpcRes: McpJsonRpcResponse = await response.json();
  if (jsonRpcRes.error) {
    throw new Error(`MCP tool call error (${jsonRpcRes.error.code}): ${jsonRpcRes.error.message}`);
  }

  const contentItems = jsonRpcRes.result?.content;
  if (Array.isArray(contentItems) && contentItems.length > 0) {
    const textEntry = contentItems.find((item) => item.type === 'text');
    if (textEntry?.text) {
      try {
        return JSON.parse(textEntry.text);
      } catch {
        return textEntry.text;
      }
    }
  }

  return jsonRpcRes.result;
}

/**
 * Vercel AI SDK Tool definition for searching the Sanity Compliance Knowledge Base.
 */
export const searchKnowledgeBase = tool({
  description:
    'Search the Sanity Compliance Knowledge Base for verified Movie records, CBFC age ratings, trigger warnings, and medical/statutory accessibility rules. MANDATORY: You must call this tool before making ANY safety or compliance determination.',
  parameters: z.object({
    query: z
      .string()
      .describe(
        'The search query (e.g. film title like "Inception", "The Dark Knight", or medical hazard like "strobe epilepsy")'
      ),
    demographic: z
      .string()
      .optional()
      .describe(
        'Specific demographic or vulnerable group to filter by (e.g., "Photosensitive Epilepsy", "Children Under 12", "PTSD", "Cardiac")'
      ),
    hazardCategory: z
      .enum([
        'photosensitivity',
        'auditory',
        'violence',
        'psychological',
        'substances',
        'phobias',
        'any',
      ])
      .optional()
      .describe('Specific category of hazard to filter against in Sanity records.'),
  }),
  execute: async ({ query, demographic, hazardCategory }) => {
    try {
      // 1. Fast path: Direct query to Sanity Content Lake (completes in ~100ms)
      let evidence: unknown = await querySanityKnowledgeLake(query);

      // 2. If Content Lake returned empty and MCP is configured, try MCP with a strict 1s timeout
      const initialMatches = Array.isArray(evidence) ? evidence : (evidence ? [evidence] : []);
      if (initialMatches.length === 0 && process.env.SANITY_CONTEXT_MCP_URL) {
        try {
          const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('MCP timeout')), 1000)
          );
          evidence = await Promise.race([
            callSanityContextMcp('search_knowledge_base', {
              query,
              demographic,
              hazardCategory,
            }),
            timeoutPromise,
          ]);
        } catch {
          // MCP timed out or unconfigured; keep evidence as-is
        }
      }

      const matches = Array.isArray(evidence) ? evidence : (evidence ? [evidence] : []);
      const found = matches.length > 0;

      return {
        found,
        groundedAt: new Date().toISOString(),
        query,
        demographic: demographic || 'all',
        evidence: found ? evidence : null,
        status: found ? 'VERIFIED_SANITY_DATA' : 'NO_RECORDS_FOUND',
        ...(found
          ? {}
          : {
              instruction:
                'COMPLIANCE DATA UNAVAILABLE: The movie or condition was not found in the Sanity Knowledge Base. Follow the ZERO-GUESS policy and inform the user that compliance data is unverified.',
            }),
      };
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      return {
        found: false,
        groundedAt: new Date().toISOString(),
        query,
        demographic: demographic || 'all',
        evidence: null,
        status: 'UNVERIFIED_DATA_SOURCE',
        error: `Could not retrieve verified Sanity evidence: ${errorMessage}`,
        instruction:
          'DO NOT GUESS OR ESTIMATE. Clearly inform the user that compliance data is unverified or unavailable in the Sanity Knowledge Base.',
      };
    }
  },
});
