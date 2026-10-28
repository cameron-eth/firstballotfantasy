"""Refresh college production for every upcoming draft class from ESPN, without changing scout grades.

Also fills missing ESPN athlete IDs (--find-ids) from ESPN search, accepting only an unambiguous
NCAAF match on name and school. Dry-run by default. Pass --apply with Supabase service credentials to persist.
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


def next_draft_class(today=None):
    """The next class to be drafted. Same rule as lib/draft-years.ts: the draft is in late
    April, so a class is upcoming through April of its year (tests/draft-years.test.mjs)."""
    today = today or dt.datetime.now(dt.timezone.utc).date()
    return today.year if today.month < 5 else today.year + 1


def upcoming_classes(offsets, today=None):
    """Class years by offset from the next class: offset 0 is the next draft."""
    first = next_draft_class(today)
    return [first + offset for offset in offsets]


# A next class smaller than this means the query came back partial, not that it shrank.
NEXT_CLASS_MIN_ROWS = 50
DEFAULT_MIN_ROWS = 10
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


def school_key(value):
    return re.sub(r"[^a-z]", "", (value or "").lower())


def find_espn_id(row):
    """Unique NCAAF player whose name matches and whose team label contains the school, else a reason."""
    query = urllib.parse.quote(row["name"])
    try:
        found = get_json(f"https://site.web.api.espn.com/apis/search/v2?query={query}&limit=10&type=player")
    except (urllib.error.URLError, TimeoutError, ValueError) as error:
        return {"id": row["id"], "reason": type(error).__name__}
    contents = [c for group in found.get("results", []) if group.get("type") == "player"
                for c in group.get("contents", [])]
    matches = [c for c in contents
               if c.get("description") == "NCAAF"
               and name_key(c.get("displayName", "")) == name_key(row["name"])
               and school_key(row.get("school")) in school_key(c.get("subtitle"))]
    if len(matches) != 1:
        return {"id": row["id"], "reason": "no_match" if not matches else "ambiguous"}
    uid = matches[0].get("uid", "")
    espn_id = uid.rsplit("~a:", 1)[-1] if "~a:" in uid else ""
    if not espn_id.isdigit():
        return {"id": row["id"], "reason": "no_id_in_result"}
    return {"id": row["id"], "espnId": int(espn_id), "team": matches[0].get("subtitle"),
            "image": (matches[0].get("image") or {}).get("default")}


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


def refresh_year(base, key, year, args):
    if args.public_dry_run:
        rows = get_json(f"https://www.firstballotff.com/api/prospects?draft_year={year}")
    else:
        rows = supabase_json(base, key, f"dynasty_prospects?select=id,name,school,espn_id,headshot_url,college_stats&draft_year=eq.{year}&order=id&limit=1000")
    if len(rows) < (NEXT_CLASS_MIN_ROWS if year == next_draft_class() else DEFAULT_MIN_ROWS):
        raise RuntimeError(f"Unexpected {year} class size: {len(rows)}")
    checked_at = dt.datetime.now(dt.timezone.utc)
    ids = []
    if args.find_ids:
        missing = [row for row in rows if not row.get("espn_id")]
        with concurrent.futures.ThreadPoolExecutor(max_workers=5) as pool:
            ids = list(pool.map(find_espn_id, missing))
        for result in ids:
            if "espnId" not in result:
                continue
            row = next(r for r in rows if r["id"] == result["id"])
            row["espn_id"] = result["espnId"]
            if args.apply:
                patch = {"espn_id": result["espnId"]}
                if not row.get("headshot_url") and result.get("image"):
                    patch["headshot_url"] = result["image"]
                updated = supabase_json(base, key, f"dynasty_prospects?id=eq.{row['id']}&draft_year=eq.{year}&espn_id=is.null",
                                        "PATCH", patch, "return=representation")
                if not isinstance(updated, list) or len(updated) != 1:
                    raise RuntimeError(f"Expected one prospect row to receive an ESPN id: {row['id']}")
    with concurrent.futures.ThreadPoolExecutor(max_workers=5) as pool:
        results = list(pool.map(lambda row: inspect_player(row, args.season), rows))
    accepted = [result for result in results if "stats" in result]
    skipped = [result for result in results if "reason" in result]
    coverage = len(accepted) / len(rows)
    summary = {"draftYear": year, "statSeason": args.season, "recordCount": len(rows),
               "verifiedCount": len(accepted), "currentSeasonStatCount": len(accepted),
               "espnIdsFound": [r for r in ids if "espnId" in r],
               "espnIdsUnresolved": [r for r in ids if "reason" in r],
               "skipped": skipped, "sourceUrl": "https://site.web.api.espn.com/apis/common/v3/sports/football/college-football/athletes/{espn_id}/stats",
               "checkedAt": checked_at.isoformat()}
    # A partial provider failure must never be presented as a successful class refresh.
    if coverage < args.min_coverage:
        summary["error"] = (f"Coverage below {args.min_coverage:.0%}: {len(accepted)}/{len(rows)}; reasons: "
                            + json.dumps({reason: sum(x["reason"] == reason for x in skipped)
                                          for reason in {x["reason"] for x in skipped}}))
        return summary
    if args.apply:
        for result in accepted:
            path = f"dynasty_prospects?id=eq.{result['id']}&draft_year=eq.{year}"
            updated_rows = supabase_json(base, key, path, "PATCH", {"college_stats": result["stats"],
                                                                    "updated_at": checked_at.isoformat()},
                                         "return=representation")
            if not isinstance(updated_rows, list) or len(updated_rows) != 1:
                raise RuntimeError(f"Expected one updated prospect row for ID {result['id']}")
        snapshot = {"key": f"prospects:{year}:espn", "source": "ESPN college athlete statistics",
                    "payload": summary, "fetched_at": checked_at.isoformat(), "source_observed_at": None,
                    "expires_at": (checked_at + dt.timedelta(days=7)).isoformat(),
                    "quality": "unverified", "season": args.season, "week": None,
                    "content_hash": hashlib.sha256(json.dumps(summary, sort_keys=True).encode()).hexdigest()}
        supabase_json(base, key, "data_snapshots?on_conflict=key", "POST", snapshot,
                      "resolution=merge-duplicates,return=minimal")
    return summary


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--apply", action="store_true")
    parser.add_argument("--public-dry-run", action="store_true",
                        help="Inspect the public production prospect list without database credentials")
    parser.add_argument("--season", type=int, default=None,
                        help="College season to read; defaults to the season before the next draft")
    parser.add_argument("--years", type=int, nargs="+", default=None,
                        help="Explicit class years (overrides --offsets)")
    parser.add_argument("--offsets", type=int, nargs="+", default=[0, 1, 2],
                        help="Classes by offset from the next draft (0 = next class)")
    parser.add_argument("--find-ids", action="store_true",
                        help="Fill missing ESPN athlete ids from ESPN search before refreshing stats")
    parser.add_argument("--min-coverage", type=float, default=0.95,
                        help="Share of a class that must verify before its stats are written")
    args = parser.parse_args()
    if args.years is None:
        args.years = upcoming_classes(args.offsets)
    if args.season is None:
        args.season = next_draft_class() - 1
    if args.apply and args.public_dry_run:
        parser.error("--apply cannot be combined with --public-dry-run")
    base = os.environ.get("SUPABASE_URL") or os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
    if not args.public_dry_run and (not base or not key):
        parser.error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required")
    summaries = [refresh_year(base, key, year, args) for year in args.years]
    print(json.dumps({"applied": args.apply, "classes": summaries}, indent=2))
    failed = [s["draftYear"] for s in summaries if "error" in s]
    if failed:
        raise SystemExit(f"Coverage too low for {failed}; those classes were not written")


if __name__ == "__main__":
    main()
