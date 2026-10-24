import {applyHrAnalysisResponse,beginHrAnalysis,markHrResultUnknown} from './hrState.ts';
import type {AppState,HRAnalysis,HrRequestIdentity,Organization,Scenario,ServiceMeta,Locale} from './types.ts';

type UpdateState=(change:(state:AppState)=>AppState)=>void;
type Analyze=(org:Organization,scenario:Scenario,locale:Locale)=>Promise<{analysis:HRAnalysis|null;meta:ServiceMeta}>;
export type HrRunResult={kind:'received'|'unknown'|'conflict'|'busy'; error?:Error;request?:HrRequestIdentity};

// The pending marker survives route changes. The in-memory guard also catches
// two clicks in the same event batch, before React renders the marker.
const inFlight=new Set<string>();

export async function runHrAnalysis(snapshot:AppState,update:UpdateState,analyze:Analyze,now=()=>new Date(),reserve?:(request:HrRequestIdentity)=>Promise<boolean>):Promise<HrRunResult> {
  const org=snapshot.hr;
  const clientId=org.clientWorkspaceId;
  if(!clientId || org.hrRecovery || inFlight.has(clientId))return {kind:'busy'};
  const request:HrRequestIdentity={clientWorkspaceId:clientId,workspaceId:org.workspaceId,
    workspaceRevision:org.workspaceRevision,revision:org.revision,scenario:snapshot.scenario,
    operationId:crypto.randomUUID()};
  const version={version:(org.planningVersions?.length||0)+1,createdAt:now().toISOString(),
    organizationGoals:[...(org.goals||[])],skills:[...org.needs],departments:structuredClone(org.departments||[]),
    budget:org.budget,weeks:org.weeks};
  inFlight.add(clientId);
  // Persist the pending marker before the HTTP request. If this tab closes or
  // the response is lost, refresh restores an unknown outcome instead of
  // silently retrying an old server revision.
  if(reserve){
    try {if(!await reserve(request)){inFlight.delete(clientId);return {kind:'busy'};}}
    catch {inFlight.delete(clientId);return {kind:'busy'};}
  }
  update(state=>({...state,hr:beginHrAnalysis(state.hr,request)}));
  try {
    const result=await analyze(org,request.scenario,snapshot.locale);
    const analysis=result.analysis;
    if(!analysis || analysis.mode!=='hr' || analysis.scenario!==request.scenario
      || !analysis.workspaceId || (request.workspaceId && analysis.workspaceId!==request.workspaceId)
      || !Number.isSafeInteger(analysis.workspaceRevision)
      || analysis.workspaceRevision!==(request.workspaceRevision??0)+1)
      throw new Error('The HR service returned an unconfirmed workspace revision.');
    update(state=>({...state,hr:applyHrAnalysisResponse(state.hr,state.scenario,request,analysis,result.meta,version)}));
    return {kind:'received',request};
  } catch(cause) {
    const error=cause instanceof Error?cause:new Error('The HR request outcome could not be confirmed.');
    const kind='status' in error && error.status===409?'conflict':'unknown';
    update(state=>({...state,hr:markHrResultUnknown(state.hr,request,kind)}));
    return {kind,error};
  } finally {
    inFlight.delete(clientId);
  }
}
