import React, { useState } from 'react';
import { Gauge, Route, Building2, Wind, ShieldAlert } from 'lucide-react';
import { TripProfile } from '../../types/trip';

interface ParameterTabsProps {
  trip: TripProfile;
  onChange: (updatedTrip: TripProfile) => void;
}

export const ParameterTabs: React.FC<ParameterTabsProps> = ({ trip, onChange }) => {
  const [activeTab, setActiveTab] = useState<'physics' | 'route' | 'office' | 'weather'>('physics');

  const updatePhysics = (field: keyof TripProfile['physics'], value: number) => {
    onChange({
      ...trip,
      physics: {
        ...trip.physics,
        [field]: value,
      },
    });
  };

  const updateRoute = (field: keyof TripProfile['route'], value: number) => {
    onChange({
      ...trip,
      route: {
        ...trip.route,
        [field]: value,
      },
    });
  };

  const updateOffice = (field: keyof TripProfile['office'], value: any) => {
    onChange({
      ...trip,
      office: {
        ...trip.office,
        [field]: value,
      },
    });
  };

  const updateWeather = (field: keyof TripProfile['weather'], value: any) => {
    onChange({
      ...trip,
      weather: {
        ...trip.weather,
        [field]: value,
      },
    });
  };

  const systemMass = Number(
    (trip.physics.riderWeightKg + trip.physics.bikeWeightKg + trip.physics.gearWeightKg).toFixed(1)
  );

  return (
    <div className="bg-white dark:bg-[#121215] border border-slate-200 dark:border-zinc-800 rounded-xl overflow-hidden shadow-sm dark:shadow-none">
      {/* Tabs Header */}
      <div className="flex border-b border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-950/60 overflow-x-auto">
        <button
          onClick={() => setActiveTab('physics')}
          className={`flex items-center gap-2 px-5 py-3.5 text-xs font-mono font-bold tracking-wider uppercase transition-colors whitespace-nowrap border-b-2 ${
            activeTab === 'physics'
              ? 'border-cyan-500 text-cyan-700 dark:text-cyan-400 bg-white dark:bg-zinc-900/60'
              : 'border-transparent text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200 hover:bg-slate-100/60 dark:hover:bg-zinc-900/30'
          }`}
        >
          <Gauge className="w-3.5 h-3.5" />
          <span>1. Physics &amp; System Mass</span>
        </button>

        <button
          onClick={() => setActiveTab('route')}
          className={`flex items-center gap-2 px-5 py-3.5 text-xs font-mono font-bold tracking-wider uppercase transition-colors whitespace-nowrap border-b-2 ${
            activeTab === 'route'
              ? 'border-cyan-500 text-cyan-700 dark:text-cyan-400 bg-white dark:bg-zinc-900/60'
              : 'border-transparent text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200 hover:bg-slate-100/60 dark:hover:bg-zinc-900/30'
          }`}
        >
          <Route className="w-3.5 h-3.5" />
          <span>2. Route &amp; Velocity</span>
        </button>

        <button
          onClick={() => setActiveTab('office')}
          className={`flex items-center gap-2 px-5 py-3.5 text-xs font-mono font-bold tracking-wider uppercase transition-colors whitespace-nowrap border-b-2 ${
            activeTab === 'office'
              ? 'border-cyan-500 text-cyan-700 dark:text-cyan-400 bg-white dark:bg-zinc-900/60'
              : 'border-transparent text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200 hover:bg-slate-100/60 dark:hover:bg-zinc-900/30'
          }`}
        >
          <Building2 className="w-3.5 h-3.5" />
          <span>3. Office Constraints</span>
        </button>

        <button
          onClick={() => setActiveTab('weather')}
          className={`flex items-center gap-2 px-5 py-3.5 text-xs font-mono font-bold tracking-wider uppercase transition-colors whitespace-nowrap border-b-2 ${
            activeTab === 'weather'
              ? 'border-cyan-500 text-cyan-700 dark:text-cyan-400 bg-white dark:bg-zinc-900/60'
              : 'border-transparent text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200 hover:bg-slate-100/60 dark:hover:bg-zinc-900/30'
          }`}
        >
          <Wind className="w-3.5 h-3.5" />
          <span>4. Headwind &amp; Atmosphere</span>
        </button>
      </div>

      {/* Tab Panels */}
      <div className="p-6">
        {/* TAB 1: Physics & System Mass */}
        {activeTab === 'physics' && (
          <div className="space-y-6 animate-fade-in">
            {/* Live System Mass Indicator */}
            <div className="bg-cyan-50 dark:bg-cyan-950/20 border border-cyan-200 dark:border-cyan-500/30 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <span className="text-[11px] font-mono uppercase tracking-wider text-cyan-800 dark:text-cyan-400 font-bold">
                  Calculated Total System Mass (M)
                </span>
                <p className="text-xs text-slate-600 dark:text-zinc-400 mt-0.5">
                  Rider ({trip.physics.riderWeightKg}kg) + Bike ({trip.physics.bikeWeightKg}kg) + Gear ({trip.physics.gearWeightKg}kg)
                </p>
              </div>
              <div className="text-2xl font-mono font-extrabold text-cyan-800 dark:text-cyan-300">
                {systemMass} <span className="text-sm font-normal text-slate-500 dark:text-zinc-400">kg</span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Rider Weight */}
              <div>
                <label className="block text-xs font-mono text-slate-700 dark:text-zinc-300 mb-1.5 font-semibold">
                  Rider Mass (kg)
                </label>
                <input
                  type="number"
                  step="0.5"
                  min="40"
                  max="140"
                  value={trip.physics.riderWeightKg}
                  onChange={(e) => updatePhysics('riderWeightKg', parseFloat(e.target.value) || 74)}
                  className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-lg p-2.5 text-sm font-mono text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              {/* Bike Weight */}
              <div>
                <label className="block text-xs font-mono text-slate-700 dark:text-zinc-300 mb-1.5 font-semibold">
                  Bike Mass (kg)
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="5"
                  max="30"
                  value={trip.physics.bikeWeightKg}
                  onChange={(e) => updatePhysics('bikeWeightKg', parseFloat(e.target.value) || 9.4)}
                  className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-lg p-2.5 text-sm font-mono text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              {/* Gear Weight */}
              <div>
                <label className="block text-xs font-mono text-slate-700 dark:text-zinc-300 mb-1.5 font-semibold">
                  Gear &amp; Backpack Mass (kg)
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0.5"
                  max="25"
                  value={trip.physics.gearWeightKg}
                  onChange={(e) => updatePhysics('gearWeightKg', parseFloat(e.target.value) || 4.2)}
                  className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-lg p-2.5 text-sm font-mono text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>

            <div className="pt-4 border-t border-slate-200 dark:border-zinc-800/80">
              <h4 className="text-xs font-mono font-bold text-slate-800 dark:text-zinc-300 uppercase tracking-wider mb-3">
                Aerodynamic &amp; Mechanical Constants (Preset per Engineering Specs)
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="block text-[11px] font-mono text-slate-600 dark:text-zinc-400 mb-1">
                    CdA (Aerodynamic Drag Area, m²)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={trip.physics.cda}
                    onChange={(e) => updatePhysics('cda', parseFloat(e.target.value) || 0.40)}
                    className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-lg p-2 text-xs font-mono text-slate-900 dark:text-zinc-200"
                  />
                  <span className="text-[10px] font-mono text-slate-500 dark:text-zinc-400 mt-0.5 block">Default 0.40 m² (Hoods tuck)</span>
                </div>

                <div>
                  <label className="block text-[11px] font-mono text-slate-600 dark:text-zinc-400 mb-1">
                    Crr (Rolling Resistance)
                  </label>
                  <input
                    type="number"
                    step="0.0005"
                    value={trip.physics.crr}
                    onChange={(e) => updatePhysics('crr', parseFloat(e.target.value) || 0.006)}
                    className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-lg p-2 text-xs font-mono text-slate-900 dark:text-zinc-200"
                  />
                  <span className="text-[10px] font-mono text-slate-500 dark:text-zinc-400 mt-0.5 block">0.006 (Gravel on asphalt)</span>
                </div>

                <div>
                  <label className="block text-[11px] font-mono text-slate-600 dark:text-zinc-400 mb-1">
                    Drivetrain Efficiency (η)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={trip.physics.drivetrainEfficiency}
                    onChange={(e) => updatePhysics('drivetrainEfficiency', parseFloat(e.target.value) || 0.95)}
                    className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-lg p-2 text-xs font-mono text-slate-900 dark:text-zinc-200"
                  />
                  <span className="text-[10px] font-mono text-slate-500 dark:text-zinc-400 mt-0.5 block">0.95 (95% clean wax chain)</span>
                </div>

                <div>
                  <label className="block text-[11px] font-mono text-slate-600 dark:text-zinc-400 mb-1">
                    Gross Mechanical Efficiency (GME)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={trip.physics.grossMechanicalEfficiency}
                    onChange={(e) => updatePhysics('grossMechanicalEfficiency', parseFloat(e.target.value) || 0.21)}
                    className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-lg p-2 text-xs font-mono text-slate-900 dark:text-zinc-200"
                  />
                  <span className="text-[10px] font-mono text-slate-500 dark:text-zinc-400 mt-0.5 block">0.21 (21% human muscular)</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: Route & Velocity */}
        {activeTab === 'route' && (
          <div className="space-y-6 animate-fade-in">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-mono text-slate-700 dark:text-zinc-300 mb-1.5 font-semibold">
                  Route Distance (km)
                </label>
                <input
                  type="number"
                  step="0.5"
                  min="1"
                  max="200"
                  value={trip.route.distanceKm}
                  onChange={(e) => updateRoute('distanceKm', parseFloat(e.target.value) || 22)}
                  className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-lg p-2.5 text-sm font-mono text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-slate-700 dark:text-zinc-300 mb-1.5 font-semibold">
                  Target Cruising Speed (km/h)
                </label>
                <input
                  type="number"
                  step="0.5"
                  min="10"
                  max="50"
                  value={trip.route.targetSpeedKmH}
                  onChange={(e) => updateRoute('targetSpeedKmH', parseFloat(e.target.value) || 27.5)}
                  className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-lg p-2.5 text-sm font-mono text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-slate-700 dark:text-zinc-300 mb-1.5 font-semibold">
                  City Traffic &amp; Red Light Buffer (Minutes)
                </label>
                <input
                  type="number"
                  step="1"
                  min="0"
                  max="60"
                  value={trip.route.urbanTrafficDelayMinutes}
                  onChange={(e) => updateRoute('urbanTrafficDelayMinutes', parseInt(e.target.value, 10) || 8)}
                  className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-lg p-2.5 text-sm font-mono text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500"
                />
                <span className="text-[10px] font-mono text-slate-500 dark:text-zinc-400 mt-1 block">
                  Accounts for bridge bottleneck and urban intersections.
                </span>
              </div>

              <div>
                <label className="block text-xs font-mono text-slate-700 dark:text-zinc-300 mb-1.5 font-semibold">
                  Security Gate Clearance Buffer (Minutes)
                </label>
                <input
                  type="number"
                  step="1"
                  min="0"
                  max="30"
                  value={trip.route.gateSecurityDelayMinutes}
                  onChange={(e) => updateRoute('gateSecurityDelayMinutes', parseInt(e.target.value, 10) || 5)}
                  className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-lg p-2.5 text-sm font-mono text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500"
                />
                <span className="text-[10px] font-mono text-slate-500 dark:text-zinc-400 mt-1 block">
                  Turnstile badge scan and subterranean bike locking.
                </span>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: Office Constraints & Reverse Stepper Anchors */}
        {activeTab === 'office' && (
          <div className="space-y-6 animate-fade-in">
            {/* Strict Policy Alert Banner */}
            <div className="bg-amber-50 dark:bg-amber-500/10 border border-amber-300 dark:border-amber-500/30 rounded-xl p-4 flex items-start gap-3">
              <ShieldAlert className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-mono font-bold text-amber-900 dark:text-amber-300 uppercase">
                  STRICT OFFICE PROTOCOL MANDATE
                </h4>
                <p className="text-xs text-slate-700 dark:text-zinc-300 mt-1 leading-relaxed">
                  Eating at open-space workstations is strictly prohibited. The reverse timeline rigorously schedules Phase 1 Locker refuel and Phase 2 Break Room seating before shift start.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-mono text-slate-700 dark:text-zinc-300 mb-1.5 font-semibold">
                  Shift Start Time (Lock in at Desk)
                </label>
                <input
                  type="time"
                  value={trip.office.shiftStartTime}
                  onChange={(e) => updateOffice('shiftStartTime', e.target.value)}
                  className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-lg p-2.5 text-sm font-mono text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-slate-700 dark:text-zinc-300 mb-1.5 font-semibold">
                  Target Gate Arrival Time
                </label>
                <input
                  type="time"
                  value={trip.office.targetGateArrivalTime}
                  onChange={(e) => updateOffice('targetGateArrivalTime', e.target.value)}
                  className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-lg p-2.5 text-sm font-mono text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-slate-700 dark:text-zinc-300 mb-1.5 font-semibold">
                  Checkpoint Gate Name
                </label>
                <input
                  type="text"
                  value={trip.office.gateName}
                  onChange={(e) => updateOffice('gateName', e.target.value)}
                  className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-lg p-2.5 text-sm font-mono text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-slate-700 dark:text-zinc-300 mb-1.5 font-semibold">
                  Locker Refuel Duration (min)
                </label>
                <input
                  type="number"
                  min="5"
                  max="30"
                  value={trip.office.lockerRefuelMinutes}
                  onChange={(e) => updateOffice('lockerRefuelMinutes', parseInt(e.target.value, 10) || 10)}
                  className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-lg p-2.5 text-sm font-mono text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500"
                />
                <span className="text-[10px] font-mono text-slate-500 dark:text-zinc-400 mt-1 block">
                  Skyr 0% + Grape juice consumption.
                </span>
              </div>

              <div>
                <label className="block text-xs font-mono text-slate-700 dark:text-zinc-300 mb-1.5 font-semibold">
                  Shower &amp; Change Duration (min)
                </label>
                <input
                  type="number"
                  min="5"
                  max="30"
                  value={trip.office.showerChangeMinutes}
                  onChange={(e) => updateOffice('showerChangeMinutes', parseInt(e.target.value, 10) || 10)}
                  className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-lg p-2.5 text-sm font-mono text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-slate-700 dark:text-zinc-300 mb-1.5 font-semibold">
                  Break Room Breakfast Duration (min)
                </label>
                <input
                  type="number"
                  min="5"
                  max="45"
                  value={trip.office.breakRoomBreakfastMinutes}
                  onChange={(e) => updateOffice('breakRoomBreakfastMinutes', parseInt(e.target.value, 10) || 15)}
                  className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-lg p-2.5 text-sm font-mono text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500"
                />
                <span className="text-[10px] font-mono text-slate-500 dark:text-zinc-400 mt-1 block">
                  Oat milk oats + apple + sandwich.
                </span>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: Weather & Atmosphere */}
        {activeTab === 'weather' && (
          <div className="space-y-6 animate-fade-in">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-mono text-slate-800 dark:text-zinc-300 font-semibold">
                    Estuary Headwind Simulation
                  </label>
                  <input
                    type="checkbox"
                    checked={trip.weather.isHeadwindActive}
                    onChange={(e) => updateWeather('isHeadwindActive', e.target.checked)}
                    className="w-4 h-4 accent-amber-500 cursor-pointer"
                  />
                </div>
                <p className="text-xs text-slate-600 dark:text-zinc-400">
                  Direct opposing wind vector across the open estuary bridge corridor.
                </p>
              </div>

              <div>
                <label className="block text-xs font-mono text-slate-700 dark:text-zinc-300 mb-1.5 font-semibold">
                  Base Wind Speed (km/h)
                </label>
                <input
                  type="number"
                  step="1"
                  min="0"
                  max="45"
                  value={trip.weather.baseWindSpeedKmH}
                  onChange={(e) => updateWeather('baseWindSpeedKmH', parseFloat(e.target.value) || 8)}
                  className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-lg p-2.5 text-sm font-mono text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-slate-700 dark:text-zinc-300 mb-1.5 font-semibold">
                  Air Temperature (°C)
                </label>
                <input
                  type="number"
                  step="1"
                  value={trip.weather.temperatureC}
                  onChange={(e) => updateWeather('temperatureC', parseFloat(e.target.value) || 11)}
                  className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-lg p-2.5 text-sm font-mono text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-slate-700 dark:text-zinc-300 mb-1.5 font-semibold">
                  Precipitation Risk (%)
                </label>
                <input
                  type="number"
                  step="5"
                  min="0"
                  max="100"
                  value={trip.weather.precipitationRiskPercent}
                  onChange={(e) => updateWeather('precipitationRiskPercent', parseInt(e.target.value, 10) || 15)}
                  className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-lg p-2.5 text-sm font-mono text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
