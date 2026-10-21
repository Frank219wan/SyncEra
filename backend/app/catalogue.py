"""Approved synthetic demo catalogue. Values are examples, not market observations."""
from datetime import datetime, timezone
from .models import Evidence, Skill, Role, RequiredSkill, SDGLink, TaskImpact, TrendSnapshot, Resource

EVIDENCE = {
    'ev_demo_001': Evidence(evidence_id='ev_demo_001',title='Synthetic role-signal fixture',source_url=None,source_type='dataset',published_or_collected_at='2026-10-21',retrieved_at=datetime(2026,10,21,tzinfo=timezone.utc),limitations='Synthetic demo fixture; not public market evidence'),
}
SKILLS = {s.skill_id:s for s in [
    Skill(skill_id='skill_sql',name='SQL',category='general_technical',aliases=['sql']),
    Skill(skill_id='skill_excel',name='Excel',category='general_technical',aliases=['excel','spreadsheets']),
    Skill(skill_id='skill_python',name='Python',category='general_technical',aliases=['python']),
    Skill(skill_id='skill_validation',name='AI Output Validation',category='ai_technical',aliases=['validation','ai validation']),
    Skill(skill_id='skill_communication',name='Communication',category='human_centric',aliases=['communication']),
]}
def required(skill_id, level, importance):
    return RequiredSkill(skill_id=skill_id,name=SKILLS[skill_id].name,target_level=level,importance=importance)
ROLES = {r.role_id:r for r in [
    Role(role_id='role_data_analyst',name='Data Analyst',field_id='field_data',summary='Synthetic example role focused on data interpretation.',required_skills=[required('skill_sql',3,'high'),required('skill_python',3,'high'),required('skill_validation',2,'medium')],sdg_links=[SDGLink(sdg=8,rationale='Data skills can support productive work when applied responsibly.')],evidence_ids=['ev_demo_001'],tasks=[TaskImpact(task_id='task_data_review',title='Review analysis outputs',impact_type='human_led_oversight',reason='A human checks context and consequences of reported results.',evidence_ids=['ev_demo_001'],uncertainty='Synthetic task illustration; impact not empirically assessed')],interests=['analytics','data']),
    Role(role_id='role_business_analyst',name='Business Analyst',field_id='field_business',summary='Synthetic example role focused on business decisions.',required_skills=[required('skill_excel',3,'high'),required('skill_communication',3,'high'),required('skill_validation',2,'medium')],sdg_links=[SDGLink(sdg=8,rationale='Business analysis can contribute to productive and decent work.')],evidence_ids=['ev_demo_001'],tasks=[TaskImpact(task_id='task_stakeholder_review',title='Clarify stakeholder needs',impact_type='human_led_oversight',reason='Context and accountability require human review.',evidence_ids=['ev_demo_001'],uncertainty='Synthetic task illustration; impact not empirically assessed')],interests=['business','communication']),
]}
SNAPSHOTS = {x.snapshot_id:x for x in [
    TrendSnapshot(snapshot_id='snap_my_20261021_01',region='MY',window_start='2026-10-01',window_end='2026-10-21',collected_at=datetime(2026,10,21,tzinfo=timezone.utc),method_version='synthetic-v1',evidence_ids=['ev_demo_001'],role_scores={'role_data_analyst':78,'role_business_analyst':64},skill_scores={'skill_sql':75,'skill_excel':61,'skill_python':72,'skill_validation':68,'skill_communication':59},scenario_assumptions={'moderate':{'role_data_analyst':1.0,'role_business_analyst':1.0},'fast':{'role_data_analyst':1.08,'role_business_analyst':0.96}},uncertainty='Synthetic fixture; no observed job-demand claim'),
    TrendSnapshot(snapshot_id='snap_my_20261021_02',region='MY',window_start='2026-10-02',window_end='2026-10-21',collected_at=datetime(2026,10,21,tzinfo=timezone.utc),method_version='synthetic-v1',evidence_ids=['ev_demo_001'],role_scores={'role_data_analyst':69,'role_business_analyst':73},skill_scores={'skill_sql':65,'skill_excel':70,'skill_python':67,'skill_validation':71,'skill_communication':65},scenario_assumptions={'moderate':{'role_data_analyst':1.0,'role_business_analyst':1.0},'fast':{'role_data_analyst':1.08,'role_business_analyst':0.96}},uncertainty='Synthetic fixture; no observed job-demand claim'),
]}
ACTIVE_SNAPSHOT = 'snap_my_20261021_01'
RESOURCES: dict[str,Resource] = {}  # AI/Technical must supply reviewed URLs.
FIELDS = {'field_data':'Data & Technology','field_business':'Business & Finance'}

def validate_catalogue():
    for role in ROLES.values():
        assert role.field_id in FIELDS
        assert all(x.skill_id in SKILLS for x in role.required_skills)
        assert all(x in EVIDENCE for x in role.evidence_ids)
        assert all(x in EVIDENCE for task in role.tasks for x in task.evidence_ids)
    for snap in SNAPSHOTS.values():
        assert set(snap.role_scores) <= set(ROLES)
        assert set(snap.skill_scores) <= set(SKILLS)
        assert set(snap.evidence_ids) <= set(EVIDENCE)
        assert all(set(v) <= set(ROLES) for v in snap.scenario_assumptions.values())
validate_catalogue()
