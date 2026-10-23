import type { Constraints, HRAnalysis, Locale, MarketRadarPackage, Organization, OrganizationAnalysis, Plan, Profile, Recommendation, Role, Scenario, ServiceMeta, Skill, Task } from '../types.ts';

export interface ApiMeta {
  request_id?: string;
  snapshot_id?: string | null;
  generated_at?: string | null;
  data_label?: string;
  is_mock?: boolean;
  model_version?: string | null;
}

export interface ApiSkill {
  skill_id: string;
  level: number | null;
  source: 'declared' | 'inferred' | 'confirmed';
  confidence: number;
}

export interface ApiNormalizedProfile {
  profile_id: string;
  pipeline: 'A';
  current_occupation: string | null;
  skills: ApiSkill[];
  interests: string[];
  preferred_field_id?: string | null;
  study_constraints?: Record<string, unknown>;
  psychology?: { mbti?: string | null; assessment_version?: string; assessment_type?: string; scenario_answers?: Record<string,'A'|'B'|'C'|'D'|'E'|null>; other_responses?: Record<string,string>; consent_to_personalization?: boolean };
  reviewed_by_user: boolean;
  revision: number;
}

export interface ApiRoleSignal {
  role_id: string;
  name: string;
  field_id?: string;
  trend_score: number | null;
  signal_label?: string;
  evidence_ids?: string[];
  source_window?: { from: string; to: string };
  observed_metrics?: Record<string, number | null>;
}
export interface ApiSkillSignal { skill_id:string; name:string; trend_score:number|null; signal_label:string; observed_metrics?:{change_pp?:number|null}; evidence_ids:string[]; source_window?:{from:string;to:string} }
export interface ApiBubblesData { categories:Array<{field_id:string;name:string;display_size:number}>; roles:Array<{role_id:string;field_id:string;display_size:number;evidence_ids:string[]}>; size_basis:string; region:string }

export interface ApiMarketRadarSignal {
  id:string; name:string; source_id:string; source_row:number; postings:number|null; previous_postings:number|null; year_ago_postings:number|null;
  market_share_percent:number|null; qoq_change_percent:number|null; yoy_change_percent:number|null;
}
export interface ApiMarketMatchReadiness {
  candidate_skills_source:string; position_granularity:string;
  named_positions_available:boolean; named_skill_requirements_available:boolean; evidence_based_matching_ready:boolean; reason:string;
}
export interface ApiMarketEmploymentMetric {
  jobs:number; filled_jobs:number; vacancies:number; jobs_created:number;
  qoq_change_percent:number|null; yoy_change_percent:number|null;
}
export interface ApiMarketRadarData {
  snapshot_id:string; region:string; data_as_of:string; period:string; periods:string[];
  total_job_offerings:number; total_qoq_change_percent:number|null; total_yoy_change_percent:number|null;
  occupation_groups:ApiMarketRadarSignal[]; industries:ApiMarketRadarSignal[];
  matching_readiness:ApiMarketMatchReadiness;
  employment_totals:ApiMarketEmploymentMetric;
  employment_sectors:Array<ApiMarketEmploymentMetric & {
    id:string; name:string;
    skill_levels:Array<{name:'Skilled'|'Semi-skilled'|'Low-skilled';jobs:number;filled_jobs:number;vacancies:number;jobs_created:number}>;
  }>;
  sources:Array<{id:string;title:string;file:string;published_on:string;url:string;measure:string}>;
  terms_url:string; attribution:string; notes:string[];
}

export interface ApiRoleData {
  role_id: string;
  name: string;
  field_id: string;
  summary: string;
  required_skills: Array<{ skill_id: string; name: string; target_level: number; importance: string }>;
  evidence_ids: string[];
  sdg_links: Array<{ sdg: number; rationale: string }>;
  // Reserved for a future agreed contract. Current v1.0 responses omit this field.
  alignment_tags?: unknown;
}

export interface VerifiedRoleAlignmentTag {
  kind: 'interest' | 'goal' | 'work_style';
  label: string;
  source: 'MASCO' | 'curated' | 'ai_generated';
}

export function verifiedRoleAlignmentTags(role: ApiRoleData): VerifiedRoleAlignmentTag[] {
  if(!Array.isArray(role.alignment_tags))return [];
  return role.alignment_tags.filter((item:unknown):item is VerifiedRoleAlignmentTag=>{
    if(!item||typeof item!=='object')return false;
    const tag=item as Record<string,unknown>;
    return ['interest','goal','work_style'].includes(String(tag.kind))
      && typeof tag.label==='string' && Boolean(tag.label.trim())
      && ['MASCO','curated','ai_generated'].includes(String(tag.source));
  });
}

export interface ApiTaskImpact {
  task_id: string;
  title: string;
  impact_type: 'automation_candidate' | 'ai_augmented' | 'human_led_oversight';
  reason: string;
  evidence_ids: string[];
  uncertainty: string;
}

export interface ApiRecommendation {
  rank: number;
  role_id: string;
  role_name: string;
  match_score: number | null;
  score_breakdown?: Record<string, number | null>;
  strengths?: string[];
  // FastAPI's response_model_exclude_none omits an unknown current_level.
  skill_gaps?: Array<{ skill_id: string; name: string; current_level?: number | null; target_level: number; importance: string }>;
  reason?: string;
  evidence_ids?: string[];
  scenario_assumptions?: string[];
  uncertainty?: string;
  sdg_links?: Array<{ sdg: number; rationale: string }>;
}

/** Reject mismatched or malformed service results before the UI labels scores as computed. */
export function validateRecommendationPayload(
  data: unknown,
  meta: ApiMeta | undefined,
  expected: { profileId: string; scenario: 'moderate' | 'fast'; snapshotId: string; topK: number },
): ApiRecommendation[] {
  const record = (value: unknown): value is Record<string, unknown> =>
    value !== null && typeof value === 'object' && !Array.isArray(value);
  const id = (value: unknown, prefix: string): value is string =>
    typeof value === 'string' && new RegExp(`^${prefix}[A-Za-z0-9_-]{1,80}$`).test(value);
  const score = (value: unknown): value is number =>
    typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 100;
  const uniqueIds = (value: unknown, prefix: string): value is string[] =>
    Array.isArray(value) && value.every(item => id(item, prefix)) && new Set(value).size === value.length;
  const text = (value: unknown): value is string => typeof value === 'string' && value.trim().length > 0;
  const textList = (value: unknown): value is string[] => Array.isArray(value) && value.every(text);

  if (!record(data) || data.profile_id !== expected.profileId || data.ai_scenario !== expected.scenario ||
      !Array.isArray(data.recommendations) || data.recommendations.length > expected.topK) {
    throw new TypeError('Recommendation context does not match the confirmed profile and scenario.');
  }
  if (!meta || !text(meta.request_id) || meta.snapshot_id !== expected.snapshotId ||
      !text(meta.model_version) || !['synthetic_demo', 'mixed_demo', 'public_open'].includes(meta.data_label ?? '') ||
      typeof meta.is_mock !== 'boolean' ||
      (meta.data_label === 'public_open' ? meta.is_mock : !meta.is_mock)) {
    throw new TypeError('Recommendation provenance does not match the requested snapshot.');
  }

  const seen = new Set<string>();
  let previous = 101;
  for (const [index, raw] of data.recommendations.entries()) {
    if (!record(raw) || !id(raw.role_id, 'role_') || seen.has(raw.role_id) ||
        raw.rank !== index + 1 || !text(raw.role_name) || !score(raw.match_score) ||
        raw.match_score > previous || !record(raw.score_breakdown)) {
      throw new TypeError('Recommendation IDs, ranking, or scores are invalid.');
    }
    seen.add(raw.role_id);
    previous = raw.match_score;
    const breakdown = raw.score_breakdown;
    const keys = ['skill_compatibility', 'interests_preferences', 'scenario_outlook', 'transition_feasibility'] as const;
    if (!keys.every(key => score(breakdown[key]))) {
      throw new TypeError('Recommendation score breakdown is invalid.');
    }
    const weighted = Math.round((0.45 * (breakdown.skill_compatibility as number) +
      0.20 * (breakdown.interests_preferences as number) +
      0.20 * (breakdown.scenario_outlook as number) +
      0.15 * (breakdown.transition_feasibility as number)) * 100) / 100;
    if (Math.abs(weighted - raw.match_score) > 0.011 ||
        !uniqueIds(raw.strengths, 'skill_') || !uniqueIds(raw.evidence_ids, '') ||
        !Array.isArray(raw.skill_gaps) || !text(raw.reason) || !text(raw.uncertainty) ||
        !textList(raw.scenario_assumptions)) {
      throw new TypeError('Recommendation evidence or skill gaps are invalid.');
    }
    const gaps = new Set<string>();
    for (const gap of raw.skill_gaps) {
      if (!record(gap) || !id(gap.skill_id, 'skill_') || gaps.has(gap.skill_id) ||
          (raw.strengths as string[]).includes(gap.skill_id) || !text(gap.name) ||
          !Number.isInteger(gap.target_level) || (gap.target_level as number) < 0 || (gap.target_level as number) > 5 ||
          (gap.current_level !== null && gap.current_level !== undefined && (!Number.isInteger(gap.current_level) ||
            (gap.current_level as number) < 0 || (gap.current_level as number) >= (gap.target_level as number))) ||
          !['high', 'medium', 'low'].includes(String(gap.importance))) {
        throw new TypeError('Recommendation skill gap is invalid.');
      }
      gaps.add(gap.skill_id);
    }
  }
  return data.recommendations as ApiRecommendation[];
}

export interface ApiCareerAnalysis {
  source: 'minimax' | 'rules_fallback';
  status: 'success' | 'disabled' | 'unavailable' | 'invalid_output' | 'in_progress' | 'rate_limited' | 'input_limit';
  role_id: string | null;
  reason: string;
  strength_skill_ids: string[];
  gap_skill_ids: string[];
  risk_and_uncertainty: string;
  evidence_ids: string[];
  model_version: string | null;
}

export interface ApiRoadmapStep {
  step_id: string;
  skill_id: string;
  title: string;
  prerequisite_step_ids: string[];
  estimated_hours: number;
  checkpoint: string;
}

export interface ApiRoadmap {
  roadmap_id: string;
  profile_id: string;
  role_id: string;
  total_estimated_hours: number;
  capacity_hours: number;
  feasibility: 'feasible' | 'stretch' | 'insufficient_time';
  ordered_steps: ApiRoadmapStep[];
  warnings: string[];
}

export interface ApiOrganizationAnalysis {
  workspace_id:string; workspace_revision:number; analysis_id:string; mode:'career_centre';
  snapshot_id:string; ai_scenario:Scenario; scoring_policy:'organization-b2-v0.1';
  student_results:Array<{
    member_id:string; selected_role_id:string; result_confidence:'low'|'medium'|'high';
    missing_inputs:Array<'interests'|'goal_tags'|'work_style'|'skill_levels'>;
    recommendations:Array<{
      rank:number;role_id:string;role_name:string;match_score:number;
      score_breakdown:{skill_compatibility:number;interest_alignment:number;goal_alignment:number;work_style_alignment:number;scenario_outlook:number;transition_feasibility:number};
      strengths:string[];skill_gaps:Array<{skill_id:string;name:string;current_level?:number|null;target_level:number;importance:'high'|'medium'|'low'}>;
      evidence_ids:string[];tag_sources:Array<'MASCO'|'curated'|'ai_generated'>;
    }>;
    action_plan:{next_semester_courses:string[];self_study_topics:string[];project_or_internship:string;human_review_status:'required'};
  }>;
  cohort_result:{
    included_member_ids:string[];
    skill_gap_counts:Array<{skill_id:string;name:string;affected_members:number;member_ids:string[]}>;
    proposed_workshops:Array<{title:string;target_gap:string;affected_members:number;evidence_ids:string[]}>;
    tutoring_focus:string[];
    curriculum_supplements:Array<{course_name:string;suggested_module:string;reason:string;evidence_ids:string[]}>;
    human_review_status:'required';
  };
  warnings:string[];
}

export interface ApiHRAnalysis {
  workspace_id:string; workspace_revision:number; analysis_id:string; mode:'hr';
  snapshot_id:string; ai_scenario:Scenario; scoring_policy:'organization-b1-v0.1';
  department_results:Array<{
    department_id:string;label:string;reported_headcount:number;employee_profile_count:number;known_baseline_count:number;
    skill_coverage:Array<{skill_id:string;name:string;coverage_state:'measured'|'unknown';recorded_profiles:number;profiles_with_skill:number;coverage_percent:number|null;missing_member_ids:string[]}>;
    training_priorities:Array<{skill_id:string;name:string;priority:'review_required'|'high'|'medium'|'low';coverage_state:'measured'|'unknown';affected_profiles:number|null;affected_member_ids:string[];estimated_hours_per_learner:number;estimate_basis:'synthetic_planning_assumption';evidence_ids:string[]}>;
    mobility_suggestions:Array<{member_id:string;current_role:string|null;recommended_role_id:string;recommended_role_name:string;match_score:number;skill_compatibility:number;scenario_outlook:number;transition_feasibility:number;skill_gaps:Array<{skill_id:string;name:string;current_level:number|null;target_level:number;importance:'high'|'medium'|'low'}>;evidence_ids:string[];human_review_status:'required'}>;
    warnings:string[];
  }>;
  organization_summary:{
    reported_headcount:number;department_count:number;employee_profile_count:number;known_baseline_count:number;profile_coverage_percent:number;
    cross_department_skill_priorities:Array<{skill_id:string;name:string;priority:'review_required'|'high'|'medium'|'low';coverage_state:'measured'|'unknown';affected_profiles:number|null;affected_member_ids:string[];estimated_hours_per_learner:number;estimate_basis:'synthetic_planning_assumption';evidence_ids:string[];affected_department_ids:string[]}>;
    capacity:{planning_horizon_weeks:number;recorded_weekly_learning_hours:number|null;estimated_capacity_hours:number|null;estimated_training_hours:number|null;horizon_status:'not_assessed'|'feasible'|'stretch';budget_myr:number;budget_status:'not_assessed'};
    human_review_status:'required';
  };
  warnings:string[];
}

const levelToNumber: Record<string, number | null> = { unknown: null, beginner: 1, intermediate: 3, advanced: 5 };
const contractSkillIds = new Set(['sql', 'excel', 'python', 'validation', 'communication']);

export const toContractSkillId = (id: string) => id.startsWith('skill_') ? id : `skill_${id}`;
export const fromContractSkillId = (id: string) => id.replace(/^skill_/, '');
export const toContractRoleId = (id: string) => id.startsWith('role_') ? id : `role_${id.replace(/-/g, '_')}`;
export const fromContractRoleId = (id: string) => id.replace(/^role_/, '').replace(/_/g, '-');
export const toContractLevel = (level: string) => levelToNumber[level] ?? null;

function splitOrganizationValues(value:string) {
  return [...new Set(value.split(/[,;，；、\n]/).map(item=>item.trim()).filter(Boolean))];
}

export function organizationToAnalyzeRequest(org:Organization,scenario:Scenario,locale:Locale,selectedOnly:boolean) {
  const selectedIds=selectedOnly
    ? org.selected
    : org.people.filter(person=>person.reviewed&&person.known&&person.skills.length&&person.target&&person.courses.trim()).map(person=>person.id);
  const included=new Set(selectedIds);
  return {
    schema_version:'organization-v0.1' as const,
    synthetic_input:true as const,
    workspace_id:org.workspaceId??null,
    workspace_revision:org.workspaceRevision??null,
    reviewed_by_user:true as const,
    region:'MY' as const,
    locale:locale==='zh'?'zh-CN':locale,
    ai_scenario:scenario,
    snapshot_id:null,
    payload:{
      institution_label:org.name,
      selected_member_ids:selectedIds,
      members:org.people.filter(person=>included.has(person.id)).map(person=>({
        member_id:person.id,
        programme:person.department,
        year_or_cohort:person.year||null,
        current_courses:splitOrganizationValues(person.courses),
        skills:person.skills.map(skill=>({skill_id:toContractSkillId(skill),level:person.skillLevels?.[skill]??null,source:'confirmed' as const,confidence:1})),
        interests:splitOrganizationValues(person.interests),
        goal_tags:person.goalTags??[],
        work_style:{collaboration:person.workStyle?.collaboration||null,pace:person.workStyle?.pace||null,structure:person.workStyle?.structure||null},
        target_role_id:person.target?toContractRoleId(person.target):null,
        weekly_learning_hours:person.hours,
        reviewed:true as const,
      })),
    },
  };
}

export function hrOrganizationToAnalyzeRequest(org:Organization,scenario:Scenario,locale:Locale) {
  const departments=org.departments||[];
  const departmentByName=new Map(departments.map(item=>[item.name.trim().toLowerCase(),item.id]));
  return {
    schema_version:'organization-v0.1' as const,
    synthetic_input:true as const,
    workspace_id:org.workspaceId??null,
    workspace_revision:org.workspaceRevision??null,
    reviewed_by_user:true as const,
    region:'MY' as const,
    locale:locale==='zh'?'zh-CN':locale,
    ai_scenario:scenario,
    snapshot_id:null,
    payload:{
      organization_label:org.name,
      sector:org.sector||null,
      organization_goal_tags:org.goals||[],
      target_skill_ids:org.needs.map(toContractSkillId),
      training_budget_myr:org.budget,
      planning_horizon_weeks:org.weeks,
      departments:departments.map(department=>({
        department_id:department.id,
        label:department.name,
        responsibilities:department.responsibilities,
        current_status:department.currentStatus,
        challenges:department.challenges,
        headcount:department.headcount,
        goal_tags:department.goals||[],
        target_skill_ids:org.needs.map(toContractSkillId),
      })),
      employees:org.people.map(person=>({
        member_id:person.id,
        department_id:departmentByName.get(person.department.trim().toLowerCase())||'',
        current_role:person.role||null,
        skills:person.known?person.skills.map(skill=>({skill_id:toContractSkillId(skill),level:person.skillLevels?.[skill]??null,source:'confirmed' as const,confidence:1})):[],
        baseline_known:person.known,
        target_role_id:person.target?toContractRoleId(person.target):null,
        weekly_learning_hours:person.hours,
        reviewed:true as const,
      })),
    },
  };
}

export function mapOrganizationAnalysis(data:ApiOrganizationAnalysis):OrganizationAnalysis {
  return {
    workspaceId:data.workspace_id,workspaceRevision:data.workspace_revision,analysisId:data.analysis_id,mode:data.mode,
    snapshotId:data.snapshot_id,scenario:data.ai_scenario,scoringPolicy:data.scoring_policy,warnings:data.warnings,
    studentResults:data.student_results.map(student=>({
      memberId:student.member_id,selectedRoleId:fromContractRoleId(student.selected_role_id),resultConfidence:student.result_confidence,missingInputs:student.missing_inputs,
      recommendations:student.recommendations.map(item=>({
        rank:item.rank,roleId:fromContractRoleId(item.role_id),roleName:item.role_name,matchScore:item.match_score,
        scoreBreakdown:{skillCompatibility:item.score_breakdown.skill_compatibility,interestAlignment:item.score_breakdown.interest_alignment,goalAlignment:item.score_breakdown.goal_alignment,workStyleAlignment:item.score_breakdown.work_style_alignment,scenarioOutlook:item.score_breakdown.scenario_outlook,transitionFeasibility:item.score_breakdown.transition_feasibility},
        strengths:item.strengths.map(fromContractSkillId),skillGaps:item.skill_gaps.map(gap=>({skillId:fromContractSkillId(gap.skill_id),name:gap.name,currentLevel:gap.current_level??null,targetLevel:gap.target_level,importance:gap.importance})),
        evidenceIds:item.evidence_ids,tagSources:item.tag_sources,
      })),
      actionPlan:{nextSemesterCourses:student.action_plan.next_semester_courses,selfStudyTopics:student.action_plan.self_study_topics,projectOrInternship:student.action_plan.project_or_internship,humanReviewStatus:student.action_plan.human_review_status},
    })),
    cohortResult:{
      includedMemberIds:data.cohort_result.included_member_ids,
      skillGapCounts:data.cohort_result.skill_gap_counts.map(gap=>({skillId:fromContractSkillId(gap.skill_id),name:gap.name,affectedMembers:gap.affected_members,memberIds:gap.member_ids})),
      proposedWorkshops:data.cohort_result.proposed_workshops.map(item=>({title:item.title,targetGap:fromContractSkillId(item.target_gap),affectedMembers:item.affected_members,evidenceIds:item.evidence_ids})),
      tutoringFocus:data.cohort_result.tutoring_focus,
      curriculumSupplements:data.cohort_result.curriculum_supplements.map(item=>({courseName:item.course_name,suggestedModule:item.suggested_module,reason:item.reason,evidenceIds:item.evidence_ids})),
      humanReviewStatus:data.cohort_result.human_review_status,
    },
  };
}

export function mapHRAnalysis(data:ApiHRAnalysis):HRAnalysis {
  const mapPriority=(item:ApiHRAnalysis['organization_summary']['cross_department_skill_priorities'][number])=>({
    skillId:fromContractSkillId(item.skill_id),name:item.name,priority:item.priority,coverageState:item.coverage_state,
    affectedProfiles:item.affected_profiles,affectedMemberIds:item.affected_member_ids,
    estimatedHoursPerLearner:item.estimated_hours_per_learner,estimateBasis:item.estimate_basis,evidenceIds:item.evidence_ids,
    affectedDepartmentIds:item.affected_department_ids,
  });
  return {
    workspaceId:data.workspace_id,workspaceRevision:data.workspace_revision,analysisId:data.analysis_id,mode:data.mode,
    snapshotId:data.snapshot_id,scenario:data.ai_scenario,scoringPolicy:data.scoring_policy,warnings:data.warnings,
    departmentResults:data.department_results.map(department=>({
      departmentId:department.department_id,label:department.label,reportedHeadcount:department.reported_headcount,
      employeeProfileCount:department.employee_profile_count,knownBaselineCount:department.known_baseline_count,
      skillCoverage:department.skill_coverage.map(item=>({skillId:fromContractSkillId(item.skill_id),name:item.name,coverageState:item.coverage_state,recordedProfiles:item.recorded_profiles,profilesWithSkill:item.profiles_with_skill,coveragePercent:item.coverage_percent,missingMemberIds:item.missing_member_ids})),
      trainingPriorities:department.training_priorities.map(item=>({skillId:fromContractSkillId(item.skill_id),name:item.name,priority:item.priority,coverageState:item.coverage_state,affectedProfiles:item.affected_profiles,affectedMemberIds:item.affected_member_ids,estimatedHoursPerLearner:item.estimated_hours_per_learner,estimateBasis:item.estimate_basis,evidenceIds:item.evidence_ids})),
      mobilitySuggestions:department.mobility_suggestions.map(item=>({memberId:item.member_id,currentRole:item.current_role,recommendedRoleId:fromContractRoleId(item.recommended_role_id),recommendedRoleName:item.recommended_role_name,matchScore:item.match_score,skillCompatibility:item.skill_compatibility,scenarioOutlook:item.scenario_outlook,transitionFeasibility:item.transition_feasibility,skillGaps:item.skill_gaps.map(gap=>({skillId:fromContractSkillId(gap.skill_id),name:gap.name,currentLevel:gap.current_level??null,targetLevel:gap.target_level,importance:gap.importance})),evidenceIds:item.evidence_ids,humanReviewStatus:item.human_review_status})),
      warnings:department.warnings,
    })),
    organizationSummary:{
      reportedHeadcount:data.organization_summary.reported_headcount,departmentCount:data.organization_summary.department_count,
      employeeProfileCount:data.organization_summary.employee_profile_count,knownBaselineCount:data.organization_summary.known_baseline_count,
      profileCoveragePercent:data.organization_summary.profile_coverage_percent,
      crossDepartmentSkillPriorities:data.organization_summary.cross_department_skill_priorities.map(mapPriority),
      capacity:{planningHorizonWeeks:data.organization_summary.capacity.planning_horizon_weeks,recordedWeeklyLearningHours:data.organization_summary.capacity.recorded_weekly_learning_hours,estimatedCapacityHours:data.organization_summary.capacity.estimated_capacity_hours,estimatedTrainingHours:data.organization_summary.capacity.estimated_training_hours,horizonStatus:data.organization_summary.capacity.horizon_status,budgetMyr:data.organization_summary.capacity.budget_myr,budgetStatus:data.organization_summary.capacity.budget_status},
      humanReviewStatus:data.organization_summary.human_review_status,
    },
  };
}
export function fromContractLevel(level: number | null) {
  if (level === null || level === 0) return 'unknown';
  if (level <= 2) return 'beginner';
  if (level <= 4) return 'intermediate';
  return 'advanced';
}

export function toServiceMeta(meta: ApiMeta | undefined): ServiceMeta {
  return {
    requestId: meta?.request_id ?? '',
    snapshotId: meta?.snapshot_id ?? null,
    generatedAt: meta?.generated_at ?? null,
    dataLabel: meta?.data_label ?? 'synthetic_demo',
    isMock: meta?.is_mock ?? false,
    modelVersion: meta?.model_version ?? null,
  };
}

function mapMarketEmploymentMetric(value: ApiMarketEmploymentMetric) {
  return {
    jobs: value.jobs,
    filledJobs: value.filled_jobs,
    vacancies: value.vacancies,
    jobsCreated: value.jobs_created,
    qoqChangePercent: value.qoq_change_percent,
    yoyChangePercent: value.yoy_change_percent,
  };
}

export function mapMarketRadar(data: ApiMarketRadarData, meta: ServiceMeta): MarketRadarPackage {
  const mapSignal = (signal: ApiMarketRadarSignal) => ({
    id: signal.id,
    name: signal.name,
    sourceId: signal.source_id,
    sourceRow: signal.source_row,
    postings: signal.postings,
    marketSharePercent: signal.market_share_percent,
    previousPostings: signal.previous_postings,
    yearAgoPostings: signal.year_ago_postings,
    qoqChangePercent: signal.qoq_change_percent,
    yoyChangePercent: signal.yoy_change_percent,
  });
  return {
    snapshotId: data.snapshot_id,
    region: data.region,
    dataAsOf: data.data_as_of,
    period: data.period,
    periods: data.periods,
    totalJobOfferings: data.total_job_offerings,
    totalQoqChangePercent: data.total_qoq_change_percent,
    totalYoyChangePercent: data.total_yoy_change_percent,
    occupationGroups: data.occupation_groups.map(mapSignal),
    industries: data.industries.map(mapSignal),
    matchingReadiness: {
      candidateSkillsSource: data.matching_readiness.candidate_skills_source,
      positionGranularity: data.matching_readiness.position_granularity,
      namedPositionsAvailable: data.matching_readiness.named_positions_available,
      namedSkillRequirementsAvailable: data.matching_readiness.named_skill_requirements_available,
      evidenceBasedMatchingReady: data.matching_readiness.evidence_based_matching_ready,
      reason: data.matching_readiness.reason,
    },
    employmentTotals: mapMarketEmploymentMetric(data.employment_totals),
    employmentSectors: data.employment_sectors.map(sector => ({
      ...mapMarketEmploymentMetric(sector),
      id: sector.id,
      name: sector.name,
      skillLevels: sector.skill_levels.map(level => ({
        name: level.name,
        jobs: level.jobs,
        filledJobs: level.filled_jobs,
        vacancies: level.vacancies,
        jobsCreated: level.jobs_created,
      })),
    })),
    sources: data.sources.map(source => ({
      id: source.id,
      title: source.title,
      file: source.file,
      publishedOn: source.published_on,
      url: source.url,
      measure: source.measure,
    })),
    termsUrl: data.terms_url,
    attribution: data.attribution,
    notes: data.notes,
    meta,
  };
}

function toApiSkill(skill: Skill, reviewed = false): ApiSkill {
  return {
    skill_id: toContractSkillId(skill.id),
    level: toContractLevel(skill.level),
    source: reviewed ? 'confirmed' : skill.source === 'manual' ? 'declared' : 'inferred',
    confidence: reviewed ? 1 : skill.confidence ?? (skill.source === 'manual' ? 1 : 0.7),
  };
}

function contractSkills(skills: Skill[], reviewed = false) {
  // The UI has a wider demo catalogue than the current P0 backend. Never send
  // a made-up canonical ID: unsupported skills stay local until the shared
  // catalogue is expanded.
  return skills.filter(skill => skill.backendSupported!==false&&contractSkillIds.has(fromContractSkillId(skill.id)) && (!reviewed || skill.confirmed)).map(skill => toApiSkill(skill, reviewed));
}

function splitInterests(value: string) {
  return [...new Set(value.split(/[,;，；、\n]/).map(item => item.trim()).filter(Boolean))];
}

export function profileToNormalizeRequest(profile: Profile) {
  return {
    pipeline: 'A' as const,
    input_type: 'form' as const,
    synthetic_input: true,
    text: profile.experience.trim() || null,
    form: {
      current_occupation: profile.occupation.trim(),
      experience: profile.experience.trim(),
      interests: splitInterests(profile.interests),
      skills: contractSkills(profile.skills),
    },
    psychology: { mbti: profile.mbti || null, intrinsic_motivators: [] as string[], ...(profile.psychology ?? {}) },
    study_constraints: {
      weekly_hours: 5, budget_amount: 0, currency: 'MYR', language: 'en',
      target_weeks: 12, learning_pace: 'focused',
    },
  };
}

export function syntheticTextToNormalizeRequest(profile: Profile, text: string) {
  return {...profileToNormalizeRequest(profile), input_type: 'synthetic_cv_text' as const, text: text.trim(), form: null};
}

export function profileToConfirmRequest(profile: Profile) {
  return {
    profile_id: profile.id,
    skills: contractSkills(profile.skills, true),
    reviewed_by_user: true,
    profile_revision: profile.revision,
    ...(profile.psychology ? { psychology: { mbti: profile.mbti || null, ...profile.psychology } } : {}),
    ...(profile.occupation.trim() ? {current_occupation:profile.occupation.trim()} : {}),
    ...(profile.interests.trim() ? {interests:splitInterests(profile.interests)} : {}),
  };
}

export function mergeNormalizedProfile(profile: ApiNormalizedProfile, fallback: Profile): Profile {
  const returnedIds = new Set(profile.skills.map(skill => fromContractSkillId(skill.skill_id)));
  return {
    ...fallback,
    id: profile.profile_id,
    occupation: profile.current_occupation ?? fallback.occupation,
    interests: profile.interests?.join(', ') || fallback.interests,
    // MBTI remains self-reported context; normalization never infers it from a CV.
    mbti: fallback.mbti,
    psychology: profile.psychology?.assessment_version ? {assessment_version:'1.0',assessment_type:'self_report_reflection',scenario_answers:profile.psychology.scenario_answers??{},other_responses:profile.psychology.other_responses??{},consent_to_personalization:profile.psychology.consent_to_personalization??false} : fallback.psychology,
    revision: profile.revision,
    skills: [...profile.skills.map(skill => ({
      id: fromContractSkillId(skill.skill_id),
      level: fromContractLevel(skill.level),
      source: (skill.source === 'declared' || skill.source === 'confirmed' ? 'manual' : 'inferred') as Skill['source'],
      confirmed: profile.reviewed_by_user || (skill.source === 'declared' && fallback.skills.some(existing => existing.id === fromContractSkillId(skill.skill_id) && existing.confirmed)),
      confidence: skill.confidence,
      backendSupported:true,
    })), ...(profile.reviewed_by_user ? [] : fallback.skills.filter(skill => !returnedIds.has(skill.id)).map(skill => ({...skill,confirmed:false,backendSupported:false})))],
  };
}

export function mapRecommendations(items: ApiRecommendation[]): Recommendation[] {
  return items.map(item => ({
    roleId: fromContractRoleId(item.role_id),
    roleName: item.role_name,
    rank: item.rank,
    matchScore: item.match_score,
    origin: 'computed',
    strengths: item.strengths?.map(fromContractSkillId),
    skillGaps: item.skill_gaps?.map(gap => ({
      skillId: fromContractSkillId(gap.skill_id),
      name: gap.name,
      currentLevel: gap.current_level ?? null,
      targetLevel: gap.target_level,
      importance: gap.importance,
    })),
    reason: item.reason,
    evidenceIds: item.evidence_ids,
    scenarioAssumptions: item.scenario_assumptions,
    uncertainty: item.uncertainty,
    scoreBreakdown: item.score_breakdown,
    sdgLinks: item.sdg_links,
  }));
}

export function mapTrendRoles(items: ApiRoleSignal[], knownRoles: Role[]): Role[] {
  return items.map(item => {
    const id = fromContractRoleId(item.role_id);
    const known = knownRoles.find(role => role.id === id);
    const trend = item.signal_label === 'rising' ? 'rising' : item.signal_label === 'stable' ? 'stable' : item.signal_label === 'emerging' ? 'emerging' : item.signal_label === 'declining' ? 'declining' : 'unknown';
    const signal = item.trend_score ?? 0;
    const domain = item.field_id === 'field_data' ? 'technology' : item.field_id?.replace(/^field_/, '') || 'unclassified';
    return { id, name: known ? [item.name,known.name[1],known.name[2]] as const : [item.name,item.name,item.name] as const,
      domain, fieldId:item.field_id, description:[item.name,item.name,item.name] as const,
      skills:[],scores:{moderate:0,fast:0},signal,trend,sdgs:[],
      signalAvailable:item.trend_score!==null,signalLabel:item.signal_label,evidenceIds:item.evidence_ids,
      sourceWindow:item.source_window,observedMetrics:item.observed_metrics };
  });
}

export function applyBubbleSizes(roles:Role[],bubbles:ApiBubblesData):Role[]|null {
  if(!bubbles.size_basis.trim()||!bubbles.region)return null;
  const byId=new Map(bubbles.roles.map(item=>[fromContractRoleId(item.role_id),item]));
  if(!roles.every(role=>{const item=byId.get(role.id);return item&&item.field_id===role.fieldId&&Number.isFinite(item.display_size)&&item.display_size>0;}))return null;
  const sizes=new Set(roles.map(role=>byId.get(role.id)!.display_size));
  if(sizes.size>1&&(!/observed|verified|normalized/i.test(bubbles.size_basis)||!roles.every(role=>byId.get(role.id)!.evidence_ids.length)))return null;
  return roles.map(role=>({...role,bubbleSize:byId.get(role.id)!.display_size}));
}

export function targetWeeks(constraints: Constraints) {
  if (!constraints.deadline) return 12;
  const start = Date.parse(`${constraints.start}T00:00:00Z`);
  const end = Date.parse(`${constraints.deadline}T00:00:00Z`);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return 12;
  return Math.max(1, Math.ceil((end - start) / (7 * 24 * 60 * 60 * 1000)));
}

export function mapRoadmap(data: ApiRoadmap, roleId: string, constraints: Constraints): Plan {
  let accumulatedHours = 0;
  const tasks: Task[] = data.ordered_steps.map(step => {
    const week = Math.floor(accumulatedHours / Math.max(1, constraints.hours)) + 1;
    accumulatedHours += step.estimated_hours;
    return {
      id: step.step_id,
      skill: fromContractSkillId(step.skill_id),
      title: [step.title, step.title, step.title],
      hours: step.estimated_hours,
      done: false,
      week,
    };
  });
  return {
    id: data.roadmap_id,
    roleId,
    version: 1,
    adopted: false,
    constraints: { ...constraints },
    tasks,
    earned: 0,
    revisionPending: false,
    offset: 0,
    history: [],
    totalEstimatedHours: data.total_estimated_hours,
    capacityHours: data.capacity_hours,
    feasibility: data.feasibility,
    warnings: data.warnings,
  };
}
