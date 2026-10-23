import assert from 'node:assert/strict';
import test from 'node:test';
import {emptyProfile} from '../src/data.ts';
import {canConfirmPersonalProfile,editPersonalField,hasPersonalValue,parseGoalTags,unconfirmedPersonalProfile} from '../src/profilePersonalization.ts';

test('all three optional personal dimensions may be empty without blocking review',()=>{
  assert.equal(canConfirmPersonalProfile(emptyProfile),true);
  for(const field of ['interests','vision','workStyle'] as const)assert.equal(hasPersonalValue(emptyProfile,field),false);
});

test('user-edited goal tags are deduplicated and require explicit reconfirmation',()=>{
  const tags=parseGoalTags('learning, impact，learning');
  assert.deepEqual(tags,['learning','impact']);
  const draft=editPersonalField({...emptyProfile,personalConfirmed:{vision:true}},'vision',{goalTags:tags});
  assert.equal(draft.personalSources?.vision,'self_reported');
  assert.equal(draft.personalConfirmed?.vision,false);
  assert.equal(hasPersonalValue(draft,'vision'),true);
  assert.equal(canConfirmPersonalProfile(draft),false);
  assert.equal(canConfirmPersonalProfile({...draft,personalConfirmed:{vision:true}}),true);
});

test('work-style self-report is separate from MBTI and CV data',()=>{
  const draft=editPersonalField(emptyProfile,'workStyle',{workStyle:{collaboration:'team',pace:'',structure:''}});
  assert.equal(hasPersonalValue(draft,'workStyle'),true);
  assert.equal(draft.mbti,'');
  assert.equal(draft.personalSources?.workStyle,'self_reported');
  assert.equal(unconfirmedPersonalProfile({...draft,personalConfirmed:{workStyle:true}}).personalConfirmed?.workStyle,false);
});
