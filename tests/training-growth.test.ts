import assert from 'node:assert/strict';
import test from 'node:test';
import {reviewedTrainingStages} from '../src/trainingProgress.ts';

test('ivy starts as a seedling with no reviewed training stages',()=>{
  assert.equal(reviewedTrainingStages({},'EMP-001','ai'),0);
  assert.equal(reviewedTrainingStages({'EMP-001:ai':['0']},'','ai'),0);
});

test('ivy grows only for the selected employee and target skill',()=>{
  const training={
    'EMP-001:ai':['0','1'],
    'EMP-001:data':['0'],
    'EMP-002:ai':['0','1','2'],
  };
  assert.equal(reviewedTrainingStages(training,'EMP-001','ai'),2);
  assert.equal(reviewedTrainingStages(training,'EMP-001','data'),1);
  assert.equal(reviewedTrainingStages(training,'EMP-002','ai'),3);
  assert.equal(reviewedTrainingStages(training,'EMP-002','data'),0);
});

test('duplicate or unknown checkpoint IDs cannot inflate ivy growth',()=>{
  const training={'EMP-001:ai':['0','0','2','unexpected']};
  assert.equal(reviewedTrainingStages(training,'EMP-001','ai'),2);
});
