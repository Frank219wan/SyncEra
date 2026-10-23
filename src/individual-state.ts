import type {AppState} from './types.ts';
import {emptyProfile} from './data.ts';

export const STORAGE_KEY = 'futureproof-v1';

export function resetIndividualState(current: AppState): AppState {
  return {
    ...current,
    profile: {...structuredClone(emptyProfile), id: ''},
    scenario: 'moderate', selectedRole: '', results: null, snapshotId: '',
    serviceMeta: null, trendPackage: null, plan: null, draft: null, archivedPlans: [],
  };
}

export function persistAppState(state: AppState): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({schema: 1, state}));
}
