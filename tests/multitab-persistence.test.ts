import assert from 'node:assert/strict';
import test from 'node:test';
import {emptyProfile,hrSample,tvetSample} from '../src/data.ts';
import {createHrWorkspaceFromDraft,hrAnalysisView,restoreHr,studentAnalysisView} from '../src/hrState.ts';
import {runHrAnalysis} from '../src/hrAnalysisFlow.ts';
import {STORAGE_KEY} from '../src/individual-state.ts';
import {HR_EDITOR_LOCK,HR_STORAGE_KEY,isHrEditorRoute,readCanonicalHr,TabPersistence,type LocksPort,type StoragePort} from '../src/multitabPersistence.ts';
import type {AppState,HRAnalysis,Organization} from '../src/types.ts';

class SharedStorage implements StoragePort {
  values=new Map<string,string>();
  getItem(key:string){return this.values.get(key)??null;}
  setItem(key:string,value:string){this.values.set(key,value);}
}
class SharedLocks implements LocksPort {
  held=new Set<string>();
  waiters=new Map<string,Array<()=>void>>();
  async request<T>(name:string,options:{ifAvailable?:boolean},callback:(lock:object|null)=>T|Promise<T>):Promise<T>{
    if(this.held.has(name)){
      if(options.ifAvailable)return callback(null);
      await new Promise<void>(resolve=>this.waiters.set(name,[...(this.waiters.get(name)||[]),resolve]));
    }
    this.held.add(name);
    try{return await callback({});}
    finally{this.held.delete(name);this.waiters.get(name)?.shift()?.();}
  }
}
function state(revision=2):AppState {
  return {locale:'en',profile:structuredClone(emptyProfile),scenario:'moderate',selectedRole:'',results:null,
    snapshotId:'',serviceMeta:null,plan:null,hr:{...structuredClone(hrSample),clientWorkspaceId:'client-synthetic',
      workspaceId:'server-synthetic',workspaceRevision:revision,revision:revision,analyzedRevision:revision,
      hrAnalysis:{mode:'hr',workspaceId:'server-synthetic',workspaceRevision:revision,scenario:'moderate'} as HRAnalysis},
    hrProfileSaved:true,tvet:structuredClone(tvetSample)};
}
const tick=()=>new Promise<void>(resolve=>setImmediate(resolve));
test('only B1 work pages claim the editor lock',()=>{
  for(const path of ['/organization/hr/intake','/organization/hr/heatmap','/organization/hr/mobility',
    '/organization/hr/training','/organization/hr/dashboard','/organization/hr/department/synthetic'])
    assert.equal(isHrEditorRoute(path),true,path);
  for(const path of ['/','/individual','/individual/intake/start','/organization/tvet/students',
    '/organization/hr/about','/organization','/organization/hr/intake/extra'])
    assert.equal(isHrEditorRoute(path),false,path);
});
function fixture(initial=state()) {
  const storage=new SharedStorage(),locks=new SharedLocks();
  storage.setItem(STORAGE_KEY,JSON.stringify({schema:1,state:initial}));
  const make=(snapshot:AppState,onHrRoute=true)=>{
    const statuses:string[]=[];
    const tab=new TabPersistence(snapshot,storage,locks,status=>statuses.push(status));
    tab.start();
    if(onHrRoute)tab.setHrRoute(true);
    return {tab,statuses};
  };
  return {storage,locks,make};
}

test('two independent tabs: A confirms Rev 3; B old draft and Individual save cannot roll A back',async()=>{
  const f=fixture();const a=f.make(state()),b=f.make(state());
  await tick();assert.equal(a.tab.status,'active');assert.equal(b.tab.status,'blocked');
  await a.tab.persist(state());
  const request={clientWorkspaceId:'client-synthetic',workspaceId:'server-synthetic',workspaceRevision:2,
    revision:2,scenario:'moderate' as const,operationId:'synthetic-confirmed-op'};
  await a.tab.persist({...state(),hr:{...state().hr,hrAnalysis:null,hrRecovery:{status:'pending',request}}});
  const rev3={...state(3),hr:{...state(3).hr,hrAnalysis:null,analyzedRevision:2,
    hrRecovery:null,hrLastOperationId:request.operationId}};
  await a.tab.persist(rev3);
  const old={...state(),hr:{...state().hr,name:'Unsaved synthetic Tab B draft',revision:3},profile:{...state().profile,occupation:'Synthetic role'}};
  await b.tab.persist(old);
  assert.equal(readCanonicalHr(f.storage)?.hr.workspaceRevision,3);
  assert.equal(JSON.parse(f.storage.getItem(STORAGE_KEY)!).state.hr.workspaceRevision,3);
  assert.equal(JSON.parse(f.storage.getItem(STORAGE_KEY)!).state.profile.occupation,'Synthetic role');
  // A browser refresh reads the independent canonical record, never B's old blob.
  assert.equal(readCanonicalHr(f.storage)?.hr.workspaceRevision,3);
  b.tab.externalChange();assert.equal(b.tab.status,'conflict');
  a.tab.close();await tick();b.tab.retryEditor();await tick();
  assert.equal(b.tab.status,'conflict');
  assert.equal(old.hr.name,'Unsaved synthetic Tab B draft');
  b.tab.acceptLatest();assert.equal(b.tab.status,'active');
  await b.tab.persist(old); // stale component state, before React adopts the latest
  assert.equal(readCanonicalHr(f.storage)?.hr.workspaceRevision,3);
  await b.tab.persist({...old,hr:{...old.hr,name:'Another old synthetic edit'}});
  assert.equal(b.tab.status,'conflict');
  b.tab.close();
});

test('simultaneous analysis is limited to the active editor and pending survives refresh as unknown',async()=>{
  const f=fixture();const a=f.make(state()),b=f.make(state());await tick();
  await a.tab.persist(state());
  let calls=0;let complete!:(value:{analysis:HRAnalysis;meta:never})=>void;
  const delayed=new Promise<{analysis:HRAnalysis;meta:never}>(resolve=>{complete=resolve;});
  let current=state();const update=(change:(value:AppState)=>AppState)=>{current=change(current);};
  const run=runHrAnalysis(current,update,async()=>{calls++;return delayed;},undefined,request=>a.tab.reserveHrRequest(request,current));
  await tick();
  assert.equal(readCanonicalHr(f.storage)?.hr.hrRecovery?.status,'pending');
  assert.equal(restoreHr(readCanonicalHr(f.storage)?.hr,true).hr.hrRecovery?.status,'unknown');
  const blocked=await runHrAnalysis(state(),()=>{},async()=>{calls++;return delayed;},undefined,request=>b.tab.reserveHrRequest(request,state()));
  assert.equal(blocked.kind,'busy');assert.equal(calls,1);
  const analysis={mode:'hr',workspaceId:'server-synthetic',workspaceRevision:3,scenario:'moderate',snapshotId:'synthetic-snapshot'} as HRAnalysis;
  complete({analysis,meta:{requestId:'synthetic',snapshotId:'synthetic-snapshot',generatedAt:null,dataLabel:'synthetic',isMock:true,modelVersion:null} as never});
  await run;
  await a.tab.persist(current);
  assert.equal(readCanonicalHr(f.storage)?.hr.workspaceRevision,3);
  a.tab.close();b.tab.close();
});

test('lost response, confirmed 409 and cancelled recovery never retry or clear unknown CAS',async()=>{
  const f=fixture();const a=f.make(state());await tick();await a.tab.persist(state());
  let current=state();const update=(change:(value:AppState)=>AppState)=>{current=change(current);};
  let calls=0;
  const result=await runHrAnalysis(current,update,async()=>{calls++;throw new Error('response lost after server commit');},undefined,request=>a.tab.reserveHrRequest(request,current));
  assert.equal(result.kind,'unknown');await a.tab.persist(current);
  assert.equal(readCanonicalHr(f.storage)?.hr.workspaceRevision,2);
  assert.equal(readCanonicalHr(f.storage)?.hr.hrRecovery?.status,'unknown');
  const blocked=await runHrAnalysis(current,update,async()=>{calls++;throw new Error('unexpected');});
  assert.equal(blocked.kind,'busy');assert.equal(calls,1);
  const before=structuredClone(readCanonicalHr(f.storage)!.hr);
  // The UI's Keep current draft action changes only a local dialog flag.
  // Re-persisting unchanged state must leave the unresolved operation intact.
  await a.tab.persist(current);
  assert.deepEqual(readCanonicalHr(f.storage)?.hr,before);
  a.tab.close();

  const g=fixture();const c=g.make(state());await tick();await c.tab.persist(state());
  let conflictState=state();const change=(fn:(value:AppState)=>AppState)=>{conflictState=fn(conflictState);};
  const conflict=await runHrAnalysis(conflictState,change,async()=>{throw Object.assign(new Error('stale'),{status:409});},undefined,request=>c.tab.reserveHrRequest(request,conflictState));
  assert.equal(conflict.kind,'conflict');await c.tab.persist(conflictState);
  assert.equal(readCanonicalHr(g.storage)?.hr.hrRecovery?.status,'conflict');
  c.tab.close();
});

test('explicit new workspace preserves synthetic draft but clears old identity and recovery',async()=>{
  const f=fixture();const a=f.make(state());await tick();await a.tab.persist(state());
  const pending={...state().hr,hrAnalysis:null,hrRecovery:{status:'unknown' as const,request:{clientWorkspaceId:'client-synthetic',workspaceId:'server-synthetic',workspaceRevision:2,revision:2,scenario:'moderate' as const,operationId:'synthetic-op'}}};
  await a.tab.persist({...state(),hr:pending});
  const fresh=createHrWorkspaceFromDraft({...pending,name:'Synthetic separate draft'});
  await a.tab.persist({...state(),hr:fresh});
  assert.equal(readCanonicalHr(f.storage)?.hr.workspaceId,undefined);
  assert.equal(readCanonicalHr(f.storage)?.hr.workspaceRevision,undefined);
  assert.equal(readCanonicalHr(f.storage)?.hr.hrRecovery,null);
  assert.equal(readCanonicalHr(f.storage)?.hr.name,'Synthetic separate draft');
  assert.deepEqual(readCanonicalHr(f.storage)?.hr.previousWorkspaceIds,['server-synthetic']);
  a.tab.close();
});

test('old same-workspace writes cannot erase unknown recovery or revive an old analysis',async()=>{
  const f=fixture();const a=f.make(state());await tick();await a.tab.persist(state());
  const request={clientWorkspaceId:'client-synthetic',workspaceId:'server-synthetic',workspaceRevision:2,
    revision:2,scenario:'moderate' as const,operationId:'synthetic-unknown'};
  const unknown={...state(),hr:{...state().hr,hrAnalysis:null,hrRecovery:{status:'unknown' as const,request}}};
  await a.tab.persist(unknown);
  assert.equal(readCanonicalHr(f.storage)?.hr.hrRecovery?.status,'unknown');
  await a.tab.persist({...state(),hr:{...state().hr,name:'Old synthetic input'}});
  assert.equal(a.tab.status,'conflict');
  assert.equal(readCanonicalHr(f.storage)?.hr.hrRecovery?.status,'unknown');
  assert.equal(readCanonicalHr(f.storage)?.hr.hrAnalysis,null);
  a.tab.close();
});

test('a bounded retry obtains the editor lock after a StrictMode-style mount replay',async()=>{
  const f=fixture();const first=f.make(state());await tick();assert.equal(first.tab.status,'active');
  const replay=f.make(state());await tick();assert.equal(replay.tab.status,'blocked');
  first.tab.close();
  await new Promise<void>(resolve=>setTimeout(resolve,140));
  assert.equal(replay.tab.status,'active');replay.tab.close();
});

test('blocked B1 does not degrade B2 or Individual data, and unsupported locks fail closed for B1',async()=>{
  const f=fixture();const a=f.make(state()),b=f.make(state());await tick();await a.tab.persist(state());
  const updated={...state(),tvet:{...state().tvet,name:'Synthetic B2 change'},profile:{...state().profile,occupation:'Synthetic Individual change'}};
  await b.tab.persist(updated);
  const saved=JSON.parse(f.storage.getItem(STORAGE_KEY)!).state as AppState;
  assert.equal(saved.tvet.name,'Synthetic B2 change');assert.equal(saved.profile.occupation,'Synthetic Individual change');
  assert.equal(saved.hr.workspaceRevision,2);
  assert.equal(studentAnalysisView(saved.tvet,'moderate',false),'needs_analysis');
  assert.equal(hrAnalysisView(saved.hr,'moderate',false),'connected');
  a.tab.close();b.tab.close();
  const unsupported=new TabPersistence(saved,f.storage,undefined,()=>{});unsupported.start();
  assert.equal(unsupported.status,'unsupported');
  await unsupported.persist({...saved,hr:{...saved.hr,workspaceRevision:1},profile:{...saved.profile,occupation:'Still works'}});
  assert.equal(readCanonicalHr(f.storage)?.hr.workspaceRevision,2);
  assert.equal(JSON.parse(f.storage.getItem(STORAGE_KEY)!).state.profile.occupation,'Still works');
});

test('an external scenario change stops a stale B1 analysis before HTTP',async()=>{
  const f=fixture();const a=f.make(state()),b=f.make(state());await tick();await a.tab.persist(state());
  await b.tab.persist({...state(),scenario:'fast'});
  let current=state(),calls=0;
  const result=await runHrAnalysis(current,change=>{current=change(current);},async()=>{
    calls++;throw new Error('must not run');
  },undefined,request=>a.tab.reserveHrRequest(request,current));
  assert.equal(result.kind,'busy');assert.equal(calls,0);
  assert.equal(readCanonicalHr(f.storage)?.hr.workspaceRevision,2);
  a.tab.close();b.tab.close();
});

test('Home, Individual and B2 tabs never claim the B1 lock; B1 navigation and tab close release it',async()=>{
  const f=fixture();
  const home=f.make(state(),false);
  await tick();
  assert.equal(home.tab.status,'inactive');
  assert.equal(f.locks.held.has(HR_EDITOR_LOCK),false);
  const b1=f.make(state());await tick();
  assert.equal(b1.tab.status,'active');
  await b1.tab.persist(state());
  await home.tab.persist({...state(),profile:{...state().profile,occupation:'Synthetic Individual edit'},
    tvet:{...state().tvet,name:'Synthetic B2 edit'}});
  assert.equal(b1.tab.status,'active');
  assert.equal(readCanonicalHr(f.storage)?.hr.workspaceRevision,2);
  home.tab.setHrRoute(true);await tick();
  assert.equal(home.tab.status,'blocked');
  home.tab.setHrRoute(false);
  assert.equal(home.tab.status,'inactive');
  b1.tab.setHrRoute(false);await tick();
  assert.equal(f.locks.held.has(HR_EDITOR_LOCK),false);
  home.tab.setHrRoute(true);await tick();
  assert.equal(home.tab.status,'conflict');
  home.tab.acceptLatest();assert.equal(home.tab.status,'active');
  home.tab.close();await tick();
  b1.tab.setHrRoute(true);await tick();
  assert.equal(b1.tab.status,'active');
  b1.tab.close();
});

test('navigation during a pending B1 request retains lock until a confirmed outcome is persisted',async()=>{
  const f=fixture();const a=f.make(state()),b=f.make(state(),false);await tick();
  await a.tab.persist(state());
  const request={clientWorkspaceId:'client-synthetic',workspaceId:'server-synthetic',workspaceRevision:2,
    revision:2,scenario:'moderate' as const,operationId:'synthetic-navigation-op'};
  assert.equal(await a.tab.reserveHrRequest(request,state()),true);
  a.tab.setHrRoute(false);
  assert.equal(f.locks.held.has(HR_EDITOR_LOCK),true);
  b.tab.setHrRoute(true);await tick();
  assert.equal(b.tab.status,'blocked');
  await a.tab.persist({...state(),hr:{...state().hr,hrAnalysis:null,
    hrRecovery:{status:'unknown',request}}});
  await tick();
  assert.equal(f.locks.held.has(HR_EDITOR_LOCK),false);
  b.tab.retryEditor();await tick();
  assert.equal(b.tab.status,'conflict');
  assert.equal(readCanonicalHr(f.storage)?.hr.hrRecovery?.status,'unknown');
  a.tab.close();b.tab.close();
});

test('closing a tab during pending releases its browser lock while refreshed B1 stays fail closed',async()=>{
  const f=fixture();const a=f.make(state());await tick();await a.tab.persist(state());
  const request={clientWorkspaceId:'client-synthetic',workspaceId:'server-synthetic',workspaceRevision:2,
    revision:2,scenario:'moderate' as const,operationId:'synthetic-close-op'};
  assert.equal(await a.tab.reserveHrRequest(request,state()),true);
  a.tab.close();await tick();
  assert.equal(f.locks.held.has(HR_EDITOR_LOCK),false);
  const restored={...state(),hr:restoreHr(readCanonicalHr(f.storage)!.hr,true).hr};
  assert.equal(restored.hr.hrRecovery?.status,'unknown');
  const b=f.make(restored);await tick();
  assert.equal(b.tab.status,'active');
  assert.equal(await b.tab.reserveHrRequest(request,restored),false);
  b.tab.close();
});
