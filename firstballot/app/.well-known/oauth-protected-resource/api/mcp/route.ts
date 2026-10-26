import {getSupabaseUrl} from '@/lib/supabase-config'
import {mcpResource} from '@/lib/platform/oauth'
export async function GET(){
 if(process.env.MCP_OAUTH_ENABLED!=='true')return Response.json({error:'OAuth is not configured.'},{status:503})
 return Response.json({resource:mcpResource(),authorization_servers:[`${getSupabaseUrl()}/auth/v1`],scopes_supported:['openid'],bearer_methods_supported:['header'],resource_name:'First Ballot'},{headers:{'Access-Control-Allow-Origin':'*','Cache-Control':'public, max-age=300'}})
}
