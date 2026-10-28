# Prospect grade refresh audit (2026-10-28)

Production data, classes 2027-2029 (121 prospects). Read-only; nothing was changed.

## Data foundation

- **Grades have no owner in code.** `overall_grade`, `grade_tier` and the five component scores are written by an outside import; no job in this repo computes or refreshes them.
- **No grade timestamp.** `updated_at` is bumped by the college-stats job (`scripts/refresh-college-prospects.py`), so it says when stats changed, not when the grade was set.
- **Stats refresh covers one class.** The job only updates the next draft class (2027). 25 of 30 (2028) and 12 of 16 (2029) prospects have no 2026 stats.
- **Identity gaps.** 22 prospects have no ESPN id (all 16 of 2029, 6 of 2028), so their stats and headshots cannot refresh automatically.
- **Empty columns.** `ktc_value_sf/1qb`, `market_delta`, `market_signal`, `draft_round_projection`, `efficiency_score`, `historical_percentile` are empty for every current prospect.
- **No reproducible formula.** Fitting the grade on its five components across all 981 graded rows gives ~0.51 draft projection, 0.24 production, 0.17 physical, 0.07 HS recruiting, 0.03 expert consensus. Current-class grades deviate from that fit, most at the top of the board (hand bumps).

## How prospects were flagged

| Flag | Rule |
| --- | --- |
| Ungraded | No `overall_grade` |
| Grade off its components | Grade differs from the all-years component fit by 8+ points |
| Production score lags / leads current stats | The stored production score's percentile (within position, current classes) is 40+ points away from the percentile of career fantasy points per game in the stored stats. A proxy: half-scoring of career totals, 2026 season in progress |
| HS score with no HS rating | `hs_recruiting_score` present but no `hs_rating` to have come from |
| Stats not refreshed for 2026 / No college stats / No ESPN id | Input data missing or not refreshing |
| Label vs grade band | Stored `grade_tier` disagrees with the grade cutoffs (reported, not counted as a refresh need) |

## P1 · No grade at all (21)

| Class | Pos | Prospect | School | Grade | Why |
| --- | --- | --- | --- | --- | --- |
| 2028 | QB | Ryan Montgomery | Georgia | — | Ungraded; No college stats; No ESPN id (stats cannot refresh) |
| 2028 | WR | Jaime Ffrench Jr. | Michigan | — | Ungraded; No college stats; No ESPN id (stats cannot refresh) |
| 2028 | TE | Nate Roberts | Ohio State | — | Ungraded; No college stats; No ESPN id (stats cannot refresh) |
| 2028 | QB | Malik Washington | Maryland | — | Ungraded; No college stats; No ESPN id (stats cannot refresh) |
| 2028 | RB | Ousmane Kromah | Florida State | — | Ungraded; Stats not refreshed for 2026; No ESPN id (stats cannot refresh) |
| 2029 | WR | Jesse Legree | Oregon State | — | Ungraded; Stats not refreshed for 2026; No ESPN id (stats cannot refresh) |
| 2029 | RB | Legend Bey | Ohio State | — | Ungraded; Stats not refreshed for 2026; No ESPN id (stats cannot refresh) |
| 2029 | WR | Jaeden Ricketts | Ohio State | — | Ungraded; No college stats; No ESPN id (stats cannot refresh) |
| 2029 | QB | Dia Bell | Texas | — | Ungraded; No college stats; No ESPN id (stats cannot refresh) |
| 2029 | WR | Chris Henry Jr. | Ohio State | — | Ungraded; Stats not refreshed for 2026; No ESPN id (stats cannot refresh) |
| 2029 | RB | Savion Hiter | Michigan | — | Ungraded; Stats not refreshed for 2026; No ESPN id (stats cannot refresh) |
| 2029 | QB | Brady Smigiel | Michigan | — | Ungraded; No college stats; No ESPN id (stats cannot refresh) |
| 2029 | RB | Derrek Cooper | Texas | — | Ungraded; Stats not refreshed for 2026; No ESPN id (stats cannot refresh) |
| 2029 | WR | Brock Boyd | Ohio State | — | Ungraded; Stats not refreshed for 2026; No ESPN id (stats cannot refresh) |
| 2029 | WR | Legend Glasker | BYU | — | Ungraded; Stats not refreshed for 2026; No ESPN id (stats cannot refresh) |
| 2029 | QB | Faizon Brandon | Tennessee | — | Ungraded; Stats not refreshed for 2026; No ESPN id (stats cannot refresh) |
| 2029 | QB | Jared Curtis | Vanderbilt | — | Ungraded; No college stats; No ESPN id (stats cannot refresh) |
| 2029 | WR | Trent Mosley | USC | — | Ungraded; Stats not refreshed for 2026; No ESPN id (stats cannot refresh) |
| 2029 | TE | Mark Bowman | USC | — | Ungraded; Stats not refreshed for 2026; No ESPN id (stats cannot refresh) |
| 2029 | WR | Kayden Dixon-Wyatt | USC | — | Ungraded; Stats not refreshed for 2026; No ESPN id (stats cannot refresh) |
| 2029 | RB | Jamal Rule | Nebraska | — | Ungraded; Stats not refreshed for 2026; No ESPN id (stats cannot refresh) |

## P2 · Grade likely stale or hand-adjusted (32)

| Class | Pos | Prospect | School | Grade | Why |
| --- | --- | --- | --- | --- | --- |
| 2027 | WR | Jeremiah Smith | Ohio State | 99.0 | Grade off its components by +13 |
| 2027 | RB | Kewan Lacy | Ole Miss | 98.14 | Grade off its components by +19; Production score lags current stats (+50 pctl) |
| 2027 | WR | Cam Coleman | Texas | 95.08 | Grade off its components by +10 |
| 2027 | RB | Ahmad Hardy | Missouri | 89.49 | Grade off its components by +12; Production score lags current stats (+87 pctl); Stats not refreshed for 2026 |
| 2027 | QB | Arch Manning | Texas | 82.25 | Production score leads current stats (-71 pctl) |
| 2027 | RB | Isaac Brown | Louisville | 80.07 | Grade off its components by +10; Production score lags current stats (+77 pctl) |
| 2027 | WR | Nick Marsh | Indiana | 75.51 | Production score lags current stats (+50 pctl) |
| 2027 | RB | Jadan Baugh | Florida | 73.5 | Production score lags current stats (+60 pctl) |
| 2027 | TE | Trey'Dez Green | LSU | 73.06 | Production score lags current stats (+40 pctl) |
| 2027 | QB | CJ Carr | Notre Dame | 72.78 | Production score lags current stats (+41 pctl) |
| 2027 | WR | Nyck Harbor | South Carolina | 71.05 | Production score leads current stats (-61 pctl) |
| 2027 | WR | Nic Anderson | LSU | 70.37 | Production score leads current stats (-53 pctl) |
| 2027 | QB | Gunner Stockton | Georgia | 70.36 | Production score leads current stats (-71 pctl) |
| 2027 | WR | Omarion Miller | Arizona State | 70.05 | Production score leads current stats (-63 pctl) |
| 2027 | WR | Jackson Harris | LSU | 69.68 | Production score leads current stats (-53 pctl) |
| 2027 | RB | Aneyas Williams | Notre Dame | 69.43 | Production score leads current stats (-83 pctl) |
| 2027 | RB | Antwan Raymond | Rutgers | 69.34 | Production score lags current stats (+40 pctl) |
| 2027 | RB | Hollywood Smothers | Texas | 69.15 | Production score leads current stats (-57 pctl) |
| 2027 | RB | DeSean Bishop | Tennessee | 68.89 | Production score lags current stats (+70 pctl) |
| 2027 | TE | Luke Reynolds | Virginia Tech | 68.83 | Production score lags current stats (+40 pctl) |
| 2027 | TE | Terrance Carter | Texas Tech | 68.58 | Production score lags current stats (+40 pctl) |
| 2027 | RB | Caden Durham | LSU | 68.17 | Production score leads current stats (-53 pctl) |
| 2027 | WR | Amare Thomas | Houston | 67.62 | Production score lags current stats (+71 pctl) |
| 2027 | TE | Dorian Thomas | Cal | 67.24 | Production score lags current stats (+80 pctl) |
| 2027 | RB | Raleek Brown | Texas | 67.2 | Production score leads current stats (-43 pctl) |
| 2027 | TE | Luke Hasz | Ole Miss | 67.09 | Production score leads current stats (-50 pctl) |
| 2027 | RB | Tre Wisner | Florida State | 66.67 | Production score leads current stats (-60 pctl); Stats not refreshed for 2026 |
| 2027 | RB | Kaden Feagin | Illinois | 64.62 | Production score leads current stats (-67 pctl) |
| 2027 | QB | Josh Hoover | Indiana | 63.96 | Production score lags current stats (+59 pctl) |
| 2028 | WR | Malachi Toney | Miami | 75.24 | Production score lags current stats (+82 pctl); Stats not refreshed for 2026 |
| 2028 | TE | Elyiss Williams | Georgia | 74.05 | Production score leads current stats (-90 pctl); Stats not refreshed for 2026 |
| 2028 | RB | Dierre Hill Jr. | Oregon | 74.01 | Production score leads current stats (-43 pctl); Stats not refreshed for 2026 |

## P3 · Inputs missing or not refreshing (29)

| Class | Pos | Prospect | School | Grade | Why |
| --- | --- | --- | --- | --- | --- |
| 2027 | QB | Brendan Sorsby | Texas Tech | 72.68 | Stats not refreshed for 2026 |
| 2027 | QB | Drew Mestemaker | Oklahoma State | 69.36 | HS score with no HS rating |
| 2027 | WR | Ian Strong | Cal | 67.72 | HS score with no HS rating |
| 2027 | QB | Trinidad Chambliss | Mississippi | 67.69 | HS score with no HS rating |
| 2027 | RB | Waymond Jordan | USC | 66.77 | HS score with no HS rating |
| 2027 | RB | Cam Edwards | Michigan State | 66.57 | HS score with no HS rating |
| 2027 | RB | Wayne Knight | UCLA | 65.55 | HS score with no HS rating |
| 2028 | WR | Dakorien Moore | Oregon | 77.9 | Stats not refreshed for 2026 |
| 2028 | WR | Dallas Wilson | Florida | 76.87 | Stats not refreshed for 2026 |
| 2028 | RB | Bo Jackson | Ohio State | 76.02 | Stats not refreshed for 2026 |
| 2028 | WR | Andrew Marsh | Michigan | 75.67 | Stats not refreshed for 2026 |
| 2028 | QB | Bryce Underwood | Michigan | 75.52 | Stats not refreshed for 2026 |
| 2028 | WR | Donovan Olugbode | Missouri | 74.16 | Stats not refreshed for 2026 |
| 2028 | RB | Caleb Hawkins | Oklahoma State | 74.0 | Stats not refreshed for 2026 |
| 2028 | WR | Lotzeir Brooks | Alabama | 73.81 | Stats not refreshed for 2026 |
| 2028 | RB | Jordon Davison | Oregon | 73.15 | Stats not refreshed for 2026 |
| 2028 | WR | Cortez Mills | Nebraska | 72.3 | Stats not refreshed for 2026 |
| 2028 | RB | Harlem Berry | LSU | 72.26 | Stats not refreshed for 2026 |
| 2028 | WR | Vernell Brown III | Florida | 72.03 | Stats not refreshed for 2026 |
| 2028 | RB | AK Dear | Alabama | 71.75 | Stats not refreshed for 2026 |
| 2028 | RB | Girard Pringle Jr. | Miami | 70.67 | Stats not refreshed for 2026 |
| 2028 | QB | Jaron-Keawe Sagapolutele | Cal | 70.28 | Stats not refreshed for 2026 |
| 2028 | RB | Gideon Davidson | Clemson | 68.1 | Stats not refreshed for 2026 |
| 2028 | WR | Kaliq Lockett | Texas | 64.4 | Stats not refreshed for 2026 |
| 2028 | TE | Linkon Cure | Kansas State | 63.53 | Stats not refreshed for 2026 |
| 2028 | WR | Quentin Gibson | Colorado | 61.67 | Stats not refreshed for 2026 |
| 2028 | QB | Keelon Russell | Alabama | 61.53 | Stats not refreshed for 2026 |
| 2028 | RB | Nate Shepard | Duke | 60.85 | HS score with no HS rating; No college stats; No ESPN id (stats cannot refresh) |
| 2028 | WR | Talyn Taylor | Georgia | 58.74 | Stats not refreshed for 2026 |

## P4 · Only the tier label disagrees (25)

| Class | Pos | Prospect | School | Grade | Why |
| --- | --- | --- | --- | --- | --- |
| 2027 | WR | Bryant Wesco | Clemson | 76.89 | Label "Rotational" vs grade band Depth |
| 2027 | QB | Dante Moore | Oregon | 75.64 | Label "Rotational" vs grade band Depth |
| 2027 | WR | TJ Moore | Clemson | 75.45 | Label "Rotational" vs grade band Depth |
| 2027 | WR | Charlie Becker | Indiana | 75.33 | Label "Rotational" vs grade band Depth |
| 2027 | WR | Ryan Coleman-Williams | Alabama | 74.52 | Label "Rotational" vs grade band Depth |
| 2027 | QB | LaNorris Sellers | South Carolina | 73.62 | Label "Rotational" vs grade band Depth |
| 2027 | WR | Duce Robinson | Florida State | 73.25 | Label "Rotational" vs grade band Depth |
| 2027 | WR | KJ Duff | Rutgers | 73.24 | Label "Rotational" vs grade band Depth |
| 2027 | TE | Jamari Johnson | Oregon | 73.12 | Label "Rotational" vs grade band Depth |
| 2027 | WR | Ryan Wingo | Texas | 73.02 | Label "Rotational" vs grade band Depth |
| 2027 | RB | Justice Haynes | Georgia Tech | 72.39 | Label "Rotational" vs grade band Depth |
| 2027 | WR | Isaiah Sategna III | Oklahoma | 71.71 | Label "Rotational" vs grade band Depth |
| 2027 | RB | Mark Fletcher | Miami | 71.67 | Label "Rotational" vs grade band Depth |
| 2027 | QB | Darian Mensah | Miami | 71.54 | Label "Rotational" vs grade band Depth |
| 2027 | WR | Eugene Wilson III | LSU | 70.65 | Label "Rotational" vs grade band Depth |
| 2027 | QB | Sam Leavitt | LSU | 70.23 | Label "Rotational" vs grade band Depth |
| 2027 | WR | Isaiah Horton | Texas A&M | 70.14 | Label "Rotational" vs grade band Depth |
| 2027 | RB | Nate Frazier | Georgia | 70.14 | Label "Rotational" vs grade band Depth |
| 2027 | TE | Benjamin Brahmer | Penn State | 67.89 | Label "Depth" vs grade band Walk-On |
| 2027 | WR | Kenny Johnson | Texas Tech | 67.82 | Label "Depth" vs grade band Walk-On |
| 2027 | TE | DJ Vonnahme | Iowa | 67.73 | Label "Depth" vs grade band Walk-On |
| 2027 | QB | John Mateer | Oklahoma | 67.67 | Label "Depth" vs grade band Walk-On |
| 2027 | WR | Eric Singleton Jr. | Florida | 67.39 | Label "Depth" vs grade band Walk-On |
| 2027 | TE | Decker DeGraaf | Washington | 67.35 | Label "Depth" vs grade band Walk-On |
| 2027 | WR | Danny Scudero | Colorado | 66.49 | Label "Depth" vs grade band Walk-On |

Clean (no flags): 14
