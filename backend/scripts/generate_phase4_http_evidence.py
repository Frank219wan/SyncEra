"""Run the candidate A flow over loopback HTTP and save synthetic evidence.

Only the explicit PHASE4_TEST_ONLY server can use technical precheck manifests.
No precheck file is copied to the approved-data directory.
"""
from __future__ import annotations

from io import BytesIO
import json
import os
from pathlib import Path
import socket
import subprocess
import sys
import tempfile
import time

import fitz
import httpx
from docx import Document

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "docs" / "integration" / "phase4_http"
SNAPSHOT_ID = "snap_my_dosm_mycol_2026q2_v1"
CONSTRAINTS = {"weekly_hours": 5, "budget_amount": 100, "currency": "MYR",
               "language": "en", "target_weeks": 12, "learning_pace": "focused"}


def pdf_bytes(text: str) -> bytes:
    document = fitz.open()
    document.new_page().insert_text((72, 72), text)
    data = document.tobytes()
    document.close()
    return data


def docx_bytes(text: str) -> bytes:
    document = Document()
    document.add_paragraph(text)
    stream = BytesIO()
    document.save(stream)
    return stream.getvalue()


def main() -> None:
    records = []
    with tempfile.TemporaryDirectory(prefix="futureproof-phase4-") as tmp:
        with socket.socket() as sock:
            sock.bind(("127.0.0.1", 0))
            port = sock.getsockname()[1]
        env = os.environ.copy()
        env.update({"PHASE4_TEST_ONLY": "1", "AI_ADAPTER_MODULE": "futureproof_ai.futureproof_adapter",
                    "DATABASE_PATH": str(Path(tmp) / "profiles.sqlite"),
                    "APPROVED_DATA_DIR": str(Path(tmp) / "empty-approved")})
        env.pop("ACTIVE_SNAPSHOT_ID", None)
        process = subprocess.Popen(
            [sys.executable, "-m", "uvicorn", "scripts.phase4_test_server:app", "--host", "127.0.0.1",
             "--port", str(port)], cwd=ROOT, env=env, stdout=subprocess.DEVNULL,
            stderr=subprocess.PIPE, text=True,
        )
        try:
            with httpx.Client(base_url=f"http://127.0.0.1:{port}", timeout=20, trust_env=False) as client:
                for _ in range(100):
                    try:
                        if client.get("/api/v1/health").status_code == 200:
                            break
                    except httpx.ConnectError:
                        if process.poll() is not None:
                            raise RuntimeError(process.stderr.read())
                        time.sleep(0.1)
                else:
                    raise RuntimeError("Phase 4 Uvicorn did not start")

                def call(name, method, path, *, payload=None, data=None, files=None, params=None):
                    response = client.request(method, path, json=payload, data=data, files=files, params=params)
                    request = payload if payload is not None else data if data is not None else params
                    if files:
                        request = {**(data or {}), "file": {"name": files["file"][0],
                                                          "size_bytes": len(files["file"][1])}}
                    records.append({"step": name, "method": method, "path": path, "status": response.status_code,
                                    "request": request, "response": response.json() if "json" in response.headers.get("content-type", "") else None})
                    return response

                health = call("health", "GET", "/api/v1/health")
                docs = client.get("/docs")
                openapi = call("openapi", "GET", "/openapi.json")
                assert health.status_code == docs.status_code == openapi.status_code == 200
                paths = openapi.json()["paths"]
                assert len([path for path in paths if path.startswith("/api/v1/")]) == 16

                form = {"synthetic_input": "true", "study_constraints": json.dumps(CONSTRAINTS),
                        "preferred_field_id": "field_data"}
                pdf = call("upload_pdf", "POST", "/api/v1/profiles/upload", data=form,
                           files={"file": ("synthetic_analyst.pdf", pdf_bytes("Synthetic Demo CV. SQL and Python analytics."))})
                docx = call("upload_docx", "POST", "/api/v1/profiles/upload", data=form,
                            files={"file": ("synthetic_analyst.docx", docx_bytes("Synthetic Demo CV. Python analytics."))})
                assert pdf.status_code == docx.status_code == 200
                profile = pdf.json()["data"]["profile"]
                assert not profile["reviewed_by_user"] and profile["revision"] == 1
                assert {skill["skill_id"] for skill in profile["skills"]} == {"skill_sql", "skill_python"}
                assert all(skill["level"] is None for skill in profile["skills"])
                assert {skill["skill_id"] for skill in docx.json()["data"]["profile"]["skills"]} == {"skill_python"}
                assert pdf.json()["meta"]["data_label"] == "synthetic_demo"
                assert pdf.json()["meta"]["is_mock"] is True

                recommendation_body = {"profile_id": profile["profile_id"], "region": "MY",
                                       "preferred_field_id": "field_data", "snapshot_id": SNAPSHOT_ID,
                                       "ai_scenario": "moderate"}
                blocked = call("recommend_unconfirmed", "POST", "/api/v1/recommendations",
                               payload=recommendation_body)
                assert blocked.status_code == 422 and blocked.json()["error"]["code"] == "PROFILE_NOT_CONFIRMED"
                confirmed = call("confirm", "POST", "/api/v1/profiles/confirm",
                                 payload={"profile_id": profile["profile_id"], "profile_revision": 1,
                                          "reviewed_by_user": True,
                                          "skills": [{"skill_id": "skill_sql", "level": 3, "source": "confirmed", "confidence": 1.0},
                                                     {"skill_id": "skill_python", "level": 1, "source": "confirmed", "confidence": 1.0}]})
                assert confirmed.status_code == 200
                assert confirmed.json()["data"]["profile_revision"] == 2
                stale = call("confirm_stale_revision", "POST", "/api/v1/profiles/confirm",
                             payload={"profile_id": profile["profile_id"], "profile_revision": 1,
                                      "reviewed_by_user": True, "skills": []})
                assert stale.status_code == 409

                roles_before = call("observed_roles_before", "GET", "/api/v1/trends/roles",
                                    params={"snapshot_id": SNAPSHOT_ID})
                skills_before = call("observed_skills_before", "GET", "/api/v1/trends/skills",
                                     params={"snapshot_id": SNAPSHOT_ID})
                moderate = call("recommend_moderate", "POST", "/api/v1/recommendations",
                                payload=recommendation_body)
                fast = call("recommend_fast", "POST", "/api/v1/recommendations",
                            payload={**recommendation_body, "ai_scenario": "fast"})
                roles_after = call("observed_roles_after", "GET", "/api/v1/trends/roles",
                                   params={"snapshot_id": SNAPSHOT_ID})
                skills_after = call("observed_skills_after", "GET", "/api/v1/trends/skills",
                                    params={"snapshot_id": SNAPSHOT_ID})
                assert all(response.status_code == 200 for response in
                           (roles_before, skills_before, moderate, fast, roles_after, skills_after))
                assert roles_before.json()["data"] == roles_after.json()["data"]
                assert skills_before.json()["data"] == skills_after.json()["data"]
                observed = roles_before.json()["data"]["items"][0]
                assert observed["observed_metrics"]["valid_postings"] == 3053
                assert observed["trend_score"] == 46.5
                assert all(response.json()["meta"]["data_label"] == "mixed_demo" and
                           response.json()["meta"]["is_mock"] is True for response in
                           (roles_before, skills_before, moderate, fast))
                rec_m = moderate.json()["data"]["recommendations"][0]
                rec_f = fast.json()["data"]["recommendations"][0]
                assert rec_m["score_breakdown"]["scenario_outlook"] == 46.5
                assert rec_f["score_breakdown"]["scenario_outlook"] == 48.83
                assert rec_m["match_score"] != rec_f["match_score"]
                for recommendation in (rec_m, rec_f):
                    breakdown = recommendation["score_breakdown"]
                    total = round(0.45 * breakdown["skill_compatibility"] +
                                  0.20 * breakdown["interests_preferences"] +
                                  0.20 * breakdown["scenario_outlook"] +
                                  0.15 * breakdown["transition_feasibility"], 2)
                    assert abs(total - recommendation["match_score"]) <= 0.01
                    assert recommendation["evidence_ids"] == observed["evidence_ids"]
                assert "skill_python" in {gap["skill_id"] for gap in rec_m["skill_gaps"]}

                evidence_results = []
                for evidence_id in rec_m["evidence_ids"]:
                    result = call("evidence_" + evidence_id, "GET", "/api/v1/evidence/" + evidence_id)
                    assert result.status_code == 200
                    assert result.json()["meta"]["data_label"] == "mixed_demo"
                    assert result.json()["meta"]["is_mock"] is True
                    evidence_results.append(evidence_id)

                skill_map = call("skill_map_python", "POST", "/api/v1/learning/skill-map",
                                 payload={"profile_id": profile["profile_id"], "role_id": rec_m["role_id"],
                                          "skill_id": "skill_python", "language": "en", "budget_amount": 0,
                                          "currency": "MYR"})
                roadmap = call("roadmap", "POST", "/api/v1/learning/roadmap",
                               payload={"profile_id": profile["profile_id"], "role_id": rec_m["role_id"],
                                        "selected_skill_ids": ["skill_python"], "study_constraints": CONSTRAINTS})
                assert skill_map.status_code == roadmap.status_code == 200
                resource = skill_map.json()["data"]["nodes"][0]["resource"]
                assert resource["resource_id"] == "resource_mslearn_python_fundamentals_p1"
                assert resource["url"].startswith("https://learn.microsoft.com/")
                assert resource["language"] == "en" and resource["currency"] == "MYR"
                assert resource["cost_amount"] == 0 and resource["estimated_hours"] == 3.2
                assert roadmap.json()["data"]["ordered_steps"][0]["resource"]["resource_id"] == resource["resource_id"]

                p1 = {
                    "progress": call("p1_progress", "POST", "/api/v1/progress/skills", payload={}),
                    "organization": call("p1_organization", "POST", "/api/v1/organizations/hr/analyze", payload={}),
                    "refresh": call("p1_refresh", "POST", "/api/v1/admin/trends/refresh", payload={}),
                }
                assert all(response.status_code == 503 for response in p1.values())

                OUT.mkdir(parents=True, exist_ok=True)
                (OUT / "phase4_http_evidence.json").write_text(
                    json.dumps({"status": "TECHNICAL_PRECHECK_NOT_FOR_ACTIVATION",
                                "server": "loopback Uvicorn; synthetic PDF/DOCX; temporary SQLite; explicit precheck repositories",
                                "records": records}, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
                summary = {"health": health.status_code, "docs": docs.status_code,
                           "openapi": openapi.status_code, "api_paths": 16,
                           "pdf_upload": pdf.status_code, "docx_upload": docx.status_code,
                           "unconfirmed_recommendation": blocked.status_code,
                           "confirmed_revision": 2, "stale_revision": stale.status_code,
                           "candidate_snapshot": SNAPSHOT_ID, "observed_valid_postings": 3053,
                           "observed_metrics_unchanged": True,
                           "moderate_outlook": 46.5, "fast_outlook": 48.83,
                           "moderate_match_score": rec_m["match_score"],
                           "fast_match_score": rec_f["match_score"],
                           "score_arithmetic_valid": True, "evidence_ids_resolved": evidence_results,
                           "skill_gap_python": True, "skill_map": skill_map.status_code,
                           "resource_id": resource["resource_id"], "roadmap": roadmap.status_code,
                           "p1_statuses": {name: response.status_code for name, response in p1.items()},
                           "response_provenance": "mixed_demo / is_mock=true",
                           "formal_approval": False}
                (OUT / "summary.json").write_text(json.dumps(summary, indent=2) + "\n", encoding="utf-8")
                print(json.dumps(summary, ensure_ascii=False))
        finally:
            process.terminate()
            try:
                process.wait(timeout=3)
            except subprocess.TimeoutExpired:
                process.kill()
                process.wait()


if __name__ == "__main__":
    main()
