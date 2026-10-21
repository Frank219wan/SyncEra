import test from 'node:test';
import assert from 'node:assert/strict';
import {roles} from '../src/data.ts';
import {demoSkillCoverage,skillMovement} from '../src/trendSemantics.ts';

test('demo skill coverage counts role inclusion, not role trend strength',()=>{
  const first=demoSkillCoverage(roles);
  const changed=demoSkillCoverage(roles.map(role=>({...role,signal:0,trend:'stable' as const})));
  assert.deepEqual(first,changed);
  assert.ok(first.every(([,count])=>count>=1&&count<=roles.length));
});

test('skill movement requires a matching comparable change metric',()=>{
  assert.equal(skillMovement({label:'rising',change:null}),null);
  assert.equal(skillMovement({label:'rising',change:-2}),null);
  assert.equal(skillMovement({label:'current_snapshot',change:2}),null);
  assert.equal(skillMovement({label:'rising',change:2}),'rising');
  assert.equal(skillMovement({label:'declining',change:-2}),'declining');
});
