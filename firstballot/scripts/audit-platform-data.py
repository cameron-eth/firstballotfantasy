"""Read-only quality audit. Prints aggregates, never account records or credentials."""
import os,json,urllib.request,collections,datetime
from pathlib import Path
root=Path(__file__).resolve().parent.parent
for line in (root/'.env.local').read_text().splitlines() if (root/'.env.local').exists() else []:
 if '=' in line and not line.startswith('#'):
  k,v=line.split('=',1);os.environ.setdefault(k,v.strip().strip('"'))
base=os.environ.get('SUPABASE_URL') or os.environ['NEXT_PUBLIC_SUPABASE_URL'];key=os.environ['SUPABASE_SERVICE_ROLE_KEY']
def rows(table,columns):
 result=[]
 for offset in range(0,100000,1000):
  req=urllib.request.Request(f'{base}/rest/v1/{table}?select={columns}&order=id&offset={offset}&limit=1000',headers={'apikey':key,'Authorization':f'Bearer {key}'})
  page=json.load(urllib.request.urlopen(req,timeout=30));result.extend(page)
  if len(page)<1000:return result
 raise RuntimeError('Audit exceeded pagination limit')
p=rows('dynasty_prospects','id,name,position,school,espn_id,sleeper_id,draft_year,overall_grade,updated_at')
identities=json.loads((root/'data/nfl-player-identities.json').read_text())
aliases=collections.Counter(v['espnId'] for v in identities.values())
names=collections.Counter((r['name'].casefold().strip(),r['draft_year'],r['school']) for r in p)
print(json.dumps({'auditedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'prospectRows':len(p),'duplicateNameClassSchoolGroups':sum(v>1 for v in names.values()),'missingEspnIdentity':sum(not r['espn_id'] for r in p),'ungraded':sum(r['overall_grade'] is None for r in p),'invalidGrade':sum(r['overall_grade'] is not None and not 0<=float(r['overall_grade'])<=100 for r in p),'identityRows':len(identities),'ambiguousEspnAliases':sum(v>1 for v in aliases.values()),'notes':['updated_at is row edit time, not source observation time.','No records deleted or merged. Ambiguous identities require provider evidence.']},indent=2))
