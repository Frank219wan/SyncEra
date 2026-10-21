import assert from 'node:assert/strict';
import test from 'node:test';
import {routeContextFromPath} from '../src/routing.ts';

test('sidebar program context follows the active URL',()=>{
  assert.deepEqual(routeContextFromPath('/individual/recommendations'),{workspace:'individual',program:'individual'});
  assert.deepEqual(routeContextFromPath('/organization/hr/heatmap'),{workspace:'organization',program:'hr'});
  assert.deepEqual(routeContextFromPath('/organization/tvet/cohort'),{workspace:'organization',program:'tvet'});
  assert.deepEqual(routeContextFromPath('/organization'),{workspace:'organization',program:'organization'});
});

test('changing routes cannot retain a previous workspace context',()=>{
  const first=routeContextFromPath('/organization/hr/intake');
  const next=routeContextFromPath('/individual/learning-journey');
  assert.equal(first.workspace,'organization');
  assert.equal(next.workspace,'individual');
});
