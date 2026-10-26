# First Ballot: map-led growth

Research: October 26, 2026. Strategy and backlog below are proposals, not shipped features or purchased campaigns.

## Positioning and conversion

**Your roster. Your picks. Your next three seasons.** Lead with the visual Team Builder. Demonstrate how scouting, draft capital and trades help a Sleeper dynasty manager choose between contending and rebuilding.

Keep one active team free and useful. Unlimited is $12/month or $70/year; the natural upgrade is activating additional teams. Don't request a private Sleeper token until the user wants an authenticated action. Team Builder is desktop-only: mobile campaigns should land on scouting/boards with clear desktop continuation.

Conversion path: creator demo → map screenshot → Sleeper username → choose and activate a free team → open that exact map → make one meaningful change → confirmed save → return to saved plan → offer Unlimited when activating team two. Every paid return must unlock server-side access and preserve the selected team.

## Creator shortlist

Official pages linked below were reviewed. No owned competing fantasy research offer surfaced on the reviewed pages for these leads; this is **not proof of absence**. Check their current paid tiers, recent videos and category exclusivity before qualifying. No rates or audience sizes are assumed.

| Priority | Creator | Evidence and conflict screen | Proposed demo | Contact route |
| --- | --- | --- | --- | --- |
| First pilot | Fantasy Football Dudes: Trent, Jordan, Seth | [Official show](https://www.thefantasyfootballdudes.com/) covers lineup advice and trade targets; no owned research subscription found on reviewed site. Existing fantasy sponsors require exclusivity check. | Map a listener's rebuild in 60 seconds; closest direct fantasy fit. | Published show contact: tffdudes@gmail.com |
| Second pilot | KTO | [Official hub](https://linktr.ee/kto_football) links football storytelling channels, no research storefront surfaced. | Prospect story → future roster. Validate dynasty audience overlap. | Hub → YouTube business inquiry |
| Second pilot | Brandon Perna / ThatsGoodSports | [Official hub](https://linktr.ee/thatsgoodsports) promotes comedy, coffee/merch and Patreon. Check Patreon benefits before qualifying. | Roast a roster, then show a rebuild. | [Official contact](https://brandon-perna.squarespace.com/contact-flatiron) |
| Qualify first | Sam Gold | [Agency profile](https://www.tablerock.com/creators/sam-gold) describes NFL film analysis; paid-offer conflict remains unconfirmed. | Explain a young player's role, then show roster fit. | contact@tablerock.com; request Sam Gold |
| Qualify first | Cole DeRuse | [Agency profile](https://www.tablerock.com/creators/cole-deruse) describes Chiefs/NFL news; no competing offer on profile. | Team-specific prospect story and dynasty fit. | contact@tablerock.com; request Cole DeRuse |
| Later awareness | Chiseled Adonis | [Agency profile](https://www.tablerock.com/creators/chiseled-adonis) describes sports comedy and partnerships. Broader audience and tone need screening. | “Fix this roster” with actual map workflow. | contact@tablerock.com; request Chiseled Adonis |
| Later adjacent test | Throne | [Agency profile](https://www.tablerock.com/creators/throne) describes competitive Madden content. Fantasy conversion unproven; verify current offers. | Bring game-like roster building to a Sleeper team. | contact@tablerock.com; request Throne |

Exclude from this strict brief: [Fantasy Footballers](https://help.thefantasyfootballers.com/) supports its own Ultimate Draft Kit and premium dashboard; [Bootleg Football](https://www.patreon.com/BootlegFootball/about) has paid memberships and explicitly produces rankings. They are relevant publishers but don't fit the preference against competing research products.

Before buying: request median views of the last ten relevant videos, US audience share, dynasty audience evidence, current sponsors, deliverables, usage rights and an actual quote. Start with one native demo and two cutdowns, not an exclusive contract. Agency profiles establish contact routes, not complete product-conflict clearance.

### Outreach draft — not sent

“Hey [name] — we're building First Ballot, a visual dynasty team planner for Sleeper. You can see your lineup, future rookies and the picks/trades needed to build toward them. We'd love to see you map one of your own teams on camera. One team is free for your audience. Are you open to a small paid pilot, and do you have any exclusive fantasy-tool partnerships? Happy to send a 30-second demo first.”

## Growth engineering backlog

### P0: reliable activation and measurement

Audit existing analytics before adding duplicate events. Funnel: map CTA → connection → activation → map ready → meaningful scenario edit → confirmed save → D7 return → checkout → webhook-confirmed payment → entitlement unlock. Track failures as well as successes.

Use allowlisted first/last-touch UTMs and creator codes. Join anonymous sessions to authenticated account IDs; never log tokens, emails, personal strategy notes or arbitrary URL parameters. Persist activation/save/payment events server-side with deduplication IDs. Separate complimentary grants and internal accounts from paid revenue and acquisition cohorts.

Primary metric: **weekly returning planners** — managers who save a meaningful scenario and revisit within seven days. Track time-to-map, activation rate, D7/D28 return, paid conversion, refunds and churn by source and device. A vote or signup alone is not activation.

Before paid traffic, verify a genuine live checkout with the owner completing payment, webhook processing, entitlement unlock, exact-team return and refresh persistence. Verify cancellation/refund reconciliation. Existing checkout/webhook tests and complimentary access do not establish full live payment verification. Record data source as-of times and alert on stale feeds; don't market a freshness guarantee before ingestion/recovery monitoring proves it.

### P1: sharing loop

Build opt-in read-only plan snapshots with opaque revocable links. Default to hiding account/league identity and private notes. Never expose private scenario APIs. Label hypothetical rookie arrivals and snapshot date. Link each to “Build a plan for my team”; copying an idea must use the recipient's own roster context.

Add screenshot exports using the shared card design. Begin creator attribution with UTM links before investing in an affiliate portal. Referral proposal: capped, time-limited Unlimited after a genuine referred manager activates and returns. Never reward ranking-vote direction or volume.

### P2: return loop

An opt-in weekly “what changed in your plan” digest can highlight target values, college production and pick-order changes, deep-linking to the saved plan. Build useful sourced class/prospect pages with timestamps instead of empty SEO pages. Community ballots should show results/confidence and a next step, without interrupting the planning session repeatedly.

## Content to produce

| Asset | Hook | Actual demonstration | CTA |
| --- | --- | --- | --- |
| 15s vertical | “You want Jeremiah Smith. Where does the pick come from?” | Future year, target, capital gap, possible funding path. | Map one team free on desktop. |
| 30s product clip | “What does your dynasty look like two seasons from now?” | Now → future year → rookie → saved plan. | Connect your team. |
| 60–90s creator video | “Rebuild my roster with me.” | Real decisions with tradeoffs, no promised trade acceptance. | Try the workflow free. |
| Weekly series | “Contend or rebuild?” | Permissioned submitted roster, two plausible plans. | Build your own plan. |
| Weekly prospect clip | “Saturday's breakout, next year's roster.” | Sourced college production, projected class, need and pick cost. | Add to your board. |
| Still-image carousel | “One team. Three possible futures.” | Current roster, alternative plan, target path. | Open the map. |

Create six variants from two real workflows, captions included. Put the map in the opening two seconds. Label illustrative scenarios; no fake projections, testimonials or championship guarantees. Confirm imagery/logo usage rights before paid creative licensing. Homepage now uses a real roster-only screenshot with no email, team identity or private notes, explicitly labeled as a snapshot rather than live stats.

## First 30 days and ads

1. **Week 1:** map-led homepage, event audit, live billing verification, six clips. Recruit a small dynasty-manager group and observe free activation and return.
2. **Week 2:** qualify the top three creator leads; request quotes. Share useful walkthroughs where community self-promotion rules permit. Ask commissioners to try one team and report friction.
3. **Week 3:** proposed **$1,000 capped test**, requiring separate spending authorization: $400 creator/content pilot if a suitable quote fits, $450 creative testing on one paid channel, $150 reserve. These are allocations, not claims about creator rates. Negotiate smaller deliverables or use organic work if quotes don't fit. Choose one channel after audience evidence; use retargeting only with appropriate consent and sufficient audience.
4. **Week 4:** compare cost per activated-and-returning planner, paid conversion and churn. Improve onboarding if clicks fail to become saved plans. Stop a creative after twice the agreed activation-cost target without activation; don't declare winners from tiny samples. Scale retained-user acquisition, not cheap traffic.

The annual plan collects $70 versus $144 for twelve monthly payments. Don't assume $144 lifetime value. Set CAC limits using net revenue, service cost, refunds and observed retention. Example assumption only: 80% contribution on $70 yields $56 before acquisition; a 3:1 contribution/CAC target implies about $19 paid-customer CAC. Replace this with actual margins and cohorts; free activation cost must also account for paid conversion.

## Scope of this change

Shipped in this branch: homepage map screenshot, desktop builder/mobile scouting CTAs, three-step explanation and current workflow copy. Proposed: attribution improvements, share links, exports, referrals, lifecycle messages and campaigns. No outreach sent, ads purchased or public sharing enabled.
