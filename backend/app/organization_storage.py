from __future__ import annotations

import json
from copy import deepcopy
from threading import Lock
from typing import Any, Protocol


class OrganizationRevisionConflict(RuntimeError):
    pass


class OrganizationRepository(Protocol):
    def save_analysis(
        self,
        *,
        workspace_id: str,
        expected_revision: int | None,
        mode: str,
        region: str,
        schema_version: str,
        workspace_body: dict[str, Any],
        analysis_id: str,
        snapshot_id: str,
        scenario: str,
        scoring_policy: str,
        method_version: str,
        data_label: str,
        is_mock: bool,
        result: dict[str, Any],
        warnings: list[str],
    ) -> int: ...


class InMemoryOrganizationRepository:
    """Process-local test/dev repository. Hosted Preview never uses this."""

    def __init__(self):
        self._lock = Lock()
        self._workspaces: dict[str, dict[str, Any]] = {}
        self._analyses: dict[str, dict[str, Any]] = {}

    def save_analysis(self, **values) -> int:
        with self._lock:
            workspace_id = values["workspace_id"]
            expected = values["expected_revision"]
            existing = self._workspaces.get(workspace_id)
            if expected is None:
                if existing is not None:
                    raise OrganizationRevisionConflict("workspace already exists")
                revision = 1
            else:
                if (existing is None or existing["revision"] != expected or
                        existing["mode"] != values["mode"]):
                    raise OrganizationRevisionConflict("stale workspace revision")
                revision = expected + 1
            self._workspaces[workspace_id] = {
                "revision": revision,
                "body": deepcopy(values["workspace_body"]),
                "mode": values["mode"],
            }
            self._analyses[values["analysis_id"]] = deepcopy(values["result"])
            return revision


class PostgresOrganizationRepository:
    """Organization persistence sharing the serverless-safe profile pool."""

    def __init__(self, pool):
        self.pool = pool
        try:
            with self.pool.connection() as db:
                db.execute("SELECT workspace_id FROM public.organization_workspaces LIMIT 0")
                db.execute("SELECT analysis_id FROM public.organization_analyses LIMIT 0")
        except Exception:
            raise RuntimeError("PostgreSQL organization schema is unavailable; run migration 20261023_04") from None

    def save_analysis(self, **values) -> int:
        workspace_id = values["workspace_id"]
        expected = values["expected_revision"]
        body = json.dumps(values["workspace_body"], separators=(",", ":"), sort_keys=True)
        result = json.dumps(values["result"], separators=(",", ":"), sort_keys=True)
        warnings = json.dumps(values["warnings"], separators=(",", ":"))
        with self.pool.connection() as db:
            if expected is None:
                cursor = db.execute(
                    "INSERT INTO public.organization_workspaces "
                    "(workspace_id,mode,region,label,synthetic_input,reviewed_by_user,revision,schema_version,body) "
                    "VALUES (%s,%s,%s,%s,TRUE,TRUE,1,%s,%s::jsonb) ON CONFLICT (workspace_id) DO NOTHING",
                    (workspace_id, values["mode"], values["region"], values["workspace_body"]["payload_label"], values["schema_version"], body),
                )
                if cursor.rowcount != 1:
                    raise OrganizationRevisionConflict("workspace already exists")
                revision = 1
            else:
                revision = expected + 1
                cursor = db.execute(
                    "UPDATE public.organization_workspaces SET body=%s::jsonb,revision=%s,updated_at=now() "
                    "WHERE workspace_id=%s AND revision=%s AND mode=%s",
                    (body, revision, workspace_id, expected, values["mode"]),
                )
                if cursor.rowcount != 1:
                    raise OrganizationRevisionConflict("stale workspace revision")
            db.execute(
                "INSERT INTO public.organization_analyses "
                "(analysis_id,workspace_id,input_revision,snapshot_id,scenario,scoring_policy,method_version,data_label,is_mock,result,warnings) "
                "VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s::jsonb,%s::jsonb)",
                (values["analysis_id"], workspace_id, revision, values["snapshot_id"], values["scenario"], values["scoring_policy"], values["method_version"], values["data_label"], values["is_mock"], result, warnings),
            )
        return revision
