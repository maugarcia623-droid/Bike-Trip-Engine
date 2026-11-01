import React from 'react';
import { Wind, NavigationArrow, WarningCircle, CheckCircle } from '@/components/icons';
import { Card } from '../common/Card';
import { Badge } from '../common/Badge';
import { WeatherCondition, PhysicsCalculationResult } from '../../types/trip';

interface WeatherBentoProps {
  weather: WeatherCondition;
  physicsResult: PhysicsCalculationResult;
  onToggleHeadwind: () => void;
  onSetWindSpeed: (speed: number) => void;
}

export const WeatherBento: React.FC<WeatherBentoProps> = ({
  weather,
  physicsResult,
  onToggleHeadwind,
  onSetWindSpeed,
}) => {
  const isHeadwind = weather.isHeadwindActive;

  return (
    <Card
      title="WIND CONDITIONS &amp; HEADWIND"
      subtitle="Dynamic headwind modeling across exposed route segments"
      icon={<Wind className="w-5 h-5 text-beacon-amber dual-tone-orange" />}
      badge={
        <button
          onClick={onToggleHeadwind}
          className={`text-[10px] font-mono uppercase px-3 py-1 rounded-full font-bold transition-all cursor-pointer ${
            isHeadwind
              ? 'bg-[#111111] text-volt dark:bg-elevated dark:text-beacon-amber'
              : 'bg-pod hover:bg-chip text-ink'
          }`}
        >
          {isHeadwind ? '8 km/h Headwind: ON' : 'Calm: OFF'}
        </button>
      }
      className="col-span-1"
    >
      <div className="bg-pod rounded-pod p-5 mb-4 flex flex-col items-center justify-center text-center">
        <div className="relative w-24 h-24 mb-2.5 flex items-center justify-center bg-card rounded-full border-2 border-dashed border-ink/20 dark:border-white/15">
          <div className="absolute top-1 text-[9px] font-mono font-bold text-ink-muted">N</div>
          <div className="absolute bottom-1 text-[9px] font-mono font-bold text-ink-muted">S</div>
          <div className="absolute left-1.5 text-[9px] font-mono font-bold text-ink-muted">W</div>
          <div className="absolute right-1.5 text-[9px] font-mono font-bold text-ink-muted">E</div>

          <div
            style={{
              transform: `rotate(${isHeadwind ? 245 : 45}deg)`,
            }}
            className="transition-transform duration-500 flex flex-col items-center"
          >
            <NavigationArrow
              className={`w-8 h-8 ${
                isHeadwind ? 'text-beacon-amber dual-tone-orange' : 'text-ink dark:text-volt-lime dual-tone-emerald'
              }`}
            />
          </div>
        </div>

        <div className="font-mono text-base font-bold text-ink">
          {weather.baseWindSpeedKmH} km/h{' '}
          <span className="text-xs font-normal text-ink-muted">
            {isHeadwind ? '(245° WSW Headwind)' : '(Calm / Mild Vector)'}
          </span>
        </div>

        {isHeadwind ? (
          <Badge variant="amber" size="sm" icon={WarningCircle} className="mt-2.5 font-mono font-bold">
            +{Math.round(physicsResult.powerDeltaWatts)}W Aero Penalty &middot; +3m Buffer
          </Badge>
        ) : (
          <Badge variant="emerald" size="sm" icon={CheckCircle} className="mt-2.5 font-mono font-bold">
            Optimal Commute Corridor &middot; Zero Penalty
          </Badge>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 text-xs font-mono mb-4">
        <div className="bg-pod rounded-pod p-3.5">
          <div className="text-[10px] text-ink-muted uppercase font-bold">Air Temp &amp; Rho</div>
          <div className="text-sm font-bold text-ink mt-0.5">
            {weather.temperatureC}°C <span className="text-[11px] font-normal text-ink-muted">(1.225)</span>
          </div>
        </div>

        <div className="bg-pod rounded-pod p-3.5">
          <div className="text-[10px] text-ink-muted uppercase font-bold">Max Gust Envelope</div>
          <div className="text-sm font-bold text-ink mt-0.5">
            {isHeadwind ? weather.estuaryGustKmH : 6} km/h max
          </div>
        </div>
      </div>

      <div className="mt-auto">
        <div className="lane-divider mb-3" aria-hidden="true" />
        <div className="flex items-center justify-between text-xs font-mono text-ink-secondary mb-2">
          <span>Estuary Wind Velocity:</span>
          <span className="px-2.5 py-0.5 rounded-full bg-pod text-ink font-bold">{weather.baseWindSpeedKmH} km/h</span>
        </div>
        <input
          type="range"
          min="0"
          max="35"
          step="1"
          value={weather.baseWindSpeedKmH}
          onChange={(e) => onSetWindSpeed(Number(e.target.value))}
          className="w-full peloton-slider"
        />
        <div className="flex justify-between text-[10px] font-mono text-ink-muted mt-1.5">
          <span>0 km/h (Calm)</span>
          <span className="text-ink dark:text-volt font-bold">8 km/h (Baseline)</span>
          <span>35 km/h (Gale)</span>
        </div>
      </div>
    </Card>
  );
};
