from __future__ import annotations

from collections import defaultdict

from .models import SkillGap, TrendSnapshot
from .organization_analysis import EVIDENCE_IDS, ORGANIZATION_ROLES, OrganizationRole, _outlook, _transition
from .organization_models import (
    HRCapacitySummary,
    HRCrossDepartmentPriority,
    HRDepartmentResult,
    HREmployeeInput,
    HRMobilitySuggestion,
    HROrganizationSummary,
    HRPayload,
    HRSkillCoverage,
    HRTrainingPriority,
)


SKILL_NAMES = {
    skill_id: name
    for role in ORGANIZATION_ROLES.values()
    for skill_id, name, _target, _importance in role.required_skills
}


def _skill_name(skill_id: str) -> str:
    return SKILL_NAMES.get(skill_id, skill_id.removeprefix("skill_").replace("_", " ").title())


def _employee_role_score(
    employee: HREmployeeInput,
    role: OrganizationRole,
    snapshot: TrendSnapshot,
    scenario: str,
) -> HRMobilitySuggestion:
    known = {item.skill_id: item.level for item in employee.skills}
    weighted_total = 0.0
    weight_sum = 0.0
    gaps: list[SkillGap] = []
    for skill_id, name, target, importance in role.required_skills:
        weight = {"high": 3.0, "medium": 2.0, "low": 1.0}[importance]
        level = known.get(skill_id)
        if skill_id in known and level is None:
            component = 60.0
        elif level is None:
            component = 0.0
        else:
            component = min(100.0, 100.0 * level / max(1, target))
        weighted_total += component * weight
        weight_sum += weight
        if level is None or level < target:
            gaps.append(
                SkillGap(
                    skill_id=skill_id,
                    name=name,
                    current_level=level,
                    target_level=target,
                    importance=importance,
                )
            )
    skill_score = round(weighted_total / max(1.0, weight_sum), 2)
    outlook = _outlook(role, snapshot, scenario)
    transition = _transition(len(gaps), len(role.required_skills), employee.weekly_learning_hours)
    total = round(0.60 * skill_score + 0.25 * outlook + 0.15 * transition, 2)
    return HRMobilitySuggestion(
        member_id=employee.member_id,
        current_role=employee.current_role,
        recommended_role_id=role.role_id,
        recommended_role_name=role.name,
        match_score=total,
        skill_compatibility=skill_score,
        scenario_outlook=outlook,
        transition_feasibility=transition,
        skill_gaps=gaps,
        evidence_ids=EVIDENCE_IDS,
    )


def _mobility_suggestion(
    employee: HREmployeeInput,
    snapshot: TrendSnapshot,
    scenario: str,
) -> HRMobilitySuggestion | None:
    if not employee.baseline_known or not employee.skills:
        return None
    candidates = [
        _employee_role_score(employee, role, snapshot, scenario)
        for role in ORGANIZATION_ROLES.values()
    ]
    candidates.sort(
        key=lambda item: (
            -item.match_score,
            -item.skill_compatibility,
            item.recommended_role_id != employee.target_role_id if employee.target_role_id else False,
            item.recommended_role_id,
        )
    )
    return candidates[0]


def _priority(coverage: HRSkillCoverage) -> str:
    if coverage.coverage_state == "unknown":
        return "review_required"
    if (coverage.coverage_percent or 0) < 40:
        return "high"
    if (coverage.coverage_percent or 0) < 75:
        return "medium"
    return "low"


def _training_priority(coverage: HRSkillCoverage) -> HRTrainingPriority:
    return HRTrainingPriority(
        skill_id=coverage.skill_id,
        name=coverage.name,
        priority=_priority(coverage),
        coverage_state=coverage.coverage_state,
        affected_profiles=(len(coverage.missing_member_ids) if coverage.coverage_state == "measured" else None),
        affected_member_ids=coverage.missing_member_ids,
        estimated_hours_per_learner=6,
        evidence_ids=EVIDENCE_IDS,
    )


def _department_skills(payload: HRPayload, department_id: str) -> list[str]:
    department = next(item for item in payload.departments if item.department_id == department_id)
    return list(dict.fromkeys([*payload.target_skill_ids, *department.target_skill_ids]))


def analyze_hr(
    payload: HRPayload,
    snapshot: TrendSnapshot,
    scenario: str,
) -> tuple[list[HRDepartmentResult], HROrganizationSummary, list[str]]:
    employees_by_department: dict[str, list[HREmployeeInput]] = defaultdict(list)
    for employee in payload.employees:
        employees_by_department[employee.department_id].append(employee)

    department_results: list[HRDepartmentResult] = []
    for department in payload.departments:
        employees = employees_by_department[department.department_id]
        known = [item for item in employees if item.baseline_known and item.skills]
        coverage_items: list[HRSkillCoverage] = []
        for skill_id in _department_skills(payload, department.department_id):
            with_skill = [item for item in known if skill_id in {skill.skill_id for skill in item.skills}]
            missing = [item.member_id for item in known if item not in with_skill]
            measured = bool(known)
            coverage_items.append(
                HRSkillCoverage(
                    skill_id=skill_id,
                    name=_skill_name(skill_id),
                    coverage_state="measured" if measured else "unknown",
                    recorded_profiles=len(known),
                    profiles_with_skill=len(with_skill),
                    coverage_percent=round(100 * len(with_skill) / len(known), 2) if measured else None,
                    missing_member_ids=missing,
                )
            )
        mobility = [
            suggestion
            for employee in employees
            if (suggestion := _mobility_suggestion(employee, snapshot, scenario)) is not None
        ]
        mobility.sort(key=lambda item: (item.member_id, -item.match_score, item.recommended_role_id))
        department_warnings: list[str] = []
        if not employees:
            department_warnings.append("No anonymous employee profiles were supplied; skill coverage remains unknown.")
        elif not known:
            department_warnings.append("Employee profiles were supplied, but no recorded skill baseline is available.")
        if len(employees) > department.headcount:
            department_warnings.append("Anonymous employee profile count exceeds the reported department headcount.")
        if not coverage_items:
            department_warnings.append("No target skills were selected for this department.")
        department_results.append(
            HRDepartmentResult(
                department_id=department.department_id,
                label=department.label,
                reported_headcount=department.headcount,
                employee_profile_count=len(employees),
                known_baseline_count=len(known),
                skill_coverage=coverage_items,
                training_priorities=[_training_priority(item) for item in coverage_items],
                mobility_suggestions=mobility,
                warnings=department_warnings,
            )
        )

    all_skill_ids = list(
        dict.fromkeys(
            skill_id
            for department in payload.departments
            for skill_id in _department_skills(payload, department.department_id)
        )
    )
    cross_priorities: list[HRCrossDepartmentPriority] = []
    for skill_id in all_skill_ids:
        relevant = [
            (department, coverage)
            for department in department_results
            for coverage in department.skill_coverage
            if coverage.skill_id == skill_id
        ]
        has_unknown = any(coverage.coverage_state == "unknown" for _department, coverage in relevant)
        affected_ids = sorted(
            {
                member_id
                for _department, coverage in relevant
                for member_id in coverage.missing_member_ids
            }
        )
        measured_profiles = sum(coverage.recorded_profiles for _department, coverage in relevant)
        profiles_with_skill = sum(coverage.profiles_with_skill for _department, coverage in relevant)
        aggregate = HRSkillCoverage(
            skill_id=skill_id,
            name=_skill_name(skill_id),
            coverage_state="unknown" if has_unknown else "measured",
            recorded_profiles=measured_profiles,
            profiles_with_skill=profiles_with_skill,
            coverage_percent=(
                round(100 * profiles_with_skill / measured_profiles, 2)
                if measured_profiles and not has_unknown
                else None
            ),
            missing_member_ids=affected_ids,
        )
        base = _training_priority(aggregate)
        cross_priorities.append(
            HRCrossDepartmentPriority(
                **base.model_dump(),
                affected_department_ids=[department.department_id for department, _coverage in relevant],
            )
        )
    priority_order = {"review_required": 0, "high": 1, "medium": 2, "low": 3}
    cross_priorities.sort(key=lambda item: (priority_order[item.priority], item.skill_id))

    reported_headcount = sum(item.headcount for item in payload.departments)
    known_count = sum(1 for item in payload.employees if item.baseline_known and item.skills)
    profile_count = len(payload.employees)
    profile_coverage = round(100 * profile_count / reported_headcount, 2) if reported_headcount else 0.0
    profile_coverage = min(100.0, profile_coverage)
    recorded_weekly_hours = sum(item.weekly_learning_hours for item in payload.employees) if payload.employees else None
    estimated_capacity = (
        round(recorded_weekly_hours * payload.planning_horizon_weeks, 2)
        if recorded_weekly_hours is not None
        else None
    )
    complete_training_estimate = bool(cross_priorities) and all(
        item.coverage_state == "measured" for item in cross_priorities
    )
    estimated_training = (
        round(sum((item.affected_profiles or 0) * item.estimated_hours_per_learner for item in cross_priorities), 2)
        if complete_training_estimate
        else None
    )
    if estimated_capacity is None or estimated_training is None:
        horizon_status = "not_assessed"
    elif estimated_training <= estimated_capacity:
        horizon_status = "feasible"
    else:
        horizon_status = "stretch"
    summary = HROrganizationSummary(
        reported_headcount=reported_headcount,
        department_count=len(payload.departments),
        employee_profile_count=profile_count,
        known_baseline_count=known_count,
        profile_coverage_percent=profile_coverage,
        cross_department_skill_priorities=cross_priorities,
        capacity=HRCapacitySummary(
            planning_horizon_weeks=payload.planning_horizon_weeks,
            recorded_weekly_learning_hours=recorded_weekly_hours,
            estimated_capacity_hours=estimated_capacity,
            estimated_training_hours=estimated_training,
            horizon_status=horizon_status,
            budget_myr=payload.training_budget_myr,
        ),
    )
    warnings = [
        "B1 uses a synthetic role catalogue and deterministic rules; it is not a workforce decision system.",
        "Budget feasibility is not assessed because verified course prices are not connected.",
        "Employee notes, personality descriptions and protected characteristics are excluded from scoring.",
        "All internal mobility and training suggestions require HR and manager review.",
    ]
    if not payload.employees:
        warnings.append("Department-only planning is available, but employee skill coverage and mobility remain unknown.")
    return department_results, summary, warnings
