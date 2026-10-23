import test from 'node:test';
import assert from 'node:assert/strict';
import {resolveRadarMode} from '../src/services/radar-mode.ts';

test('DOSM radar requires real API mode and an explicit frontend flag', () => {
  assert.equal(resolveRadarMode(true, 'true'), 'demo');
  assert.equal(resolveRadarMode(false, undefined), 'matching');
  assert.equal(resolveRadarMode(false, 'false'), 'matching');
  assert.equal(resolveRadarMode(false, 'TRUE'), 'matching');
  assert.equal(resolveRadarMode(false, 'true'), 'dosm');
});
