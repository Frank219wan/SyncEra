import type { Profile, Scenario, Recommendation, Constraints, Plan, TrendPackage, Organization } from '../types';
import { demoRecommendations, makePlan } from '../domain';
import { roles } from '../data';
import {
  mapRecommendations, mapRoadmap, mapTrendRoles, mergeNormalizedProfile,
  profileToConfirmRequest, profileToNormalizeRequest, targetWeeks,
  toContractLevel, toContractRoleId, toContractSkillId, toServiceMeta,
  type ApiMeta, type ApiNormalizedProfile, type ApiRecommendation, type ApiRoadmap, type ApiRoleData, type ApiRoleSignal,
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
    if (isDemo) return { ...structuredClone(profile), skills: profile.skills.map(skill => ({ ...skill, confirmed: true })) };
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
    return {
      snapshotId: meta.snapshotId ?? '', snapshotAt: meta.generatedAt,
      region: 'MY', origin: meta.isMock ? 'synthetic_fixture' : 'public_observed',
      roles: mapTrendRoles(response.data.items, roles), meta,
    };
  },

  recommend: async (profile: Profile, scenario: Scenario, _selectedRole: string, snapshotId: string): Promise<Recommendation[]> => {
    if (isDemo) return demoRecommendations(profile, scenario);
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
    return mapRecommendations(response.data.recommendations);
  },

  skillMap: async (profileId: string, roleId: string, skillId: string, language: string, budgetAmount: number) => {
    return request<{
      skill_map_id: string; role_id: string; skill_id: string;
      nodes: Array<{ node_id: string; node_type: string; title: string; depends_on: string[]; estimated_hours: number; resource_id: string | null; resource?: { url: string; provider: string; language: string; cost_amount: number | null; verified_at: string } | null }>;
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

  // P1 organization endpoints deliberately return 503 in API v1. Keep this clearly local until P1 ships.
  organization: async (org: Organization, _actor: 'hr' | 'tvet'): Promise<Organization> =>
    ({ ...structuredClone(org), analyzedRevision: org.revision }),

  task: async (profileId: string, plan: Plan, taskId: string, evidence: string): Promise<void> => {
    if (isDemo) return;
    const task = plan.tasks.find(item => item.id === taskId);
    if (!task) throw new ApiError(404, 'NOT_FOUND', 'The selected learning step was not found.');
    // P1 progress is browser-local for now; the backend route intentionally returns 503.
    void profileId; void evidence;
  },
};
