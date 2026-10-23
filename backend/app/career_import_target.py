"""Fail-closed identity check for offline Preview catalogue writes.

The allowlist is code-reviewed, not supplied by the same environment as the
connection string. Neon control-plane metadata is fetched over HTTPS before
opening a database connection. Never include URLs, tokens or API responses in
errors: they can contain credentials.
"""

from __future__ import annotations

import json
import os
from urllib.parse import parse_qsl, unquote, urlsplit
from urllib.request import HTTPRedirectHandler, Request, build_opener


PROJECT_ID = "aged-surf-56749653"
PROJECT_NAME = "syncera-preview"
BRANCH_ID = "br-falling-glade-aox9nfes"
BRANCH_NAME = "preview"
DATABASE_NAME = "syncera_preview"
API_ROOT = f"https://console.neon.tech/api/v2/projects/{PROJECT_ID}"
MAX_METADATA_BYTES = 128 * 1024


class PreviewTargetError(ValueError):
    """Target identity cannot be proven; no database write is permitted."""


class _NoRedirect(HTTPRedirectHandler):
    def redirect_request(self, request, fp, code, msg, headers, newurl):
        raise PreviewTargetError("Neon metadata request was redirected")


def _metadata(path: str, api_key: str) -> dict:
    request = Request(API_ROOT + path, headers={
        "Authorization": f"Bearer {api_key}", "Accept": "application/json",
    })
    try:
        with build_opener(_NoRedirect()).open(request, timeout=5) as response:
            if response.status != 200:
                raise PreviewTargetError("Neon metadata unavailable")
            raw = response.read(MAX_METADATA_BYTES + 1)
            if len(raw) > MAX_METADATA_BYTES:
                raise PreviewTargetError("Neon metadata response too large")
        result = json.loads(raw)
        if not isinstance(result, dict):
            raise ValueError("invalid metadata")
        return result
    except PreviewTargetError:
        raise
    except Exception as exc:
        raise PreviewTargetError("Neon metadata unavailable") from None


def verify_preview_target(database_url: str) -> str:
    """Return the verified direct Neon hostname, or refuse before connecting.

    A normal Neon `sslmode=require` URL must be changed to `verify-full` for
    this offline write workflow. The connection also uses the system CA store.
    """

    try:
        parsed = urlsplit(database_url)
        params = parse_qsl(parsed.query, keep_blank_values=True, strict_parsing=True)
        query = dict(params)
        host = (parsed.hostname or "").lower()
        database = unquote(parsed.path.removeprefix("/"))
        if (
            parsed.scheme not in {"postgresql", "postgres"}
            or not parsed.username or not parsed.password or not host
            or parsed.port not in {None, 5432}
            or parsed.fragment or not parsed.path.startswith("/")
            or "/" in database or database != DATABASE_NAME
            or len(params) != len(query) or query.get("sslmode") != "verify-full"
            or set(query) not in ({"sslmode"}, {"sslmode", "channel_binding"})
            or ("channel_binding" in query and query["channel_binding"] != "require")
            or not host.endswith(".aws.neon.tech")
            or "-pooler." in host
        ):
            raise PreviewTargetError("DATABASE_URL is not an approved direct TLS Preview target")
    except PreviewTargetError:
        raise
    except (ValueError, AttributeError) as exc:
        raise PreviewTargetError("DATABASE_URL is not an approved direct TLS Preview target") from None

    api_key = os.getenv("NEON_API_KEY")
    if not api_key:
        raise PreviewTargetError("Neon control-plane authorization is required")
    project = _metadata("", api_key).get("project", {})
    branch = _metadata(f"/branches/{BRANCH_ID}", api_key).get("branch", {})
    endpoints = _metadata(f"/branches/{BRANCH_ID}/endpoints", api_key).get("endpoints", [])
    databases = _metadata(f"/branches/{BRANCH_ID}/databases", api_key).get("databases", [])
    if (
        not isinstance(project, dict) or project.get("id") != PROJECT_ID
        or project.get("name") != PROJECT_NAME
        or not isinstance(branch, dict) or branch.get("id") != BRANCH_ID
        or branch.get("project_id") != PROJECT_ID or branch.get("name") != BRANCH_NAME
        or not isinstance(endpoints, list) or not isinstance(databases, list)
    ):
        raise PreviewTargetError("Neon Preview identity does not match the reviewed allowlist")
    matching = [endpoint for endpoint in endpoints if isinstance(endpoint, dict)
                and endpoint.get("host", "").lower() == host
                and endpoint.get("project_id") == PROJECT_ID
                and endpoint.get("branch_id") == BRANCH_ID
                and endpoint.get("type") == "read_write"
                and endpoint.get("disabled") is False]
    if len(matching) != 1 or not any(
        isinstance(db, dict) and db.get("name") == DATABASE_NAME
        and db.get("branch_id") == BRANCH_ID for db in databases
    ):
        raise PreviewTargetError("Neon endpoint or database does not match the reviewed Preview")
    return host


def verify_connected_preview(connection) -> None:
    """Check the connected database and negotiated TLS before any SQL write."""

    try:
        with connection.cursor() as cursor:
            cursor.execute(
                "SELECT current_database(), ssl, version FROM pg_stat_ssl "
                "WHERE pid = pg_backend_pid()"
            )
            row = cursor.fetchone()
    except Exception:
        raise PreviewTargetError("Could not verify connected Preview database and TLS") from None
    if not row or row[0] != DATABASE_NAME or row[1] is not True or not row[2]:
        raise PreviewTargetError("Connected database or TLS does not match approved Preview")
