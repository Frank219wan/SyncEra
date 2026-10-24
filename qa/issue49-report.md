# Issue #49: product language coverage

## Source and behavior

- Career Matches renders known role and skill names by stable catalogue ID. It only uses the approved translation when the backend name matches the reviewed source; a new name remains visible with an original-language label.
- Deterministic recommendation, scenario, uncertainty, evidence, role-detail, task-impact, roadmap, and skill-map text use reviewed source templates. Novel explanations remain visible as labelled original text. The original API result, score, rank, evidence IDs, snapshot, and profile stay unchanged.
- Organization B1 HR and B2 TVET render reviewed result fields, warnings, workshop and curriculum suggestions, and scenario labels in the selected UI language. Unknown backend prose keeps an explicit original-language label.
- DOSM market radar category names use stable source category IDs with source-name validation. Source counts, dates, and citations are preserved.
- Locale changes re-render already-loaded Career Matches and organization analyses without writing to the backend. Skill Mind Map preserves its current result while the service selects a resource for the newly selected language.

## Local verification

All checks used a local in-memory API on `127.0.0.1:18749` with database environment variables unset. No production or database service was used.

| Check | Result |
| --- | --- |
| `pnpm test` | 144 passed |
| `pnpm exec tsc -b` | passed |
| `VITE_API_MODE=real pnpm build` | passed |
| Backend `pytest tests -q` | 164 passed, 4 skipped |
| Cross-stack local tests | 4 passed |
| `git diff --check` | passed |
| Playwright Career Matches | EN/ZH/MS at 1440, 768, 390 px; no horizontal overflow |
| Playwright B1/B2 | EN/ZH/MS at 1440 and 390 px; no horizontal overflow |
| Playwright role details and Skill Mind Map | EN/ZH/MS switching on an already-loaded 390 px page |

Career Matches kept the same two roles in order and the same service scores, 49.82 and 21.89, across all locale switches. The synthetic profile ID stayed unchanged.

## Screenshots

- Career Matches at 1440 px: [English](screenshots/issue49/career-matches-en-1440.png), [简体中文](screenshots/issue49/career-matches-zh-1440.png), [Bahasa Melayu](screenshots/issue49/career-matches-ms-1440.png).
- Career Matches at 768 px: [English](screenshots/issue49/career-matches-en-768.png), [简体中文](screenshots/issue49/career-matches-zh-768.png), [Bahasa Melayu](screenshots/issue49/career-matches-ms-768.png).
- Career Matches at 390 px: [English](screenshots/issue49/career-matches-en-390.png), [简体中文](screenshots/issue49/career-matches-zh-390.png), [Bahasa Melayu](screenshots/issue49/career-matches-ms-390.png).
- [Chinese dark theme at 1440 px](screenshots/issue49/career-matches-zh-dark-1440.png).
- B1 HR at 390 px: [English](screenshots/issue49/organization-b1-en-390.png), [简体中文](screenshots/issue49/organization-b1-zh-390.png), [Bahasa Melayu](screenshots/issue49/organization-b1-ms-390.png).
- B2 TVET at 390 px: [English](screenshots/issue49/organization-b2-en-390.png), [简体中文](screenshots/issue49/organization-b2-zh-390.png), [Bahasa Melayu](screenshots/issue49/organization-b2-ms-390.png).

The script `qa/issue49-visual.mjs` reproduces these checks against a local built frontend and local API.
