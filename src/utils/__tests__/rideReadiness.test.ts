import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { computeRideReadiness, getReadinessLevel, RideReadinessInput } from '../rideReadiness';

function makeInput(overrides: Partial<{ [K in keyof RideReadinessInput]: Partial<RideReadinessInput[K]> }> = {}): RideReadinessInput {
  const base: RideReadinessInput = {
    lang: 'en',
    weather: { rainRiskPct: 5, baseWindKmH: 8, gustKmH: 14, headwindKmH: 0, feelsLikeC: 17 },
    bike: { name: 'Road', category: 'road', tireWidthMm: 28, isTubeless: true },
    terrain: { hasSurfaceData: true, gravelPct: 0, singletrackPct: 0 },
    effort: { ftpPercent: 65, movingHours: 1.5, powerZone: 'Z2', riderLevel: 'regular' },
    checklist: { total: 10, checked: 10, criticalTotal: 4, criticalChecked: 4 },
    light: { nightPercent: 0, twilightPercent: 0 },
    route: { worstSeverity: 'clear', issueCount: 0 },
    goStatus: 'GO',
  };
  const out = { ...base } as RideReadinessInput;
  for (const key of Object.keys(overrides) as (keyof RideReadinessInput)[]) {
    const v = overrides[key];
    (out as any)[key] = typeof v === 'object' && v !== null ? { ...(base as any)[key], ...v } : v;
  }
  return out;
}

describe('rideReadiness.ts', () => {
  it('maps scores to the three bands', () => {
    assert.equal(getReadinessLevel(0), 'needs-change');
    assert.equal(getReadinessLevel(44), 'needs-change');
    assert.equal(getReadinessLevel(45), 'worth-tweak');
    assert.equal(getReadinessLevel(74), 'worth-tweak');
    assert.equal(getReadinessLevel(75), 'good-to-go');
    assert.equal(getReadinessLevel(100), 'good-to-go');
  });

  it('scores a perfect setup at 100 / good to go with no lift suggestion', () => {
    const r = computeRideReadiness(makeInput());
    assert.equal(r.score, 100);
    assert.equal(r.level, 'good-to-go');
    assert.equal(r.topLift, undefined);
  });

  it('flags a road bike on heavy gravel and suggests wider tyres', () => {
    const r = computeRideReadiness(makeInput({ terrain: { gravelPct: 55, singletrackPct: 5 } }));
    const terrain = r.factors.find((f) => f.id === 'terrain')!;
    assert.ok(terrain.score < 15, `terrain ${terrain.score}`);
    assert.notEqual(r.level, 'good-to-go');
    assert.equal(r.topLift?.factorId, 'terrain');
  });

  it('a gravel bike with 42 mm tyres is happy on the same route', () => {
    const r = computeRideReadiness(
      makeInput({
        bike: { category: 'gravel', tireWidthMm: 42, isTubeless: true },
        terrain: { gravelPct: 55, singletrackPct: 5 },
      })
    );
    assert.ok(r.factors.find((f) => f.id === 'terrain')!.score >= 90);
    assert.equal(r.level, 'good-to-go');
  });

  it('unticked essential checklist items cost more than optional ones', () => {
    const critMissing = computeRideReadiness(makeInput({ checklist: { checked: 7, criticalChecked: 1 } }));
    const optMissing = computeRideReadiness(makeInput({ checklist: { checked: 7, criticalChecked: 4 } }));
    assert.ok(critMissing.score < optMissing.score);
    assert.match(critMissing.topLift!.tip, /essential/);
  });

  it('ignores the checklist factor when no checklist exists', () => {
    const r = computeRideReadiness(makeInput({ checklist: { total: 0, checked: 0, criticalTotal: 0, criticalChecked: 0 } }));
    const c = r.factors.find((f) => f.id === 'checklist')!;
    assert.equal(c.applicable, false);
    assert.equal(c.weight, 0);
    assert.equal(r.score, 100);
  });

  it('a long hard effort pulls the score down', () => {
    const r = computeRideReadiness(makeInput({ effort: { ftpPercent: 92, movingHours: 4 } }));
    assert.ok(r.factors.find((f) => f.id === 'effort')!.score < 35);
    assert.notEqual(r.level, 'good-to-go');
  });

  it('storm conditions + NO-GO land in "Needs a change"', () => {
    const r = computeRideReadiness(
      makeInput({
        weather: { rainRiskPct: 90, baseWindKmH: 34, gustKmH: 58, headwindKmH: 30, feelsLikeC: 4 },
        goStatus: 'NO-GO',
      })
    );
    assert.equal(r.level, 'needs-change');
    assert.ok(r.score <= 40);
  });

  it('weakest-link drag pulls down the score proportionally without snapping to a flat cap', () => {
    const r = computeRideReadiness(makeInput({ route: { worstSeverity: 'critical', issueCount: 3 } }));
    // Route is only 10% weight, but a critical blocker (score 18) drags the total down proportionally.
    assert.ok(r.score < 85 && r.score > 74, `score ${r.score}`);
    assert.ok(r.capReason);
  });

  it('localises labels in French', () => {
    const r = computeRideReadiness(makeInput({ lang: 'fr' } as any));
    assert.equal(r.label, 'Prêt à rouler');
  });
});
