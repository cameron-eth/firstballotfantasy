"""Reproducible public-data snapshot. Never substitutes ranks/KTC for missing ADP."""
import csv, datetime, io, json, os, re, subprocess, concurrent.futures, collections
from pathlib import Path
ROOT = Path(__file__).resolve().parents[1]
CACHE = Path(os.environ.get('OUTCOME_CACHE_DIR', '/tmp/firstballot-outcomes'))
CACHE.mkdir(parents=True, exist_ok=True)
def fetch(url, name, refresh=False):
    p = CACHE / name
    if refresh or not p.exists():
        data = subprocess.check_output(['curl','-fLsS','--max-time','60','-A','Mozilla/5.0',url])
        p.write_bytes(data)
    return p.read_text()
def norm(s):
    return re.sub(r'[^a-z0-9]', '', re.sub(r'\s+(jr\.?|sr\.?|ii|iii|iv)$', '', s.lower()))
now = datetime.date.today()
state = json.loads(fetch('https://api.sleeper.app/v1/state/nfl','state.json',True))
season = int(state['season'])
if state.get('season_type') == 'regular':
    week = max(0, int(state.get('week') or 1)-1)
elif state.get('season_type') == 'post':
    week = 18
else:
    season = int(state.get('previous_season') or season - 1)
    week = 18
ids = list(csv.DictReader(io.StringIO(fetch('https://raw.githubusercontent.com/dynastyprocess/data/master/files/db_playerids.csv','playerids.csv',True))))
identity_candidates = {r['sleeper_id']: {'espnId':r['espn_id'],'name':r['name'],'position':r['position']} for r in ids if r['sleeper_id'].isdigit() and r['espn_id'].isdigit()}
alias_counts = collections.Counter(r['espnId'] for r in identity_candidates.values())
identity_output = {k:v for k,v in identity_candidates.items() if alias_counts[v['espnId']]==1}

players = {}
identity = {}
for row in ids:
    try: year = int(row['draft_year'])
    except (ValueError, TypeError): continue
    if not 2010 <= year <= season or row['position'] not in ['QB','RB','WR','TE'] or not re.fullmatch(r'00-\d+',row['gsis_id']): continue
    key = (norm(row['name']), row['position'], year)
    identity.setdefault(key, set()).add(row['gsis_id'])
    players[row['gsis_id']] = dict(id=row['gsis_id'], espnId=row['espn_id'] if row['espn_id'].isdigit() else None, name=row['name'], position=row['position'], year=year, adp=None, adpCount=0, adpWindow=None, seasons={})
coverage=[];unmatched=[]
def adp(y):
    url=f'https://fantasyfootballcalculator.com/api/v1/adp/rookie?teams=12&year={y}'
    d=json.loads(fetch(url,f'adp-{y}.json', y==season))
    meta=d.get('meta',{})
    if d.get('status')=='Error' and d.get('errors')=='No ADP data found.':
        return y, {'players':[], 'meta':{'total_drafts':0}}
    if d.get('status')!='Success' or meta.get('type')!='Dynasty Rookie' or meta.get('teams')!=12: raise ValueError(f'Invalid ADP response {y}')
    start,end=meta.get('start_date',''),meta.get('end_date','')
    if not start.startswith(str(y)) or not end.startswith(str(y)): raise ValueError(f'Wrong ADP vintage {y}')
    return y,d
with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:
    archives=list(pool.map(adp,range(2010,season+1)))
for y,d in sorted(archives):
    count=0
    for row in d['players']:
        matches=identity.get((norm(row['name']),row['position'],y),set())
        if len(matches)!=1: unmatched.append({'year':y,'name':row['name']});continue
        p=players[next(iter(matches))]
        if not isinstance(row.get('adp'),(float,int)) or row['adp']<=0:continue
        # Never use an in-season or post-production ADP window as rookie acquisition cost.
        end=d['meta']['end_date']
        if end > f'{y}-09-06':continue
        p.update(adp=row['adp'],adpCount=row.get('times_drafted',0),adpWindow=[d['meta']['start_date'],end]);count+=1
    coverage.append({'year':y,'sourcePlayers':len(d['players']),'matchedPlayers':count,'drafts':d['meta']['total_drafts']})
# New nflverse stats schema is available from stats_player; legacy bundle covers through 2024.
legacy=list(csv.DictReader(io.StringIO(fetch('https://github.com/nflverse/nflverse-data/releases/download/player_stats/player_stats.csv','stats.csv'))))
rows=legacy
for y in range(2025,season+1):
    url=f'https://github.com/nflverse/nflverse-data/releases/download/stats_player/stats_player_week_{y}.csv'
    rows+=list(csv.DictReader(io.StringIO(fetch(url,f'stats-{y}.csv',True))))
seen=set();covered={}
for row in rows:
    if row['season_type']!='REG':continue
    y,w=int(row['season']),int(row['week'])
    if y>season or (y==season and w>week):continue
    covered.setdefault(y,set()).add(w)
    pid=row['player_id'];p=players.get(pid)
    if not p or y<p['year']:continue
    key=(pid,y,w)
    if key in seen:raise ValueError(f'Duplicate stat row {key}')
    seen.add(key)
    raw=row.get('fantasy_points_ppr')
    if raw in ('',None,'NA'):continue
    a=p['seasons'].setdefault(str(y),{'points':[0]*18,'games':0})
    a['points'][w-1]=round(float(raw),2);a['games']+=1
for y in range(2010,season+1):
    needed=week if y==season else (18 if y>=2021 else 17)
    if not set(range(1,needed+1)).issubset(covered.get(y,set())):raise ValueError(f'Incomplete league-wide stats coverage {y}')
# Retired and zero-production players remain in the cohort, not discarded as survivors.
result={'version':'rookie-adp-ppr-v1','generatedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'season':season,'week':week,'format':'12-team rookie ADP · PPR production','sources':['https://fantasyfootballcalculator.com/api/v1/adp/rookie','https://github.com/nflverse/nflverse-data','https://github.com/dynastyprocess/data'],'coverage':coverage,'unmatchedAdp':unmatched,'players':list(players.values())}
out=ROOT/'data/history-outcomes.json'
if out.exists():
    old=json.loads(out.read_text())
    if (season,week)<(old['season'],old['week']):raise ValueError('Refusing coverage regression')
out.write_text(json.dumps(result,separators=(',',':'))+'\n')
(ROOT/'data/nfl-player-identities.json').write_text(json.dumps(identity_output,separators=(',',':'))+'\n')
print(json.dumps({'players':len(players),'adpMatched':sum(p['adp'] is not None for p in players.values()),'asOf':[season,week],'coverage':coverage,'unmatched':unmatched},indent=2))
