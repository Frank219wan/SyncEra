export type Locale = 'en' | 'zh' | 'ms';
export type Copy = readonly [string, string, string];
export type Scenario = 'moderate' | 'fast';
export type Origin = 'synthetic_fixture' | 'public_observed' | 'computed' | 'scenario_model' | 'llm_generated';
export interface Skill { id: string; level: string; source: 'manual' | 'cv_extracted' | 'inferred'; confirmed: boolean }
export interface Profile {
  id: string; stage: string; goal: string; occupation: string; education: string; experience: string;
  skills: Skill[]; interests: string; vision: string; preferences: string; mbti: string;
  region: string; synthetic: boolean; sample: boolean; revision?: number;
}
export interface Constraints { hours: number; budget: number; language: Locale; start: string; deadline: string; baseline: string }
export interface Task { id: string; skill: string; title: Copy; hours: number; done: boolean; completedAt?: string; completedOffset?: number; evidence?: string; week: number }
export interface Plan {
  id: string; roleId: string; version: number; adopted: boolean; constraints: Constraints; tasks: Task[];
  earned: number; revisionPending: boolean; offset: number; history: { version: number; offset: number; at: string }[];
}
export interface Person {
  id: string; department: string; role: string; skills: string[]; known: boolean; traits: string; aspiration: string;
  hours: number; courses: string; interests: string; notes: string; year: string; target: string;
}
export interface Organization {
  name: string; sector: string; needs: string[]; budget: number; weeks: number;
  people: Person[]; selected: string[]; revision: number; analyzedRevision: number;
  training: Record<string, string[]>;
}
export interface Role {
  id: string; name: Copy; domain: string; description: Copy; skills: string[];
  scores: Record<Scenario, number>; signal: number; trend: 'rising' | 'emerging' | 'stable'; sdgs: number[];
}
export interface Recommendation {
  roleId: string; rank: number; matchScore: number | null; origin: Origin;
  strengths?: string[];
  skillGaps?: Array<{ skillId: string; name: string; currentLevel: number | null; targetLevel: number; importance: string }>;
}
export interface ServiceMeta {
  requestId: string; snapshotId: string | null; generatedAt: string | null;
  dataLabel: string; isMock: boolean; modelVersion: string | null;
}
export interface TrendPackage { snapshotId: string; snapshotAt: string | null; region: string; origin: Origin; roles: Role[]; meta: ServiceMeta }
export interface AppState {
  locale: Locale; profile: Profile; scenario: Scenario; selectedRole: string; results: Recommendation[] | null;
  snapshotId: string; serviceMeta?: ServiceMeta | null; plan: Plan | null; draft?: Plan | null; archivedPlans?: Plan[]; hr: Organization; tvet: Organization;
}
