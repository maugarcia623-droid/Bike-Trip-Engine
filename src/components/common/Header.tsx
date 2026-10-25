import React from 'react';
import { Compass, Sliders, LayoutDashboard, Printer, ChevronDown, Plus, Sun, Moon } from 'lucide-react';
import { TripProfile } from '../../types/trip';
import { useTheme } from '../../context/ThemeContext';

interface HeaderProps {
  currentView: 'home' | 'configurator' | 'dashboard';
  onNavigate: (view: 'home' | 'configurator' | 'dashboard') => void;
  activeTrip: TripProfile;
  allTrips: TripProfile[];
  onSelectTrip: (id: string) => void;
  onCreateNew: () => void;
  onPrint: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentView,
  onNavigate,
  activeTrip,
  allTrips,
  onSelectTrip,
  onCreateNew,
  onPrint,
}) => {
  const { theme, isDark, toggleTheme } = useTheme();

  return (
    <header className="sticky top-0 z-50 bg-white/95 dark:bg-[#09090b]/90 backdrop-blur-md border-b border-slate-200 dark:border-zinc-800 w-full px-6 py-4 transition-colors duration-200 no-print">
      <div className="flex items-center justify-between w-full max-w-7xl mx-auto gap-4">
        {/* Left: Branding & Mission Identity */}
        <div className="flex items-center gap-4">
          <div 
            onClick={() => onNavigate('home')}
            className="flex items-center gap-3 cursor-pointer group select-none"
          >
            <div className="w-9 h-9 rounded-lg bg-slate-100 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 flex items-center justify-center text-emerald-600 dark:text-emerald-400 group-hover:border-emerald-500/50 transition-all shadow-sm">
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="18.5" cy="17.5" r="3.5"/>
                <circle cx="5.5" cy="17.5" r="3.5"/>
                <circle cx="15" cy="5" r="1"/>
                <path d="M12 17.5V14l-3-3 4-3 2 3h2"/>
              </svg>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold tracking-tight text-slate-900 dark:text-white text-base">
                  BIKE TRIP ENGINE
                </span>
                <span className="text-[10px] font-mono uppercase bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 px-1.5 py-0.5 rounded font-semibold">
                  v2.6
                </span>
              </div>
              <p className="text-[11px] font-mono text-slate-500 dark:text-zinc-400 hidden sm:block">
                AERO PHYSICS &middot; REVERSE TIMELINE &middot; REAL FOOD
              </p>
            </div>
          </div>
        </div>

        {/* Center: View Navigation Pills */}
        <nav className="flex items-center bg-slate-100 dark:bg-zinc-900/90 border border-slate-200 dark:border-zinc-800 rounded-lg p-1 text-xs font-medium">
          <button
            onClick={() => onNavigate('home')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-all ${
              currentView === 'home'
                ? 'bg-white dark:bg-zinc-800 text-slate-900 dark:text-white shadow-sm font-semibold'
                : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200 hover:bg-slate-200/60 dark:hover:bg-zinc-800/40'
            }`}
          >
            <Compass className="w-3.5 h-3.5 text-slate-500 dark:text-zinc-400" />
            <span className="hidden sm:inline">Home</span>
          </button>

          <button
            onClick={() => onNavigate('configurator')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-all ${
              currentView === 'configurator'
                ? 'bg-white dark:bg-zinc-800 text-slate-900 dark:text-white shadow-sm font-semibold'
                : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200 hover:bg-slate-200/60 dark:hover:bg-zinc-800/40'
            }`}
          >
            <Sliders className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
            <span className="hidden sm:inline">Configurator</span>
          </button>

          <button
            onClick={() => onNavigate('dashboard')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-all ${
              currentView === 'dashboard'
                ? 'bg-white dark:bg-zinc-800 text-slate-900 dark:text-white shadow-sm font-semibold'
                : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200 hover:bg-slate-200/60 dark:hover:bg-zinc-800/40'
            }`}
          >
            <LayoutDashboard className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>Flight Deck</span>
          </button>
        </nav>

        {/* Right: Trip Selector, Actions & Theme Toggle */}
        <div className="flex items-center gap-2.5 sm:gap-4">
          {/* Trip Selector Dropdown */}
          <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs font-mono shadow-xs">
            <span className="text-slate-500 dark:text-zinc-400 text-[10px] uppercase font-bold hidden md:inline">
              Trip:
            </span>
            <div className="relative">
              <select
                value={activeTrip.id}
                onChange={(e) => onSelectTrip(e.target.value)}
                className="appearance-none bg-transparent text-emerald-600 dark:text-emerald-400 font-semibold cursor-pointer pr-5 focus:outline-none text-xs font-mono w-auto"
              >
                {allTrips.map((t) => (
                  <option key={t.id} value={t.id} className="bg-white dark:bg-zinc-900 text-slate-900 dark:text-zinc-100">
                    {t.name}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-emerald-600/70 dark:text-emerald-400/70 absolute right-0 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          {/* New Trip Button */}
          <button
            onClick={onCreateNew}
            title="Create New Trip"
            className="p-2 text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 hover:bg-slate-200/60 dark:hover:bg-zinc-800/50 rounded-lg transition-colors flex items-center justify-center"
          >
            <Plus className="w-4 h-4" />
          </button>

          {/* Print Button */}
          <button
            onClick={onPrint}
            title="Export / Print Flight Sheet (A4)"
            className="hidden lg:flex items-center gap-1.5 px-3 py-2 text-xs font-mono text-slate-700 dark:text-zinc-300 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 hover:bg-slate-200/60 dark:hover:bg-zinc-800/50 rounded-lg transition-colors"
          >
            <Printer className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
            <span>Print</span>
          </button>

          {/* Sleek Theme Toggle Button */}
          <button
            type="button"
            onClick={toggleTheme}
            aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
            title={`Switch to ${isDark ? 'Light' : 'Dark'} mode`}
            className="p-2 rounded-lg border border-slate-200 dark:border-zinc-800 hover:bg-slate-200/60 dark:hover:bg-zinc-800/50 transition-colors flex items-center justify-center text-slate-700 dark:text-zinc-300 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-zinc-900 cursor-pointer shadow-xs"
          >
            {isDark ? (
              <Sun className="w-4 h-4 text-amber-400 transition-transform hover:rotate-45" />
            ) : (
              <Moon className="w-4 h-4 text-slate-700 transition-transform hover:-rotate-12" />
            )}
          </button>
        </div>
      </div>
    </header>
  );
};
