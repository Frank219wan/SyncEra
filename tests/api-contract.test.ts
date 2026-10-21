import test from 'node:test';
import assert from 'node:assert/strict';
import { emptyProfile } from '../src/data.ts';
import {
  fromContractLevel, fromContractRoleId, fromContractSkillId, mapEvidence, mapRecommendations, mapRoadmap, mapTrendRoles,
  mergeNormalizedProfile, profileToConfirmRequest, profileToNormalizeRequest, selectedRoleToFieldId,
  targetWeeks, toContractLevel, toContractRoleId, toContractSkillId,
} from '../src/services/api-contract.ts';

test('contract IDs round-trip without leaking display names into keys', () => {
  assert.equal(toContractRoleId('data-analyst'), 'role_data_analyst');
  assert.equal(fromContractRoleId('role_data_analyst'), 'data-analyst');
  assert.equal(toContractSkillId('python'), 'skill_python');
  assert.equal(fromContractSkillId('skill_python'), 'python');
  assert.equal(selectedRoleToFieldId('data-analyst'), 'field_data');
  assert.equal(selectedRoleToFieldId('business-analyst'), 'field_business');
  assert.equal(selectedRoleToFieldId('learning-designer'), undefined);
});

test('skill levels preserve unknown as null', () => {
  assert.equal(toContractLevel('unknown'), null);
  assert.equal(toContractLevel('intermediate'), 3);
  assert.equal(fromContractLevel(null), 'unknown');
  assert.equal(fromContractLevel(5), 'advanced');
});

test('profile requests preserve structured occupation, interests, skills, and revision', () => {
  const profile = {
    ...emptyProfile,
    occupation: 'Synthetic analyst',
    education: 'Synthetic degree',
    interests: 'analytics',
    vision: 'learn',
    revision: 4,
    skills: [{ id: 'sql', level: 'intermediate', source: 'manual' as const, confirmed: true }],
  };
  const normalize = profileToNormalizeRequest(profile);
  assert.equal(normalize.pipeline, 'A');
  assert.equal(normalize.synthetic_input, true);
  assert.equal(normalize.input_type, 'form');
  assert.equal(normalize.text, null);
  assert.equal(normalize.form.current_occupation, 'Synthetic analyst');
  assert.deepEqual(normalize.form.interests, ['analytics']);
  assert.equal(normalize.form.skills[0].skill_id, 'skill_sql');
  const confirm = profileToConfirmRequest(profile);
  assert.equal(confirm.reviewed_by_user, true);
  assert.equal(confirm.profile_revision, 4);
  assert.deepEqual(confirm.skills[0], { skill_id: 'skill_sql', level: 3, source: 'declared', confidence: 1 });
});

test('profile requests do not invent backend IDs for frontend-only demo skills', () => {
  const profile = {
    ...emptyProfile,
    skills: [
      { id: 'analytics', level: 'intermediate', source: 'manual' as const, confirmed: true },
      { id: 'communication', level: 'intermediate', source: 'manual' as const, confirmed: true },
    ],
  };
  assert.deepEqual(profileToNormalizeRequest(profile).form.skills.map(skill => skill.skill_id), ['skill_communication']);
  assert.deepEqual(profileToConfirmRequest(profile).skills.map(skill => skill.skill_id), ['skill_communication']);
});

test('normalized service profile maps back to editable UI fields', () => {
  const fallback = {
    ...emptyProfile,
    skills: [{ id: 'analytics', level: 'intermediate', source: 'manual' as const, confirmed: true }],
  };
  const mapped = mergeNormalizedProfile({
    profile_id: 'profile_demo_001', pipeline: 'A', current_occupation: 'Junior analyst',
    skills: [{ skill_id: 'skill_python', level: null, source: 'inferred', confidence: 0.6 }],
    interests: ['analytics', 'sustainability'], reviewed_by_user: false,
    revision: 2,
  }, fallback);
  assert.equal(mapped.id, 'profile_demo_001');
  assert.equal(mapped.skills[0].id, 'python');
  assert.equal(mapped.skills[0].level, 'unknown');
  assert.equal(mapped.skills[0].confirmed, false);
  assert.equal(mapped.revision, 2);
  assert.equal(mapped.skills[1].id, 'analytics');
  assert.equal(mapped.skills[1].level, 'intermediate');
});

test('role trend signals use role_id from the backend contract', () => {
  const mapped = mapTrendRoles([
    { role_id: 'role_data_analyst', name: 'Data Analyst', trend_score: 78, signal_label: 'rising' },
  ], [{ id: 'data-analyst', name: ['Data Analyst', '数据分析师', 'Penganalisis Data'], domain: 'technology', description: ['','',''], skills: [], scores: { moderate: 0, fast: 0 }, signal: 0, trend: 'stable', sdgs: [] }]);
  assert.equal(mapped[0].id, 'data-analyst');
  assert.equal(mapped[0].signal, 78);
  assert.equal(mapped[0].trend, 'rising');
});

test('roadmap response becomes a capacity-based local plan', () => {
  const constraints = { hours: 5, budget: 100, language: 'en' as const, start: '2026-10-21', deadline: '2026-11-18', baseline: '' };
  assert.equal(targetWeeks(constraints), 4);
  const plan = mapRoadmap({
    roadmap_id: 'roadmap_1', profile_id: 'profile_1', role_id: 'role_data_analyst', total_estimated_hours: 8, capacity_hours: 20, feasibility: 'feasible', warnings: [],
    ordered_steps: [
      { step_id: 'step_1', skill_id: 'skill_python', title: 'Foundations', prerequisite_step_ids: [], estimated_hours: 3, checkpoint: 'Explain it' },
      { step_id: 'step_2', skill_id: 'skill_python', title: 'Practice', prerequisite_step_ids: ['step_1'], estimated_hours: 5, checkpoint: 'Build it' },
    ],
  }, 'data-analyst', constraints);
  assert.equal(plan.id, 'roadmap_1');
  assert.equal(plan.tasks[0].skill, 'python');
  assert.equal(plan.tasks[0].title[0], 'Foundations');
  assert.equal(plan.tasks[1].week, 1);
  assert.equal(plan.totalEstimatedHours, 8);
  assert.equal(plan.capacityHours, 20);
  assert.equal(plan.feasibility, 'feasible');
});

test('recommendations and evidence preserve provenance and explanations', () => {
  const [recommendation] = mapRecommendations([{
    rank: 1,
    role_id: 'role_data_analyst',
    role_name: 'Data Analyst',
    match_score: 72.5,
    score_breakdown: { skill_compatibility: 80, interests_preferences: 70, scenario_outlook: 60, transition_feasibility: 70 },
    strengths: ['skill_sql'],
    skill_gaps: [{ skill_id: 'skill_python', name: 'Python', current_level: null, target_level: 3, importance: 'high' }],
    reason: 'Confirmed skills and dated evidence support this result.',
    evidence_ids: ['ev_public_1'],
    scenario_assumptions: ['moderate scenario'],
    uncertainty: 'Not outcome-calibrated.',
    sdg_links: [{ sdg: 8, rationale: 'Supports productive work.' }],
  }]);
  assert.equal(recommendation.reason, 'Confirmed skills and dated evidence support this result.');
  assert.deepEqual(recommendation.evidenceIds, ['ev_public_1']);
  assert.equal(recommendation.scoreBreakdown?.skillCompatibility, 80);
  assert.equal(recommendation.skillGaps?.[0].targetLevel, 3);

  const evidence = mapEvidence({
    evidence_id: 'ev_public_1', title: 'Public evidence', source_url: 'https://example.org/evidence',
    source_type: 'dataset', published_or_collected_at: '2026-08-18', retrieved_at: '2026-10-21T00:00:00Z',
    region: 'MY', limitations: 'Sample limitation.',
  });
  assert.equal(evidence.url, 'https://example.org/evidence');
  assert.equal(evidence.publishedOrCollectedAt, '2026-08-18');
});
