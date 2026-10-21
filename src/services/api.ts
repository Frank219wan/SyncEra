import type { Profile, Scenario, Recommendation, Constraints, Plan, TrendPackage, Organization, Evidence } from '../types';
import { demoRecommendations, makePlan } from '../domain';
import { roles } from '../data';
import {
  applyBubbleSizes, mapRecommendations, mapRoadmap, mapTrendRoles, mergeNormalizedProfile,
  fromContractSkillId, profileToConfirmRequest, profileToNormalizeRequest, targetWeeks,
  toContractLevel, toContractRoleId, toContractSkillId, toServiceMeta,
  type ApiMeta, type ApiNormalizedProfile, type ApiRecommendation, type ApiRoadmap, type ApiRoleData, type ApiRoleSignal, type ApiBubblesData, type ApiSkillSignal,
} from './api-contract';

export const isDemo = import.meta.env.VITE_API_MODE !== 'real';
const configuredBase = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');
const apiRoot = configuredBase.endsWith('/api/v1') ? configuredBase : `${configuredBase}/api/v1`;

interface SuccessEnvelope<T> { data: T; meta: ApiMeta }
interface ErrorEnvelope {
  error?: { code?: string; message?: string; details?: Array<{ field?: string; reason?: string }>; retryable?: boolean };
  meta?: { request_id?: string };
}

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public retryable = false,
    public details: Array<{ field?: string; reason?: string }> = [],
    public requestId = '',
  ) { super(message); }
}

async function request<T>(path: string, options: { body?: unknown; method?: string } = {}): Promise<SuccessEnvelope<T>> {
  const requestId = `web_${crypto.randomUUID()}`;
  let response: Response;
  try {
    response = await fetch(`${apiRoot}${path}`, {
      method: options.method ?? (options.body === undefined ? 'GET' : 'POST'),
      headers: {
        Accept: 'application/json',
        ...(options.body === undefined ? {} : { 'Content-Type': 'application/json' }),
        'X-Request-ID': requestId,
      },
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      signal: AbortSignal.timeout(20000),
    });
  } catch (error) {
    const message = error instanceof DOMException && error.name === 'TimeoutError'
      ? 'The service timed out. Please retry.'
      : 'The service is unavailable. Check the API URL and try again.';
    throw new ApiError(0, 'NETWORK_ERROR', message, true, [], requestId);
  }

  let payload: unknown;
  try { payload = await response.json(); }
  catch { throw new ApiError(response.status, 'INVALID_RESPONSE', 'The service returned non-JSON data.', response.status >= 500, [], requestId); }

  if (!response.ok) {
    const envelope = payload as ErrorEnvelope;
    throw new ApiError(
      response.status,
      envelope.error?.code ?? `HTTP_${response.status}`,
      envelope.error?.message ?? `Service request failed (${response.status}).`,
      envelope.error?.retryable ?? response.status >= 500,
      envelope.error?.details ?? [],
      envelope.meta?.request_id ?? requestId,
    );
  }

  if (!payload || typeof payload !== 'object' || !('data' in payload) || !('meta' in payload)) {
    throw new ApiError(502, 'INVALID_ENVELOPE', 'The service response is missing data or meta.', false, [], requestId);
  }
  return payload as SuccessEnvelope<T>;
}

function demoMeta(snapshotId: string | null = null) {
  return {
    requestId: 'demo_local', snapshotId, generatedAt: null,
    dataLabel: 'synthetic_demo', isMock: true, modelVersion: 'fixture-v1',
  };
}

function regionCode(region: string) {
  if (region !== 'Malaysia') {
    throw new ApiError(400, 'UNSUPPORTED_REGION', 'The connected API currently supports Malaysia only. Choose Malaysia or switch back to demo mode.');
  }
  return 'MY';
}

export const api = {
  health: async () => request<{ status: 'ok'; api_version: string }>('/health'),

  normalize: async (profile: Profile): Promise<Profile> => {
    if (isDemo) return structuredClone(profile);
    const response = await request<{ profile: ApiNormalizedProfile }>('/profiles/normalize', { body: profileToNormalizeRequest(profile) });
    return mergeNormalizedProfile(response.data.profile, profile);
  },

  confirm: async (profile: Profile): Promise<Profile> => {
    if (isDemo) return { ...structuredClone(profile), skills: profile.skills.filter(skill => skill.confirmed) };
    const response = await request<{ profile: ApiNormalizedProfile; profile_revision: number }>('/profiles/confirm', { body: profileToConfirmRequest(profile) });
    return mergeNormalizedProfile(response.data.profile, profile);
  },

  trends: async (): Promise<TrendPackage> => {
    if (isDemo) {
      const snapshotId = 'snap_demo_fixture_v1';
      return { snapshotId, snapshotAt: null, region: 'Malaysia · synthetic fixture', origin: 'synthetic_fixture', roles, meta: demoMeta(snapshotId) };
    }
    const response = await request<{ items: ApiRoleSignal[]; next_cursor: string | null }>('/trends/roles?region=MY&limit=50');
    const meta = toServiceMeta(response.meta);
    if (!meta.snapshotId) throw new ApiError(502, 'MISSING_SNAPSHOT', 'Role trends did not include a snapshot ID.');
    return {
      snapshotId: meta.snapshotId ?? '', snapshotAt: meta.generatedAt,
      region: 'MY', origin: meta.isMock ? 'synthetic_fixture' : 'public_observed',
      roles: mapTrendRoles(response.data.items, roles).map(role=>({...role,bubbleSize:1})), meta,
    };
  },

  discovery: async (): Promise<TrendPackage> => {
    const trends = await api.trends();
    if (isDemo) return trends;
    const query = `?region=MY&snapshot_id=${encodeURIComponent(trends.snapshotId)}`;
    const [bubbleResult,skillResult] = await Promise.allSettled([
      request<ApiBubblesData>(`/explore/bubbles${query}`),
      request<{items:ApiSkillSignal[];next_cursor:string|null}>(`/trends/skills${query}&limit=50`),
    ]);
    const warnings:string[]=[];
    let mapped=trends.roles;
    let bubbleSizeBasis:string|undefined;
    if(bubbleResult.status==='fulfilled'){
      const {data,meta}=bubbleResult.value;
      if(meta.snapshot_id===trends.snapshotId&&Boolean(meta.is_mock)===trends.meta.isMock){
        const sized=applyBubbleSizes(mapped,data);
        if(sized){mapped=sized;bubbleSizeBasis=data.size_basis;}
        else warnings.push('Bubble data is incomplete or has non-comparable sizes; showing neutral bubbles.');
      }else warnings.push('Bubble data does not match the role snapshot or source label.');
    }else warnings.push(`Bubble API unavailable: ${(bubbleResult.reason as Error).message}`);
    let skills:TrendPackage['skills'];
    if(skillResult.status==='fulfilled'){
      const {data,meta}=skillResult.value;
      if(meta.snapshot_id===trends.snapshotId&&Boolean(meta.is_mock)===trends.meta.isMock){
        skills=data.items.map(item=>({id:fromContractSkillId(item.skill_id),name:item.name,score:item.trend_score,
          label:item.signal_label,change:item.observed_metrics?.change_pp??null,
          evidenceIds:item.evidence_ids,sourceWindow:item.source_window}));
      }else warnings.push('Skill data does not match the role snapshot or source label.');
    }else warnings.push(`Skill trends API unavailable: ${(skillResult.reason as Error).message}`);
    return {...trends,roles:mapped,skills,bubbleSizeBasis,warnings};
  },

  evidence: async (evidenceId: string): Promise<{ evidence: Evidence; meta: ReturnType<typeof toServiceMeta> }> => {
    if (!/^[A-Za-z0-9_-]+$/.test(evidenceId)) throw new ApiError(400, 'BAD_REQUEST', 'Invalid evidence ID.');
    const response = await request<{ evidence: {
      evidence_id: string; title: string; source_url: string | null; source_type: string;
      published_or_collected_at: string; retrieved_at: string; region: string | null; limitations: string | null;
    } }>(`/evidence/${evidenceId}`);
    const item = response.data.evidence;
    return { evidence: { evidenceId: item.evidence_id, title: item.title, sourceUrl: item.source_url, sourceType: item.source_type, publishedOrCollectedAt: item.published_or_collected_at, retrievedAt: item.retrieved_at, region: item.region, limitations: item.limitations }, meta: toServiceMeta(response.meta) };
  },

  role: async (roleId: string): Promise<{ role: ApiRoleData; meta: ReturnType<typeof toServiceMeta> }> => {
    const response = await request<ApiRoleData>(`/roles/${toContractRoleId(roleId)}`);
    return { role: response.data, meta: toServiceMeta(response.meta) };
  },

  recommendDetailed: async (profile: Profile, scenario: Scenario, _selectedRole: string, snapshotId: string): Promise<{results: Recommendation[]; meta: ReturnType<typeof toServiceMeta>}> => {
    if (isDemo) return {results: demoRecommendations(profile, scenario), meta: demoMeta(snapshotId)};
    const response = await request<{ profile_id: string; ai_scenario: Scenario; recommendations: ApiRecommendation[] }>('/recommendations', {
      body: {
        profile_id: profile.id,
        region: regionCode(profile.region),
        ai_scenario: scenario,
        top_k: 5,
        snapshot_id: snapshotId,
      },
    });
    if (!Array.isArray(response.data.recommendations)) throw new ApiError(502, 'INVALID_RESPONSE', 'Missing recommendations in service response.');
    return {results: mapRecommendations(response.data.recommendations), meta: toServiceMeta(response.meta)};
  },

  recommend: async (profile: Profile, scenario: Scenario, selectedRole: string, snapshotId: string): Promise<Recommendation[]> =>
    (await api.recommendDetailed(profile, scenario, selectedRole, snapshotId)).results,

  skillMap: async (profileId: string, roleId: string, skillId: string, language: string, budgetAmount: number) => {
    return request<{
      skill_map_id: string; role_id: string; skill_id: string;
      nodes: Array<{ node_id: string; node_type: string; title: string; depends_on: string[]; estimated_hours: number; resource_id: string | null; resource?: { resource_id: string; title: string; url: string; provider: string; language: string; cost_amount: number; currency: string; estimated_hours: number; verified_at: string } | null }>;
      next_actions: string[];
    }>('/learning/skill-map', { body: { profile_id: profileId, role_id: toContractRoleId(roleId), skill_id: toContractSkillId(skillId), language, budget_amount: budgetAmount, currency: 'MYR' } });
  },

  fullPlan: async (roleId: string, constraints: Constraints, profile: Profile): Promise<Plan> => {
    if (isDemo) return makePlan(roleId, constraints);
    const roleResponse = await request<ApiRoleData>(`/roles/${toContractRoleId(roleId)}`);
    const owned = new Map(profile.skills.filter(skill => skill.confirmed).map(skill => [toContractSkillId(skill.id), toContractLevel(skill.level)]));
    const gaps = roleResponse.data.required_skills
      .filter(skill => owned.get(skill.skill_id) === undefined || (owned.get(skill.skill_id) ?? 0) < skill.target_level)
      .map(skill => skill.skill_id);
    // The roadmap contract requires at least one selected role skill. When the
    // user already meets every target, keep the journey useful by deepening the
    // first requirement instead of sending an invalid empty list.
    const selected = gaps.length ? gaps : roleResponse.data.required_skills.slice(0, 1).map(skill => skill.skill_id);
    const weeks = targetWeeks(constraints);
    const response = await request<ApiRoadmap>('/learning/roadmap', {
      body: {
        profile_id: profile.id,
        role_id: toContractRoleId(roleId),
        selected_skill_ids: selected,
        study_constraints: {
          weekly_hours: constraints.hours,
          budget_amount: constraints.budget,
          currency: 'MYR',
          language: constraints.language,
          target_weeks: weeks,
          learning_pace: weeks <= 12 ? 'focused' : 'deep',
        },
      },
    });
    return mapRoadmap(response.data, roleId, constraints);
  },

  adopt: async (plan: Plan): Promise<Plan> => ({ ...plan, adopted: true }),

  // No organization-analysis endpoint is available in the connected API yet.
  organization: async (org: Organization, _actor: 'hr' | 'tvet'): Promise<Organization> => {
    if (!isDemo) throw new ApiError(503, 'SERVICE_UNAVAILABLE', 'Organization analysis is not connected yet. Your inputs remain saved locally; no AI analysis was generated.');
    return { ...structuredClone(org), analyzedRevision: org.revision };
  },

  task: async (profileId: string, plan: Plan, taskId: string, evidence: string): Promise<void> => {
    if (isDemo) return;
    const task = plan.tasks.find(item => item.id === taskId);
    if (!task) throw new ApiError(404, 'NOT_FOUND', 'The selected learning step was not found.');
    if (!isDemo) throw new ApiError(503, 'SERVICE_UNAVAILABLE', 'Learning-progress synchronization is not connected yet. No server-side progress was recorded.');
    void profileId; void evidence;
  },
};
