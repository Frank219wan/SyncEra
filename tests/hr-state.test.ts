import assert from 'node:assert/strict';
import test from 'node:test';
import {emptyHr,hrSample,tvetSample} from '../src/data.ts';
import {applyStudentAnalysisResponse,hrAnalysisView,restoreHr,studentAnalysisView} from '../src/hrState.ts';
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
});

test('explicitly saved synthetic example remains saved on the next visit',()=>{
  const restored=restoreHr(structuredClone(hrSample),true);
  assert.equal(restored.hrProfileSaved,true);
  assert.equal(restored.hr.name,hrSample.name);
  assert.equal(restored.hr.people.length,hrSample.people.length);
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
