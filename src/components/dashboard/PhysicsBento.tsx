import React from 'react';
import { Lightning, Gauge, Flame, Scales, Pulse } from '@/components/icons';
import { Card } from '../common/Card';
import { MetricPill } from '../common/MetricPill';
import { InfoTooltip } from '../common/InfoTooltip';
import { PhysicsParams, RouteParams, WeatherCondition, PhysicsCalculationResult } from '../../types/trip';

interface PhysicsBentoProps {
  physics: PhysicsParams;
  route: RouteParams;
  weather: WeatherCondition;
  result: PhysicsCalculationResult;
}

export const PhysicsBento: React.FC<PhysicsBentoProps> = ({
  physics,
  route,
  result,
}) => {
  const totalDragWatts = result.aerodynamicDragWatts + result.rollingResistanceWatts + result.gravityWatts;
  const aeroPercent = Math.round((result.aerodynamicDragWatts / Math.max(1, totalDragWatts)) * 100);
  const rollPercent = Math.round((result.rollingResistanceWatts / Math.max(1, totalDragWatts)) * 100);

  return (
    <Card
      title="AERODYNAMIC &amp; ROLLING PHYSICS ENGINE"
      subtitle="Standard road/gravel power model with mechanical efficiency"
      icon={<Gauge className="w-5 h-5 text-ink dark:text-volt dual-tone-emerald" />}
      badge={
        <div className="inline-flex items-center gap-1.5 flex-wrap">
          <span className="inline-flex items-center gap-1 text-[10px] font-mono uppercase bg-pod text-ink dark:text-volt px-2.5 py-1 rounded-full font-bold">
            <span>CdA {physics.cda} m²</span>
            <InfoTooltip
              title="Aerodynamic Drag Area (CdA)"
              content="Measures how streamlined you and your bike are. Lower numbers slice through the air with less effort. Typical gravel/commute hood riding positions range from 0.35 to 0.40 m²."
              size="sm"
            />
          </span>
          <span className="inline-flex items-center gap-1 text-[10px] font-mono uppercase bg-pod text-ink dark:text-volt px-2.5 py-1 rounded-full font-bold">
            <span>Crr {physics.crr}</span>
            <InfoTooltip
              title="Rolling Resistance (Crr)"
              content="Measures friction and energy lost as tires flex against the pavement or gravel. Lower numbers mean smoother, faster-rolling tires. Typical commuter and gravel tires range from 0.004 to 0.006."
              size="sm"
            />
          </span>
        </div>
      }
      className="col-span-1 lg:col-span-2"
    >
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 mb-5">
        <MetricPill
          label="Leg Output"
          value={Math.round(result.legWatts)}
          unit="W"
          subValue={`Target: ${route.targetSpeedKmH} km/h`}
          variant="volt"
          icon={<Lightning className="w-4 h-4 dual-tone-volt" />}
          infoTitle="Leg Output"
          infoContent="Total power produced by your legs. Covers aerodynamic drag, tire rolling resistance, drivetrain loss, and elevation changes."
        />

        <MetricPill
          label="Total Work"
          value={Math.round(result.totalWorkKj)}
          unit="kJ"
          subValue={`Duration: ${result.movingTimeFormatted}`}
          variant="zinc"
          icon={<Pulse className="w-4 h-4 dual-tone-rose" />}
          infoTitle="Total Work"
          infoContent="Physical work delivered by your legs through the pedals to move the bike over the trip (1 kJ on pedals ≈ 1 kcal burned)."
        />

        <MetricPill
          label="Caloric Burn"
          value={Math.round(result.totalKcalBurn)}
          unit="kcal"
          subValue="Gross Mech Eff: 21%"
          variant="amber"
          icon={<Flame className="w-4 h-4 dual-tone-orange" />}
          infoTitle="Caloric Burn"
          infoContent="Total food calories (kcal) your body burns to power the commute, factoring in ~21% human muscular efficiency."
        />

        <MetricPill
          label="Carb Oxidation"
          value={result.carbOxidationGramPerHour}
          unit="g/hr"
          subValue={`Total trip: ~${result.totalCarbsBurnedGrams}g`}
          variant="zinc"
          icon={<Flame className="w-4 h-4 dual-tone-amber" />}
          infoTitle="Carbohydrate Oxidation"
          infoContent="Estimated burn rate of carbohydrates (glycogen stored in muscles and liver) to sustain this power tempo."
        />
      </div>

      <div className="bg-pod rounded-pod p-5 mb-4">
        <div className="flex items-center justify-between text-xs font-mono text-ink mb-2.5">
          <span className="font-bold flex items-center gap-1.5">
            <span>Resistive Force Distribution</span>
            <InfoTooltip
              title="Resistive Force Distribution"
              content="How your pedal wattage is divided between pushing against the air (aero) and overcoming tire friction on the ground (rolling)."
              size="sm"
            />
          </span>
          <span className="text-[11px] text-ink-secondary">
            Aero: <strong className="text-ink dark:text-volt">{aeroPercent}%</strong> &middot; Rolling: <strong className="text-ink dark:text-volt-lime">{rollPercent}%</strong>
          </span>
        </div>

        <div className="w-full h-3 bg-card tarmac-hatch rounded-full overflow-hidden flex gap-1 p-0.5 mb-4">
          <div
            style={{ width: `${aeroPercent}%` }}
            className="bg-[#111111] dark:bg-volt rounded-full transition-all duration-300"
            title={`Aerodynamic Drag: ${Math.round(result.aerodynamicDragWatts)}W`}
          />
          <div
            style={{ width: `${rollPercent}%` }}
            className="bg-volt dark:bg-volt-lime rounded-full transition-all duration-300"
            title={`Rolling Resistance: ${Math.round(result.rollingResistanceWatts)}W`}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-mono">
          <div className="rounded-sub-pod rounded-xl p-3 bg-card">
            <div className="flex items-center justify-between gap-1 text-[10px] text-ink-muted uppercase font-bold">
              <span>Aerodynamic Drag (P_aero)</span>
              <InfoTooltip
                title="Aerodynamic Drag"
                content="The continuous power in Watts needed just to push through the air. Air resistance grows with the cube of speed (v³): riding twice as fast demands 8× the aero power."
                size="sm"
              />
            </div>
            <div className="text-base font-bold text-ink dark:text-volt mt-0.5">
              {Math.round(result.aerodynamicDragWatts)} <span className="text-xs font-normal text-ink-muted">Watts</span>
            </div>
            <div className="text-[10px] text-ink-secondary mt-1">
              0.5 &times; ρ({physics.rho}) &times; CdA({physics.cda}) &times; v³
            </div>
          </div>

          <div className="rounded-sub-pod rounded-xl p-3 bg-card">
            <div className="flex items-center justify-between gap-1 text-[10px] text-ink-muted uppercase font-bold">
              <span>Rolling Resistance (P_roll)</span>
              <InfoTooltip
                title="Rolling Resistance"
                content="The power in Watts lost from tires flexing against the ground. It is directly proportional to total weight and riding speed."
                size="sm"
              />
            </div>
            <div className="text-base font-bold text-ink dark:text-volt-lime mt-0.5">
              {Math.round(result.rollingResistanceWatts)} <span className="text-xs font-normal text-ink-muted">Watts</span>
            </div>
            <div className="text-[10px] text-ink-secondary mt-1">
              Crr({physics.crr}) &times; M({result.systemMassKg}kg) &times; 9.81 &times; v
            </div>
          </div>

          <div className="rounded-sub-pod rounded-xl p-3 bg-card">
            <div className="flex items-center justify-between gap-1 text-[10px] text-ink-muted uppercase font-bold">
              <span>Drivetrain Loss (5%)</span>
              <InfoTooltip
                title="Drivetrain Loss"
                content="Mechanical friction absorbed by the chain, cassette, and derailleur pulleys before reaching the tire (~5% on a clean chain)."
                size="sm"
              />
            </div>
            <div className="text-base font-bold text-ink mt-0.5">
              {Math.round(result.legWatts - result.wheelWatts)} <span className="text-xs font-normal text-ink-muted">Watts</span>
            </div>
            <div className="text-[10px] text-ink-secondary mt-1">
              95% clean efficiency (P_wheel / 0.95)
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
        <div className="bg-pod rounded-pod p-4">
          <div className="flex items-center justify-between text-xs text-ink font-semibold mb-2.5">
            <span className="flex items-center gap-1.5">
              <Scales className="w-4 h-4 text-ink dark:text-volt" />
              <span>System mass</span>
              <InfoTooltip
                title="System Mass"
                content="The combined weight of rider, bicycle, and all carried gear. Total mass directly determines tire rolling resistance and climbing effort."
                size="sm"
              />
            </span>
            <span className="px-2.5 py-0.5 rounded-full bg-card font-semibold tnum">{result.systemMassKg} kg</span>
          </div>
          <div className="text-ink-secondary">
            <div className="flex items-center justify-between py-1.5">
              <span className="flex items-center gap-1">
                <span>Rider mass</span>
                <InfoTooltip
                  title="Rider Mass"
                  content="Your body weight. Accounts for ~80–85% of total system mass and directly dictates frontal aerodynamic drag area."
                  size="sm"
                />
              </span>
              <span className="text-ink font-semibold tnum">{physics.riderWeightKg} kg</span>
            </div>
            <div className="lane-divider" aria-hidden="true" />
            <div className="flex items-center justify-between py-1.5">
              <span className="flex items-center gap-1">
                <span>Bicycle build</span>
                <InfoTooltip
                  title="Bicycle Build"
                  content="Dry weight of the bike, including frame, fork, wheels, tires, drivetrain, pedals, and accessories."
                  size="sm"
                />
              </span>
              <span className="text-ink font-semibold tnum">{physics.bikeWeightKg} kg</span>
            </div>
            <div className="lane-divider" aria-hidden="true" />
            <div className="flex items-center justify-between pt-1.5">
              <span className="flex items-center gap-1">
                <span>Gear &amp; pack</span>
                <InfoTooltip
                  title="Gear & Payload"
                  content="Weight of all carried gear: backpack or panniers, laptop, work clothes, lock, pump, repair kit, and water bottles."
                  size="sm"
                />
              </span>
              <span className="text-ink font-semibold tnum">{physics.gearWeightKg} kg</span>
            </div>
          </div>
        </div>

        <div className="bg-pod rounded-pod p-4">
          <div className="flex items-center justify-between text-xs text-ink font-semibold mb-2.5">
            <span className="flex items-center gap-1.5">
              <Flame className="w-4 h-4 text-beacon-amber" />
              <span>Energy substrate</span>
              <InfoTooltip
                title="Gross Mechanical Efficiency (GME)"
                content="Human muscles are only ~20–24% efficient at turning food energy into pedal propulsion. The remaining ~76–80% is converted into metabolic heat."
                size="sm"
              />
            </span>
            <span className="px-2.5 py-0.5 rounded-full bg-card text-ink font-semibold tnum">21% eff</span>
          </div>
          <div className="text-ink-secondary">
            <div className="flex items-center justify-between py-1.5">
              <span className="flex items-center gap-1">
                <span>Mechanical work</span>
                <InfoTooltip
                  title="Mechanical Pedal Work"
                  content="The actual physical work delivered by your legs through the pedals to move the bike over the trip (1 kJ ≈ 1 kcal burned)."
                  size="sm"
                />
              </span>
              <span className="text-ink font-semibold tnum">{Math.round(result.totalWorkKj)} kJ</span>
            </div>
            <div className="lane-divider" aria-hidden="true" />
            <div className="flex items-center justify-between py-1.5">
              <span className="flex items-center gap-1">
                <span>Metabolic energy</span>
                <InfoTooltip
                  title="Metabolic Caloric Burn"
                  content="Total food calories (kcal) your body burns to power the commute, calculated by dividing mechanical work by muscular efficiency."
                  size="sm"
                />
              </span>
              <span className="text-ink font-semibold tnum">{Math.round(result.totalKcalBurn)} kcal</span>
            </div>
            <div className="lane-divider" aria-hidden="true" />
            <div className="flex items-center justify-between pt-1.5 text-ink dark:text-volt-lime font-semibold">
              <span className="flex items-center gap-1">
                <span>Carb demand</span>
                <InfoTooltip
                  title="Carbohydrate & Glycogen Demand"
                  content="Estimated hourly burn rate (g/h) and total grams of carbohydrates (glycogen stored in muscles and liver) consumed at this power pace."
                  size="sm"
                />
              </span>
              <span className="tnum">{result.carbOxidationGramPerHour} g/hr (~{result.totalCarbsBurnedGrams}g)</span>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
};
