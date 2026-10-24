import assert from 'node:assert/strict';
import test from 'node:test';
import {currentRoleRecommendation,roleDetailContext} from '../src/pages/connectedRoleDetailState.ts';
import type {Recommendation} from '../src/types.ts';

const current:Recommendation={roleId:'synthetic-unknown-role',roleName:'Synthetic Unknown Role',rank:1,matchScore:73,origin:'computed',
  strengths:['sql'],skillGaps:[{skillId:'python',name:'Python',currentLevel:1,targetLevel:3,importance:'high'}],
  reason:'Synthetic service explanation',evidenceIds:['ev_synthetic_1'],uncertainty:'Synthetic uncertainty'};
const context=roleDetailContext(current.roleId,'profile_synthetic',3,'snap_synthetic','moderate');

test('real role detail accepts a service role outside the demo catalogue with its unaltered data',()=>{
  assert.deepEqual(currentRoleRecommendation([current],context,context,current.roleId),current);
  assert.equal(currentRoleRecommendation([current],context,context,'different-role'),null);
});

test('scenario, profile revision, profile identity and snapshot changes hide stale results',()=>{
  for(const next of [
    roleDetailContext(current.roleId,'profile_synthetic',3,'snap_synthetic','fast'),
    roleDetailContext(current.roleId,'profile_synthetic',4,'snap_synthetic','moderate'),
    roleDetailContext(current.roleId,'another_profile',3,'snap_synthetic','moderate'),
    roleDetailContext(current.roleId,'profile_synthetic',3,'new_snapshot','moderate'),
  ])assert.equal(currentRoleRecommendation([current],context,next,current.roleId),null);
});

test('demo-origin rows cannot populate the connected role detail',()=>{
  assert.equal(currentRoleRecommendation([{...current,origin:'demo'}],context,context,current.roleId),null);
  assert.equal(currentRoleRecommendation(null,context,context,current.roleId),null);
});
