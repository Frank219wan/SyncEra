from pathlib import Path
import pytest
from fastapi.testclient import TestClient
from app.main import create_app
from app.storage import ProfileStore
from app.models import Envelope, Recommendation
from app.catalogue import ROLES, SKILLS

EXPECTED={
'GET':{'/api/v1/health','/api/v1/market/radar','/api/v1/explore/bubbles','/api/v1/trends/roles','/api/v1/trends/skills','/api/v1/roles/{role_id}','/api/v1/roles/{role_id}/tasks','/api/v1/evidence/{evidence_id}'},
'POST':{'/api/v1/profiles/normalize','/api/v1/profiles/upload','/api/v1/profiles/confirm','/api/v1/recommendations','/api/v1/learning/skill-map','/api/v1/learning/roadmap','/api/v1/progress/skills','/api/v1/organizations/{mode}/analyze','/api/v1/admin/trends/refresh'}}
CONSTRAINTS={'weekly_hours':5,'budget_amount':100,'currency':'MYR','language':'en','target_weeks':12,'learning_pace':'focused'}

@pytest.fixture
def client(tmp_path):
    return TestClient(create_app(store=ProfileStore(str(tmp_path/'profiles.sqlite'))))

def good(response):
    assert response.status_code==200, response.text
    Envelope.model_validate(response.json())
    assert response.json()['meta']['is_mock'] is True
    return response.json()['data']

def profile(client,confirm=True):
    body={'pipeline':'A','input_type':'guided_text','synthetic_input':True,'text':'I know SQL and Excel and like analytics','preferred_field_id':'field_data','study_constraints':CONSTRAINTS}
    data=good(client.post('/api/v1/profiles/normalize',json=body))
    p=data['profile']
    assert p['reviewed_by_user'] is False
    if not confirm: return p
    skills=[{'skill_id':'skill_sql','level':3,'source':'declared','confidence':1},{'skill_id':'skill_excel','level':4,'source':'declared','confidence':1}]
    confirmed=good(client.post('/api/v1/profiles/confirm',json={'profile_id':p['profile_id'],'skills':skills,'reviewed_by_user':True,'profile_revision':p['revision']}))
    return confirmed['profile']

def test_routes_and_openapi(client):
    paths=client.get('/openapi.json').json()['paths']
    for method,expected in EXPECTED.items():
        assert {p for p,ops in paths.items() if method.lower() in ops}==expected
    assert client.get('/docs').status_code==200

def test_public_catalogue_and_envelopes(client):
    health=good(client.get('/api/v1/health',headers={'X-Request-ID':'req_test'}))
    assert health=={'status':'ok','api_version':'1.0.0'}
    assert client.get('/api/v1/health',headers={'X-Request-ID':'req_test'}).json()['meta']['request_id']=='req_test'
    bubbles=good(client.get('/api/v1/explore/bubbles'))
    roles=good(client.get('/api/v1/trends/roles'))
    skills=good(client.get('/api/v1/trends/skills'))
    assert {x['role_id'] for x in bubbles['roles']}=={x['role_id'] for x in roles['items']}==set(ROLES)
    assert {x['skill_id'] for x in skills['items']}==set(SKILLS)
    for x in roles['items']:
        assert x['signal_label']=='current_snapshot'
        assert x['observed_metrics']['valid_postings'] is None
        assert x['evidence_ids']
        good(client.get('/api/v1/roles/'+x['role_id']))
        good(client.get('/api/v1/roles/'+x['role_id']+'/tasks'))
        for eid in x['evidence_ids']:
            e=good(client.get('/api/v1/evidence/'+eid))['evidence']
            assert e['source_url'] is None
            assert 'Synthetic' in e['limitations']
    assert client.get('/api/v1/explore/bubbles').json()['meta']['snapshot_id']==client.get('/api/v1/trends/roles').json()['meta']['snapshot_id']

def test_static_frontend_and_spa_fallback(tmp_path,monkeypatch):
    static_dir=tmp_path/'dist'
    static_dir.mkdir()
    (static_dir/'index.html').write_text('<main>FutureProof</main>',encoding='utf-8')
    (static_dir/'manifest.webmanifest').write_text('{}',encoding='utf-8')
    monkeypatch.setenv('STATIC_DIR',str(static_dir))
    static_client=TestClient(create_app(store=ProfileStore(str(tmp_path/'static.sqlite'))))
    assert static_client.get('/').text=='<main>FutureProof</main>'
    assert static_client.get('/individual/recommendations').text=='<main>FutureProof</main>'
    assert static_client.get('/manifest.webmanifest').json()=={}
    assert static_client.get('/api/v1/health').status_code==200
    assert static_client.get('/api/v1/not-real').status_code==404

def test_vertical_slice(client):
    p=profile(client)
    rec=good(client.post('/api/v1/recommendations',json={'profile_id':p['profile_id'],'region':'MY','ai_scenario':'moderate','top_k':5}))
    assert rec['recommendations']
    for x in rec['recommendations']:
        Recommendation.model_validate(x)
        assert x['role_id'] in ROLES
        assert all(y['skill_id'] in SKILLS for y in x['skill_gaps'])
    chosen=next(x for x in rec['recommendations'] if x['role_id']=='role_data_analyst')
    gap=chosen['skill_gaps'][0]['skill_id']
    m=good(client.post('/api/v1/learning/skill-map',json={'profile_id':p['profile_id'],'role_id':'role_data_analyst','skill_id':gap,'language':'en','budget_amount':100,'currency':'MYR'}))
    assert m['skill_id']==gap and len(m['next_actions'])<=3
    assert all(n.get('resource') is None for n in m['nodes'])
    road=good(client.post('/api/v1/learning/roadmap',json={'profile_id':p['profile_id'],'role_id':'role_data_analyst','selected_skill_ids':['skill_python','skill_validation'],'study_constraints':CONSTRAINTS}))
    assert road['total_estimated_hours']==20 and road['capacity_hours']==60 and road['feasibility']=='feasible'

def test_errors_and_revisions(client):
    p=profile(client,False)
    r=client.post('/api/v1/recommendations',json={'profile_id':p['profile_id'],'region':'MY','ai_scenario':'moderate'})
    assert r.status_code==422 and r.json()['error']['code']=='PROFILE_NOT_CONFIRMED'
    r=client.get('/api/v1/evidence/unknown')
    assert r.status_code==404 and r.json()['error']['code']=='NOT_FOUND'
    r=client.post('/api/v1/profiles/normalize',json={'pipeline':'A','input_type':'guided_text','synthetic_input':False,'text':'real data','study_constraints':CONSTRAINTS})
    assert r.status_code==422
    r=client.get('/api/v1/trends/roles?region=US')
    assert r.status_code==400
    r=client.get('/api/v1/trends/roles?snapshot_id=missing')
    assert r.status_code==409
    r=client.post('/api/v1/profiles/confirm',json={'profile_id':p['profile_id'],'skills':[{'skill_id':'invalid','level':3,'source':'declared','confidence':1}],'reviewed_by_user':True})
    assert r.status_code==404
    q={'profile_id':p['profile_id'],'skills':[],'reviewed_by_user':True,'profile_revision':1}
    assert client.post('/api/v1/profiles/confirm',json=q).status_code==200
    assert client.post('/api/v1/profiles/confirm',json=q).status_code==409

def test_scenarios_and_snapshot_dependency(client):
    p=profile(client)
    base={'profile_id':p['profile_id'],'region':'MY','ai_scenario':'moderate'}
    a=good(client.post('/api/v1/recommendations',json=base))
    b=good(client.post('/api/v1/recommendations',json={**base,'ai_scenario':'fast'}))
    c=good(client.post('/api/v1/recommendations',json={**base,'snapshot_id':'snap_my_20261021_02'}))
    scores=lambda d:{x['role_id']:x['match_score'] for x in d['recommendations']}
    assert scores(a)!=scores(b) and scores(a)!=scores(c)
    assert good(client.get('/api/v1/trends/roles'))==good(client.get('/api/v1/trends/roles'))
    assert client.get('/api/v1/trends/roles').json()['data']==client.get('/api/v1/trends/roles').json()['data']

def test_roadmap_limit_and_p1(client):
    p=profile(client)
    tight={**CONSTRAINTS,'weekly_hours':1,'target_weeks':1}
    data=good(client.post('/api/v1/learning/roadmap',json={'profile_id':p['profile_id'],'role_id':'role_data_analyst','selected_skill_ids':['skill_python','skill_validation'],'study_constraints':tight}))
    assert data['feasibility']=='insufficient_time' and data['warnings']
    for path in ['/api/v1/progress/skills','/api/v1/organizations/hr/analyze','/api/v1/admin/trends/refresh']:
        r=client.post(path,json={})
        assert r.status_code==503 and r.json()['error']['code']=='SOURCE_UNAVAILABLE'

def test_original_openapi_response_shapes(client):
    import yaml
    from jsonschema import Draft7Validator
    # Repo-relative contract copy first; workspace-root original as fallback.
    candidates=[Path(__file__).resolve().parents[1]/'contracts'/'FutureProof_AI_OpenAPI_v1_0.yaml',Path(__file__).resolve().parents[2]/'FutureProof_AI_OpenAPI_v1_0.yaml']
    contract=next((p for p in candidates if p.exists()),None)
    assert contract is not None,'FutureProof_AI_OpenAPI_v1_0.yaml not found'
    spec=yaml.safe_load(contract.read_text(encoding='utf-8'))
    def convert(value):
        if isinstance(value,list): return [convert(x) for x in value]
        if not isinstance(value,dict): return value
        out={k:convert(v) for k,v in value.items() if k!='nullable'}
        if value.get('nullable'):
            if 'type' in out: out['type']=[out['type'],'null']
            elif '$ref' in out: out={'anyOf':[out,{'type':'null'}]}
        return out
    spec=convert(spec)
    p=profile(client)
    calls=[('get','/api/v1/health',None),('get','/api/v1/explore/bubbles',None),('get','/api/v1/trends/roles',None),('get','/api/v1/trends/skills',None),('get','/api/v1/roles/role_data_analyst',None),('get','/api/v1/roles/role_data_analyst/tasks',None),('get','/api/v1/evidence/ev_demo_001',None),('post','/api/v1/profiles/normalize',{'pipeline':'A','input_type':'guided_text','synthetic_input':True,'text':'SQL','study_constraints':CONSTRAINTS}),('post','/api/v1/profiles/confirm',{'profile_id':p['profile_id'],'skills':[],'reviewed_by_user':True,'profile_revision':p['revision']}),('post','/api/v1/recommendations',{'profile_id':p['profile_id'],'region':'MY','ai_scenario':'moderate'}),('post','/api/v1/learning/skill-map',{'profile_id':p['profile_id'],'role_id':'role_data_analyst','skill_id':'skill_python','language':'en','budget_amount':100,'currency':'MYR'}),('post','/api/v1/learning/roadmap',{'profile_id':p['profile_id'],'role_id':'role_data_analyst','selected_skill_ids':['skill_python'],'study_constraints':CONSTRAINTS})]
    for method,url,payload in calls:
        response=getattr(client,method)(url,**({'json':payload} if payload else {}))
        assert response.status_code==200,response.text
        path=url.removeprefix('/api/v1')
        if path.startswith('/roles/'): path='/roles/{role_id}/tasks' if path.endswith('/tasks') else '/roles/{role_id}'
        if path.startswith('/evidence/'): path='/evidence/{evidence_id}'
        schema=spec['paths'][path][method]['responses']['200']['content']['application/json']['schema']
        validator=Draft7Validator({'$ref':schema['$ref'],'components':spec['components']})
        errors=list(validator.iter_errors(response.json()))
        assert not errors,(path,[e.message for e in errors])

class BadAdapter:
    def extract_profile(self,text,questionnaire): return {'skills':[],'interests':[],'warnings':[]}
    def score_roles(self,profile,trend_package,scenario):
        return [{'rank':1,'role_id':'hallucinated','role_name':'Fake','match_score':100,'score_breakdown':{'skill_compatibility':100,'interests_preferences':100,'scenario_outlook':100,'transition_feasibility':100},'strengths':[],'skill_gaps':[],'reason':'fake','evidence_ids':[],'scenario_assumptions':[],'uncertainty':'none','sdg_links':[]}]

class TimeoutAdapter(BadAdapter):
    def score_roles(self,profile,trend_package,scenario): raise TimeoutError()

@pytest.mark.parametrize('adapter,status,code',[(BadAdapter(),502,'MODEL_INVALID_OUTPUT'),(TimeoutAdapter(),504,'MODEL_TIMEOUT')])
def test_ai_adapter_failures(tmp_path,adapter,status,code):
    client=TestClient(create_app(store=ProfileStore(str(tmp_path/'p.sqlite')),adapter=adapter))
    p=profile(client)
    r=client.post('/api/v1/recommendations',json={'profile_id':p['profile_id'],'region':'MY','ai_scenario':'moderate'})
    assert r.status_code==status and r.json()['error']['code']==code

def test_form_declared_skills_and_gap_validation(client):
    data=good(client.post('/api/v1/profiles/normalize',json={'pipeline':'A','input_type':'form','synthetic_input':True,'form':{'skills':[{'skill_id':'skill_sql','level':3}],'interests':['analytics']},'study_constraints':CONSTRAINTS}))
    p=data['profile']
    assert p['skills'][0]=={'skill_id':'skill_sql','level':3,'source':'declared','confidence':1.0}
    p=profile(client)
    r=client.post('/api/v1/learning/skill-map',json={'profile_id':p['profile_id'],'role_id':'role_data_analyst','skill_id':'skill_sql','language':'en','budget_amount':100,'currency':'MYR'})
    assert r.status_code==422 and r.json()['error']['code']=='VALIDATION_ERROR'
