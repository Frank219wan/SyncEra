export type Locale = 'en' | 'zh' | 'ms';
export type Copy = readonly [string, string, string];
export type Scenario = 'moderate' | 'fast';
export type Origin = 'synthetic_fixture' | 'public_observed' | 'computed' | 'scenario_model' | 'llm_generated';
export interface Skill { id: string; level: string; source: 'manual' | 'cv_extracted' | 'inferred'; confirmed: boolean; confidence?: number; backendSupported?: boolean }
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
  totalEstimatedHours?: number; capacityHours?: number;
  feasibility?: 'feasible' | 'stretch' | 'insufficient_time'; warnings?: string[];
}
export interface Person {
  id: string; department: string; role: string; skills: string[]; known: boolean; traits: string; aspiration: string;
  hours: number; courses: string; interests: string; notes: string; year: string; target: string;
}
export interface Department {
  id: string; name: string; responsibilities: string; currentStatus: string;
  challenges: string; goals: string[]; headcount: number;
  implementationStatus?: 'not_started' | 'in_progress' | 'completed';
}
export interface DepartmentPlanVersion {
  version: number; createdAt: string; organizationGoals: string[]; skills: string[];
  departments: Department[]; budget: number; weeks: number;
}
export interface Organization {
  name: string; sector: string; needs: string[]; budget: number; weeks: number;
  people: Person[]; selected: string[]; revision: number; analyzedRevision: number;
  training: Record<string, string[]>;
  departments?: Department[]; goals?: string[]; planningVersions?: DepartmentPlanVersion[];
}
export interface Role {
  id: string; name: Copy; domain: string; description: Copy; skills: string[];
  scores: Record<Scenario, number>; signal: number; trend: 'rising' | 'emerging' | 'stable' | 'declining' | 'unknown'; sdgs: number[];
  evidenceIds?: string[]; sourceWindow?: { from: string; to: string }; observedMetrics?: Record<string, number | null>;
  signalAvailable?: boolean; signalLabel?: string;
  fieldId?: string; bubbleSize?: number;
}
export interface SkillTrend { id: string; name: string; score: number | null; label: string; change: number | null; evidenceIds: string[]; sourceWindow?: {from:string;to:string} }
export interface Recommendation {
  roleId: string; roleName?: string; rank: number; matchScore: number | null; origin: Origin;
  strengths?: string[];
  skillGaps?: Array<{ skillId: string; name: string; currentLevel: number | null; targetLevel: number; importance: string }>;
  reason?: string; evidenceIds?: string[]; scenarioAssumptions?: string[]; uncertainty?: string;
  scoreBreakdown?: Record<string, number | null>;
  sdgLinks?: Array<{ sdg: number; rationale: string }>;
}
export interface Evidence { evidenceId: string; title: string; sourceUrl: string | null; sourceType: string; publishedOrCollectedAt: string; retrievedAt: string; region: string | null; limitations: string | null }
export interface ServiceMeta {
  requestId: string; snapshotId: string | null; generatedAt: string | null;
  dataLabel: string; isMock: boolean; modelVersion: string | null;
}
export interface TrendPackage { snapshotId: string; snapshotAt: string | null; region: string; origin: Origin; roles: Role[]; meta: ServiceMeta; skills?: SkillTrend[]; bubbleSizeBasis?: string; warnings?: string[] }
export interface MarketRadarSignal {
  id: string; name: string; sourceId: string; sourceRow: number; postings: number | null; marketSharePercent: number | null; previousPostings: number | null; yearAgoPostings: number | null;
  qoqChangePercent: number | null; yoyChangePercent: number | null;
}
export interface MarketMatchReadiness {
  candidateSkillsSource: string;
  positionGranularity: string;
  namedPositionsAvailable: boolean;
  namedSkillRequirementsAvailable: boolean;
  evidenceBasedMatchingReady: boolean;
  reason: string;
}
export interface MarketEmploymentMetric {
  jobs: number; filledJobs: number; vacancies: number; jobsCreated: number;
  qoqChangePercent: number | null; yoyChangePercent: number | null;
}
export interface MarketSkillLevel {
  name: 'Skilled' | 'Semi-skilled' | 'Low-skilled'; jobs: number; filledJobs: number; vacancies: number; jobsCreated: number;
}
export interface MarketEmploymentSector extends MarketEmploymentMetric {
  id: string; name: string; skillLevels: MarketSkillLevel[];
}
export interface MarketRadarSource {
  id: string; title: string; file: string; publishedOn: string; url: string; measure: string;
}
export interface MarketRadarPackage {
  snapshotId: string; region: string; dataAsOf: string; period: string; periods: string[];
  totalJobOfferings: number; totalQoqChangePercent: number | null; totalYoyChangePercent: number | null;
  occupationGroups: MarketRadarSignal[]; industries: MarketRadarSignal[];
  matchingReadiness: MarketMatchReadiness;
  employmentTotals: MarketEmploymentMetric; employmentSectors: MarketEmploymentSector[];
  sources: MarketRadarSource[]; termsUrl: string; attribution: string; notes: string[]; meta: ServiceMeta;
}
export interface AppState {
  locale: Locale; profile: Profile; scenario: Scenario; selectedRole: string; results: Recommendation[] | null;
  matchingSnapshotId: string; marketSnapshotId: string; serviceMeta?: ServiceMeta | null; marketMeta?: ServiceMeta | null; trendPackage?: TrendPackage | null; plan: Plan | null; draft?: Plan | null; archivedPlans?: Plan[]; hr: Organization; hrProfileSaved: boolean; tvet: Organization;
}
