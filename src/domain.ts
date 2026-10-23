import type { Constraints, Organization, Person, Plan, Profile, Scenario, Task } from './types.ts';
import { roles } from './data.ts';
export function gapsFor(person: Pick<Person,'skills'|'target'|'known'>) {
  if (!person.known) return null;
  return (roles.find(r=>r.id===person.target)?.skills || []).filter(s=>!person.skills.includes(s));
}
export function cohortGaps(org: Organization) {
  const people = org.people.filter(p=>org.selected.includes(p.id));
  return Object.entries(people.reduce<Record<string,number>>((acc,p)=>{
    for (const s of new Set(gapsFor(p) || [])) acc[s]=(acc[s]||0)+1;
    return acc;
  },{})).sort((a,b)=>b[1]-a[1] || a[0].localeCompare(b[0]));
}
export function validatePeople(org: Organization, school=false) {
  const errors: string[]=[];
  if (!org.name.trim()) errors.push('name');
  if (school && !org.people.length) errors.push('people');
  const ids=org.people.map(p=>p.id.trim());
  if (new Set(ids).size!==ids.length || ids.some(id=>!id)) errors.push('id');
  if (org.people.some(p=>!p.department.trim())) errors.push('department');
  if (org.people.some(p=>p.hours<1 || p.hours>40 || !Number.isFinite(p.hours))) errors.push('hours');
  if (org.people.some(p=>p.known && !p.skills.length)) errors.push('skills');
  if (school && org.people.some(p=>!p.target || !p.courses.trim())) errors.push('target');
  if (!school) {
    const departments=org.departments||[];
    if (!departments.length) errors.push('departments');
    if (new Set(departments.map(d=>d.name.trim().toLowerCase())).size!==departments.length || departments.some(d=>!d.name.trim())) errors.push('departmentNames');
    if (departments.some(d=>!d.responsibilities.trim()||!d.currentStatus.trim()||!d.challenges.trim()||!Number.isFinite(d.headcount)||d.headcount<0)) errors.push('departmentDetails');
    if (org.people.some(p=>!departments.some(d=>d.name.trim().toLowerCase()===p.department.trim().toLowerCase()))) errors.push('department');
  }
  return errors;
}
export function parseCsv(text: string): string[][] {
  const rows:string[][]=[];let row:string[]=[],cell='',quoted=false;
  for(let i=0;i<text.length;i++){
    const char=text[i];
    if(char==='"'){if(quoted&&text[i+1]==='"'){cell+='"';i++;}else quoted=!quoted;}
    else if(char===','&&!quoted){row.push(cell.trim());cell='';}
    else if((char==='\n'||char==='\r')&&!quoted){if(char==='\r'&&text[i+1]==='\n')i++;row.push(cell.trim());if(row.some(Boolean))rows.push(row);row=[];cell='';}
    else cell+=char;
  }
  if(cell||row.length){row.push(cell.trim());if(row.some(Boolean))rows.push(row);}
  return rows;
}
export function makePlan(roleId: string, constraints: Constraints): Plan {
  const role=roles.find(r=>r.id===roleId)||roles[0];
  const phases = [
    ['Explore the foundations','了解基础概念','Teroka asas'],
    ['Practice with a small exercise','完成基础练习','Latihan kecil'],
    ['Apply the skill to a project','将技能应用于项目','Gunakan kemahiran dalam projek'],
    ['Review and explain your work','复盘并解释你的成果','Semak dan jelaskan hasil'],
    ['Complete a skill checkpoint','完成技能验收','Lengkapkan semakan kemahiran'],
  ] as const;
  const tasks: Task[]=Array.from({length:10},(_,i)=>({id:`task-${i+1}`,skill:role.skills[i%role.skills.length],title:phases[Math.floor(i/2)],hours:3,done:false,week:Math.floor(i*3/constraints.hours)+1}));
  return {id:`plan-${crypto.randomUUID()}`,roleId,version:1,adopted:false,constraints:{...constraints},tasks,earned:0,revisionPending:false,offset:0,history:[]};
}
export function completeTask(plan: Plan, id: string, evidence: string): Plan {
  if (!plan.adopted) return plan;
  const tasks=plan.tasks.map(t=>t.id===id&&!t.done?{...t,done:true,evidence,completedOffset:plan.offset,completedAt:new Date().toISOString()}:t);
  return {...plan,tasks,earned:Math.max(plan.earned,Math.floor(tasks.filter(t=>t.done).length/tasks.length*10))};
}
export function revisePlan(plan: Plan): Plan {
  return {...plan,version:plan.version+1,offset:plan.offset+1,revisionPending:false,
    history:[...plan.history,{version:plan.version,offset:plan.offset,at:new Date().toISOString()}]};
}
export function demoRecommendations(profile: Profile, scenario: Scenario) {
  void profile;
  return [...roles].sort((a,b)=>b.scores[scenario]-a.scores[scenario]).map((r,i)=>({roleId:r.id,rank:i+1,matchScore:null,origin:'synthetic_fixture' as const}));
}
export function defaultConstraints(): Constraints {
  return {hours:5,budget:0,language:'en',start:new Date().toLocaleDateString('en-CA'),deadline:'',baseline:''};
}
export function dueDate(plan: Plan, task: Task, revised=false) {
  const date=new Date(`${plan.constraints.start}T12:00:00`);
  date.setDate(date.getDate()+((task.week-1)+(task.done?(task.completedOffset??0):plan.offset)+(revised&&!task.done?1:0))*7);
  return date.toLocaleDateString('en-GB',{day:'numeric',month:'short'});
}
