"""Simulate a stale pooled connection without calling an AI provider or Neon."""
import json
import logging
from contextlib import contextmanager

import psycopg
import psycopg_pool
from fastapi.testclient import TestClient

from app.main import create_app
from app.storage import PostgresProfileStore
from futureproof_ai.futureproof_adapter import create_adapter


CONSTRAINTS = {'weekly_hours': 5, 'budget_amount': 0, 'currency': 'MYR',
               'language': 'en', 'target_weeks': 12, 'learning_pace': 'focused'}


class CountingAdapter:
    def __init__(self):
        self.delegate = create_adapter()
        self.calls = 0
        self.is_mock = True
        self.scoring_policy = 'tech-v1'
        self.extraction_model_version = 'rules-v0.1'
        self.scoring_model_version = 'tech-v1'

    def extract_profile(self, text, form):
        self.calls += 1
        return self.delegate.extract_profile(text, form)

    def score_roles(self, profile, trends, scenario):
        return self.delegate.score_roles(profile, trends, scenario)


class FakeCursor:
    def __init__(self, rowcount=0, row=None):
        self.rowcount = rowcount
        self.row = row

    def fetchone(self):
        return self.row


class FakePool:
    def __init__(self, fail_before_insert=0, fail_after_insert=0):
        self.rows = {}
        self.borrowed = 0
        self.inserts = 0
        self.fail_before_insert = fail_before_insert
        self.fail_after_insert = fail_after_insert

    @contextmanager
    def connection(self):
        self.borrowed += 1
        pool = self

        class Connection:
            def execute(self, sql, params):
                if sql.startswith('INSERT'):
                    pool.inserts += 1
                    if pool.fail_before_insert:
                        pool.fail_before_insert -= 1
                        raise psycopg.OperationalError('sensitive_dsn_marker; sensitive_profile_marker')
                    profile_id, revision, body = params
                    if profile_id in pool.rows:
                        return FakeCursor(rowcount=0)
                    pool.rows[profile_id] = (revision, json.loads(body))
                    return FakeCursor(rowcount=1)
                if sql.startswith('SELECT revision'):
                    return FakeCursor(row=pool.rows.get(params[0]))
                raise AssertionError('unexpected SQL')

        yield Connection()
        if self.fail_after_insert:
            self.fail_after_insert -= 1
            raise psycopg.OperationalError('sensitive_dsn_marker; sensitive_profile_marker')


def client_with_pool(pool):
    store = object.__new__(PostgresProfileStore)
    store.pool = pool
    adapter = CountingAdapter()
    client = TestClient(create_app(store=store, adapter=adapter), raise_server_exceptions=False)
    return client, adapter


def normalize(client, request_id='web_test'):
    return client.post('/api/v1/profiles/normalize', headers={'X-Request-ID': request_id}, json={
        'pipeline': 'A', 'input_type': 'form', 'synthetic_input': True,
        'form': {'current_occupation': 'Fictional student', 'skills': [{'skill_id': 'skill_sql', 'level': 3}]},
        'study_constraints': CONSTRAINTS,
    })


def test_pool_checks_borrowed_connections(monkeypatch):
    seen = {}

    class Pool:
        check_connection = staticmethod(lambda connection: None)

        def __init__(self, **kwargs):
            seen.update(kwargs)

        @contextmanager
        def connection(self):
            class Connection:
                def execute(self, _sql):
                    return None
            yield Connection()

        def close(self):
            pass

    monkeypatch.delenv('VERCEL', raising=False)
    monkeypatch.setattr(psycopg_pool, 'ConnectionPool', Pool)
    store = PostgresProfileStore('postgresql://example.invalid/preview')
    assert seen['check'] is Pool.check_connection
    assert seen['max_size'] == 3
    assert seen['timeout'] == 5
    assert seen['kwargs']['connect_timeout'] == 5
    store.close()


def test_normalize_recovers_when_connection_dies_before_insert(caplog):
    pool = FakePool(fail_before_insert=1)
    client, adapter = client_with_pool(pool)
    with caplog.at_level(logging.WARNING):
        response = normalize(client)
    assert response.status_code == 200, response.text
    profile_id = response.json()['data']['profile']['profile_id']
    assert list(pool.rows) == [profile_id]
    assert pool.borrowed == pool.inserts == 2
    assert adapter.calls == 1
    assert 'sensitive_dsn_marker' not in caplog.text
    assert 'sensitive_profile_marker' not in caplog.text


def test_normalize_recovers_lost_commit_ack_without_second_profile():
    pool = FakePool(fail_after_insert=1)
    client, adapter = client_with_pool(pool)
    response = normalize(client)
    assert response.status_code == 200, response.text
    profile_id = response.json()['data']['profile']['profile_id']
    assert list(pool.rows) == [profile_id]
    assert pool.borrowed == pool.inserts == 2
    assert adapter.calls == 1


def test_persistent_connection_failure_is_bounded_and_safely_logged(caplog):
    pool = FakePool(fail_before_insert=2)
    client, adapter = client_with_pool(pool)
    with caplog.at_level(logging.WARNING):
        response = normalize(client, 'web_test_connection_failure')
    assert response.status_code == 503
    assert response.json()['error']['code'] == 'SOURCE_UNAVAILABLE'
    assert response.json()['error']['retryable'] is False
    assert pool.borrowed == pool.inserts == 2
    assert adapter.calls == 1
    assert 'request_id=web_test_connection_failure' in caplog.text
    assert 'exception_type=OperationalError' in caplog.text
    assert 'storage.py:' in caplog.text
    assert 'sensitive_dsn_marker' not in caplog.text
    assert 'sensitive_profile_marker' not in caplog.text
    assert 'Fictional student' not in caplog.text
