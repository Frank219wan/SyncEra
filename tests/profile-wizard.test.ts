import assert from 'node:assert/strict';
import test from 'node:test';
import {sampleProfile} from '../src/data.ts';
import {canAdvanceProfileQuestion,PROFILE_QUESTION_COUNT} from '../src/profileWizard.ts';

test('only essential questions require an answer; interests, vision and work style are optional', () => {
  const blank = {...sampleProfile,stage:'',goal:'',occupation:'',education:'',interests:'',vision:'',region:''};
  for (const index of [0,1,2,3,10]) assert.equal(canAdvanceProfileQuestion(blank,index),false);
  for (const index of [4,5,6,7,8,9]) assert.equal(canAdvanceProfileQuestion(blank,index),true);
  assert.equal(canAdvanceProfileQuestion(sampleProfile,PROFILE_QUESTION_COUNT),false);
});
