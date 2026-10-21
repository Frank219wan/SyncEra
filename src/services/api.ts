import type { Profile, Scenario, Recommendation, Constraints, Plan, TrendPackage, Organization } from '../types';
import { demoRecommendations, makePlan } from '../domain';
import { roles } from '../data';
export const isDemo = import.meta.env.VITE_API_MODE !== 'real';
const base = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/,'');
export class ApiError extends Error { constructor(public status:number,message:string) {super(message);} }
async function request<T>(path:string, body?:unknown, method?:string):Promise<T> {
  const response=await fetch(`${base}/api/v1${path}`,{method:method||(body?'POST':'GET'),headers:{'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(20000)});
  if(!response.ok) throw new ApiError(response.status,`Service request failed (${response.status}). Please retry.`);
  const data:unknown=await response.json();
  if(!data || typeof data!=='object') throw new ApiError(502,'The service returned an invalid response.');
  return data as T;
}
export const api = {
  normalize: async (profile:Profile):Promise<Profile> => isDemo ? structuredClone(profile) : request('/profiles/normalize',{profile}),
  confirm: async (profile:Profile):Promise<Profile> => isDemo ? structuredClone(profile) : request('/profiles/confirm',{profile}),
  trends: async ():Promise<TrendPackage> => isDemo ? {snapshotId:'synthetic-v1',snapshotAt:null,region:'Malaysia · synthetic fixture',origin:'synthetic_fixture',roles} : request('/trends'),
  recommend: async(profile:Profile,scenario:Scenario,selectedRole:string,snapshotId:string):Promise<Recommendation[]> => {
    if(isDemo) return demoRecommendations(profile,scenario);
    const result=await request<{recommendations:Recommendation[]}>('/recommendations',{profile_id:profile.id,profile,scenario_id:scenario,target_role_id:selectedRole||null,snapshot_id:snapshotId});
    if(!Array.isArray(result.recommendations)) throw new ApiError(502,'Missing recommendations in service response.');
    return result.recommendations;
  },
  fullPlan: async(roleId:string,constraints:Constraints,profileId:string):Promise<Plan>=>isDemo?makePlan(roleId,constraints):request('/roadmaps/full',{role_id:roleId,profile_id:profileId,constraints}),
  adopt: async(plan:Plan):Promise<Plan>=>isDemo?{...plan,adopted:true}:request(`/roadmaps/${plan.id}/adopt`,{version:plan.version}),
  organization: async(org:Organization,actor:'hr'|'tvet'):Promise<Organization>=>isDemo?{...structuredClone(org),analyzedRevision:org.revision}:request('/organizations/analyze',{actor_type:actor,organization:org}),
  task: async(plan:Plan,taskId:string,evidence:string):Promise<void>=> {if(!isDemo) await request(`/roadmaps/${plan.id}/tasks/${taskId}`,{completed:true,evidence},'PATCH');},
};
