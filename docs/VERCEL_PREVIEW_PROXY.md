# Protected Frontend Preview API proxy

The protected Preview frontend sets `VITE_API_BASE_URL` to an empty value, so browser requests use relative `/api/v1/*` URLs. Vercel rewrites those URLs to the root `api/proxy.ts` Node.js Function. Production retains its configured `VITE_API_BASE_URL` direct API connection, and the Function refuses non-Preview requests. The Function sends a fixed, narrow set of API calls to the protected Backend Preview, adding the Backend project's automation bypass secret in an upstream request header. It never returns that header or the Backend response's cookies to the browser. Local `pnpm dev` still uses the Vite development proxy to a local FastAPI instance.

The rewrite names its catch-all capture `proxy_path` and sends it to `/api/proxy` without an explicit query string. Vercel automatically passes named captures as query parameters; using a separate `path` capture plus an explicit `proxy_path` parameter caused `/api/v1/health` to arrive with both `path=health` and `proxy_path=health`, and the strict query allowlist correctly rejected `path`. The Function consumes only the single reserved `proxy_path` value, never forwards it, and still rejects unknown client query parameters.

## Required Vercel settings

In the **Frontend** project, set these variables for **Preview only**. Mark the secret as Sensitive/Secret and do not use a `VITE_` prefix:

- `VITE_API_MODE=real` (build-time mode; no secret)
- `VITE_API_BASE_URL=` (empty, Preview only; Production retains its existing URL)
- `BACKEND_PREVIEW_ORIGIN` (the HTTPS branch Preview origin for the Backend project)
- `BACKEND_PROTECTION_BYPASS_SECRET` (the **Backend** project's Protection Bypass for Automation secret)

The origin is validated against the approved PostgreSQL Preview or this integration branch's `syncera-backend-git-integration-skillogy-dosm-…-frank219wan.vercel.app` Preview alias. Use the latter for latest-SHA cloud testing. Do not set the bypass secret in the Backend URL, browser, `VITE_*` variables, GitHub, or logs. The Function refuses to run outside `VERCEL_ENV=preview`; Vercel supplies that variable.

Both the **Frontend Preview** and **Backend Preview** must have Vercel Authentication enabled, with no Deployment Protection exception for the Preview aliases or `/api` path. The Backend bypass secret grants broad access to that project's deployments; use a dedicated secret and rotate it if disclosed. A shareable link or Frontend bypass token also grants access to the proxy, so distribute those only to trusted testers.

Configure a **Frontend project Vercel Firewall/WAF rate-limit rule** for `/api/v1/*` (for example 60 requests per IP per minute, with a stricter 10 POST requests per IP per minute rule). The Function also enforces a 64 KiB JSON body cap, a 1 MiB response cap, a 15 s upstream timeout, a same-origin check for browser POSTs, strict path/method/query allowlists, synthetic-only normalization, and a per-instance rate backstop. The backstop is not a distributed rate limiter, so the WAF rule is an operational requirement for abuse protection.

The proxy permits exactly `POST /api/v1/profiles/upload` for declared fictional PDF/DOCX files, and `GET /api/v1/market/radar` with no query or one published `period` value. It does **not** expose profile readback, organization, progress, or admin routes. Backend `DOSM_MARKET_RADAR_ENABLED=1` is needed for the protected DOSM Preview; this switch is not enabled by repository code. Keep the Backend Neon configuration, revision checks, and existing API contract unchanged. Do not enable paid MiniMax calls for this review.

## Redeploy and verify

1. Confirm Frontend and Backend Preview Authentication settings and the Frontend WAF rule in Vercel. Add the three Frontend Preview variables, then redeploy the Frontend Preview from this branch. Keep the Backend Preview protected. Do not expose its bypass secret in test commands or URLs.
2. In a clean browser session without a Vercel login or share link, request the Frontend Preview root and `/api/v1/health`. Both must be challenged/denied **before** the Function runs. Also request the Backend `/api/v1/health` anonymously; it must remain challenged/denied. If any API request succeeds anonymously, stop: the proxy is not safe to use.
3. Log in as an authorized tester to the Frontend Preview. Its `/api/v1/health` must return HTTP 200 with `data.status=ok`. In DevTools, requests must stay on the Frontend origin; there should be no cross-origin OPTIONS call or 302/401 CORS preflight.
4. Enter fictional profile details and complete Normalize → Confirm → Recommendation in real mode. Verify the recommendation has the expected API envelope, then retry a stale revision to confirm HTTP 409 is still passed through. Verify Moderate and Fast in the UI. Do not enter real personal data.
5. Check the Frontend build assets and Network response/request headers for the bypass secret; it must not appear. Check Function logs for accidental header/body logging. Test an unauthorized path such as `/api/v1/admin/trends/refresh` and oversized POST: they must fail locally without reaching Backend. Inspect the WAF rate-limit rule after test traffic.

Code tests cannot establish the Vercel dashboard settings or live access behavior. Treat the deployment as **not security-accepted** until steps 1–5 pass on the actual Frontend Preview.
