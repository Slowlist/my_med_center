# My Medical Center Patch Notes

This file tracks the major gameplay, UI, balance, and content updates added during development.

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

## Notes

- These patch notes summarize the major development changes currently implemented in the game.
- Version numbers are internal milestone labels and can be renamed later for public-facing builds.
