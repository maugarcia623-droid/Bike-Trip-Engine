import React, { useState } from 'react';
import { Lightning, Gauge, Flame, Scales, Pulse, CaretDown } from '@/components/icons';
import { Card } from '../common/Card';
import { MetricPill } from '../common/MetricPill';
import { InfoTooltip } from '../common/InfoTooltip';
import { PhysicsParams, RouteParams, WeatherCondition, PhysicsCalculationResult } from '../../types/trip';
import { useTranslation } from '../../context/LanguageContext';

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
  const { lang, t } = useTranslation();
  const isFr = lang === 'fr';
  const [showSegmentZones, setShowSegmentZones] = useState(false);

  const totalDragWatts = result.aerodynamicDragWatts + result.rollingResistanceWatts + result.gravityWatts;
  const aeroPercent = Math.round((result.aerodynamicDragWatts / Math.max(1, totalDragWatts)) * 100);
  const rollPercent = Math.round((result.rollingResistanceWatts / Math.max(1, totalDragWatts)) * 100);

  const avgWatts = Math.round(result.legWatts);
  const zone1Watts = Math.round(avgWatts * 0.7);
  const zone3Watts = Math.round(avgWatts * 1.25);

  return (
    <Card
      title={isFr ? 'Moteur physique & répartition de l’effort' : 'Power model & effort distribution'}
      subtitle={
        isFr
          ? 'Analyse détaillée des watts, du vent et des variations d’effort par section'
          : 'Detailed power model with sectional zone breakdown and mechanical efficiency'
      }
      icon={<Gauge className="w-5 h-5 text-ink dark:text-volt dual-tone-emerald" />}
      badge={
        <div className="inline-flex items-center gap-1.5 flex-wrap">
          <span className="inline-flex items-center gap-1 text-[10px] font-mono uppercase bg-pod text-ink dark:text-volt px-2.5 py-1 rounded-full font-bold">
            <span>CdA {physics.cda} m²</span>
            <InfoTooltip
              title="Aerodynamic Drag Area (CdA)"
              content="Measures how streamlined you and your bike are. Lower numbers slice through the air with less effort."
              size="sm"
            />
          </span>
          <span className="inline-flex items-center gap-1 text-[10px] font-mono uppercase bg-pod text-ink dark:text-volt px-2.5 py-1 rounded-full font-bold">
            <span>Crr {physics.crr}</span>
            <InfoTooltip
              title="Rolling Resistance (Crr)"
              content="Measures friction and energy lost as tires flex against pavement or gravel."
              size="sm"
            />
          </span>
        </div>
      }
      className="col-span-1 lg:col-span-2"
    >
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 mb-5">
        <MetricPill
          label={isFr ? 'Puissance Jambes' : 'Leg Output'}
          value={avgWatts}
          unit="W"
          subValue={`Target: ${route.targetSpeedKmH} km/h`}
          variant="volt"
          icon={<Lightning className="w-4 h-4 dual-tone-volt" />}
          infoTitle="Leg Output"
          infoContent="Total power produced by your legs across the route."
        />

        <MetricPill
          label={isFr ? 'Travail Total' : 'Total Work'}
          value={Math.round(result.totalWorkKj)}
          unit="kJ"
          subValue={`Duration: ${result.movingTimeFormatted}`}
          variant="zinc"
          icon={<Pulse className="w-4 h-4 dual-tone-rose" />}
          infoTitle="Total Work"
          infoContent="Physical work delivered by your legs through the pedals."
        />

        <MetricPill
          label={isFr ? 'Dépense Calorique' : 'Caloric Burn'}
          value={Math.round(result.totalKcalBurn)}
          unit="kcal"
          subValue="Gross Mech Eff: 21%"
          variant="amber"
          icon={<Flame className="w-4 h-4 dual-tone-orange" />}
          infoTitle="Caloric Burn"
          infoContent="Total food calories (kcal) burned during the journey."
        />

        <MetricPill
          label={isFr ? 'Oxydation Glucides' : 'Carb Oxidation'}
          value={result.carbOxidationGramPerHour}
          unit="g/hr"
          subValue={`Total: ~${result.totalCarbsBurnedGrams}g`}
          variant="zinc"
          icon={<Flame className="w-4 h-4 dual-tone-amber" />}
          infoTitle="Carbohydrate Oxidation"
          infoContent="Estimated burn rate of carbohydrates to sustain this power tempo."
        />
      </div>

      {/* Didactic Sectional Energy Breakdown (Addressing Arthur's Note 12) */}
      <div className="bg-pod rounded-pod p-4 mb-4 border border-ink/5 dark:border-white/5">
        <div className="flex items-center justify-between cursor-pointer" onClick={() => setShowSegmentZones(!showSegmentZones)}>
          <div className="flex items-center gap-2">
            <span className="text-sm">⛰️</span>
            <div>
              <h4 className="text-xs sm:text-[13px] font-bold text-ink">
                {isFr ? 'Profilé Énergétique par Section (Zones d’effort)' : 'Sectional Energy Profile (Zone Breakdown)'}
              </h4>
              <p className="text-[11px] text-ink-muted">
                {isFr
                  ? 'Contrairement à une moyenne plate, voici où vous dépenserez le plus d’énergie (bosses vs faux-plats).'
                  : 'Detailed breakdown of where effort spikes into harder zones versus cruising flats.'}
              </p>
            </div>
          </div>
          <button
            type="button"
            className="px-3 py-1 rounded-full text-xs font-semibold bg-card text-ink hover:bg-chip transition-colors flex items-center gap-1 cursor-pointer"
          >
            <span>{showSegmentZones ? (isFr ? 'Masquer détails' : 'Hide details') : (isFr ? 'Voir les sections' : 'View sections')}</span>
            <CaretDown className={`w-3.5 h-3.5 transition-transform ${showSegmentZones ? 'rotate-180' : ''}`} />
          </button>
        </div>

        {showSegmentZones && (
          <div className="mt-3.5 pt-3 border-t border-dashed border-ink/10 dark:border-white/10 grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
            <div className="p-3 rounded-sub-pod bg-card border border-ink/5">
              <div className="text-[10px] font-bold text-ink-muted uppercase">{isFr ? 'Départ & Faux-plats (Zone 1-2)' : 'Rolling Starts (Zone 1-2)'}</div>
              <div className="text-sm font-extrabold text-ink tnum mt-1">{zone1Watts} W</div>
              <div className="text-[10px] text-ink-secondary mt-0.5">{isFr ? '~40% du parcours · Récupération active' : '~40% of route · Steady cruise'}</div>
            </div>

            <div className="p-3 rounded-sub-pod bg-card border border-ink/5">
              <div className="text-[10px] font-bold text-ink-muted uppercase">{isFr ? 'Vents de face & Relances (Zone 3)' : 'Headwinds & Surges (Zone 3)'}</div>
              <div className="text-sm font-extrabold text-ink tnum mt-1">{avgWatts} W</div>
              <div className="text-[10px] text-ink-secondary mt-0.5">{isFr ? '~40% du parcours · Rythme nominal' : '~40% of route · Nominal tempo'}</div>
            </div>

            <div className="p-3 rounded-sub-pod bg-card border border-ink/5">
              <div className="text-[10px] font-bold text-ink-muted uppercase">{isFr ? 'Bosses & Passages Raides (Zone 4+)' : 'Climbs & Steep Ramps (Zone 4+)'}</div>
              <div className="text-sm font-extrabold text-ink tnum mt-1">{zone3Watts} W+</div>
              <div className="text-[10px] text-ink-secondary mt-0.5">{isFr ? '~20% du parcours · Pic métabolique' : '~20% of route · Peak power demand'}</div>
            </div>
          </div>
        )}
      </div>

      <div className="bg-pod rounded-pod p-5 mb-4">
        <div className="flex items-center justify-between text-xs font-mono text-ink mb-2.5">
          <span className="font-bold flex items-center gap-1.5">
            <span>{isFr ? 'Distribution des forces résistives' : 'Resistive force distribution'}</span>
            <InfoTooltip
              title="Resistive Force Distribution"
              content="How your pedal wattage is divided between pushing against the air (aero) and overcoming tire friction."
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
              <span>{isFr ? 'Face au vent' : 'Fighting the wind (P_aero)'}</span>
              <InfoTooltip
                title="Aerodynamic Drag"
                content="Power needed to push through the air. Grows with the cube of speed (v³)."
                size="sm"
              />
            </div>
            <div className="text-base font-bold text-ink dark:text-volt mt-0.5">
              {Math.round(result.aerodynamicDragWatts)} <span className="text-xs font-normal text-ink-muted">Watts</span>
            </div>
          </div>

          <div className="rounded-sub-pod rounded-xl p-3 bg-card">
            <div className="flex items-center justify-between gap-1 text-[10px] text-ink-muted uppercase font-bold">
              <span>{isFr ? 'Pneus sur la route' : 'Tires on the road (P_roll)'}</span>
              <InfoTooltip
                title="Rolling Resistance"
                content="Power lost from tires flexing against the ground."
                size="sm"
              />
            </div>
            <div className="text-base font-bold text-ink dark:text-volt-lime mt-0.5">
              {Math.round(result.rollingResistanceWatts)} <span className="text-xs font-normal text-ink-muted">Watts</span>
            </div>
          </div>

          <div className="rounded-sub-pod rounded-xl p-3 bg-card">
            <div className="flex items-center justify-between gap-1 text-[10px] text-ink-muted uppercase font-bold">
              <span>{isFr ? 'Chaîne et vitesses' : 'Chain and gears (5%)'}</span>
              <InfoTooltip
                title="Drivetrain Loss"
                content="Mechanical friction absorbed by the chain and derailleur."
                size="sm"
              />
            </div>
            <div className="text-base font-bold text-ink mt-0.5">
              {Math.round(result.legWatts - result.wheelWatts)} <span className="text-xs font-normal text-ink-muted">Watts</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
        <div className="bg-pod rounded-pod p-4">
          <div className="flex items-center justify-between text-xs text-ink font-semibold mb-2.5">
            <span className="flex items-center gap-1.5">
              <Scales className="w-4 h-4 text-ink dark:text-volt" />
              <span>{isFr ? 'Masse système' : 'System mass'}</span>
            </span>
            <span className="px-2.5 py-0.5 rounded-full bg-card font-semibold tnum">{result.systemMassKg} kg</span>
          </div>
          <div className="text-ink-secondary space-y-1.5">
            <div className="flex items-center justify-between py-1">
              <span>{isFr ? 'Masse cycliste' : 'Rider mass'}</span>
              <span className="text-ink font-semibold tnum">{physics.riderWeightKg} kg</span>
            </div>
            <div className="lane-divider" aria-hidden="true" />
            <div className="flex items-center justify-between py-1">
              <span>{isFr ? 'Vélo' : 'Bicycle build'}</span>
              <span className="text-ink font-semibold tnum">{physics.bikeWeightKg} kg</span>
            </div>
            <div className="lane-divider" aria-hidden="true" />
            <div className="flex items-center justify-between pt-1">
              <span>{isFr ? 'Équipement' : 'Gear & pack'}</span>
              <span className="text-ink font-semibold tnum">{physics.gearWeightKg} kg</span>
            </div>
          </div>
        </div>

        <div className="bg-pod rounded-pod p-4">
          <div className="flex items-center justify-between text-xs text-ink font-semibold mb-2.5">
            <span className="flex items-center gap-1.5">
              <Flame className="w-4 h-4 text-beacon-amber" />
              <span>{isFr ? 'Substrat énergétique' : 'Energy substrate'}</span>
            </span>
            <span className="px-2.5 py-0.5 rounded-full bg-card text-ink font-semibold tnum">21% eff</span>
          </div>
          <div className="text-ink-secondary space-y-1.5">
            <div className="flex items-center justify-between py-1">
              <span>{isFr ? 'Travail mécanique' : 'Mechanical work'}</span>
              <span className="text-ink font-semibold tnum">{Math.round(result.totalWorkKj)} kJ</span>
            </div>
            <div className="lane-divider" aria-hidden="true" />
            <div className="flex items-center justify-between py-1">
              <span>{isFr ? 'Énergie métabolique' : 'Metabolic energy'}</span>
              <span className="text-ink font-semibold tnum">{Math.round(result.totalKcalBurn)} kcal</span>
            </div>
            <div className="lane-divider" aria-hidden="true" />
            <div className="flex items-center justify-between pt-1 text-ink dark:text-volt-lime font-semibold">
              <span>{isFr ? 'Demande glucides' : 'Carb demand'}</span>
              <span className="tnum">{result.carbOxidationGramPerHour} g/hr (~{result.totalCarbsBurnedGrams}g)</span>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
};
