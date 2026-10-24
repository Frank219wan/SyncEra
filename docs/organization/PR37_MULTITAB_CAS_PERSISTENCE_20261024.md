# PR #37 B1 multi-tab CAS persistence review — 2026-10-24

## Root cause

`futureproof-v1` held all of `AppState`. Each React state change serialized the whole object, so a stale B1 tab, or even a B2/Individual edit in that tab, could replace a newer B1 `workspaceRevision`, recovery marker, analysis, and snapshot. `saveHrDraft()` protected stale editors only within one in-memory store. There was no cross-tab writer coordination.

## Fix and boundary

- `futureproof-b1-cas-v1` is the authoritative local B1 record. Reload restores B1 from it before considering the old full-state key.
- Web Locks grants one active B1 editor per origin. Other tabs show a conflict/read-only notice; their B1 save and analysis actions fail closed. B2 and Individual can still update their own fields.
- All cooperating tabs serialize full-state writes with a separate Web Lock and merge only fields changed in that tab. B1 is always overlaid from its canonical record. A `storage` event informs other tabs; it is not treated as an atomic CAS primitive.
- B1 transitions reject a lower server revision, a changed workspace identity, a cleared unresolved operation, and a revived old analysis. The only accepted server revision increment is tied to the reserved operation ID. A first request persists `pending` before HTTP; refresh turns that marker into `unknown`.
- If Web Locks is unavailable, B1 editing and analysis are disabled. Existing Individual and B2 local persistence continues. The app does not guess that `localStorage` read/check/write is atomic.
- An open component draft remains in memory while the conflict is shown. The user may review the current local record, then explicitly save the draft against that revision or create a separate workspace through the existing recovery flow. Merely closing the conflict notice does not retry an HTTP request.

## Server recovery boundary

HTTP 200 with a validated matching operation may advance the local CAS token. A lost response leaves the local token unchanged and marks the outcome unknown. HTTP 409 marks conflict and never automatically resubmits the old revision. Explicit new workspace creation clears the old server identity while retaining current draft inputs.

Restoring the original server workspace after an unknown response needs a separate read-only recovery API with a real authenticated principal and workspace membership check. A `workspace_id` alone is not authorization. A future endpoint should return the current revision and operation outcome only to that principal, with audit logging and no sensitive input in logs. This PR does not add that endpoint, so same-workspace recovery after an unknown server commit remains fail closed.

## Verification and limits

- Repeatable two-tab storage/lock tests cover confirmed Rev 3 against stale Rev 2, simultaneous analysis, pending refresh, lost response, 409, cancelled recovery, explicit new workspace, stale analysis, B2/Individual fields, unsupported locks, and StrictMode replay.
- Local browser check used two tabs on `127.0.0.1:5178` with only the built-in synthetic sample. Tab B showed the conflict, refused its stale save, and tab A reloaded the saved profile.
- A separate local Real-mode check used two tabs on `127.0.0.1:5179` and the deterministic local backend with database variables removed. The backend returned one B1 HTTP 200, tab A's connected result survived refresh, and tab B showed the conflict. This was not a Vercel or Neon test.
- Final local checks: frontend 128/128 passed; TypeScript passed; `VITE_API_MODE=real` build passed; backend 164 passed and 4 skipped; cross-stack 4/4 passed; staged diff check passed. No paid AI, Neon, or Vercel endpoint was used.
- A tab still running an older frontend bundle does not cooperate with the new locks. The independent B1 record protects reloads from that tab's old full-state writes, but the older tab can still send an HTTP request with its stale revision. The server's CAS remains the final guard. All open B1 tabs should reload when a compatible Preview is deployed.
- The browser's local storage remains device-local and contains synthetic HR data. Production/Preview security settings, database schema, scoring rules, and API contract were not changed.
