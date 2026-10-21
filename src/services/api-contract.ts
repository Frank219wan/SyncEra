import type { Constraints, EvidenceRecord, Plan, Profile, Recommendation, Role, ServiceMeta, Skill, Task } from '../types.ts';

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
  source: 'declared' | 'inferred';
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
  trend_score: number | null;
  signal_label?: string;
}

export interface ApiRoleData {
  role_id: string;
  name: string;
  field_id: string;
  summary: string;
  required_skills: Array<{ skill_id: string; name: string; target_level: number; importance: string }>;
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

export interface ApiEvidence {
  evidence_id: string;
  title: string;
  source_url: string | null;
  source_type: string;
  published_or_collected_at: string;
  retrieved_at: string;
  region: string | null;
  limitations: string | null;
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
export const selectedRoleToFieldId = (id: string) => id === 'data-analyst' ? 'field_data' : id === 'business-analyst' ? 'field_business' : undefined;
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

function toApiSkill(skill: Skill): ApiSkill {
  return {
    skill_id: toContractSkillId(skill.id),
    level: toContractLevel(skill.level),
    source: skill.source === 'manual' ? 'declared' : 'inferred',
    confidence: skill.source === 'manual' ? 1 : 0.7,
  };
}

function contractSkills(skills: Skill[]) {
  // The UI has a wider demo catalogue than the current P0 backend. Never send
  // a made-up canonical ID: unsupported skills stay local until the shared
  // catalogue is expanded.
  return skills.filter(skill => contractSkillIds.has(fromContractSkillId(skill.id))).map(toApiSkill);
}

function splitInterests(value: string) {
  return [...new Set(value.split(/[,;，；、\n]/).map(item => item.trim()).filter(Boolean))];
}

export function profileToNormalizeRequest(profile: Profile) {
  return {
    pipeline: 'A' as const,
    input_type: 'form' as const,
    synthetic_input: true,
    text: null,
    form: {
      current_occupation: profile.occupation.trim(),
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
    skills: contractSkills(profile.skills),
    reviewed_by_user: true,
    profile_revision: profile.revision,
  };
}

export function mergeNormalizedProfile(profile: ApiNormalizedProfile, fallback: Profile): Profile {
  const normalizedSkills = profile.skills.map(skill => ({
    id: fromContractSkillId(skill.skill_id),
    level: fromContractLevel(skill.level),
    source: skill.source === 'declared' ? 'manual' as const : 'inferred' as const,
    confirmed: profile.reviewed_by_user,
  }));
  const normalizedIds = new Set(normalizedSkills.map(skill => skill.id));
  const localSkills = fallback.skills.filter(skill =>
    !contractSkillIds.has(fromContractSkillId(skill.id)) && !normalizedIds.has(fromContractSkillId(skill.id))
  );
  return {
    ...fallback,
    id: profile.profile_id,
    occupation: profile.current_occupation ?? fallback.occupation,
    interests: profile.interests?.join(', ') || fallback.interests,
    mbti: profile.psychology?.mbti ?? fallback.mbti,
    revision: profile.revision,
    skills: [...normalizedSkills, ...localSkills],
  };
}

export function mapRecommendations(items: ApiRecommendation[]): Recommendation[] {
  return items.map(item => ({
    roleId: fromContractRoleId(item.role_id),
    rank: item.rank,
    matchScore: item.match_score,
    origin: 'computed',
    scoreBreakdown: item.score_breakdown ? {
      skillCompatibility: item.score_breakdown.skill_compatibility ?? null,
      interestsPreferences: item.score_breakdown.interests_preferences ?? null,
      scenarioOutlook: item.score_breakdown.scenario_outlook ?? null,
      transitionFeasibility: item.score_breakdown.transition_feasibility ?? null,
    } : undefined,
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
    sdgLinks: item.sdg_links,
  }));
}

export function mapEvidence(item: ApiEvidence): EvidenceRecord {
  return {
    id: item.evidence_id,
    title: item.title,
    url: item.source_url,
    sourceType: item.source_type,
    publishedOrCollectedAt: item.published_or_collected_at,
    retrievedAt: item.retrieved_at,
    region: item.region,
    limitations: item.limitations,
  };
}

export function mapTrendRoles(items: ApiRoleSignal[], knownRoles: Role[]): Role[] {
  return items.map(item => {
    const id = fromContractRoleId(item.role_id);
    const known = knownRoles.find(role => role.id === id);
    const trend = item.signal_label === 'rising' ? 'rising' : item.signal_label === 'stable' ? 'stable' : 'emerging';
    const signal = item.trend_score ?? 0;
    return known
      ? { ...known, name: [item.name, known.name[1], known.name[2]], signal, trend }
      : { id, name: [item.name, item.name, item.name], domain: 'technology', description: [item.name, item.name, item.name], skills: [], scores: { moderate: signal, fast: signal }, signal, trend, sdgs: [] };
  });
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
