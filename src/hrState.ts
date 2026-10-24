import {emptyHr,hrSample} from './data.ts';
import type {DepartmentPlanVersion,HRAnalysis,HrRequestIdentity,Organization,OrganizationAnalysis,Scenario,ServiceMeta} from './types.ts';

export function hrAnalysisView(org: Organization, scenario: Scenario, demo: boolean): 'demo' | 'connected' | 'needs_analysis' {
  if (demo) return 'demo';
  return org.hrAnalysis?.mode === 'hr'
    && org.analyzedRevision === org.revision
    && org.hrAnalysis.scenario === scenario
    ? 'connected' : 'needs_analysis';
}

export function studentAnalysisView(org: Organization, scenario: Scenario, demo: boolean): 'demo' | 'connected' | 'needs_analysis' {
  if (demo) return 'demo';
  return org.analysis?.mode === 'career_centre'
    && org.analyzedRevision === org.revision
    && org.analysis.scenario === scenario
    ? 'connected' : 'needs_analysis';
}

export function newHrDraftFromSample(): Organization {
  return {...structuredClone(hrSample),clientWorkspaceId:crypto.randomUUID(),
    workspaceId:undefined,workspaceRevision:undefined,hrAnalysis:null,analysisMeta:null,
    hrRecovery:null,hrLastOperationId:undefined,previousWorkspaceIds:[],analyzedRevision:0,planningVersions:[]};
}

export function beginHrAnalysis(org: Organization, request?: HrRequestIdentity): Organization {
  // A failed refresh must not leave the previous server analysis visible.
  // Keep the workspace CAS token so a retry updates the same workspace.
  if(request && (org.clientWorkspaceId!==request.clientWorkspaceId || org.workspaceId!==request.workspaceId || org.workspaceRevision!==request.workspaceRevision)) return org;
  return {...org,hrAnalysis:null,analysisMeta:null,hrRecovery:request?{status:'pending',request}:org.hrRecovery};
}

export function markHrResultUnknown(org:Organization,request:HrRequestIdentity,status:'unknown'|'conflict'):Organization {
  if(org.clientWorkspaceId!==request.clientWorkspaceId || org.workspaceId!==request.workspaceId
    || org.hrRecovery?.request.operationId!==request.operationId) return org;
  return {...org,hrAnalysis:null,analysisMeta:null,hrRecovery:{status,request}};
}

export function createHrWorkspaceFromDraft(org:Organization):Organization {
  return {...org,clientWorkspaceId:crypto.randomUUID(),
    previousWorkspaceIds:org.workspaceId?[...new Set([...(org.previousWorkspaceIds||[]),org.workspaceId])]:org.previousWorkspaceIds,
    workspaceId:undefined,workspaceRevision:undefined,hrAnalysis:null,analysisMeta:null,
    analyzedRevision:0,planningVersions:[],hrRecovery:null,hrLastOperationId:undefined};
}

export function saveHrDraft(current:Organization,draft:Organization):Organization {
  if(current.clientWorkspaceId!==draft.clientWorkspaceId)return draft;
  // An edit opened before a response must never restore its old CAS token or
  // remove an in-flight/uncertain marker. The edited inputs remain the draft.
  return {...draft,revision:Math.max(draft.revision,current.revision+1),
    workspaceId:current.workspaceId,workspaceRevision:current.workspaceRevision,
    hrRecovery:current.hrRecovery,hrLastOperationId:current.hrLastOperationId,
    previousWorkspaceIds:current.previousWorkspaceIds,
    planningVersions:current.planningVersions,analyzedRevision:current.analyzedRevision,
    hrAnalysis:null,analysisMeta:null};
}

export function hrRecoveryNeeded(org:Organization):boolean {
  return org.hrRecovery?.status==='unknown'||org.hrRecovery?.status==='conflict';
}

export function applyHrAnalysisResponse(org: Organization, scenario: Scenario, request:HrRequestIdentity, analysis: HRAnalysis, meta: ServiceMeta, version: DepartmentPlanVersion): Organization {
  // A response from another workspace must not replace this workspace's CAS identity.
  // The local identity also protects the first request, before a server workspace ID exists.
  if (!request.clientWorkspaceId || org.clientWorkspaceId !== request.clientWorkspaceId
    || org.workspaceId !== request.workspaceId || org.workspaceRevision!==request.workspaceRevision
    || (org.hrRecovery && org.hrRecovery.request.operationId!==request.operationId)
    || analysis.mode!=='hr' || analysis.scenario!==request.scenario
    || !analysis.workspaceId || (request.workspaceId && analysis.workspaceId!==request.workspaceId)
    || !Number.isSafeInteger(analysis.workspaceRevision)
    || analysis.workspaceRevision!==(request.workspaceRevision??0)+1) return org;
  const current=org.revision===request.revision && scenario===request.scenario;
  // The server may already have committed an analysis when local inputs change.
  // Retain its CAS token for the same workspace, but hide its stale result.
  return {...org,workspaceId:analysis.workspaceId,workspaceRevision:analysis.workspaceRevision,hrRecovery:null,
    hrLastOperationId:request.operationId,
    hrAnalysis:current?analysis:null,analysisMeta:current?meta:null,
    analyzedRevision:current?request.revision:org.analyzedRevision,
    planningVersions:current?[...(org.planningVersions||[]),version]:org.planningVersions};
}

export function applyStudentAnalysisResponse(org: Organization, scenario: Scenario, requestedRevision: number, requestedScenario: Scenario, requestedWorkspaceId: string | undefined, analysis: OrganizationAnalysis, meta: ServiceMeta): Organization {
  // A response for another workspace must never replace the current workspace identity.
  if (org.workspaceId !== requestedWorkspaceId || (requestedWorkspaceId && analysis.workspaceId !== requestedWorkspaceId)) return org;
  const current=org.revision===requestedRevision && scenario===requestedScenario;
  // The server may have committed this request before local inputs changed. Keep its CAS
  // identity so the next analysis updates that workspace, but never show its stale result.
  return {...org,workspaceId:analysis.workspaceId,workspaceRevision:analysis.workspaceRevision,
    analysis:current?analysis:null,analysisMeta:current?meta:null,
    analyzedRevision:current?requestedRevision:org.analyzedRevision};
}

export function restoreHr(saved: Partial<Organization> | undefined, savedFlag: unknown): {hr: Organization; hrProfileSaved: boolean} {
  const previous=saved||{};
  // Older versions persisted the demo fixture on first load, even when nobody created a profile.
  const untouchedFixture=JSON.stringify(previous)===JSON.stringify(hrSample);
  const hrProfileSaved=typeof savedFlag==='boolean'?savedFlag:Boolean(Object.keys(previous).length&&!untouchedFixture);
  if(!hrProfileSaved)return {hr:structuredClone(emptyHr),hrProfileSaved:false};

  const people=Array.isArray(previous.people)?previous.people:[];
  const sampleWorkspace=previous.name===hrSample.name;
  const legacyNames=[...new Set(people.map(person=>person.department?.trim()).filter((name):name is string=>Boolean(name)))];
  const departments=Array.isArray(previous.departments)?previous.departments.map(department=>{
    const sampleDepartment=sampleWorkspace?hrSample.departments?.find(item=>item.name===department.name):undefined;
    return sampleDepartment?{...sampleDepartment,...department,responsibilities:department.responsibilities||sampleDepartment.responsibilities,currentStatus:department.currentStatus||sampleDepartment.currentStatus,challenges:department.challenges||sampleDepartment.challenges,goals:department.goals?.length?department.goals:sampleDepartment.goals,headcount:department.headcount??sampleDepartment.headcount}:department;
  }):legacyNames.map((name,index)=>{
    const sampleDepartment=sampleWorkspace?hrSample.departments?.find(item=>item.name===name):undefined;
    return sampleDepartment?structuredClone(sampleDepartment):{id:`migrated-dept-${index+1}`,name,responsibilities:'',currentStatus:'',challenges:'',goals:[],headcount:people.filter(person=>person.department?.trim()===name).length};
  });
  const goals=Array.isArray(previous.goals)&&(previous.goals.length>0||!sampleWorkspace)?previous.goals:(sampleWorkspace?hrSample.goals||[]:[]);
  const recovery=previous.hrRecovery?.status==='pending'
    ? {...previous.hrRecovery,status:'unknown' as const}:previous.hrRecovery;
  return {hr:{...emptyHr,...previous,people,departments,goals,hrRecovery:recovery,
    clientWorkspaceId:previous.clientWorkspaceId||crypto.randomUUID()},hrProfileSaved:true};
}
