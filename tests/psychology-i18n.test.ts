import test from 'node:test';
import assert from 'node:assert/strict';
import {psychologyReflectionItems} from '../src/psychologyCopy.ts';

test('all five psychology reflections have complete English, Chinese and Malay copy',()=>{
  assert.equal(psychologyReflectionItems.length,5);
  for(const item of psychologyReflectionItems){
    for(const copy of [item.title,item.situation,item.question,...item.options]){
      assert.equal(copy.length,3);
      assert.ok(copy.every(value=>value.trim().length>0));
      assert.equal(new Set(copy).size,3,'each locale must have its own translation');
    }
  }
});
