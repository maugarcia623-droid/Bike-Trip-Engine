import { useState, useEffect } from 'react';
import { loadRiderBikeSpecs, saveRiderBikeSpecs, getActiveBike } from './specsStorage';
import { RiderBikeSpecs, BikeSpec } from '../types/specs';

export interface UserProfile {
  name: string;
  heightCm?: number;
  weightKg?: number;
  bikeName?: string;
  bikeType?: 'road' | 'gravel' | 'tourer' | 'urban' | string;
  bikeWeightKg?: number;
  isTubeless?: boolean;
  completedAt?: string;
}

export const STORAGE_KEY_USER_PROFILE = 'velotaf_user_profile_v1';
export const STORAGE_KEY_PERSONALISATION_DONE = 'velotaf_personalisation_completed_v1';
export const USER_PROFILE_UPDATED_EVENT = 'velotaf:user_profile_updated';

export function loadUserProfile(): UserProfile | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_USER_PROFILE);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed.name === 'string' && parsed.name.trim().length > 0) {
        return {
          ...parsed,
          name: parsed.name.trim(),
        };
      }
    }
    // Fallback: check if riderName was previously stored in riderBikeSpecs
    const specs = loadRiderBikeSpecs();
    if (specs.riderName && specs.riderName.trim().length > 0) {
      const active = getActiveBike(specs);
      return {
        name: specs.riderName.trim(),
        heightCm: specs.riderHeightCm,
        weightKg: specs.riderWeightKg,
        bikeName: active?.name,
        bikeWeightKg: active?.weightKg,
        isTubeless: active?.isTubeless,
      };
    }
  } catch (e) {
    console.error('Failed to load user profile from localStorage:', e);
  }
  return null;
}

export function saveUserProfile(profile: Partial<UserProfile>): UserProfile {
  const current = loadUserProfile() || { name: '' };
  const trimmedName = profile.name !== undefined ? profile.name.trim() : current.name.trim();

  const updated: UserProfile = {
    ...current,
    ...profile,
    name: trimmedName,
    completedAt: current.completedAt || new Date().toISOString(),
  };

  try {
    localStorage.setItem(STORAGE_KEY_USER_PROFILE, JSON.stringify(updated));
    localStorage.setItem(STORAGE_KEY_PERSONALISATION_DONE, 'true');
  } catch (e) {
    console.error('Failed to save user profile to localStorage:', e);
  }

  // Synchronize into riderBikeSpecs so physics engine & specs modals reflect it immediately
  try {
    const currentSpecs = loadRiderBikeSpecs();
    let bikes = [...currentSpecs.bikes];
    const activeBikeId = currentSpecs.activeBikeId;

    if (updated.bikeName || updated.bikeWeightKg !== undefined || updated.isTubeless !== undefined) {
      const activeIdx = bikes.findIndex((b) => b.id === activeBikeId);
      if (activeIdx >= 0) {
        bikes[activeIdx] = {
          ...bikes[activeIdx],
          name: updated.bikeName || bikes[activeIdx].name,
          weightKg: typeof updated.bikeWeightKg === 'number' && updated.bikeWeightKg > 3 ? updated.bikeWeightKg : bikes[activeIdx].weightKg,
          isTubeless: typeof updated.isTubeless === 'boolean' ? updated.isTubeless : bikes[activeIdx].isTubeless,
        };
      }
    }

    const nextSpecs: RiderBikeSpecs = {
      ...currentSpecs,
      riderName: updated.name || currentSpecs.riderName,
      riderHeightCm:
        typeof updated.heightCm === 'number' && updated.heightCm >= 120 && updated.heightCm <= 240
          ? updated.heightCm
          : currentSpecs.riderHeightCm,
      riderWeightKg:
        typeof updated.weightKg === 'number' && updated.weightKg >= 35 && updated.weightKg <= 200
          ? updated.weightKg
          : currentSpecs.riderWeightKg,
      bikes,
    };
    saveRiderBikeSpecs(nextSpecs);
  } catch (e) {
    console.error('Failed to synchronize user profile into riderBikeSpecs:', e);
  }

  // Dispatch custom window event for reactive UI updates
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(USER_PROFILE_UPDATED_EVENT, { detail: updated }));
  }

  return updated;
}

export function isPersonalisationCompleted(): boolean {
  try {
    if (localStorage.getItem(STORAGE_KEY_PERSONALISATION_DONE) === 'true') {
      return true;
    }
    const profile = loadUserProfile();
    if (profile && profile.name && profile.name.trim().length > 0) {
      return true;
    }
  } catch {
    // Ignore error
  }
  return false;
}

export function useUserProfile() {
  const [userProfile, setUserProfile] = useState<UserProfile | null>(loadUserProfile);

  useEffect(() => {
    const handleUpdate = (e: Event) => {
      const detail = (e as CustomEvent<UserProfile>).detail;
      setUserProfile(detail || loadUserProfile());
    };
    const handleStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY_USER_PROFILE || e.key === STORAGE_KEY_PERSONALISATION_DONE) {
        setUserProfile(loadUserProfile());
      }
    };

    window.addEventListener(USER_PROFILE_UPDATED_EVENT, handleUpdate);
    window.addEventListener('storage', handleStorage);

    return () => {
      window.removeEventListener(USER_PROFILE_UPDATED_EVENT, handleUpdate);
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  return {
    userProfile,
    username: userProfile?.name || '',
    isPersonalised: Boolean(userProfile?.name && userProfile.name.trim().length > 0),
    saveProfile: saveUserProfile,
  };
}
