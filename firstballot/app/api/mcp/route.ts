import { observed } from '@/lib/platform/observe'
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js'
import { z } from 'zod'
import { mcpAccount, mcpResource } from '@/lib/platform/oauth'
import { listTeams, teamRoster } from '@/lib/platform/api-service'
import { playerData } from '@/lib/platform/player-data'
import { PlatformError, fail, failure } from '@/lib/platform/http'
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export async function POST(request: Request) {
  try {
    const origin = request.headers.get('origin')
    const allowed = (
      process.env.MCP_ALLOWED_ORIGINS ??
      process.env.NEXT_PUBLIC_BASE_URL ??
      'https://www.firstballotff.com'
    ).split(',')
    if (origin && !allowed.includes(origin))
      throw new PlatformError(403, 'ORIGIN_NOT_ALLOWED', 'Origin not allowed.')
    const principal = await mcpAccount(request)
    const server = new McpServer({ name: 'first-ballot', version: '1.0.0' })
    const result = (data: unknown) => ({
      content: [{ type: 'text' as const, text: JSON.stringify(data) }],
    })
    server.registerTool(
      'list_teams',
      {
        description: 'List the teams explicitly permitted by this connection.',
        annotations: { readOnlyHint: true, openWorldHint: false },
      },
      async () => result(await listTeams(principal))
    )
    server.registerTool(
      'get_roster',
      {
        description: 'Read an active team roster with freshness metadata.',
        inputSchema: { teamId: z.string().uuid() },
        annotations: { readOnlyHint: true, openWorldHint: false },
      },
      async ({ teamId }) => result(await teamRoster(principal, teamId))
    )
    server.registerTool(
      'get_player_stats',
      {
        description:
          'Current-season PPR actual FPPG and positional rank. Source timestamps are explicitly reported.',
        inputSchema: {
          playerIds: z
            .array(z.string().regex(/^\w{1,30}$/))
            .min(1)
            .max(100),
        },
        annotations: { readOnlyHint: true, openWorldHint: false },
      },
      async ({ playerIds }) => {
        if (!principal.scopes.includes('players:read')) throw new Error('Insufficient scope')
        return result(await playerData(playerIds))
      }
    )
    const transport = new WebStandardStreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
      enableJsonResponse: true,
      maxRequestBodySize: 16384,
    })
    await server.connect(transport)
    try {
      return await observed(principal, 'mcp_request', () => transport.handleRequest(request))
    } finally {
      await server.close()
    }
  } catch (e) {
    const response = failure(e)
    if (e instanceof PlatformError && e.status === 401 && process.env.MCP_OAUTH_ENABLED === 'true')
      response.headers.set(
        'WWW-Authenticate',
        `Bearer resource_metadata="${new URL(mcpResource()).origin}/.well-known/oauth-protected-resource/api/mcp"`
      )
    return response
  }
}
export async function GET() {
  return fail(405, 'Use POST for stateless MCP requests.')
}
export async function DELETE() {
  return fail(405, 'This MCP endpoint is stateless. Revoke access in Settings.')
}
