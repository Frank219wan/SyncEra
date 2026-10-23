import test from 'node:test';
import assert from 'node:assert/strict';
import { emptyProfile } from '../src/data.ts';
import {
  applyBubbleSizes, fromContractLevel, fromContractRoleId, fromContractSkillId, mapRoadmap, mapTrendRoles,
  mergeNormalizedProfile, profileToConfirmRequest, profileToNormalizeRequest, syntheticTextToNormalizeRequest,
  targetWeeks, toContractLevel, toContractRoleId, toContractSkillId, verifiedRoleAlignmentTags,
} from '../src/services/api-contract.ts';

test('contract IDs round-trip without leaking display names into keys', () => {
  assert.equal(toContractRoleId('data-analyst'), 'role_data_analyst');
  assert.equal(fromContractRoleId('role_data_analyst'), 'data-analyst');
  assert.equal(toContractSkillId('python'), 'skill_python');
  assert.equal(fromContractSkillId('skill_python'), 'python');
});

test('synthetic pasted CV text uses the existing normalize contract without a file upload', () => {
  const request = syntheticTextToNormalizeRequest(emptyProfile, '  Fictional graduate with SQL and Python projects.  ');
  assert.equal(request.input_type, 'synthetic_cv_text');
  assert.equal(request.synthetic_input, true);
  assert.equal(request.text, 'Fictional graduate with SQL and Python projects.');
  assert.equal(request.form, null);
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
    vision: 'learn', goalTags:['continuous learning'],
    workStyle:{collaboration:'team',pace:'steady',structure:'balanced'},
    personalConfirmed:{interests:true,vision:true,workStyle:true},
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
  assert.deepEqual(confirm.skills[0], { skill_id: 'skill_sql', level: 3, source: 'confirmed', confidence: 1 });
  assert.equal(JSON.stringify(normalize).includes('goalTags'),false);
  assert.equal(JSON.stringify(normalize).includes('workStyle'),false);
  assert.equal(Object.hasOwn(confirm,'vision'),false);
  assert.equal(Object.hasOwn(confirm,'personalConfirmed'),false);
});

test('empty optional interests stay an empty v1 form list',()=>{
  assert.deepEqual(profileToNormalizeRequest(emptyProfile).form.interests,[]);
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
  const mapped = mergeNormalizedProfile({
    profile_id: 'profile_demo_001', pipeline: 'A', current_occupation: 'Junior analyst',
    skills: [{ skill_id: 'skill_python', level: null, source: 'inferred', confidence: 0.6 }],
    interests: ['analytics', 'sustainability'], reviewed_by_user: false,
    revision: 2,
  }, emptyProfile);
  assert.equal(mapped.id, 'profile_demo_001');
  assert.equal(mapped.skills[0].id, 'python');
  assert.equal(mapped.skills[0].level, 'unknown');
  assert.equal(mapped.skills[0].confirmed, false);
  assert.equal(mapped.revision, 2);
});

test('normalization cannot assign MBTI or erase local vision and work-style self reports',()=>{
  const local={...emptyProfile,vision:'Learn sustainably',goalTags:['Learning'],workStyle:{collaboration:'team',pace:'',structure:''},personalSources:{vision:'self_reported' as const,workStyle:'self_reported' as const}};
  const merged=mergeNormalizedProfile({profile_id:'profile_1',pipeline:'A',current_occupation:'Analyst',interests:[],psychology:{mbti:'INTJ'},reviewed_by_user:false,revision:1,skills:[]},local);
  assert.equal(merged.mbti,'');
  assert.equal(merged.vision,'Learn sustainably');
  assert.deepEqual(merged.goalTags,['Learning']);
  assert.equal(merged.workStyle?.collaboration,'team');
});

test('role alignment tags require an explicit recognized provenance',()=>{
  const base={role_id:'role_1',name:'Role',field_id:'field_data',summary:'',required_skills:[],evidence_ids:[],sdg_links:[]};
  assert.deepEqual(verifiedRoleAlignmentTags(base),[]);
  const tags=verifiedRoleAlignmentTags({...base,alignment_tags:[
    {kind:'interest',label:'Technology',source:'MASCO'},
    {kind:'goal',label:'Impact',source:'curated'},
    {kind:'work_style',label:'Teamwork',source:'ai_generated'},
    {kind:'goal',label:'Unverified',source:'unknown'},
  ]});
  assert.equal(tags.length,3);
});

test('newly extracted skills remain unconfirmed until the user reviews them',()=>{
  const draft={...emptyProfile,skills:[{id:'sql',level:'intermediate',source:'manual' as const,confirmed:true}]};
  const normalized=mergeNormalizedProfile({profile_id:'profile_1',pipeline:'A',current_occupation:'Analyst',interests:[],reviewed_by_user:false,revision:1,skills:[
    {skill_id:'skill_sql',level:3,source:'declared',confidence:1},
    {skill_id:'skill_python',level:null,source:'inferred',confidence:.6},
  ]},draft);
  assert.equal(normalized.skills.find(skill=>skill.id==='sql')?.confirmed,true);
  assert.equal(normalized.skills.find(skill=>skill.id==='python')?.confirmed,false);
  assert.equal(normalized.skills.find(skill=>skill.id==='python')?.confidence,.6);
  assert.deepEqual(profileToConfirmRequest(normalized).skills.map(skill=>skill.skill_id),['skill_sql']);
  assert.deepEqual(profileToConfirmRequest({...normalized,skills:normalized.skills.map(skill=>skill.id==='python'?{...skill,confirmed:true}:skill)}).skills.map(skill=>skill.skill_id),['skill_sql','skill_python']);
});

test('normalization includes synthetic experience text for extraction',()=>{
  const request=profileToNormalizeRequest({...emptyProfile,experience:'Built a Python script'});
  assert.equal(request.text,'Built a Python script');
  assert.equal(request.form.experience,'Built a Python script');
});

test('role trend signals use role_id from the backend contract', () => {
  const mapped = mapTrendRoles([
    { role_id: 'role_data_analyst', name: 'Data Analyst', trend_score: 78, signal_label: 'rising' },
  ], [{ id: 'data-analyst', name: ['Data Analyst', '数据分析师', 'Penganalisis Data'], domain: 'technology', description: ['','',''], skills: [], scores: { moderate: 0, fast: 0 }, signal: 0, trend: 'stable', sdgs: [] }]);
  assert.equal(mapped[0].id, 'data-analyst');
  assert.equal(mapped[0].signal, 78);
  assert.equal(mapped[0].trend, 'rising');
});

test('real role trends do not inherit synthetic skills or a fabricated industry',()=>{
  const mapped=mapTrendRoles([{role_id:'role_new',name:'New role',field_id:'field_health',trend_score:null,signal_label:'insufficient_evidence'}],[]);
  assert.equal(mapped[0].domain,'health');
  assert.equal(mapped[0].signalAvailable,false);
  assert.equal(mapped[0].trend,'unknown');
  assert.deepEqual(mapped[0].skills,[]);
});

test('bubble sizes require matching role and field IDs with a stated size basis',()=>{
  const role=mapTrendRoles([{role_id:'role_data_analyst',name:'Data Analyst',field_id:'field_data',trend_score:78,signal_label:'current_snapshot'}],[]);
  const bubbles={categories:[],roles:[{role_id:'role_data_analyst',field_id:'field_data',display_size:1,evidence_ids:[]}],size_basis:'Equal observed area',region:'MY'};
  assert.equal(applyBubbleSizes(role,bubbles)?.[0].bubbleSize,1);
  assert.equal(applyBubbleSizes(role,{...bubbles,roles:[{...bubbles.roles[0],field_id:'field_business'}]}),null);
  assert.equal(applyBubbleSizes(role,{...bubbles,size_basis:''}),null);
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
});
