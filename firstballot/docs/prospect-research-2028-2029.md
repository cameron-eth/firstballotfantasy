# 2028 and 2029 watchlist research

Reviewed 2026-10-24. College roster pages are the source for each player's current school, position, class, measurements, hometown, and jersey. Draft year is the earliest eligible year inferred from first college enrollment; it is not a declaration. New records have no scouting grade, production score, valuation, or draft round projection. The 2029 class has the preliminary watchlist order documented below.

| Watchlist | Player | Current roster source |
| --- | --- | --- |
| 2028 | Husan Longstreet (transferred from USC to LSU) | [LSU](https://lsusports.net/sports/fb/roster/player/husan-longstreet) |
| 2028 | Tavien St. Clair | [Ohio State](https://ohiostatebuckeyes.com/sports/football/roster/tavien-st.%20clair/13337) |
| 2028 | Ryan Montgomery | [Georgia](https://georgiadogs.com/sports/football/roster/montgomery-ryan/10585) |
| 2028 | Jaime Ffrench Jr. (transferred from Texas to Michigan) | [Michigan](https://mgoblue.com/sports/football/roster/jaime-ffrench-jr-/28113) |
| 2028 | Nate Roberts | [Ohio State](https://ohiostatebuckeyes.com/sports/football/roster/nate-roberts/13326) |
| 2029 | Savion Hiter | [Michigan](https://mgoblue.com/sports/football/roster/savion-hiter/28100) |
| 2029 | Dia Bell | [Texas](https://texaslonghorns.com/sports/football/roster/dia-bell/16947) |
| 2029 | Derrek Cooper | [Texas](https://texaslonghorns.com/sports/football/roster/derrek-cooper/16945) |
| 2029 | Brady Smigiel | [Michigan](https://mgoblue.com/sports/football/roster/brady-smigiel/28104) |
| 2029 | Jaeden Ricketts | [Ohio State](https://ohiostatebuckeyes.com/sports/football/roster/jaeden-ricketts/13384) |
| 2029 | Legend Glasker | [BYU](https://byucougars.com/sports/football/roster/player/legend-glasker) |

The six newer 2029 records are also in `lib/curated-prospects.ts` as a server fallback. Existing 2029 sources for Jesse Legree, Chris Henry Jr., Legend Bey, and Brock Boyd are there as well. All ten 2029 cards now use locally stored, background-free cutouts based on official roster portraits. The cutouts preserve each player's uniform or roster attire and keep transparent backgrounds for the card layout.

## 2029 preliminary order and production snapshot

Reviewed October 24, 2026. The order below is an editorial *watchlist* order, based on 2026 college production through completed games on October 17, plus published recruiting pedigree where college playing time is limited. It is not the full scouting model: overall grade, production score, valuation, and projected draft round stay empty until film and comparable position-adjusted inputs are evaluated. Missing college stats remain null, never zero. The stored `rank` gives this preliminary order; the card labels it “Preliminary.”

| Order | Player | Verified 2026 college signal | Recruiting signal | Primary source |
| --- | --- | --- | --- | --- |
| 1 | Jesse Legree | 1,040 receiving yards and 14 TD after seven games | Breakout freshman | [Oregon State, Oct. 19](https://osubeavers.com/news/2026/10/19/football-jesse-legree-named-pac-12-freshman-of-the-week-for-seventh-straight-time) |
| 2 | Chris Henry Jr. | Six catches, 202 yards, two TD from seven game notes | 247 composite No. 10 overall, five stars | [Ohio State bio](https://ohiostatebuckeyes.com/sports/football/roster/chris-henry%20jr./13356) |
| 3 | Legend Glasker | 24 catches, 444 yards, three TD; 13 carries, 92 yards, two TD in six games | Three-star recruit; twice Big 12 Freshman of the Week; midseason Freshman All-America | [BYU Oct. 20 update](https://byucougars.com/news/2026/10/20/glasker-and-mulitalo-named-midseason-freshman-all-america) |
| 4 | Savion Hiter | 57 carries, 223 yards, two TD; seven catches, 61 yards in six games | 247 composite No. 8 overall, five stars | [Michigan bio and game log](https://mgoblue.com/sports/football/roster/savion-hiter/28100) |
| 5 | Dia Bell | No verified college game line yet | 247 No. 27 overall, five stars | [Texas bio](https://texaslonghorns.com/sports/football/roster/dia-bell/16947) |
| 6 | Derrek Cooper | 28 carries, 98 yards, one TD; one catch, six yards in four games | Rivals No. 74 overall, four stars | [Texas bio](https://texaslonghorns.com/sports/football/roster/derrek-cooper/16945) |
| 7 | Legend Bey | 14 carries, 56 yards; two catches, 37 yards, one TD in five noted games | 247 top 200 | [Ohio State bio](https://ohiostatebuckeyes.com/sports/football/roster/legend-bey/13346) |
| 8 | Brock Boyd | Six catches, 110 yards in six noted games | Three stars | [Ohio State bio](https://ohiostatebuckeyes.com/sports/football/roster/brock-boyd/13353) |
| 9 | Brady Smigiel | No verified college game line yet | Freshman QB | [Michigan bio](https://mgoblue.com/sports/football/roster/brady-smigiel/28104) |
| 10 | Jaeden Ricketts | No verified college game line yet | Freshman WR | [Ohio State bio](https://ohiostatebuckeyes.com/sports/football/roster/jaeden-ricketts/13384) |

For heterogeneous recruiting services, `hs_rank` is the national number from the specific service named in the table, not a blended rank. Do not compare it as a calibrated model feature without normalizing the services first. This snapshot should be refreshed after each game week before numerical grading.
