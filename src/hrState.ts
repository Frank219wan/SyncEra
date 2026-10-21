import {emptyHr,hrSample} from './data.ts';
import type {Organization} from './types.ts';

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
  return {hr:{...emptyHr,...previous,people,departments,goals},hrProfileSaved:true};
}
