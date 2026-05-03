# My Medical Center

## Project Overview
A hospital management simulation game built with vanilla JavaScript, HTML5, and CSS3. Players build hospital rooms, hire staff, treat patients, manage finances, conduct research, and grow from a small clinic to a full medical center.

## Tech Stack
- **Frontend:** Vanilla JavaScript (ES6+), HTML5, CSS3
- **Graphics:** HTML5 Canvas API for game world rendering
- **Data Persistence:** localStorage for saves, custom `.mmcsave` file exports
- **No external dependencies or build system**

## Project Layout
```
/
├── index.html              # Main entry point
├── Start.html              # Duplicate of index.html
├── game.js                 # Core game engine, rendering, main loop
├── styles.css              # All game styles/themes
├── assets/                 # Static assets (SVGs, logo)
│   ├── my-medical-center-logo.svg
│   ├── stat-money-icon.svg
│   ├── stat-reputation-icon.svg
│   ├── stat-cleanliness-icon.svg
│   ├── stat-stress-icon.svg
│   ├── gp-office-icon.svg
│   ├── waiting-room-icon.svg
│   ├── emergency-room-icon.svg
│   └── hospital-ward-icon.svg
├── systems/                # Game system modules
│   ├── staff.js            # Staff traits, morale, hiring, level/XP UI cards
│   ├── economy.js          # Budget, grants, finances, save/load incl. floorRenovations
│   ├── patients.js         # Patient spawning & routing, treatment XP awards
│   ├── dispatch.js         # Ambulance & emergency dispatch
│   ├── research.js         # Tech tree & upgrades
│   ├── contracts.js        # Insurance & government contracts
│   ├── grants.js           # Grant Program modal UI (renderGrants, setGrantTab)
│   └── tutorial.js         # Onboarding & guided scenarios
├── hospital_builder.html   # Standalone builder tool
└── medcenter*.PNG          # Screenshots for README
```

## Running the Application
The app is served as static files using Python's built-in HTTP server:
```
python3 -m http.server 5000 --bind 0.0.0.0
```

## Deployment
Configured as a static site deployment. The root directory (`.`) is the public directory.

## Notes
- The `assets/` and `systems/` directories were created during Replit setup by copying files from the root directory (the original repo had a flat structure but `index.html` referenced them via subdirectory paths)
- No build process required - pure static files served directly
- Current version: **v1.30** (Escape Closes Any Modal — registry-driven Escape handler with a MutationObserver per modal maintains an open-order stack; Escape pops the topmost open modal and calls its existing close function via `window[name]` lookup so load order is irrelevant; covers Staff, Employees, Departments, Grants, Research, Contracts, Patch, Settings, Stats, Stage, Budget, Marketing, Roster, Dispatch, and Event modals; title screen + game over intentionally excluded)
- Previous version: v1.29.1 (Single-Row Launcher Bar — `#rp-launchers` switched from `flex-wrap:wrap` to `flex-wrap:nowrap` + `overflow-x:auto` so the 11 launcher buttons scroll horizontally as a single row on narrow side panels; thin scrollbar, scroll-snap, and soft fade mask at both edges; CSS-only fix)
- Previous version: v1.29 (Right Panel Declutter — right panel reduced to four core widgets: Warnings, Current Goal, Public Care Agreement, Log; new `#rp-launchers` button row with live badges opens four new launcher modals — Budget, Marketing, Roster, Dispatch — that host the existing panels by ID so renderers needed no rewiring; Stats Snapshot modal expanded to include the stats grid + pressure dashboard alongside the chart)
- Previous version: v1.28 (Floor-1 Prisoner Wing + Auditorium + Renovation system — `prisoner_wing` 10×5 generates +$800/day with Security Office or Guard requirement, `auditorium` 10×6 yields +$5k/+2 rep every 30 days, both `firstFloorOnly`; renovation system stamps `builtDay` on every placed room, demolishing an Established (90+ day) room opens a confirmation modal that triggers a 30-day floor-wide renovation at 33% `getSpeedMult`; vending/drink/ATM exempt; further demolitions on a renovating floor are free)
- Previous version: v1.27 (Unified Staff XP & Leveling — every employee progresses through 5 tiers New Hire → Veteran with salary multipliers 1.0×–2.0× and negative-trait strength scaled 100%→30%; XP earned from shifts, patient treatment, support roles, crisis events, training-room assignment, floor-spec match; level-3 and level-5 grant bonus perks; interns folded into the same engine and keep promote-on-Specialist; old saves back-fill cleanly via `normalizeStaffMember`)
- Previous version: v1.26 (Bigger, Sharper Map — canvas backing store doubled to 2× pixel density via `RES_SCALE` + `ctx.setTransform`; every campus expanded from 30×18 to 44×26 tiles for ~2× buildable area; starter prefabs re-anchored with extended access corridors to the new road edges)
- Previous version: v1.25 (Campus Maps & Map Selector — 6 themed campuses + flat sandbox default, each with its own 44×26 grid, buildable mask, surrounding terrain, starter prefab, and small starting tweaks; new campus picker after difficulty; HUD campus badge; save round-trip via `selectedCampusId`; tutorial pinned to Regional Hospital)
- Previous version: v1.24 (Floor Specialization System v2 — expanded to 10 specializations with per-spec color accents on the active floor chip + badge; Floor 1 defaults to General Patient Care without re-prompting; sandbox bypass for all floor gating; Security Office added to the universal-rooms list; new Surgical, Women's & Family, Digital & Automation, and Manufacturing & Supply identities each wired to simple existing-system effects)
- Coherent z-index scale lives at the bottom of `styles.css` as CSS variables (`--z-hud`, `--z-floating`, `--z-tooltip`, `--z-modal-ingame`, `--z-modal-fixed`, `--z-titlescreen`, `--z-toast`); use these instead of hardcoded values for new layered UI
- Modal close-button placement is standardized: `.modal-close` (excluding `.patch-inline-close`) is positioned at `top:14px; right:14px;` of the modal box. Modal kickers reserve `padding-right:84px` to leave room for the floating button.
- Tooltip edge-flip lives in the `placeTooltip` helper near the bottom of the hover tooltip code in `game.js`; reuse it rather than re-positioning manually
