const fs = require('fs');
const file = 'src/components/configurator/ConfiguratorScreen.tsx';
let code = fs.readFileSync(file, 'utf8');

// 1. Ensure icons are imported
const requiredIcons = ['Backpack', 'Briefcase', 'Compass', 'Zap'];
code = code.replace(
  /import\s*\{([^}]+)\}\s*from\s*["\x27]lucide-react["\x27]/,
  (m, inner) => {
    const items = inner.split(',').map(s => s.trim()).filter(Boolean);
    requiredIcons.forEach(icon => {
      if (!items.includes(icon)) items.push(icon);
    });
    return `import { ${items.join(', ')} } from "lucide-react"`;
  }
);

if (!code.includes('generateTripChecklist')) {
  code = `import { generateTripChecklist } from "../../types/trip";\n` + code;
}

// 2. Define selector component
const selectorJSX = `
        {/* ── MISSION ARCHETYPE SELECTOR ── */}
        <div className="mb-6">
          <label className="block text-xs font-mono uppercase text-slate-400 dark:text-zinc-500 mb-3 tracking-wider">
            Select Mission Archetype
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { id: "BIKEPACKING", label: "Bikepacking", icon: Backpack, desc: "Multi-day self-supported", color: "text-rose-500 bg-rose-500/10 border-rose-500/30" },
              { id: "SPORT", label: "Sport / Gran Fondo", icon: Zap, desc: "High-intensity pacing", color: "text-amber-500 bg-amber-500/10 border-amber-500/30" },
              { id: "VÉLOTAF", label: "Commute", icon: Briefcase, desc: "Work shift & locker sync", color: "text-cyan-500 bg-cyan-500/10 border-cyan-500/30" },
              { id: "ESCAPADE", label: "Escapade", icon: Compass, desc: "Hotel check-in & touring", color: "text-emerald-500 bg-emerald-500/10 border-emerald-500/30" },
            ].map((m) => {
              const isActive = (trip.tag || "VÉLOTAF").toUpperCase().includes(m.id);
              const Icon = m.icon;
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => {
                    const freshChecklist = generateTripChecklist(m.id, trip.route?.distanceKm, trip.weather);
                    setTrip(prev => ({
                      ...prev,
                      tag: m.id,
                      checklist: freshChecklist
                    }));
                  }}
                  className={\`flex items-start gap-3 p-3.5 rounded-xl border transition-all cursor-pointer text-left \${
                    isActive
                      ? "bg-slate-900 dark:bg-zinc-800/80 border-emerald-500/60 text-white ring-1 ring-emerald-500/30 shadow-xs"
                      : "bg-white dark:bg-[#0e0e11] border-slate-200 dark:border-zinc-800 text-slate-700 dark:text-zinc-300 hover:border-slate-300 dark:hover:border-zinc-700"
                  }\`}
                >
                  <div className={\`p-2 rounded-lg border \${m.color}\`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-mono text-xs font-bold tracking-tight">
                      {m.label}
                    </div>
                    <div className="text-[11px] text-slate-400 dark:text-zinc-400 mt-0.5 leading-snug">
                      {m.desc}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
`;

// 3. Find the metadata card div container
const marker = 'grid grid-cols-1 md:grid-cols-3';
const idx = code.indexOf(marker);
if (idx !== -1) {
  const cardDivStart = code.lastIndexOf('<div', idx);
  code = code.slice(0, cardDivStart) + selectorJSX + '\n' + code.slice(cardDivStart);
  fs.writeFileSync(file, code, 'utf8');
  console.log('✓ Successfully injected selector above metadata card without touching pickers.');
} else {
  console.error('Marker not found.');
  process.exit(1);
}
