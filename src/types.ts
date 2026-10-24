export type Locale = 'en' | 'zh' | 'ms';
export type Copy = readonly [string, string, string];
export type Scenario = 'moderate' | 'fast';
export type Origin = 'synthetic_fixture' | 'public_observed' | 'computed' | 'scenario_model' | 'llm_generated';
export interface Skill { id: string; level: string; source: 'manual' | 'cv_extracted' | 'inferred'; confirmed: boolean; confidence?: number; backendSupported?: boolean }
export type PsychologyChoice = 'A'|'B'|'C'|'D'|'E'|null;
export interface PsychologyAssessment { assessment_version:'1.0'; assessment_type:'self_report_reflection'; scenario_answers:Record<string,PsychologyChoice>; other_responses:Record<string,string>; consent_to_personalization:boolean }
export interface Profile {
  id: string; stage: string; goal: string; occupation: string; education: string; experience: string;
  skills: Skill[]; interests: string; vision: string; preferences: string; mbti: string;
  goalTags?: string[];
  workStyle?: { collaboration: string; pace: string; structure: string };
  personalSources?: Partial<Record<'interests' | 'vision' | 'workStyle', 'self_reported' | 'sample' | 'ai_draft'>>;
  personalConfirmed?: Partial<Record<'interests' | 'vision' | 'workStyle', boolean>>;
  region: string; synthetic: boolean; sample: boolean; revision?: number;
  psychology?: PsychologyAssessment;
  uploadedFromCv?: boolean;
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
  skillLevels?: Record<string, number | null>;
  goalTags?: string[];
  workStyle?: { collaboration: string; pace: string; structure: string };
  reviewed?: boolean;
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
export interface HrRequestIdentity {
  clientWorkspaceId: string; workspaceId?: string; workspaceRevision?: number;
  revision: number; scenario: Scenario; operationId: string;
}
export interface HrRecovery {
  status: 'pending' | 'unknown' | 'conflict'; request: HrRequestIdentity;
}
export interface Organization {
  name: string; sector: string; needs: string[]; budget: number; weeks: number;
  people: Person[]; selected: string[]; revision: number; analyzedRevision: number;
  training: Record<string, string[]>;
  departments?: Department[]; goals?: string[]; planningVersions?: DepartmentPlanVersion[];
  workspaceId?: string; workspaceRevision?: number;
  clientWorkspaceId?: string;
  hrRecovery?: HrRecovery | null;
  hrLastOperationId?: string;
  previousWorkspaceIds?: string[];
  analysis?: OrganizationAnalysis | null; analysisMeta?: ServiceMeta | null;
  hrAnalysis?: HRAnalysis | null;
}
export interface OrganizationScoreBreakdown {
  skillCompatibility: number; interestAlignment: number; goalAlignment: number;
  workStyleAlignment: number; scenarioOutlook: number; transitionFeasibility: number;
}
export interface OrganizationRoleRecommendation {
  rank: number; roleId: string; roleName: string; matchScore: number;
  scoreBreakdown: OrganizationScoreBreakdown; strengths: string[];
  skillGaps: Array<{skillId:string;name:string;currentLevel:number|null;targetLevel:number;importance:'high'|'medium'|'low'}>;
  evidenceIds: string[]; tagSources: Array<'MASCO'|'curated'|'ai_generated'>;
}
export interface OrganizationStudentResult {
  memberId: string; recommendations: OrganizationRoleRecommendation[]; selectedRoleId: string;
  actionPlan: {nextSemesterCourses:string[];selfStudyTopics:string[];projectOrInternship:string;humanReviewStatus:'required'};
  missingInputs: Array<'interests'|'goal_tags'|'work_style'|'skill_levels'>;
  resultConfidence: 'low'|'medium'|'high';
}
export interface OrganizationAnalysis {
  workspaceId: string; workspaceRevision: number; analysisId: string; mode: 'career_centre';
  snapshotId: string; scenario: Scenario; scoringPolicy: 'organization-b2-v0.1';
  studentResults: OrganizationStudentResult[];
  cohortResult: {
    includedMemberIds:string[];
    skillGapCounts:Array<{skillId:string;name:string;affectedMembers:number;memberIds:string[]}>;
    proposedWorkshops:Array<{title:string;targetGap:string;affectedMembers:number;evidenceIds:string[]}>;
    tutoringFocus:string[];
    curriculumSupplements:Array<{courseName:string;suggestedModule:string;reason:string;evidenceIds:string[]}>;
    humanReviewStatus:'required';
  };
  warnings: string[];
}
export interface HRSkillCoverage {
  skillId:string; name:string; coverageState:'measured'|'unknown'; recordedProfiles:number;
  profilesWithSkill:number; coveragePercent:number|null; missingMemberIds:string[];
}
export interface HRMobilitySuggestion {
  memberId:string; currentRole:string|null; recommendedRoleId:string; recommendedRoleName:string;
  matchScore:number; skillCompatibility:number; scenarioOutlook:number; transitionFeasibility:number;
  skillGaps:Array<{skillId:string;name:string;currentLevel:number|null;targetLevel:number;importance:'high'|'medium'|'low'}>;
  evidenceIds:string[]; humanReviewStatus:'required';
}
export interface HRTrainingPriority {
  skillId:string; name:string; priority:'review_required'|'high'|'medium'|'low';
  coverageState:'measured'|'unknown'; affectedProfiles:number|null; affectedMemberIds:string[];
  estimatedHoursPerLearner:number; estimateBasis:'synthetic_planning_assumption'; evidenceIds:string[];
}
export interface HRDepartmentResult {
  departmentId:string; label:string; reportedHeadcount:number; employeeProfileCount:number;
  knownBaselineCount:number; skillCoverage:HRSkillCoverage[]; trainingPriorities:HRTrainingPriority[];
  mobilitySuggestions:HRMobilitySuggestion[]; warnings:string[];
}
export interface HRAnalysis {
  workspaceId:string; workspaceRevision:number; analysisId:string; mode:'hr'; snapshotId:string;
  scenario:Scenario; scoringPolicy:'organization-b1-v0.1'; departmentResults:HRDepartmentResult[];
  organizationSummary:{
    reportedHeadcount:number; departmentCount:number; employeeProfileCount:number; knownBaselineCount:number;
    profileCoveragePercent:number; crossDepartmentSkillPriorities:Array<HRTrainingPriority&{affectedDepartmentIds:string[]}>;
    capacity:{planningHorizonWeeks:number;recordedWeeklyLearningHours:number|null;estimatedCapacityHours:number|null;
      estimatedTrainingHours:number|null;horizonStatus:'not_assessed'|'feasible'|'stretch';budgetMyr:number;budgetStatus:'not_assessed'};
    humanReviewStatus:'required';
  };
  warnings:string[];
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
  snapshotId: string; serviceMeta?: ServiceMeta | null; trendPackage?: TrendPackage | null; plan: Plan | null; draft?: Plan | null; archivedPlans?: Plan[]; hr: Organization; hrProfileSaved: boolean; tvet: Organization;
}
