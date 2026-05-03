# My Medical Center Patch Notes

## v1.34 — Lighter Brand Logo

A short visual fix-up patch.

### Fixed

- **Top-left brand logo no longer renders as a broken-image icon.** Swapped the heavy 1.4 MB PNG for the 3 KB SVG that ships in `/assets`, added an `onerror` fallback to hide the element if the file ever goes missing, and capped the image at **140×42** with `object-fit:contain` so it always sits cleanly inside the brand pill without overlapping the cash/rep badges next to it.

### Notes

- Campus photo backdrops introduced earlier in the v1.34 cycle were reverted — the procedural placeholder backdrop (green lawn + parking strips + ambient details) is the active map background again.

---

## v1.33 — Stability Pass: Save/Load Crash Fix + Stress Harness

A behind-the-scenes reliability pass. No new content, no balance changes — just fewer ways for the game to crash.

### Fixed

- **Daily Goal no longer crashes after Load Game.** When a save was loaded, `dailyGoal` was being restored straight from JSON, which silently dropped its `current()`, `done()`, `reward()`, and `progress()` closures. The next end-of-day would then throw `dailyGoal.done is not a function` and break the day-rollover. The loader now resets `dailyGoal` to `null` on load so `generateDailyGoal()` rebuilds a working goal on the next morning.

### Added

- **`.local/stress_test.js` — automated stress-test harness.** Boots the full game in jsdom, then drives 13 punishing scenarios in sequence: starting a new game on every difficulty × first three campuses, placing one of every room type, 7,000 simulated game ticks, opening every modal, hire/grants/contracts/research cycles, save → load loops, repeated event triggers, and a hover sweep across every `data-tt-*` tooltip target. Every console + window error is captured and bucketed; run with `node .local/stress_test.js`.

### Notes

- Remaining harness errors (`URL.createObjectURL`, `Element.scrollTo`) are jsdom-only limitations and do not affect any real browser.

---

## v1.32 — Universal Tooltip System

A single hover surface for the whole game. Every information-dense element — room buttons, HUD stats, research nodes, grants, contracts, staff trait chips, map cards, difficulty cards, the public-care agreement — now uses the same rich tooltip with consistent sections.

### Added

- **`systems/tooltip.js`** — one shared `#tt-pop` panel with delegated `mouseover`/`focus` events, 120 ms open / 60 ms close delays, smart positioning (right → left → below, viewport-clamped), Escape-to-close, and a `MutationObserver` that auto-tags newly-rendered build buttons.
- **Structured tooltip layout.** Each tooltip renders the same fixed sections in order: badge chip · title · description · stat effects (good/bad/neutral) · requirements (met/unmet) · warnings (amber) · recommended action (blue) · footer.
- **Resolvers** that read existing in-game data so each integration point only needed a one-attribute hook:
  - `data-tt-room` → `RDEFS` (auto-applied to `.rb[data-tool]` build buttons by the observer)
  - `data-tt-stat` → curated blurbs for cash, reputation, cleanliness, stress, RP, waiting, grade, debt, nurse coverage, CNA coverage
  - `data-tt-research` → `RESEARCH_TREE` (cost vs current RP, met/unmet prereqs, low-RP warning)
  - `data-tt-grant` → `GRANT_LIBRARY` (approval odds, review time, payout, overpromise warning)
  - `data-tt-contract` → `CONTRACT_LIBRARY` (payment, daily revenue, public-care pressure)
  - `data-tt-trait` → trait library + `getTraitEffectText`
  - `data-tt-map` → campus deltas (construction / research / govt pressure / public-care demand), drawbacks, recommended for
  - `data-tt-difficulty` → `DIFFICULTY_PRESETS`
  - `data-tt-publiccare` → hand-authored Asherville agreement summary
- **One-off inline tooltips.** Any element can carry `data-tt='{...}'` for a one-shot rich tooltip without registering a resolver. Plain `title=""` attributes are auto-converted to a description-only tooltip so legacy markup keeps working.

### Changed

- HUD stat tiles + Stats modal tiles, the Public Care card, research node cards, staff trait chips, grant cards, active contract cards, difficulty cards, and campus cards all replaced their old `title=""` strings with the new attributes.

### Notes

- Style matches the existing app language: white card with subtle shadow, blue accent badge, neutral grey body, green/red stat deltas, amber warning section, blue recommendation block.

---

## v1.31 — Polish Pass: Animations & Sound

Two small modules that make the same actions *feel* like something happened.

### Added

- **`systems/anim_polish.js`** — subtle motion across the UI: button press scale-down, modal open/close fade+slide, toast slide-in, stat-tile pulse on value change, log-line fade-in, badge pop on update. All animations honor a global `prefers-reduced-motion` setting and the in-app *Reduce motion* toggle.
- **`systems/sound.js`** — lightweight WebAudio sound layer with a curated set of UI cues: button click, modal open/close, toast, day-tick, money-in, money-out, treatment-success, build-place, build-deny, hire-confirm, research-complete, game-paused/resumed, game-over. Sounds are generated procedurally (no external files) so there's nothing to download.
- **Volume controls** in Settings: master volume slider plus a *Mute* toggle. Both are persisted to local storage and respected on the next load.

### Notes

- Both systems install themselves on `window` (`window.animPolish`, `window.playSound`) and every call site is feature-guarded, so older save loads, headless tests, and audio-disabled environments degrade gracefully.

---

## v1.30 — Escape Closes Any Modal

A small but pervasive quality-of-life pass on the modal layer.

### Changed

- **Escape key now closes the topmost open modal**, no matter which one it is. Previously only Budget/Marketing/Roster/Dispatch responded to Escape; now Staff, Employees, Departments, Grants, Research, Contracts, Patch Notes, Settings, Stats, Stage, and Event modals all dismiss with a single keypress.
- **Most-recently-opened wins.** If you stack modals, Escape peels them off one at a time in the order you opened them.

### Notes

- Title screen and the Game Over screen are intentionally not Escape-dismissable.

---

## v1.29.1 — Single-Row Launcher Bar

A small layout polish on the v1.29 launcher row.

### Changed

- The `#rp-launchers` button row no longer wraps into 3+ rows on a narrow side panel. It's now a **single horizontal row that scrolls sideways**, with thin scrollbar styling, scroll-snap, and a soft fade mask at both edges to hint at off-screen buttons.
- Buttons keep their existing `title` tooltips, so hovering still reveals the full launcher label.

---

## v1.29 — Right Panel Declutter

The right side of the screen had grown into a wall of stacked panels. v1.29 reduces it to four core widgets and tucks every secondary system behind a launcher button row.

### Added

- **Launcher button row** with live badges for Snapshot/Stats, Budget, Departments, Roster, Dispatch, Contracts, Insurance, Marketing, Grants, and Research/Tech Tree. Badges show the most useful at-a-glance number (cash on hand, pending dispatches, active grants, etc.).
- **New launcher modals** for Budget, Marketing, Roster, and Dispatch — each one hosts the existing panel content so nothing was rebuilt or lost.
- **Stats Snapshot modal** now folds in the full stats grid and pressure dashboard alongside the existing chart.

### Changed

- **The right panel is now four widgets only:** Warnings, Current Goal, Asherville Public Care Agreement, and Log. Everything else moved into a launcher.
- Backdrop blur and Escape handling were extended to the new modals so they feel native.

### Notes

- All renderers still target the original element IDs, so no per-system rewiring was needed.

---

## v1.28 — Floor-1 Prisoner Wing, Auditorium & Renovations

A pair of large, distinctive Floor-1 rooms — and a brand-new system for renovating an established floor.

### Added

- **Prisoner Wing** (10×5, Floor 1 only). Requires a Security Office or a hired Guard. Generates **+$800/day** corrections income while staffed and connected, plus a small stress pulse from the workload.
- **Auditorium** (10×6, Floor 1 only). Every 30 days yields **+$5,000**, **+2 reputation**, and a small crowding stress pulse.
- **Renovation system.** Demolishing an "Established" room (built 90+ days ago) on an active floor opens a Renovation modal: starting one re-zones the entire floor for **30 days at 33% speed** for every non-exempt room (vending machines, drink stations, ATMs are exempt). Subsequent demolitions on a renovating floor are free until the renovation finishes.
- **Floor controls** show "Renovation Xd (33% speed)" while a floor is being remodeled.
- **Room panel** shows "Built day X" and a "⭐ Established" tag once a room hits the established threshold.

### Notes

- Older saves default any missing `room.builtDay` to day 1, so existing rooms count as Established immediately.
- The auditorium has no fixed staff role — a long-standing crash in `sel()` from null `staffRole` was fixed in the process.

---

## v1.27 — Unified Staff XP & Leveling

Every employee now grows over time, not just interns. Each staff member moves through five tiers — **New Hire → Experienced → Specialist → Senior → Veteran** — gaining XP from shifts and patient care.

### Added

- **5-tier level system for all staff.** Levels 1–5 unlock progressively higher salary multipliers (1.0× / 1.15× / 1.35× / 1.6× / 2.0×) and progressively soften their negative trait (100% → 30% impact). Level 3 grants a bonus perk; Level 5 grants a second, veteran-tier perk.
- **XP from work.** Active employees earn XP from each shift, with a small bonus when their role matches the floor specialization or stress is high. Treating a patient grants additional XP to the treating staff member.
- **Mentor/Fast Learner amplifiers** now apply to every coworker on the same shift, not just interns.
- **Hire screen + staff cards** show level, title, XP bar, effective monthly salary (base × multiplier), earned perks, and the current negative-trait impact percentage.

### Changed

- Wage bill and raise requests now use **effective salary** (base × level multiplier).
- Negative traits like *Coffee Dependent*, *Shift Gremlin*, *Vanishing Act*, *Meeting Summoner*, *Fragile Ego*, and *Burnout Risk* now scale their impact down as the staff member levels up.
- Interns are folded into the same XP pipeline; their existing promotion-on-Specialist behavior is preserved.

### Notes

- Older saves load cleanly — every existing staff member is back-filled at Level 1 with full XP/perk fields.

---

## v1.26 — Bigger, Sharper Map

A small but very visible quality pass on the play surface.

### Added

- **Doubled render resolution.** The map canvas now draws at 2× pixel density (HiDPI backing store). Room art, text, sprites, and UI overlays look noticeably crisper on retina/high-DPI displays without changing the on-screen size of anything.

### Changed

- **Larger campus footprint.** Every campus expanded from 30×18 to **44×26 tiles** — roughly twice the buildable area on each map. Plenty of room to lay out long corridors, dedicated wings, and outdoor amenities without the map feeling cramped.
- **Starter prefabs re-anchored.** Each campus's seed hospital still spawns near the top of the lot but is now linked to the front entrance via a longer access corridor that reaches the new road edge, so the opening seconds feel grounded rather than floating in empty space.

### Notes

- Procedural terrain (roads, parking strips, water, cliffs) scales automatically to the new dimensions on every campus.
- Older 30×18 saves load fine — the save system pads the grid to the active campus size on load.

---

## v1.25 — Campus Maps & Map Selector

After choosing a difficulty, you now choose **where** to build your hospital. Six distinct campuses are available, each with its own grid size, surrounding terrain, buildable footprint, and small starting tweaks. A flat sandbox plot is also available for free-form play.

### Added

- **Campus selector screen.** A new modal opens after the difficulty picker (and from the sandbox link) showing all available campuses as cards with thumbnail, traits, and grid dimensions. The choice is locked in for the run.
- **Six themed campuses + flat sandbox default.**
  - **Regional Hospital** — balanced suburban site, parking strips, +10% starting cash. *Recommended starter.*
  - **Suburban Pond** — irregular pond reduces buildable space; +5 starting reputation.
  - **Waterfront** — harbor blocks the western edge; -10% supply costs (hook reserved).
  - **Hillside** — jagged cliffs on the west; -5% starting cash.
  - **Riverdale University** — river crosses the north strip; +50 starting research.
  - **Downtown Urban** — surrounded by streets on three sides, very tight footprint; +10 starting reputation.
  - **Flat Plot** — open rectangular lot, single road, default sandbox campus.
- **Larger play area.** Every campus uses a 44×26 grid (up from 27×15) for noticeably more room to build.
- **Buildable mask + terrain rendering.** Floor 1 honors a campus-specific buildable footprint; non-buildable cells render as water, road, parking, trees, or cliff and reject corridor/room placement.
- **Per-campus starter prefab.** Each campus places its own anchored set of starter rooms and corridors so the opening seconds always make sense for the surrounding terrain.
- **HUD campus badge.** A small badge next to the difficulty pill shows which campus is in play and tints to the campus color.
- **Save round-trip.** `selectedCampusId` is persisted in `.mmcsave` files; loading a save restores the campus footprint before grids and rooms are applied. Older saves fall back to **Regional Hospital** automatically.
- **Sandbox campus picker.** The "Use Sandbox Mode instead" link now opens the campus picker pre-selected to the flat plot, with quick switching to any other campus for sandbox play.
- **Tutorial pinned to default campus.** Starting the tutorial always uses **Regional Hospital** so the canned scenario coordinates remain valid.

### Changed

- **Upper floors stay rectangular.** Buildable mask only applies to floor 1 — clinical and advanced floors remain fully open within the grid as before.

---

## v1.24 — Floor Specialization System (10 Specs)

The floor-specialization system grew from 6 archetypes to **10 distinct floor identities**, each with its own color accent on the floor chip and panel. Floor 1 now defaults to General Patient Care (no more "unchosen" prompt on a brand-new game), and the choose-specialization modal only opens for floors 2 and up.

### Added

- **Four new specializations.** Beyond the original six, you can now build **Surgical Services** (operating rooms, perioperative care; surgery rooms +10% speed and +8% revenue on the floor), **Women's Health & Family Care** (OB/GYN, fertility, family services), **Digital & Automation** (servers, AI, hospital systems; +5% research speed), and **Manufacturing & Supply** (in-house production, sterile processing; room construction on the floor costs 8% less).
- **Per-spec color accent.** Every specialization carries a hex color used to tint the active floor chip and the "current specialization" badge in the floor panel, plus the picker cards in the choose modal.
- **Universal Security Office.** The Security Office is now part of the universal-rooms list and can be built on every specialized floor.
- **Sandbox mode bypass.** In sandbox, every floor is treated as fully unlocked for building — no specialization gating, no universal-list filter.
- **Wait-threshold bonus on General Patient Care floors.** Patients on General floors wait +2 ticks longer before reputation drops, slowing waiting-pressure growth.
- **Stress growth penalty on Emergency & Critical Care floors.** Stress accrues 10% faster while at least one Emergency floor is staffed.

### Changed

- **Floor 1 defaults to General Patient Care** on a brand-new game and on existing saves whose Floor 1 was Unchosen — the modal will not re-prompt for Floor 1.
- **Cancelling the choose-specialization modal** on a floor with no spec yet now defaults that floor to General Patient Care (instead of leaving it unbuildable).
- **Locked-room tooltip wording** is now `Not allowed on Floor N (Spec)` and consistent across the build sidebar, dock, and placement attempts.
- **Save migration to v1.24.** v1.22/v1.23 keys (`general`, `emergency`, `admin`, `research`, `private`, `vip`, `cardiac`, `trauma`, `critical_care`, `surgical`) are remapped to the v1.24 equivalents on load. `floorSpecVersion` bumped to **3**.

### Notes

Several specializations carry descriptive bonus/drawback text (cleanliness severity, IT-outage amplification, public-criticism risk, supply shortages) that are tagged *(descriptive — future task)* on the spec card. Those hooks are reserved for future systems.

---

## v1.23 — Floor Specialization System

Floors finally *mean* something. Each floor you unlock now picks a specialization that decides which rooms you can build there and grants passive bonuses (and drawbacks) to the whole hospital. Stack the same specialization across multiple floors for stronger effects with diminishing returns.

### Added

- **Six floor specializations.** Pick from **General** (balanced patient care), **Emergency** (ER/ICU/surgery throughput), **Diagnostics** (lab/imaging speed), **Operations** (HR/IT/grants/compliance), **Research** (RP and trainee development), and **Private Care** (VIP rooms and cosmetic procedures). Each has its own unlocked-room list, bonus block, drawback block, and reserved-rooms preview for future content.
- **Choose-on-unlock modal.** Switching to a freshly-unlocked floor (or any floor whose specialization is still **Unchosen**) automatically pops a richly-formatted modal showing each specialization's bonuses, drawbacks, and reserved rooms side-by-side. Pick one to lock in the floor's identity.
- **Build-palette gating.** The room sidebar and dock now grey out and disable any room that doesn't belong to the current floor's specialization, with a tooltip explaining which specialization unlocks it (e.g. *"🚨 Emergency floor only"*). Universal infrastructure (corridors, stairs, bathrooms, vending, staff rooms, HVAC, entrances) is allowed everywhere.
- **Renovate Floor button.** A new floor-panel button opens the same modal in renovate mode so you can switch a floor's specialization later. Renovation costs **$25,000 base + $2,500 per existing room on the floor**, charged on confirmation. Existing rooms keep working — only future builds are restricted to the new specialization.
- **Passive bonuses & drawbacks engine.** Specializations contribute additively to the existing leadership/identity aggregator. Bonuses include grant approval odds, daily research points, research speed, private revenue multiplier, government compliance pressure (lower or higher), wage bill, baseline stress, public reputation, and per-room treatment speed for matching room types (e.g. ER on an Emergency floor treats 12% faster). Magnitudes stay in the 5–15% range per floor.
- **Diminishing returns when stacking.** Each additional floor of the same specialization contributes 70%, 50%, 35%, then 25% of the base bonus, so doubling up helps but the marginal return drops fast. The same ladder applies to per-room treatment-time bonuses (the 2nd Emergency floor's ER speeds up by ~70% as much as the 1st).
- **Unchosen floors are fully build-locked.** Until you pick a specialization, *no* construction (including corridors, stairs, bathrooms, and other infrastructure) is allowed on that floor. The choose-specialization modal pops automatically on first visit.
- **Migration log entry.** When loading a v1.22 save, the game now writes a one-time log line listing exactly which floors were remapped (e.g. `F2 cardiac→emergency, F3 vip→private`).

### Changed

- **Save migration from v1.22.** Older saves had specializations like `cardiac`, `surgical`, `trauma`, `critical_care`, `pediatrics`, and `vip` — these are remapped on load to their v1.23 equivalents (Emergency, General, Private Care). Floors that had no specialization key default to **Unchosen** so the modal pops next time you visit them.
- **Floor panel.** The fixed two-column chip grid was replaced with a single contextual button — *Choose Specialization…* when the floor is unchosen, or *🛠 Renovate Floor* when it has one. The header still shows the active specialty's icon and name.
- **Diagnostics floor cost drawback.** Building lab/X-Ray/radiology rooms on a Diagnostics floor costs 12% more, layered on top of existing leadership-driven cost multipliers.

### Notes

- No new RDEFS, no new staff roles, and no balance changes to existing rooms outside the per-floor speed multipliers.
- Reserved-room lists in each specialization card are display-only previews of what future patches will add.

## v1.22 — UI Evenness & Clipping Pass

A polish-only pass focused on making the existing interface feel calm and consistent. No gameplay changes, no new content.

### Changed

- **One coherent z-index scale.** Replaced ad-hoc z-index values across the whole stylesheet with a single set of CSS variables on `:root` (`--z-canvas`, `--z-hud`, `--z-action`, `--z-floating`, `--z-roompanel`, `--z-modal-ingame`, `--z-modal-fixed`, `--z-titlescreen`, `--z-tooltip`, `--z-toast`). Tooltips now ride above every modal layer, toasts ride above every tooltip, and the previously-staggered fixed modals (Department/Grant/Live Event/Delegation/Executive at 800/900/1000/1200) sit on a single `--z-modal-fixed` tier with deterministic offsets.
- **Unified modal positioning.** Every modal in the game now uses `position:absolute; inset:0` inside the `#game` shell — Department, Grant, Live Event, Delegation, and Executive (which were `position:fixed`) were brought onto the same model as the rest. The top stat bar stays visible during management actions, and modal backdrops are confined to the game shell.
- **Floating map cards no longer overlap.** The heatmap legend was moved up off the bottom-left corner where it was anchored on top of `#mapbottommeta`; both now stack vertically with a clean 64px / 184px split.
- **Standardized close-button placement.** Every modal now anchors its `.modal-close` button at the top-right of the modal box. Previously the close button sat inline before the kicker on most modals (Staff, Employees, Research, Contracts, Settings, Stats, Executive, Delegation, Department, Live Event), but at top-right on Grants. Kickers and titles now reserve enough right-padding so they don't collide with the floating close button.
- **Tooltip edge-flip.** The hover tooltip now measures its own size after rendering and flips left/up when it would otherwise extend past the right or bottom of the canvas viewport. No more clipped tooltips when hovering rooms near the right edge of the map.
- **Top stat bar clipping.** Loosened `overflow:hidden` on stat tiles so long values like `$1,234,567` no longer get cut off when the hospital scales into late-game economics.
- **Sidebar room name wrap.** Long room names ("Cosmetic Consultation Office", "Premium Waiting Lounge") now wrap with `overflow-wrap:break-word` and `hyphens:auto` instead of being clipped or breaking mid-word, and the `.rp` capacity pill is unaffected.
- **Bottom toolbar evenness.** Standardized gaps and a uniform 54px min-height on `#maptoolrow`, with the floating map cards (mid-meta, heatmap legend, floor switch panel) lifted to a shared 64px bottom offset so they no longer crash into the toolbar when it wraps.
- **Brand input overflow.** The hospital rename field now ellipsizes long names inside the rounded brand card instead of overflowing the parent.
- **Accordion alignment.** The right-rail menu-panel `summary` rows now share a consistent 42px min-height and centered alignment regardless of the kicker/badge contents.

### Notes

- No gameplay logic was touched. Pure CSS variables, a single new `placeTooltip` helper in `game.js`, and version bumps.
- Existing modal markup is unchanged; the new close-button placement is purely a stylesheet override.

---

## v1.21 — Mid-Game Pressure Events

### Added

**Five new mid-game pressure events** that test how prepared the hospital is when something goes wrong. Each opens the existing event modal with a single Continue button and resolves on the spot — outcomes branch on what the player has already invested in (rooms, staff, research, departments, leadership, contracts).

- **Blackout** 🔌 *(Expanding stage+, Crisis, Uncommon)* — A regional power failure rolls across the grid. With backup systems in place (HVAC / Power Generator, Digital Backup System research, IT Department + IT Specialist, Operations dept upgrades) Surgery and ICU stay online. Without them, three critical rooms can briefly go dark and stress and reputation slip.
- **Car Pileup** 🚑 *(Expanding stage+, Crisis, Uncommon)* — Dispatch routes multiple casualties from a highway pileup. Hospitals running the full surge response — ER, Ambulance Bay, Dispatch Office, Surgery, and inpatient capacity (Ward / ICU) — absorb it cleanly for a reputation gain. A patchy response means lobby overflow, stress spike, and reputation loss. Blood Bank gives an extra cushion when present.
- **Public Care Review** 🏛️ *(Medical stage+, Pressure, Uncommon)* — Asherville officials audit the public-care commitment. Meeting the public-patient quota plus any of Admin upgrades, the Government Liaison board seat, the Public Mission CEO, or Government Compliance / Compliance Tracking / Audit Shield research flips this from a fine into a grant. Failing scales the cash penalty and reputation hit by your existing government penalty multipliers.
- **Nurse Burnout Wave** 😩 *(Expanding stage+, Pressure, Uncommon)* — A wave of burnout hits the active shift. Staff Room, Lunch Room, an HR Manager on shift, a Charge Nurse on shift, Operations dept upgrades, and Fatigue Management / Burnout Prevention / HR Workflow research catch it early — morale and energy recover. Without that support, nurse morale and energy collapse, a ward room can briefly stall, and the most-tired nurse risks quitting.
- **Medication Shortage** 💊 *(Expanding stage+, Crisis, Uncommon)* — A regional drug-supply gap hits the pharmacy. Multiple Pharmacies, a Pharmacist on shift, an active insurance/supply contract, the Manufacturing identity (supply cost / shortage multipliers), and Central Supply Standards / In-House Supply Production / Preventive Maintenance research limit damage to a small alternate-supplier cost. Without those, the pharmacy stalls briefly and emergency-supply costs spike. Trigger frequency is gated by `supplyShortageChanceMult`, and emergency cost is scaled by `supplyCostMult`.

**Smarter Impact panel.** The event modal's Impact block now shows two new things:

- A generated **"Reduced by:"** line listing the protective systems for each event, built from a new `protectedBy` array on the event definition (so the line stays in sync with the actual gating logic).
- An **"Outcome:"** line that updates after the event resolves to show what actually happened on the chosen branch — including the dynamic values (grant amount, fine amount, number of rooms affected, name of the at-risk nurse).

### Changed

- Staff-dependency checks for these events (`it_specialist`, `hr_manager`, `charge_nurse`, `pharmacist`, plus the affected-nurse list for Burnout Wave) now respect the active shift via `isStaffAvailable`, so a night-shift Pharmacist no longer covers a daytime medication shortage on paper only.
- Car Pileup now requires the full ER + Ambulance Bay + Dispatch + Surgery + inpatient set for a clean response, with Blood Bank as a bonus rather than a substitute.

### Notes

- No new rooms, staff roles, research, CEOs, or board members were introduced. All five events plug into existing systems and read existing tech bonuses.
- Each branch writes a single good/bad log line and uses existing setters (`changeMoney`, `adjustReputation`, `disableRoom`, `clamp`, `reduceStress`).

---

## v1.20 — Playtesting Readiness Pass

### Added

**Modal subtitles for every advanced panel.** Each major modal now opens with a one-line description that explains *what the panel is for* before the player sees its contents:

- **Executive Leadership** — "Hire one CEO and up to five board members for hospital-wide bonuses. CEOs adapt before bonuses fully apply; board members trade strong bonuses for drawbacks."
- **Delegation & Automation** — explains research-unlocked background roles (auto-hire, auto-train, auto-clean, stress relief).
- **Hire Staff** — explains role/room matching and the trait search.
- **Employees & Needs** — explains the morale, burnout, raise, and quit-risk scope.
- **Department Upgrades** — clarifies that upgrades touch *whole systems* (ER, diagnostics, admin, IT, operations) instead of single rooms.
- **Grant Program** — explains the four grant categories, the Grant Writer's effect on approval odds, that risky grants can still be denied, and that overpromise grants can claw back funds at expiry if stress, cleanliness, or the public-care quota slipped.
- **Research Tree** — names all six branches (Clinical, Diagnostics, Operations, Administration, Digital, Access) and the Identity layer.
- **Contracts** — frames insurance and the Asherville Public Care Agreement as a tradeoff between volume/revenue and quota/staff pressure, and explicitly calls out the compliance-pressure raised by each private contract at the monthly review.
- **Statistics** — describes the 90-day trend coverage.
- **Reputation HUD tooltip** — extended to call out that reputation also drives patient inflow per day, raises grant approval odds, and improves city standing.
- **Traffic Heatmap legend** — gained an inline one-line description explaining that the overlay highlights bottlenecks and congestion in patient movement.
- **Budget** (right-rail panel) — adds an inline description of the income/expense/debt-watch view, noting that the debt closure threshold depends on the chosen difficulty.

**Soft-guide checklist expanded from 4 to 9 steps.** New (non-tutorial) players who load straight into the game now see a complete onboarding ladder:

1. Draw corridors
2. Place a Waiting Room
3. Place a GP Office
4. Hire a Clerical worker
5. Hire a GP Doctor
6. Hire a Nurse
7. Hire a Janitor
8. Press Play
9. Treat your first patient

The checklist still hides during the formal tutorial and once dismissed.

**`early-muted` visual treatment for advanced bottom-bar buttons during the basic tutorial.** While the tutorial is on steps 1–9 (placement, hiring, watching the first flow), six advanced buttons are dimmed but still clickable:

- 🏢 Depts
- Research
- 📝 Grants
- Contracts
- 🏢 Executives
- ⚙️ Delegation

This reduces first-five-minutes UI clutter without locking anything. The existing `tutorial-muted` class on Research, Contracts, and Advertising remains in place, so those buttons inherit both treatments while basic flow is being learned.

### Changed

- **Warning cards now render their fix line as `→ Fix: …`** instead of just `→ …`. The label makes the recovery prompt unambiguous next to the warning copy. The bottom-bar `#hint` placeholder also points players at this new label.
- **Bottom hint bar is now fully state-aware in stable play.** `updateContextHint()` previously fell back to a fixed "Hospital stable — watch wait times…" string when no warning state was active. It now flows through `getStableHint()`, which already produced state-aware encouragement (build a GP office, hire a janitor, low cash, low reputation, slipping quota, calm-running). New players in a healthy hospital now see the same actionable nudges that drive the warning deck's stable card.

### Notes

- No gameplay constants, balance values, save shape, or tutorial step count changed. v1.19's 18-step tutorial and the v1.19 Asherville lore framing remain intact.

---

## v1.19 — Asherville Lore

### Added

**Asherville setting** — The hospital is now explicitly located in the city of Asherville. Every public-care interaction is framed around the **Asherville Public Care Agreement**, the land-use deal that started the hospital.

- **Title screen** now includes the Asherville intro:
  > *The Government of Asherville has entrusted you with public land to build a world-renowned medical center.*
  > *In exchange, your hospital must provide care to residents at little to no profit.*
  > *Balance public duty, financial survival, staff pressure, and expansion as you grow from a small clinic into a major medical institution.*
  >
  > **Private care keeps the lights on. Public care keeps the land.**

- **Government Contract panel renamed to "Asherville Public Care Agreement"** in both the sidebar and the contracts tab, with new descriptive copy and per-status one-line summaries:
  - *Compliant:* Asherville officials are satisfied with your public care levels.
  - *At Risk:* Public care levels are slipping. Future funding may be reviewed.
  - *Non-Compliant:* The city is preparing penalties, audits, or restrictions.

- **Government review event renamed to "Public Care Review"**, with flavor titles drawn from a new `ASHERVILLE_LORE_EVENTS` pool: *Public Care Review*, *City Council Hearing*, *Community Protest*, *Emergency Funding Vote*, *Land Use Audit*, *Mayor's Visit*.

- **Tutorial step "Government Care Requirement"** updated to "Asherville Public Care Agreement" with the full lore framing.

### Notes

- Lore-only update: no gameplay constants, balance values, or save shape changed. All existing systems and saves remain compatible.

---

## v1.18 — Board Members Rework

### Changed

**Board of Directors data redesigned** — Each of the 7 archetypes now has a stronger, clearer bonus/drawback pair backed by a richer data shape: `id`, `name`, `category`, `description`, `bonusText`, `drawbackText`, `effects.{bonus,drawback}`, and `bestFor`.

- **Finance Strategist (Finance)** — *Bonus:* patient revenue +10%. *Drawback:* staff raise requests cost 15% more.
- **Construction Executive (Construction)** — *Bonus:* new floors and corridors cost 20% less. *Drawback:* GP Offices and Waiting Rooms cost 50% more.
- **Insurance Network Executive (Contracts)** — *Bonus:* insurance contract rewards +25%. *Drawback:* government public care requirement increases by 5%.
- **Government Liaison (Government)** — *Bonus:* government penalties −25%, public care grants approve more easily. *Drawback:* private insurance contracts pay 10% less.
- **Tech Investor (Research & IT)** — *Bonus:* research speed +20%, +1 RP per day. *Drawback:* IT outage penalties are 25% worse.
- **Manufacturing Investor (Operations)** — *Bonus:* room and corridor costs reduced. *Drawback:* sterile failure events have stronger penalties.
- **Public Health Philanthropist (Reputation)** — *Bonus:* grant rewards +20% and public-care reputation gains increase. *Drawback:* private and VIP room costs increase.

### Added

**New effect hooks wired into existing systems** so board effects bite for real:
- `raiseCostMult` — multiplies the amount staff request for raises (Finance Strategist drawback).
- `govRequirementBonus` — adds to the effective public-care quota threshold during government review (Insurance Network Executive drawback).
- `grantRewardMult` — multiplies grant cash payouts at activation (Public Health Philanthropist bonus).
- `privateRoomCostMult` — multiplies build cost for VIP, single, and double hospital rooms (Public Health Philanthropist drawback).
- `publicReputationBonus` — additive reputation modifier hook for public-care interactions.

### UI

- Executive Leadership modal now shows **Board Seats: X/5** and an explicit empty-state message when no members are appointed.
- Each board card surfaces the member's category chip, bonus, drawback, and a "Best for" recommendation line.
- Appointment buttons relabelled to **"Add to Board — $cost/mo"**.

---

## v1.17 — CEO Legacy Events

### Added

**CEO Legacy Events** — Once a CEO finishes their adaptation period, they periodically trigger unique positive events tied to their archetype. Events fire every 15–22 days (randomised), shown through the existing event modal with a green impact summary and an "Excellent" confirmation button.

- **Dr. Elena Marsh (Public Mission):** *Community Health Summit* (+$4,000, Reputation +6, +5 RP) or *Public Health Award* (Reputation +9, Score +25).
- **Marcus Chen (Corporate Growth):** *Investor Relations Windfall* (+$9,000 cash) or *Premium Referral Network* (+$6,000, Reputation +3).
- **Priya Vasquez (Operations):** *Operational Excellence Report* (Stress −20, Cleanliness +12, +$3,500) or *Process Optimization Dividend* (+$5,000, Cleanliness +8, Score +15).
- **Prof. James Okafor (Academic):** *Landmark Research Publication* — Legendary (+35 RP, Reputation +6, Score +20) or *Academic Excellence Grant* (+$8,000, +15 RP).
- **Sasha Nomura (AI Visionary):** *AI Efficiency Breakthrough* — Legendary (+30 RP, +$6,000, Stress −10, Reputation +4) or *Digital Health Partnership* (+$5,500, +20 RP, Reputation +3).
- **Dana Kowalski (Manufacturing):** *Supply Chain Windfall* (+$6,500, Cleanliness +14) or *Cost Optimization Achievement* (+$5,000, Reputation +4, Score +15).

**Cooldown system** — `ceoLegacyCooldown` starts at a randomised interval on hire. After each event fires, a new random 15–22 day cooldown begins. Cooldown resets to a fresh interval on CEO replacement. Fully serialised in save data.

**Event rarity** — Most legacy events display as Rare. Landmark Research Publication and AI Efficiency Breakthrough display as Legendary.

---

## v1.16 — Executive Leadership System

### Added

**CEO System** — Hire one CEO at a time from six distinct archetypes. Each CEO brings major strategic bonuses, one serious negative trait that fades as they adapt to the role, and a tracked adaptation timeline.

- **Public Mission CEO (Dr. Elena Marsh)** — Government penalties halved, grant approval +12%, reduced compliance pressure. Negative: audit frequency increases (fades over 30 days).
- **Corporate Growth CEO (Marcus Chen)** — Private revenue +25%, insurance income +20%, patient traffic +10%. Negative: government public care pressure increases significantly (fades over 25 days).
- **Operations CEO (Priya Vasquez)** — Stress relief +3/day, cleanliness decay 25% slower, room costs −10%. Negative: staff morale drain, wage bill higher (fades over 20 days).
- **Academic CEO (Prof. James Okafor)** — Research speed +35%, +2 RP/day, grant approval +8%. Negative: training mistake impact worse, admin overhead higher (fades over 25 days).
- **AI Visionary CEO (Sasha Nomura)** — Research speed +40%, +3 RP/day, stress relief +2/day. Negative: IT outage events have tripled consequences (fades over 35 days).
- **Manufacturing CEO (Dana Kowalski)** — Room costs −20%, corridor costs −25%. Negative: sterile failure events have 2.5× worse impact (fades over 20 days).

**CEO Adaptation System** — Negative trait strength scales from 100% on hire day to 0% when fully adapted. Adaptation progress shown with a live progress bar in the modal. Negative effect strength displayed as a percentage.

**Board of Directors** — Appoint up to 5 board members from 7 available types. Each has one strong financial/strategic bonus and one meaningful drawback. Board effects are permanent (no adaptation decay).

- **Finance Strategist** — Private revenue +10%, insurance income +8%. Wage bill +6%.
- **Construction Executive** — Room costs −15%, corridor costs −20%. GP offices and waiting rooms cost 50% more.
- **Insurance Network Executive** — Insurance income +20%, patient traffic +8%. Government compliance pressure increases.
- **Government Liaison** — Government penalties −35%, grant approval +10%. Private revenue −6%.
- **Tech Investor** — Research speed +20%, +1 RP/day. Wage bill +5%.
- **Manufacturing Investor** — Room costs −10%, corridor costs −12%. Sterile failure events more severe.
- **Public Health Philanthropist** — Grant approval +8%, government penalties −20%. Private revenue slightly reduced.

**Executive Leadership Panel** — New "🏢 Executives" button in the bottom bar opens a dedicated modal with CEO cards, adaptation bar, board seat management, and hire/remove controls.

### Integration Hooks
- Government review penalty now multiplied by leadership `govPenaltyMult`
- Government compliance pressure from leadership added to `govPressure` calculation
- Grant approval chance includes leadership `grantApprovalBonus`
- Room build costs multiplied by leadership `roomCostMult` (plus per-type multipliers for GP and waiting rooms)
- Corridor costs multiplied by leadership `corridorCostMult`
- Patient revenue multiplied by leadership `privateRevenueMult`
- Insurance income multiplied by leadership `insuranceIncomeMult`
- Patient traffic chance includes leadership `patientTrafficBonus`
- Stress update includes leadership `stressReductionBonus`
- Cleanliness decay multiplied by leadership `cleanDecayMult`
- Staff morale delta includes leadership `staffMoraleBonus`
- Wage bill multiplied by leadership `wageBillMult`
- Sterile failure event damage scaled by `sterileFailurePenaltyMult`
- Training mistake event damage scaled by `trainingMistakeChanceMult`
- Leadership RP injected each day via `dailyResearchPoints`
- Monthly leadership payroll (CEO + board) charged at day 30

### Technical
- `CEO_ARCHETYPES` and `BOARD_MEMBER_TYPES` data arrays
- `getLeadershipBonus()` — central merger of CEO + board effects with adaptation scaling
- `leadershipPayroll()` — monthly salary sum for CEO + all board members
- CEO `daysInRole` incremented daily in `updateDailyHospitalState()`
- `currentCEO` and `boardMembers` serialized/restored in save data
- Both reset to null/empty on `resetGameState()`



This file tracks the major gameplay, UI, balance, and content updates added during development.

## v1.10 — Grant Program System (Full Implementation)

### Added

**Full Grant Program** — a complete multi-stage workflow for applying for and managing hospital grant funding.

**Grant Writer Staff Role** — staffing the Grant Writer Office enables the grant system. Twelve distinct traits now cover three tone bands:

- *Good traits:* Persuasive Writer (+7% approval), Policy Expert (+8% government grants), Budget Specialist (+15% reward cash), Fast Drafter (−1 review day), Community Advocate (+8% public/community grants), Relationship Builder (+7% private grants)
- *Neutral traits:* Perfectionist (+5% approval, +1 review day), Idealist (+6% community, −4% corporate)
- *Bad traits:* Disorganized (−4% approval, +1 review day), Weak Documentation (−8% approval), Overpromises (clawback risk), Burnout Prone (energy drain)

**Grant Library (16 grants, 4 categories):**

- **Government Grants:** Public Care Support, Community Health Access, Emergency Readiness, Rural/Underserved Care
- **Medical Department Grants:** Diagnostic Modernization, Critical Care Expansion, Surgical Capacity, Behavioral Health Access
- **Workforce Grants:** Nurse Retention, Burnout Prevention, Night Shift Support, Training Pipeline
- **Infrastructure Grants:** Energy Efficiency, Technology Boost, Facilities Renovation, Security Infrastructure

**Grant workflow stages:** Available → Apply → In Review (countdown) → Approved/Denied → Active (with effects) → Expired

**Approval chance formula** now uses each grant's own `successChance` as its base (instead of a flat 0.45), plus bonuses from:
- Writer skill and trait mods
- Reputation (±up to 10%)
- Government compliance (±8%)
- Admin department level (0% to +10%)
- Hospital stress penalty (up to −22%)
- Cleanliness penalty (up to −18%)
- Recent audit failure penalty (−12%)

**`getGrantAdminBonus()`** — Admin department levels 1–5 grant 0 / +2% / +4% / +7% / +10% approval bonus.

**`applyGrantDailyEffect(offer)`** — processes active grant effects each day:
- `public_subsidy`: pays `$subsidyPerCase × min(publicPatients, 6)` per day
- `nurse_support`: adds `moralePerDay` to all nurses, CNAs, and charge nurses
- `energy_efficiency` / `burnout_prevention`: reduces global stress by `stressRelief` per day; burnout_prevention also trickle-restores nurse energy
- `technology_boost`: adds `rpPerDay` to research points
- `night_support`: trickle-improves night-shift staff morale

**Full Grant modal UI** (`systems/grants.js` + `#grantmodal`):
- Four tabs: Available | In Review | Active | History (denied)
- Grant Writer status block with name, energy bar, morale, trait badge, and skill bonus %
- Grant cards showing category badge (color-coded), description, requirements (✓/✗ per requirement), approval chance with progress bar, review time, duration, reward text, and Apply button
- Approval chance breakdown (collapsible) showing each component's contribution
- In-Review cards with progress bar and days-remaining countdown
- Active grant cards with effect chips and remaining-duration bar
- Denied/History cards with clear visual state

**Grants button** added to the bottom action bar (before Contracts).

### Changed

- `getGrantApprovalChance()` now uses `def.successChance − 0.25` as base chance, includes `adminBonus` and `auditPenalty` in the sum
- `progressGrantProgramsDay()` now calls `applyGrantDailyEffect(offer)` each tick for every active grant before decrementing its day counter
- Load order updated: `grants.js` now loads between `contracts.js` and `game.js`

### Technical Notes

- All grant functions are in `game.js`; modal UI is isolated to `systems/grants.js`
- `grantOffers` array is already saved/loaded via `getSaveData`/`applyGameData` in `economy.js` — no save migration needed
- `stress` used throughout grant functions is the global 0–100 state variable (distinct from `stressLevel` display)
- Overpromise clawback is handled in `progressGrantProgramsDay()` on active grant expiry — checks `stress`, `cleanliness`, `waitingPatientsCount()`, and `getPublicCareRate()`

---

## v1.9 - Expanded Contracts: Insurance Strategy & Government Obligations

### Added

**Four distinct insurance contract types** replacing the old generic plans, each with a full stat profile and clear strategic tradeoff:

- **🏥 Medicaid Partnership** (Public, 30 days) — +35% patient volume, −25% reimbursement per patient. Eases government compliance by 5pp. Grants +0.5 reputation per monthly review. Low stress. Best for maintaining public care standing while absorbing volume.
- **🤝 Private Insurance Network** (Private, 21 days) — +20% patient volume, +15% reimbursement per patient, +10% flat income boost. Adds +3pp compliance pressure. Moderate stress. A balanced private option.
- **🌆 City Care Overflow** (Public, 14 days) — +55% patient volume, −35% reimbursement per patient. Eases compliance by 8pp, +1.5 reputation per review. Stress +8. High reward, serious overload risk.
- **💼 Corporate Health Plan** (Private, 28 days) — +15% patient volume, +65% reimbursement per patient, +25% flat income boost. Adds +10pp compliance pressure. −0.3 reputation per review. High public criticism risk. Most lucrative, most dangerous for public obligations.

**Reimbursement multiplier system** — insurance contracts now carry a `reimbursementMult` field that scales actual per-patient revenue up or down, separate from the flat income boost. `getInsuranceRevenueMultiplier()` now multiplies both together: `(1 + flatBoost) × reimbursementMult`.

**Government compliance pressure** — each active insurance contract contributes `govCompliancePressure` to an `effectiveRequired` threshold calculated at monthly review time. Public contracts reduce the effective target; corporate/private contracts raise it. The effective required rate is capped at 90%.

**Stacking tension mechanic** — taking multiple private/corporate contracts simultaneously pushes compliance pressure high enough to fail the monthly review even if you're seeing plenty of public patients. The UI shows warnings when stacking is risky. Taking contracts that push `boost.patients > 0.5` still permanently increases `govRequired` by 5pp.

**Monthly reputation gain from contracts** — public contracts now grant reputation at each government review. Corporate contracts cost reputation. The net effect is shown live in the government status block.

**Improved government review logic** in `governmentReview()`:
- Calculates `effectiveRequired` dynamically from active contracts
- Logs a specific "Corporate Health Plan is diverting resources" message when a corporate contract is active during a failure
- Logs a compliance pressure warning when total `govCompliancePressure ≥ 0.10`
- Awards +3 reputation for exceeding the quota by ≥10pp (vs. +2 baseline)

**Fully rebuilt Contracts modal UI** with three tabs:
- **Active** — shows all live insurance contracts with duration bar, days remaining, effect chips (volume, reimbursement, compliance, stress)
- **Marketplace** — all four insurance types with full stat grids, category badges (Public/Private), risk warnings, stacking indicators, and Sign Contract buttons
- **Donor Requests** — existing contract offer/progress system, moved here for clarity

**Government status block** always shown at the top of the modal:
- Live compliance meter with a marker at the base quota line
- Effective target displayed separately when contracts are shifting it
- Status badge: Monitoring / Compliant / At Risk / Non-Compliant
- Days until monthly review
- Active compliance pressure note (shown when contracts are making compliance harder)
- Monthly reputation effect note from active insurance

### Changed
- `getInsuranceBoost()` now returns 7 fields: `income`, `patients`, `stressImpact`, `reimbursementMult`, `govCompliancePressure`, `reputationGain`, `publicCriticismRisk`
- `getInsuranceRevenueMultiplier()` now incorporates `reimbursementMult` so public contracts meaningfully reduce per-patient revenue
- Added `getInsuranceGovPressure()`, `getInsuranceReputationGain()`, `getInsuranceCriticismRisk()` convenience helpers
- Government review "private expansion" log message updated to be clearer

## v1.7 - Auto-Save, Settings, And Hospital Statistics

### Added
- **Save file import** — drag a `.mmcsave` file onto the main menu or use the Import Save button to load any save file without going through the normal Load Save flow. A drop-zone overlay appears automatically when a file is dragged over the window.
- **Auto-save system** — the game automatically saves your progress to the browser every in-game day. A toast notification appears at a configurable interval so you know your work is being preserved.
- **Settings panel** — a new ⚙ gear button in the top-right HUD opens the Settings modal, which includes:
  - Auto-Save toggle — enable or disable background saving entirely.
  - Notification frequency chips — choose how often the auto-save toast appears: every 1, 5, 10, or 30 days, or never. The section dims automatically when auto-save is off.
  - All settings persist across sessions via `localStorage` independently of the save file.
- **Hospital Statistics dashboard** — a new 📊 Stats button in the bottom bar opens a performance dashboard showing the last 90 days of in-game data. Six sparkline charts display trends for:
  - Cash Balance
  - Daily Revenue
  - Reputation
  - Cleanliness
  - Staff Stress
  - Total Patients Treated
  - Each chart shows the current value, a trend arrow (▲/▼), and the historical min/max range. Data is recorded every in-game day and survives saving and loading.

### Changed
- Stats history is serialized with the save file so charts persist across sessions.
- `updateMenuBlurState` now correctly blurs the game canvas when the Settings or Statistics modal is open.

## v1.6 - Departments, Public Care, And Save Files

### Added
- Public/private patient split with visible government-care pressure.
- `Government Contract` panel with compliance state, review timing, and visual warning states.
- `Grant Writer Office`, `Grant Writer`, and grant-based quick funding objectives.
- Separate `Employees` menu focused on hired staff and their needs.
- Department upgrade panel for:
  - `ER`
  - `Lab`
  - `Ward`
  - `Operations`
- New buildable rooms, wings, and departments:
  - `Med-Surg`
  - `Pediatrics`
  - `OB/GYN`
  - `Radiology`
  - `Rehab`
  - `Administration`
  - `Case Management`
  - `Cardiology`
  - `Oncology`
  - `Behavioral Health`
  - `Geriatrics`
- Room rotate button for non-square room placement.
- Dedicated SVG icon assets for:
  - `GP Office`
  - `Emergency Room`
  - `Waiting Room`
  - `Hospital Ward`
  - `Money`
  - `Reputation`
  - `Cleanliness`
  - `Stress`
- `Save Game` now exports a real `.mmcsave` file.

### Changed
- Government-care tracking now uses clearer public patient counters and monthly review logic.
- Insurance expansion can raise public care requirements.
- Department bonuses now flow through shared department bonus math.
- Build menu now includes broader hospital-specialty content and cleaner grouping.
- Save still supports browser/local storage, but now also creates a downloadable save file automatically.

## v0.1 - Core Hospital Prototype

### Added
- Core hospital simulation loop:
  - build rooms
  - hire staff
  - treat patients
  - earn money
  - survive operational pressure
- Foundational hospital stats:
  - `Cash`
  - `Reputation`
  - `Cleanliness`
  - `Stress`
  - `Grade`
- Early lose-pressure systems for:
  - debt
  - low cleanliness
  - poor reputation
- First staff support role:
  - `Janitor`
- Main run flow:
  - `Start Game`
  - `Restart`
  - `Main Menu`
- Monthly hospital grading starting at `A+`.

### Fixed
- Early room assignment and staffing reliability issues.
- Basic startup, reload, and single-file prototype stability problems.

## v0.2 - Progression And Daily Operations

### Added
- Milestone unlock system for new rooms and roles.
- Contracts and donor/request-style objectives.
- `Waiting Room` and visible waiting counters.
- Shift system:
  - `Day`
  - `Night`
- New staff roles:
  - `Nurse`
  - `CNA`
  - `Surgeon`
- Daily goals and a larger in-game log panel.
- `Dept. Head Office` as a progression gate for more advanced medical departments.

### Changed
- Nurses and CNAs now operate as hospital-wide support instead of room-bound assignments.
- Department and room colors were made more distinct in the UI and on the map.

## v0.3 - Refactor, Save Systems, And Research Foundations

### Added
- `localStorage` save/load support.
- Research system with unlockable technology.
- Dispatch system foundations:
  - `Dispatch Office`
  - `Dispatcher`
  - `Driver`

### Changed
- The original single-file game was split into a multi-file structure:
  - `index.html`
  - `styles.css`
  - `game.js`
  - `systems/staff.js`
  - `systems/economy.js`
  - `systems/patients.js`
  - `systems/dispatch.js`
  - `systems/research.js`
  - `systems/contracts.js`

## v0.4 - Staff Depth And Support Systems

### Added
- Staff `Morale` as a visible stat.
- Advertising system to increase patient flow.
- Expanded management menus:
  - `Goals`
  - `Contracts`
  - `Hired Staff`
- Staff conflict events.
- Staff raise request events.
- Support and operations rooms:
  - `HR Office`
  - `Nurse Station`
  - `Staff Room`
  - `Lunch Room`
- `HR Manager` role.

### Changed
- Staffing moved away from room assignment and toward broader role coverage.
- Night shift access is now locked until HR is built and staffed.

## v0.5 - Advanced Roles, Research Points, And Hospital Stages

### Added
- Security systems:
  - `Security Office`
  - `Guard`
- `Intern` role with XP, levels, and progression.
- `Medical Director` as a premium leadership role.
- `IT Department`.
- `Research Points (RP)` as a dedicated research resource.
- Hospital stage progression:
  - `Clinic`
  - `Small Hospital`
  - `Expanding Facility`
  - `Medical Center`
- Stage UI:
  - stage tracker
  - milestone progress
  - progress bars
  - stage-up modals
- Smaller stage goals to guide growth.

### Changed
- Research now uses `RP` instead of money.
- Stage progression now unlocks more systems, roles, and rooms gradually.

## v0.6 - UI Overhaul And Menu Structure

### Added
- Major title screen redesign for `My Medical Center`.
- Polished top HUD with card-style stat display.
- Dedicated `Research` menu instead of permanent on-screen research clutter.
- Expanded current-staff listing.
- `Back to Game` flow from the title screen.
- Zoom controls.
- `Marketing Office` requirement for advertising.

### Changed
- Main menu branding now uses:
  - `My Medical Center`
  - `Build. Manage. Grow.`
- Button hierarchy, spacing, and menu structure were improved across the game.
- Topbar utility clutter was reduced by removing extra save/load/restart controls from the main HUD.

## v0.7 - Visual Clarity Pass

### Added
- Card-like room rendering with stronger depth.
- Cleaner room color identity for important departments.
- Short room labels and stronger icon hierarchy.
- Better hover tooltips with:
  - room name
  - staff coverage
  - efficiency
  - status
- Room state dots, borders, hover feedback, and selection feedback.
- Softer corridor rendering and subtle corridor motion.
- Small room, waiting room, and toast animations.
- Build mode toggle.

### Changed
- Map clutter was reduced by removing long labels and warning text from room tiles.
- Staff display on the map was simplified to reduce overlap.
- Waiting room visuals were improved with fullness-based color shifts.

## v0.8 - Sandbox And Debug Support

### Added
- Sandbox mode button on the title screen.
- `startSandboxMode()` for instant unrestricted runs.
- Full unlock helpers for:
  - rooms
  - roles
  - research
- Sandbox bypasses for:
  - money costs
  - research costs
  - room and role locks
  - feature locks

### Changed
- Sandbox starts with extremely high money and RP.
- Progression is effectively disabled while sandbox mode is active.

## v0.9 - Stress, Fatigue, And Recovery Balance

### Added
- Low-energy break behavior.
- `Staff Room` energy and morale recovery.
- Low-energy treatment slowdown.
- Low-energy treatment error penalty.
- Positive stress relief event:
  - `Emergency Staff Relief`

### Changed
- `Burnout Risk` now drains extra energy during work.
- Hospital stress now drains staff energy over time.
- Fatigue and stress penalties have stronger gameplay impact.

## v1.0 - Events, Contracts, And Run Goals

### Added
- Insurance contract system with:
  - contract offers
  - active contract tracking
  - patient volume modifiers
  - reduced insurance payouts
  - contract expiration
- Dedicated `Contracts` menu.
- `Ambulance Bay` room with dispatch-to-ER linkage requirements.
- Random event system with:
  - patient surge
  - staff sick day
  - equipment failure
  - patient complaint
  - emergency case
- Event modal with dedicated event presentation.
- Run-based win and lose conditions with end screen summaries.
- `Start New Run` button on the end screen.
- Pressure Dashboard explaining:
  - staffing pressure
  - cleanliness pressure
  - insurance pressure
  - marketing pressure
  - queue pressure

### Changed
- Dispatch now depends on a proper operational chain between `Dispatch Office`, `Ambulance Bay`, and `ER`.
- Research, contracts, and stage growth are now more tightly tied together.
- Event feedback now appears in logs, toasts, and modal alerts.

## v1.1 - Menu Polish And Readability

### Added
- Stronger title-screen branding and menu card presentation.
- `Save Game` action on the main menu.
- Dedicated `Back to Game` flow from the title screen.
- Full-screen red event tint for high-attention event popups.

### Changed
- Menu blur, edge fade, and title card separation were refined.
- Right-side HUD sections became cleaner collapsible panels.
- Right panel sizing was corrected so sections no longer compress or clip.
- Title screen placement was adjusted so the top of the menu remains visible.
- Overlays, event cards, and menus were made more opaque so the background does not bleed through.

## v1.2 - Tutorial, Amenities, And Medical Center Expansion

### Added
- First-time tutorial system with:
  - step-by-step onboarding
  - UI highlights
  - draggable tutorial window
  - replayable `Start Tutorial` button
- Build menu organization into collapsible categories:
  - `Paths`
  - `Patient Rooms`
  - `Technical Rooms`
  - `Support Rooms`
  - `Amenities`
  - `Offices`
- New amenities and support spaces:
  - `Bathrooms`
  - `Janitor Closet`
  - `Vending Machine`
  - `Drink Dispenser`
  - `ATM`
- New `Medical Center` stage unlocks:
  - `Luxury Path`
  - `Single Hospital Room`
  - `Double Hospital Room`
  - `General ICU`
  - `Cardiac ICU`

### Changed
- `Bathrooms` now reduce staff stress and improve patient willingness to wait.
- `Janitor Closet` now improves janitor efficiency and daily cleanliness support.
- Small amenity pods improve comfort without needing full room footprints.
- `Luxury Path` behaves like a premium corridor and supports full room connectivity.
- Patient routing now supports inpatient care and ICU paths.

## v1.3 - Floors, Routing, And Staff Command Systems

### Added
- Multi-floor hospital support with:
  - up to `10` floors
  - `Elevator`
  - `Staircase`
  - floor switching
  - floor specialization labels
- New entrances and utility rooms:
  - `Front Entrance`
  - `Staff Entrance`
  - `ER Entrance`
  - `HVAC / Power Generator`
- `Research Department` room.
- `Researcher` staff role.
- `Charge Nurse` role.
- Expanded staff management menu showing:
  - all current staff
  - moods
  - morale
  - energy
  - break needs
  - raise needs
  - vacation needs
- Manual staff actions:
  - approve raise
  - send on break
  - approve vacation
- Efficiency heatmap overlay with legend and issue tooltips.
- Selected Room Panel with:
  - room name and type
  - status chip
  - efficiency
  - throughput
  - staff energy
  - queue size
  - average wait
  - detected issues
- More advanced event presentation:
  - categories
  - rarities
  - cooldowns
  - eligibility checks
  - simple event chaining
  - location-aware room focus
  - event tracking on the end screen

### Changed
- The tutorial was upgraded into a guided clinic scenario with:
  - auto-demo setup
  - ghost placement previews
  - flow arrows
  - naming your hospital
  - simpler beginner explanations
- Patient arrivals now use real entrances instead of appearing from arbitrary positions.
- Patient movement now uses corridor pathing and door tiles.
- Room interiors were upgraded with:
  - more detailed props
  - more geometric room footprints
  - full-cell corridors
  - automatic room-to-corridor door connectors
- On-map room clutter was reduced further by moving room identifiers into hover states.
- `ER` was enlarged to feel like a major department.
- Reputation review is now more structured and based on:
  - throughput
  - waiting pressure
  - cleanliness
  - staffing gaps
  - stress
- `Research` now requires a staffed `Research Department`, and researchers improve research speed.
- `Dept. Head` support now helps guide more staff members onto breaks when needed.
- Vacations now last `3-5` days, can be approved by either the player or HR, and returning staff receive:
  - `3` days of issue immunity
  - `3` days of boosted `200%` work speed

## v1.4 - Room Purpose, Event Expansion, And Hospital Identity

### Added
- More distinct patient categories:
  - `Basic`
  - `Diagnostic`
  - `Emergency`
  - `Inpatient`
  - `Critical`
  - `VIP`
- Clearer room-purpose routing such as:
  - `Waiting Room -> GP -> Pharmacy`
  - `Waiting Room -> GP -> X-Ray -> Pharmacy`
  - `Waiting Room -> ER -> Ward or Surgery`
  - `ER -> ICU`
  - `Waiting Room -> VIP Room -> Pharmacy`
- Route-aware room tooltips describing:
  - what patient types use a room
  - what usually comes before it
  - what usually comes after it
- Patient type labels on moving patients.
- `VIP Room` with premium routing and stronger staff demands.
- Additional live events and choice events including:
  - `VIP Celebrity Pregnancy`
  - `Mass Casualty Incident`
  - `Insurance Audit`
  - `Staff Burnout Crisis`
  - `Sanitation Issue`
  - `Media Coverage`
  - `Power Fluctuation`
  - `Complaint Surge`
  - `Intern Breakthrough`
- Event popup category and rarity display.

### Changed
- `Single Hospital Room` now favors higher satisfaction and lower capacity.
- `Double Hospital Room` now favors capacity over satisfaction.
- `General ICU` and `Cardiac ICU` now have stronger distinct roles.
- `VIP Room` now has stronger revenue and reputation identity.
- Event pacing was balanced through rarity rolls, cooldowns, and stage/condition checks.

## v1.5 - Commercial UI Polish Pass

### Added
- More professional HUD hierarchy with primary and secondary stats.
- Stronger icon system for:
  - cash
  - reputation
  - staff
  - patients
  - research
  - cleanliness
  - stress
  - key room types
- `My Medical Center` branding/logo integration.
- Better feedback animations:
  - money gain popups
  - reputation pulses
  - button hover and press states
  - goal progress animation
  - warning-state animation
  - placement pulses when building rooms
- Cleaner modern zoom controls with:
  - snapped zoom levels
  - smooth zoom interpolation
  - contextual zoom labels
  - topbar presentation
- Ambient background motion:
  - drifting clouds
  - light particles
  - subtle water movement

### Changed
- Top HUD spacing, sizing, and stat hierarchy were refined across multiple passes.
- Left build sidebar now behaves more like a polished simulation-game tool menu.
- Right-side warnings and goals now read more like game systems than raw checklists.
- Bottom map tools were reorganized into a clearer tool row.
- Floor controls, heatmap controls, stage display, and center-name display were repositioned for cleaner overlap-free layout.
- The overall UI now uses more consistent spacing, depth, color hierarchy, and responsiveness to feel closer to a commercial indie release.

## v1.8 - Research Milestones, Hospital Identity Paths, And Digital Infrastructure

### Added

**Research Milestone System**
- Five research milestones that fire automatically as you complete projects (thresholds at 5, 10, 15, 21, and 28):
  - 🔬 Research Pioneer (5) — +150 RP
  - 🏆 Academic Excellence (10) — +$8,000 grant
  - ⭐ Medical Innovation Hub (15) — +3 Reputation
  - 🎖️ Research Authority (21) — +$15,000 grant
  - 🏅 Full Research Mastery (28) — +500 RP
- Milestone rewards fire in `completeResearch()` with a log entry, a toast, and a save-persistent `researchMilestonesFired` Set.
- Milestone tracker appears in the ⚡ Bonuses tab as a progress bar with icon pips and scrollable milestone cards (locked, next-up, and earned states).

**Hospital Identity Paths**
- Four active identity paths and one placeholder, each with five themed research nodes. Researching three or more nodes from a path activates its identity bonus. Paths are not exclusive — multiple bonuses can be active simultaneously.
  - 🏘️ **Traditional Community Hospital** — government penalties reduced further; public patient reputation gains improved. Nodes include Government Compliance, Triage Protocols, Public Care Standards, Community Care Charter, Social Services Desk.
  - 🤖 **AI Hospital** — waiting pressure reduced. Risk: IT/cyber outage events can now occur. Nodes include Hospital Wi-Fi, Electronic Health Records, Clinical Decision Support, Staff Tablets, AI Operations Center.
  - 🏭 **Manufacturing Hospital** — supply costs reduced; shortage events less severe. Risk: sterile failure events become more serious. Nodes include Sterile Workflow, Pharmacy Integration, Central Supply Standards, In-House Supply Production, Biomedical Engineering Lab.
  - 🎓 **University Hospital** — research point income improves; staff level faster. Risk: training mistake events can occur. Nodes include Grant Research Program, Automated Testing, Teaching Hospital Charter, Residency Program, Clinical Trials Office.
  - 💎 **Private Specialty Hospital** — placeholder path (2 nodes: Private Wing Planning, VIP Patient Services). Full implementation planned.
- New **🏛️ Identity tab** in the Research Lab modal shows all five path cards with: icon, theme description, node checklist (○ / ✓), animated progress bar, status line ("X more nodes for identity bonus" or "★ Identity Bonus Active"), identity effect description, and risk warning tag.
- 12 new research nodes added to the Research Tree across Administration, Clinical, Access, Operations, and Digital branches to support the paths.
- Identity bonuses feed into `getTechBonus()` via a new `getIdentityBonuses()` function and are reflected live in the ⚡ Bonus Summary tab.
- Path progress is derived from the existing `researchedTech` Set — no new save state required.

**Identity Path Events**
- Nine new hospital events gated behind identity path flags — each event only appears in the pool when the relevant identity bonus is active:
  - 🏘️ Community: **Government Community Recognition** (rare, choice — Accept Grant Award or Host Community Health Day) and **Public Health Partnership** (uncommon, automatic grant + reputation).
  - 🤖 AI: **AI Efficiency Surge** (uncommon, automatic — RP + cash + stress relief) and **Predictive Demand Win** (uncommon, automatic — stress drop + reputation + RP) as positives; **IT Systems Outage** (uncommon, choice — Emergency IT Response or Manual Workaround) as risk.
  - 🏭 Manufacturing: **Supply Chain Windfall** (uncommon, choice — Sell Surplus or Invest in Sterile Reserves) and **Biomedical Cost Savings** (uncommon, automatic cash + stress relief) as positives; **Sterile Processing Failure** (uncommon, choice — Full Lockdown or Contain Quietly) as risk.
  - 🎓 University: **Research Breakthrough** (rare, choice — Publish Findings or License to Industry) and **Academic Grant Award** (uncommon, automatic RP + cash) as positives; **Training Mistake** (uncommon, choice — Transparent Disclosure or Handle Internally) as risk.
- All identity events have per-event cooldowns (10–20 days) so they do not spam during long sessions.
- Three new trigger functions added to game.js: `triggerItOutage`, `triggerSterileFailure`, `triggerTrainingMistake`, `triggerCommunityGrant`, `triggerResearchBreakthrough`, `triggerAiEfficiencySurge`, `triggerSupplyChainWindfall`.

**Digital Infrastructure Research Branch**
- Eight-node structured branch with a proper prerequisite tree:
  - T1: **Digital Filing System** (existing, enhanced)
  - T2: **Department Workstations** (new), **Digital Backup System** (new), **Hospital Wi-Fi** (existing, enhanced), **Electronic Health Records** (existing, newly wired into bonuses)
  - T3: **Server Room Upgrade** (new), **Automated Patient Flow System** (new), **Staff Tablets** (existing, enhanced)
  - T4: **Predictive Operations AI** (new)
- Full gameplay effects across all eight nodes:
  - Digital Filing System — +0.5 RP/day, wait pressure −1
  - Hospital Wi-Fi — global speed +5%, wait −2
  - Electronic Health Records — diagnostic speed +10%, +0.5 RP/day
  - Staff Tablets — discharge speed +10%, GP speed +5%
  - Department Workstations — +1 RP/day base + conditional +1 RP when IT Department is operational; staff XP rate +5%
  - Digital Backup System — audit penalty reduction −15%
  - Server Room Upgrade — +1.5 RP/day, research speed +0.5 days/tick
  - Automated Patient Flow System — wait pressure −4, ER speed +10%, discharge +10%
  - Predictive Operations AI — wait pressure −2, passive stress −3/tick
- New `researchSpeedBonus` stat added to `getTechBonus()` and read directly by `progressResearch()`, so Server Room Upgrade tangibly shortens active research timers.
- `getDailyResearchPointIncome()` now tracks a `workstationBonus` line separate from `itRpBonus` so the Department Workstations conditional bonus appears correctly in the daily RP log.
- ⚡ Bonus Summary digital section now lists all active digital bonuses individually with per-source attribution.

### Changed
- `getTechBonus()` bonus object gains two new fields: `researchSpeedBonus` and `supplyCostMult`.
- Research Bonus Summary digital section expanded from a single RP line to a full breakdown of wait reduction, research speed, audit protection, ER throughput, discharge speed, and stress relief.
- Daily RP log now reads "Digital tech +N" instead of "Digital Filing +N" to reflect the expanded digital RP stack.

## Notes

- These patch notes summarize the major development changes currently implemented in the game.
- Version numbers are internal milestone labels and can be renamed later for public-facing builds.

---

## v1.14 — Playtesting Clarity Pass

### Added

**Actionable warning cards** — every warning in the Warnings panel now includes a blue `→ Fix:` line telling the player exactly what to do. Each card targets a specific failure state:

- **High Stress** → "Add a Staff Room and hire a Janitor immediately. Reduce active insurance contracts if overloaded."
- **Debt Watch** → "Apply for a grant, review staff salaries, or accept an insurance contract for faster patient income."
- **Waiting Overflow** → "Add a second Waiting Room or more Waiting Room tiles. Hire more front-desk clerks or GPs."
- **Cleanliness Risk** → "Hire a Janitor immediately and add a Janitor Closet if none exists."
- **Reputation Pressure** → "Reduce wait times, clear the queue, and check your government quota compliance."
- **Government Quota Risk** (new card) — fires when the public care rate falls more than 5 percentage points below the required threshold, before the monthly penalty lands. Fix text: "Prioritize public patients. Avoid accepting private insurance contracts until compliance recovers."

**Government contract consequence text** — the Contracts modal Government Status block now displays a plain-language consequence line under the status badge:
- Compliant → "on track for review"
- At Risk → "missed quota = reputation penalty"
- Non-Compliant → "reputation loss incoming"

**`getStableHint()`** — a new function that generates state-aware advice when the hospital has no active warnings. Conditions checked in priority order: no GP office built, no janitor hired, cash below $8,000, government quota slipping, waiting room near full, no research spent, delegation available. Falls back to a generic encouragement line if none apply. Used in place of a static "All systems normal" message.

**`updateContextHint()`** — updates the `#hint` bar at the bottom of the screen in real time based on current hospital state. Priority order: critical stress → reputation → debt → dirty hospital → waiting overflow → quota slip → no janitor → low cash → stable (calls `getStableHint()`). Skips all updates while the tutorial is active and not yet completed. Called at the end of `renderWarningDeck()` each tick.

**Stat card tooltips** — every stat card in the top HUD now has a `title=""` tooltip explaining what the number means, what drives it, and what to watch for:
- Cash, Reputation, Cleanliness, Stress, Waiting, Staff, Day, RP

**Bottom bar button tooltips** — every action button in the bottom bar now has a `title=""` tooltip with a plain-language description of what it opens and why it matters:
- Stats, Depts, Research, Grants, Contracts, Delegation, Employees, + Staff, Traffic

**Government Contract label tooltip** — hovering the "Government Contract" label in the right panel now explains the entire quota system in plain language.

**Updated default hint text** — the `#hint` bar now opens with "Build corridors to connect rooms. Place a Waiting Room and GP Office, then hire staff. Check Warnings on the right for what needs attention." instead of the previous tutorial-flavored placeholder.

### Changed

- `renderWarningDeck()` now appends a `.warning-fix` element to each warning card and calls `updateContextHint()` after rendering.
- Warning cards with severity `danger` now render fix text in red using `.warning-card.danger .warning-fix` instead of blue.
- `updateGovernmentContract()` now appends a `<div class="gov-consequence">` status line after the status badge.
- `getSoftGuideSteps()` updated: placement steps now include short scene-setting descriptions ("patients queue here", "first treatment room") to give new players spatial context while browsing rooms.

---

## v1.13 — Tutorial Depth, Zone Awareness, & Delegation Panel

### Added

**17-step tutorial** — tutorial expanded from its earlier form to 17 steps covering the full early-game loop:
1. Welcome
2. Name Your Hospital
3. Corridor Placement (room_placement_logic)
4. Place Waiting Room
5. Place GP Office
6. Hire Staff
7. Treat First Patient
8. Watch the Warnings
9. End of Day Review
10. Grants Introduction
11. Apply for a Grant
12. Hire a Grant Writer
13. Insurance Contracts
14. Department Upgrades
15. Research Tree
16. Delegation & Automation
17. Tutorial Complete

**Tutorial step text overhaul** — six steps fully rewritten with clearer language:
- `room_placement_logic` ("Room Placement Matters") — explains the Waiting Area / Treatment Area split and why corridors must connect them
- `grants` — explains the Grant Writer requirement and what approval odds depend on
- `insurance_contracts` — explains compliance pressure and what the monthly quota review does
- `department_upgrades` ("Upgrade Departments") — explains that departments improve whole systems without room-by-room micromanagement
- `research_tree` ("Use the Research Tree") — explains the five branch categories and long-term identity paths
- `delegation_automation` — explains that delegation roles run hospital policies automatically after being unlocked through research

**Ghost placement zone labels** — during the `room_placement_logic` tutorial step, the map overlay renders labeled zone indicators: "Waiting Area" (top-left), "Treatment Area" (center), and "Future zones unlock as you grow" (bottom-right). Drawn in `renderTutorialMapOverlay()` and only visible during that step.

**Hospital zone overlay** (`drawHospitalZoneOverlay()`) — a persistent faint dashed overlay drawn under rooms that shows spatial zone intent at each hospital stage:
- *Small Hospital*: ER zone (top-right quadrant) and Diagnostics zone (lower-right quadrant)
- *Expanding Facility*: Inpatient zone (right half) and Admin zone (bottom-left)
- Drawn in `render()` before rooms so it never obscures active content

**Delegation panel** (`systems/delegation.js`) — a new Delegation & Automation modal accessible from the bottom bar:
- `openDelegationPanel()` / `closeDelegationPanel()` manage modal state
- `renderDelegationPanel()` lists all unlocked delegation roles with their active/inactive toggle, current assignment, and effect description
- Panel is locked in the tutorial until the `delegation_automation` step is reached (step 16)
- Panel is locked in normal gameplay until at least one delegation research node has been completed

**Tutorial locking logic** — all advanced panels are correctly locked during early tutorial steps:
- Department upgrades: unlocked at step 14
- Research tree: unlocked at step 15
- Grants: unlocked at step 12
- Delegation: unlocked at step 16

**`getTechBonus()` new fields** — three new research bonus fields wired into the simulation:
- `quitRiskReduction` — reduces staff quit probability globally
- `passiveChaosReduction` — reduces background stress accumulation passively each tick
- `delegationAmplify` — increases the effectiveness of active delegation roles

### Changed

- Tutorial drag window is constrained to stay within the viewport on all screen sizes.
- Tutorial progress indicator now reads "Step X of 17" and uses a filled pip strip instead of a text fraction.
- `getSoftGuideSteps()` returns richer objects with a `desc` field used in the quick-start panel beneath the tutorial card.

---

## v1.12 — Job Trait Pool Expansion + Staff Trait Search

### Added

**Job Trait Pool Overhaul** — every role-specific trait pool replaced with a fully expanded, named, and mechanically wired set. 83 total traits across 11 pools. Each trait has an `id`, `label`, `desc`, `icon`, `tone`, and one or more effect fields consumed directly by the simulation loop.

**Grant Writer** (12 traits):
- *Good:* Policy Whisperer (`+10%` government grants), Form Wizard (`−1 review day, +4%` approval), Foundation Charmer (`+10%` private grants), Budget Storyteller (`+18%` grant reward cash), Compliance Shark (`+6%` approval), Community Voice (`+10%` community grants), Red Tape Acrobat (`+7%` government, `+3%` approval)
- *Neutral:* Deadline Sprinter (`−2 review days, −5%` approval risk), Perfectionist (`+5%` approval, `+1` review day)
- *Bad:* Disorganized (`−4%` approval, `+1` review day), Weak Documentation (`−8%` approval), Burnout Prone (energy drain on multi-grant load — consumed by `grantWriterBurnoutDrag`)

**Doctor** (9 traits):
- *Good:* Diagnosis Bloodhound (`diagnosticSpeedMult 0.86`, `+2` score), Bedside Legend (`+1` rep per treatment, `+2` score, `−1` wait), Speedy Rounds (`speedMult 0.88`), Specialist Brain (`diagnosticSpeedMult 0.90`, `+6%` revenue), Tough Case Hunter (`+3` score, `+4%` revenue), Clipboard Commander (`speedMult 0.93`, `−2%` error), Calm Surgeon Hands (`−5%` error, `speedMult 0.95`)
- *Neutral:* Protocol Nerd (`speedMult 1.08`, `−4%` error)
- *Bad:* Rushed Clinician (`speedMult 0.84`, `+6%` error)

**Nurse** (9 traits):
- *Good:* Comfort Radar (`−2` wait, `+1` score), Steady Rounds (`speedMult 0.94`, `−2%` error), Triage Sense (`−1` wait, `+1` score, `speedMult 0.96`), Medication Memory (`−4%` error, `+3%` revenue), Charge Nurse Aura (team morale bonus, `+1` stress resist), Bed Turnover Pro (`speedMult 0.90`), Patient Whisperer (`+1` rep, `−2` wait), Shift Anchor (`+2` stress resist, `−2%` error)
- *Bad:* Overextended (`energyDrainMult 1.15`)

**CNA** (7 traits):
- *Good:* Room Reset Pro (`speedMult 0.90`), Gentle Helper (`−1` wait, `+1` score), Lift Team Hero (`−2%` error, `speedMult 0.93`), Call Bell Ninja (`−2` wait), Supply Runner (`speedMult 0.92`), Night Shift Rock (`+2` stress resist, `energyDrainMult 0.92`)
- *Bad:* Task Overloader (`energyDrainMult 1.12`)

**Janitor** (8 traits):
- *Good:* Mop Wizard (`cleanBonus 1.6`), Germ Detective (`cleanBonus 1.2`, `−2%` error), Trash Route Genius (`cleanBonus 0.9`, `speedMult 0.92`), Spill Psychic (`cleanBonus 1.3`), Quiet Cleaner (`cleanBonus 0.7`, team morale bonus), Floor Shine Fanatic (`cleanBonus 1.8`), Biohazard Brave (`cleanBonus 1.0`, `+2` stress resist)
- *Bad:* Misses Corners (`cleanBonus −1.2`)

**IT Specialist** (9 traits):
- *Good:* Cable Whisperer (`+8%` research speed, `+2%` revenue), Server Goblin (`+12%` research speed), Wi-Fi Wizard (team morale, `+2%` revenue), Patch Day Hero (`−3%` error, `+2%` revenue), Printer Exorcist (team morale), Data Guardian (`−4%` error), Automation Tinkerer (`+5%` revenue, `+6%` research speed), Helpdesk Saint (team morale, `+1` stress resist)
- *Bad:* Cable Chaos (`+3%` error)

**HR Manager** (8 traits):
- *Good:* Conflict Sponge (incident reduction), Benefits Brain (quit risk reduction, team morale), Hiring Radar (`+2%` revenue), Vacation Planner (team morale, `+1` stress resist), Exit Interview Wizard (quit risk reduction), Raise Negotiator (`+3%` revenue), Culture Builder (team morale, `+2` stress resist)
- *Neutral:* By the Book (no mechanical bonus)

**Security Officer** (8 traits):
- *Good:* De-escalator (`guardProtection +12%`), Lobby Hawk (`+10%` protection, `+1` stress relief), Calm Presence (`+2` stress relief, `+6%` protection), Night Watch (`+8%` protection, `+2` stress resist), Crowd Control Pro (`+15%` protection), Missing Badge Detector (`+6%` protection, `−2%` error), Gentle Giant (`+8%` protection, `+1` rep)
- *Bad:* Intimidating (`+8%` protection, `−1` rep)

**Researcher** (8 traits):
- *Good:* Lab Rat Royalty (`+12%` research speed, burst chance), Hypothesis Machine (`+10%` research speed), Grant Synergy (`+5%` grant approval, `+5%` research speed), Peer Review Beast (`+8%` research speed, `−3%` error), Prototype Brain (`+6%` revenue), Citation Goblin (`+6%` grant approval), Ethical Compass (`−4%` error, `+1` stress resist)
- *Neutral:* Scattered Genius (random RP variance)

**Dispatcher / Paramedic** (8 traits):
- *Good:* Radio Voice (dispatch speed, `speedMult 0.94`), Route Genius (dispatch speed, `+4%` revenue), Siren Sense (emergency outcome bonus), City Map Brain (dispatch speed), Smooth Operator (`−3%` error, `speedMult 0.92`), Fuel Saver (`+3%` revenue), Backroad Wizard (dispatch speed, `speedMult 0.90`)
- *Bad:* Adrenaline Junkie (`speedMult 0.88`, `+5%` error)

**Medical Director** (8 traits — expanded from 4):
- *Kept:* Clinical Vision (`hospitalSpeedMult 0.84`), Patient Champion (`+5` wait threshold, `+1` rep), Operations Titan (`+4` cleanliness, `+2` morale stress resist), Grant Magnet (`hospitalRevMult 1.18`, `+2` score)
- *New:* Academic Star (`+12%` research speed, `+4%` grant approval), Public Mission Leader (`+6%` community grants, `+1` morale stress resist), Private Networker (`hospitalRevMult 1.10`, `+6%` private grants), Automation Evangelist (`hospitalSpeedMult 0.92`, `+5%` revenue)

---

**Staff Trait Search** — a live search bar now appears at the top of the Staff modal, above the role tabs.

- Type any trait name, keyword, or partial phrase — `mentor`, `Spill Psychic`, `error`, `dispatch`, `fast`, `morale`, `burnout` — and it instantly searches all roles simultaneously
- Results from every role appear in a single cross-role grid; the role name is highlighted in blue on each card so the context is always clear
- The shift filter (Day / Night / All) still applies during search, so results stay consistent with the active roster view
- A status line shows match count, role spread, and hired vs. available breakdown — e.g. *"6 matches across 3 roles · 2 hired · 4 available"*
- A **✕ Clear** button appears the moment typing starts; clearing it returns immediately to normal tab view
- Empty state shows a helpful message with keyword suggestions when no candidates match

### Changed

- `renderStaffModal()` refactored: card HTML extracted into `_buildStaffCard(s, searchMode)` helper; search and tab modes are now cleanly separated branches
- `DIRECTOR_TRAITS` expanded in-place from 4 to 8 entries; `getJobTraitPool()` unchanged
- All 11 job pools replaced in `game.js` in a single patch; `CHARGE_NURSE_TRAITS` preserved untouched
- `burnout_prone` trait ID preserved in `GRANT_WRITER_TRAITS` — consumed by id in `grantWriterBurnoutDrag` calculation

---

## v1.11 — Trait System Overhaul (3-Trait Architecture)

Every employee now carries exactly three traits:

**1. Strength** (green chip) — Drawn from a 10-trait universal positive pool shared by all staff.
- Team Player, Calm Under Fire, Crowd Pleaser, Workaholic, Morning Person, Quick Study, Hospital Lifer, Optimist, Overachiever, Empathetic

**2. Role Trait** (blue chip) — Drawn from a role-specific job pool that defines what kind of worker they are.
- Doctors: Strong Diagnostician, Patient Favorite, Evidence-Based, Surgical Focus, Rushed Clinician
- Nurses: Patient Advocate, Medication Precise, Bedside Presence, Overextended
- Charge Nurses: Steady Rounds, Floor Commander, Mentor Charge, Overscheduler
- Janitors: Detail Cleaner, Speed Mopper, Chemical Artist, Misses Corners
- Security: De-escalator, Strict Enforcer, Watchful Eye, Intimidating
- Directors: Clinical Vision, Patient Champion, Operations Titan, Grant Magnet
- Grant Writers: 12-trait pool (existing)
- Clerical, IT, Marketing, HR, Researcher, Intern, Paramedic, CNA: new role-specific pools

**3. Flaw** (red chip) — Drawn from a 10-trait universal negative pool shared by all staff.
- Gossip, Drama Magnet, High Maintenance, Clock Watcher, Chronically Late, Hypochondriac, Perfectionist Paralysis, Passive Aggressive, Grudge Holder, Social Butterfly

**UI changes:**
- Staff cards in the hiring modal now show labeled trait rows (Strength / Role Trait / Flaw) with descriptions
- Dashboard staff cards show all three trait chips at a glance
- All trait chips use emoji icons and carry hover tooltips with effect descriptions

**Technical:**
- `genStaffMember()` rewritten to pick positiveTrait + jobTrait + negativeTrait from respective pools
- `normalizeStaffMember()` rewritten with old-save migration and backward-compat aliases (specialTrait, personalityTrait)
- `getJobTraitPool()` covers all 16 roles
- `traitById()` searches all new arrays for reliable lookup
