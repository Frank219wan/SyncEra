# Implementation baseline — 2026-10-21

Authority: https://chatgpt.com/share/6ad79b9f-cc3c-83ec-8c8f-c23cfbff1670.
This implementation is authorized by the user's current request. Historical "not authorized to code" notes are superseded. Preserve the source documents.

## Direction contract

THESIS: A calm botanical workspace connects career discovery to observable learning progress. This is an Operate surface including its entry page.
OWN-WORLD: Inherit the explicitly approved sage #E8EFE5, ivory #F7F5EE, deep green #243D30, Noto Serif / Noto Sans, botanical photography, and two softly irregular square entrance cards. No new visual identity is selected.
STORY: Choose individual or organization; enter and review data; understand evidence and gaps; choose a learning action; preserve progress.
FIRST VIEWPORT: Desktop entry, 1200px centered width, 64px two-line concept at left, 248px entry cards at right with 32px horizontal separation and 96px stagger. Quiet text space within photographic leaves. Inner screens use 232px sidebar, clear page title, stable form/table/workspace surfaces.
FORM: User-selected composition in specs/02–04 and linked final decisions, inherited without concept tournament. Code-first functional implementation; only botanical assets use image generation.
FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

## Locked behaviors

- 23 primary routes including root, 11 Individual, Organization selector, 5 HR, 5 TVET, plus fallback.
- Moderate / Fast only; default Moderate; hypothetical same-horizon comparisons.
- Four stages and four goals. Structured background, skills/proficiency, interests, aspirations, optional work preferences; synthetic CV supported.
- Explicit review of inferred skills; remove, edit, individually confirm or confirm all.
- Radar browsable without intake; domain/role bubbles, signal strength distinct from trend direction; no invented historical snapshots.
- Top 3 + View More; Radar-selected occupation separate from ranked results.
- Three explanations: Your Strengths, Market Signals, Scenario & Evidence; role details include Task X-Ray, SDG, strengths and gaps.
- Horizontal single-skill dependency map with resource detail; draft plan opens directly with explicit editable default constraints.
- Adopt before task completion; confirm skill completion; preserve completed work and earned bamboo on revision; revisions highlighted inline and require Adopt/Keep.
- HR: Team → Heatmap → Mobility → Training; summary links back to all steps.
- TVET: Students → Trends → Gaps → manually selected cohort → Institution Insights.
- EN / 简体中文 / Bahasa Melayu interface. User-entered data is never machine-translated on switch.
- All demo analysis labeled synthetic; no fabricated salary, employers, job counts or market history. Frontend fixtures are not the production matching engine.

## Integration boundary

Build complete UI and typed API adapter. No backend service or keys supplied. Demo responses intentionally labeled; production mode must fail visibly rather than silently fall back. Validate and document all remaining backend dependencies.
