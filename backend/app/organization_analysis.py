from __future__ import annotations

from collections import Counter
from dataclasses import dataclass
from typing import Iterable

from .models import SkillGap, TrendSnapshot
from .organization_models import (
    CareerCentreCohortResult,
    CareerCentreMember,
    CareerCentrePayload,
    OrganizationCurriculumSupplement,
    OrganizationGapCount,
    OrganizationRoleRecommendation,
    OrganizationScoreBreakdown,
    OrganizationWorkshop,
    StudentActionPlan,
    StudentOrganizationResult,
)


@dataclass(frozen=True)
class OrganizationRole:
    role_id: str
    name: str
    required_skills: tuple[tuple[str, str, int, str], ...]
    interests: tuple[str, ...]
    goals: tuple[str, ...]
    work_style: tuple[str, ...]
    moderate_score: float
    fast_score: float


# This adapter mirrors the six cards already rendered by src/data.ts. It is a
# synthetic UI-compatible catalogue, not a MASCO or DOSM market-data claim.
ORGANIZATION_ROLES = {
    role.role_id: role
    for role in (
        OrganizationRole("role_data_analyst", "Data Analyst", (("skill_sql", "SQL", 3, "high"), ("skill_python", "Python", 3, "high"), ("skill_validation", "AI Output Validation", 2, "medium")), ("data", "analytics", "technology"), ("entry_level_data_role", "use_data", "decision_support"), ("balanced", "structured", "guided"), 78, 84),
        OrganizationRole("role_business_analyst", "Business Analyst", (("skill_excel", "Excel", 3, "high"), ("skill_communication", "Communication", 3, "high"), ("skill_validation", "AI Output Validation", 2, "medium")), ("business", "communication", "analytics"), ("decision_support", "business_improvement", "service_quality"), ("collaborative", "structured", "guided"), 64, 61),
        OrganizationRole("role_ai_workflow", "AI Workflow Designer", (("skill_ai", "Applied AI", 3, "high"), ("skill_automation", "Workflow Automation", 3, "high"), ("skill_python", "Python", 2, "medium"), ("skill_communication", "Communication", 2, "medium")), ("ai", "technology", "automation"), ("digital_transformation", "build_systems", "productivity"), ("collaborative", "fast", "flexible"), 80, 89),
        OrganizationRole("role_sustainability_analyst", "Sustainability Analyst", (("skill_analytics", "Data Analysis", 3, "high"), ("skill_sustainability", "Sustainability", 3, "high"), ("skill_visualization", "Data Storytelling", 2, "medium"), ("skill_communication", "Communication", 2, "medium")), ("sustainability", "environment", "data"), ("social_impact", "climate_action", "decision_support"), ("collaborative", "structured", "independent"), 77, 76),
        OrganizationRole("role_learning_designer", "Learning Experience Designer", (("skill_design", "Learning Design", 3, "high"), ("skill_research", "User Research", 3, "high"), ("skill_communication", "Communication", 2, "medium"), ("skill_ai", "Applied AI", 2, "medium")), ("education", "design", "people"), ("learning_support", "social_impact", "service_quality"), ("collaborative", "balanced", "guided"), 73, 82),
        OrganizationRole("role_research_analyst", "UX Researcher", (("skill_research", "User Research", 3, "high"), ("skill_analytics", "Data Analysis", 3, "high"), ("skill_communication", "Communication", 2, "medium"), ("skill_visualization", "Data Storytelling", 2, "medium")), ("research", "people", "technology"), ("understand_users", "service_quality", "decision_support"), ("collaborative", "balanced", "flexible"), 71, 74),
    )
}

EVIDENCE_IDS = ["ev_demo_001"]


def _tokens(values: Iterable[str | None]) -> set[str]:
    result: set[str] = set()
    for value in values:
        if not value:
            continue
        normalized = value.strip().lower().replace("-", "_").replace(" ", "_")
        if normalized:
            result.add(normalized)
            result.update(part for part in normalized.replace(",", "_").split("_") if part)
    return result


def _alignment(values: Iterable[str | None], role_values: Iterable[str]) -> tuple[float, bool]:
    supplied = _tokens(values)
    if not supplied:
        return 50.0, True
    expected = _tokens(role_values)
    if not expected:
        return 50.0, True
    overlap = supplied & expected
    return round(min(100.0, 40.0 + 60.0 * len(overlap) / max(1, len(expected))), 2) if overlap else 20.0, False


def _skill_result(member: CareerCentreMember, role: OrganizationRole) -> tuple[float, list[str], list[SkillGap], bool]:
    known = {item.skill_id: item.level for item in member.skills}
    weighted_total = 0.0
    weight_sum = 0.0
    strengths: list[str] = []
    gaps: list[SkillGap] = []
    unknown_level = False
    for skill_id, name, target, importance in role.required_skills:
        weight = {"high": 3.0, "medium": 2.0, "low": 1.0}[importance]
        level = known.get(skill_id)
        if skill_id in known and level is None:
            component = 60.0
            unknown_level = True
        elif level is None:
            component = 0.0
        else:
            component = min(100.0, 100.0 * level / max(1, target))
        weighted_total += component * weight
        weight_sum += weight
        if level is not None and level >= target:
            strengths.append(skill_id)
        else:
            gaps.append(SkillGap(skill_id=skill_id, name=name, current_level=level, target_level=target, importance=importance))
    return round(weighted_total / weight_sum, 2), strengths, gaps, unknown_level


def _outlook(role: OrganizationRole, snapshot: TrendSnapshot, scenario: str) -> float:
    observed = snapshot.role_scores.get(role.role_id)
    if observed is not None:
        multiplier = snapshot.scenario_assumptions.get(scenario, {}).get(role.role_id, 1.0)
        return round(max(0.0, min(100.0, observed * multiplier)), 2)
    return role.fast_score if scenario == "fast" else role.moderate_score


def _transition(gap_count: int, requirement_count: int, weekly_hours: float) -> float:
    coverage = 100.0 * (1.0 - gap_count / max(1, requirement_count))
    capacity = min(100.0, weekly_hours / 8.0 * 100.0)
    return round(0.7 * coverage + 0.3 * capacity, 2)


def _recommendations(member: CareerCentreMember, snapshot: TrendSnapshot, scenario: str) -> tuple[list[OrganizationRoleRecommendation], list[str]]:
    missing: list[str] = []
    if not member.interests:
        missing.append("interests")
    if not member.goal_tags:
        missing.append("goal_tags")
    styles = [member.work_style.collaboration, member.work_style.pace, member.work_style.structure]
    if not any(styles):
        missing.append("work_style")
    recommendations: list[OrganizationRoleRecommendation] = []
    unknown_levels = False
    for role in ORGANIZATION_ROLES.values():
        skill, strengths, gaps, unknown = _skill_result(member, role)
        unknown_levels = unknown_levels or unknown
        interest, _ = _alignment(member.interests, role.interests)
        goal, _ = _alignment(member.goal_tags, role.goals)
        work_style, _ = _alignment(styles, role.work_style)
        breakdown = OrganizationScoreBreakdown(
            skill_compatibility=skill,
            interest_alignment=interest,
            goal_alignment=goal,
            work_style_alignment=work_style,
            scenario_outlook=_outlook(role, snapshot, scenario),
            transition_feasibility=_transition(len(gaps), len(role.required_skills), member.weekly_learning_hours),
        )
        recommendations.append(OrganizationRoleRecommendation(
            rank=1,
            role_id=role.role_id,
            role_name=role.name,
            match_score=breakdown.total(),
            score_breakdown=breakdown,
            strengths=strengths,
            skill_gaps=gaps,
            evidence_ids=EVIDENCE_IDS,
            tag_sources=["curated"],
        ))
    if unknown_levels:
        missing.append("skill_levels")
    recommendations.sort(key=lambda item: (
        -item.match_score,
        -item.score_breakdown.skill_compatibility,
        -item.score_breakdown.scenario_outlook,
        -item.score_breakdown.transition_feasibility,
        item.role_id,
    ))
    for index, item in enumerate(recommendations, 1):
        item.rank = index
    return recommendations, missing


def _action_plan(role: OrganizationRole, gaps: list[SkillGap]) -> StudentActionPlan:
    names = [gap.name for gap in gaps[:3]]
    topic = ", ".join(names) if names else "advanced role practice"
    return StudentActionPlan(
        next_semester_courses=[f"Review available modules covering {name}" for name in names[:2]] or ["Review an advanced elective with an academic adviser"],
        self_study_topics=names or ["Portfolio evidence and reflective practice"],
        project_or_internship=f"Complete a supervised {role.name} project demonstrating {topic}.",
    )


def analyze_career_centre(payload: CareerCentrePayload, snapshot: TrendSnapshot, scenario: str) -> tuple[list[StudentOrganizationResult], CareerCentreCohortResult, list[str]]:
    members = {item.member_id: item for item in payload.members}
    results: list[StudentOrganizationResult] = []
    gap_members: dict[str, set[str]] = {}
    gap_names: dict[str, str] = {}
    member_courses: dict[str, list[str]] = {}
    for member_id in payload.selected_member_ids:
        member = members[member_id]
        ranked, missing = _recommendations(member, snapshot, scenario)
        selected = next((item for item in ranked if item.role_id == member.target_role_id), None)
        selected = selected or ranked[0]
        selected_role = ORGANIZATION_ROLES[selected.role_id]
        visible_recommendations = ranked[:3]
        if selected not in visible_recommendations:
            visible_recommendations = [*visible_recommendations[:2], selected]
        for index, item in enumerate(visible_recommendations, 1):
            item.rank = index
        for gap in selected.skill_gaps:
            gap_members.setdefault(gap.skill_id, set()).add(member_id)
            gap_names[gap.skill_id] = gap.name
            member_courses.setdefault(gap.skill_id, []).extend(member.current_courses)
        confidence = "high" if not missing else "medium" if len(missing) <= 2 else "low"
        results.append(StudentOrganizationResult(
            member_id=member_id,
            recommendations=visible_recommendations,
            selected_role_id=selected.role_id,
            action_plan=_action_plan(selected_role, selected.skill_gaps),
            missing_inputs=missing,
            result_confidence=confidence,
        ))
    ordered = sorted(gap_members, key=lambda skill_id: (-len(gap_members[skill_id]), skill_id))
    counts = [OrganizationGapCount(
        skill_id=skill_id,
        name=gap_names[skill_id],
        affected_members=len(gap_members[skill_id]),
        member_ids=sorted(gap_members[skill_id]),
    ) for skill_id in ordered]
    workshops = [OrganizationWorkshop(
        title=f"{gap_names[skill_id]} in practice",
        target_gap=skill_id,
        affected_members=len(gap_members[skill_id]),
        evidence_ids=EVIDENCE_IDS,
    ) for skill_id in ordered[:3]]
    supplements = []
    for skill_id in ordered[:3]:
        course_counts = Counter(item for item in member_courses.get(skill_id, []) if item.strip())
        course_name = course_counts.most_common(1)[0][0] if course_counts else "Course mapping required"
        supplements.append(OrganizationCurriculumSupplement(
            course_name=course_name,
            suggested_module=f"Applied {gap_names[skill_id]}",
            reason=f"Addresses a recorded gap for {len(gap_members[skill_id])} selected members.",
            evidence_ids=EVIDENCE_IDS,
        ))
    cohort = CareerCentreCohortResult(
        included_member_ids=payload.selected_member_ids,
        skill_gap_counts=counts,
        proposed_workshops=workshops,
        tutoring_focus=[gap_names[skill_id] for skill_id in ordered[:4]],
        curriculum_supplements=supplements,
    )
    warnings = [
        "Synthetic organization catalogue; no employability probability is claimed.",
        "Recommendations and curriculum suggestions require adviser review.",
    ]
    if len(payload.selected_member_ids) < 2:
        warnings.append("A single member result is not an institutional cohort insight.")
    return results, cohort, warnings
