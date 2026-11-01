import React from 'react';
import { Mountains } from '@/components/icons';
import { Card } from '../common/Card';

interface RouteVectorCardProps {
  distanceKm: number;
  gateName: string;
}

export const RouteVectorCard: React.FC<RouteVectorCardProps> = ({
  distanceKm,
  gateName,
}) => {
  return (
    <Card
      title="Route Profile &amp; Elevation Ribbon"
      subtitle="Route sectors, surface split &amp; bridge exposure"
      icon={<Mountains className="w-5 h-5 text-ink dark:text-volt" />}
      className="lg:col-span-6"
    >
      <div className="space-y-4">
        {/* Borderless Metric Pods */}
        <div className="grid grid-cols-3 gap-2.5 font-mono text-center text-xs">
          <div className="p-3 rounded-pod bg-pod">
            <span className="text-[10px] text-ink-muted block uppercase font-bold">Elevation D+</span>
            <span className="font-bold text-ink mt-0.5 block">+145 m</span>
          </div>
          <div className="p-3 rounded-pod bg-pod">
            <span className="text-[10px] text-ink-muted block uppercase font-bold">Max Gradient</span>
            <span className="font-bold text-ink mt-0.5 block">4.2%</span>
          </div>
          <div className="p-3 rounded-pod bg-pod">
            <span className="text-[10px] text-ink-muted block uppercase font-bold">Surface</span>
            <span className="font-bold text-ink dark:text-volt mt-0.5 block">80% Paved / 20% Gravel</span>
          </div>
        </div>

        {/* SVG Route & Elevation Vector Profile with Asphalt Dashed Baselines */}
        <div className="relative pt-4 pb-2 px-2 rounded-pod bg-pod">
          <svg
            viewBox="0 0 500 130"
            className="w-full h-32 overflow-visible"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              <linearGradient id="routeGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#F5F559" stopOpacity="0.35" />
                <stop offset="100%" stopColor="#F5F559" stopOpacity="0.0" />
              </linearGradient>
            </defs>

            {/* Asphalt Dashed Lane Reference Lines */}
            <line x1="0" y1="110" x2="500" y2="110" stroke="currentColor" className="text-ink/20" strokeWidth="1.5" strokeDasharray="8 6" />
            <line x1="0" y1="60" x2="500" y2="60" stroke="currentColor" className="text-ink/10" strokeWidth="1.5" strokeDasharray="8 6" />

            {/* Gradient Fill Under Curve */}
            <path
              d="M 10 110 L 10 95 C 60 92, 100 85, 150 78 C 200 70, 240 50, 290 52 C 340 55, 380 90, 440 85 L 490 80 L 490 110 Z"
              fill="url(#routeGradient)"
            />

            {/* Elevation Profile Line */}
            <path
              d="M 10 95 C 60 92, 100 85, 150 78 C 200 70, 240 50, 290 52 C 340 55, 380 90, 440 85 L 490 80"
              stroke="currentColor"
              className="text-[#111111] dark:text-volt"
              strokeWidth="2.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* Waypoint 1: Nantes */}
            <circle cx="10" cy="95" r="4.5" fill="#CAF164" stroke="#111111" strokeWidth="1.5" />
            <text x="10" y="125" fill="currentColor" className="text-ink-muted" fontSize="9" fontFamily="monospace" textAnchor="start">
              Nantes (0km)
            </text>

            {/* Waypoint 2: Estuary Sector */}
            <line x1="290" y1="52" x2="290" y2="110" stroke="#F59E0B" strokeWidth="1.5" strokeDasharray="4 4" strokeOpacity="0.65" />
            <circle cx="290" cy="52" r="4.5" fill="#F59E0B" />
            <text x="290" y="38" fill="#F59E0B" fontSize="9" fontFamily="monospace" textAnchor="middle" fontWeight="bold">
              Estuary Sector (Wind Zone)
            </text>

            {/* Waypoint 3: Target Gate */}
            <circle cx="490" cy="80" r="4.5" fill="#FF3B30" />
            <text x="490" y="125" fill="currentColor" className="text-ink-muted" fontSize="9" fontFamily="monospace" textAnchor="end">
              {gateName || 'Gate 17'} ({distanceKm}km)
            </text>
          </svg>
        </div>

        {/* Legend */}
        <div className="lane-divider" aria-hidden="true" />
        <div className="flex items-center justify-between text-[11px] font-mono text-ink-secondary flex-wrap gap-2">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#111111] dark:bg-volt" />
            <span>Sector A: Low Rolling Resistance</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-beacon-amber" />
            <span>Bridge Crossing: Aero Tuck</span>
          </div>
        </div>
      </div>
    </Card>
  );
};
