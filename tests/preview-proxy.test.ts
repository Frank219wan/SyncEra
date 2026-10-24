import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { handleProxy } from '../server/proxy.ts';

const frontend = 'https://syncera-frontend-git-integration-postgres-pr-e72229-frank219wan.vercel.app';
const backend = 'https://syncera-backend-git-integration-postgres-pre-a79754-frank219wan.vercel.app';
const env = {
  VERCEL_ENV: 'preview', BACKEND_PREVIEW_ORIGIN: backend,
  BACKEND_PROTECTION_BYPASS_SECRET: 'test-secret-never-deployed',
};
const rewrite = JSON.parse(readFileSync(new URL('../vercel.json', import.meta.url), 'utf8')).rewrites[0];
let requestNumber = 0;
// Vercel appends the named source capture as a query parameter when the
// destination does not consume it. The original query string is preserved.
const request = (pathAndQuery: string, init?: RequestInit) => {
  assert.equal(rewrite.source, '/api/v1/:proxy_path*');
  assert.equal(rewrite.destination, '/api/proxy');
  const [path, query = ''] = pathAndQuery.split('?', 2);
  const rewritten = new URL(rewrite.destination, frontend);
  for (const [key, value] of new URLSearchParams(query)) rewritten.searchParams.append(key, value);
  rewritten.searchParams.append('proxy_path', path);
  const headers = new Headers(init?.headers);
  headers.set('X-Forwarded-For', `test-${++requestNumber}`);
  return new Request(rewritten, { ...init, headers });
};
const neverFetch: typeof fetch = async () => { throw new Error('unexpected upstream call'); };

test('Preview GET uses the fixed backend and keeps bypass secret server side', async () => {
  let calls = 0;
  const response = await handleProxy(request('health'), env, async (url, init) => {
    calls++;
    assert.equal(url.toString(), `${backend}/api/v1/health`);
    assert.equal(new Headers(init?.headers).get('x-vercel-protection-bypass'), env.BACKEND_PROTECTION_BYPASS_SECRET);
    assert.equal(new Headers(init?.headers).get('cookie'), null);
    return Response.json({ data: { status: 'ok' }, meta: {} }, { headers: { 'Set-Cookie': 'secret=bad' } });
  });
  assert.equal(calls, 1);
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('set-cookie'), null);
  assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.doesNotMatch(await response.text(), /test-secret/);
});

test('new Individual integration branch may use only its protected Backend Preview alias', async () => {
  const integrationBackend = 'https://syncera-backend-git-integration-career-radar-37d9a9-frank219wan.vercel.app';
  const response = await handleProxy(request('health'), { ...env, BACKEND_PREVIEW_ORIGIN: integrationBackend }, async url => {
    assert.equal(url.toString(), `${integrationBackend}/api/v1/health`);
    return Response.json({ data: { status: 'ok' }, meta: {} });
  });
  assert.equal(response.status, 200);
  const backwardCompatibleAlias = 'https://syncera-backend-git-integration-career-rada-28608c-frank219wan.vercel.app';
  const oldAliasResponse = await handleProxy(request('health'), { ...env, BACKEND_PREVIEW_ORIGIN: backwardCompatibleAlias }, async () => Response.json({ data: { status: 'ok' }, meta: {} }));
  assert.equal(oldAliasResponse.status, 200);
  const arbitraryBranch = 'https://syncera-backend-git-main-28608c-frank219wan.vercel.app';
  assert.equal((await handleProxy(request('health'), { ...env, BACKEND_PREVIEW_ORIGIN: arbitraryBranch }, neverFetch)).status, 503);
});

test('rejects production, missing configuration, arbitrary routes and methods', async () => {
  assert.equal((await handleProxy(request('health'), { ...env, VERCEL_ENV: 'production' }, neverFetch)).status, 503);
  assert.equal((await handleProxy(request('health'), { ...env, BACKEND_PROTECTION_BYPASS_SECRET: '' }, neverFetch)).status, 503);
  assert.equal((await handleProxy(request('health'), { ...env, BACKEND_PREVIEW_ORIGIN: 'https://evil.example' }, neverFetch)).status, 503);
  assert.equal((await handleProxy(request('admin/trends/refresh'), env, neverFetch)).status, 404);
  assert.equal((await handleProxy(request('profiles/upload/other', { method: 'POST' }), env, neverFetch)).status, 404);
  assert.equal((await handleProxy(request('health', { method: 'DELETE' }), env, neverFetch)).status, 405);
  assert.equal((await handleProxy(request('profiles/../health'), env, neverFetch)).status, 404);
  assert.equal((await handleProxy(request('health?target=https://evil.example'), env, neverFetch)).status, 400);
  assert.equal((await handleProxy(request('health?path=health'), env, neverFetch)).status, 400);
  assert.equal((await handleProxy(request('health?proxy_path=health'), env, neverFetch)).status, 404);
});

test('protected synthetic-only Production requires explicit config and exact Backend hostname', async () => {
  const productionEnv = {
    VERCEL_ENV: 'production',
    ENABLE_SYNTHETIC_PRODUCTION: '1',
    BACKEND_PRODUCTION_ORIGIN: 'https://syncera-backend.vercel.app',
    BACKEND_PRODUCTION_BYPASS_SECRET: 'synthetic-production-test-only',
  };
  assert.equal((await handleProxy(request('health'), {...productionEnv, ENABLE_SYNTHETIC_PRODUCTION:'0'}, neverFetch)).status, 503);
  assert.equal((await handleProxy(request('health'), {...productionEnv, BACKEND_PRODUCTION_BYPASS_SECRET:''}, neverFetch)).status, 503);
  assert.equal((await handleProxy(request('health'), {...productionEnv, BACKEND_PRODUCTION_ORIGIN:'https://syncera-backend.vercel.app/'}, neverFetch)).status, 503);
  assert.equal((await handleProxy(request('health'), {...productionEnv, BACKEND_PRODUCTION_ORIGIN:'https://attacker.example'}, neverFetch)).status, 503);
  assert.equal((await handleProxy(request('health'), {...productionEnv, BACKEND_PRODUCTION_ORIGIN:'https://syncera-backend-rjq2c2trd-frank219wan.vercel.app'}, neverFetch)).status, 503);
  const actual = await handleProxy(request('health'), productionEnv, async (url, init) => {
    assert.equal(url.toString(), 'https://syncera-backend.vercel.app/api/v1/health');
    assert.equal(new Headers(init?.headers).get('x-vercel-protection-bypass'), productionEnv.BACKEND_PRODUCTION_BYPASS_SECRET);
    return Response.json({data:{status:'ok'},meta:{}});
  });
  assert.equal(actual.status, 200);
  assert.equal((await handleProxy(request('profiles/upload', {method:'POST'}), productionEnv, neverFetch)).status, 404);
  assert.equal((await handleProxy(request('profiles/normalize',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({synthetic_input:false})}), productionEnv, neverFetch)).status, 422);
});

test('Vercel share tokens are accepted once but never forwarded to FastAPI', async () => {
  const token = 'fictionalVercelShareToken12345678';
  const response = await handleProxy(request('health?_vercel_share='+token), env, async (url) => {
    assert.equal(url.toString(), backend+'/api/v1/health');
    assert.equal(new URL(url).searchParams.has('_vercel_share'), false);
    return Response.json({data:{status:'ok'},meta:{}});
  });
  assert.equal(response.status,200);
  assert.equal((await handleProxy(request('health?_vercel_share='+token+'&_vercel_share='+token),env,neverFetch)).status,400);
  assert.equal((await handleProxy(request('health?_vercel_share=bad'),env,neverFetch)).status,400);
  assert.equal((await handleProxy(request('health?_vercel_share='+token+'&unexpected=1'),env,neverFetch)).status,400);
  const forward = await handleProxy(request('trends/roles?region=MY&_vercel_share='+token), env, async (url) => {
    assert.equal(url.toString(),backend+'/api/v1/trends/roles?region=MY');
    return Response.json({data:{items:[]},meta:{}});
  });
  assert.equal(forward.status,200);
});

test('ChatGPT referral utm_source is accepted only for chatgpt.com and never forwarded', async () => {
  const response = await handleProxy(request('health?utm_source=chatgpt.com'), env, async (url) => {
    assert.equal(url.toString(), backend+'/api/v1/health');
    assert.equal(new URL(url).searchParams.has('utm_source'), false);
    return Response.json({data:{status:'ok'},meta:{}});
  });
  assert.equal(response.status, 200);
  assert.equal((await handleProxy(request('health?utm_source=example.com'),env,neverFetch)).status,400);
  assert.equal((await handleProxy(request('health?utm_source=chatgpt.com&utm_source=chatgpt.com'),env,neverFetch)).status,400);
  assert.equal((await handleProxy(request('health?utm_source=chatgpt.com&unexpected=1'),env,neverFetch)).status,400);
  const radar = await handleProxy(request('trends/roles?region=MY&utm_source=chatgpt.com'),env,async(url)=>{
    assert.equal(url.toString(), backend+'/api/v1/trends/roles?region=MY');
    return Response.json({data:{items:[]},meta:{}});
  });
  assert.equal(radar.status,200);
});

test('Vercel rewrite preserves only approved user query parameters upstream', async () => {
  const response = await handleProxy(request('trends/roles?region=MY&limit=50'), env, async (url) => {
    assert.equal(url.toString(), `${backend}/api/v1/trends/roles?region=MY&limit=50`);
    assert.equal(new URL(url).searchParams.has('proxy_path'), false);
    return Response.json({ data: { items: [], next_cursor: null }, meta: {} });
  });
  assert.equal(response.status, 200);
  assert.equal((await handleProxy(request('trends/roles?region=MY&unexpected=1'), env, neverFetch)).status, 400);
});

test('DOSM market radar permits only GET and a single valid reporting period', async () => {
  for (const path of ['market/radar', 'market/radar?period=2026-Q2']) {
    const response = await handleProxy(request(path), env, async (url, init) => {
      assert.equal(url.toString(), `${backend}/api/v1/${path}`);
      assert.equal(init?.method, 'GET');
      assert.equal(new Headers(init?.headers).get('x-vercel-protection-bypass'), env.BACKEND_PROTECTION_BYPASS_SECRET);
      assert.equal(new Headers(init?.headers).get('cookie'), null);
      return Response.json({data:{period:'2026-Q2'},meta:{request_id:'req_fictional'}});
    });
    assert.equal(response.status, 200);
    assert.doesNotMatch(await response.text(), /test-secret-never-deployed/);
  }
  assert.equal((await handleProxy(request('market/radar?period=2026-Q2&unexpected=1'), env, neverFetch)).status, 400);
  assert.equal((await handleProxy(request('market/radar?period=2026-Q2&period=2026-Q1'), env, neverFetch)).status, 400);
  assert.equal((await handleProxy(request('market/radar?period=bad'), env, neverFetch)).status, 400);
  assert.equal((await handleProxy(request('market/radar', {method:'POST',headers:{'Content-Type':'application/json'},body:'{}'}), env, neverFetch)).status, 404);
  assert.equal((await handleProxy(request('market/radar'), {...env,VERCEL_ENV:'production'}, neverFetch)).status, 503);
  assert.equal((await handleProxy(request('market/radar'), {...env,BACKEND_PREVIEW_ORIGIN:'https://evil.example'}, neverFetch)).status, 503);
});

test('old Vercel rewrite shape reproduces BAD_QUERY for the auto-added path capture', async () => {
  const oldRewrite = new Request(`${frontend}/api/proxy?proxy_path=health&path=health`);
  const response = await handleProxy(oldRewrite, env, neverFetch);
  assert.equal(response.status, 400);
  assert.equal((await response.json()).error.code, 'BAD_QUERY');
});

test('POST requires same-origin JSON and fictional input', async () => {
  const post = (body: string, headers: Record<string, string> = {}) => request('profiles/normalize', {
    method: 'POST', headers: { Origin: frontend, 'Content-Type': 'application/json', ...headers }, body,
  });
  assert.equal((await handleProxy(post('{"synthetic_input":false}'), env, neverFetch)).status, 422);
  assert.equal((await handleProxy(post('{broken'), env, neverFetch)).status, 400);
  assert.equal((await handleProxy(post('{}', { Origin: 'https://evil.example' }), env, neverFetch)).status, 403);
  assert.equal((await handleProxy(post(JSON.stringify({ synthetic_input: true, text: 'x'.repeat(70_000) })), env, neverFetch)).status, 413);
  let called = false;
  const response = await handleProxy(post('{"synthetic_input":true,"text":"Fictional example"}'), env, async (url, init) => {
    called = true;
    assert.equal(url.toString(), `${backend}/api/v1/profiles/normalize`);
    assert.match(String(init?.body), /Fictional example/);
    return Response.json({ error: { code: 'REVISION_CONFLICT' }, meta: {} }, { status: 409 });
  });
  assert.equal(called, true);
  assert.equal(response.status, 409);
});

test('fictional B1 and B2 organization analyses reach only their exact allowlisted routes',async()=>{
  const body=JSON.stringify({schema_version:'organization-v0.1',synthetic_input:true,reviewed_by_user:true});
  const post=(value:string)=>request('organizations/career_centre/analyze',{method:'POST',headers:{Origin:frontend,'Content-Type':'application/json'},body:value});
  const response=await handleProxy(post(body),env,async(url,init)=>{
    assert.equal(url.toString(),`${backend}/api/v1/organizations/career_centre/analyze`);
    assert.equal(init?.method,'POST');
    assert.equal(new Headers(init?.headers).get('x-vercel-protection-bypass'),env.BACKEND_PROTECTION_BYPASS_SECRET);
    return Response.json({data:{mode:'career_centre'},meta:{}});
  });
  assert.equal(response.status,200);
  assert.equal((await handleProxy(post(JSON.stringify({synthetic_input:false})),env,neverFetch)).status,422);
  const hr=await handleProxy(request('organizations/hr/analyze',{method:'POST',headers:{Origin:frontend,'Content-Type':'application/json'},body}),env,async(url)=>{
    assert.equal(url.toString(),`${backend}/api/v1/organizations/hr/analyze`);
    return Response.json({data:{mode:'hr'},meta:{}});
  });
  assert.equal(hr.status,200);
});

test('recommendation analysis version header is forwarded only for the allowed route', async () => {
  const post = (path: string, value: string) => request(path, {
    method: 'POST', headers: { Origin: frontend, 'Content-Type': 'application/json',
      'X-Recommendation-Analysis': value }, body: '{}',
  });
  const fetchWith = (expected: string | null): typeof fetch => async (_url, init) => {
    assert.equal(new Headers(init?.headers).get('X-Recommendation-Analysis'), expected);
    return Response.json({ data: {}, meta: {} });
  };
  assert.equal((await handleProxy(post('recommendations', 'v1'), env, fetchWith('v1'))).status, 200);
  assert.equal((await handleProxy(post('recommendations', 'unknown'), env, fetchWith(null))).status, 200);
  assert.equal((await handleProxy(post('profiles/confirm', 'v1'), env, fetchWith(null))).status, 200);
});

const constraints = JSON.stringify({ weekly_hours: 5, budget_amount: 0, currency: 'MYR', language: 'en', target_weeks: 12, learning_pace: 'focused' });
function uploadRequest(name = 'fictional.pdf', content = '%PDF-fictional', type = 'application/pdf', override?: (form: FormData) => void) {
  const form = new FormData();
  form.append('file', new Blob([content], { type }), name);
  form.append('synthetic_input', 'true');
  form.append('study_constraints', constraints);
  override?.(form);
  return request('profiles/upload', { method: 'POST', headers: { Origin: frontend }, body: form });
}

test('only synthetic PDF/DOCX multipart reaches the exact backend upload route', async () => {
  for (const [name, content, type] of [
    ['fictional.pdf', '%PDF-fictional', 'application/pdf'],
    ['fictional.docx', 'PK\x03\x04fictional', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
  ]) {
    const response = await handleProxy(uploadRequest(name, content, type), env, async (url, init) => {
      assert.equal(url.toString(), `${backend}/api/v1/profiles/upload`);
      const headers = new Headers(init?.headers);
      assert.equal(headers.get('content-type'), null); // fetch generates a fresh boundary
      assert.equal(headers.get('cookie'), null);
      assert.equal(headers.get('x-vercel-protection-bypass'), env.BACKEND_PROTECTION_BYPASS_SECRET);
      assert.ok(init?.body instanceof FormData);
      const form = init.body as FormData;
      assert.deepEqual([...form.keys()].sort(), ['file', 'study_constraints', 'synthetic_input']);
      assert.equal(form.get('synthetic_input'), 'true');
      assert.deepEqual(JSON.parse(String(form.get('study_constraints'))), JSON.parse(constraints));
      assert.equal((form.get('file') as File).name, name);
      assert.equal(init.signal?.aborted, false);
      return Response.json({ data: { profile: { profile_id: 'profile_fictional', reviewed_by_user: false } }, meta: { is_mock: true } });
    });
    assert.equal(response.status, 200);
    assert.equal((await response.json()).data.profile.reviewed_by_user, false);
  }
});

test('upload rejects missing authorization, cross-origin use, non-synthetic and extra form fields', async () => {
  assert.equal((await handleProxy(uploadRequest(), { ...env, VERCEL_ENV: 'production' }, neverFetch)).status, 503);
  assert.equal((await handleProxy(uploadRequest(), { ...env, BACKEND_PROTECTION_BYPASS_SECRET: '' }, neverFetch)).status, 503);
  assert.equal((await handleProxy(request('profiles/upload', { method: 'POST', headers: { Origin: 'https://evil.example' }, body: new FormData() }), env, neverFetch)).status, 403);
  assert.equal((await handleProxy(uploadRequest('fictional.pdf', '%PDF-fictional', 'application/pdf', form => form.set('synthetic_input', 'false')), env, neverFetch)).status, 422);
  assert.equal((await handleProxy(uploadRequest('fictional.pdf', '%PDF-fictional', 'application/pdf', form => form.append('file', new Blob(['x']), 'another.pdf')), env, neverFetch)).status, 422);
  assert.equal((await handleProxy(uploadRequest('fictional.pdf', '%PDF-fictional', 'application/pdf', form => form.append('extra', 'x')), env, neverFetch)).status, 422);
  assert.equal((await handleProxy(uploadRequest('fictional.pdf', '%PDF-fictional', 'application/pdf', form => form.set('study_constraints', '{"weekly_hours":0}')), env, neverFetch)).status, 422);
  assert.equal((await handleProxy(request('profiles/upload', { method: 'POST', headers: { Origin: frontend, 'Content-Type': 'application/json' }, body: '{}' }), env, neverFetch)).status, 415);
});

test('upload rejects spoofed formats, damaged bodies and oversize requests before backend', async () => {
  const cases: Array<[string, string, string, number]> = [
    ['fictional.txt', 'fictional', 'text/plain', 415],
    ['fictional.pdf', 'not a PDF', 'application/pdf', 422],
    ['fictional.pdf', '%PDF-fictional', 'text/plain', 415],
    ['fictional.docx', '%PDF-fictional', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 422],
  ];
  for (const [name, content, type, status] of cases) {
    assert.equal((await handleProxy(uploadRequest(name, content, type), env, neverFetch)).status, status);
  }
  const oversized = new FormData();
  oversized.append('file', new Blob([new ArrayBuffer(3 * 1024 * 1024)], { type: 'application/pdf' }), 'fictional.pdf');
  oversized.append('synthetic_input', 'true');
  oversized.append('study_constraints', constraints);
  assert.equal((await handleProxy(request('profiles/upload', { method: 'POST', headers: { Origin: frontend }, body: oversized }), env, neverFetch)).status, 413);
  const malformed = request('profiles/upload', { method: 'POST', headers: { Origin: frontend, 'Content-Type': 'multipart/form-data; boundary=missing' }, body: 'not multipart' });
  assert.equal((await handleProxy(malformed, env, neverFetch)).status, 400);
});

test('upload timeout has a bounded, sanitized response', async () => {
  const response = await handleProxy(uploadRequest(), env, async () => {
    throw new DOMException('private provider detail', 'TimeoutError');
  });
  assert.equal(response.status, 504);
  const text = await response.text();
  assert.match(text, /UPSTREAM_TIMEOUT/);
  assert.doesNotMatch(text, /private provider detail|test-secret-never-deployed/);
  assert.equal(response.headers.get('cache-control'), 'no-store');
});
