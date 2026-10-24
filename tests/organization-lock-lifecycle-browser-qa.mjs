import assert from 'node:assert/strict';
import {spawn, spawnSync} from 'node:child_process';
import {mkdtempSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const ORIGIN = 'http://127.0.0.1:5179';
const CDP_PORT = 9337;
const HR_LOCK = 'futureproof-b1-editor-v1';
const APP_KEY = 'futureproof-v1';
const HR_KEY = 'futureproof-b1-cas-v1';
const chromePath = process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

async function waitFor(check, label, timeoutMs = 10_000) {
  const deadline = Date.now() + timeoutMs;
  let last;
  while (Date.now() < deadline) {
    try {
      last = await check();
      if (last) return last;
    } catch (error) {
      last = error;
    }
    await sleep(50);
  }
  throw new Error(`Timed out waiting for ${label}: ${String(last)}`);
}

class Cdp {
  constructor(url) {
    this.socket = new WebSocket(url);
    this.nextId = 1;
    this.pending = new Map();
    this.waiters = [];
  }

  async open() {
    await new Promise((resolve, reject) => {
      this.socket.addEventListener('open', resolve, {once: true});
      this.socket.addEventListener('error', reject, {once: true});
    });
    this.socket.addEventListener('message', event => {
      const message = JSON.parse(String(event.data));
      if (message.id) {
        const pending = this.pending.get(message.id);
        if (!pending) return;
        this.pending.delete(message.id);
        if (message.error) pending.reject(new Error(`${pending.method}: ${message.error.message}`));
        else pending.resolve(message.result ?? {});
        return;
      }
      for (const waiter of [...this.waiters]) {
        if (waiter.method !== message.method) continue;
        if (waiter.sessionId !== undefined && waiter.sessionId !== message.sessionId) continue;
        if (waiter.predicate && !waiter.predicate(message.params ?? {})) continue;
        this.waiters.splice(this.waiters.indexOf(waiter), 1);
        clearTimeout(waiter.timer);
        waiter.resolve(message.params ?? {});
      }
    });
  }

  send(method, params = {}, sessionId) {
    const id = this.nextId++;
    this.socket.send(JSON.stringify({id, method, params, ...(sessionId ? {sessionId} : {})}));
    return new Promise((resolve, reject) => this.pending.set(id, {resolve, reject, method}));
  }

  event(method, sessionId, predicate, timeoutMs = 10_000) {
    return new Promise((resolve, reject) => {
      const waiter = {method, sessionId, predicate, resolve, reject};
      waiter.timer = setTimeout(() => {
        this.waiters.splice(this.waiters.indexOf(waiter), 1);
        reject(new Error(`Timed out waiting for CDP event ${method}`));
      }, timeoutMs);
      this.waiters.push(waiter);
    });
  }

  close() {
    this.socket.close();
  }
}

async function evaluate(cdp, page, expression) {
  const response = await cdp.send('Runtime.evaluate', {
    expression,
    awaitPromise: true,
    returnByValue: true,
    userGesture: true,
  }, page.sessionId);
  if (response.exceptionDetails) {
    throw new Error(response.exceptionDetails.exception?.description || response.exceptionDetails.text);
  }
  return response.result?.value;
}

async function createPage(cdp, contextId, path = '/') {
  const target = await cdp.send('Target.createTarget', {url: 'about:blank', browserContextId: contextId});
  const attached = await cdp.send('Target.attachToTarget', {targetId: target.targetId, flatten: true});
  const page = {targetId: target.targetId, sessionId: attached.sessionId};
  await cdp.send('Page.enable', {}, page.sessionId);
  await cdp.send('Runtime.enable', {}, page.sessionId);
  await navigate(cdp, page, path);
  return page;
}

async function navigate(cdp, page, path) {
  const loaded = cdp.event('Page.loadEventFired', page.sessionId, undefined, 10_000);
  await cdp.send('Page.navigate', {url: `${ORIGIN}${path}`}, page.sessionId);
  await loaded;
  await waitFor(async () => evaluate(cdp, page,
    `document.readyState === 'complete' && Boolean(document.querySelector('#root')) && document.querySelector('#root').textContent.length > 0`),
  `React page ${path}`);
}

async function spaNavigate(cdp, page, path) {
  await evaluate(cdp, page, `(() => {
    history.pushState({}, '', ${JSON.stringify(path)});
    window.dispatchEvent(new PopStateEvent('popstate'));
    return true;
  })()`);
  await waitFor(async () => evaluate(cdp, page, `location.pathname === ${JSON.stringify(path)}`), `SPA path ${path}`);
  await sleep(100);
}

async function lockState(cdp, page) {
  return evaluate(cdp, page, `(async () => {
    const state = await navigator.locks.query();
    return {
      held: state.held.filter(item => item.name === ${JSON.stringify(HR_LOCK)}).length,
      pending: state.pending.filter(item => item.name === ${JSON.stringify(HR_LOCK)}).length,
    };
  })()`);
}

async function alertText(cdp, page) {
  return evaluate(cdp, page, `[...document.querySelectorAll('[role="alert"]')]
    .map(item => item.textContent?.replace(/\\s+/g, ' ').trim() || '')
    .filter(Boolean).join(' | ')`);
}

async function waitLock(cdp, page, held, label) {
  return waitFor(async () => {
    const current = await lockState(cdp, page);
    return current.held === held ? current : false;
  }, label);
}

async function waitAlert(cdp, page, pattern, label) {
  return waitFor(async () => {
    const text = await alertText(cdp, page);
    return pattern.test(text) ? text : false;
  }, label);
}

async function waitB1Ready(cdp, page, label) {
  return waitFor(async () => {
    const locks = await lockState(cdp, page);
    return locks.held === 1 && await alertText(cdp, page) === '';
  }, label);
}

async function seedSavedHr(cdp, page, suffix) {
  await evaluate(cdp, page, `(async () => {
    const data = await import('/src/data.ts');
    const hr = structuredClone(data.hrSample);
    Object.assign(hr, {
      clientWorkspaceId: 'browser-client-${suffix}',
      workspaceId: 'browser-server-${suffix}',
      workspaceRevision: 2,
      revision: 2,
      analyzedRevision: 0,
      hrRecovery: null,
      hrAnalysis: null,
      analysisMeta: null,
      hrLastOperationId: null,
    });
    const state = {
      locale: 'en', profile: structuredClone(data.emptyProfile), scenario: 'moderate',
      selectedRole: '', results: null, snapshotId: '', serviceMeta: null,
      trendPackage: null, plan: null, draft: null, archivedPlans: [],
      hr, hrProfileSaved: true, tvet: structuredClone(data.tvetSample),
    };
    localStorage.setItem(${JSON.stringify(APP_KEY)}, JSON.stringify({schema: 1, state}));
    localStorage.removeItem(${JSON.stringify(HR_KEY)});
    return true;
  })()`);
}

async function recoveryStatus(cdp, page) {
  return evaluate(cdp, page, `(() => {
    const value = localStorage.getItem(${JSON.stringify(HR_KEY)});
    return value ? JSON.parse(value).hr?.hrRecovery?.status || null : null;
  })()`);
}

async function clickButton(cdp, page, text) {
  const clicked = await evaluate(cdp, page, `(() => {
    const button = [...document.querySelectorAll('button')].find(item => item.textContent?.includes(${JSON.stringify(text)}));
    if (!button) return false;
    button.click();
    return true;
  })()`);
  assert.equal(clicked, true, `button not found: ${text}`);
}

async function startPending(cdp, page) {
  await cdp.send('Fetch.enable', {patterns: [{urlPattern: `${ORIGIN}/api/v1/organizations/hr/analyze`, requestStage: 'Request'}]}, page.sessionId);
  const paused = cdp.event('Fetch.requestPaused', page.sessionId,
    event => event.request?.url === `${ORIGIN}/api/v1/organizations/hr/analyze`, 10_000);
  await clickButton(cdp, page, 'Review department plan');
  const event = await paused;
  await waitFor(async () => (await recoveryStatus(cdp, page)) === 'pending', 'persisted pending marker');
  return event.requestId;
}

async function fulfillFailure(cdp, page, requestId) {
  const body = Buffer.from(JSON.stringify({
    error: {code: 'SYNTHETIC_FAILURE', message: 'Synthetic offline QA failure.', retryable: true},
    meta: {request_id: 'browser-qa'},
  })).toString('base64');
  await cdp.send('Fetch.fulfillRequest', {
    requestId,
    responseCode: 500,
    responseHeaders: [{name: 'Content-Type', value: 'application/json'}],
    body,
  }, page.sessionId);
}

async function closePage(cdp, page) {
  await cdp.send('Target.closeTarget', {targetId: page.targetId});
}

async function lifecycleScenario(cdp) {
  const {browserContextId} = await cdp.send('Target.createBrowserContext');
  const a = await createPage(cdp, browserContextId, '/');

  assert.deepEqual(await lockState(cdp, a), {held: 0, pending: 0}, 'Home must not claim B1 lock');
  await spaNavigate(cdp, a, '/individual');
  assert.deepEqual(await lockState(cdp, a), {held: 0, pending: 0}, 'Individual must not claim B1 lock');
  await spaNavigate(cdp, a, '/organization/tvet/students');
  assert.deepEqual(await lockState(cdp, a), {held: 0, pending: 0}, 'B2 must not claim B1 lock');

  await spaNavigate(cdp, a, '/organization/hr/intake');
  await waitLock(cdp, a, 1, 'B1 lock acquisition');
  assert.equal(await alertText(cdp, a), '', 'StrictMode replay must not leave the only B1 tab blocked');

  await spaNavigate(cdp, a, '/');
  await waitLock(cdp, a, 0, 'B1 to Home release');
  await spaNavigate(cdp, a, '/organization/hr/intake');
  await waitLock(cdp, a, 1, 'B1 reacquisition after Home');

  const b = await createPage(cdp, browserContextId, '/');
  assert.deepEqual(await lockState(cdp, b), {held: 1, pending: 0}, 'Home tab must not queue another lock');
  await spaNavigate(cdp, b, '/organization/hr/intake');
  await waitAlert(cdp, b, /Another tab is editing/, 'second B1 tab blocker');
  assert.deepEqual(await lockState(cdp, b), {held: 1, pending: 0}, 'only one B1 editor may be active');

  await closePage(cdp, a);
  const afterClose = await waitFor(async () => {
    const locks = await lockState(cdp, b);
    const alert = await alertText(cdp, b);
    return locks.held === 0 || alert === '' ? {locks, alert} : false;
  }, 'owner tab close releases or transfers B1 lock');
  if (afterClose.alert) {
    assert.deepEqual(afterClose.locks, {held: 0, pending: 0}, 'closed owner must release before explicit retry');
    await clickButton(cdp, b, 'Try again');
  }
  await waitFor(async () => (await alertText(cdp, b)) === '', 'second B1 tab recovery after first tab closes');
  assert.deepEqual(await lockState(cdp, b), {held: 1, pending: 0});

  await spaNavigate(cdp, b, '/individual');
  await waitLock(cdp, b, 0, 'B1 to Individual release');
  const c = await createPage(cdp, browserContextId, '/organization/hr/intake');
  await waitFor(async () => {
    const locks = await lockState(cdp, c);
    return locks.held === 1 && await alertText(cdp, c) === '';
  }, 'new B1 editor after StrictMode replay');

  await closePage(cdp, b);
  await closePage(cdp, c);
  await cdp.send('Target.disposeBrowserContext', {browserContextId});
}

async function pendingNavigationScenario(cdp) {
  const {browserContextId} = await cdp.send('Target.createBrowserContext');
  const a = await createPage(cdp, browserContextId, '/');
  await seedSavedHr(cdp, a, 'navigation');
  await navigate(cdp, a, '/organization/hr/intake');
  await waitB1Ready(cdp, a, 'pending navigation ready editor');
  const requestId = await startPending(cdp, a);

  await spaNavigate(cdp, a, '/');
  assert.deepEqual(await lockState(cdp, a), {held: 1, pending: 0}, 'pending request must retain lock after navigation');
  const b = await createPage(cdp, browserContextId, '/organization/hr/intake');
  await waitAlert(cdp, b, /Another tab is editing/, 'pending navigation blocker');

  await fulfillFailure(cdp, a, requestId);
  await waitFor(async () => (await recoveryStatus(cdp, b)) === 'unknown', 'unknown recovery persistence');
  await waitAlert(cdp, b, /workspace changed/i, 'blocked tab changes to explicit conflict after outcome');

  await closePage(cdp, a);
  await closePage(cdp, b);
  await cdp.send('Target.disposeBrowserContext', {browserContextId});
}

async function pendingCloseScenario(cdp) {
  const {browserContextId} = await cdp.send('Target.createBrowserContext');
  const a = await createPage(cdp, browserContextId, '/');
  await seedSavedHr(cdp, a, 'close');
  await navigate(cdp, a, '/organization/hr/intake');
  await waitB1Ready(cdp, a, 'pending close ready editor');
  await startPending(cdp, a);
  const b = await createPage(cdp, browserContextId, '/organization/hr/intake');
  await waitAlert(cdp, b, /Another tab is editing/, 'pending close blocker');

  await closePage(cdp, a);
  await waitAlert(cdp, b, /previous request may have completed/i, 'close restores pending as visible unknown recovery');
  const afterClose = await waitFor(async () => {
    const locks = await lockState(cdp, b);
    const alerts = await alertText(cdp, b);
    return locks.held === 0 || !/Another tab is editing/.test(alerts) ? {locks, alerts} : false;
  }, 'pending owner close releases or transfers B1 lock');
  if (/Another tab is editing/.test(afterClose.alerts)) await clickButton(cdp, b, 'Try again');
  await waitFor(async () => {
    const locks = await lockState(cdp, b);
    return locks.held === 1 && !/Another tab is editing/.test(await alertText(cdp, b));
  }, 'surviving B1 tab safely reacquires after pending owner closes');
  assert.deepEqual(await lockState(cdp, b), {held: 1, pending: 0});

  await closePage(cdp, b);
  await cdp.send('Target.disposeBrowserContext', {browserContextId});
}

async function pendingReloadScenario(cdp) {
  const {browserContextId} = await cdp.send('Target.createBrowserContext');
  const a = await createPage(cdp, browserContextId, '/');
  await seedSavedHr(cdp, a, 'reload');
  await navigate(cdp, a, '/organization/hr/intake');
  await waitB1Ready(cdp, a, 'pending reload ready editor');
  await startPending(cdp, a);

  const loaded = cdp.event('Page.loadEventFired', a.sessionId, undefined, 10_000);
  await cdp.send('Page.reload', {ignoreCache: true}, a.sessionId);
  await loaded;
  await waitLock(cdp, a, 1, 'reloaded B1 reacquires lock');
  const recovery = await waitAlert(cdp, a, /previous request may have completed/i, 'reload restores pending as visible unknown recovery');
  assert.doesNotMatch(recovery, /analysis request is still running/i);

  await closePage(cdp, a);
  await cdp.send('Target.disposeBrowserContext', {browserContextId});
}

async function main() {
  const profileDir = mkdtempSync(join(tmpdir(), 'syncera-lock-browser-'));
  const vite = spawn(process.env.ComSpec || 'cmd.exe', ['/d', '/s', '/c', 'pnpm exec vite --host 127.0.0.1 --port 5179'], {
    cwd: ROOT,
    env: {...process.env, VITE_API_MODE: 'real', FUTUREPROOF_WEB_PORT: '5179'},
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true,
  });
  const chrome = spawn(chromePath, [
    '--headless=new', `--remote-debugging-port=${CDP_PORT}`, `--user-data-dir=${profileDir}`,
    '--no-first-run', '--no-default-browser-check', '--disable-background-networking',
  ], {stdio: 'ignore', windowsHide: true});
  let cdp;
  try {
    await waitFor(async () => (await fetch(ORIGIN)).ok, 'local Vite server', 20_000);
    const version = await waitFor(async () => {
      const response = await fetch(`http://127.0.0.1:${CDP_PORT}/json/version`);
      return response.ok ? response.json() : false;
    }, 'Chrome DevTools endpoint', 20_000);
    cdp = new Cdp(version.webSocketDebuggerUrl);
    await cdp.open();
    await cdp.send('Target.setDiscoverTargets', {discover: true});

    await lifecycleScenario(cdp);
    console.log('PASS lifecycleScenario');
    await pendingNavigationScenario(cdp);
    console.log('PASS pendingNavigationScenario');
    await pendingReloadScenario(cdp);
    console.log('PASS pendingReloadScenario');
    await pendingCloseScenario(cdp);
    console.log('PASS pendingCloseScenario');

    console.log(JSON.stringify({
      status: 'PASS',
      browser: version.Browser,
      origin: ORIGIN,
      context: 'isolated same-origin browser contexts; multi-page tabs share storage per scenario',
      checks: [
        'home-no-lock', 'individual-no-lock', 'b2-no-lock', 'b1-acquire', 'b1-home-release',
        'b1-reacquire', 'two-tab-exclusive-editor', 'tab-close-release', 'strictmode-no-permanent-block',
        'pending-navigation-retains-lock', 'pending-close-unknown', 'pending-reload-unknown',
      ],
    }, null, 2));
  } finally {
    if (cdp) {
      try { await cdp.send('Browser.close'); } catch {}
      cdp.close();
    }
    chrome.kill();
    if (process.platform === 'win32') spawnSync('taskkill.exe', ['/PID', String(vite.pid), '/T', '/F'], {stdio: 'ignore'});
    else vite.kill();
    await sleep(1_000);
    try { rmSync(profileDir, {recursive: true, force: true, maxRetries: 5, retryDelay: 200}); }
    catch (error) { console.error(`QA cleanup warning: ${error.message}`); }
  }
}

await main();
