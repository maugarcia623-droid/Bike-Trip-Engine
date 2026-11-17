const IDB_NAME = 'cadence_offline_v1';
const IDB_VERSION = 2;
export const STORE_PACKS = 'packs';
export const STORE_OSM_SURFACE = 'osm_surface';
export const STORE_SECTOR_WEATHER = 'sector_weather';
export const STORE_OVERPASS_AMENITIES = 'overpass_amenities';

interface StoredRecord<T> {
  key: string;
  value: T;
  updatedAt: string;
}

function hasIndexedDb(): boolean {
  return typeof indexedDB !== 'undefined';
}

let dbPromise: Promise<IDBDatabase | null> | null = null;

function openOfflineDb(): Promise<IDBDatabase | null> {
  if (!hasIndexedDb()) return Promise.resolve(null);
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve) => {
    try {
      const req = indexedDB.open(IDB_NAME, IDB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE_PACKS)) {
          db.createObjectStore(STORE_PACKS, { keyPath: 'tripId' });
        }
        if (!db.objectStoreNames.contains(STORE_OSM_SURFACE)) {
          db.createObjectStore(STORE_OSM_SURFACE, { keyPath: 'key' });
        }
        if (!db.objectStoreNames.contains(STORE_SECTOR_WEATHER)) {
          db.createObjectStore(STORE_SECTOR_WEATHER, { keyPath: 'key' });
        }
        if (!db.objectStoreNames.contains(STORE_OVERPASS_AMENITIES)) {
          db.createObjectStore(STORE_OVERPASS_AMENITIES, { keyPath: 'key' });
        }
      };
      req.onsuccess = () => {
        const db = req.result;
        db.onversionchange = () => {
          db.close();
          dbPromise = null;
        };
        resolve(db);
      };
      req.onerror = () => {
        dbPromise = null;
        resolve(null);
      };
    } catch {
      dbPromise = null;
      resolve(null);
    }
  });
  return dbPromise;
}

export async function idbGet<T>(storeName: string, key: string): Promise<T | null> {
  const db = await openOfflineDb();
  if (!db) return null;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(storeName, 'readonly');
      const store = tx.objectStore(storeName);
      const req = store.get(key);
      req.onsuccess = () => resolve((req.result as T | undefined) ?? null);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

export async function idbPut<T>(storeName: string, value: T): Promise<boolean> {
  const db = await openOfflineDb();
  if (!db) return false;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      const req = store.put(value);
      req.onsuccess = () => resolve(true);
      req.onerror = () => resolve(false);
    } catch {
      resolve(false);
    }
  });
}

export async function idbDelete(storeName: string, key: string): Promise<void> {
  const db = await openOfflineDb();
  if (!db) return;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      const req = store.delete(key);
      req.onsuccess = () => resolve();
      req.onerror = () => resolve();
    } catch {
      resolve();
    }
  });
}

export async function saveOsmSurfaceToIdb<T>(routeKey: string, data: T): Promise<void> {
  const rec: StoredRecord<T> = {
    key: routeKey,
    value: data,
    updatedAt: new Date().toISOString(),
  };
  await idbPut(STORE_OSM_SURFACE, rec);
}

export async function loadOsmSurfaceFromIdb<T>(routeKey: string): Promise<T | null> {
  const rec = await idbGet<StoredRecord<T>>(STORE_OSM_SURFACE, routeKey);
  return rec?.value ?? null;
}

export async function saveSectorWeatherToIdb<T>(cacheKey: string, analysis: T): Promise<void> {
  const rec: StoredRecord<T> = {
    key: cacheKey,
    value: analysis,
    updatedAt: new Date().toISOString(),
  };
  await idbPut(STORE_SECTOR_WEATHER, rec);
}

export async function loadSectorWeatherFromIdb<T>(cacheKey: string): Promise<T | null> {
  const rec = await idbGet<StoredRecord<T>>(STORE_SECTOR_WEATHER, cacheKey);
  return rec?.value ?? null;
}

export async function saveAmenitiesToIdb<T>(routeKey: string, amenities: T): Promise<void> {
  const rec: StoredRecord<T> = {
    key: routeKey,
    value: amenities,
    updatedAt: new Date().toISOString(),
  };
  await idbPut(STORE_OVERPASS_AMENITIES, rec);
}

export async function loadAmenitiesFromIdb<T>(routeKey: string): Promise<T | null> {
  const rec = await idbGet<StoredRecord<T>>(STORE_OVERPASS_AMENITIES, routeKey);
  return rec?.value ?? null;
}
