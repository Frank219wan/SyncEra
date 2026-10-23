import type {Profile} from './types';

export type PersonalField = 'interests' | 'vision' | 'workStyle';
export const personalFields: PersonalField[] = ['interests','vision','workStyle'];

export function parseGoalTags(text: string): string[] {
  return [...new Set(text.split(/[,;，；、\n]/).map(tag=>tag.trim()).filter(Boolean))];
}

export function hasPersonalValue(profile: Profile, field: PersonalField): boolean {
  if(field==='interests')return Boolean(profile.interests.trim());
  if(field==='vision')return Boolean(profile.vision.trim()||profile.goalTags?.length);
  return Boolean(profile.preferences.trim()||Object.values(profile.workStyle??{}).some(Boolean));
}

export function canConfirmPersonalProfile(profile: Profile): boolean {
  return personalFields.every(field=>!hasPersonalValue(profile,field)||profile.personalConfirmed?.[field]===true);
}

export function editPersonalField(profile: Profile, field: PersonalField, changes: Partial<Profile>): Profile {
  return {...profile,...changes,sample:false,
    personalSources:{...profile.personalSources,[field]:'self_reported'},
    personalConfirmed:{...profile.personalConfirmed,[field]:false}};
}

export function unconfirmedPersonalProfile(profile: Profile): Profile {
  return {...profile,personalConfirmed:{interests:false,vision:false,workStyle:false}};
}
