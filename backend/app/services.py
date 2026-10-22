from __future__ import annotations
from uuid import uuid4
from .models import Profile, ProfileSkill, TrendPackage, Recommendation, ScoreBreakdown, SkillGap, MapNode
from .catalogue import SKILLS, ROLES, FIELDS
from .ai_adapter import AIAdapterRequestError
from .scoring_validation import validate_scored_recommendations

class APIError(Exception):
    def __init__(self,status:int,code:str,message:str,details=None,retryable=False):
        self.status,self.code,self.message,self.details,self.retryable=status,code,message,details or [],retryable

def require_role(role_id):
    role=ROLES.get(role_id)
    if not role: raise APIError(404,'NOT_FOUND','Unknown role_id',[{'field':'role_id','reason':'unknown'}])
    return role

def require_skill(skill_id):
    skill=SKILLS.get(skill_id)
    if not skill: raise APIError(404,'NOT_FOUND','Unknown skill_id',[{'field':'skill_id','reason':'unknown'}])
    return skill

def require_field(field_id):
    if field_id is not None and field_id not in FIELDS:
        raise APIError(400,'BAD_REQUEST','Unknown field_id',[{'field':'field_id','reason':'unknown'}])

def require_snapshot(market,snapshot_id=None,region='MY'):
    if region!='MY': raise APIError(400,'BAD_REQUEST','Only MY is supported',[{'field':'region','reason':'unsupported'}])
    snap=market.get_snapshot(snapshot_id)
    if not snap: raise APIError(409,'SNAPSHOT_CONFLICT','Unknown or stale snapshot',[{'field':'snapshot_id','reason':'unknown'}],True)
    if snap.region!=region: raise APIError(409,'SNAPSHOT_CONFLICT','Snapshot region mismatch',[{'field':'snapshot_id','reason':'region_mismatch'}],True)
    return snap

def require_profile(store,profile_id,confirmed=False):
    profile=store.get(profile_id)
    if not profile: raise APIError(404,'NOT_FOUND','Unknown profile_id',[{'field':'profile_id','reason':'unknown'}])
    if confirmed and not profile.reviewed_by_user:
        raise APIError(422,'PROFILE_NOT_CONFIRMED','Profile must be confirmed before this request',[{'field':'profile_id','reason':'not_confirmed'}])
    return profile

def role_signals(snap,field_id=None):
    rows=sorted(((k,v) for k,v in snap.role_scores.items() if field_id is None or ROLES[k].field_id==field_id),key=lambda x:-(x[1] if x[1] is not None else -1))
    return [{'role_id':rid,'name':ROLES[rid].name,'field_id':ROLES[rid].field_id,'rank':i,'trend_score':score,'signal_label':snap.role_labels.get(rid,'current_snapshot'),'observed_metrics':snap.role_metrics.get(rid,{'valid_postings':None,'delta_percent':None}),'evidence_ids':snap.role_evidence_ids[rid],'source_window':{'from':snap.window_start,'to':snap.window_end}} for i,(rid,score) in enumerate(rows,1)]

def skill_signals(snap):
    rows=sorted(snap.skill_scores.items(),key=lambda x:-(x[1] if x[1] is not None else -1))
    return [{'skill_id':sid,'name':SKILLS[sid].name,'rank':i,'trend_score':score,'signal_label':snap.skill_labels.get(sid,'current_snapshot'),'observed_metrics':snap.skill_metrics.get(sid,{'mention_rate':None,'change_pp':None,'coverage':None}),'evidence_ids':snap.skill_evidence_ids[sid],'source_window':{'from':snap.window_start,'to':snap.window_end}} for i,(sid,score) in enumerate(rows,1)]

def trend_package(snap):
    roles=role_signals(snap)
    skills=skill_signals(snap)
    for item in roles:
        if item['role_id'] in snap.role_score_basis: item['score_basis']=snap.role_score_basis[item['role_id']]
    for item in skills:
        if item['skill_id'] in snap.skill_score_basis: item['score_basis']=snap.skill_score_basis[item['skill_id']]
    return TrendPackage(snapshot_id=snap.snapshot_id,region=snap.region,observation_window={'from':snap.window_start,'to':snap.window_end},role_signals=roles,skill_signals=skills,evidence=[snap.evidence[i] for i in snap.evidence_ids],scenario_assumptions=snap.scenario_assumptions,uncertainty=snap.uncertainty)

def paginate(items,limit,cursor):
    try: offset=int(cursor or '0')
    except ValueError: raise APIError(400,'BAD_REQUEST','Invalid cursor',[{'field':'cursor','reason':'must be a nonnegative integer'}])
    if offset<0: raise APIError(400,'BAD_REQUEST','Invalid cursor',[{'field':'cursor','reason':'must be nonnegative'}])
    page=items[offset:offset+limit]
    return page,str(offset+limit) if offset+limit<len(items) else None

def normalize(adapter,req,store):
    require_field(req.preferred_field_id)
    try: output=adapter.extract_profile(req.text,req.form)
    except TimeoutError: raise APIError(504,'MODEL_TIMEOUT','Profile extraction timed out',retryable=True)
    except AIAdapterRequestError as exc: raise APIError(exc.status,exc.code,exc.message,retryable=exc.retryable)
    except Exception: raise APIError(502,'MODEL_INVALID_OUTPUT','Profile extraction failed')
    if not isinstance(output,dict): raise APIError(502,'MODEL_INVALID_OUTPUT','Extraction output is malformed')
    recognized=[]; unknown=list(output.get('unrecognized_skill_terms',[]))
    try:
        for value in output.get('skills',[]):
            sid=value.get('skill_id')
            if sid not in SKILLS:
                unknown.append(str(sid)); continue
            recognized.append(ProfileSkill.model_validate(value))
    except Exception: raise APIError(502,'MODEL_INVALID_OUTPUT','Extraction skills are malformed')
    try:
        profile=Profile(profile_id='profile_'+uuid4().hex[:16],skills=recognized,interests=output.get('interests',[]),current_occupation=output.get('current_occupation'),preferred_field_id=req.preferred_field_id,study_constraints=req.study_constraints,psychology=req.psychology)
        warnings=output.get('warnings',[])
        if not isinstance(warnings,list) or any(not isinstance(x,str) for x in warnings): raise ValueError('invalid warnings')
        if any(not isinstance(x,str) for x in unknown): raise ValueError('invalid unknown skills')
    except Exception:
        raise APIError(502,'MODEL_INVALID_OUTPUT','Extraction output failed schema validation')
    store.save_new(profile)
    return {'profile':profile.model_dump(),'extraction_warnings':warnings,'unrecognized_skill_terms':unknown}

def confirm(store,req):
    profile=require_profile(store,req.profile_id)
    if profile.reviewed_by_user and req.profile_revision is None:
        raise APIError(409,'PROFILE_REVISION_REQUIRED','profile_revision is required to update a confirmed profile',
                       [{'field':'profile_revision','reason':'required_for_update'}])
    if req.profile_revision is not None and req.profile_revision!=profile.revision:
        raise APIError(409,'SNAPSHOT_CONFLICT','Profile revision changed',[{'field':'profile_revision','reason':'stale'}],True)
    ids=[x.skill_id for x in req.skills]
    if len(ids)!=len(set(ids)):
        raise APIError(422,'VALIDATION_ERROR','Duplicate skill IDs',[{'field':'skills','reason':'duplicate'}])
    for sid in ids: require_skill(sid)
    old=profile.revision
    updated=profile.model_copy(update={
        'skills':req.skills,
        'psychology':req.psychology if req.psychology is not None else profile.psychology,
        'reviewed_by_user':True,
        'revision':old+1,
    })
    if not store.update(updated,old): raise APIError(409,'SNAPSHOT_CONFLICT','Profile revision changed',[{'field':'profile_revision','reason':'stale'}],True)
    return {'profile':updated.model_dump(),'profile_revision':updated.revision}

def demo_recommendations(profile,snap,scenario,field_id,top_k):
    owned={x.skill_id:x.level for x in profile.skills}
    results=[]
    for role in ROLES.values():
        if role.role_id not in snap.role_scores or (field_id and role.field_id!=field_id): continue
        weighted=sum((max(0,min(1,(owned.get(s.skill_id) or 0)/s.target_level)) if owned.get(s.skill_id) is not None else 0)*({'high':3,'medium':2,'low':1}[s.importance]) for s in role.required_skills)
        max_weight=sum({'high':3,'medium':2,'low':1}[s.importance] for s in role.required_skills)
        skill_score=round(100*weighted/max_weight,2)
        interest_score=round(100*len(set(profile.interests)&set(role.interests))/max(1,len(role.interests)),2)
        base=snap.role_scores[role.role_id]
        if base is None: continue
        multiplier=snap.scenario_assumptions[scenario][role.role_id]
        outlook=round(min(100,base*multiplier),2)
        gap_count=sum(1 for s in role.required_skills if owned.get(s.skill_id) is None or owned[s.skill_id]<s.target_level)
        transition=round(100*(1-gap_count/len(role.required_skills)),2)
        breakdown=ScoreBreakdown(skill_compatibility=skill_score,interests_preferences=interest_score,scenario_outlook=outlook,transition_feasibility=transition)
        gaps=[SkillGap(skill_id=s.skill_id,name=s.name,current_level=owned.get(s.skill_id),target_level=s.target_level,importance=s.importance) for s in role.required_skills if owned.get(s.skill_id) is None or owned[s.skill_id]<s.target_level]
        strengths=[s.skill_id for s in role.required_skills if owned.get(s.skill_id) is not None and owned[s.skill_id]>=s.target_level]
        results.append(Recommendation(rank=1,role_id=role.role_id,role_name=role.name,match_score=breakdown.total(),score_breakdown=breakdown,strengths=strengths,skill_gaps=gaps,reason='Rule-only demo match using confirmed skills, interests, and scenario-adjusted dated signals.',evidence_ids=snap.role_evidence_ids[role.role_id],scenario_assumptions=[f'{scenario} assumption multiplier {multiplier}; observed signal remains {base}'],uncertainty=snap.uncertainty+'; rule-only demo fit heuristic is not empirically calibrated',sdg_links=role.sdg_links))
    results.sort(key=lambda r:(-r.match_score,r.role_id))
    return [r.model_copy(update={'rank':i}).model_dump() for i,r in enumerate(results[:top_k],1)]

def validate_recommendations(raw,profile,snap,scenario,scoring_policy):
    try:
        return validate_scored_recommendations(raw,profile,snap,scenario,scoring_policy)
    except Exception:
        raise APIError(502,'MODEL_INVALID_OUTPUT','Matching output failed catalogue or score validation')

def make_skill_map(profile,role,skill,language,budget,currency,resources):
    # The repository returns only links matched to a reviewer-owned approval manifest.
    resource=resources.select(skill.skill_id,language,currency,budget)
    nodes=[MapNode(node_id=f'node_{skill.skill_id}_concept',node_type='concept',title=f'Review {skill.name} fundamentals',depends_on=[],estimated_hours=3),MapNode(node_id=f'node_{skill.skill_id}_practice',node_type='practice',title=f'Practice {skill.name} on a synthetic task',depends_on=[f'node_{skill.skill_id}_concept'],estimated_hours=5),MapNode(node_id=f'node_{skill.skill_id}_checkpoint',node_type='checkpoint',title=f'Check a {skill.name} practice result',depends_on=[f'node_{skill.skill_id}_practice'],estimated_hours=2)]
    if resource:
        nodes[0]=nodes[0].model_copy(update={'resource_id':resource.resource_id,'resource':resource,'estimated_hours':max(nodes[0].estimated_hours,resource.estimated_hours)})
    return {'skill_map_id':f'map_{profile.profile_id}_{role.role_id}_{skill.skill_id}','role_id':role.role_id,'skill_id':skill.skill_id,'nodes':[n.model_dump(exclude_none=True) for n in nodes],'next_actions':[nodes[0].title,nodes[1].title]}

def make_roadmap(profile,role,skill_ids,constraints,resources):
    if len(skill_ids)!=len(set(skill_ids)): raise APIError(422,'VALIDATION_ERROR','Duplicate selected skills')
    required={x.skill_id:x for x in role.required_skills}
    steps=[]; spent=0; remaining_budget=constraints.budget_amount; missing_resources=[]
    for i,sid in enumerate(skill_ids):
        if sid not in required: raise APIError(422,'VALIDATION_ERROR','Skill is not required for selected role',[{'field':'selected_skill_ids','reason':'not_role_requirement'}])
        skill=require_skill(sid)
        hours=10 if constraints.learning_pace=='focused' else 16
        resource=resources.select(sid,constraints.language,constraints.currency,remaining_budget)
        if resource:
            remaining_budget-=resource.cost_amount
            hours=max(hours,resource.estimated_hours+2)
        else: missing_resources.append(sid)
        step={'step_id':f'step_{i+1}_{sid}','skill_id':sid,'title':f'Practice {skill.name}','prerequisite_step_ids':[steps[-1]['step_id']] if steps else [],'estimated_hours':hours,'checkpoint':f'Complete and review a synthetic {skill.name} task'}
        if resource: step['resource']=resource.model_dump()
        steps.append(step)
        spent+=hours
    capacity=constraints.weekly_hours*constraints.target_weeks
    feasibility='feasible' if spent<=capacity else 'stretch' if spent<=capacity*1.25 else 'insufficient_time'
    warnings=[f'No eligible reviewed resource for {sid}; self-directed synthetic practice only.' for sid in missing_resources]
    if feasibility!='feasible': warnings.append(f'Estimated {spent} hours exceeds capacity of {capacity:g} hours.')
    return {'roadmap_id':f'roadmap_{profile.profile_id}_{role.role_id}','profile_id':profile.profile_id,'role_id':role.role_id,'total_estimated_hours':spent,'capacity_hours':capacity,'feasibility':feasibility,'ordered_steps':steps,'warnings':warnings}
