# Team planning timeline

The builder uses the league season from the parent's existing draft-order state. Each saved scenario records its selected horizon, rookie class/arrival years, trade arrival years, and departures by year. Earlier views exclude later arrivals and departures; moving forward carries planned acquisitions forward. Roster ages advance arithmetically, without inventing development, retirement, or rookie point projections.

The roster map is a hypothetical future roster. The central competitive-state summary remains explicitly labeled as the current team baseline and continues to inherit the same LeaguePlacements model used by Overview/Audit.

## Draft feasibility

- Reuse the exact projected MaxPF data and `buildDraftOrder` function that power the dashboard's draft-order panel.
- Picks are owned by the manager but their projected slots follow the **original roster**, including traded picks.
- Use class-wide `overall_rank`, never positional rank or personal board order, as a visible cost proxy. This is not ADP or an availability probability.
- Reserve each owned pick for at most one planned rookie. Prefer the latest pick that reaches the class-rank proxy. If none reaches it, flag a trade-up gap; if no unreserved capital exists, flag the need to acquire capital.
- Missing rankings, incomplete MaxPF data, and draft years outside the inventory horizon remain uncertain.
- The next draft uses the current projected MaxPF order. Later years explicitly carry that relative order forward as a planning assumption, not a multi-season forecast. Playoff ordering, lotteries, snake rounds, and custom league rules can change real slots.

The year-by-year roadmap summarizes intended arrivals and capital that must be secured. It does not infer that a trade was accepted or a prospect was drafted. All saved fields use the existing private scenario store; no second persistence system is introduced.
