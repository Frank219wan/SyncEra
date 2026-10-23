import test from 'node:test';
import assert from 'node:assert/strict';
import {emptyProfile,emptyHr,tvetSample} from '../src/data.ts';
import type {AppState} from '../src/types.ts';
import {persistAppState,resetIndividualState,STORAGE_KEY} from '../src/individual-state.ts';

test('starting a new profile clears only Individual browser state and survives storage round-trip', () => {
  const old:AppState={
    locale:'zh',profile:{...structuredClone(emptyProfile),id:'profile_fictional_old',revision:7,
      stage:'graduate',goal:'switch',occupation:'Fictional analyst',
      psychology:{assessment_version:'1.0',assessment_type:'self_report_reflection',
        scenario_answers:{S1:'E',S2:null,S3:'B',S4:'C',S5:'D'},other_responses:{S1:'Fictional answer'},consent_to_personalization:true}},
    scenario:'fast',selectedRole:'data-analyst',results:[],snapshotId:'snap_old',serviceMeta:{requestId:'req_old',snapshotId:'snap_old',generatedAt:null,dataLabel:'synthetic_demo',isMock:true,modelVersion:'test'},
    trendPackage:null,plan:null,draft:null,archivedPlans:[],hr:structuredClone(emptyHr),hrProfileSaved:true,tvet:structuredClone(tvetSample),
  };
  const before=structuredClone(old);
  const fresh=resetIndividualState(old);
  assert.equal(fresh.profile.id,'');
  assert.equal(fresh.profile.revision,undefined);
  assert.equal(fresh.profile.stage,'');
  assert.equal(fresh.profile.goal,'');
  assert.equal(fresh.profile.psychology,undefined);
  assert.equal(fresh.results,null);
  assert.equal(fresh.snapshotId,'');
  assert.equal(fresh.scenario,'moderate');
  assert.equal(fresh.selectedRole,'');
  assert.equal(fresh.plan,null);
  assert.deepEqual(fresh.archivedPlans,[]);
  assert.equal(fresh.locale,'zh');
  assert.deepEqual(fresh.hr,before.hr);
  assert.deepEqual(fresh.tvet,before.tvet);
  assert.equal(fresh.hrProfileSaved,true);
  assert.deepEqual(old,before,'reset must not mutate the previous draft, including cancel paths');

  const writes=new Map<string,string>();
  const previous=Object.getOwnPropertyDescriptor(globalThis,'localStorage');
  Object.defineProperty(globalThis,'localStorage',{configurable:true,value:{setItem:(key:string,value:string)=>writes.set(key,value)}});
  try {persistAppState(fresh);} finally {
    if(previous)Object.defineProperty(globalThis,'localStorage',previous);
    else Reflect.deleteProperty(globalThis,'localStorage');
  }
  assert.deepEqual([...writes.keys()],[STORAGE_KEY]);
  const restored=JSON.parse(writes.get(STORAGE_KEY) ?? '{}');
  assert.equal(restored.schema,1);
  assert.equal(restored.state.profile.id,'');
  assert.equal(restored.state.locale,'zh');
  assert.deepEqual(restored.state.hr,before.hr);
});
