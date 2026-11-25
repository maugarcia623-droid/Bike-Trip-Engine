import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildNavigationHistoryState,
  getAppPath,
  hasSpecialEntryLocation,
  parseAppLocation,
  resolvePopStateRoute,
} from '../appNavigation';

test('parseAppLocation resolves canonical SPA routes', () => {
  assert.deepEqual(parseAppLocation({ pathname: '/', search: '', hash: '' }), {
    view: 'home',
    homeMobileView: 'home',
    toolId: 'hub',
    isCanonicalPath: true,
  });

  assert.deepEqual(parseAppLocation({ pathname: '/trips', search: '', hash: '' }), {
    view: 'home',
    homeMobileView: 'trips',
    toolId: 'hub',
    isCanonicalPath: true,
  });

  assert.deepEqual(parseAppLocation({ pathname: '/trips/', search: '', hash: '' }), {
    view: 'home',
    homeMobileView: 'trips',
    toolId: 'hub',
    isCanonicalPath: true,
  });

  assert.deepEqual(parseAppLocation({ pathname: '/plan', search: '', hash: '' }), {
    view: 'dashboard',
    homeMobileView: 'home',
    toolId: 'hub',
    isCanonicalPath: true,
  });

  assert.deepEqual(parseAppLocation({ pathname: '/setup', search: '', hash: '' }), {
    view: 'configurator',
    homeMobileView: 'home',
    toolId: 'hub',
    isCanonicalPath: true,
  });

  assert.deepEqual(parseAppLocation({ pathname: '/tools', search: '', hash: '' }), {
    view: 'tools',
    homeMobileView: 'home',
    toolId: 'hub',
    isCanonicalPath: true,
  });

  assert.deepEqual(parseAppLocation({ pathname: '/tools/fuel-plan', search: '', hash: '' }), {
    view: 'tools',
    homeMobileView: 'home',
    toolId: 'fuel-plan',
    isCanonicalPath: true,
  });
});

test('parseAppLocation preserves legacy hash and query entrypoints', () => {
  const fromHash = parseAppLocation({ pathname: '/', search: '', hash: '#configurator' });
  assert.equal(fromHash.view, 'configurator');
  assert.equal(fromHash.isCanonicalPath, false);

  const fromQuery = parseAppLocation({ pathname: '/', search: '?view=dashboard', hash: '' });
  assert.equal(fromQuery.view, 'dashboard');
  assert.equal(fromQuery.isCanonicalPath, false);

  const fromLegacyTool = parseAppLocation({ pathname: '/', search: '?tool=fuel-plan', hash: '' });
  assert.equal(fromLegacyTool.view, 'tools');
  assert.equal(fromLegacyTool.toolId, 'fuel-plan');
});

test('getAppPath round-trips cleanly through parseAppLocation', () => {
  const cases = [
    { view: 'home' as const, homeMobileView: 'home' as const, expected: '/' },
    { view: 'home' as const, homeMobileView: 'trips' as const, expected: '/trips' },
    { view: 'dashboard' as const, homeMobileView: 'home' as const, expected: '/plan' },
    { view: 'configurator' as const, homeMobileView: 'home' as const, expected: '/setup' },
    { view: 'tools' as const, toolId: 'hub' as const, expected: '/tools' },
    { view: 'tools' as const, toolId: 'tyre-pressure' as const, expected: '/tools/tyre-pressure' },
  ];

  for (const c of cases) {
    const path = getAppPath(c.view, { homeMobileView: c.homeMobileView, toolId: c.toolId });
    assert.equal(path, c.expected);
    const parsed = parseAppLocation({ pathname: path, search: '', hash: '' });
    assert.equal(parsed.view, c.view);
    if (c.view === 'home') {
      assert.equal(parsed.homeMobileView, c.homeMobileView);
    }
    if (c.view === 'tools') {
      assert.equal(parsed.toolId, c.toolId);
    }
  }
});

test('hasSpecialEntryLocation detects shared plans, PWA share target, and OAuth redirects', () => {
  assert.equal(hasSpecialEntryLocation({ pathname: '/p/a1b2c3d4', search: '', hash: '' }), true);
  assert.equal(hasSpecialEntryLocation({ pathname: '/', search: '?plan=xyz', hash: '' }), true);
  assert.equal(hasSpecialEntryLocation({ pathname: '/', search: '', hash: '#plan=xyz' }), true);
  assert.equal(hasSpecialEntryLocation({ pathname: '/', search: '?shared_file=1', hash: '' }), true);
  assert.equal(hasSpecialEntryLocation({ pathname: '/', search: '?strava_connected=1', hash: '' }), true);
  assert.equal(hasSpecialEntryLocation({ pathname: '/', search: '?garmin=ok', hash: '' }), true);
  assert.equal(hasSpecialEntryLocation({ pathname: '/plan', search: '', hash: '' }), false);
  assert.equal(hasSpecialEntryLocation({ pathname: '/tools/fuel-plan', search: '', hash: '' }), false);
});

test('resolvePopStateRoute handles canonical URLs and history state fallback', () => {
  const fromPath = resolvePopStateRoute({ pathname: '/setup', search: '', hash: '' }, null);
  assert.equal(fromPath.view, 'configurator');

  const st = buildNavigationHistoryState('home', 'trips');
  const fromState = resolvePopStateRoute({ pathname: '/', search: '', hash: '' }, st);
  assert.equal(fromState.view, 'home');
  assert.equal(fromState.homeMobileView, 'trips');
});
