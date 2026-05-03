# My Medical Center Devlog

This file is a narrative development log for the project. It complements `PATCH_NOTES.md` by focusing more on the direction of the game and the design goals behind each major phase.

## Entry — Lighter Brand Logo (v1.34)

The top-left brand logo had been rendering as a browser broken-image icon for some users. Tracing it down was unsatisfying: every asset returned a clean `200`, the file was a valid PNG, the path was correct. The actual fix is precautionary rather than diagnostic — the 1.4 MB PNG was overkill for a 140 px slot in the topbar, so I swapped it for the matching 3 KB SVG, capped the dimensions, added `object-fit:contain` so it can never overflow the pill, and added an `onerror` to hide the element gracefully if the file ever does go missing in some future asset shuffle. Smaller surface area, no broken-icon ever again.

The same patch originally tried to wire each campus's declared `background.kind:'image'` field into the floor-1 canvas as a photographic backdrop. It looked great in screenshots, but the photo conflicted with the procedural rendering pipeline (terrain, corridors, room shadows, ambient cars) in ways that broke the play surface — so the image-backdrop change was reverted and the procedural placeholder backdrop (green lawn + parking strips + ambient details) is the active map background again. The campus image data is still in the table, ready for a future patch that handles the layering more carefully.

## Entry — Stability Pass: Save/Load Crash Fix + Stress Harness (v1.33)

After three feature-heavy patches in a row (animations, sound, tooltips) it was time for a stability pass. The trigger was specific: a stress-test harness I wired up in `.local/stress_test.js` to exercise the game end-to-end in jsdom turned up a real, reproducible crash on the Load Game path.

The bug was the kind that only shows up on the *second* day after loading. `dailyGoal` is an object that carries a handful of closures — `current()`, `done()`, `reward()`, `progress()` — generated each morning by `generateDailyGoal()`. Save serializes everything to JSON, which silently strips functions. On load, the loader was happily writing the function-less husk back into `dailyGoal`, and the next end-of-day handler called `dailyGoal.done()` and threw. The fix is a single line: don't restore `dailyGoal` from save at all — set it to `null` and let `generateDailyGoal()` rebuild a fresh one tomorrow morning. The cost is one missing day's progress on the goal after a load, which is the obviously-correct tradeoff.

The harness itself is worth keeping. It runs 13 scenarios — every difficulty × first three campuses, placing one of every room type, 7,000 ticks, every modal, hire/grants/contracts/research, save → load loops, event triggers, and a hover sweep across every `data-tt-*` tooltip target — and bucket-counts every console and `window.error` event. Each call is wrapped so one failure can't mask another. Two error categories survived the cleanup (`URL.createObjectURL`, `Element.scrollTo`) but both are jsdom-only stubs that work in any real browser. Re-run any time with `node .local/stress_test.js`.

## Entry — Universal Tooltip System (v1.32)

The tooltip story across the game had drifted. Some buttons used `title=""`, some had hand-rolled hover panels, some had nothing at all. Players were hovering over a research node with a 240-RP cost and getting either no information or the browser's tiny native tooltip. The goal of v1.32 was a single tooltip surface, used everywhere, with a consistent layout.

The shape of the system fell out of one constraint: I didn't want to touch any of the renderers that already work. So `systems/tooltip.js` is built on event delegation — one `mouseover` listener at `document` level, one shared `#tt-pop` panel that gets reused, and per-domain *resolvers* that take a small attribute (e.g. `data-tt-research="er_throughput_2"`) and look up the rich content from the existing in-game data structure (`RESEARCH_TREE`, `GRANT_LIBRARY`, `RDEFS`, etc). Adding a tooltip to a new place is a one-attribute change.

A `MutationObserver` watches for new `.rb[data-tool]` build buttons appearing anywhere in the DOM and stamps them with `data-tt-room` automatically, so every existing build menu and the dock just lit up without any code changes at the call sites. The same observer covers any future markup that uses the same convention.

Every tooltip renders the same fixed sections in the same order: badge → title → description → stat effects → requirements → warnings → recommended action → footer. That predictability matters more than the visual polish: once players learn that warnings are always the amber block near the bottom, they can scan tooltips ten times faster.

## Entry — Polish Pass: Animations & Sound (v1.31)

A short, deliberately-bounded patch focused on *feel*. The game's mechanics had been getting more sophisticated for a while (renovations, XP, prisoner wing, 10-spec floors) but interactions still landed flat — clicking a button, completing a treatment, or picking up a grant felt the same as it had on day one.

`systems/anim_polish.js` and `systems/sound.js` are both small, self-installing modules that hang off `window` so every call site can be a guarded one-liner (`if(window.animPolish) animPolish.pulse(el)`). That pattern matters — it means save loads, automated tests, and audio-disabled environments degrade silently rather than crash.

Sound is generated entirely in WebAudio with no external files: a Settings *Mute* toggle and a master volume slider live alongside the existing settings, both persisted to local storage. Animations honor `prefers-reduced-motion` plus the existing *Reduce motion* toggle, so accessibility-aware users get the same UI minus the motion. Together they're the kind of pass that's hard to point at on a feature list but very hard to undo once you've shipped it.

## Entry — Escape Closes Any Modal (v1.30)

The Escape handler grew piecewise: first it closed the title screen, then a couple of named modals, then we added the launcher modals in v1.29 and bolted them on. By the end it was a brittle if/else chain that knew about four specific modals and ignored the other dozen.

v1.30 replaces it with a tiny modal registry. A single MutationObserver watches the `class` attribute on every tracked modal and pushes it onto an open-order stack the moment it transitions to "open." Escape pops the top of the stack and calls that modal's existing close function (resolved via `window[name]` so file load order doesn't matter). The result is a single, declarative source of truth: add a modal to the list and Escape just works.

Two intentional exclusions: the title screen and the Game Over screen are not in the registry, because both are meant to be gating screens rather than dismissable popups.

## Entry — Single-Row Launcher Bar (v1.29.1)

The v1.29 launcher row used `flex-wrap: wrap`, which looked fine on a wide screen but folded the 11 launcher buttons into three stacked rows on the default 258px right panel — eating most of the vertical space we'd just freed up.

The fix is intentionally CSS-only: switch to `flex-wrap: nowrap` with `overflow-x: auto`, give the buttons `flex: 0 0 auto` so they keep their intrinsic width, and add a soft fade mask plus thin scrollbar styling so the user can tell there's more to the right. It always renders as exactly one row now, regardless of panel width.

## Entry — Right Panel Declutter (v1.29)

The right panel was the obvious next thing to fix after v1.27/v1.28 piled on more systems. By that point you had ten or eleven stacked widgets — budget, departments, roster, dispatch, contracts, insurance, marketing, grants, research, log — and the screen felt like an inbox you couldn't archive.

The redesign was structural rather than cosmetic: the panel is now four widgets (Warnings, Current Goal, the Public Care Agreement, and the Log), and **everything else moved behind a button**. A new `#rp-launchers` row sits at the top of the panel with one button per relocated system. Each button gets a live badge showing the most informative number for that system — cash on hand, pending dispatches, active grants, etc.

The trick was avoiding a rewrite. Every relocated panel still has the same DOM ID it had before, just inside a modal container instead of inline in the right rail. So `renderBudgetPanel`, `renderMarketingSummary`, `renderHiredStaff`, etc. all kept working unchanged — they just paint into a hidden container until the user opens the matching modal.

## Entry — Floor-1 Prisoner Wing, Auditorium & Renovations (v1.28)

Two design problems collided here. First, every campus was running out of "weight" on Floor 1 — players hit a few familiar rooms and then expanded vertically without anything anchoring the ground floor as a unique space. Second, demolishing rooms on an established floor was completely free of consequence, which made layout mistakes have no permanence.

v1.28 attacks both at once.

The **Prisoner Wing** (10×5) and **Auditorium** (10×6) are deliberately oversized rooms that only fit on Floor 1, and they're the first rooms with a meaningful campus footprint. The Prisoner Wing also requires a Security Office or hired Guard before you can place it — a gating tool requirement using the existing `isToolUnlocked` machinery. The Auditorium has no fixed staff role at all, which surfaced a long-standing latent bug in `sel()` that assumed every room had a `staffRole`; that's now defensive.

The **renovation system** is the more interesting half. Every room now stamps a `builtDay` when placed; once 90 days pass, the room is "Established." Demolishing an Established room on an active floor pops a confirmation modal: cancel, or start a 30-day renovation that drops every non-exempt room on that floor to **33% speed**. Vending machines, drink stations, and ATMs are exempt because they don't really participate in the renovation fiction.

Once you commit to renovating, additional demolitions on that floor are free until the renovation finishes — so the system rewards batching layout changes into a single planned overhaul instead of nibbling. The 33% speed multiplier is plumbed through `getSpeedMult`, so it slows patient throughput, treatment ticks, and efficiency for the whole floor uniformly. Floor controls show a "Renovation Xd (33% speed)" indicator the whole time.

Save compatibility was easy: any room missing `builtDay` defaults to day 1, so old saves treat every existing room as Established immediately, which is the most permissive option.

## Entry — Unified Staff XP & Leveling (v1.27)

The intern level system was fun, but it stranded everyone else: a Veteran Surgeon and a fresh hire used the exact same numbers. v1.27 generalizes XP and leveling to **every** employee.

**Goals:**
- Make long-tenured staff feel different. Their salary climbs (1.0× → 2.0×), but their negative trait gradually softens (100% → 30%) — so it always pays to keep your veterans, not flip them every quarter.
- Reuse the existing trait pipeline rather than fork the data model. Negative-trait numeric fields (`speedMult`, `errorChance`, `extraEnergyDrain`, `energyDrainMult`, `waitAdd`) are scaled when the per-frame `member.traits[2]` is rebuilt in `normalizeStaffMember`, so every consumer that reads those fields automatically gets the level-adjusted value with zero touch points.
- Boolean-only flaws (Coffee Dependent, Shift Gremlin, etc.) are scaled at the consumption sites via a tiny `negImpact()` helper.
- XP earnings come from working a shift, treating a patient, and stress days; mentor/fast-learner traits amplify the whole shift, not just interns.
- Interns route through the same `awardStaffXp` engine and keep their promote-on-Specialist behavior intact.

Old saves back-fill cleanly: every staff member without level/xp fields starts at Level 1 with the full new field set populated by `normalizeStaffMember`.

## Entry — Bigger, Sharper Map (v1.26)

After the campus selector landed in v1.25, two pieces of feedback came in almost immediately: the play surface felt cramped, and the rendering looked a little soft on high-DPI screens. Both were fair — the campuses were still sized for the old 27×15 grid era, and the canvas was rendering at logical pixel density even on retina displays.

Two related changes addressed it:

1. **Doubled render resolution.** The canvas backing store now uses a `RES_SCALE=2` multiplier and a pre-applied `ctx.setTransform(2,0,0,2,0,0)`, so all draw code keeps using the same logical (T-based) coordinates. CSS sizing was switched from `cv.width × zoom` to `COLS·T × zoom` so the on-screen size is unaffected. Net effect: identical layout, twice the pixels, much sharper detail.
2. **Bigger campuses.** All seven campuses (flat sandbox + six themed) jumped from 30×18 to **44×26** — about a 2× area increase. Procedural terrain (roads, parking strips, water bands, cliff lines) is generated from `cols/rows` inside each campus's `build()`, so it scaled cleanly with no per-campus tuning needed.

The trickier part was the starter prefabs. Each campus seeds a small starter hospital with hardcoded coordinates, and those coordinates assumed the smaller grid — every prefab's front entrance had to be re-anchored against the new road edge with a connecting corridor running back to the original room cluster. Keeping the rest of the cluster in place felt right: the seed should still look like a tiny clinic surrounded by lots of fresh, open land waiting to be filled in.

Save compatibility was a non-issue because the save loader already pads/truncates legacy grids to the active campus size on load, so older 30×18 saves come back without crashing.

## Entry 1 - Finding The Core Loop

The first goal was to make a hospital simulation that could be understood quickly:
- build rooms
- hire staff
- treat patients
- earn money
- survive pressure

The earliest versions were simple, but they already established the core identity of the game: a small clinic that can grow into a complex medical center.

## Entry 2 - Making It Feel Like A Hospital

Once the basic loop worked, the next problem was atmosphere and identity. The simulation needed to feel like a hospital instead of just a grid of rooms.

That led to:
- waiting rooms
- visible queues
- day and night shifts
- janitors and cleanliness
- morale and stress
- contracts and early management pressure

This phase gave the game a more believable structure and helped every run feel less abstract.

## Entry 3 - Building Progression

Research, milestones, and hospital stages gave the project a real sense of growth.

Instead of letting the player build everything immediately, the game started to pace its content more deliberately:
- Clinic
- Small Hospital
- Expanding Facility
- Medical Center

That change made new rooms and roles feel earned, and it turned the hospital into something the player develops over time rather than something they finish in the first few minutes.

## Entry 4 - Staff Became Real People

One of the most important shifts in development was moving staff away from being simple role counters.

Over time the game added:
- morale
- burnout
- raise requests
- conflicts
- breaks
- vacations
- support roles like Charge Nurse and Dept. Head

This made staff management a much more central part of the hospital. Employees started to feel like a system the player must care for, not just deploy.

## Entry 5 - Events And Pressure

The random event system changed the rhythm of the game.

Events such as:
- patient surges
- staff sick days
- complaints
- inspections
- burnout crises
- celebrity cases
- emergency incidents

gave the hospital moments of chaos and drama. At the same time, the Pressure Dashboard helped explain *why* the hospital was under strain so the player could respond instead of just reacting blindly.

## Entry 6 - Expanding Beyond A Starter Clinic

As more systems were added, the hospital itself became more ambitious.

Major additions like:
- dispatch chains
- ambulance bay
- inpatient rooms
- ICU spaces
- VIP rooms
- multi-floor construction
- elevators and staircases
- entrances and floor specializations

helped push the game toward the fantasy of building a true medical center instead of only managing a small outpatient clinic.

## Entry 7 - Teaching New Players

As the systems grew deeper, onboarding became more important.

The tutorial evolved from a simple hint card into a guided clinic scenario with:
- an auto-demo layout
- guided room placement
- beginner-friendly explanations
- hospital naming
- ghost placements
- soft flow arrows

The goal was to make the first few minutes feel understandable without overwhelming the player.

## Entry 8 - Visual Identity And Feel

A large amount of recent work focused on presentation:
- top HUD hierarchy
- build menu grouping
- room visuals
- event presentation
- toasts
- button feedback
- heatmaps
- room details
- ambient map motion
- logo work

This was the phase where the project started feeling less like a prototype and more like a polished indie management game.

## Entry 9 - Where The Game Stands Now

My Medical Center now has a much clearer identity:
- a soft, readable hospital sim
- guided progression
- richer staff management
- more purposeful rooms
- better patient routing
- stronger event drama
- cleaner, more commercial-feeling UI

The current direction is to keep making each room, role, and department feel more useful, more distinct, and easier for the player to understand at a glance.

## Entry 10 - Making It Feel Like A Real Institution

The latest wave of work pushed the game toward a stronger hospital identity.

Instead of only being about room placement, the sim now has more institutional pressure:
- public vs private patients
- government care quotas
- insurance expansion pressure
- grants
- department upgrades

That matters because it creates a cleaner tension: the hospital exists to help people, but it also has to survive financially.

This phase also pushed hard on clarity and usability:
- separate employee-needs management
- more specialized departments and wings
- dedicated SVG icons for major rooms and core HUD stats
- room rotation while building
- real exported save files instead of only browser memory

The overall result is a game that feels less like a loose prototype and more like a management sim with rules, identity, and long-term structure.

## Entry 11 - Grants: A New Layer Of Strategy

v1.10 completed the Grant Program system — one of the more mechanically layered features added so far.

The core idea was simple: hospitals apply for grants in real life, and that process should feel meaningful in the game. Not just a button that hands you money, but something you have to prepare for, wait on, and manage outcomes from.

The result is a five-stage workflow:

**Available → Apply → In Review → Approved or Denied → Active → Expired**

Each stage does something. Available grants rotate from a library of 16. When you apply, the review countdown starts based on the grant category and your writer's traits. When review ends, approval is calculated from a formula that weighs your writer's skill, their specific trait, hospital reputation, government compliance standing, admin department level, cleanliness, stress, and any recent audit failures. If approved, the grant either delivers a one-time cash payout or activates a timed effect that runs day by day until its duration ends.

What made the formula interesting to design was that it punishes neglect in very specific ways. A dirty hospital is a real liability. High stress hurts your approval odds. If you just failed an audit, that follows you into grant applications too. The player who has been managing their hospital carefully gets rewarded not just in gameplay but in grant access.

The Grant Writer role got expanded significantly for this. Three traits became twelve — split across three tone bands. The good traits improve speed, approval odds, reward cash, or target specific grant categories. The neutral traits make interesting tradeoffs, like a Perfectionist who submits better applications but takes longer, or an Idealist who wins community grants but struggles with corporate-facing ones. The bad traits are genuine liabilities — Weak Documentation, Disorganized, Overpromises — that the player has to account for or work around.

The UI for grants ended up being a full four-tab modal: Available, In Review, Active, and History. Grant cards show everything the player needs to make a decision: category, requirements with a clear met/unmet check, approval chance with a breakdown they can expand, review time, duration, and exactly what the reward delivers. Active grants display remaining days and effect chips so the player always knows what they are currently benefiting from.

One deliberate design choice was to tie the Admin department upgrade level directly into approval odds. Upgrading Admin is one of the quieter investments in the game — it does not produce patients or treat anyone directly. Giving it a meaningful grant bonus creates a concrete reason to prioritize it earlier.

The overpromise mechanic was already wired into the grant resolution system — certain grants carry a risk flag that checks hospital performance when the active period ends. If stress is high, cleanliness has dropped, or the public care rate has slipped, there is a financial clawback. That consequence makes the player think before accepting grants they cannot actually support.

The next natural question for grants is whether the system can grow toward player reputation within grant categories — building a track record with government bodies, medical foundations, or workforce programs that unlocks higher-tier funding over time.

## Entry 15 - Reducing The Cold-Start Cliff

The playtesting readiness pass kept going after v1.19's tutorial expansion and warning-fix coverage. The remaining gap was that a brand-new player still walked into a UI with eleven bottom-bar buttons and ten different modals, with no quick way to tell which were for "now" and which were for "later."

This pass attacked that cliff in three small, layered ways.

The first was modal subtitles. Every major panel — Executives, Delegation, Staff, Employees, Departments, Grants, Research, Contracts, Statistics, Budget — now opens with a single sentence under the title that says what the panel is for. Not a tooltip the player has to hover for, not a tutorial step they have to be in to read — just plain text at the top of the modal, every time. The Contracts panel says it covers both insurance and the Asherville Public Care Agreement. The Grants panel says a Grant Writer raises approval odds. The Departments panel says it touches whole systems instead of single rooms. The information was already in the tutorial and in the bottom-bar tooltips, but a player who clicked into a modal mid-game had no fast way to re-read the gist of what they were looking at. Now they do.

The second was the soft-guide checklist. The version that existed only covered four steps — corridors, waiting room, GP office, GP doctor — which left the player at "you've placed a GP doctor, now what?" The new ladder runs all the way through Clerical, Nurse, Janitor, Press Play, and the first treated patient. Nine steps in total, all of which complete naturally as the player follows the obvious actions. It's still hidden during the formal tutorial and disappears once dismissed, so it doesn't add noise for returning players.

The third was the `early-muted` class. While the tutorial is teaching the basic clinic loop — placement, staffing, watching the first patients flow — six advanced buttons (Depts, Research, Grants, Contracts, Executives, Delegation) are visually dimmed. They are not disabled. A curious player can still click them. But the visual hierarchy of the bottom bar now matches the difficulty curve: the buttons you need first are bright, and the buttons you'll need later are quietly waiting their turn. The existing `tutorial-muted` treatment on Research, Contracts, and Advertising remains in place, so the early game stays calm without anything actually being locked away.

None of this is gameplay change. It's all visual and copy work. But the same way the warning-fix lines and the in-state hint bar made the *late-game* legible, this pass makes the *first five minutes* legible. The systems were always there. Now the framing finally says what they are.

## Entry 14 - Making It Understandable Before It Gets Played

The current focus is a playtesting readiness pass — no new features, just making every existing system legible to someone who has never touched the game before.

The core problem was that the game had become rich with systems but silent about what was happening. A new player could see the Stress stat climbing, watch the Warnings panel fill up, and still have no idea what to do. The warnings told them *that* something was wrong. They did not tell them *what to do about it*.

The fix was simple but required touching several places at once.

Every warning card now ends with a `→ Fix:` line. High Stress tells you to add a Staff Room and hire a Janitor. Debt Watch tells you to apply for a grant or accept a contract. Cleanliness Risk tells you to hire a Janitor immediately and add a Janitor Closet if none exists. The fix text is not generic — each one is specific to the failure mode it belongs to.

A new warning card was added for Government Quota Risk. This one fires *before* the monthly penalty lands, when the public care rate has dropped more than 5 percentage points below the required threshold. The original government system would just silently punish the player at the review date. Now the panel warns them early, with a clear path to recovery.

The Government Contract status block got a similar treatment. The status badge now has a consequence line underneath it: "on track for review," "missed quota = reputation penalty," or "reputation loss incoming." Players now understand what the status means before the day counter hits zero.

The bottom `#hint` bar was always there but rarely useful — it showed the same static placement reminder all game. It now updates in real time based on hospital state. The order is deliberate: critical stress first, then reputation, then debt, then cleanliness, then waiting overflow, then quota slip, then low cash. When none of those apply, a new `getStableHint()` function produces state-aware encouragement: build a GP office, hire a janitor, start a research node — whatever the hospital actually needs at that moment.

The last change was the most mechanical: every stat card in the top HUD and every button in the bottom bar now has a hover tooltip explaining what it is and why it matters. Cash, Reputation, Cleanliness, Stress, Waiting, Staff, Day, RP — each one now says what drives it and what to watch for. Depts, Research, Grants, Contracts, Delegation, Employees, Staff, Traffic — each one now says plainly what it opens and what the player gets from it.

None of this adds complexity. It exposes the complexity that was already there.

## Entry 13 - Teaching Placement, Zones, And Automation

Before the clarity pass, the tutorial needed to grow to actually cover the game's systems.

The tutorial expanded to 17 steps. That sounds like a lot, but the earlier version stopped well before covering grants, contracts, department upgrades, the research tree, or delegation. A player who finished the old tutorial would encounter all of those systems cold, with no guidance on what they were for or when to use them.

The six new or rewritten steps each target a specific gap:

Room placement was only explained as a mechanical action — click and drag, connect to a corridor. The new step ("Room Placement Matters") explains the spatial logic behind it: there is a Waiting Area for receiving patients and a Treatment Area for handling them, and corridors connect those zones. During this step the map renders labeled zone markers — "Waiting Area," "Treatment Area," "Future zones unlock as you grow" — as a faint overlay, so the player sees the intent of the layout before they build it.

The grants step explains the Grant Writer requirement upfront, so the player does not apply for a grant and wonder why it has zero approval chance. The contracts step explains the compliance pressure mechanic — that accepting private insurance raises the government's public-care threshold, and that stacking contracts can create a tension that cannot be resolved without deprioritizing revenue.

The department upgrades step reframes what Depts does. It is not a room. It is not a one-time purchase. It is a way to improve whole systems — ER throughput, diagnostics speed, admin efficiency — without rebuilding from scratch. The research and delegation steps explain the long arc: research is the five-branch unlock tree that permanently shapes the hospital's identity, and delegation is where that investment pays off by letting the hospital run policies in the background automatically.

Alongside the tutorial, the zone overlay was added as a persistent layer in normal gameplay. At Small Hospital stage, faint dashed rectangles show where the ER and Diagnostics zones are meant to grow. At Expanding Facility stage, Inpatient and Admin zones appear. This gives new players a spatial frame of reference even outside the tutorial — a sense that the grid has regions and that rooms belong in certain places.

## Entry 12 - Traits That Actually Mean Something

The trait system got a major expansion in v1.12, and the driving question behind all of it was simple: does this trait do anything?

The 3-trait architecture from v1.11 had the right structure — every employee carries a Strength, a Role Trait, and a Flaw — but the job-specific pools were thin. Doctors had five traits. Nurses had four. Most other roles had three or four, with a couple of good options, one bad one, and not much variety. After a few hires it started to feel like the same cards every time.

The goal for v1.12 was to give every role a pool large enough that the player couldn't predict what they'd see. Each pool needed at least seven or eight traits with distinct mechanical identities — not just stat adjustments with different labels, but traits that genuinely pointed a staff member in a different direction.

For doctors, that meant separating archetypes clearly: a Diagnosis Bloodhound who speeds up the diagnostic pipeline is a different hire than a Tough Case Hunter who extracts more revenue and score from difficult patients, or a Calm Surgeon Hands who almost never makes errors. Each one implies something about how you'd use them.

For janitors, the design leaned into comedy a little. Spill Psychic, Floor Shine Fanatic, Biohazard Brave, Quiet Cleaner — these names carry a personality before you read the description. The trait effects back them up mechanically, but the flavor is doing work too.

For directors, the original four traits covered clinical speed, patient satisfaction, operations, and grant strength. The four new ones expand the strategic identity of the role: Academic Star makes the hospital a research powerhouse, Public Mission Leader doubles down on community positioning, Private Networker opens high-tier funding through corporate connections, and Automation Evangelist tilts the whole hospital toward efficiency. Hiring a Medical Director now shapes the hospital's character in a more legible way.

The hardest pool to design was probably IT. The role touches research, morale, efficiency, and error rates, but the traits couldn't all do the same thing. Helpdesk Saint (morale and stress resist), Printer Exorcist (morale, no mechanical bonus beyond the mood lift it implies), Data Guardian (pure error reduction), Automation Tinkerer (revenue and research together) — these are all valid choices in different hospital states.

Once 83 traits were sitting in eleven pools, the hiring modal immediately became harder to use. That's where the Trait Search came in.

The search bar solves a problem that only becomes visible once the pool is rich enough to matter: if you know you want a mentor, or someone who doesn't drain energy, or a paramedic with fast dispatch — you shouldn't have to browse role by role to find them. The search crosses all roles simultaneously, respects the shift filter, and tells you exactly what came back and where it came from. It's a small feature, but it's the kind of thing that makes a large system feel navigable.

The underlying design principle for this phase was that depth only pays off if the player can perceive it. More traits is worthless if they all blur together. Search makes the difference between a trait being a curiosity the player reads once and a target they actively hunt for.

## Entry 16 - Mid-Game Pressure Events

By the time a hospital gets past the Small Hospital stage, the player has built a lot of systems that they rarely get to *feel* paying off. Backup power, an HR Manager, the Government Liaison board seat, supply-chain research, a real Charge Nurse — they all matter on the spreadsheet, but most of the moment-to-moment game is patient throughput. The mid-game often started to flatten out into "build more, hire more, repeat."

The goal of v1.21 was to introduce a small set of dedicated mid-game *pressure events* that make those investments visible. Five new events — Blackout, Car Pileup, Public Care Review, Nurse Burnout Wave, and Medication Shortage — each open the existing event modal, and each one resolves on a single Continue button. There are no choices to make in the moment. The choice was made earlier, when the player decided whether to build the HVAC generator, hire the IT specialist, take the Government Liaison seat, research Burnout Prevention, or sign a supply contract.

The design rule was that every event had to branch on something the game already tracks. No new rooms, no new staff roles, no new research, no new CEOs. The Blackout reads HVAC, IT, and Operations. The Car Pileup reads ER, Ambulance Bay, Dispatch, Surgery, and inpatient capacity. The Public Care Review reads the public-patient quota, the Admin department, the Government Liaison board seat, the Public Mission CEO, and existing compliance research. The Nurse Burnout Wave reads Staff Room, Lunch Room, HR Manager and Charge Nurse on the active shift, Operations, and the Fatigue / Burnout / HR Workflow research line. The Medication Shortage reads pharmacy count, the Pharmacist on shift, active contracts, the Manufacturing identity, and the supply-research line — and reads `supplyShortageChanceMult` and `supplyCostMult` straight off `getTechBonus()` to decide trigger frequency and emergency cost.

The most useful change in this pass was actually to the Impact panel. Before v1.21, the impact text in event modals was static — it described what *might* happen, not what *did* happen. For these new events that wasn't enough, because the whole point of the system is to show the player that their investments matter. The fix was a small data-model change: every event now has a `protectedBy` array of human-readable system names, and the modal builds a "Reduced by:" line from that array automatically. After the event resolves, an "Outcome:" line is appended showing the actual branch result with the real numbers — the grant amount, the fine amount, the number of rooms knocked offline, the name of the nurse who is now at quit-risk. That keeps the modal honest. A player who reads it after the fact sees both *what their preparation was supposed to protect against* and *what actually happened*.

Two smaller fixes followed naturally. Staff checks were tightened to use the active shift, so a night-shift Pharmacist no longer covers a daytime medication shortage on paper. And the Car Pileup score was sharpened to require the full surge response — ER, Ambulance Bay, Dispatch, Surgery, and inpatient capacity — for a clean outcome, with Blood Bank as a bonus rather than a substitute. The intent was that the player should never feel like the game gave them a pass because of a side-system; the core response chain has to be in place.

The hope is that these events make the mid-game feel less like a steady graph and more like a sequence of moments the hospital lives through. A blackout that you sail through because you built the generator three stages ago is a different feeling than a blackout that knocks ICU and Surgery offline at the same time. Both are still the same event card. The difference is what the player did before it showed up.

## Entry 17 - UI Evenness & Clipping Pass

A round of work that adds no new content and changes no game logic. The point was to make the existing interface feel like one design instead of fifteen design decisions stacked on top of each other.

The most visible inconsistency was the close button. Most modals had `<button class="modal-close">Close</button>` as the first child of the modal box, with no positioning, so it sat inline above the kicker — which meant the visual weight of every modal started with a gray "Close" pill on the left, then a small uppercase kicker, then the real title. The Grants modal already had its own override that placed the close button at the top-right corner, so when a player moved between Grants and, say, Research or Contracts, the layout shifted in a way that was hard to articulate but obvious if you went looking. The fix was a single shared override: every modal box gets `position:relative`, `.modal-close` (excluding the patch-tabs inline variant) gets `position:absolute; top:14px; right:14px;`, and every kicker reserves `padding-right:84px` so it can't collide with the floating button. Now the visual entry point of every modal is the same — kicker, title, subtitle, content — with the close button anchored to a single consistent spot.

The z-index scale was the second cleanup. The codebase had grown with one decade per layer: HUD elements at 2–17, floating cards at 17, the room panel at 18, in-game modals at 20–30, and then a separate set of fixed-position modals (Department, Grant, Executive, Delegation, Live Event) sitting at 800, 900, 1000, and 1200. Toasts sat at 80, which meant a toast fired during a Grant approval or an event modal was simply invisible. The fix was to define seven CSS variables (`--z-hud`, `--z-floating`, `--z-tooltip`, `--z-modal-ingame`, `--z-modal-fixed`, `--z-titlescreen`, `--z-toast`) and re-anchor the elements that mattered most — the tooltip just above the floating cards, and the toast stack at 1500 so it always wins against every modal on the page. The original modal layering wasn't disturbed; only the relationships that were causing real bugs got rewired.

The tooltip clip fix was small but felt good. The original code positioned the tooltip at `clientX + 12` from the canvas left edge, which meant hovering a room on the right side of the map produced a tooltip that ran off the page. The new helper measures the tooltip's own width and height after it's rendered, then flips horizontally and/or vertically when it would otherwise overflow the canvas viewport. There's also a margin clamp so a tooltip never starts off-screen on the left or top.

A handful of smaller polish items rounded out the pass — the top stat bar no longer clips long currency values, sidebar room buttons wrap clean on long names, the brand input ellipsizes when the hospital name is too wide for the card, the bottom toolbar has a uniform 54px min-height with the floating map cards lifted to 64px so they don't crash into it, and the right-rail menu-panel summaries now share a 42px min-height for even sibling spacing. None of these are dramatic in isolation. Together they are the difference between an interface that feels like it was designed and an interface that feels like it grew.

The discipline in this pass was that nothing in the gameplay layer was allowed to change. No new gameplay modals, no new game state, no new event branches. The only file touched besides the stylesheet was `game.js` to add a `placeTooltip` helper that the existing tooltip code now calls. Polish work earns more trust when it doesn't drag a logic change along with it.
