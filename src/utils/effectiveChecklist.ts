import { ChecklistItem, generateTripChecklist, TripProfile } from '../types/trip';
import { RiderBikeSpecs } from '../types/specs';
import { getArchetypeFromTag } from './archetypeChips';
import { getActiveBike } from './specsStorage';

/**
 * The checklist exactly as the "Before you leave" card shows it: freshly generated for the
 * trip's archetype / weather / bike, with a bike-specific tyre-repair item swapped in, and
 * the rider's saved ticks carried over by id.
 *
 * Shared by the checklist card and the Ride Readiness score so both always count the same items.
 */
export function buildEffectiveChecklist(
  trip: TripProfile,
  riderSpecs: RiderBikeSpecs,
  lang: 'en' | 'fr'
): ChecklistItem[] {
  const isFr = lang === 'fr';
  const activeBike = getActiveBike(riderSpecs);
  const isTubeless = Boolean(activeBike?.isTubeless);
  const effectiveMode = getArchetypeFromTag(trip.tag, trip.name);
  const effectiveTag = effectiveMode === 'COMMUTE' ? 'VÉLOTAF' : effectiveMode;
  const totalDays = trip.stages?.length || 1;

  const fresh = generateTripChecklist(effectiveTag, trip.route?.distanceKm, trip.weather, {
    lang,
    customChips: trip.customChips,
    totalDays,
    isTubeless,
    carbTargetGPerHr: riderSpecs.carbTargetGPerHr,
    nutritionPreference: riderSpecs.nutritionPreference,
    bidonSizeMl: riderSpecs.bidonSizeMl,
    frameBottleSlots: riderSpecs.frameBottleSlots,
  });

  const tireSetupItem: ChecklistItem = {
    id: isTubeless ? 'tire-setup-tubeless' : 'tire-setup-tube',
    label: isTubeless
      ? isFr
        ? `Kit mèches Tubeless + cartouche CO2 & niveau préventif (${activeBike.name})`
        : `Tubeless tire plugs (bacon strips) + CO2 & sealant check (${activeBike.name})`
      : isFr
      ? `Chambre à air de secours + démonte-pneus & mini-pompe (${activeBike.name})`
      : `Spare inner tube + tire levers & mini-pump (${activeBike.name})`,
    category: 'gear',
    checked: false,
    critical: true,
  };

  const existing = trip.checklist || [];
  const checkedMap = new Map(existing.map((item) => [item.id, item.checked]));

  const mergedFresh = [
    tireSetupItem,
    ...fresh.filter((i) => i.id !== 'mech-spares' && !i.id.startsWith('tire-setup-')),
  ];

  return mergedFresh.map((item) => ({
    ...item,
    checked: checkedMap.has(item.id) ? Boolean(checkedMap.get(item.id)) : item.checked,
  }));
}
