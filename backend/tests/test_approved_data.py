"""Test-only simulated approvals. URLs here are never included in runtime data."""
from copy import deepcopy
from datetime import datetime, timedelta, timezone
import pytest
from fastapi.testclient import TestClient
from app.approved_data import MarketRepository, ResourceRepository, ImportRejected
from app.main import create_app
from app.storage import ProfileStore
from test_api import CONSTRAINTS, profile


def package():
    now=datetime.now(timezone.utc).replace(microsecond=0)
    source_url='https://example.org/test-only-market-source'
    evidence={'evidence_id':'ev_test_only_public','title':'Test-only approved source placeholder','source_url':source_url,'source_type':'dataset','published_or_collected_at':now.date().isoformat(),'retrieved_at':now.isoformat(),'region':'MY','limitations':'TEST ONLY: no actual market claim'}
    raw={'snapshot_id':'snap_test_only_public','region':'MY','window_start':now.date().isoformat(),'window_end':now.date().isoformat(),'collected_at':now.isoformat(),'method_version':'test-only-method','data_label':'public_open','evidence':[evidence],
         'role_signals':[{'role_id':'role_data_analyst','trend_score':60,'signal_label':'current_snapshot','evidence_ids':[evidence['evidence_id']],'observed_metrics':{'valid_postings':None},'score_basis':'Test-only normalized example score'}],
         'skill_signals':[{'skill_id':'skill_python','trend_score':70,'signal_label':'current_snapshot','evidence_ids':[evidence['evidence_id']],'observed_metrics':{'mention_rate':None},'score_basis':'Test-only normalized example score'}],
         'scenario_assumptions':{'moderate':{'role_data_analyst':1.0},'fast':{'role_data_analyst':1.1}},'assumption_basis':'Test-only assumption for validation','uncertainty':'Test-only fixture; not an observed market claim'}
    approvals=[{'evidence_id':evidence['evidence_id'],'source_url':source_url,'reviewed_by':'test-reviewer','reviewed_at':(now+timedelta(seconds=1)).isoformat()}]
    return raw,approvals


def approved_market():
    raw,approvals=package()
    market=MarketRepository(active_snapshot_id=raw['snapshot_id'])
    market.import_public(raw,approvals)
    market.validate_active()
    return market


def resource_pair():
    now=datetime.now(timezone.utc).replace(microsecond=0)
    url='https://example.org/test-only-course'
    entry={'resource':{'resource_id':'resource_test_only','title':'Test-only course placeholder','provider':'Test provider','url':url,'language':'en','cost_amount':10,'currency':'MYR','estimated_hours':8,'verified_at':now.isoformat()},'skill_ids':['skill_python']}
    approval={'resource_id':'resource_test_only','url':url,'reviewed_by':'test-reviewer','reviewed_at':(now+timedelta(seconds=1)).isoformat()}
    return [entry],[approval]


def test_reviewed_public_import_and_provenance(tmp_path):
    market=approved_market()
    client=TestClient(create_app(store=ProfileStore(str(tmp_path/'profiles.sqlite')),market=market))
    trends=client.get('/api/v1/trends/roles').json()
    assert trends['meta']['data_label']=='public_open' and trends['meta']['is_mock'] is False
    assert trends['meta']['snapshot_id']=='snap_test_only_public'
    assert trends['data']['items'][0]['evidence_ids']==['ev_test_only_public']
    evidence=client.get('/api/v1/evidence/ev_test_only_public').json()
    assert evidence['meta']['data_label']=='public_open' and evidence['meta']['is_mock'] is False
    p=profile(client)
    request={'profile_id':p['profile_id'],'region':'MY','ai_scenario':'moderate','preferred_field_id':'field_data'}
    moderate=client.post('/api/v1/recommendations',json=request).json()
    fast=client.post('/api/v1/recommendations',json={**request,'ai_scenario':'fast'}).json()
    assert moderate['meta']['data_label']=='mixed_demo' and moderate['meta']['is_mock'] is True
    assert moderate['data']['recommendations'][0]['evidence_ids']==['ev_test_only_public']
    assert moderate['data']['recommendations'][0]['match_score']!=fast['data']['recommendations'][0]['match_score']
    assert client.get('/api/v1/trends/roles').json()['data']==trends['data']
    # A second reviewed score changes recommendation output without modifying the first snapshot.
    raw,approvals=package(); raw['snapshot_id']='snap_test_only_second'; raw['role_signals'][0]['trend_score']=90
    raw['evidence'][0]['evidence_id']='ev_test_only_second'; raw['role_signals'][0]['evidence_ids']=['ev_test_only_second']; raw['skill_signals'][0]['evidence_ids']=['ev_test_only_second']; approvals[0]['evidence_id']='ev_test_only_second'
    market.import_public(raw,approvals)
    market.active_snapshot_id='snap_test_only_second'
    changed=client.post('/api/v1/recommendations',json=request).json()
    assert changed['data']['recommendations'][0]['match_score']!=moderate['data']['recommendations'][0]['match_score']
    assert market.get_snapshot('snap_test_only_public').role_scores['role_data_analyst']==60


@pytest.mark.parametrize('change',[
    lambda raw,approvals: raw['evidence'][0].update(source_url=None),
    lambda raw,approvals: approvals[0].update(source_url='https://example.org/unapproved'),
    lambda raw,approvals: raw['role_signals'][0].update(role_id='role_unknown'),
    lambda raw,approvals: raw['role_signals'][0].update(evidence_ids=['ev_missing']),
    lambda raw,approvals: raw['role_signals'][0].update(observed_metrics={'delta_percent':50}),
    lambda raw,approvals: raw.update(window_start='2030-01-01'),
])
def test_reject_invalid_public_import(change):
    raw,approvals=package()
    change(raw,approvals)
    market=MarketRepository()
    with pytest.raises(ImportRejected): market.import_public(raw,approvals)
    assert 'snap_test_only_public' not in market.snapshots
    assert 'ev_test_only_public' not in market.evidence


def test_resource_approval_and_skill_map(tmp_path):
    entries,approvals=resource_pair()
    resources=ResourceRepository()
    resources.import_approved(entries,approvals)
    client=TestClient(create_app(store=ProfileStore(str(tmp_path/'profiles.sqlite')),resources=resources))
    p=profile(client)
    body={'profile_id':p['profile_id'],'role_id':'role_data_analyst','skill_id':'skill_python','language':'en','budget_amount':100,'currency':'MYR'}
    mapped=client.post('/api/v1/learning/skill-map',json=body).json()
    assert mapped['data']['nodes'][0]['resource']['resource_id']=='resource_test_only'
    assert mapped['meta']['data_label']=='mixed_demo' and mapped['meta']['is_mock'] is True
    constrained=client.post('/api/v1/learning/skill-map',json={**body,'budget_amount':0}).json()
    assert all('resource' not in n for n in constrained['data']['nodes'])
    roadmap=client.post('/api/v1/learning/roadmap',json={'profile_id':p['profile_id'],'role_id':'role_data_analyst','selected_skill_ids':['skill_python'],'study_constraints':CONSTRAINTS}).json()
    assert roadmap['data']['ordered_steps'][0]['resource']['resource_id']=='resource_test_only'


def test_resource_rejects_unapproved_or_unsafe_url():
    entries,approvals=resource_pair()
    approvals[0]['url']='https://example.org/different'
    with pytest.raises(ImportRejected): ResourceRepository().import_approved(entries,approvals)
    entries,approvals=resource_pair()
    entries[0]['resource']['url']='http://localhost/private'
    approvals[0]['url']='http://localhost/private'
    with pytest.raises(ImportRejected): ResourceRepository().import_approved(entries,approvals)


def test_missing_active_snapshot_rejected():
    market=MarketRepository(active_snapshot_id='snap_not_imported')
    with pytest.raises(ImportRejected): market.validate_active()


def test_import_round_trip(tmp_path):
    import json
    from app.import_data import main
    raw,approvals=package()
    package_file=tmp_path/'package.json'; approval_file=tmp_path/'approval.json'; output=tmp_path/'approved'
    package_file.write_text(json.dumps(raw)); approval_file.write_text(json.dumps(approvals))
    main(['snapshot','--package',str(package_file),'--approvals',str(approval_file),'--output-dir',str(output)])
    loaded=MarketRepository(active_snapshot_id=raw['snapshot_id'])
    loaded.load_dir(output); loaded.validate_active()
    assert loaded.get_snapshot().role_scores['role_data_analyst']==60

def test_missing_ai_module_fails_explicitly(monkeypatch,tmp_path):
    from app.ai_adapter import AIAdapterConfigurationError
    monkeypatch.setenv('AI_ADAPTER_MODULE','missing_futureproof_test_module')
    with pytest.raises(AIAdapterConfigurationError):
        create_app(store=ProfileStore(str(tmp_path/'profiles.sqlite')))
    monkeypatch.delenv('AI_ADAPTER_MODULE')
    client=TestClient(create_app(store=ProfileStore(str(tmp_path/'fallback.sqlite'))))
    p=profile(client)
    response=client.post('/api/v1/recommendations',json={'profile_id':p['profile_id'],'region':'MY','ai_scenario':'moderate'})
    assert response.status_code==200 and response.json()['meta']['is_mock'] is True


def test_configured_ai_module_loader_executes_test_adapter(monkeypatch,tmp_path):
    module=tmp_path/'temporary_futureproof_ai.py'
    module.write_text('''\nclass Adapter:\n    is_mock = True\n    def extract_profile(self, text, questionnaire):\n        return {"skills": [], "interests": [], "warnings": ["test adapter ran"]}\n    def score_roles(self, profile, trend_package, scenario):\n        return []\ndef create_adapter():\n    return Adapter()\n''')
    monkeypatch.syspath_prepend(str(tmp_path))
    monkeypatch.setenv('AI_ADAPTER_MODULE','temporary_futureproof_ai')
    client=TestClient(create_app(store=ProfileStore(str(tmp_path/'p.sqlite'))))
    response=client.post('/api/v1/profiles/normalize',json={'pipeline':'A','input_type':'guided_text','synthetic_input':True,'text':'Test','study_constraints':CONSTRAINTS})
    assert response.status_code==200
    assert response.json()['data']['extraction_warnings']==['test adapter ran']

def test_import_rejects_path_like_ids_and_bad_posting_type():
    raw,approvals=package()
    raw['snapshot_id']='../escape'
    with pytest.raises(ImportRejected): MarketRepository().import_public(raw,approvals)
    raw,approvals=package()
    raw['role_signals'][0]['observed_metrics']['valid_postings']=3.5
    with pytest.raises(ImportRejected): MarketRepository().import_public(raw,approvals)

class WrongArithmeticAdapter:
    is_mock=True
    def extract_profile(self,text,questionnaire):
        return {'skills':[],'interests':[],'warnings':[]}
    def score_roles(self,profile,trend_package,scenario):
        return [{'rank':1,'role_id':'role_data_analyst','role_name':'Data Analyst','match_score':99,
                 'score_breakdown':{'skill_compatibility':100,'interests_preferences':100,'scenario_outlook':100,'transition_feasibility':100},
                 'strengths':[],'skill_gaps':[],'reason':'test only','evidence_ids':['ev_test_only_public'],
                 'scenario_assumptions':['test only'],'uncertainty':'test only','sdg_links':[{'sdg':8,'rationale':'test only'}]}]

def test_recommendation_rejects_invalid_score_arithmetic(tmp_path):
    client=TestClient(create_app(store=ProfileStore(str(tmp_path/'p.sqlite')),market=approved_market(),adapter=WrongArithmeticAdapter()))
    p=profile(client)
    response=client.post('/api/v1/recommendations',json={'profile_id':p['profile_id'],'region':'MY','ai_scenario':'moderate','preferred_field_id':'field_data'})
    assert response.status_code==502 and response.json()['error']['code']=='MODEL_INVALID_OUTPUT'

def test_unknown_snapshot_conflict_on_reviewed_market(tmp_path):
    client=TestClient(create_app(store=ProfileStore(str(tmp_path/'p.sqlite')),market=approved_market()))
    p=profile(client)
    response=client.post('/api/v1/recommendations',json={'profile_id':p['profile_id'],'region':'MY','ai_scenario':'moderate','snapshot_id':'snap_not_available'})
    assert response.status_code==409 and response.json()['error']['code']=='SNAPSHOT_CONFLICT'

def test_imported_score_basis_reaches_internal_trend_package():
    from app.services import trend_package
    snap=approved_market().get_snapshot()
    package=trend_package(snap)
    assert package.role_signals[0]['score_basis']=='Test-only normalized example score'
    assert package.skill_signals[0]['score_basis']=='Test-only normalized example score'
