import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';
import {routeContextFromPath} from '../src/routing.ts';

test('sidebar program context follows the active URL',()=>{
  assert.deepEqual(routeContextFromPath('/individual/recommendations'),{workspace:'individual',program:'individual'});
  assert.deepEqual(routeContextFromPath('/organization/hr/heatmap'),{workspace:'organization',program:'hr'});
  assert.deepEqual(routeContextFromPath('/organization/tvet/cohort'),{workspace:'organization',program:'tvet'});
  assert.deepEqual(routeContextFromPath('/organization'),{workspace:'organization',program:'organization'});
  assert.deepEqual(routeContextFromPath('/individual/about'),{workspace:'individual',program:'individual'});
  assert.deepEqual(routeContextFromPath('/organization/about'),{workspace:'organization',program:'organization'});
  assert.deepEqual(routeContextFromPath('/organization/hr/about'),{workspace:'organization',program:'hr'});
  assert.deepEqual(routeContextFromPath('/organization/tvet/about'),{workspace:'organization',program:'tvet'});
});

test('changing routes cannot retain a previous workspace context',()=>{
  const first=routeContextFromPath('/organization/hr/intake');
  const next=routeContextFromPath('/individual/learning-journey');
  assert.equal(first.workspace,'organization');
  assert.equal(next.workspace,'individual');
});

test('Vercel rewrites page URLs without swallowing API and missing assets',()=>{
  const config=JSON.parse(readFileSync(new URL('../vercel.json',import.meta.url),'utf8')) as {
    rewrites:Array<{source:string;destination:string}>;
  };
  const rewrites=(path:string)=>config.rewrites.some(({source,destination})=>
    destination==='/index.html' && new RegExp(`^${source}$`).test(path));
  for(const path of [
    '/individual','/individual/radar','/individual/intake/start',
    '/individual/intake/profile','/individual/recommendations',
    '/organization','/organization/hr/intake','/about',
  ]) assert.equal(rewrites(path),true,`${path} should load the SPA`);
  for(const path of [
    '/api/v1/health','/openapi.json','/assets/missing.js',
    '/individual/missing.png','/organization/missing.css','/missing.js',
  ]) assert.equal(rewrites(path),false,`${path} must not return index.html`);
});
