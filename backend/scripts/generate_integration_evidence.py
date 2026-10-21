"""Generate reproducible synthetic HTTP evidence from a live local Uvicorn app."""
from __future__ import annotations

import json
import os
from pathlib import Path
import socket
import subprocess
import sys
import tempfile
import time
from io import BytesIO

import fitz
import httpx
from docx import Document

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'docs' / 'integration'
CONSTRAINTS = {'weekly_hours': 5, 'budget_amount': 100, 'currency': 'MYR', 'language': 'en', 'target_weeks': 12, 'learning_pace': 'focused'}


def pdf_bytes(text: str) -> bytes:
    doc = fitz.open()
    doc.new_page().insert_text((72, 72), text)
    data = doc.tobytes()
    doc.close()
    return data


def docx_bytes(text: str) -> bytes:
    doc = Document()
    doc.add_paragraph(text)
    stream = BytesIO()
    doc.save(stream)
    return stream.getvalue()


def write_json(name: str, value: object) -> None:
    (OUT / name).write_text(json.dumps(value, indent=2, ensure_ascii=False) + '\n')


def call(client: httpx.Client, name: str, method: str, path: str, *, payload=None, files=None, data=None):
    response = client.request(method, path, json=payload, files=files, data=data)
    record = {'method': method, 'path': path, 'status': response.status_code,
              'request': payload if payload is not None else data,
              'response': response.json()}
    if files:
        record['request'] = {**(data or {}), 'file': {'name': files['file'][0], 'size_bytes': len(files['file'][1])}}
    write_json(name + '.json', record)
    return response


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory() as tmp:
        with socket.socket() as sock:
            sock.bind(('127.0.0.1', 0))
            port = sock.getsockname()[1]
        env = os.environ.copy()
        env['DATABASE_PATH'] = str(Path(tmp) / 'profiles.sqlite')
        env.pop('AI_ADAPTER_MODULE', None)
        env.pop('ACTIVE_SNAPSHOT_ID', None)
        proc = subprocess.Popen([sys.executable, '-m', 'uvicorn', 'app.main:app', '--host', '127.0.0.1', '--port', str(port)], cwd=ROOT, env=env, stdout=subprocess.DEVNULL, stderr=subprocess.PIPE, text=True)
        try:
            with httpx.Client(base_url=f'http://127.0.0.1:{port}', timeout=20, trust_env=False) as client:
                for _ in range(100):
                    try:
                        health = client.get('/api/v1/health')
                        if health.status_code == 200:
                            break
                    except httpx.ConnectError:
                        if proc.poll() is not None:
                            raise RuntimeError(proc.stderr.read())
                        time.sleep(0.1)
                else:
                    raise RuntimeError('Uvicorn did not start')
                docs_status = client.get('/docs').status_code
                openapi = client.get('/openapi.json')
                openapi.raise_for_status()
                spec = openapi.json()
                write_json('openapi.json', spec)

                form = {'synthetic_input': 'true', 'study_constraints': json.dumps(CONSTRAINTS), 'preferred_field_id': 'field_data'}
                a = call(client, 'upload_pdf', 'POST', '/api/v1/profiles/upload',
                         files={'file': ('synthetic_analyst.pdf', pdf_bytes('Synthetic Demo CV. SQL and Excel for analytics.'))}, data=form)
                b = call(client, 'upload_docx', 'POST', '/api/v1/profiles/upload',
                         files={'file': ('synthetic_engineer.docx', docx_bytes('Synthetic Demo CV. Python and communication.'))}, data=form)
                assert a.status_code == b.status_code == 200
                pa, pb = a.json()['data']['profile'], b.json()['data']['profile']
                assert {x['skill_id'] for x in pa['skills']} != {x['skill_id'] for x in pb['skills']}
                assert not pa['reviewed_by_user']
                call(client, 'recommend_unconfirmed', 'POST', '/api/v1/recommendations',
                     payload={'profile_id': pa['profile_id'], 'ai_scenario': 'moderate'})
                confirmed = call(client, 'confirm', 'POST', '/api/v1/profiles/confirm',
                                 payload={'profile_id': pa['profile_id'], 'profile_revision': pa['revision'], 'reviewed_by_user': True,
                                          'skills': [{'skill_id': 'skill_sql', 'level': 3, 'source': 'confirmed', 'confidence': 1.0},
                                                     {'skill_id': 'skill_excel', 'level': 3, 'source': 'confirmed', 'confidence': 1.0}]})
                assert confirmed.status_code == 200
                trends_before = call(client, 'observed_skills_before', 'GET', '/api/v1/trends/skills')
                moderate = call(client, 'recommend_moderate', 'POST', '/api/v1/recommendations',
                                payload={'profile_id': pa['profile_id'], 'ai_scenario': 'moderate'})
                fast = call(client, 'recommend_fast', 'POST', '/api/v1/recommendations',
                            payload={'profile_id': pa['profile_id'], 'ai_scenario': 'fast'})
                trends_after = call(client, 'observed_skills_after', 'GET', '/api/v1/trends/skills')
                assert moderate.status_code == fast.status_code == 200
                assert trends_before.json()['data'] == trends_after.json()['data']
                assert moderate.json()['meta']['snapshot_id'] == fast.json()['meta']['snapshot_id']
                recs = moderate.json()['data']['recommendations']
                chosen = next((r for r in recs if r['skill_gaps']), None)
                if chosen:
                    gap = chosen['skill_gaps'][0]['skill_id']
                    skill_map = call(client, 'skill_map', 'POST', '/api/v1/learning/skill-map',
                                     payload={'profile_id': pa['profile_id'], 'role_id': chosen['role_id'], 'skill_id': gap,
                                              'language': 'en', 'budget_amount': 100, 'currency': 'MYR'})
                    roadmap = call(client, 'roadmap', 'POST', '/api/v1/learning/roadmap',
                                   payload={'profile_id': pa['profile_id'], 'role_id': chosen['role_id'],
                                            'selected_skill_ids': [gap], 'study_constraints': CONSTRAINTS})
                else:
                    skill_map = roadmap = None

                rows = ['# Actual API route audit', '', 'Generated from the live `/openapi.json`. Declared status codes are OpenAPI declarations; runtime business errors may also occur.', '', '| Method | Path | Request schema | Primary response | Declared codes | Status |', '|---|---|---|---|---|---|']
                for path, ops in spec['paths'].items():
                    if not path.startswith('/api/v1/'):
                        continue
                    for method, op in ops.items():
                        body = op.get('requestBody', {}).get('content', {})
                        request_schema = ', '.join(f'{media}: {entry["schema"].get("$ref", "inline")}' for media, entry in body.items()) or 'none'
                        responses = op.get('responses', {})
                        primary_code = '200' if '200' in responses else '503' if '503' in responses else next(iter(responses), None)
                        primary_schema = responses.get(primary_code, {}).get('content', {}).get('application/json', {}).get('schema', {})
                        response_schema = primary_schema.get('$ref', 'inline/none')
                        codes = ', '.join(op.get('responses', {}))
                        status = 'P1_DISABLED' if path in ('/api/v1/progress/skills', '/api/v1/organizations/{mode}/analyze', '/api/v1/admin/trends/refresh') else ('REAL' if path in ('/api/v1/health', '/api/v1/profiles/confirm') else 'PARTIAL' if path in ('/api/v1/profiles/normalize', '/api/v1/profiles/upload') else 'MOCK')
                        rows.append(f'| {method.upper()} | `{path}` | `{request_schema}` | `{response_schema}` | {codes} | {status} |')
                rows += ['', 'Upload is a proposed additive v1 extension. P1 routes return 503. `MOCK` means synthetic market/role or rule-only output. `PARTIAL` means real input or parsing with rule-only extraction.']
                (OUT / 'API_ROUTE_AUDIT.md').write_text('\n'.join(rows) + '\n')

                summary = ['# Actual individual HTTP examples', '', 'Generated by `scripts/generate_integration_evidence.py` against a live local Uvicorn process with a temporary SQLite database. All CVs are synthetic. The default adapter is rule-only; no real AI or market data was used.', '', f'- `/api/v1/health`: {health.status_code}', f'- `/docs`: {docs_status}', f'- `/openapi.json`: {openapi.status_code}; {len([p for p in spec["paths"] if p.startswith("/api/v1/")])} API paths', f'- PDF upload: {a.status_code}; profile `{pa["profile_id"]}`; unconfirmed', f'- DOCX upload: {b.status_code}; profile `{pb["profile_id"]}`; different extracted skill IDs', f'- Confirm: {confirmed.status_code}; revision {confirmed.json()["data"]["profile_revision"]}', f'- Moderate recommendation: {moderate.status_code}', f'- Fast recommendation: {fast.status_code}', f'- Observed skill ranking unchanged across scenario calls: {trends_before.json()["data"] == trends_after.json()["data"]}', f'- Skill map: {skill_map.status_code if skill_map else "BLOCKED: no gap"}', f'- Roadmap: {roadmap.status_code if roadmap else "BLOCKED: no gap"}', '', 'Request/response records: `upload_pdf.json`, `upload_docx.json`, `confirm.json`, `recommend_moderate.json`, `recommend_fast.json`, `skill_map.json`, `roadmap.json`. `recommend_unconfirmed.json` records the expected `PROFILE_NOT_CONFIRMED` failure. `observed_skills_before.json` and `observed_skills_after.json` show the same observed market data. Resource URLs are absent because no reviewed course catalogue was supplied.', '']
                (OUT / 'INDIVIDUAL_API_EXAMPLES.md').write_text('\n'.join(summary))
                (OUT / 'UPLOAD_API_EXAMPLES.md').write_text('# Synthetic CV upload HTTP examples\n\nThe live multipart request/response records are in `upload_pdf.json` and `upload_docx.json`. Binary CVs were generated in memory and were not saved. The `file` object in each record describes the transmitted binary; `study_constraints` is a JSON form field. Both responses are unconfirmed profiles with `meta.is_mock=true` because the rule-only adapter is active. See `confirm.json` and `recommend_unconfirmed.json` for the confirmation boundary.\n')
                print(json.dumps({'health':health.status_code,'docs':docs_status,'openapi':openapi.status_code,'paths':len([p for p in spec['paths'] if p.startswith('/api/v1/')]),'pdf':a.status_code,'docx':b.status_code,'confirm':confirmed.status_code,'moderate':moderate.status_code,'fast':fast.status_code,'skill_map':skill_map.status_code if skill_map else None,'roadmap':roadmap.status_code if roadmap else None},ensure_ascii=False))
        finally:
            proc.terminate()
            try:
                proc.wait(timeout=3)
            except subprocess.TimeoutExpired:
                proc.kill()
                proc.wait()


if __name__ == '__main__':
    main()
