import type {Role,SkillTrend} from './types.ts';

export function demoSkillCoverage(roles:Role[]):Array<[string,number]> {
  const counts=new Map<string,number>();
  for(const role of roles)for(const id of new Set(role.skills))counts.set(id,(counts.get(id)||0)+1);
  return [...counts].sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0]));
}

export function skillMovement(skill:Pick<SkillTrend,'label'|'change'>):'rising'|'declining'|'stable'|null {
  if(skill.change===null||!Number.isFinite(skill.change))return null;
  if(skill.label==='rising'&&skill.change>0)return 'rising';
  if(skill.label==='declining'&&skill.change<0)return 'declining';
  if(skill.label==='stable'&&skill.change===0)return 'stable';
  return null;
}
