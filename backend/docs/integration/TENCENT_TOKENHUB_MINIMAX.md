# Tencent TokenHub MiniMax-M3 integration

## Scope and truth boundary

- Real provider call: profile extraction from fictional synthetic guided text or synthetic CV text.
- Provider: Tencent Cloud TokenHub.
- Model: `minimax-m3`.
- Endpoint: `https://tokenhub.tencentmaas.com/v1/chat/completions`.
- Deterministic code: role matching, Matching Score, Skill Gap, Evidence IDs, Moderate/Fast scenarios, Skill Map, and Roadmap.
- Data remains `synthetic_demo`/`is_mock=true`; the real LLM call does not approve market data or permit real CV processing.

The adapter sends no request during module import or health checks. It calls TokenHub only when `/api/v1/profiles/normalize` or `/api/v1/profiles/upload` supplies non-empty synthetic free text. Form-only normalization remains local.

## Backend environment variables

```dotenv
AI_ADAPTER_MODULE=futureproof_ai.tencent_tokenhub_adapter
TENCENT_TOKENHUB_API_KEY=
TENCENT_TOKENHUB_MODEL=minimax-m3
TENCENT_TOKENHUB_TIMEOUT_SECONDS=30
TENCENT_TOKENHUB_MAX_TOKENS=800
TENCENT_TOKENHUB_MAX_INPUT_CHARS=24000
```

`TENCENT_TOKENHUB_API_KEY` must be a backend secret. Never prefix it with `VITE_`, expose it in an API response, commit it, or paste it into issue/PR logs. The model setting is currently locked to `minimax-m3`; configuring another value fails startup.

## Request and validation behavior

The request uses OpenAI-compatible Chat Completions with `reasoning_split=true` and `response_format={"type":"json_object"}`. The prompt labels profile text as untrusted data and supplies only the local API Contract skill catalogue. The returned JSON is validated again with Pydantic. Unknown IDs are discarded, explicit form values win, and model-inferred skills always have `level=null` and `source=inferred`.

Provider failures are fail-closed:

| Provider result | API result |
| --- | --- |
| Timeout | `504 MODEL_TIMEOUT`, retryable |
| Rate limit | `429 RATE_LIMITED`, retryable |
| Provider 5xx/network failure | `503 SOURCE_UNAVAILABLE`, retryable |
| Invalid/disabled key or model | `503 SOURCE_UNAVAILABLE`, not retryable |
| Malformed model JSON | `502 MODEL_INVALID_OUTPUT`, not retryable |

Provider response bodies are not returned to the browser. There is no automatic fallback to rule-only extraction when this adapter is selected.

## Vercel Preview configuration

Configure the following on the **Backend Project**, initially for Preview only:

1. Secret: `TENCENT_TOKENHUB_API_KEY`.
2. Config: `AI_ADAPTER_MODULE=futureproof_ai.tencent_tokenhub_adapter`.
3. Config: `TENCENT_TOKENHUB_MODEL=minimax-m3`.
4. Optional config: the timeout/token/input limits shown above.

Do not configure the key on the frontend project. Keep the Preview protected because the current product has no authentication, personal-data deletion workflow, or authorization for real CV uploads.

## Verification

Offline regression tests use `httpx.MockTransport` and never consume provider credit. A live smoke test must use a fictional synthetic profile and a locally supplied environment variable. Successful normalize responses show:

From the `backend` directory, run the safe one-call smoke test after setting the key in the current terminal:

```bash
python -m scripts.smoke_tokenhub
```

The script uses a fixed fictional profile and never prints the key. Successful normalize responses show:

```json
{
  "meta": {
    "data_label": "synthetic_demo",
    "is_mock": true,
    "model_version": "tokenhub:minimax-m3"
  }
}
```

Recommendation responses use `model_version=tech-v1`, documenting that scoring remains deterministic rather than LLM-generated.

For a complete live A-flow smoke test through FastAPI, temporary SQLite, confirmation, and both recommendation scenarios, run:

```bash
python -m scripts.smoke_tokenhub_api
```

The command calls TokenHub once, uses only a fixed fictional profile, and deletes its temporary SQLite database after completion. A successful result reports `LIVE_A_FLOW_OK`, extraction model `tokenhub:minimax-m3`, and recommendation model `tech-v1`.
