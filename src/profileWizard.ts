import type {Profile} from './types';

export const PROFILE_QUESTION_COUNT = 11;

export function canAdvanceProfileQuestion(profile: Profile, index: number): boolean {
  switch (index) {
    case 0: return Boolean(profile.stage.trim());
    case 1: return Boolean(profile.goal.trim());
    case 2: return Boolean(profile.occupation.trim());
    case 3: return Boolean(profile.education.trim());
    case 10: return Boolean(profile.region.trim());
    default: return index >= 4 && index < PROFILE_QUESTION_COUNT;
  }
}
