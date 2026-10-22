import json
import httpx
import pytest
from fastapi.testclient import TestClient
from app.career_analysis import CareerAnalyzer, MAX_CANDIDATES, MAX_TOKENS
from app.main import create_app
from app.storage import ProfileStore
from app.ai_adapter import DemoAdapter
from futureproof_ai.futureproof_adapter import create_adapter
from test_api import CONSTRAINTS

class Ledger:
    def __init__(self): self.rows={}; self.claims=0
    def claim(self,key,profile_id):
        self.claims+=1
        if key in self.rows: return ('cached',self.rows[key]) if self.rows[key] is not None else ('in_progress',None)
        self.rows[key]=None
        return 'claimed',None
    def complete(self,key,result): self.rows[key]=result

def client_with(tmp_path,analyzer):
    return TestClient(create_app(store=ProfileStore(str(tmp_path/'p.sqlite')),adapter=create_adapter(),career_analyzer=analyzer))

def confirmed(client):
    p=client.post('/api/v1/profiles/normalize',json={'pipeline':'A','input_type':'form','synthetic_input':True,'form':{'current_occupation':'Fictional analyst','skills':[{'skill_id':'skill_sql','level':3}]},'study_constraints':CONSTRAINTS}).json()['data']['profile']
    r=client.post('/api/v1/profiles/confirm',json={'profile_id':p['profile_id'],'skills':p['skills'],'reviewed_by_user':True,'profile_revision':p['revision']})
    assert r.status_code==200
    return p['profile_id']

def recommend(client,pid,scenario='moderate',header=True):
    return client.post('/api/v1/recommendations',json={'profile_id':pid,'region':'MY','ai_scenario':scenario},headers={'X-Recommendation-Analysis':'v1'} if header else {}).json()

def output(body):
    item=body['candidates'][0]
    return {'role_id':item['role_id'],'reason':'Confirmed skills support this role in the selected scenario.','strength_skill_ids':item['strength_skill_ids'][:1],'gap_skill_ids':item['gap_skill_ids'][:1],'risk_and_uncertainty':'The scenario outlook is uncertain.','evidence_ids':item['evidence_ids'][:1]}

def response(value):
    return httpx.Response(200,json={'choices':[{'finish_reason':'stop','message':{'content':json.dumps(value)}}]})

def test_v1_contract_and_default_fallback(tmp_path):
    client=client_with(tmp_path,CareerAnalyzer())
    pid=confirmed(client)
    legacy=recommend(client,pid,header=False)
    current=recommend(client,pid)
    assert 'ai_analysis' not in legacy['data']
    assert current['data']['recommendations']==legacy['data']['recommendations']
    assert current['meta']['model_version']=='tech-v1'
    assert current['data']['ai_analysis']['source']=='rules_fallback'
    assert current['data']['ai_analysis']['status']=='disabled'

def test_mock_transport_payload_and_cache(tmp_path,monkeypatch):
    monkeypatch.setenv('VERCEL_ENV','preview')
    seen=[]; ledger=Ledger()
    def handler(request):
        assert request.url.host=='tokenhub.tencentmaas.com'
        assert request.headers['Authorization']=='Bearer test-only'
        body=json.loads(request.content); seen.append(body)
        assert body['max_tokens']==MAX_TOKENS
        supplied=json.loads(body['messages'][1]['content'])
        assert supplied['confirmed_synthetic_profile']['skills']==[{'skill_id':'skill_sql','level':3}]
        assert len(supplied['candidates'])<=MAX_CANDIDATES
        return response(output(supplied))
    analyzer=CareerAnalyzer(client=httpx.Client(transport=httpx.MockTransport(handler)),ledger=ledger,live_enabled=True,api_key='test-only')
    client=client_with(tmp_path,analyzer); pid=confirmed(client)
    first=recommend(client,pid); second=recommend(client,pid)
    assert first['data']['ai_analysis']==second['data']['ai_analysis']
    assert first['data']['ai_analysis']['source']=='minimax'
    assert first['data']['recommendations']==second['data']['recommendations']
    assert len(seen)==1 and ledger.claims==2
    recommend(client,pid,'fast')
    assert len(seen)==2

@pytest.mark.parametrize('change',[
    lambda x:{**x,'role_id':'role_invented'},
    lambda x:{**x,'gap_skill_ids':['skill_invented']},
    lambda x:{**x,'evidence_ids':['ev_invented']},
    lambda x:{**x,'reason':''},
    lambda x:{**x,'extra':'forbidden'},
])
def test_invalid_model_output_falls_back_without_retry(tmp_path,monkeypatch,change):
    monkeypatch.setenv('VERCEL_ENV','preview')
    calls=[]
    def handler(request):
        calls.append(1)
        body=json.loads(json.loads(request.content)['messages'][1]['content'])
        return response(change(output(body)))
    client=client_with(tmp_path,CareerAnalyzer(client=httpx.Client(transport=httpx.MockTransport(handler)),ledger=Ledger(),live_enabled=True,api_key='test-only'))
    pid=confirmed(client)
    first=recommend(client,pid)
    assert first['data']['ai_analysis']['source']=='rules_fallback'
    assert first['data']['ai_analysis']['status']=='invalid_output'
    assert first['meta']['model_version']=='tech-v1'
    assert recommend(client,pid)['data']['ai_analysis']['status']=='in_progress'
    assert len(calls)==1

@pytest.mark.parametrize('failure',['timeout','http_error'])
def test_provider_errors_are_explicit(tmp_path,monkeypatch,failure):
    monkeypatch.setenv('VERCEL_ENV','preview')
    calls=[]
    def handler(request):
        calls.append(1)
        if failure=='timeout': raise httpx.ReadTimeout('secret',request=request)
        return httpx.Response(429,text='secret')
    client=client_with(tmp_path,CareerAnalyzer(client=httpx.Client(transport=httpx.MockTransport(handler)),ledger=Ledger(),live_enabled=True,api_key='test-only'))
    pid=confirmed(client); first=recommend(client,pid)
    assert first['data']['ai_analysis']['status']=='unavailable'
    assert first['data']['ai_analysis']['source']=='rules_fallback'
    assert 'secret' not in json.dumps(first)
    assert recommend(client,pid)['data']['ai_analysis']['status']=='in_progress'
    assert len(calls)==1

def test_production_gate(tmp_path,monkeypatch):
    monkeypatch.setenv('VERCEL_ENV','production')
    client=client_with(tmp_path,CareerAnalyzer(client=httpx.Client(transport=httpx.MockTransport(lambda request:pytest.fail('provider called'))),ledger=Ledger(),live_enabled=True,api_key='test-only'))
    assert recommend(client,confirmed(client))['data']['ai_analysis']['status']=='disabled'

def test_only_tech_v1_can_enter_model_path(tmp_path,monkeypatch):
    monkeypatch.setenv('VERCEL_ENV','preview')
    analyzer=CareerAnalyzer(client=httpx.Client(transport=httpx.MockTransport(lambda request:pytest.fail('provider called'))),ledger=Ledger(),live_enabled=True,api_key='test-only')
    client=TestClient(create_app(store=ProfileStore(str(tmp_path/'p.sqlite')),adapter=DemoAdapter(),career_analyzer=analyzer))
    assert recommend(client,confirmed(client))['data']['ai_analysis']['status']=='disabled'
