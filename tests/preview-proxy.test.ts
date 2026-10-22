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
// Vercel appends the named source capture as a query parameter when the
// destination does not consume it. The original query string is preserved.
const request = (pathAndQuery: string, init?: RequestInit) => {
  assert.equal(rewrite.source, '/api/v1/:proxy_path*');
  assert.equal(rewrite.destination, '/api/proxy');
  const [path, query = ''] = pathAndQuery.split('?', 2);
  const rewritten = new URL(rewrite.destination, frontend);
  for (const [key, value] of new URLSearchParams(query)) rewritten.searchParams.append(key, value);
  rewritten.searchParams.append('proxy_path', path);
  return new Request(rewritten, init);
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

test('rejects production, missing configuration, arbitrary routes and methods', async () => {
  assert.equal((await handleProxy(request('health'), { ...env, VERCEL_ENV: 'production' }, neverFetch)).status, 503);
  assert.equal((await handleProxy(request('health'), { ...env, BACKEND_PROTECTION_BYPASS_SECRET: '' }, neverFetch)).status, 503);
  assert.equal((await handleProxy(request('health'), { ...env, BACKEND_PREVIEW_ORIGIN: 'https://evil.example' }, neverFetch)).status, 503);
  assert.equal((await handleProxy(request('admin/trends/refresh'), env, neverFetch)).status, 404);
  assert.equal((await handleProxy(request('profiles/upload', { method: 'POST' }), env, neverFetch)).status, 404);
  assert.equal((await handleProxy(request('health', { method: 'DELETE' }), env, neverFetch)).status, 405);
  assert.equal((await handleProxy(request('profiles/../health'), env, neverFetch)).status, 404);
  assert.equal((await handleProxy(request('health?target=https://evil.example'), env, neverFetch)).status, 400);
  assert.equal((await handleProxy(request('health?path=health'), env, neverFetch)).status, 400);
  assert.equal((await handleProxy(request('health?proxy_path=health'), env, neverFetch)).status, 404);
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
