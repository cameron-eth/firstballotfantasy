"""Refresh 2027 college production from ESPN athlete IDs without changing scout grades.

Dry-run by default. Pass --apply with Supabase service credentials to persist.
ESPN's public athlete feed has no source update timestamp, so the snapshot records
when we checked it and the season covered, never an invented source-observed time.
"""

import argparse
import concurrent.futures
import datetime as dt
import hashlib
import json
import os
import re
import time
import urllib.error
import urllib.parse
import urllib.request


YEAR = 2027
STAT_NAMES = {
    "passing": {
        "completions": "pass_comp", "passingAttempts": "pass_att",
        "passingYards": "pass_yds", "passingTouchdowns": "pass_tds",
        "interceptions": "pass_int",
    },
    "rushing": {
        "rushingAttempts": "rush_att", "rushingYards": "rush_yds",
        "rushingTouchdowns": "rush_tds",
    },
    "receiving": {
        "receptions": "rec", "receivingYards": "rec_yds",
        "receivingTouchdowns": "rec_tds",
    },
}


def get_json(url, headers=None):
    request = urllib.request.Request(url, headers={"User-Agent": "FirstBallot/1.0", **(headers or {})})
    for attempt in range(3):
        try:
            with urllib.request.urlopen(request, timeout=20) as response:
                return json.load(response)
        except urllib.error.HTTPError as error:
            if error.code not in (429, 500, 502, 503, 504) or attempt == 2:
                raise
        except urllib.error.URLError:
            if attempt == 2:
                raise
        time.sleep(0.5 * (2 ** attempt))


def name_key(value):
    return re.sub(r"[^a-z]", "", re.sub(r"\b(jr|sr|ii|iii|iv)\b", "", value.lower()))


def parse_stats(document, max_season):
    by_year = {}
    seen = set()
    for category in document.get("categories", []):
        mapping = STAT_NAMES.get(category.get("name"))
        if not mapping:
            continue
        names = category.get("names", [])
        for entry in category.get("statistics", []):
            year = entry.get("season", {}).get("year")
            if not isinstance(year, int) or year > max_season:
                continue
            key = (year, category["name"])
            if key in seen:
                raise ValueError(f"duplicate {category['name']} season {year}")
            seen.add(key)
            values = entry.get("stats", [])
            if len(names) != len(values):
                raise ValueError(f"stats schema changed for {category['name']} {year}")
            for label, value in zip(names, values):
                target = mapping.get(label)
                if target and value not in (None, "", "-"):
                    number = float(str(value).replace(",", ""))
                    if not number.is_integer():
                        raise ValueError(f"non-integer {label} {year}")
                    by_year.setdefault(year, {})[target] = int(number)
    return by_year


def inspect_player(row, season):
    espn_id = row.get("espn_id")
    if not espn_id:
        return {"id": row["id"], "reason": "missing_espn_id"}
    base = f"https://site.web.api.espn.com/apis/common/v3/sports/football/college-football/athletes/{espn_id}"
    query = "?region=us&lang=en&contentorigin=espn"
    try:
        profile = get_json(base + query).get("athlete", {})
        if str(profile.get("id")) != str(espn_id) or name_key(profile.get("displayName", "")) != name_key(row["name"]):
            return {"id": row["id"], "reason": "identity_mismatch"}
        by_year = parse_stats(get_json(base + "/stats" + query), season)
        previous = row.get("college_stats") or {}
        previous_years = set(previous.get("seasons_played") or [])
        if previous_years - set(by_year):
            return {"id": row["id"], "reason": "historical_coverage_missing"}
        if season not in by_year:
            return {"id": row["id"], "reason": "current_season_missing"}
        totals = {key: sum(stats.get(key, 0) for stats in by_year.values())
                  for mapping in STAT_NAMES.values() for key in mapping.values()
                  if any(key in stats for stats in by_year.values())}
        if totals.get("pass_att"):
            totals["comp_pct"] = round(100 * totals.get("pass_comp", 0) / totals["pass_att"], 1)
        updated = dict(previous)
        updated.update(totals)
        updated.pop("total_games", None)  # Old CFBD game count ended in 2025.
        updated["seasons_played"] = sorted(by_year)
        updated["seasons"] = len(by_year)
        updated["espn_stats_years_scanned"] = sorted(by_year)
        updated["espn_current_season"] = season
        return {"id": row["id"], "stats": updated, "espnId": espn_id, "seasons": sorted(by_year)}
    except (urllib.error.URLError, TimeoutError, ValueError, KeyError, TypeError) as error:
        return {"id": row["id"], "reason": type(error).__name__}


def supabase_json(base, key, path, method="GET", body=None, prefer=None):
    headers = {"apikey": key, "Authorization": f"Bearer {key}", "Content-Type": "application/json"}
    if prefer:
        headers["Prefer"] = prefer
    data = json.dumps(body).encode() if body is not None else None
    request = urllib.request.Request(base.rstrip("/") + "/rest/v1/" + path,
                                     headers=headers, data=data, method=method)
    with urllib.request.urlopen(request, timeout=30) as response:
        content = response.read()
        return json.loads(content) if content else None


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--apply", action="store_true")
    parser.add_argument("--public-dry-run", action="store_true",
                        help="Inspect the public production prospect list without database credentials")
    parser.add_argument("--season", type=int, default=YEAR - 1)
    args = parser.parse_args()
    if args.apply and args.public_dry_run:
        parser.error("--apply cannot be combined with --public-dry-run")
    base = os.environ.get("SUPABASE_URL") or os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
    if args.public_dry_run:
        rows = get_json(f"https://www.firstballotff.com/api/prospects?draft_year={YEAR}")
    else:
        if not base or not key:
            parser.error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required")
        rows = supabase_json(base, key, f"dynasty_prospects?select=id,name,espn_id,college_stats&draft_year=eq.{YEAR}&order=id&limit=1000")
    if len(rows) < 50:
        raise RuntimeError(f"Unexpected {YEAR} class size: {len(rows)}")
    with concurrent.futures.ThreadPoolExecutor(max_workers=5) as pool:
        results = list(pool.map(lambda row: inspect_player(row, args.season), rows))
    accepted = [result for result in results if "stats" in result]
    skipped = [result for result in results if "reason" in result]
    # A partial provider failure must never be presented as a successful class refresh.
    if len(accepted) / len(rows) < 0.95:
        raise RuntimeError(f"Coverage below 95%: {len(accepted)}/{len(rows)}; reasons: "
                           + json.dumps({reason: sum(x["reason"] == reason for x in skipped)
                                         for reason in {x["reason"] for x in skipped}}))
    checked_at = dt.datetime.now(dt.timezone.utc)
    summary = {"draftYear": YEAR, "statSeason": args.season, "recordCount": len(rows),
               "verifiedCount": len(accepted), "currentSeasonStatCount": len(accepted),
               "skipped": skipped, "sourceUrl": "https://site.web.api.espn.com/apis/common/v3/sports/football/college-football/athletes/{espn_id}/stats",
               "checkedAt": checked_at.isoformat()}
    if args.apply:
        for result in accepted:
            path = f"dynasty_prospects?id=eq.{result['id']}&draft_year=eq.{YEAR}"
            updated_rows = supabase_json(base, key, path, "PATCH", {"college_stats": result["stats"],
                                                                    "updated_at": checked_at.isoformat()},
                                         "return=representation")
            if not isinstance(updated_rows, list) or len(updated_rows) != 1:
                raise RuntimeError(f"Expected one updated prospect row for ID {result['id']}")
        snapshot = {"key": f"prospects:{YEAR}:espn", "source": "ESPN college athlete statistics",
                    "payload": summary, "fetched_at": checked_at.isoformat(), "source_observed_at": None,
                    "expires_at": (checked_at + dt.timedelta(days=7)).isoformat(),
                    "quality": "unverified", "season": args.season, "week": None,
                    "content_hash": hashlib.sha256(json.dumps(summary, sort_keys=True).encode()).hexdigest()}
        supabase_json(base, key, "data_snapshots?on_conflict=key", "POST", snapshot,
                      "resolution=merge-duplicates,return=minimal")
    print(json.dumps({"applied": args.apply, **summary}, indent=2))


if __name__ == "__main__":
    main()
