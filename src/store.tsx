import {createContext,useContext,useEffect,useState,type ReactNode} from 'react';
import type {AppState,Copy,Locale} from './types';
import {emptyProfile,hrSample,tvetSample} from './data';
const initial:AppState={locale:'en',profile:emptyProfile,scenario:'moderate',selectedRole:'',results:null,snapshotId:'',serviceMeta:null,plan:null,hr:hrSample,tvet:tvetSample};
function read():AppState {
  try {
    const saved=JSON.parse(localStorage.getItem('futureproof-v1')||'null');
    if(saved?.schema!==1)return structuredClone(initial);
    const state={...initial,...saved.state};
    const savedHr=saved.state?.hr||{};
    const people=Array.isArray(savedHr.people)?savedHr.people:initial.hr.people;
    const sampleWorkspace=savedHr.name===hrSample.name;
    const legacyNames=[...new Set(people.map((person:{department?:string})=>person.department?.trim()).filter((name:string|undefined):name is string=>Boolean(name)))];
    const departments=Array.isArray(savedHr.departments)?savedHr.departments.map((department:{id:string;name:string;responsibilities?:string;currentStatus?:string;challenges?:string;goals?:string[];headcount?:number})=>{
      const sampleDepartment=sampleWorkspace?hrSample.departments?.find(d=>d.name===department.name):undefined;
      return sampleDepartment?{...sampleDepartment,...department,responsibilities:department.responsibilities||sampleDepartment.responsibilities,currentStatus:department.currentStatus||sampleDepartment.currentStatus,challenges:department.challenges||sampleDepartment.challenges,goals:department.goals?.length?department.goals:sampleDepartment.goals,headcount:department.headcount??sampleDepartment.headcount}:department;
    }):legacyNames.map((name,index)=>{
      const sampleDepartment=sampleWorkspace?hrSample.departments?.find(d=>d.name===name):undefined;
      return sampleDepartment?structuredClone(sampleDepartment):{id:`migrated-dept-${index+1}`,name,responsibilities:'',currentStatus:'',challenges:'',goals:[],headcount:people.filter((person:{department?:string})=>person.department?.trim()===name).length};
    });
    return {...state,hr:{...initial.hr,...savedHr,people,departments,goals:Array.isArray(savedHr.goals)&&(savedHr.goals.length>0||!sampleWorkspace)?savedHr.goals:(sampleWorkspace?hrSample.goals||[]:[])}};
  }
  catch {return structuredClone(initial);}
}
type Store={state:AppState;setState:React.Dispatch<React.SetStateAction<AppState>>;t:(en:string,zh:string,ms:string)=>string;copy:(copy:Copy)=>string;toast:(message:string)=>void};
const Context=createContext<Store>(null!);
export function Provider({children}:{children:ReactNode}) {
  const [state,setState]=useState(read); const [notice,setNotice]=useState('');
  useEffect(()=>{try{localStorage.setItem('futureproof-v1',JSON.stringify({schema:1,state}));}catch{setNotice('Browser storage is unavailable. Keep this tab open to preserve your work.');}document.documentElement.lang=state.locale==='zh'?'zh-CN':state.locale;},[state]);
  useEffect(()=>{if(notice){const timer=setTimeout(()=>setNotice(''),4500);return()=>clearTimeout(timer);}},[notice]);
  const idx=({en:0,zh:1,ms:2} as Record<Locale,number>)[state.locale];
  return <Context.Provider value={{state,setState,t:(...v)=>v[idx],copy:v=>v[idx],toast:setNotice}}>{children}{notice&&<div className="toast" role="status">{notice}</div>}</Context.Provider>;
}
export const useApp=()=>useContext(Context);
