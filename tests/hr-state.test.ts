import assert from 'node:assert/strict';
import test from 'node:test';
import {emptyHr,hrSample} from '../src/data.ts';
import {restoreHr} from '../src/hrState.ts';

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
