import type {Recommendation,Scenario} from '../types';

/** A recommendation is personal to one confirmed profile revision and scenario. */
export function roleDetailContext(roleId:string|undefined,profileId:string,revision:number,snapshotId:string,scenario:Scenario):string {
  return JSON.stringify([roleId,profileId,revision,snapshotId,scenario]);
}

export function currentRoleRecommendation(
  rows:Recommendation[]|null, loadedContext:string, currentContext:string, roleId:string|undefined,
):Recommendation|null {
  if(!roleId||loadedContext!==currentContext)return null;
  return rows?.find(row=>row.roleId===roleId&&row.origin==='computed')??null;
}

/** A real roadmap must never borrow the name of an unrelated demo catalogue role. */
export function roadmapRoleName(roleId:string,rows:Recommendation[]|null):string {
  return rows?.find(row=>row.roleId===roleId&&row.origin==='computed')?.roleName??roleId;
}
