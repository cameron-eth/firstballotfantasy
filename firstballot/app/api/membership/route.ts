import {webAccount} from '@/lib/platform/auth'
import {billingFor} from '@/lib/platform/teams'
import {teamCapacity} from '@/lib/platform/policy'
import {failure,json} from '@/lib/platform/http'
export async function GET(request:Request) {
 try {const p=await webAccount(request);const capacity=teamCapacity(await billingFor(p.accountId));return json({isMember:capacity!==1,teamCapacity:capacity})}catch(e){return failure(e)}
}
