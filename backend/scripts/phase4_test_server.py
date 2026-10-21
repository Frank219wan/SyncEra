"""Isolated, loopback-only Phase 4 technical precheck app for HTTP evidence.

This module refuses to import unless the evidence generator explicitly enables it.
The precheck manifests never enter data/approved or normal app startup.
"""
from __future__ import annotations

import json
import os
from pathlib import Path

if os.getenv("PHASE4_TEST_ONLY") != "1":
    raise RuntimeError("Phase 4 precheck server is only for isolated technical tests")

from app.approved_data import MarketRepository, ResourceRepository
from app.main import create_app

DELIVERY = Path(__file__).resolve().parents[1] / "tech_delivery"


def read(name: str):
    return json.loads((DELIVERY / name).read_text(encoding="utf-8"))


snapshot = read("snapshot_dosm_mycol_my_2026q2_v1.json")
market = MarketRepository(active_snapshot_id=snapshot["snapshot_id"])
market.import_public(snapshot, read("source_approvals_TECHNICAL_PRECHECK_NOT_FOR_ACTIVATION.json"),
                     allow_technical_precheck=True)
resources = ResourceRepository()
resources.import_approved(read("resources_python_p1.json"),
                          read("resource_approvals_TECHNICAL_PRECHECK_NOT_FOR_ACTIVATION.json"),
                          allow_technical_precheck=True)
app = create_app(market=market, resources=resources)
