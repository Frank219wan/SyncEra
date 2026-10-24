import assert from 'node:assert/strict';
import test from 'node:test';
import {tvetSample} from '../src/data.ts';
import {studentAnalysisView} from '../src/hrState.ts';
import type {Organization} from '../src/types.ts';

const current=():Organization=>({
  ...structuredClone(tvetSample),
  revision:4,
  analyzedRevision:4,
  analysis:{mode:'career_centre',scenario:'moderate'} as Organization['analysis'],
});

test('ORG-FE-001: Demo mode retains the local example view',()=>{
  assert.equal(studentAnalysisView({...current(),analysis:null},'moderate',true),'demo');
});

test('ORG-FE-001: Real mode without a server analysis requires analysis',()=>{
  assert.equal(studentAnalysisView({...current(),analysis:null},'moderate',false),'needs_analysis');
});

test('Real B2 uses a connected result only for its current revision and scenario',()=>{
  assert.equal(studentAnalysisView(current(),'moderate',false),'connected');
});

test('Real B2 rejects a result from the HR mode',()=>{
  const org={...current(),analysis:{mode:'hr',scenario:'moderate'} as unknown as Organization['analysis']};
  assert.equal(studentAnalysisView(org,'moderate',false),'needs_analysis');
});

test('ORG-FE-002: Real B2 rejects an old profile revision',()=>{
  assert.equal(studentAnalysisView({...current(),revision:5},'moderate',false),'needs_analysis');
});

test('ORG-FE-002: Real B2 rejects an old scenario',()=>{
  assert.equal(studentAnalysisView(current(),'fast',false),'needs_analysis');
});
