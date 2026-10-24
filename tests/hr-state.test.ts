import assert from 'node:assert/strict';
import test from 'node:test';
import {emptyHr,hrSample,tvetSample} from '../src/data.ts';
import {applyHrAnalysisResponse,applyStudentAnalysisResponse,hrAnalysisView,newHrDraftFromSample,restoreHr,studentAnalysisView} from '../src/hrState.ts';
import type {Organization} from '../src/types.ts';

test('a first visit and an untouched legacy fixture start with an empty team profile',()=>{
  for(const saved of [undefined,structuredClone(hrSample)]){
    const restored=restoreHr(saved,undefined);
    assert.equal(restored.hrProfileSaved,false);
    assert.deepEqual(restored.hr,emptyHr);
  }
});

test('a modified legacy team profile keeps its organization and employee records',()=>{
  const saved=structuredClone(hrSample);
  saved.name='My organization';
  saved.people[0].role='Coordinator';
  const restored=restoreHr(saved,undefined);
  assert.equal(restored.hrProfileSaved,true);
  assert.equal(restored.hr.name,'My organization');
  assert.equal(restored.hr.people[0].role,'Coordinator');
  assert.equal(restored.hr.departments?.length,3);
  assert.ok(restored.hr.clientWorkspaceId);
});

test('explicitly saved synthetic example remains saved on the next visit',()=>{
  const restored=restoreHr(structuredClone(hrSample),true);
  assert.equal(restored.hrProfileSaved,true);
  assert.equal(restored.hr.name,hrSample.name);
  assert.equal(restored.hr.people.length,hrSample.people.length);
  assert.ok(restored.hr.clientWorkspaceId);
});

test('loading a fresh synthetic HR draft clears old server identity and analysis',()=>{
  const first=newHrDraftFromSample();
  const second=newHrDraftFromSample();
  assert.ok(first.clientWorkspaceId);
  assert.notEqual(first.clientWorkspaceId,second.clientWorkspaceId);
  assert.equal(first.workspaceId,undefined);
  assert.equal(first.workspaceRevision,undefined);
  assert.equal(first.hrAnalysis,null);
  assert.equal(first.analysisMeta,null);
  assert.deepEqual(first.planningVersions,[]);
});

test('Real HR views require an analysis for the current revision and scenario',()=>{
  const current:Organization={...structuredClone(emptyHr),revision:4,analyzedRevision:4,
    hrAnalysis:{mode:'hr',scenario:'moderate'} as Organization['hrAnalysis']};
  assert.equal(hrAnalysisView(current,'moderate',false),'connected');
  assert.equal(hrAnalysisView({...current,hrAnalysis:null},'moderate',false),'needs_analysis');
  assert.equal(hrAnalysisView({...current,revision:5},'moderate',false),'needs_analysis');
  assert.equal(hrAnalysisView(current,'fast',false),'needs_analysis');
  assert.equal(hrAnalysisView({...current,hrAnalysis:null},'moderate',true),'demo');
});

test('a committed B2 response preserves its CAS identity without showing results after local changes',()=>{
  const original={...structuredClone(tvetSample),revision:4,workspaceId:'workspace-1',workspaceRevision:2};
  const edited={...original,revision:5,name:'Edited synthetic cohort'};
  const analysis={mode:'career_centre',workspaceId:'workspace-1',workspaceRevision:3,scenario:'moderate'} as Organization['analysis'];
  const meta={requestId:'synthetic',snapshotId:'snapshot',generatedAt:null,dataLabel:'synthetic',isMock:true,modelVersion:null};
  const after=applyStudentAnalysisResponse(edited,'fast',4,'moderate','workspace-1',analysis!,meta);
  assert.equal(after.name,'Edited synthetic cohort');
  assert.equal(after.workspaceId,'workspace-1');
  assert.equal(after.workspaceRevision,3);
  assert.equal(after.analysis,null);
  assert.equal(studentAnalysisView(after,'fast',false),'needs_analysis');
  const another={...edited,workspaceId:'workspace-2',workspaceRevision:7};
  assert.deepEqual(applyStudentAnalysisResponse(another,'moderate',4,'moderate','workspace-1',analysis!,meta),another);
});

test('a committed B1 response keeps the same workspace CAS token but hides analysis after local edits',()=>{
  const original={...structuredClone(hrSample),revision:4,workspaceId:'workspace-hr-1',workspaceRevision:2,clientWorkspaceId:'client-hr-1'};
  const edited={...original,revision:5,name:'Edited synthetic organization'};
  const analysis={mode:'hr',workspaceId:'workspace-hr-1',workspaceRevision:3,scenario:'moderate'} as Organization['hrAnalysis'];
  const meta={requestId:'synthetic',snapshotId:'snapshot',generatedAt:null,dataLabel:'synthetic',isMock:true,modelVersion:null};
  const version={version:1,createdAt:'2026-10-24T00:00:00Z',organizationGoals:[],skills:[],departments:[],budget:0,weeks:8};
  const after=applyHrAnalysisResponse(edited,'fast',4,'moderate','workspace-hr-1','client-hr-1',analysis!,meta,version);
  assert.equal(after.name,'Edited synthetic organization');
  assert.equal(after.workspaceId,'workspace-hr-1');
  assert.equal(after.workspaceRevision,3);
  assert.equal(after.hrAnalysis,null);
  assert.equal(after.analysisMeta,null);
  assert.equal(after.planningVersions?.length,original.planningVersions?.length);
  assert.equal(hrAnalysisView(after,'fast',false),'needs_analysis');
});

test('a B1 response from another workspace cannot overwrite the current CAS identity',()=>{
  const original={...structuredClone(hrSample),revision:4,workspaceId:'workspace-hr-1',workspaceRevision:2,clientWorkspaceId:'client-hr-1'};
  const switched={...original,workspaceId:'workspace-hr-2',workspaceRevision:7};
  const analysis={mode:'hr',workspaceId:'workspace-hr-1',workspaceRevision:3,scenario:'moderate'} as Organization['hrAnalysis'];
  const meta={requestId:'synthetic',snapshotId:'snapshot',generatedAt:null,dataLabel:'synthetic',isMock:true,modelVersion:null};
  const version={version:1,createdAt:'2026-10-24T00:00:00Z',organizationGoals:[],skills:[],departments:[],budget:0,weeks:8};
  assert.deepEqual(applyHrAnalysisResponse(switched,'moderate',4,'moderate','workspace-hr-1','client-hr-1',analysis!,meta,version),switched);
  const wrongAnalysis={...analysis!,workspaceId:'workspace-hr-2'};
  assert.deepEqual(applyHrAnalysisResponse(original,'moderate',4,'moderate','workspace-hr-1','client-hr-1',wrongAnalysis,meta,version),original);
  const current=applyHrAnalysisResponse(original,'moderate',4,'moderate','workspace-hr-1','client-hr-1',analysis!,meta,version);
  assert.equal(current.workspaceRevision,3);
  assert.equal(current.hrAnalysis,analysis);
  assert.equal(current.analyzedRevision,4);
  assert.equal(current.planningVersions?.length,(original.planningVersions?.length||0)+1);
  assert.equal(hrAnalysisView(current,'moderate',false),'connected');
});

test('a first B1 response keeps CAS after same-workspace edits but never shows stale analysis',()=>{
  const original={...structuredClone(hrSample),revision:4,clientWorkspaceId:'client-first'};
  const edited={...original,revision:5,name:'Edited synthetic organization'};
  const analysis={mode:'hr',workspaceId:'server-first',workspaceRevision:1,scenario:'moderate'} as Organization['hrAnalysis'];
  const meta={requestId:'synthetic',snapshotId:'snapshot',generatedAt:null,dataLabel:'synthetic',isMock:true,modelVersion:null};
  const version={version:1,createdAt:'2026-10-24T00:00:00Z',organizationGoals:[],skills:[],departments:[],budget:0,weeks:8};
  const after=applyHrAnalysisResponse(edited,'moderate',4,'moderate',undefined,'client-first',analysis!,meta,version);
  assert.equal(after.name,edited.name);
  assert.equal(after.workspaceId,'server-first');
  assert.equal(after.workspaceRevision,1);
  assert.equal(after.hrAnalysis,null);
  assert.equal(hrAnalysisView(after,'moderate',false),'needs_analysis');
  const current=applyHrAnalysisResponse(original,'moderate',4,'moderate',undefined,'client-first',analysis!,meta,version);
  assert.equal(current.hrAnalysis,analysis);
});

test('a late first B1 response cannot attach a server workspace after local reset or workspace switch',()=>{
  const original={...structuredClone(hrSample),revision:4,clientWorkspaceId:'client-first'};
  const reset={...structuredClone(hrSample),revision:5,clientWorkspaceId:'client-reset'};
  const analysis={mode:'hr',workspaceId:'server-first',workspaceRevision:1,scenario:'moderate'} as Organization['hrAnalysis'];
  const meta={requestId:'synthetic',snapshotId:'snapshot',generatedAt:null,dataLabel:'synthetic',isMock:true,modelVersion:null};
  const version={version:1,createdAt:'2026-10-24T00:00:00Z',organizationGoals:[],skills:[],departments:[],budget:0,weeks:8};
  assert.deepEqual(applyHrAnalysisResponse(reset,'moderate',4,'moderate',undefined,'client-first',analysis!,meta,version),reset);
  assert.deepEqual(applyHrAnalysisResponse(original,'moderate',4,'moderate',undefined,undefined,analysis!,meta,version),original);
  const switched={...original,clientWorkspaceId:'client-other',workspaceId:'server-other',workspaceRevision:3};
  assert.deepEqual(applyHrAnalysisResponse(switched,'moderate',4,'moderate',undefined,'client-first',analysis!,meta,version),switched);
});
