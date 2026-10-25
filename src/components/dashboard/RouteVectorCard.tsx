import React from 'react';
import { Mountain } from 'lucide-react';
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
      title="Route Profile & Elevation Ribbon"
      subtitle="Corridor sectors, surface split & bridge exposure"
      icon={<Mountain className="w-4 h-4 text-emerald-500" />}
      className="lg:col-span-6"
    >
      <div className="space-y-4">
        {/* Metric Badges */}
        <div className="grid grid-cols-3 gap-2 font-mono text-center text-xs">
          <div className="p-2 rounded-lg bg-slate-50 dark:bg-zinc-900 border border-slate-100 dark:border-zinc-800">
            <span className="text-[10px] text-slate-500 dark:text-zinc-400 block uppercase">Elevation D+</span>
            <span className="font-bold text-slate-900 dark:text-white">+145 m</span>
          </div>
          <div className="p-2 rounded-lg bg-slate-50 dark:bg-zinc-900 border border-slate-100 dark:border-zinc-800">
            <span className="text-[10px] text-slate-500 dark:text-zinc-400 block uppercase">Max Gradient</span>
            <span className="font-bold text-slate-900 dark:text-white">4.2%</span>
          </div>
          <div className="p-2 rounded-lg bg-slate-50 dark:bg-zinc-900 border border-slate-100 dark:border-zinc-800">
            <span className="text-[10px] text-slate-500 dark:text-zinc-400 block uppercase">Surface</span>
            <span className="font-bold text-emerald-600 dark:text-emerald-400">80% Paved / 20% Gravel</span>
          </div>
        </div>

        {/* SVG Route & Elevation Vector Profile */}
        <div className="relative pt-4 pb-2 px-1">
          <svg
            viewBox="0 0 500 130"
            className="w-full h-32 overflow-visible"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              <linearGradient id="routeGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#10b981" stopOpacity="0.25" />
                <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
              </linearGradient>
            </defs>

            {/* Baseline Reference Lines */}
            <line x1="0" y1="110" x2="500" y2="110" stroke="#71717a" strokeWidth="1" strokeDasharray="4 4" strokeOpacity="0.2" />
            <line x1="0" y1="60" x2="500" y2="60" stroke="#71717a" strokeWidth="1" strokeDasharray="4 4" strokeOpacity="0.1" />

            {/* Gradient Fill Under Curve */}
            <path
              d="M 10 110 L 10 95 C 60 92, 100 85, 150 78 C 200 70, 240 50, 290 52 C 340 55, 380 90, 440 85 L 490 80 L 490 110 Z"
              fill="url(#routeGradient)"
            />

            {/* Elevation Profile Line */}
            <path
              d="M 10 95 C 60 92, 100 85, 150 78 C 200 70, 240 50, 290 52 C 340 55, 380 90, 440 85 L 490 80"
              stroke="#10b981"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* Waypoint 1: Nantes */}
            <circle cx="10" cy="95" r="4" fill="#10b981" />
            <text x="10" y="125" fill="#a1a1aa" fontSize="9" fontFamily="monospace" textAnchor="start">
              Nantes (0km)
            </text>

            {/* Waypoint 2: Estuary Sector */}
            <line x1="290" y1="52" x2="290" y2="110" stroke="#f59e0b" strokeWidth="1" strokeDasharray="2 2" strokeOpacity="0.5" />
            <circle cx="290" cy="52" r="4" fill="#f59e0b" />
            <text x="290" y="40" fill="#f59e0b" fontSize="9" fontFamily="monospace" textAnchor="middle" fontWeight="bold">
              Estuary Sector (Wind Zone)
            </text>

            {/* Waypoint 3: Target Gate */}
            <circle cx="490" cy="80" r="4" fill="#06b6d4" />
            <text x="490" y="125" fill="#a1a1aa" fontSize="9" fontFamily="monospace" textAnchor="end">
              {gateName || 'Gate 17'} ({distanceKm}km)
            </text>
          </svg>
        </div>

        {/* Legend */}
        <div className="flex items-center justify-between text-[11px] font-mono pt-2 border-t border-slate-100 dark:border-zinc-800/80 text-slate-500 dark:text-zinc-400">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>Corridor A: Low Rolling Resistance</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-500" />
            <span>Bridge Crossing: Aero Tuck</span>
          </div>
        </div>
      </div>
    </Card>
  );
};
