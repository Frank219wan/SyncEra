"""One-call live smoke test using fictional synthetic data only."""

from __future__ import annotations

import json

from futureproof_ai.tencent_tokenhub_adapter import create_adapter


def main() -> None:
    try:
        adapter = create_adapter()
    except ValueError as exc:
        raise SystemExit(str(exc)) from exc
    result = adapter.extract_profile(
        "Synthetic demo profile: I use Python and SQL for analytics projects.",
        {"current_occupation": "Synthetic data intern", "interests": ["analytics"]},
    )
    safe_summary = {
        "model_version": adapter.extraction_model_version,
        "skills": result["skills"],
        "current_occupation": result["current_occupation"],
        "warnings": result["warnings"],
    }
    print(json.dumps(safe_summary, ensure_ascii=True, indent=2))


if __name__ == "__main__":
    main()
