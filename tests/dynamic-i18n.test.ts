import assert from 'node:assert/strict';
import {test} from 'node:test';
import {cohortCurriculumText,marketCategoryText,originalLanguage,recommendationText,roleLabel,roadmapStepTitle,skillLabel,skillMapNodeTitle,studentPlanText,warningText,workshopTitle} from '../src/dynamicI18n.ts';
import type {Recommendation} from '../src/types.ts';

const realResult:Recommendation={
  roleId:'business-analyst',roleName:'Business Analyst',rank:1,matchScore:75.5,origin:'computed',
  strengths:['excel'],skillGaps:[{skillId:'validation',name:'AI Output Validation',currentLevel:null,targetLevel:2,importance:'medium'}],
  reason:'Deterministic match from confirmed skill levels, explicit interests/field, study capacity, and the selected dated scenario.',
  scenarioAssumptions:['moderate multiplier 1 applied to role outlook 64; observed snapshot metrics are unchanged.'],
  uncertainty:'Synthetic fixture; no observed job-demand claim; matching weights and level-to-hours conversion are transparent Phase-1 heuristics and are not outcome-calibrated.',
  evidenceIds:['ev_demo_001'],
};

test('already-loaded real recommendation changes language without changing any source values',()=>{
  const original=structuredClone(realResult);
  assert.equal(roleLabel(realResult.roleId,realResult.roleName!,'zh'),'业务分析师');
  assert.equal(roleLabel(realResult.roleId,realResult.roleName!,'ms'),'Penganalisis Perniagaan');
  assert.equal(skillLabel('validation','AI Output Validation','zh'),'AI 输出验证');
  assert.match(recommendationText(realResult,'reason','zh') as string,/确定性匹配/);
  assert.match(recommendationText(realResult,'reason','ms') as string,/Padanan deterministik/);
  assert.match((recommendationText(realResult,'scenarioAssumptions','zh') as string[])[0],/64.*1/);
  assert.match(recommendationText(realResult,'uncertainty','ms') as string,/belum ditentukur/);
  assert.equal(recommendationText(realResult,'reason','en'),realResult.reason);
  assert.deepEqual(realResult,original);
  assert.equal(realResult.matchScore,75.5);
  assert.equal(realResult.rank,1);
});

test('unknown roles and novel explanations remain visible as explicitly labelled originals',()=>{
  assert.equal(roleLabel('new-market-role','Emerging Claims Analyst','zh'),'Emerging Claims Analyst (原文资料)');
  assert.equal(roleLabel('new-market-role','Emerging Claims Analyst','ms'),'Emerging Claims Analyst (teks bahasa asal)');
  const unknown={...realResult,reason:'New evidence-led explanation from an unknown source.'};
  assert.equal(recommendationText(unknown,'reason','zh'),originalLanguage(unknown.reason!,'zh'));
});

test('B2 plan and cohort templates use stable role and skill IDs',()=>{
  const gap={skillId:'validation',name:'AI Output Validation'};
  assert.equal(studentPlanText('Review available modules covering AI Output Validation','course',{id:'data-analyst',name:'Data Analyst'},[gap],'zh'),'查看涵盖AI 输出验证的现有课程模块');
  assert.equal(workshopTitle('AI Output Validation in practice','validation','AI Output Validation','ms'),'Pengesahan output AI dalam amalan');
  assert.equal(cohortCurriculumText('Applied AI Output Validation','module',[{...gap,affectedMembers:2}],'zh'),'AI 输出验证应用模块');
  assert.match(roadmapStepTitle('validation','Practice AI Output Validation','ms'),/Pengesahan output AI/);
  assert.equal(roadmapStepTitle('validation','Novel resource title','zh'),'Novel resource title (原文资料)');
  assert.equal(skillMapNodeTitle('validation','practice','Practice AI Output Validation on a synthetic task','zh'),'在合成任务中练习AI 输出验证');
  assert.equal(skillMapNodeTitle('validation','practice','Novel learning claim','ms'),'Novel learning claim (teks bahasa asal)');
});

test('B1 warning and DOSM category labels are tied to reviewed source strings',()=>{
  assert.match(warningText('Budget feasibility is not assessed because verified course prices are not connected.','zh'),/预算可行性/);
  assert.equal(marketCategoryText('occupation-professionals','Professionals','ms'),'Profesional');
  assert.equal(marketCategoryText('occupation-professionals','New occupation name','zh'),'New occupation name (原文资料)');
  assert.equal(roleLabel('data-analyst','Senior Data Analyst','zh'),'Senior Data Analyst (原文资料)');
  assert.equal(skillLabel('validation','Unverified validation skill','zh'),'Unverified validation skill (原文资料)');
});
