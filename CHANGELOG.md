# Changelog

All notable changes to **Cadence** (`ridecadence.cc`) are documented in this file.

## [2026-11-25] — Understated Cadence Intelligence, Human Effort Card & UI Polish

### Added
- **Understated Cadence Intelligence (`CadenceInsight`):** Pure, text-only companion insights (zero boxes, gradients, icons, or loud labels) surfaced across the Home weather widget, Ride Brief, Morning Timeline, Resupply Radar, Effort card, and Fuel popover.
- **Interactive Fuel & Energy Popover (`HeroRouteCard`):** Clicking the `Fuel Units` tile now opens a plain-English breakdown with total kcal burn, croissants earned, eating rhythm, and `"1 unit ≈ 20 g easy carbs"` context, plus fixed singular/plural `1 unit` / `1 unité` copy.
- **Real-World Climbing Scale (`formatElevationRealWorldScale`):** Translates every climbing height from `10 m` upward into immediate real-life comparisons (flights of stairs, Arc de Triomphe, Statue of Liberty, Montmartre, Eiffel Tower, Alpe d'Huez, Mont Ventoux) in both English and French (`tu`), with unit test coverage.
- **Navigation & Command Updates:** Added `QuickCommandModal`, `TripSwitcherPanel`, and canonical SPA routing helpers (`appNavigation.ts`) with unit tests.

### Changed
- **"How this ride will feel" Guided View Rework (`PhysicsEngineCard`):** Replaced raw telemetry KPIs, stacked percentage bars, zone badges, and `Show physics math` in Guided View with a plain-English ride verdict and 3 scannable story cards (*In your legs & lungs*, *Hills & road feel*, *What works you most*). Full telemetry remains intact in **Pro mode (Data)**.
- **Weather & Invisible Hill (`AtmosphereCard`):** Left-justified the `Wind & resistance | Light & visibility` tab switcher, paired every wind level with real-life climbing context, and simplified the Invisible Hill pod into calm neutral surfaces and text.
- **Global Typography (`index.css`, `Badge`, locales):** Added `text-wrap: pretty` / `balance` (`no-orphan`) and tightened wind/status copy in EN and FR (`tu`) to prevent single-word trailing orphan lines.

## [2026-11-24] — Custom Domain (`ridecadence.cc`) & Cycling Multi-Tool Launch

- Configured canonical URLs, `robots.txt`, `sitemap.xml`, `WebApplication` JSON-LD, and GPX branding for `https://ridecadence.cc`.
- Launched the 7-tool Cycling Multi-Tool (`/tools`), companion voice (warm EN + `tu` FR), Invisible Hill wind insights, and cold mobile bundle optimization.
