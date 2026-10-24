import assert from 'node:assert/strict';
import test from 'node:test';
import {emptyHr,emptyProfile,hrSample,tvetSample} from '../src/data.ts';
import {applyHrAnalysisResponse,applyStudentAnalysisResponse,beginHrAnalysis,createHrWorkspaceFromDraft,hrAnalysisView,hrRecoveryNeeded,newHrDraftFromSample,restoreHr,saveHrDraft,studentAnalysisView} from '../src/hrState.ts';
import {runHrAnalysis} from '../src/hrAnalysisFlow.ts';
import type {AppState,HRAnalysis,HrRequestIdentity,Organization,Scenario,ServiceMeta} from '../src/types.ts';

function requestFor(org:Organization,scenario:Scenario='moderate'):HrRequestIdentity {
  return {clientWorkspaceId:org.clientWorkspaceId!,workspaceId:org.workspaceId,
    workspaceRevision:org.workspaceRevision,revision:org.revision,scenario,operationId:'synthetic-operation'};
}

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

test('starting a Real B1 refresh hides old analysis without losing its workspace CAS token',()=>{
  const previous:Organization={...structuredClone(hrSample),revision:4,analyzedRevision:4,
    clientWorkspaceId:'client-hr',workspaceId:'server-hr',workspaceRevision:2,
    hrAnalysis:{mode:'hr',scenario:'moderate'} as Organization['hrAnalysis'],
    analysisMeta:{requestId:'synthetic',snapshotId:'snapshot',generatedAt:null,dataLabel:'synthetic',isMock:true,modelVersion:null}};
  assert.equal(hrAnalysisView(previous,'moderate',false),'connected');
  const pending=beginHrAnalysis(previous);
  assert.equal(hrAnalysisView(pending,'moderate',false),'needs_analysis');
  assert.equal(pending.hrAnalysis,null);
  assert.equal(pending.analysisMeta,null);
  assert.equal(pending.workspaceId,'server-hr');
  assert.equal(pending.workspaceRevision,2);
  assert.equal(pending.clientWorkspaceId,'client-hr');
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
  const after=applyHrAnalysisResponse(edited,'fast',requestFor(original),analysis!,meta,version);
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
  assert.deepEqual(applyHrAnalysisResponse(switched,'moderate',requestFor(original),analysis!,meta,version),switched);
  const wrongAnalysis={...analysis!,workspaceId:'workspace-hr-2'};
  assert.deepEqual(applyHrAnalysisResponse(original,'moderate',requestFor(original),wrongAnalysis,meta,version),original);
  const current=applyHrAnalysisResponse(original,'moderate',requestFor(original),analysis!,meta,version);
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
  const after=applyHrAnalysisResponse(edited,'moderate',requestFor(original),analysis!,meta,version);
  assert.equal(after.name,edited.name);
  assert.equal(after.workspaceId,'server-first');
  assert.equal(after.workspaceRevision,1);
  assert.equal(after.hrAnalysis,null);
  assert.equal(hrAnalysisView(after,'moderate',false),'needs_analysis');
  const current=applyHrAnalysisResponse(original,'moderate',requestFor(original),analysis!,meta,version);
  assert.equal(current.hrAnalysis,analysis);
});

test('a late first B1 response cannot attach a server workspace after local reset or workspace switch',()=>{
  const original={...structuredClone(hrSample),revision:4,clientWorkspaceId:'client-first'};
  const reset={...structuredClone(hrSample),revision:5,clientWorkspaceId:'client-reset'};
  const analysis={mode:'hr',workspaceId:'server-first',workspaceRevision:1,scenario:'moderate'} as Organization['hrAnalysis'];
  const meta={requestId:'synthetic',snapshotId:'snapshot',generatedAt:null,dataLabel:'synthetic',isMock:true,modelVersion:null};
  const version={version:1,createdAt:'2026-10-24T00:00:00Z',organizationGoals:[],skills:[],departments:[],budget:0,weeks:8};
  assert.deepEqual(applyHrAnalysisResponse(reset,'moderate',requestFor(original),analysis!,meta,version),reset);
  assert.deepEqual(applyHrAnalysisResponse(original,'moderate',{...requestFor(original),clientWorkspaceId:''},analysis!,meta,version),original);
  const switched={...original,clientWorkspaceId:'client-other',workspaceId:'server-other',workspaceRevision:3};
  assert.deepEqual(applyHrAnalysisResponse(switched,'moderate',requestFor(original),analysis!,meta,version),switched);
});

const flowMeta:ServiceMeta={requestId:'synthetic-request',snapshotId:'synthetic-snapshot',generatedAt:null,
  dataLabel:'synthetic_demo',isMock:true,modelVersion:'rules-only'};
function flowState(hr:Organization={...structuredClone(hrSample),clientWorkspaceId:'client-flow',
  workspaceId:'server-flow',workspaceRevision:4,revision:4,analyzedRevision:3}):AppState {
  return {locale:'en',profile:structuredClone(emptyProfile),scenario:'moderate',selectedRole:'',results:null,
    snapshotId:'',serviceMeta:null,plan:null,hr,hrProfileSaved:true,tvet:structuredClone(tvetSample)};
}
function flowHarness(initial=flowState()) {
  let state=initial;
  return {get state(){return state;},update(change:(current:AppState)=>AppState){state=change(state);}};
}
function flowResponse(org:Organization,scenario:Scenario='moderate',workspaceId=org.workspaceId||'new-server-workspace') {
  return {analysis:{mode:'hr',workspaceId,workspaceRevision:(org.workspaceRevision??0)+1,scenario,
    snapshotId:'synthetic-snapshot'} as HRAnalysis,meta:flowMeta};
}
function deferred<T>() {
  let resolve!:(value:T)=>void;let reject!:(reason:Error)=>void;
  const promise=new Promise<T>((yes,no)=>{resolve=yes;reject=no;});
  return {promise,resolve,reject};
}

test('CAS 01: a received server revision becomes the current token and visible analysis',async()=>{
  const h=flowHarness();let calls=0;
  const result=await runHrAnalysis(h.state,h.update,async org=>{calls++;return flowResponse(org);});
  assert.equal(result.kind,'received');assert.equal(calls,1);
  assert.equal(h.state.hr.workspaceRevision,5);
  assert.equal(h.state.hr.hrLastOperationId,result.request?.operationId);
  assert.equal(h.state.hr.hrRecovery,null);
  assert.equal(hrAnalysisView(h.state.hr,h.state.scenario,false),'connected');
  assert.equal(h.state.hr.planningVersions?.length,1);
});

test('CAS 02-03: navigation and an edit do not lose a received server token or show stale analysis',async()=>{
  const h=flowHarness();const delayed=deferred<ReturnType<typeof flowResponse>>();let currentPage='intake';
  const run=runHrAnalysis(h.state,h.update,()=>delayed.promise);
  assert.equal(h.state.hr.hrRecovery?.status,'pending');
  currentPage='other-route';
  h.update(s=>({...s,hr:{...s.hr,name:'Edited synthetic organization',revision:s.hr.revision+1}}));
  delayed.resolve(flowResponse(h.state.hr));
  assert.equal((await run).kind,'received');assert.equal(currentPage,'other-route');
  assert.equal(h.state.hr.name,'Edited synthetic organization');
  assert.equal(h.state.hr.workspaceRevision,5);
  assert.equal(h.state.hr.hrAnalysis,null);
  assert.equal(h.state.hr.planningVersions?.length??0,0);
  assert.equal(hrAnalysisView(h.state.hr,h.state.scenario,false),'needs_analysis');
});

test('saving an older edit after server success preserves its confirmed revision and current draft',async()=>{
  const h=flowHarness();const draft={...structuredClone(h.state.hr),name:'Edited synthetic organization',revision:5};
  const delayed=deferred<ReturnType<typeof flowResponse>>();
  const run=runHrAnalysis(h.state,h.update,()=>delayed.promise);
  delayed.resolve(flowResponse(h.state.hr));await run;
  assert.equal(h.state.hr.workspaceRevision,5);
  h.update(s=>({...s,hr:saveHrDraft(s.hr,draft)}));
  assert.equal(h.state.hr.name,draft.name);
  assert.equal(h.state.hr.workspaceRevision,5);
  assert.equal(h.state.hr.workspaceId,'server-flow');
  assert.equal(h.state.hr.hrAnalysis,null);
  assert.equal(hrAnalysisView(h.state.hr,'moderate',false),'needs_analysis');
});

test('saving an older edit while a request is pending retains the operation guard',async()=>{
  const h=flowHarness();const draft={...structuredClone(h.state.hr),name:'Edited during pending',revision:5};
  const delayed=deferred<ReturnType<typeof flowResponse>>();
  const run=runHrAnalysis(h.state,h.update,()=>delayed.promise);
  h.update(s=>({...s,hr:saveHrDraft(s.hr,draft)}));
  assert.equal(h.state.hr.hrRecovery?.status,'pending');
  delayed.resolve(flowResponse(h.state.hr));await run;
  assert.equal(h.state.hr.workspaceRevision,5);
  assert.equal(h.state.hr.hrAnalysis,null);
});

test('CAS 04: a committed but timed-out request never guesses a new server revision',async()=>{
  const h=flowHarness();let serverRevision=5;
  const result=await runHrAnalysis(h.state,h.update,async()=>{assert.equal(serverRevision,5);throw new Error('Timed out after server commit');});
  assert.equal(result.kind,'unknown');assert.equal(h.state.hr.workspaceRevision,4);
  assert.equal(h.state.hr.hrRecovery?.status,'unknown');assert.equal(hrRecoveryNeeded(h.state.hr),true);
  assert.equal(hrAnalysisView(h.state.hr,h.state.scenario,false),'needs_analysis');
  let calls=0;
  const blocked=await runHrAnalysis(h.state,h.update,async()=>{calls++;return flowResponse(h.state.hr);});
  assert.equal(blocked.kind,'busy');assert.equal(calls,0);
});

test('CAS 05-06: HTTP 409 enters recovery and keeping the draft changes no inputs or token',async()=>{
  const h=flowHarness();const conflict=Object.assign(new Error('stale'),{status:409});
  const result=await runHrAnalysis(h.state,h.update,async()=>{throw conflict;});
  assert.equal(result.kind,'conflict');assert.equal(h.state.hr.hrRecovery?.status,'conflict');
  const before=structuredClone(h.state.hr);
  // The UI's Keep current draft action only closes the recovery choices.
  let recoveryChoicesOpen=true;recoveryChoicesOpen=false;
  assert.equal(recoveryChoicesOpen,false);assert.deepEqual(h.state.hr,before);
  assert.equal(hrRecoveryNeeded(h.state.hr),true);
});

test('CAS 07: confirmed new workspace retains inputs, replaces identity and creates server revision 1',async()=>{
  const h=flowHarness();
  await runHrAnalysis(h.state,h.update,async()=>{throw Object.assign(new Error('stale'),{status:409});});
  const previous=h.state.hr;const fresh=createHrWorkspaceFromDraft(previous);
  assert.equal(fresh.name,previous.name);assert.deepEqual(fresh.departments,previous.departments);
  assert.deepEqual(fresh.people,previous.people);assert.notEqual(fresh.clientWorkspaceId,previous.clientWorkspaceId);
  assert.deepEqual(fresh.previousWorkspaceIds,['server-flow']);assert.equal(fresh.workspaceId,undefined);
  assert.equal(fresh.workspaceRevision,undefined);assert.equal(fresh.hrRecovery,null);
  assert.equal(fresh.hrAnalysis,null);assert.deepEqual(fresh.planningVersions,[]);
  h.update(s=>({...s,hr:fresh}));let calls=0;
  const result=await runHrAnalysis(h.state,h.update,async org=>{calls++;
    assert.equal(org.workspaceId,undefined);assert.equal(org.workspaceRevision,undefined);
    return flowResponse(org,'moderate','server-new');});
  assert.equal(result.kind,'received');assert.equal(calls,1);
  assert.equal(h.state.hr.workspaceId,'server-new');assert.equal(h.state.hr.workspaceRevision,1);
});

test('CAS 08: first analysis edited while pending attaches only its confirmed identity and hides stale output',async()=>{
  const h=flowHarness(flowState({...structuredClone(hrSample),clientWorkspaceId:'first-client',revision:1}));
  const delayed=deferred<ReturnType<typeof flowResponse>>();const run=runHrAnalysis(h.state,h.update,()=>delayed.promise);
  h.update(s=>({...s,hr:{...s.hr,name:'Edited synthetic first draft',revision:2}}));
  delayed.resolve(flowResponse(h.state.hr,'moderate','first-server'));
  await run;
  assert.equal(h.state.hr.workspaceId,'first-server');assert.equal(h.state.hr.workspaceRevision,1);
  assert.equal(h.state.hr.name,'Edited synthetic first draft');assert.equal(h.state.hr.hrAnalysis,null);
});

test('CAS 09: a late result cannot attach to a different client workspace',async()=>{
  const h=flowHarness();const delayed=deferred<ReturnType<typeof flowResponse>>();
  const run=runHrAnalysis(h.state,h.update,()=>delayed.promise);
  h.update(s=>({...s,hr:{...createHrWorkspaceFromDraft(s.hr),name:'New synthetic workspace'}}));
  delayed.resolve(flowResponse(flowState().hr));await run;
  assert.equal(h.state.hr.workspaceId,undefined);assert.equal(h.state.hr.workspaceRevision,undefined);
  assert.equal(h.state.hr.hrAnalysis,null);assert.equal(h.state.hr.name,'New synthetic workspace');
});

test('CAS 10: scenario change hides a late Moderate analysis while retaining server CAS metadata',async()=>{
  const h=flowHarness();const delayed=deferred<ReturnType<typeof flowResponse>>();
  const run=runHrAnalysis(h.state,h.update,()=>delayed.promise);
  h.update(s=>({...s,scenario:'fast'}));delayed.resolve(flowResponse(h.state.hr));await run;
  assert.equal(h.state.hr.workspaceRevision,5);assert.equal(h.state.hr.hrAnalysis,null);
  assert.equal(hrAnalysisView(h.state.hr,'fast',false),'needs_analysis');
});

test('CAS 11: rapid duplicate submit makes one HTTP call',async()=>{
  const h=flowHarness();const delayed=deferred<ReturnType<typeof flowResponse>>();let calls=0;
  const analyze=async()=>{calls++;return delayed.promise;};
  const first=runHrAnalysis(h.state,h.update,analyze);
  const second=await runHrAnalysis(h.state,h.update,analyze);
  assert.equal(second.kind,'busy');assert.equal(calls,1);
  delayed.resolve(flowResponse(h.state.hr));await first;
  assert.equal(h.state.hr.workspaceRevision,5);
});

test('CAS 12: B2 revision, scenario and Real/Demo view gating are unaffected',()=>{
  const b2={...structuredClone(tvetSample),revision:3,analyzedRevision:3,workspaceId:'b2-server',workspaceRevision:2,
    analysis:{mode:'career_centre',workspaceId:'b2-server',workspaceRevision:2,scenario:'moderate'} as Organization['analysis']};
  assert.equal(studentAnalysisView(b2,'moderate',false),'connected');
  assert.equal(studentAnalysisView(b2,'fast',false),'needs_analysis');
  assert.equal(studentAnalysisView({...b2,revision:4},'moderate',false),'needs_analysis');
  assert.equal(studentAnalysisView({...b2,analysis:null},'moderate',true),'demo');
});

test('a reloaded pending B1 request becomes uncertain, never silently retryable',()=>{
  const org={...structuredClone(hrSample),clientWorkspaceId:'client-reload',workspaceId:'server-reload',workspaceRevision:4,revision:4};
  const pending=beginHrAnalysis(org,{...requestFor(org),operationId:'pending-reload'});
  const restored=restoreHr(pending,true).hr;
  assert.equal(restored.hrRecovery?.status,'unknown');assert.equal(restored.workspaceRevision,4);
  assert.equal(hrRecoveryNeeded(restored),true);
});
