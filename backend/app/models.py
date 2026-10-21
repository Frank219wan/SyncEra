from __future__ import annotations
from datetime import datetime
from typing import Any, Literal, Generic, TypeVar
from pydantic import BaseModel, ConfigDict, Field, model_validator

class Strict(BaseModel):
    model_config = ConfigDict(extra='forbid')

class Meta(Strict):
    request_id: str
    snapshot_id: str | None = None
    generated_at: datetime
    data_label: Literal['public_open','synthetic_demo','mixed_demo']
    is_mock: bool
    model_version: str | None = 'rules-v0.1'

T = TypeVar('T')

class Envelope(Strict, Generic[T]):
    data: T
    meta: Meta

class APIErrorBody(Strict):
    code: str
    message: str
    details: list[dict[str,str]]
    retryable: bool

class APIErrorEnvelope(Strict):
    error: APIErrorBody
    meta: dict[str,str]

class Evidence(Strict):
    evidence_id: str
    title: str
    source_url: str | None
    source_type: Literal['job_posting','dataset','research','ai_capability']
    published_or_collected_at: str
    retrieved_at: datetime
    region: str | None = 'MY'
    limitations: str | None = None

class Skill(Strict):
    skill_id: str
    name: str
    category: Literal['ai_technical','human_centric','industry','general_technical']
    aliases: list[str] = []

class RequiredSkill(Strict):
    skill_id: str
    name: str
    target_level: int = Field(ge=0,le=5)
    importance: Literal['high','medium','low']

class SDGLink(Strict):
    sdg: int = Field(ge=1,le=17)
    rationale: str

class TaskImpact(Strict):
    task_id: str
    title: str
    impact_type: Literal['automation_candidate','ai_augmented','human_led_oversight']
    reason: str
    evidence_ids: list[str]
    uncertainty: str

class Role(Strict):
    role_id: str
    name: str
    field_id: str
    summary: str
    required_skills: list[RequiredSkill]
    sdg_links: list[SDGLink]
    evidence_ids: list[str]
    tasks: list[TaskImpact]
    interests: list[str] = []

class TrendSnapshot(Strict):
    snapshot_id: str
    region: str
    window_start: str
    window_end: str
    collected_at: datetime
    method_version: str
    evidence_ids: list[str]
    role_scores: dict[str,float]
    skill_scores: dict[str,float]
    scenario_assumptions: dict[str,dict[str,float]]
    uncertainty: str

class TrendPackage(Strict):
    snapshot_id: str
    region: str
    observation_window: dict[str,str]
    role_signals: list[dict[str,Any]]
    skill_signals: list[dict[str,Any]]
    evidence: list[Evidence]
    scenario_assumptions: dict[str,dict[str,float]]
    uncertainty: str

class StudyConstraints(Strict):
    weekly_hours: float = Field(gt=0)
    budget_amount: float = Field(ge=0)
    currency: str
    language: str
    target_weeks: int = Field(gt=0)
    learning_pace: Literal['focused','deep']

class Psychology(Strict):
    mbti: str | None = None
    character_notes: str | None = None
    adaptability_self_report: str | None = None
    intrinsic_motivators: list[str] = []

class ProfileSkill(Strict):
    skill_id: str
    level: int | None = Field(default=None,ge=0,le=5)
    source: Literal['declared','inferred','confirmed']
    confidence: float = Field(ge=0,le=1)

class Profile(Strict):
    profile_id: str
    pipeline: Literal['A'] = 'A'
    current_occupation: str | None = None
    skills: list[ProfileSkill]
    interests: list[str]
    preferred_field_id: str | None = None
    study_constraints: StudyConstraints
    psychology: Psychology = Psychology()
    reviewed_by_user: bool = False
    revision: int = 1

class NormalizeRequest(Strict):
    pipeline: Literal['A']
    input_type: Literal['guided_text','form','synthetic_cv_text']
    synthetic_input: Literal[True]
    text: str | None = None
    form: dict[str,Any] | None = None
    preferred_field_id: str | None = None
    psychology: Psychology = Psychology()
    study_constraints: StudyConstraints
    @model_validator(mode='after')
    def one_input(self):
        if self.input_type == 'form' and not self.form:
            raise ValueError('form is required for form input')
        if self.input_type != 'form' and not self.text:
            raise ValueError('text is required for text input')
        return self

class ConfirmRequest(Strict):
    profile_id: str
    skills: list[ProfileSkill]
    reviewed_by_user: Literal[True]
    # Additive optional version token prevents stale updates when supplied.
    profile_revision: int | None = None

class RecommendRequest(Strict):
    profile_id: str
    region: str = 'MY'
    ai_scenario: Literal['moderate','fast']
    preferred_field_id: str | None = None
    top_k: int = Field(default=5,ge=1,le=20)
    snapshot_id: str | None = None

class ScoreBreakdown(Strict):
    skill_compatibility: float = Field(ge=0,le=100)
    interests_preferences: float = Field(ge=0,le=100)
    scenario_outlook: float = Field(ge=0,le=100)
    transition_feasibility: float = Field(ge=0,le=100)
    def total(self) -> float:
        return round(.45*self.skill_compatibility+.2*self.interests_preferences+.2*self.scenario_outlook+.15*self.transition_feasibility,2)

class SkillGap(Strict):
    skill_id: str
    name: str
    current_level: int | None = Field(default=None,ge=0,le=5)
    target_level: int = Field(ge=0,le=5)
    importance: Literal['high','medium','low']

class Recommendation(Strict):
    rank: int = Field(ge=1)
    role_id: str
    role_name: str
    match_score: float = Field(ge=0,le=100)
    score_breakdown: ScoreBreakdown
    strengths: list[str]
    skill_gaps: list[SkillGap]
    reason: str
    evidence_ids: list[str]
    scenario_assumptions: list[str]
    uncertainty: str
    sdg_links: list[SDGLink]
    @model_validator(mode='after')
    def arithmetic(self):
        if abs(self.match_score-self.score_breakdown.total()) > .01:
            raise ValueError('match_score does not match score_breakdown')
        return self

class Resource(Strict):
    resource_id: str
    title: str
    provider: str
    url: str
    language: str
    cost_amount: float = Field(ge=0)
    currency: str
    estimated_hours: float = Field(ge=0)
    verified_at: datetime

class MapNode(Strict):
    node_id: str
    node_type: Literal['prerequisite','concept','practice','project','checkpoint']
    title: str
    depends_on: list[str]
    estimated_hours: float = Field(ge=0)
    resource_id: str | None = None
    resource: Resource | None = None

class SkillMapRequest(Strict):
    profile_id: str
    role_id: str
    skill_id: str
    language: str
    budget_amount: float = Field(ge=0)
    currency: str

class RoadmapRequest(Strict):
    profile_id: str
    role_id: str
    selected_skill_ids: list[str] = Field(min_length=1)
    study_constraints: StudyConstraints

class HealthData(Strict):
    status: Literal['ok']
    api_version: str

class BubbleCategory(Strict):
    field_id: str
    name: str
    display_size: float = Field(ge=0)

class BubbleRole(Strict):
    role_id: str
    field_id: str
    name: str
    display_size: float = Field(ge=0)
    trend_score: float | None = Field(default=None,ge=0,le=100)
    signal_label: str
    evidence_ids: list[str]

class BubblesData(Strict):
    categories: list[BubbleCategory]
    roles: list[BubbleRole]
    size_basis: str
    region: str

class RoleSignal(Strict):
    role_id: str
    name: str
    field_id: str
    rank: int = Field(ge=1)
    trend_score: float | None = Field(default=None,ge=0,le=100)
    signal_label: str
    observed_metrics: dict[str,float | int | None]
    evidence_ids: list[str]
    source_window: dict[str,str]

class SkillSignal(Strict):
    skill_id: str
    name: str
    rank: int = Field(ge=1)
    trend_score: float | None = Field(default=None,ge=0,le=100)
    signal_label: str
    observed_metrics: dict[str,float | int | None]
    evidence_ids: list[str]
    source_window: dict[str,str]

class RolesData(Strict):
    items: list[RoleSignal]
    next_cursor: str | None

class SkillsData(Strict):
    items: list[SkillSignal]
    next_cursor: str | None

class RoleData(Strict):
    role_id: str
    name: str
    field_id: str
    summary: str
    required_skills: list[RequiredSkill]
    sdg_links: list[SDGLink]
    evidence_ids: list[str]

class TasksData(Strict):
    role_id: str
    tasks: list[TaskImpact]

class EvidenceData(Strict):
    evidence: Evidence

class NormalizeData(Strict):
    profile: Profile
    extraction_warnings: list[str]
    unrecognized_skill_terms: list[str]

class ConfirmData(Strict):
    profile: Profile
    profile_revision: int = Field(ge=1)

class RecommendData(Strict):
    profile_id: str
    ai_scenario: Literal['moderate','fast']
    recommendations: list[Recommendation]

class SkillMapData(Strict):
    skill_map_id: str
    role_id: str
    skill_id: str
    nodes: list[MapNode]
    next_actions: list[str] = Field(max_length=3)

class RoadmapStep(Strict):
    step_id: str
    skill_id: str
    title: str
    prerequisite_step_ids: list[str]
    estimated_hours: float = Field(ge=0)
    resource: Resource | None = None
    checkpoint: str

class RoadmapData(Strict):
    roadmap_id: str
    profile_id: str
    role_id: str
    total_estimated_hours: float = Field(ge=0)
    capacity_hours: float = Field(ge=0)
    feasibility: Literal['feasible','stretch','insufficient_time']
    ordered_steps: list[RoadmapStep]
    warnings: list[str]

class OrganizationGroup(Strict):
    cohort_id: str
    kind: Literal['employee_department','student_cohort']
    label: str
    size: int = Field(ge=0)
    skill_distribution: list[dict[str,int]]
