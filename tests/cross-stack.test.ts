import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import {emptyProfile,roles} from '../src/data.ts';
import {handleProxy} from '../server/proxy.ts';
import {
  applyBubbleSizes,mapRecommendations,mapTrendRoles,mergeNormalizedProfile,
  profileToConfirmRequest,profileToNormalizeRequest,
} from '../src/services/api-contract.ts';

const base=(process.env.CROSS_STACK_API_URL??'http://127.0.0.1:8000').replace(/\/$/,'');
type TaskImpact = { task_id:string; title:string; impact_type:string; reason:string; evidence_ids:string[]; uncertainty:string };

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
  const contractRoleId=`role_${first.roleId.replace(/-/g,'_')}`;
  const detail=await envelope<{role_id:string;required_skills:unknown[];evidence_ids:string[]}>(`/roles/${contractRoleId}`);
  assert.equal(detail.data.role_id,contractRoleId);
  assert.ok(detail.data.required_skills.length>0);
  const taskData=await envelope<{role_id:string;tasks:TaskImpact[]}>(`/roles/${contractRoleId}/tasks${trends.meta.snapshot_id?`?snapshot_id=${encodeURIComponent(trends.meta.snapshot_id)}`:''}`);
  assert.equal(taskData.data.role_id,contractRoleId);
  assert.ok(taskData.data.tasks.length>0);
  assert.ok(taskData.data.tasks.every(task=>task.title&&task.reason&&task.uncertainty&&['automation_candidate','ai_augmented','human_led_oversight'].includes(task.impact_type)));
  for(const id of taskData.data.tasks.flatMap(task=>task.evidence_ids)){
    const source=await envelope<{evidence:{evidence_id:string;title:string}}>(`/evidence/${id}`);
    assert.equal(source.data.evidence.evidence_id,id);
  }
  for(const id of first.evidenceIds??[]){
    const source=await envelope<{evidence:{evidence_id:string;title:string}}>(`/evidence/${id}`);
    assert.equal(source.data.evidence.evidence_id,id);
    assert.ok(source.data.evidence.title);
  }
});

function fictionalCv(kind: 'pdf' | 'docx'): Buffer {
  const script = [
    'import io, sys, fitz',
    'from docx import Document',
    'text = "Fictional synthetic CV. Python and SQL analytics."',
    'if sys.argv[1] == "pdf":',
    '    document = fitz.open(); page = document.new_page(); page.insert_text((72, 72), text)',
    '    sys.stdout.buffer.write(document.tobytes()); document.close()',
    'else:',
    '    document = Document(); document.add_paragraph(text); output = io.BytesIO()',
    '    document.save(output); sys.stdout.buffer.write(output.getvalue())',
  ].join('\n');
  return execFileSync(process.env.CROSS_STACK_PYTHON || 'python', ['-c', script, kind]);
}

test('protected frontend proxy uploads fictional PDF/DOCX to live backend before confirmation', async () => {
  const backendOrigin = 'https://syncera-backend-git-integration-postgres-pre-test-frank219wan.vercel.app';
  const frontendOrigin = 'https://syncera-frontend-git-integration-postgres-test-frank219wan.vercel.app';
  const environment = {
    VERCEL_ENV: 'preview', BACKEND_PREVIEW_ORIGIN: backendOrigin,
    BACKEND_PROTECTION_BYPASS_SECRET: 'test-secret-never-deployed',
  };
  for (const kind of ['pdf', 'docx'] as const) {
    const bytes = fictionalCv(kind);
    const form = new FormData();
    const type = kind === 'pdf' ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    form.append('file', new Blob([bytes], { type }), `fictional.${kind}`);
    form.append('synthetic_input', 'true');
    form.append('study_constraints', JSON.stringify(profileToNormalizeRequest(emptyProfile).study_constraints));
    const request = new Request(`${frontendOrigin}/api/proxy?proxy_path=profiles%2Fupload`, {
      method: 'POST', headers: { Origin: frontendOrigin }, body: form,
    });
    const uploaded = await handleProxy(request, environment, async (_url, init) =>
      fetch(`${base}/api/v1/profiles/upload`, init));
    const payload = await uploaded.json();
    assert.equal(uploaded.status, 200, JSON.stringify(payload));
    assert.equal(payload.data.profile.reviewed_by_user, false);
    const draft = mergeNormalizedProfile(payload.data.profile, emptyProfile);
    assert.ok(draft.skills.length > 0);
    assert.ok(draft.skills.every(skill => !skill.confirmed));
    const blocked = await fetch(`${base}/api/v1/recommendations`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ profile_id: draft.id, ai_scenario: 'moderate' }),
    });
    assert.equal(blocked.status, 422);
    assert.equal((await blocked.json()).error.code, 'PROFILE_NOT_CONFIRMED');
    const reviewed = { ...draft, skills: draft.skills.map(skill => ({ ...skill, level: 'intermediate', confirmed: true })) };
    const confirmed = await envelope<{ profile: Parameters<typeof mergeNormalizedProfile>[0] }>('/profiles/confirm', profileToConfirmRequest(reviewed));
    const ready = mergeNormalizedProfile(confirmed.data.profile, reviewed);
    assert.ok(ready.skills.every(skill => skill.confirmed));
    const recommended = await envelope<{ recommendations: Parameters<typeof mapRecommendations>[0] }>('/recommendations', {
      profile_id: ready.id, region: 'MY', ai_scenario: 'moderate', top_k: 5,
    });
    assert.ok(mapRecommendations(recommended.data.recommendations).length > 0);
  }
});
