import assert from 'node:assert/strict';
import test from 'node:test';
import {learningProgress} from '../src/learningProgress.ts';

test('learning progress follows the actual number of tasks', () => {
  assert.deepEqual(learningProgress([{done: true}, {done: false}, {done: false}]), {
    done: 1, total: 3, percent: 33, complete: false,
  });
  assert.deepEqual(learningProgress([{done: true}, {done: true}]), {
    done: 2, total: 2, percent: 100, complete: true,
  });
});

test('an empty plan does not display complete progress', () => {
  assert.deepEqual(learningProgress([]), {
    done: 0, total: 0, percent: 0, complete: false,
  });
});
