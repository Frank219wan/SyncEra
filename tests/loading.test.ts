import assert from 'node:assert/strict';
import test from 'node:test';
import {loadingSceneForPath,PAGE_TRANSITION_MS,workspaceTransitionScene} from '../src/loading.ts';

test('loading art is only defined for individual and organization destinations',()=>{
  assert.equal(loadingSceneForPath('/'),null);
  assert.equal(loadingSceneForPath('/individual'),'bamboo');
  assert.equal(loadingSceneForPath('/individual/radar'),'bamboo');
  assert.equal(loadingSceneForPath('/organization'),'ivy');
  assert.equal(loadingSceneForPath('/organization/hr/training'),'ivy');
  assert.equal(loadingSceneForPath('/organization/tvet/trends'),'ivy');
  assert.equal(loadingSceneForPath('/organizational-news'),null);
  assert.ok(PAGE_TRANSITION_MS > 0 && PAGE_TRANSITION_MS < 2000);
});

test('animate entry, cross-workspace switches, and return to selection only',()=>{
  assert.equal(workspaceTransitionScene(null,'/individual/radar'),'bamboo');
  assert.equal(workspaceTransitionScene(null,'/organization/hr/training'),'ivy');
  assert.equal(workspaceTransitionScene(null,'/'),null);
  assert.equal(workspaceTransitionScene('/','/individual'),'bamboo');
  assert.equal(workspaceTransitionScene('/','/organization'),'ivy');
  assert.equal(workspaceTransitionScene('/individual/radar','/organization/hr/mobility'),'ivy');
  assert.equal(workspaceTransitionScene('/organization/hr/mobility','/individual'),'bamboo');
  assert.equal(workspaceTransitionScene('/individual','/individual/radar'),null);
  assert.equal(workspaceTransitionScene('/organization/hr/intake','/organization/hr/mobility'),null);
  assert.equal(workspaceTransitionScene('/organization/hr/intake','/organization/tvet/students'),null);
  assert.equal(workspaceTransitionScene('/individual/radar','/'),'home');
  assert.equal(workspaceTransitionScene('/organization/hr/mobility','/'),'home');
  assert.equal(workspaceTransitionScene('/missing','/'),null);
});
