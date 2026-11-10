import { DietaryFilter } from '../types/specs';

/** Legacy chip defaults that older saved trips still carry; treated as "no custom choice". */
const LEGACY_RATION_DEFAULTS = ['double espresso & almond pastry'];

export function isLegacyRationDefault(ration?: string): boolean {
  return !ration || LEGACY_RATION_DEFAULTS.includes(ration.trim().toLowerCase());
}

/**
 * Café-stop snack suggestion that respects every active dietary filter (Phase 4 §4).
 * Picks the most restrictive compliant option instead of branching on single filters.
 */
export function getCafeSnackSuggestion(filters: DietaryFilter[], lang: string): string {
  const isFr = lang === 'fr';
  const has = (f: DietaryFilter) => filters.includes(f);
  const vegan = has('vegan');
  const glutenFree = has('gluten-free') || has('low-fodmap');
  const dairyFree = has('dairy-free') || vegan;
  const nutFree = has('nut-free');

  if (glutenFree) {
    // Rice- or fruit-based options cover GF, low-FODMAP, vegan, dairy-free and nut-free together
    return isFr
      ? 'Un expresso et une galette de riz ou une banane'
      : 'An espresso and a rice cake or a banana';
  }
  if (dairyFree) {
    return isFr
      ? nutFree
        ? 'Un expresso et un pain au levain avec confiture'
        : 'Un expresso et une viennoiserie végétale'
      : nutFree
      ? 'An espresso and sourdough toast with jam'
      : 'An espresso and a plant-based pastry';
  }
  if (nutFree) {
    return isFr
      ? 'Un expresso et un chausson aux pommes'
      : 'An espresso and an apple turnover';
  }
  return isFr
    ? 'Un expresso et une viennoiserie de votre choix'
    : 'An espresso and a pastry of your choice';
}
