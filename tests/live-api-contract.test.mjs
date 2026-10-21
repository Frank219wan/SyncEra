import test from 'node:test';
import assert from 'node:assert/strict';

const baseUrl = process.env.API_BASE_URL ?? 'http://127.0.0.1:8000/api/v1';
const constraints = {
  weekly_hours: 5,
  budget_amount: 100,
  currency: 'MYR',
  language: 'en',
  target_weeks: 12,
  learning_pace: 'focused',
};

async function request(path, init = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: { 'content-type': 'application/json', ...(init.headers ?? {}) },
  });
  const payload = await response.json();
  assert.equal(response.ok, true, `${response.status} ${path}: ${JSON.stringify(payload)}`);
  assert.ok(payload.meta?.request_id, `${path} must return a request ID`);
  return payload;
}

test('live API completes the Individual contract from profile to roadmap', async () => {
  const health = await request('/health');
  assert.equal(health.data.api_version, '1.0.0');

  const normalized = await request('/profiles/normalize', {
    method: 'POST',
    body: JSON.stringify({
      pipeline: 'A',
      input_type: 'form',
      synthetic_input: true,
      form: {
        current_occupation: 'Operations Assistant',
        interests: ['analytics', 'data'],
        skills: [{ skill_id: 'skill_sql', level: 3 }],
      },
      preferred_field_id: 'field_data',
      study_constraints: constraints,
    }),
  });
  assert.equal(normalized.meta.is_mock, true, 'Synthetic rule-based extraction stays labelled honestly');
  const profile = normalized.data.profile;
  assert.equal(profile.current_occupation, 'Operations Assistant');
  assert.deepEqual(profile.interests, ['analytics', 'data']);

  const confirmed = await request('/profiles/confirm', {
    method: 'POST',
    body: JSON.stringify({
      profile_id: profile.profile_id,
      skills: [{ skill_id: 'skill_sql', level: 3, source: 'confirmed', confidence: 1 }],
      reviewed_by_user: true,
      profile_revision: profile.revision,
    }),
  });
  assert.equal(confirmed.data.profile.reviewed_by_user, true);

  const trends = await request('/trends/roles?region=MY&field_id=field_data');
  assert.ok(trends.meta.snapshot_id);
  assert.ok(trends.data.items.some(item => item.role_id === 'role_data_analyst'));

  const recommendations = await request('/recommendations', {
    method: 'POST',
    body: JSON.stringify({
      profile_id: profile.profile_id,
      region: 'MY',
      ai_scenario: 'moderate',
      preferred_field_id: 'field_data',
      snapshot_id: trends.meta.snapshot_id,
      top_k: 5,
    }),
  });
  assert.equal(recommendations.meta.snapshot_id, trends.meta.snapshot_id);
  const recommendation = recommendations.data.recommendations.find(item => item.role_id === 'role_data_analyst');
  assert.ok(recommendation, 'data analyst recommendation must be present');
  assert.ok(recommendation.reason);
  assert.equal(typeof recommendation.score_breakdown.skill_compatibility, 'number');
  const expectedScore = 0.45 * recommendation.score_breakdown.skill_compatibility
    + 0.20 * recommendation.score_breakdown.interests_preferences
    + 0.20 * recommendation.score_breakdown.scenario_outlook
    + 0.15 * recommendation.score_breakdown.transition_feasibility;
  assert.ok(Math.abs(recommendation.match_score - expectedScore) <= 0.01);
  assert.ok(recommendation.evidence_ids.length > 0);
  assert.ok(recommendation.skill_gaps.some(gap => gap.skill_id === 'skill_python'));

  const evidence = await request(`/evidence/${recommendation.evidence_ids[0]}`);
  assert.equal(evidence.data.evidence.evidence_id, recommendation.evidence_ids[0]);
  if (evidence.meta.data_label === 'synthetic_demo') {
    assert.match(evidence.data.evidence.limitations, /synthetic/i);
  } else {
    assert.ok(evidence.data.evidence.source_url);
  }

  const skillMap = await request('/learning/skill-map', {
    method: 'POST',
    body: JSON.stringify({
      profile_id: profile.profile_id,
      role_id: recommendation.role_id,
      skill_id: 'skill_python',
      language: 'en',
      budget_amount: 100,
      currency: 'MYR',
    }),
  });
  assert.equal(skillMap.data.skill_id, 'skill_python');
  assert.ok(skillMap.data.nodes.length > 0);

  const roadmap = await request('/learning/roadmap', {
    method: 'POST',
    body: JSON.stringify({
      profile_id: profile.profile_id,
      role_id: recommendation.role_id,
      selected_skill_ids: ['skill_python'],
      study_constraints: constraints,
    }),
  });
  assert.ok(roadmap.data.ordered_steps.length > 0);
  assert.equal(typeof roadmap.data.total_estimated_hours, 'number');
  assert.ok(['feasible', 'stretch', 'insufficient_time'].includes(roadmap.data.feasibility));
});
