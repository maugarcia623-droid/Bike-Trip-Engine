import { FreeWebToolId, getToolPath, parseToolFromLocation } from './toolCatalog';

export type AppView = 'home' | 'configurator' | 'dashboard' | 'tools';
export type HomeMobileView = 'home' | 'trips';

export interface ParsedAppRoute {
  view: AppView;
  homeMobileView: HomeMobileView;
  toolId: FreeWebToolId;
  isCanonicalPath: boolean;
}

export interface AppNavigationHistoryState {
  cadenceNav: true;
  view: AppView;
  homeMobileView: HomeMobileView;
  toolId: FreeWebToolId;
}

type LocationLike = Pick<Location, 'pathname' | 'search' | 'hash'>;

/**
 * Returns true if the URL carries a special one-shot entrypoint (shared plan link,
 * PWA share target payload, or OAuth callback) that must be preserved until consumed.
 */
export function hasSpecialEntryLocation(loc: LocationLike): boolean {
  const path = loc.pathname || '';
  const search = loc.search || '';
  const hash = loc.hash || '';

  if (/^\/p\/[a-z0-9]{6,16}\/?$/i.test(path)) return true;
  if (/(?:^|[?&])(plan|p|shared_file|shared_url|shared_text)=/i.test(search)) return true;
  if (/(?:^|[#&])(plan|p)=/i.test(hash)) return true;
  if (/(strava|headunit|wahoo|hammerhead|garmin)/i.test(search)) return true;
  return false;
}

function normalizePathname(rawPath: string): string {
  const trimmed = (rawPath || '/').trim();
  if (!trimmed || trimmed === '/') return '/';
  const collapsed = trimmed.replace(/\/+$/, '');
  return collapsed.startsWith('/') ? collapsed : `/${collapsed}`;
}

/**
 * Parses browser location into Cadence's unified view state while maintaining
 * backwards compatibility with legacy hash (#configurator, #home) and query (?view=, ?tool=) links.
 */
export function parseAppLocation(loc: LocationLike): ParsedAppRoute {
  const toolParsed = parseToolFromLocation(loc);
  if (toolParsed.isToolsRoute) {
    return {
      view: 'tools',
      homeMobileView: 'home',
      toolId: toolParsed.toolId,
      isCanonicalPath: true,
    };
  }

  const pathname = normalizePathname(loc.pathname || '/').toLowerCase();
  const search = loc.search || '';
  const hash = (loc.hash || '').toLowerCase();

  if (pathname === '/trips') {
    return {
      view: 'home',
      homeMobileView: 'trips',
      toolId: 'hub',
      isCanonicalPath: true,
    };
  }

  if (pathname === '/setup' || pathname === '/configurator') {
    return {
      view: 'configurator',
      homeMobileView: 'home',
      toolId: 'hub',
      isCanonicalPath: pathname === '/setup',
    };
  }

  if (pathname === '/plan' || pathname === '/dashboard') {
    return {
      view: 'dashboard',
      homeMobileView: 'home',
      toolId: 'hub',
      isCanonicalPath: pathname === '/plan',
    };
  }

  // Legacy hash & query support
  if (hash === '#configurator' || hash === '#setup' || /[?&]view=(configurator|setup)(?:&|$)/i.test(search)) {
    return {
      view: 'configurator',
      homeMobileView: 'home',
      toolId: 'hub',
      isCanonicalPath: false,
    };
  }

  if (hash === '#dashboard' || hash === '#plan' || /[?&]view=(dashboard|plan)(?:&|$)/i.test(search)) {
    return {
      view: 'dashboard',
      homeMobileView: 'home',
      toolId: 'hub',
      isCanonicalPath: false,
    };
  }

  if (hash === '#trips' || /[?&]view=trips(?:&|$)/i.test(search)) {
    return {
      view: 'home',
      homeMobileView: 'trips',
      toolId: 'hub',
      isCanonicalPath: false,
    };
  }

  return {
    view: 'home',
    homeMobileView: 'home',
    toolId: 'hub',
    isCanonicalPath: pathname === '/',
  };
}

/**
 * Serializes Cadence view state to its canonical SPA pathname.
 */
export function getAppPath(
  view: AppView,
  options?: {
    homeMobileView?: HomeMobileView;
    toolId?: FreeWebToolId;
  }
): string {
  if (view === 'tools') {
    return getToolPath(options?.toolId ?? 'hub');
  }
  if (view === 'configurator') {
    return '/setup';
  }
  if (view === 'dashboard') {
    return '/plan';
  }
  if (options?.homeMobileView === 'trips') {
    return '/trips';
  }
  return '/';
}

/**
 * Builds a structured History API state payload for popstate restoration.
 */
export function buildNavigationHistoryState(
  view: AppView,
  homeMobileView: HomeMobileView = 'home',
  toolId: FreeWebToolId = 'hub'
): AppNavigationHistoryState {
  return {
    cadenceNav: true,
    view,
    homeMobileView: view === 'home' ? homeMobileView : 'home',
    toolId: view === 'tools' ? toolId : 'hub',
  };
}

/**
 * Resolves the navigation target when the browser fires a popstate event,
 * preferring canonical location parsing while honoring saved history state if present.
 */
export function resolvePopStateRoute(
  loc: LocationLike,
  historyState?: unknown
): ParsedAppRoute {
  const fromLoc = parseAppLocation(loc);
  if (fromLoc.isCanonicalPath && (fromLoc.view !== 'home' || fromLoc.homeMobileView !== 'home')) {
    return fromLoc;
  }
  if (
    historyState &&
    typeof historyState === 'object' &&
    (historyState as Partial<AppNavigationHistoryState>).cadenceNav === true
  ) {
    const st = historyState as AppNavigationHistoryState;
    return {
      view: st.view,
      homeMobileView: st.view === 'home' ? st.homeMobileView : 'home',
      toolId: st.view === 'tools' ? st.toolId : 'hub',
      isCanonicalPath: true,
    };
  }
  return fromLoc;
}
