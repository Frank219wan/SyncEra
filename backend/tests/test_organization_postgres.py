import os
import threading
import uuid

import pytest


TEST_DATABASE_URL = os.getenv('TEST_DATABASE_URL', '')
pytestmark = pytest.mark.skipif(
    not TEST_DATABASE_URL,
    reason='TEST_DATABASE_URL is required for isolated PostgreSQL Organization tests',
)


def test_organization_postgres_persistence_and_concurrent_cas(monkeypatch):
    import psycopg
    from psycopg_pool import ConnectionPool

    from app.organization_storage import OrganizationRevisionConflict, PostgresOrganizationRepository
    from scripts.migrate_postgres import apply_migrations

    monkeypatch.setenv('DATABASE_URL', TEST_DATABASE_URL)
    with psycopg.connect(TEST_DATABASE_URL) as db:
        apply_migrations(db)
    suffix=uuid.uuid4().hex
    workspace_id=f'org_pgtest_{suffix}'
    snapshot_id=f'snap_pgtest_{suffix}'
    pool=ConnectionPool(TEST_DATABASE_URL,min_size=0,max_size=3,open=True,timeout=5)
    repository=PostgresOrganizationRepository(pool)
    common={
        'workspace_id':workspace_id,
        'mode':'career_centre',
        'region':'MY',
        'schema_version':'organization-v0.1',
        'workspace_body':{'payload_label':'Synthetic PostgreSQL test','members':[]},
        'snapshot_id':snapshot_id,
        'scenario':'moderate',
        'scoring_policy':'organization-b2-v0.1',
        'method_version':'organization-b2-v0.1',
        'data_label':'synthetic_demo',
        'is_mock':True,
        'result':{'synthetic':True},
        'warnings':[],
    }
    try:
        assert repository.save_analysis(
            **common,expected_revision=None,analysis_id=f'organalysis_initial_{suffix}',
        )==1

        outcomes=[]
        lock=threading.Lock()
        barrier=threading.Barrier(2)

        def update(index):
            barrier.wait()
            try:
                revision=repository.save_analysis(
                    **common,expected_revision=1,
                    analysis_id=f'organalysis_race_{index}_{suffix}',
                )
                outcome=('success',revision)
            except OrganizationRevisionConflict:
                outcome=('conflict',409)
            with lock:
                outcomes.append(outcome)

        threads=[threading.Thread(target=update,args=(index,)) for index in range(2)]
        for thread in threads: thread.start()
        for thread in threads: thread.join()

        assert sorted(outcomes)==[('conflict',409),('success',2)]
        with pool.connection() as db:
            revision=db.execute(
                'SELECT revision FROM public.organization_workspaces WHERE workspace_id=%s',
                (workspace_id,),
            ).fetchone()[0]
            count=db.execute(
                'SELECT count(*) FROM public.organization_analyses WHERE workspace_id=%s',
                (workspace_id,),
            ).fetchone()[0]
        assert revision==2
        assert count==2
    finally:
        with pool.connection() as db:
            db.execute('DELETE FROM public.organization_analyses WHERE workspace_id=%s',(workspace_id,))
            db.execute('DELETE FROM public.organization_workspaces WHERE workspace_id=%s',(workspace_id,))
        pool.close()
