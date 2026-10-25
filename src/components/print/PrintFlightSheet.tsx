import React from 'react';
import { TripProfile } from '../../types/trip';
import { calculatePhysics } from '../../utils/physics';
import { calculateReverseTimeline } from '../../utils/timeline';
import { getRealFoodNutritionPlan } from '../../utils/nutrition';

interface PrintFlightSheetProps {
  trip: TripProfile;
}

export const PrintFlightSheet: React.FC<PrintFlightSheetProps> = ({ trip }) => {
  const physicsResult = calculatePhysics(trip.physics, trip.route, trip.weather);
  const timelineResult = calculateReverseTimeline(trip.route, trip.office, trip.weather);
  const nutritionPhases = getRealFoodNutritionPlan(
    trip.office.targetGateArrivalTime || '08:30',
    '08:50',
    timelineResult.hardDepartureTime
  );

  return (
    <div className="print-only p-8 text-black bg-white max-w-[210mm] mx-auto font-sans leading-tight">
      {/* Top Formal Flight Header */}
      <div className="border-b-2 border-black pb-4 mb-6 flex justify-between items-start">
        <div>
          <div className="text-[10px] font-mono tracking-widest uppercase font-bold text-gray-600">
            BIKE TRIP ENGINE &middot; OPERATIONAL FLIGHT SHEET (A4)
          </div>
          <h1 className="text-2xl font-extrabold uppercase tracking-tight mt-0.5">
            {trip.name}
          </h1>
          <div className="text-xs font-mono text-gray-700 mt-1">
            Classification: <strong>{trip.tag}</strong> &middot; Destination:{' '}
            <strong>{trip.office.gateName}</strong> &middot; Shift Lock: <strong>{trip.office.shiftStartTime}</strong>
          </div>
        </div>

        <div className="text-right">
          <div className="border-2 border-black px-3 py-1 text-center font-mono font-bold text-xs">
            DECISION: {physicsResult.goStatus}
          </div>
          <div className="text-[10px] font-mono text-gray-500 mt-1">
            Generated: {new Date().toLocaleDateString()} {new Date().toLocaleTimeString()}
          </div>
        </div>
      </div>

      {/* Physics & Telemetry Matrix */}
      <div className="mb-6">
        <h2 className="text-xs font-mono font-bold uppercase tracking-wider border-b border-gray-400 pb-1 mb-2">
          1. PHYSICAL TELEMETRY &amp; RESISTIVE PARAMETERS
        </h2>
        <div className="grid grid-cols-4 gap-2 text-xs font-mono border border-gray-300 p-2.5 rounded">
          <div>
            <div className="text-gray-500 text-[10px]">SYSTEM MASS</div>
            <div className="font-bold text-sm">{physicsResult.systemMassKg} kg</div>
            <div className="text-[9px] text-gray-500">Rider {trip.physics.riderWeightKg} + Bike {trip.physics.bikeWeightKg} + Gear {trip.physics.gearWeightKg}</div>
          </div>
          <div>
            <div className="text-gray-500 text-[10px]">TARGET POWER</div>
            <div className="font-bold text-sm">{Math.round(physicsResult.legWatts)} W</div>
            <div className="text-[9px] text-gray-500">@{trip.route.targetSpeedKmH} km/h (Wheel: {Math.round(physicsResult.wheelWatts)}W)</div>
          </div>
          <div>
            <div className="text-gray-500 text-[10px]">AERO / ROLLING</div>
            <div className="font-bold text-sm">CdA {trip.physics.cda} / Crr {trip.physics.crr}</div>
            <div className="text-[9px] text-gray-500">Rho 1.225 kg/m³ &middot; Eff 95%</div>
          </div>
          <div>
            <div className="text-gray-500 text-[10px]">METABOLIC WORK</div>
            <div className="font-bold text-sm">{Math.round(physicsResult.totalWorkKj)} kJ / {Math.round(physicsResult.totalKcalBurn)} kcal</div>
            <div className="text-[9px] text-gray-500">Carb Ox: {physicsResult.carbOxidationGramPerHour} g/hr</div>
          </div>
        </div>
      </div>

      {/* Reverse Timeline Schedule Table */}
      <div className="mb-6">
        <div className="flex justify-between items-baseline border-b border-gray-400 pb-1 mb-2">
          <h2 className="text-xs font-mono font-bold uppercase tracking-wider">
            2. REVERSE TIMELINE SCHEDULE (STRICT OFFICE CONSTRAINTS)
          </h2>
          <span className="text-[10px] font-mono font-bold text-red-700">
            ZERO FOOD IN OPEN-SPACE MANDATE
          </span>
        </div>

        <table className="w-full text-xs font-mono border-collapse">
          <thead>
            <tr className="border-b border-gray-300 text-left text-[10px] text-gray-500">
              <th className="py-1 w-16">TIME</th>
              <th className="py-1 w-44">CHECKPOINT</th>
              <th className="py-1 w-32">LOCATION</th>
              <th className="py-1">OPERATIONAL DIRECTIVE</th>
              <th className="py-1 w-12 text-center">CHECK</th>
            </tr>
          </thead>
          <tbody>
            {timelineResult.steps.map((step) => (
              <tr key={step.id} className="border-b border-gray-200">
                <td className="py-1 font-bold">{step.time}</td>
                <td className="py-1 font-semibold">{step.title}</td>
                <td className="py-1 text-gray-600">{step.location}</td>
                <td className="py-1 text-gray-700 text-[11px]">{step.description}</td>
                <td className="py-1 text-center">
                  <span className="inline-block w-3.5 h-3.5 border border-black" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Real-Food Nutrition Protocol */}
      <div className="mb-6">
        <h2 className="text-xs font-mono font-bold uppercase tracking-wider border-b border-gray-400 pb-1 mb-2">
          3. REAL-FOOD NUTRITION MANIFEST (NO POWDERS / NO MILK / NO BANANAS)
        </h2>
        <div className="grid grid-cols-2 gap-3 text-xs font-mono">
          {nutritionPhases.map((phase) => (
            <div key={phase.phaseId} className="border border-gray-300 p-2 rounded">
              <div className="flex justify-between font-bold text-[11px] border-b border-gray-200 pb-0.5 mb-1">
                <span>{phase.title}</span>
                <span className="text-gray-600">{phase.timeWindow.split('–')[0]}</span>
              </div>
              <div className="text-[10px] text-gray-600 mb-1">{phase.location}</div>
              <ul className="list-disc list-inside space-y-0.5 text-[10px] text-gray-800">
                {phase.items.map((item, i) => (
                  <li key={i}>
                    <strong>{item.name}</strong> ({item.quantity}) &mdash; {item.carbsGrams}g C, {item.proteinGrams}g P
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {/* Pre-Flight Checklist Table & Sign-Off */}
      <div>
        <h2 className="text-xs font-mono font-bold uppercase tracking-wider border-b border-gray-400 pb-1 mb-2">
          4. PRE-FLIGHT VERIFICATION &amp; INSPECTION SIGN-OFF
        </h2>
        <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-[10px] font-mono mb-4">
          {trip.checklist.map((item) => (
            <div key={item.id} className="flex items-center justify-between border-b border-gray-100 py-0.5">
              <span className={item.checked ? 'font-bold' : ''}>
                [{item.checked ? 'X' : ' '}] {item.label}
              </span>
              <span className="text-gray-500 uppercase text-[9px]">{item.category}</span>
            </div>
          ))}
        </div>

        {/* Signature Line */}
        <div className="pt-4 border-t border-black flex justify-between items-end text-xs font-mono">
          <div>
            <div>Rider Flight Deck Authorization: _________________________</div>
            <div className="text-[9px] text-gray-500 mt-0.5">All telemetry, tire pressure, and office rations verified.</div>
          </div>
          <div className="text-right">
            <div>Security Clearance ID: <strong>GATE17-PASS-OK</strong></div>
          </div>
        </div>
      </div>
    </div>
  );
};
