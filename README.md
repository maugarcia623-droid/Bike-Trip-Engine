# Bike Trip Engine 🚲⚡

High-precision cycling route configurator, aerodynamic power modeling, wind & headwind analysis, reverse timeline scheduling for office and ride cutoff constraints, and real-food fueling engine.

---

## 🚀 Key Architectural Features

### 1. Multi-View Single Page Application (SPA)
* **Home / Ride Hub**: Overview of saved trip profiles as interactive cards, real-time weather summary widget with wind speed & bearing indicators, quick trip duplication, and one-click Cockpit launch.
* **Configurator Screen**: High-density ride planner featuring:
  * **Editable Ride Profile & Details**: Directly editable inline trip title and route summary subtitle in the header.
  * **In-Line Route Generator**: Origin and destination inputs with autocomplete geocoding, reverse route button ($\rightleftharpoons$), and OSRM bicycle distance & elevation routing.
  * **Wind & Schedule Sync**: Toggle between `Arrive at :` and `Depart at :` target modes, with Open-Meteo hourly weather sync (wind bearing, effective headwind/tailwind resistance, gusts, temperature, and calculated air density $\rho$).
  * **4 Ride Archetypes**: `COMMUTE / VÉLOTAF`, `SPORT / FONDO`, `BIKEPACKING`, and `ESCAPADE`.
  * **Material Design Preset Custom Chips**: 36 color-coded chips (9 per archetype) adhering to Material Design 2 specifications (32px height, 20px solid icon badge, rounded typography, borderless default state, high-contrast offset ring when selected). Toggling chips cascades predetermined physical values, buffer minutes, and equipment settings.
  * **Nested Constraints & Rules**: Sits directly beneath the custom chips inside the archetype card, displaying both the archetype baseline schedule protocol and dynamic rule cards for active chips.
  * **Technical Parameter Tabs**: 3 physical tabs (**Physics & mass**, **Route & pace**, **Wind & weather**) with rider/bike garage autofill integration.
  * **Live Ride Metrics Sidebar**: Sticky real-time feedback displaying calculated hard rollout, target wattage, mechanical drag breakdown, metabolic work, and carbohydrate burn.
* **Bento Cockpit Dashboard**: Interactive ride dashboard featuring interactive Leaflet route maps, dynamic reverse timeline stepper, integrated Weather & Atmosphere bento with Wind & Visibility tabs, mechanical power breakdown, real-food nutrition plan, and pre-ride M-checklist.
* **Weather & Atmosphere Bento (Wind & Visibility Tabs)**: Unified meteorological and optical command deck. Toggle seamlessly between aerodynamic headwind analysis (effective resistance, route bearing, gust envelope) and diurnal solar visibility (celestial elevation arc $\alpha$, 800–1000 lm high-beam illumination mandate, 360° retroreflective gear, and cold-battery alerts).
* **Rider & Bike Garage Modal**: Multi-bike management (Gravel, Aero Road, Commuter, Touring) tracking rider mass, bike mass, $CdA$, and $Crr$ with instant autofill into active trips.
* **100% Local Storage Persistence**: Zero cloud tracking — all trips, custom chips, garage specs, theme settings, and checklist states persist securely in browser `localStorage`.
* **Full Bilingual Support (EN / FR)**: Instant toggle between English and French across all screens, metrics, badges, and trip presets.

---

## 🎨 Design System & Visual Language

* **Concentric Pod & Bento Architecture**: Strict geometric corner concentricity obeying $\text{Outer Radius} = \text{Inner Radius} + \text{Padding}$ ($\text{Inner Radius} = \text{Outer Radius} - \text{Padding}$), pairing primary cards (`rounded-card` / 32px) and nested pods (`rounded-pod` / 16px) with uniform 16px padding (`p-4`) for perfectly parallel, gap-consistent corner curvature. Nested sub-elements inside pods similarly follow 8px inner radius with 8px padding (`rounded-sub-pod` / 8px).
* **Functional Color Palette**:
  * **Volt Neon** (`#F2F455`) & **Volt Lime** (`#CAF164`): Primary highlights, live calculation indicators, active mode badges, and telemetry callouts.
  * **Beacon Status System**: Green (`#3D9A00` / `#10B981`) for cleared states, Amber (`#F59E0B`) for atmospheric cautions, and Red (`#FF3B30`) for critical alerts.
  * **Vibrant Pastel Custom Chips**: 9 distinct color families (Amber, Blue, Purple, Emerald, Orange, Teal, Lime, Sky, Rose) with deep hue-matched text and solid circular icon badges.
* **Rounded Typography**: Defaulting to **SF Pro Rounded** on macOS and **Nunito** cross-platform (`.font-rounded`) in 700/800 bold weights for headers, KPIs, and chips, paired with **Inter** for long-form reading text and tabular figures (`.tnum`) for data alignment.
* **Adaptive Dark & Light Themes**: Smooth transitions between deep dark canvas and crisp light surfaces, respecting user preference and persisting across sessions.

---

## ⚙️ Core Engines & Mathematical Models

### 1. Aerodynamic & Mechanical Physics Engine
$$\text{Total System Mass } M = M_{\text{rider}} + M_{\text{bike}} + M_{\text{gear}}$$

$$P_{\text{rolling}} = C_{rr} \cdot M \cdot g \cdot v_{\text{ground}}$$

$$P_{\text{aero}} = \frac{1}{2} \cdot \rho \cdot C_d A \cdot (v_{\text{ground}} + v_{\text{headwind}})^2 \cdot v_{\text{ground}}$$

$$P_{\text{gravity}} = M \cdot g \cdot \sin(\arctan(\text{gradient})) \cdot v_{\text{ground}}$$

$$P_{\text{legs}} = \frac{P_{\text{rolling}} + P_{\text{aero}} + P_{\text{gravity}}}{\eta_{\text{drivetrain}}}$$

$$\text{Mechanical Work (kJ)} = \frac{P_{\text{legs}} \cdot t_{\text{moving}}}{1000}$$

$$\text{Gross Energy Expenditure (kcal)} = \frac{\text{Mechanical Work (kJ)}}{GME \cdot 4.184}$$
*(where gross mechanical efficiency $GME \approx 0.21 - 0.22$)*

$$\text{Carbohydrate Oxidation} \approx \frac{P_{\text{legs}} \cdot 3.6}{15} \text{ g/h}$$

### 2. Reverse Timeline Countdown Engine
Works backwards from fixed arrival targets or forward from departure time:
$$\text{Moving Time } t_{\text{move}} = \frac{\text{Distance}}{v_{\text{target}}}$$

$$\text{Total Buffer} = \text{Urban Delay} + \text{Security Delay} + \text{Atmospheric Headwind Buffer} + \sum \text{Custom Chip Buffers}$$

$$\text{Rollout Time} = \text{Target Arrival} - (t_{\text{move}} + \text{Total Buffer} + \text{Pre-Shift Staging})$$

### 3. Solar Ephemeris & Winter Visibility Engine
Computes solar altitude angle ($\alpha$) and ambient light phases across the ride:
$$\sin(\alpha) = \sin(\phi) \cdot \sin(\delta) + \cos(\phi) \cdot \cos(\delta) \cdot \cos(\omega)$$
*(where $\phi$ is latitude, $\delta$ is solar declination angle, and $\omega$ is solar hour angle)*

* **Night / Deep Darkness**: $\alpha < -12^\circ \implies$ 800 to 1,000 lm focused front beam + 360° retroreflective gear mandated.
* **Civil Twilight (Dawn/Dusk)**: $-6^\circ \le \alpha < 0^\circ \implies$ 500 to 700 lm wide beam.
* **Winter Solstice Window**: Evaluates short daylight envelopes ($\approx 8\text{h } 20\text{m}$) and cold ambient battery capacity degradation ($-25\%\text{ to }-35\%$).

---

## 🥑 Real-Food Nutrition Protocol

Formulated specifically for clean digestion without commercial powders, cow's milk, or bananas:
* **Pre-Ride Breakfast**: White baguette / artisanal toast + pure wildflower honey + double espresso + 300 ml electrolyte water.
* **On-The-Bike Pocket Fuel**: 50/50 water-to-pressed grape/apple juice bidons + Medjool dates + Turkish figs + artisanal pâte de fruits.
* **Phase 1 Arrival Refuel (Locker Room)**: 200g Skyr 0% + 250ml pure pressed grape juice consumed upon entry.
* **Phase 2 Desk / Break Room Fuel**: Oat milk overnight oats + grated apple + raw walnuts + baguette sandwich + filter coffee prior to shift start.
* **Open Space Desk Mandate**: Strictly enforced zero-food protocol at workstations; all refueling scheduled in locker bays or dedicated break rooms.

---

## 📋 Interactive Verification & Print Cue Sheets

* **Pre-Ride M-Checklist**: 16 categorized, stateful items covering Mechanics, Kit/Gear, Real Food Pack, and Bike Parking & Security with progress indicators.
* **A4 Print / PDF Cue Sheet**: Dedicated `@media print` layout rendering a formatted ride cue sheet with route checkpoints, timetable, weather, and pre-ride checklist for offline handlebar mounting.

---

## 🛠️ Development & Tooling

Built with modern web standards:
* **Vite 6** + **React 18** + **TypeScript 5.7**
* **Tailwind CSS 3.4** with custom design tokens
* **Lucide Icons**
* **Leaflet** mapping integration

```bash
# 1. Install dependencies
npm install

# 2. Run local development server (defaults to localhost:5173)
npm run dev

# 3. Typecheck and compile production bundle
npm run build

# 4. Preview production build locally
npm run preview
```
