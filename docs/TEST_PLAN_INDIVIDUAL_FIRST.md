# Step-by-step test plan: Individual first

Run these checks in order. Use fictional data only. The normal local launch uses the deterministic `futureproof_ai.futureproof_adapter`; it makes no paid provider call. The optional Tencent TokenHub adapter is covered by offline mock-transport tests and is not needed for this plan.

## 0. Start the local stack

1. In VS Code, open this repository folder.
2. Run **Terminal → Run Task → Start FutureProof full stack (dev)**.
3. Open `http://127.0.0.1:5174` and `http://127.0.0.1:8001/api/v1/health`.
4. Expect the Skillogy landing page and API response `data.status = "ok"`. The API response should identify `synthetic_demo` and `is_mock = true`.
5. If one port is occupied, stop the prior task or use the one-process preview task on `http://127.0.0.1:8765`.

## 1. Individual entry and onboarding

1. From the landing page, choose **Individual**. Confirm `/individual` loads and the organization entry remains a separate route.
2. Complete the profile form with fictional occupation, interests, skills, preferred field, and study constraints. Keep the input marked synthetic.
3. Submit profile normalization. Expect a reviewable, unconfirmed profile and a visible synthetic-data label.
4. Change one inferred or declared skill and its level, then confirm the profile.
5. Confirm that the reviewed state appears before recommendations. Refresh the page and check the UI state is still available in the same browser.
6. Edit and reconfirm the profile. A stale profile revision must return a conflict, and retrying with the latest revision should succeed.

## 2. Career radar and trend context

1. Open the Career Radar / trends view for Malaysia (`MY`).
2. Confirm the role and skill signals render and the bubbles use equal area when verified posting volumes are unavailable.
3. Change the selected field and region. The supported field changes should filter the role list; an unsupported region should show a clear error instead of fabricated data.
4. Select a role and open its details and task list.
5. Open each evidence link from the role or trend view. Synthetic evidence should be visibly described as illustrative and should not show a real source URL.

## 3. Recommendations and scenarios

1. Request recommendations with the confirmed profile and the current trend snapshot.
2. Confirm every result has a rank, a reproducible score breakdown, strengths, skill gaps, evidence IDs, scenario assumptions, and uncertainty text.
3. Switch between **Moderate** and **Fast**. The projected recommendation values may change; observed snapshot metrics and source dates must remain unchanged.
4. Repeat with a preferred field. Results should stay within that field and use deterministic tie ordering.
5. Open a recommendation, then change the profile or snapshot. Stale revisions/snapshots must be surfaced as conflicts rather than silently reused.

## 4. Skill map and learning roadmap

1. Choose a recommended role and one missing required skill. Open its Skill Map.
2. Confirm map nodes/actions reference the selected role and skill. Candidate learning resources must remain absent unless a resource has an approved match.
3. Build a roadmap from selected required skills and the profile's study constraints.
4. Confirm estimated hours, capacity, feasibility, and warnings agree with the chosen hours, pace, and budget. Try a one-hour-per-week constraint and expect a stretch/insufficient-time result with a warning.
5. Try a skill that is not required by the chosen role. Expect a validation error.
6. Inspect plan adoption, task completion, rescheduling, and history in the UI. These are browser-local features; backend progress synchronization is still disabled and must not be reported as server-saved.

## 5. Individual error and boundary checks

1. Try recommendations before confirming a profile; expect a validation message.
2. Submit an unknown role, skill, field, or evidence ID; expect a clear not-found/validation response.
3. Submit an unsupported region or stale snapshot; expect an error state and no stale results.
4. Use a malformed or over-limit profile input; expect an error that leaves the app usable.
5. Confirm all pages remain usable at a narrow viewport and by keyboard, including focus visibility and form labels.

## 6. Backend-only individual endpoints

The frontend does not currently send file uploads to `/api/v1/profiles/upload`. Test this endpoint separately with a generated fictional synthetic PDF/DOCX only; check accepted upload, unsupported file type, oversized input, and `synthetic_input=false` rejection. Do not upload a real CV.

Run the backend tests to cover normalization, confirmation/revision safety, recommendations and scenarios, role detail/tasks/evidence, skill map, roadmap, upload guards, AI adapter validation, and semantic explanation checks:

```sh
cd backend
.venv/bin/python -m pytest tests -q
```

## 7. Individual regression run

From the repository root:

```sh
pnpm test
pnpm build
```

Then run the live cross-stack test against the running local API:

```sh
VITE_API_MODE=real node --experimental-strip-types --test tests/cross-stack.test.ts
```

## 8. After the Individual flow

Only after Steps 0–7 pass, continue to the Organization / HR and Career Centre / TVET routes. Their interface flows can be checked in demo mode, but organization analysis, progress synchronization, and admin trend refresh are currently disabled backend endpoints (HTTP 503). Record those as known gaps rather than passing backend functions.

## Result log

Record the date, branch/commit, commands, pass/fail result, and exact failing step here or in the integration report. Do not call a feature complete if it has only passed a browser-local demo path.
