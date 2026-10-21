from __future__ import annotations
import os
import json
from datetime import datetime, timezone
from uuid import uuid4
from fastapi import FastAPI, Request, Query, UploadFile, File, Form
from pydantic import ValidationError
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from starlette.exceptions import HTTPException as StarletteHTTPException
from .models import Envelope, Meta, NormalizeRequest, ConfirmRequest, RecommendRequest, SkillMapRequest, RoadmapRequest, HealthData, BubblesData, RolesData, SkillsData, RoleData, TasksData, EvidenceData, NormalizeData, ConfirmData, RecommendData, SkillMapData, RoadmapData, APIErrorEnvelope
from .catalogue import ROLES, SKILLS, EVIDENCE, FIELDS
from .storage import ProfileStore
from .ai_adapter import load_ai_adapter
from .approved_data import MarketRepository, ResourceRepository
from . import services as svc
from .cv_upload import extract_cv_text, upload_limit

ERROR_CODES={400:'BAD_REQUEST',404:'NOT_FOUND',409:'SNAPSHOT_CONFLICT',422:'VALIDATION_ERROR',429:'RATE_LIMITED',502:'MODEL_INVALID_OUTPUT',503:'SOURCE_UNAVAILABLE',504:'MODEL_TIMEOUT'}
def documented_errors(*codes):
    return {code:{'model':APIErrorEnvelope} for code in codes}

def create_app(store=None,adapter=None,market=None,resources=None):
    app=FastAPI(title='FutureProof AI Backend',version='1.0.0',description='Synthetic demo fallback. Public market data is served only after reviewed local import.')
    app.state.store=store or ProfileStore()
    app.state.adapter=adapter if adapter is not None else load_ai_adapter()
    app.state.market=market if market is not None else MarketRepository()
    app.state.resources=resources if resources is not None else ResourceRepository()
    if market is None or resources is None:
        approved_dir=os.getenv('APPROVED_DATA_DIR',os.path.join(os.path.dirname(__file__),'..','data','approved'))
        if market is None: app.state.market.load_dir(approved_dir)
        if resources is None: app.state.resources.load_dir(approved_dir)
    app.state.market.validate_active()
    origins=[x.strip() for x in os.getenv('FRONTEND_ORIGINS','http://localhost:3000,http://localhost:5173,http://127.0.0.1:5173').split(',') if x.strip()]
    app.add_middleware(CORSMiddleware,allow_origins=origins,allow_methods=['GET','POST'],allow_headers=['Content-Type','X-Request-ID'],expose_headers=['X-Request-ID'])

    @app.middleware('http')
    async def request_id(request:Request,call_next):
        incoming=request.headers.get('X-Request-ID','').strip()
        request.state.request_id=incoming[:128] if incoming and all(c.isalnum() or c in '-_' for c in incoming) else 'req_'+uuid4().hex
        response=await call_next(request)
        response.headers['X-Request-ID']=request.state.request_id
        return response

    def success(request,data,snapshot=None,data_model=None,data_label=None,is_mock=None):
        if data_model is not None:
            data=data_model.model_validate(data).model_dump(exclude_unset=True)
        snapshot_id=getattr(snapshot,'snapshot_id',snapshot)
        label=data_label or getattr(snapshot,'data_label','synthetic_demo')
        mock=getattr(snapshot,'is_mock',True) if is_mock is None else is_mock
        version=getattr(snapshot,'method_version','rules-v0.1') if label=='public_open' else 'rules-v0.1'
        meta=Meta(request_id=request.state.request_id,snapshot_id=snapshot_id,generated_at=datetime.now(timezone.utc),data_label=label,is_mock=mock,model_version=version)
        return Envelope(data=data,meta=meta)

    def error(request,status,code,message,details=None,retryable=False):
        return JSONResponse(status_code=status,content={'error':{'code':code,'message':message,'details':details or [],'retryable':retryable},'meta':{'request_id':getattr(request.state,'request_id','req_'+uuid4().hex)}})

    @app.exception_handler(svc.APIError)
    async def app_error(request,exc): return error(request,exc.status,exc.code,exc.message,exc.details,exc.retryable)
    @app.exception_handler(RequestValidationError)
    async def validation_error(request,exc):
        details=[{'field':'.'.join(str(x) for x in e['loc']),'reason':e['type']} for e in exc.errors()]
        return error(request,422,'VALIDATION_ERROR','Request validation failed',details)
    @app.exception_handler(StarletteHTTPException)
    async def http_error(request,exc): return error(request,exc.status_code,ERROR_CODES.get(exc.status_code,'BAD_REQUEST'),str(exc.detail))
    @app.exception_handler(Exception)
    async def unexpected_error(request,exc): return error(request,503,'SOURCE_UNAVAILABLE','Service unavailable')

    @app.get('/api/v1/health',response_model=Envelope[HealthData])
    def health(request:Request): return success(request,{'status':'ok','api_version':'1.0.0'},data_model=HealthData)

    @app.get('/api/v1/explore/bubbles',response_model=Envelope[BubblesData],responses=documented_errors(400,409,422))
    def bubbles(request:Request,region:str='MY',field_id:str|None=None,snapshot_id:str|None=None):
        svc.require_field(field_id); snap=svc.require_snapshot(app.state.market,snapshot_id,region)
        signals=svc.role_signals(snap,field_id)
        # Equal area prevents synthetic fixture scores from masquerading as observed demand.
        used_fields={r['field_id'] for r in signals}
        cats=[{'field_id':fid,'name':name,'display_size':1.0} for fid,name in FIELDS.items() if fid in used_fields]
        roles=[{'role_id':r['role_id'],'field_id':r['field_id'],'name':r['name'],'display_size':1.0,'trend_score':r['trend_score'],'signal_label':r['signal_label'],'evidence_ids':r['evidence_ids']} for r in signals]
        return success(request,{'categories':cats,'roles':roles,'size_basis':'Equal bubble area: synthetic fixture, no verified demand volume.' if snap.is_mock else 'Equal bubble area: no comparable verified posting volume; scores use approved source methodology.','region':region},snap,BubblesData)

    @app.get('/api/v1/trends/roles',response_model=Envelope[RolesData],responses=documented_errors(400,409,422))
    def trends_roles(request:Request,region:str='MY',limit:int=Query(10,ge=1,le=50),field_id:str|None=None,cursor:str|None=None,snapshot_id:str|None=None):
        svc.require_field(field_id); snap=svc.require_snapshot(app.state.market,snapshot_id,region)
        items,next_cursor=svc.paginate(svc.role_signals(snap,field_id),limit,cursor)
        return success(request,{'items':items,'next_cursor':next_cursor},snap,RolesData)

    @app.get('/api/v1/trends/skills',response_model=Envelope[SkillsData],responses=documented_errors(400,409,422))
    def trends_skills(request:Request,region:str='MY',limit:int=Query(10,ge=1,le=50),field_id:str|None=None,cursor:str|None=None,snapshot_id:str|None=None):
        svc.require_field(field_id); snap=svc.require_snapshot(app.state.market,snapshot_id,region)
        allowed={s.skill_id for r in ROLES.values() if field_id is None or r.field_id==field_id for s in r.required_skills}
        items,next_cursor=svc.paginate([x for x in svc.skill_signals(snap) if x['skill_id'] in allowed],limit,cursor)
        return success(request,{'items':items,'next_cursor':next_cursor},snap,SkillsData)

    @app.get('/api/v1/roles/{role_id}',response_model=Envelope[RoleData],responses=documented_errors(404,422))
    def role_detail(role_id:str,request:Request):
        role=svc.require_role(role_id)
        snap=app.state.market.get_snapshot()
        data=role.model_dump(exclude={'tasks','interests'})
        if role_id in snap.role_evidence_ids: data['evidence_ids']=snap.role_evidence_ids[role_id]
        label='mixed_demo' if not snap.is_mock and role_id in snap.role_evidence_ids else 'synthetic_demo'
        return success(request,data,snap if role_id in snap.role_evidence_ids else None,RoleData,data_label=label,is_mock=True)

    @app.get('/api/v1/roles/{role_id}/tasks',response_model=Envelope[TasksData],responses=documented_errors(404,409,422))
    def role_tasks(role_id:str,request:Request,snapshot_id:str|None=None):
        role=svc.require_role(role_id); snap=svc.require_snapshot(app.state.market,snapshot_id)
        return success(request,{'role_id':role_id,'tasks':[x.model_dump() for x in role.tasks]},snap,TasksData,data_label='mixed_demo' if not snap.is_mock else 'synthetic_demo',is_mock=True)

    @app.get('/api/v1/evidence/{evidence_id}',response_model=Envelope[EvidenceData],responses=documented_errors(404,422))
    def evidence(evidence_id:str,request:Request):
        item=app.state.market.get_evidence(evidence_id)
        if not item: raise svc.APIError(404,'NOT_FOUND','Unknown evidence_id',[{'field':'evidence_id','reason':'unknown'}])
        real=evidence_id not in EVIDENCE
        return success(request,{'evidence':item.model_dump()},data_model=EvidenceData,data_label='public_open' if real else 'synthetic_demo',is_mock=not real)

    @app.post('/api/v1/profiles/normalize',response_model=Envelope[NormalizeData],responses=documented_errors(400,422,502,504))
    def normalize(payload:NormalizeRequest,request:Request):
        data=svc.normalize(app.state.adapter,payload,app.state.store)
        return success(request,data,data_model=NormalizeData,is_mock=getattr(app.state.adapter,'is_mock',True))

    @app.post('/api/v1/profiles/upload',response_model=Envelope[NormalizeData],responses={
        413:{'model':APIErrorEnvelope,'description':'CV exceeds upload limit'},
        415:{'model':APIErrorEnvelope,'description':'Unsupported file type'},
        422:{'model':APIErrorEnvelope,'description':'Invalid, unreadable, or non-synthetic input'},
        502:{'model':APIErrorEnvelope,'description':'Extraction adapter invalid output'},
        504:{'model':APIErrorEnvelope,'description':'Extraction adapter timeout'},
    })
    async def upload_profile(request:Request,file:UploadFile=File(...),synthetic_input:bool=Form(...),study_constraints:str=Form(...),preferred_field_id:str|None=Form(None)):
        if not synthetic_input:
            raise svc.APIError(422,'SYNTHETIC_ONLY','Only declared synthetic CVs are accepted in this demo')
        try:
            parsed_constraints=json.loads(study_constraints)
            payload_constraints=NormalizeRequest.model_validate({
                'pipeline':'A','input_type':'synthetic_cv_text','synthetic_input':True,
                'text':'placeholder','study_constraints':parsed_constraints,
                'preferred_field_id':preferred_field_id,
            }).study_constraints
        except (ValueError,ValidationError,TypeError):
            raise svc.APIError(422,'VALIDATION_ERROR','study_constraints must be a valid JSON StudyConstraints object') from None
        try:
            data=await file.read(upload_limit()+1)
        finally:
            await file.close()
        if len(data)>upload_limit():
            raise svc.APIError(413,'CV_TOO_LARGE','CV exceeds the upload size limit')
        text=extract_cv_text(file.filename,data)
        payload=NormalizeRequest(pipeline='A',input_type='synthetic_cv_text',synthetic_input=True,text=text,preferred_field_id=preferred_field_id,study_constraints=payload_constraints)
        result=svc.normalize(app.state.adapter,payload,app.state.store)
        return success(request,result,data_model=NormalizeData,is_mock=getattr(app.state.adapter,'is_mock',True))

    @app.post('/api/v1/profiles/confirm',response_model=Envelope[ConfirmData],responses=documented_errors(404,409,422))
    def confirm(payload:ConfirmRequest,request:Request):
        return success(request,svc.confirm(app.state.store,payload),data_model=ConfirmData)

    @app.post('/api/v1/recommendations',response_model=Envelope[RecommendData],responses=documented_errors(400,404,409,422,502,504))
    def recommend(payload:RecommendRequest,request:Request):
        profile=svc.require_profile(app.state.store,payload.profile_id,confirmed=True)
        svc.require_field(payload.preferred_field_id)
        snap=svc.require_snapshot(app.state.market,payload.snapshot_id,payload.region)
        package=svc.trend_package(snap)
        selected_field=payload.preferred_field_id or profile.preferred_field_id
        scoring_profile=profile if selected_field==profile.preferred_field_id else profile.model_copy(update={'preferred_field_id':selected_field})
        if hasattr(app.state.adapter,'score_roles'):
            try: raw=app.state.adapter.score_roles(scoring_profile,package,payload.ai_scenario)
            except TimeoutError: raise svc.APIError(504,'MODEL_TIMEOUT','Matching model timed out',retryable=True)
            except Exception: raise svc.APIError(502,'MODEL_INVALID_OUTPUT','Matching model failed')
        else:
            raw=svc.demo_recommendations(scoring_profile,snap,payload.ai_scenario,selected_field,payload.top_k)
        recommendations=svc.validate_recommendations(raw,snap,payload.ai_scenario,scoring_profile)
        if selected_field and any(ROLES[x['role_id']].field_id!=selected_field for x in recommendations):
            raise svc.APIError(502,'MODEL_INVALID_OUTPUT','Matching output violates selected field')
        recommendations=recommendations[:payload.top_k]
        return success(request,{'profile_id':profile.profile_id,'ai_scenario':payload.ai_scenario,'recommendations':recommendations},snap,RecommendData,data_label='mixed_demo' if not snap.is_mock else 'synthetic_demo',is_mock=True)

    @app.post('/api/v1/learning/skill-map',response_model_exclude_none=True,response_model=Envelope[SkillMapData],responses=documented_errors(404,422))
    def skill_map(payload:SkillMapRequest,request:Request):
        profile=svc.require_profile(app.state.store,payload.profile_id,confirmed=True)
        role=svc.require_role(payload.role_id); skill=svc.require_skill(payload.skill_id)
        requirements={s.skill_id:s for s in role.required_skills}
        if skill.skill_id not in requirements:
            raise svc.APIError(422,'VALIDATION_ERROR','Skill is not required for selected role',[{'field':'skill_id','reason':'not_role_requirement'}])
        levels={s.skill_id:s.level for s in profile.skills}
        if levels.get(skill.skill_id) is not None and levels[skill.skill_id]>=requirements[skill.skill_id].target_level:
            raise svc.APIError(422,'VALIDATION_ERROR','Selected skill is not a current gap',[{'field':'skill_id','reason':'already_at_target'}])
        return success(request,svc.make_skill_map(profile,role,skill,payload.language,payload.budget_amount,payload.currency,app.state.resources),app.state.market.get_snapshot(),SkillMapData,data_label='mixed_demo' if app.state.resources.entries else 'synthetic_demo',is_mock=True)

    @app.post('/api/v1/learning/roadmap',response_model_exclude_none=True,response_model=Envelope[RoadmapData],responses=documented_errors(404,422))
    def roadmap(payload:RoadmapRequest,request:Request):
        profile=svc.require_profile(app.state.store,payload.profile_id,confirmed=True); role=svc.require_role(payload.role_id)
        return success(request,svc.make_roadmap(profile,role,payload.selected_skill_ids,payload.study_constraints,app.state.resources),app.state.market.get_snapshot(),RoadmapData,data_label='mixed_demo' if app.state.resources.entries else 'synthetic_demo',is_mock=True)

    @app.post('/api/v1/progress/skills',status_code=503,response_model=APIErrorEnvelope)
    def progress(request:Request,payload:dict): raise svc.APIError(503,'SOURCE_UNAVAILABLE','P1 progress is not implemented')
    @app.post('/api/v1/organizations/{mode}/analyze',status_code=503,response_model=APIErrorEnvelope,responses=documented_errors(400))
    def organization(mode:str,request:Request,payload:dict):
        if mode not in ('hr','career_centre'): raise svc.APIError(400,'BAD_REQUEST','Unsupported organization mode')
        raise svc.APIError(503,'SOURCE_UNAVAILABLE','P1 organization analysis is not implemented')
    @app.post('/api/v1/admin/trends/refresh',status_code=503,response_model=APIErrorEnvelope)
    def refresh(request:Request,payload:dict): raise svc.APIError(503,'SOURCE_UNAVAILABLE','P1 trend refresh is disabled')

    return app

app=create_app()
