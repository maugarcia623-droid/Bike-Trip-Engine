# Bike Trip Engine 🚲⚡

High-precision commute telemetry, aero physics calculations, reverse timeline scheduling for strict office constraints, and real-food nutrition engine.

## 🚀 Key Features

### 1. Multi-View Architecture (SPA)
- **Home Screen**: Overview of saved trip profiles as interactive cards, real-time "Quick Weather Check" widget with estuary wind status, and one-click flight deck launch.
- **Onboarding / Configurator**: Natural language prompt input (*"Describe your trip & office constraints"*) with regex & semantic rule auto-parsing, plus granular tabs for Rider/Gear Mass, Aero Drag (CdA), Rolling Resistance (Crr), Target Velocity, Office checkpoints, and Weather envelopes.
- **Bento Dashboard**: High-density operational flight deck displaying aero/rolling physics, 8 km/h headwind delta, reverse timeline stepper, real-food nutrition manifest, and stateful pre-flight checklist.
- **100% Local Storage Persistence**: Zero cloud telemetry — profiles, custom parameters, weather states, and checklist checkmarks are persisted directly in the browser's `localStorage`.

### 2. Contemporary High-End Bento Design System
- Deep zinc canvas (`#09090b` / `bg-zinc-950`) with high-contrast borders (`border-zinc-800`).
- Strict functional accent palette:
  - **Emerald Green** (`#10b981`): Optimal "GO" status, cleared systems, nutrition badges.
  - **Amber** (`#f59e0b`): Caution, 8 km/h estuary headwind surcharge, warning thresholds.
  - **Cyan** (`#06b6d4`): Physical telemetry, mass decomposition, aerodynamic metrics.
- Crisp monospace data tags for timestamps, wattages, and coefficients.

### 3. Core Physics & Reverse Timeline Engines
- **Physics Equations**:
  $$\text{System Mass } M = M_{\text{rider}} + M_{\text{bike}} + M_{\text{gear}}$$
  $$P_{\text{roll}} = C_{rr} \cdot M \cdot g \cdot v_{\text{ground}}$$
  $$P_{\text{aero}} = \frac{1}{2} \rho \cdot C_d A \cdot (v_{\text{ground}} + v_{\text{wind}})^2 \cdot v_{\text{ground}}$$
  $$P_{\text{legs}} = \frac{P_{\text{roll}} + P_{\text{aero}} + P_{\text{grade}}}{\eta_{\text{drivetrain}}}$$
  $$\text{Work (kJ)} = \frac{P_{\text{legs}} \cdot t_{\text{moving}}}{1000}$$
  $$\text{Gross Caloric Burn (kcal)} = \frac{\text{Work (kJ)}}{0.21 \cdot 4.184}$$
- **Real-Food Nutrition Engine (NO POWDERS / NO MILK / NO BANANAS)**:
  - **Pre-Ride**: White toast/baguette + pure wildflower honey + double espresso + 300ml water.
  - **On-Bike**: 50/50 water-juice bidons + Medjool dates + dried Turkish figs + pâte de fruits.
  - **Phase 1 Locker Refuel (08:30)**: 200g Skyr 0% + 250ml pure grape juice (eaten directly at locker bay).
  - **Phase 2 Break Room Breakfast (08:50)**: Oat milk overnight oats + grated apple + raw walnuts + 1/2 fresh baguette sandwich + coffee.
  - **Office Rule Enforcement**: Zero food permitted at open-space desks; scheduled prior to 09:00 shift lock.
- **Reverse Timeline Stepper**:
  - Works backward from 09:00 Shift Start $\rightarrow$ 08:50 Break Room $\rightarrow$ 08:40 Shower $\rightarrow$ 08:30 Locker Arrival $\rightarrow$ 08:25 Security Clearance $\rightarrow$ **Hard Departure Time** (e.g. 07:18) $\rightarrow$ Pre-ride ignition meal $\rightarrow$ Wake up.

### 4. Interactive Features
- **Dynamic "GO / NO-GO" Weather Toggle**: Calm mode vs. 8 km/h Estuary Headwind with dynamic wattage surcharge (+22W) and timeline buffer (+3-4m).
- **Interactive Pre-Flight Checklist**: 16 stateful verification items across Mechanics, Kit/Gear, Real Food Pack, and Gate Security with progress tracking.
- **Print / Export PDF**: Built-in `@media print` cleanups rendering a formatted A4 flight sheet for offline briefing.

## 🛠️ Development & Build

```bash
# Install dependencies
npm install

# Start local development server
npm run dev

# Build production bundle
npm run build
```
