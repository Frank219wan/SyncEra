import type { Constraints, MarketRadarPackage, Plan, Profile, Recommendation, Role, ServiceMeta, Skill, Task } from '../types.ts';

export interface ApiMeta {
  request_id?: string;
  snapshot_id?: string | null;
  generated_at?: string | null;
  data_label?: string;
  is_mock?: boolean;
  model_version?: string | null;
}

export interface ApiSkill {
  skill_id: string;
  level: number | null;
  source: 'declared' | 'inferred' | 'confirmed';
  confidence: number;
}

export interface ApiNormalizedProfile {
  profile_id: string;
  pipeline: 'A';
  current_occupation: string | null;
  skills: ApiSkill[];
  interests: string[];
  preferred_field_id?: string | null;
  study_constraints?: Record<string, unknown>;
  psychology?: { mbti?: string | null };
  reviewed_by_user: boolean;
  revision: number;
}

export interface ApiRoleSignal {
  role_id: string;
  name: string;
  field_id?: string;
  trend_score: number | null;
  signal_label?: string;
  evidence_ids?: string[];
  source_window?: { from: string; to: string };
  observed_metrics?: Record<string, number | null>;
}
export interface ApiSkillSignal { skill_id:string; name:string; trend_score:number|null; signal_label:string; observed_metrics?:{change_pp?:number|null}; evidence_ids:string[]; source_window?:{from:string;to:string} }
export interface ApiBubblesData { categories:Array<{field_id:string;name:string;display_size:number}>; roles:Array<{role_id:string;field_id:string;display_size:number;evidence_ids:string[]}>; size_basis:string; region:string }

export interface ApiMarketRadarSignal {
  id:string; name:string; source_id:string; source_row:number; postings:number|null; previous_postings:number|null; year_ago_postings:number|null;
  market_share_percent:number|null; qoq_change_percent:number|null; yoy_change_percent:number|null;
}
export interface ApiMarketMatchReadiness {
  candidate_skills_source:string; position_granularity:string;
  named_positions_available:boolean; named_skill_requirements_available:boolean; evidence_based_matching_ready:boolean; reason:string;
}
export interface ApiMarketEmploymentMetric {
  jobs:number; filled_jobs:number; vacancies:number; jobs_created:number;
  qoq_change_percent:number|null; yoy_change_percent:number|null;
}
export interface ApiMarketRadarData {
  snapshot_id:string; region:string; data_as_of:string; period:string; periods:string[];
  total_job_offerings:number; total_qoq_change_percent:number|null; total_yoy_change_percent:number|null;
  occupation_groups:ApiMarketRadarSignal[]; industries:ApiMarketRadarSignal[];
  matching_readiness:ApiMarketMatchReadiness;
  employment_totals:ApiMarketEmploymentMetric;
  employment_sectors:Array<ApiMarketEmploymentMetric & {
    id:string; name:string;
    skill_levels:Array<{name:'Skilled'|'Semi-skilled'|'Low-skilled';jobs:number;filled_jobs:number;vacancies:number;jobs_created:number}>;
  }>;
  sources:Array<{id:string;title:string;file:string;published_on:string;url:string;measure:string}>;
  terms_url:string; attribution:string; notes:string[];
}

export interface ApiRoleData {
  role_id: string;
  name: string;
  field_id: string;
  summary: string;
  required_skills: Array<{ skill_id: string; name: string; target_level: number; importance: string }>;
  evidence_ids: string[];
  sdg_links: Array<{ sdg: number; rationale: string }>;
}

export interface ApiTaskImpact {
  task_id: string;
  title: string;
  impact_type: 'automation_candidate' | 'ai_augmented' | 'human_led_oversight';
  reason: string;
  evidence_ids: string[];
  uncertainty: string;
}

export interface ApiRecommendation {
  rank: number;
  role_id: string;
  role_name: string;
  match_score: number | null;
  score_breakdown?: Record<string, number | null>;
  strengths?: string[];
  skill_gaps?: Array<{ skill_id: string; name: string; current_level: number | null; target_level: number; importance: string }>;
  reason?: string;
  evidence_ids?: string[];
  scenario_assumptions?: string[];
  uncertainty?: string;
  sdg_links?: Array<{ sdg: number; rationale: string }>;
}

export interface ApiCareerAnalysis {
  source: 'minimax' | 'rules_fallback';
  status: 'success' | 'disabled' | 'unavailable' | 'invalid_output' | 'in_progress' | 'rate_limited' | 'input_limit';
  role_id: string | null;
  reason: string;
  strength_skill_ids: string[];
  gap_skill_ids: string[];
  risk_and_uncertainty: string;
  evidence_ids: string[];
  model_version: string | null;
}

export interface ApiRoadmapStep {
  step_id: string;
  skill_id: string;
  title: string;
  prerequisite_step_ids: string[];
  estimated_hours: number;
  checkpoint: string;
}

export interface ApiRoadmap {
  roadmap_id: string;
  profile_id: string;
  role_id: string;
  total_estimated_hours: number;
  capacity_hours: number;
  feasibility: 'feasible' | 'stretch' | 'insufficient_time';
  ordered_steps: ApiRoadmapStep[];
  warnings: string[];
}

const levelToNumber: Record<string, number | null> = { unknown: null, beginner: 1, intermediate: 3, advanced: 5 };
const contractSkillIds = new Set(['sql', 'excel', 'python', 'validation', 'communication']);

export const toContractSkillId = (id: string) => id.startsWith('skill_') ? id : `skill_${id}`;
export const fromContractSkillId = (id: string) => id.replace(/^skill_/, '');
export const toContractRoleId = (id: string) => id.startsWith('role_') ? id : `role_${id.replace(/-/g, '_')}`;
export const fromContractRoleId = (id: string) => id.replace(/^role_/, '').replace(/_/g, '-');
export const toContractLevel = (level: string) => levelToNumber[level] ?? null;
export function fromContractLevel(level: number | null) {
  if (level === null || level === 0) return 'unknown';
  if (level <= 2) return 'beginner';
  if (level <= 4) return 'intermediate';
  return 'advanced';
}

export function toServiceMeta(meta: ApiMeta | undefined): ServiceMeta {
  return {
    requestId: meta?.request_id ?? '',
    snapshotId: meta?.snapshot_id ?? null,
    generatedAt: meta?.generated_at ?? null,
    dataLabel: meta?.data_label ?? 'synthetic_demo',
    isMock: meta?.is_mock ?? false,
    modelVersion: meta?.model_version ?? null,
  };
}

function mapMarketEmploymentMetric(value: ApiMarketEmploymentMetric) {
  return {
    jobs: value.jobs,
    filledJobs: value.filled_jobs,
    vacancies: value.vacancies,
    jobsCreated: value.jobs_created,
    qoqChangePercent: value.qoq_change_percent,
    yoyChangePercent: value.yoy_change_percent,
  };
}

export function mapMarketRadar(data: ApiMarketRadarData, meta: ServiceMeta): MarketRadarPackage {
  const mapSignal = (signal: ApiMarketRadarSignal) => ({
    id: signal.id,
    name: signal.name,
    sourceId: signal.source_id,
    sourceRow: signal.source_row,
    postings: signal.postings,
    marketSharePercent: signal.market_share_percent,
    previousPostings: signal.previous_postings,
    yearAgoPostings: signal.year_ago_postings,
    qoqChangePercent: signal.qoq_change_percent,
    yoyChangePercent: signal.yoy_change_percent,
  });
  return {
    snapshotId: data.snapshot_id,
    region: data.region,
    dataAsOf: data.data_as_of,
    period: data.period,
    periods: data.periods,
    totalJobOfferings: data.total_job_offerings,
    totalQoqChangePercent: data.total_qoq_change_percent,
    totalYoyChangePercent: data.total_yoy_change_percent,
    occupationGroups: data.occupation_groups.map(mapSignal),
    industries: data.industries.map(mapSignal),
    matchingReadiness: {
      candidateSkillsSource: data.matching_readiness.candidate_skills_source,
      positionGranularity: data.matching_readiness.position_granularity,
      namedPositionsAvailable: data.matching_readiness.named_positions_available,
      namedSkillRequirementsAvailable: data.matching_readiness.named_skill_requirements_available,
      evidenceBasedMatchingReady: data.matching_readiness.evidence_based_matching_ready,
      reason: data.matching_readiness.reason,
    },
    employmentTotals: mapMarketEmploymentMetric(data.employment_totals),
    employmentSectors: data.employment_sectors.map(sector => ({
      ...mapMarketEmploymentMetric(sector),
      id: sector.id,
      name: sector.name,
      skillLevels: sector.skill_levels.map(level => ({
        name: level.name,
        jobs: level.jobs,
        filledJobs: level.filled_jobs,
        vacancies: level.vacancies,
        jobsCreated: level.jobs_created,
      })),
    })),
    sources: data.sources.map(source => ({
      id: source.id,
      title: source.title,
      file: source.file,
      publishedOn: source.published_on,
      url: source.url,
      measure: source.measure,
    })),
    termsUrl: data.terms_url,
    attribution: data.attribution,
    notes: data.notes,
    meta,
  };
}

function toApiSkill(skill: Skill, reviewed = false): ApiSkill {
  return {
    skill_id: toContractSkillId(skill.id),
    level: toContractLevel(skill.level),
    source: reviewed ? 'confirmed' : skill.source === 'manual' ? 'declared' : 'inferred',
    confidence: reviewed ? 1 : skill.confidence ?? (skill.source === 'manual' ? 1 : 0.7),
  };
}

function contractSkills(skills: Skill[], reviewed = false) {
  // The UI has a wider demo catalogue than the current P0 backend. Never send
  // a made-up canonical ID: unsupported skills stay local until the shared
  // catalogue is expanded.
  return skills.filter(skill => skill.backendSupported!==false&&contractSkillIds.has(fromContractSkillId(skill.id)) && (!reviewed || skill.confirmed)).map(skill => toApiSkill(skill, reviewed));
}

function splitInterests(value: string) {
  return [...new Set(value.split(/[,;，；、\n]/).map(item => item.trim()).filter(Boolean))];
}

export function profileToNormalizeRequest(profile: Profile) {
  return {
    pipeline: 'A' as const,
    input_type: 'form' as const,
    synthetic_input: true,
    text: profile.experience.trim() || null,
    form: {
      current_occupation: profile.occupation.trim(),
      experience: profile.experience.trim(),
      interests: splitInterests(profile.interests),
      skills: contractSkills(profile.skills),
    },
    psychology: { mbti: profile.mbti || null, intrinsic_motivators: [] as string[] },
    study_constraints: {
      weekly_hours: 5, budget_amount: 0, currency: 'MYR', language: 'en',
      target_weeks: 12, learning_pace: 'focused',
    },
  };
}

export function profileToConfirmRequest(profile: Profile) {
  return {
    profile_id: profile.id,
    skills: contractSkills(profile.skills, true),
    reviewed_by_user: true,
    profile_revision: profile.revision,
  };
}

export function mergeNormalizedProfile(profile: ApiNormalizedProfile, fallback: Profile): Profile {
  const returnedIds = new Set(profile.skills.map(skill => fromContractSkillId(skill.skill_id)));
  return {
    ...fallback,
    id: profile.profile_id,
    occupation: profile.current_occupation ?? fallback.occupation,
    interests: profile.interests?.join(', ') || fallback.interests,
    mbti: profile.psychology?.mbti ?? fallback.mbti,
    revision: profile.revision,
    skills: [...profile.skills.map(skill => ({
      id: fromContractSkillId(skill.skill_id),
      level: fromContractLevel(skill.level),
      source: (skill.source === 'declared' || skill.source === 'confirmed' ? 'manual' : 'inferred') as Skill['source'],
      confirmed: profile.reviewed_by_user || (skill.source === 'declared' && fallback.skills.some(existing => existing.id === fromContractSkillId(skill.skill_id) && existing.confirmed)),
      confidence: skill.confidence,
      backendSupported:true,
    })), ...(profile.reviewed_by_user ? [] : fallback.skills.filter(skill => !returnedIds.has(skill.id)).map(skill => ({...skill,confirmed:false,backendSupported:false})))],
  };
}

export function mapRecommendations(items: ApiRecommendation[]): Recommendation[] {
  return items.map(item => ({
    roleId: fromContractRoleId(item.role_id),
    roleName: item.role_name,
    rank: item.rank,
    matchScore: item.match_score,
    origin: 'computed',
    strengths: item.strengths?.map(fromContractSkillId),
    skillGaps: item.skill_gaps?.map(gap => ({
      skillId: fromContractSkillId(gap.skill_id),
      name: gap.name,
      currentLevel: gap.current_level,
      targetLevel: gap.target_level,
      importance: gap.importance,
    })),
    reason: item.reason,
    evidenceIds: item.evidence_ids,
    scenarioAssumptions: item.scenario_assumptions,
    uncertainty: item.uncertainty,
    scoreBreakdown: item.score_breakdown,
    sdgLinks: item.sdg_links,
  }));
}

export function mapTrendRoles(items: ApiRoleSignal[], knownRoles: Role[]): Role[] {
  return items.map(item => {
    const id = fromContractRoleId(item.role_id);
    const known = knownRoles.find(role => role.id === id);
    const trend = item.signal_label === 'rising' ? 'rising' : item.signal_label === 'stable' ? 'stable' : item.signal_label === 'emerging' ? 'emerging' : item.signal_label === 'declining' ? 'declining' : 'unknown';
    const signal = item.trend_score ?? 0;
    const domain = item.field_id === 'field_data' ? 'technology' : item.field_id?.replace(/^field_/, '') || 'unclassified';
    return { id, name: known ? [item.name,known.name[1],known.name[2]] as const : [item.name,item.name,item.name] as const,
      domain, fieldId:item.field_id, description:[item.name,item.name,item.name] as const,
      skills:[],scores:{moderate:0,fast:0},signal,trend,sdgs:[],
      signalAvailable:item.trend_score!==null,signalLabel:item.signal_label,evidenceIds:item.evidence_ids,
      sourceWindow:item.source_window,observedMetrics:item.observed_metrics };
  });
}

export function applyBubbleSizes(roles:Role[],bubbles:ApiBubblesData):Role[]|null {
  if(!bubbles.size_basis.trim()||!bubbles.region)return null;
  const byId=new Map(bubbles.roles.map(item=>[fromContractRoleId(item.role_id),item]));
  if(!roles.every(role=>{const item=byId.get(role.id);return item&&item.field_id===role.fieldId&&Number.isFinite(item.display_size)&&item.display_size>0;}))return null;
  const sizes=new Set(roles.map(role=>byId.get(role.id)!.display_size));
  if(sizes.size>1&&(!/observed|verified|normalized/i.test(bubbles.size_basis)||!roles.every(role=>byId.get(role.id)!.evidence_ids.length)))return null;
  return roles.map(role=>({...role,bubbleSize:byId.get(role.id)!.display_size}));
}

export function targetWeeks(constraints: Constraints) {
  if (!constraints.deadline) return 12;
  const start = Date.parse(`${constraints.start}T00:00:00Z`);
  const end = Date.parse(`${constraints.deadline}T00:00:00Z`);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return 12;
  return Math.max(1, Math.ceil((end - start) / (7 * 24 * 60 * 60 * 1000)));
}

export function mapRoadmap(data: ApiRoadmap, roleId: string, constraints: Constraints): Plan {
  let accumulatedHours = 0;
  const tasks: Task[] = data.ordered_steps.map(step => {
    const week = Math.floor(accumulatedHours / Math.max(1, constraints.hours)) + 1;
    accumulatedHours += step.estimated_hours;
    return {
      id: step.step_id,
      skill: fromContractSkillId(step.skill_id),
      title: [step.title, step.title, step.title],
      hours: step.estimated_hours,
      done: false,
      week,
    };
  });
  return {
    id: data.roadmap_id,
    roleId,
    version: 1,
    adopted: false,
    constraints: { ...constraints },
    tasks,
    earned: 0,
    revisionPending: false,
    offset: 0,
    history: [],
    totalEstimatedHours: data.total_estimated_hours,
    capacityHours: data.capacity_hours,
    feasibility: data.feasibility,
    warnings: data.warnings,
  };
}
