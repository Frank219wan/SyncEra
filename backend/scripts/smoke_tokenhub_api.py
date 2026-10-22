"""Live A-flow smoke test with a fixed fictional profile and temporary SQLite."""

from __future__ import annotations

import json
import os
import tempfile
from pathlib import Path

from fastapi.testclient import TestClient


CONSTRAINTS = {
    "weekly_hours": 5,
    "budget_amount": 100,
    "currency": "MYR",
    "language": "en",
    "target_weeks": 12,
    "learning_pace": "focused",
}


def require_success(response, step: str) -> dict:
    if response.status_code != 200:
        raise SystemExit(f"{step} failed with HTTP {response.status_code}: {response.text}")
    return response.json()


def main() -> None:
    if not os.getenv("TENCENT_TOKENHUB_API_KEY"):
        raise SystemExit("TENCENT_TOKENHUB_API_KEY is required")

    with tempfile.TemporaryDirectory(prefix="futureproof-tokenhub-smoke-") as temp_dir:
        os.environ["AI_ADAPTER_MODULE"] = "futureproof_ai.tencent_tokenhub_adapter"
        os.environ["TENCENT_TOKENHUB_MODEL"] = "minimax-m3"
        os.environ["DATABASE_PATH"] = str(Path(temp_dir) / "profiles.sqlite")

        # Import after environment setup so the module-level FastAPI app uses the
        # real adapter and the disposable test database.
        from app.main import app

        with TestClient(app) as client:
            normalized = require_success(
                client.post(
                    "/api/v1/profiles/normalize",
                    json={
                        "pipeline": "A",
                        "input_type": "guided_text",
                        "synthetic_input": True,
                        "text": "Synthetic demo profile: I use Python and SQL for analytics projects.",
                        "form": {
                            "current_occupation": "Synthetic data intern",
                            "interests": ["analytics", "data"],
                        },
                        "study_constraints": CONSTRAINTS,
                    },
                ),
                "normalize",
            )
            profile = normalized["data"]["profile"]
            confirmed_skills = [
                {
                    **skill,
                    "level": 3,
                    "source": "confirmed",
                    "confidence": 1.0,
                }
                for skill in profile["skills"]
            ]
            confirmed = require_success(
                client.post(
                    "/api/v1/profiles/confirm",
                    json={
                        "profile_id": profile["profile_id"],
                        "profile_revision": profile["revision"],
                        "skills": confirmed_skills,
                        "reviewed_by_user": True,
                    },
                ),
                "confirm",
            )

            recommendations = {}
            recommendation_model_version = None
            for scenario in ("moderate", "fast"):
                response = require_success(
                    client.post(
                        "/api/v1/recommendations",
                        json={
                            "profile_id": profile["profile_id"],
                            "region": "MY",
                            "ai_scenario": scenario,
                            "top_k": 5,
                        },
                    ),
                    f"recommendations:{scenario}",
                )
                recommendation_model_version = response["meta"]["model_version"]
                recommendations[scenario] = [
                    {
                        "role_id": item["role_id"],
                        "match_score": item["match_score"],
                        "skill_gap_ids": [gap["skill_id"] for gap in item["skill_gaps"]],
                    }
                    for item in response["data"]["recommendations"]
                ]

            summary = {
                "status": "LIVE_A_FLOW_OK",
                "extraction_model_version": normalized["meta"]["model_version"],
                "recommendation_model_version": recommendation_model_version,
                "profile_id": profile["profile_id"],
                "confirmed_revision": confirmed["data"]["profile_revision"],
                "moderate": recommendations["moderate"],
                "fast": recommendations["fast"],
                "persistence": "temporary SQLite smoke database",
                "data_boundary": "fixed fictional synthetic profile only",
            }
            print(json.dumps(summary, ensure_ascii=True, indent=2))


if __name__ == "__main__":
    main()
