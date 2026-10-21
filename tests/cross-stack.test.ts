import test from 'node:test';
import assert from 'node:assert/strict';
import {emptyProfile,roles} from '../src/data.ts';
import {
  applyBubbleSizes,mapRecommendations,mapTrendRoles,mergeNormalizedProfile,
  profileToConfirmRequest,profileToNormalizeRequest,
} from '../src/services/api-contract.ts';

const base=(process.env.CROSS_STACK_API_URL??'http://127.0.0.1:8000').replace(/\/$/,'');

async function envelope<T>(path:string,body?:unknown):Promise<{data:T;meta:{snapshot_id:string|null;is_mock:boolean}}>{
  const response=await fetch(`${base}/api/v1${path}`,body===undefined?undefined:{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
  const payload=await response.json();
  assert.equal(response.status,200,`${path}: ${JSON.stringify(payload)}`);
  assert.ok(payload.data&&payload.meta,`${path}: missing response envelope`);
  return payload;
}

test('frontend contract maps a live backend profile, snapshot, recommendation, and evidence',async()=>{
  const health=await envelope<{status:string}>('/health');
  assert.equal(health.data.status,'ok');

  const input={...emptyProfile,occupation:'Synthetic analyst',interests:'analytics',skills:[{id:'sql',level:'intermediate',source:'manual' as const,confirmed:true}]};
  const normalized=await envelope<{profile:Parameters<typeof mergeNormalizedProfile>[0]}>('/profiles/normalize',profileToNormalizeRequest(input));
  const profile=mergeNormalizedProfile(normalized.data.profile,input);
  const confirmed=await envelope<{profile:Parameters<typeof mergeNormalizedProfile>[0]}>('/profiles/confirm',profileToConfirmRequest(profile));
  const ready=mergeNormalizedProfile(confirmed.data.profile,profile);
  assert.ok(ready.skills.every(skill=>skill.confirmed));

  const trends=await envelope<{items:Parameters<typeof mapTrendRoles>[0]}>('/trends/roles?region=MY&limit=50');
  assert.ok(trends.meta.snapshot_id);
  const visible=mapTrendRoles(trends.data.items,roles);
  assert.ok(visible.length>0);
  const snapshot=encodeURIComponent(trends.meta.snapshot_id!);
  const bubbles=await envelope<Parameters<typeof applyBubbleSizes>[1]>(`/explore/bubbles?region=MY&snapshot_id=${snapshot}`);
  const skills=await envelope<{items:Array<{skill_id:string;signal_label:string;observed_metrics:{change_pp:number|null}}> }>(`/trends/skills?region=MY&snapshot_id=${snapshot}&limit=50`);
  assert.equal(bubbles.meta.snapshot_id,trends.meta.snapshot_id);
  assert.equal(skills.meta.snapshot_id,trends.meta.snapshot_id);
  assert.deepEqual(new Set(bubbles.data.roles.map(role=>role.role_id)),new Set(trends.data.items.map(role=>role.role_id)));
  assert.ok(applyBubbleSizes(visible,bubbles.data));
  assert.ok(skills.data.items.every(skill=>skill.signal_label==='current_snapshot'||skill.observed_metrics.change_pp!==null));

  const recommended=await envelope<{recommendations:Parameters<typeof mapRecommendations>[0]}>('/recommendations',{
    profile_id:ready.id,region:'MY',ai_scenario:'moderate',top_k:5,snapshot_id:trends.meta.snapshot_id,
  });
  assert.equal(recommended.meta.snapshot_id,trends.meta.snapshot_id);
  const cards=mapRecommendations(recommended.data.recommendations);
  assert.ok(cards.length>0);
  assert.ok(cards.every(card=>card.origin==='computed'&&card.matchScore!==null&&card.reason&&card.evidenceIds));

  const first=cards[0];
  const detail=await envelope<{role_id:string;required_skills:unknown[];evidence_ids:string[]}>(`/roles/role_${first.roleId.replace(/-/g,'_')}`);
  assert.equal(detail.data.role_id,`role_${first.roleId.replace(/-/g,'_')}`);
  assert.ok(detail.data.required_skills.length>0);
  for(const id of first.evidenceIds??[]){
    const source=await envelope<{evidence:{evidence_id:string;title:string}}>(`/evidence/${id}`);
    assert.equal(source.data.evidence.evidence_id,id);
    assert.ok(source.data.evidence.title);
  }
});
