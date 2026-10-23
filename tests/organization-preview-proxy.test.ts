import test from 'node:test';
import assert from 'node:assert/strict';

import {handleProxy} from '../server/proxy.ts';

test('Organization integration branch may use only its protected Backend Preview alias',async()=>{
  const backendOrigin='https://syncera-backend-git-feature-organization-mvp-test-frank219wan.vercel.app';
  let requested='';
  const response=await handleProxy(new Request('https://frontend.example/api/proxy?proxy_path=health'),{
    VERCEL_ENV:'preview',
    BACKEND_PREVIEW_ORIGIN:backendOrigin,
    BACKEND_PROTECTION_BYPASS_SECRET:'organization-preview-test-secret',
  },async input=>{
    requested=String(input);
    return Response.json({data:{status:'ok'},meta:{}});
  });
  assert.equal(response.status,200);
  assert.equal(requested,`${backendOrigin}/api/v1/health`);
});

test('Organization origin allowlist still rejects main and arbitrary hosts',async()=>{
  for(const backendOrigin of [
    'https://syncera-backend-git-main-test-frank219wan.vercel.app',
    'https://attacker.example',
  ]){
    let forwarded=false;
    const response=await handleProxy(new Request('https://frontend.example/api/proxy?proxy_path=health'),{
      VERCEL_ENV:'preview',
      BACKEND_PREVIEW_ORIGIN:backendOrigin,
      BACKEND_PROTECTION_BYPASS_SECRET:'organization-preview-test-secret',
    },async()=>{forwarded=true;return Response.json({});});
    assert.equal(response.status,503);
    assert.equal(forwarded,false);
  }
});
