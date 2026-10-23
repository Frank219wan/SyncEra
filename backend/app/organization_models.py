from __future__ import annotations

from typing import Literal

from pydantic import Field, model_validator

from .models import SkillGap, Strict


class OrganizationSkillInput(Strict):
    skill_id: str = Field(pattern=r"^skill_[A-Za-z0-9_]+$")
    level: int | None = Field(default=None, ge=0, le=5)
    source: Literal["declared", "confirmed"]
    confidence: float = Field(ge=0, le=1)


class OrganizationWorkStyle(Strict):
    collaboration: str | None = Field(default=None, max_length=80)
    pace: str | None = Field(default=None, max_length=80)
    structure: str | None = Field(default=None, max_length=80)


class CareerCentreMember(Strict):
    member_id: str = Field(pattern=r"^[A-Za-z0-9_-]{1,80}$")
    programme: str = Field(min_length=1, max_length=160)
    year_or_cohort: str | None = Field(default=None, max_length=80)
    current_courses: list[str] = Field(default_factory=list, max_length=30)
    skills: list[OrganizationSkillInput] = Field(default_factory=list, max_length=50)
    interests: list[str] = Field(default_factory=list, max_length=20)
    goal_tags: list[str] = Field(default_factory=list, max_length=20)
    work_style: OrganizationWorkStyle = Field(default_factory=OrganizationWorkStyle)
    target_role_id: str | None = Field(default=None, pattern=r"^role_[A-Za-z0-9_]+$")
    weekly_learning_hours: float = Field(default=5, gt=0, le=40)
    reviewed: Literal[True]

    @model_validator(mode="after")
    def unique_skills(self):
        skill_ids = [item.skill_id for item in self.skills]
        if len(skill_ids) != len(set(skill_ids)):
            raise ValueError("member skills must be unique")
        for value in [*self.current_courses, *self.interests, *self.goal_tags]:
            if not value.strip():
                raise ValueError("member list values must not be blank")
        return self


class CareerCentrePayload(Strict):
    institution_label: str = Field(min_length=1, max_length=160)
    selected_member_ids: list[str] = Field(min_length=1, max_length=100)
    members: list[CareerCentreMember] = Field(min_length=1, max_length=100)

    @model_validator(mode="after")
    def valid_selection(self):
        member_ids = [item.member_id for item in self.members]
        if len(member_ids) != len(set(member_ids)):
            raise ValueError("member_id values must be unique")
        if len(self.selected_member_ids) != len(set(self.selected_member_ids)):
            raise ValueError("selected_member_ids must be unique")
        missing = set(self.selected_member_ids) - set(member_ids)
        if missing:
            raise ValueError("every selected member must exist in members")
        return self


class HRDepartmentInput(Strict):
    department_id: str = Field(pattern=r"^[A-Za-z0-9_-]{1,80}$")
    label: str = Field(min_length=1, max_length=160)
    headcount: int = Field(ge=0, le=100000)
    target_skill_ids: list[str] = Field(default_factory=list, max_length=50)


class HRPayload(Strict):
    organization_label: str = Field(min_length=1, max_length=160)
    sector: str | None = Field(default=None, max_length=160)
    departments: list[HRDepartmentInput] = Field(default_factory=list, max_length=100)


class OrganizationAnalyzeRequest(Strict):
    schema_version: Literal["organization-v0.1"]
    synthetic_input: Literal[True]
    workspace_id: str | None = Field(default=None, pattern=r"^org_[A-Za-z0-9_]+$")
    workspace_revision: int | None = Field(default=None, ge=1)
    reviewed_by_user: Literal[True]
    region: Literal["MY"]
    locale: Literal["en", "zh-CN", "ms"] = "en"
    ai_scenario: Literal["moderate", "fast"]
    snapshot_id: str | None = Field(default=None, pattern=r"^snap_[A-Za-z0-9_]+$")
    payload: CareerCentrePayload | HRPayload

    @model_validator(mode="after")
    def revision_pair(self):
        if (self.workspace_id is None) != (self.workspace_revision is None):
            raise ValueError("workspace_id and workspace_revision must be supplied together")
        return self


class OrganizationScoreBreakdown(Strict):
    skill_compatibility: float = Field(ge=0, le=100)
    interest_alignment: float = Field(ge=0, le=100)
    goal_alignment: float = Field(ge=0, le=100)
    work_style_alignment: float = Field(ge=0, le=100)
    scenario_outlook: float = Field(ge=0, le=100)
    transition_feasibility: float = Field(ge=0, le=100)

    def total(self) -> float:
        return round(
            0.45 * self.skill_compatibility
            + 0.08 * self.interest_alignment
            + 0.07 * self.goal_alignment
            + 0.05 * self.work_style_alignment
            + 0.20 * self.scenario_outlook
            + 0.15 * self.transition_feasibility,
            2,
        )


class OrganizationRoleRecommendation(Strict):
    rank: int = Field(ge=1)
    role_id: str
    role_name: str
    match_score: float = Field(ge=0, le=100)
    score_breakdown: OrganizationScoreBreakdown
    strengths: list[str]
    skill_gaps: list[SkillGap]
    evidence_ids: list[str]
    tag_sources: list[Literal["MASCO", "curated", "ai_generated"]]

    @model_validator(mode="after")
    def valid_arithmetic(self):
        if abs(self.match_score - self.score_breakdown.total()) > 0.01:
            raise ValueError("match_score does not match score_breakdown")
        return self


class StudentActionPlan(Strict):
    next_semester_courses: list[str]
    self_study_topics: list[str]
    project_or_internship: str
    human_review_status: Literal["required"] = "required"


class StudentOrganizationResult(Strict):
    member_id: str
    recommendations: list[OrganizationRoleRecommendation]
    selected_role_id: str
    action_plan: StudentActionPlan
    missing_inputs: list[Literal["interests", "goal_tags", "work_style", "skill_levels"]]
    result_confidence: Literal["low", "medium", "high"]


class OrganizationGapCount(Strict):
    skill_id: str
    name: str
    affected_members: int = Field(ge=0)
    member_ids: list[str]


class OrganizationWorkshop(Strict):
    title: str
    target_gap: str
    affected_members: int = Field(ge=0)
    evidence_ids: list[str]


class OrganizationCurriculumSupplement(Strict):
    course_name: str
    suggested_module: str
    reason: str
    evidence_ids: list[str]


class CareerCentreCohortResult(Strict):
    included_member_ids: list[str]
    skill_gap_counts: list[OrganizationGapCount]
    proposed_workshops: list[OrganizationWorkshop]
    tutoring_focus: list[str]
    curriculum_supplements: list[OrganizationCurriculumSupplement]
    human_review_status: Literal["required"] = "required"


class OrganizationAnalysisData(Strict):
    workspace_id: str
    workspace_revision: int = Field(ge=1)
    analysis_id: str
    mode: Literal["career_centre"]
    snapshot_id: str
    ai_scenario: Literal["moderate", "fast"]
    scoring_policy: Literal["organization-b2-v0.1"]
    student_results: list[StudentOrganizationResult]
    cohort_result: CareerCentreCohortResult
    warnings: list[str]
