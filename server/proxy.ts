// Server-only Vercel Preview proxy. Never import this module from src/.
const MAX_BODY_BYTES = 64 * 1024;
const MAX_UPLOAD_BODY_BYTES = 3 * 1024 * 1024;
const MAX_UPLOAD_FILE_BYTES = MAX_UPLOAD_BODY_BYTES - 16 * 1024;
const MAX_RESPONSE_BYTES = 1024 * 1024;
const UPLOAD_TIMEOUT_MS = 52_000;
const UPLOAD_READ_TIMEOUT_MS = 10_000;
const WINDOW_MS = 60_000;
const requests = new Map<string, { until: number; count: number }>();

const GET_ROUTES: Array<[RegExp, ReadonlySet<string>]> = [
  [/^health$/, new Set()],
  [/^market\/radar$/, new Set(['period'])],
  [/^explore\/bubbles$/, new Set(['region', 'field_id', 'snapshot_id'])],
  [/^trends\/(?:roles|skills)$/, new Set(['region', 'limit', 'field_id', 'cursor', 'snapshot_id'])],
  [/^roles\/[A-Za-z0-9_-]{1,80}$/, new Set()],
  [/^roles\/[A-Za-z0-9_-]{1,80}\/tasks$/, new Set(['snapshot_id'])],
  [/^evidence\/[A-Za-z0-9_-]{1,80}$/, new Set()],
];
const POST_ROUTES = new Set([
  'profiles/normalize', 'profiles/upload', 'profiles/confirm', 'recommendations',
  'learning/skill-map', 'learning/roadmap', 'organizations/career_centre/analyze', 'organizations/hr/analyze',
]);

function jsonError(status: number, code: string, message: string): Response {
  return Response.json({ error: { code, message, retryable: status >= 500 }, meta: {} }, {
    status, headers: { 'Cache-Control': 'no-store' },
  });
}

function takeRateSlot(request: Request, method: string, now: number): boolean {
  // A per-instance backstop. Configure a project WAF rate-limit rule as well:
  // serverless instances do not share this Map.
  if (requests.size > 1000) {
    for (const [key, slot] of requests) if (slot.until <= now) requests.delete(key);
    if (requests.size > 1000) requests.clear();
  }
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  const key = `${method}:${ip}`;
  let slot = requests.get(key);
  if (!slot || slot.until <= now) slot = { until: now + WINDOW_MS, count: 0 };
  slot.count++;
  requests.set(key, slot);
  return slot.count <= (method === 'POST' ? 10 : 30);
}

class BodyTimeoutError extends Error {}

async function readBoundedBody(request: Request | Response, maxBytes: number, deadline = Infinity): Promise<Uint8Array | null> {
  const length = request.headers.get('content-length');
  if (length && (!/^\d+$/.test(length) || Number(length) > maxBytes)) return null;
  const reader = request.body?.getReader();
  if (!reader) return new Uint8Array();
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const remaining = deadline - Date.now();
    if (remaining <= 0) { throw new BodyTimeoutError(); }
    let timer: ReturnType<typeof setTimeout> | undefined;
    let result: ReadableStreamReadResult<Uint8Array>;
    try {
      if (Number.isFinite(remaining)) {
        const timeout = new Promise<never>((_resolve, reject) => {
          timer = setTimeout(() => reject(new BodyTimeoutError()), remaining);
        });
        result = await Promise.race([reader.read(), timeout]);
      } else result = await reader.read();
    }
    catch (error) { throw error; }
    finally { if (timer) clearTimeout(timer); }
    const { done, value } = result;
    if (done) break;
    size += value.byteLength;
    if (size > maxBytes) {
      return null;
    }
    chunks.push(value);
  }
  const body = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) { body.set(chunk, offset); offset += chunk.byteLength; }
  return body;
}

async function validatedUpload(request: Request, deadline: number): Promise<FormData | Response> {
  const contentType = request.headers.get('content-type') || '';
  if (!/^multipart\/form-data\s*;\s*boundary=[A-Za-z0-9'()+_,.\/:=?-]{1,70}$/i.test(contentType)) {
    return jsonError(415, 'MULTIPART_REQUIRED', 'Multipart form data is required.');
  }
  let bytes: Uint8Array | null;
  try { bytes = await readBoundedBody(request, MAX_UPLOAD_BODY_BYTES, deadline); }
  catch (error) {
    if (error instanceof BodyTimeoutError) return jsonError(408, 'UPLOAD_TIMEOUT', 'Upload took too long.');
    return jsonError(400, 'INVALID_MULTIPART', 'Invalid multipart request.');
  }
  if (!bytes) return jsonError(413, 'CV_REQUEST_TOO_LARGE', 'Upload request exceeds 3 MiB.');
  let incoming: FormData;
  const buffered = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(buffered).set(bytes);
  try { incoming = await new Response(buffered, { headers: { 'Content-Type': contentType } }).formData(); }
  catch { return jsonError(400, 'INVALID_MULTIPART', 'Invalid multipart request.'); }
  const allowed = new Set(['file', 'synthetic_input', 'study_constraints']);
  if ([...incoming.keys()].some(key => !allowed.has(key)) ||
      [...allowed].some(key => incoming.getAll(key).length !== 1)) {
    return jsonError(422, 'INVALID_UPLOAD_FIELDS', 'Upload fields are invalid.');
  }
  if (incoming.get('synthetic_input') !== 'true') {
    return jsonError(422, 'SYNTHETIC_ONLY', 'Only declared fictional CVs are accepted.');
  }
  const rawConstraints = incoming.get('study_constraints');
  if (typeof rawConstraints !== 'string' || rawConstraints.length > 1024) {
    return jsonError(422, 'INVALID_UPLOAD_FIELDS', 'Study constraints are invalid.');
  }
  let constraints: unknown;
  try { constraints = JSON.parse(rawConstraints); }
  catch { return jsonError(422, 'INVALID_UPLOAD_FIELDS', 'Study constraints are invalid.'); }
  if (!constraints || typeof constraints !== 'object' || Array.isArray(constraints)) {
    return jsonError(422, 'INVALID_UPLOAD_FIELDS', 'Study constraints are invalid.');
  }
  const values = constraints as Record<string, unknown>;
  if (Object.keys(values).sort().join(',') !== 'budget_amount,currency,language,learning_pace,target_weeks,weekly_hours' ||
      typeof values.weekly_hours !== 'number' || values.weekly_hours <= 0 || values.weekly_hours > 80 ||
      typeof values.budget_amount !== 'number' || values.budget_amount < 0 || values.budget_amount > 1_000_000 ||
      typeof values.currency !== 'string' || !/^[A-Z]{3}$/.test(values.currency) ||
      typeof values.language !== 'string' || !/^[a-z]{2,5}$/.test(values.language) ||
      !Number.isInteger(values.target_weeks) || (values.target_weeks as number) < 1 || (values.target_weeks as number) > 104 ||
      !['focused', 'deep'].includes(String(values.learning_pace))) {
    return jsonError(422, 'INVALID_UPLOAD_FIELDS', 'Study constraints are invalid.');
  }
  const file = incoming.get('file');
  if (!(file instanceof Blob) || typeof (file as File).name !== 'string') {
    return jsonError(422, 'INVALID_UPLOAD_FIELDS', 'A CV file is required.');
  }
  const name = (file as File).name;
  const kind = /\.pdf$/i.test(name) ? 'pdf' : /\.docx$/i.test(name) ? 'docx' : null;
  if (!kind || name.length > 160 || /[\\/\u0000-\u001f]/.test(name)) {
    return jsonError(415, 'CV_UNSUPPORTED_TYPE', 'Only PDF and DOCX files are supported.');
  }
  if (!file.size) return jsonError(422, 'CV_INVALID_FILE', 'The file is empty.');
  if (file.size > MAX_UPLOAD_FILE_BYTES) return jsonError(413, 'CV_TOO_LARGE', 'The file exceeds the Preview upload limit.');
  const allowedType = kind === 'pdf' ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
  if (![allowedType, 'application/octet-stream', ''].includes(file.type.toLowerCase())) {
    return jsonError(415, 'CV_UNSUPPORTED_TYPE', 'File media type does not match its extension.');
  }
  const signature = new Uint8Array(await file.slice(0, 5).arrayBuffer());
  const expected = kind === 'pdf' ? [37, 80, 68, 70, 45] : [80, 75, 3, 4];
  if (!expected.every((value, index) => signature[index] === value)) {
    return jsonError(422, 'CV_INVALID_FILE', 'File content does not match its extension.');
  }
  const safe = new FormData();
  safe.append('synthetic_input', 'true');
  safe.append('study_constraints', rawConstraints);
  safe.append('file', file, name);
  return safe;
}

export async function handleProxy(
  request: Request,
  env: NodeJS.ProcessEnv = process.env,
  upstreamFetch: typeof fetch = fetch,
): Promise<Response> {
  // Vercel Authentication on the FRONTEND project is an external, mandatory gate.
  // Refuse non-Preview deployments even if someone accidentally copies the secret.
  if (env.VERCEL_ENV !== 'preview') return jsonError(503, 'PREVIEW_ONLY', 'Preview API is unavailable.');
  const secret = env.BACKEND_PROTECTION_BYPASS_SECRET;
  const configuredOrigin = env.BACKEND_PREVIEW_ORIGIN;
  if (!secret || !configuredOrigin) return jsonError(503, 'PROXY_NOT_CONFIGURED', 'Preview API is unavailable.');
  let backend: URL;
  try { backend = new URL(configuredOrigin); }
  catch { return jsonError(503, 'PROXY_NOT_CONFIGURED', 'Preview API is unavailable.'); }
  if (backend.protocol !== 'https:' || backend.origin !== configuredOrigin ||
      !/^syncera-backend-git-(?:integration-(?:postgres-pre|career-radar?)|feature-organization-mvp)-[a-z0-9]+-frank219wan\.vercel\.app$/.test(backend.hostname)) {
    return jsonError(503, 'PROXY_NOT_CONFIGURED', 'Preview API is unavailable.');
  }

  const incoming = new URL(request.url);
  const pathParts = incoming.searchParams.getAll('proxy_path');
  if (pathParts.length !== 1) return jsonError(404, 'NOT_FOUND', 'API route unavailable.');
  const path = pathParts[0];
  const method = request.method.toUpperCase();
  if (method !== 'GET' && method !== 'POST') return jsonError(405, 'METHOD_NOT_ALLOWED', 'API method unavailable.');
  const route = method === 'GET' ? GET_ROUTES.find(([pattern]) => pattern.test(path)) : undefined;
  if ((method === 'GET' && !route) || (method === 'POST' && !POST_ROUTES.has(path))) {
    return jsonError(method === 'GET' || method === 'POST' ? 404 : 405, 'NOT_FOUND', 'API route unavailable.');
  }
  const allowedQuery = route?.[1] ?? new Set<string>();
  for (const [key, value] of incoming.searchParams) {
    if (key === 'proxy_path') continue;
    if (!allowedQuery.has(key) || value.length > 256 || incoming.searchParams.getAll(key).length !== 1 ||
        (path === 'market/radar' && key === 'period' && !/^\d{4}-Q[1-4]$/.test(value))) {
      return jsonError(400, 'BAD_QUERY', 'Unsupported API query.');
    }
  }
  if (incoming.search.length > 2048) return jsonError(414, 'QUERY_TOO_LARGE', 'API query is too large.');
  if (!takeRateSlot(request, method, Date.now())) return jsonError(429, 'RATE_LIMITED', 'Too many requests.');

  const upload = path === 'profiles/upload';
  const deadline = Date.now() + UPLOAD_TIMEOUT_MS;
  let body: string | FormData | undefined;
  if (method === 'POST') {
    const origin = request.headers.get('origin');
    if (origin && origin !== incoming.origin) return jsonError(403, 'BAD_ORIGIN', 'Cross-origin requests are unavailable.');
    if (upload) {
      const validated = await validatedUpload(request, Math.min(deadline, Date.now() + UPLOAD_READ_TIMEOUT_MS));
      if (validated instanceof Response) return validated;
      body = validated;
    } else {
      if (!/^application\/json(?:\s*;\s*charset=utf-8)?$/i.test(request.headers.get('content-type') || '')) {
        return jsonError(415, 'JSON_REQUIRED', 'JSON request required.');
      }
      const read = await readBoundedBody(request, MAX_BODY_BYTES);
      if (!read) return jsonError(413, 'REQUEST_TOO_LARGE', 'Request is too large.');
      body = new TextDecoder().decode(read);
      let parsed: unknown;
      try { parsed = JSON.parse(body); }
      catch { return jsonError(400, 'BAD_JSON', 'Invalid JSON request.'); }
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return jsonError(400, 'BAD_JSON', 'JSON object required.');
      if (path === 'profiles/normalize' && (parsed as Record<string, unknown>).synthetic_input !== true) {
        return jsonError(422, 'SYNTHETIC_ONLY', 'Only fictional test profiles are accepted.');
      }
      if (path.startsWith('organizations/') && (parsed as Record<string, unknown>).synthetic_input !== true) {
        return jsonError(422, 'SYNTHETIC_ONLY', 'Only fictional organization records are accepted.');
      }
    }
  }

  const target = new URL(`/api/v1/${path}`, backend);
  for (const [key, value] of incoming.searchParams) if (key !== 'proxy_path') target.searchParams.set(key, value);
  const headers = new Headers({
    Accept: 'application/json',
    'x-vercel-protection-bypass': secret,
  });
  if (method === 'POST' && !upload) headers.set('Content-Type', 'application/json');
  const requestId = request.headers.get('x-request-id');
  if (requestId && /^[A-Za-z0-9_-]{1,100}$/.test(requestId)) headers.set('X-Request-ID', requestId);
  if (path === 'recommendations' && request.headers.get('x-recommendation-analysis') === 'v1') {
    headers.set('X-Recommendation-Analysis', 'v1');
  }
  try {
    const response = await upstreamFetch(target, {
      method, headers, body, redirect: 'manual',
      signal: AbortSignal.timeout(upload ? Math.max(1, deadline - Date.now()) : 15_000),
    });
    if (response.status >= 300 && response.status < 400) return jsonError(502, 'UPSTREAM_REDIRECT', 'Backend returned a redirect.');
    if (!(response.headers.get('content-type') || '').toLowerCase().startsWith('application/json')) {
      return jsonError(502, 'UPSTREAM_RESPONSE', 'Backend returned an invalid response.');
    }
    const declared = response.headers.get('content-length');
    if (declared && Number(declared) > MAX_RESPONSE_BYTES) return jsonError(502, 'UPSTREAM_RESPONSE', 'Backend response is too large.');
    const bytes = await readBoundedBody(response, MAX_RESPONSE_BYTES, upload ? deadline : Infinity);
    if (!bytes) return jsonError(502, 'UPSTREAM_RESPONSE', 'Backend response is too large.');
    const responseBody = new ArrayBuffer(bytes.byteLength);
    new Uint8Array(responseBody).set(bytes);
    return new Response(responseBody, { status: response.status, headers: {
      'Content-Type': 'application/json', 'Cache-Control': 'no-store',
    } });
  } catch (error) {
    if (upload && (error instanceof BodyTimeoutError || (error instanceof Error && ['TimeoutError', 'AbortError'].includes(error.name)))) {
      return jsonError(504, 'UPSTREAM_TIMEOUT', 'Profile extraction took too long. Please retry.');
    }
    return jsonError(502, 'UPSTREAM_UNAVAILABLE', 'Backend is unavailable.');
  }
}
