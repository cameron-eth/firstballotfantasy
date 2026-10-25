"""Import every valid SDK snapshot into one server-only archive. Run after SDK snapshot_ktc.py."""
import json, sys
from pathlib import Path
source = Path(sys.argv[1])
output = Path(sys.argv[2] if len(sys.argv) > 2 else 'data/ktc-history.json')
players, dates, skipped = {}, [], []
for path in sorted(source.glob('????-??-??.json')):
    snapshot = json.loads(path.read_text())
    rows = snapshot.get('players', [])
    if len(rows) < 100:
        skipped.append(path.stem)
        continue
    date = snapshot['date']
    if date != path.stem:
        raise ValueError('Snapshot date mismatch')
    dates.append(date)
    for row in rows:
        pid = str(row['ktc_id'])
        entry = players.setdefault(pid, {'names': [], 'history': []})
        if row['name'] not in entry['names']: entry['names'].append(row['name'])
        entry.update(name=row['name'], position=row['position'], team=row['team'])
        values = [row[k] for k in ['sf_value','oqb_value','sf_rank','oqb_rank']]
        if not all(isinstance(v, (int,float)) and v >= 0 for v in values): raise ValueError('Invalid values')
        entry['history'].append([date, *values])
if not dates: raise ValueError('No valid snapshots')
output.parent.mkdir(parents=True, exist_ok=True)
output.write_text(json.dumps({'source':'cameron-eth/sleeper-sdk', 'dates':dates,'skipped':skipped,'players':players}, separators=(',',':'))+'\n')
print(f'Imported {len(dates)} snapshots, {sum(len(p["history"]) for p in players.values())} values, {len(players)} assets; skipped {len(skipped)} empty snapshots.')
