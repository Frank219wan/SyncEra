import {createContext,useContext,useEffect,useState,type ReactNode} from 'react';
import type {AppState,Copy,Locale} from './types';
import {emptyProfile,emptyHr,tvetSample} from './data';
import {restoreHr} from './hrState';
const initial:AppState={locale:'en',profile:emptyProfile,scenario:'moderate',selectedRole:'',results:null,matchingSnapshotId:'',marketSnapshotId:'',serviceMeta:null,marketMeta:null,plan:null,hr:emptyHr,hrProfileSaved:false,tvet:tvetSample};
function read():AppState {
  try {
    const saved=JSON.parse(localStorage.getItem('futureproof-v1')||'null');
    if(saved?.schema!==1)return structuredClone(initial);
    const state={...initial,...saved.state};
    // The former shared snapshotId could hold a DOSM ID after visiting Radar.
    // Migrate only an ID already tied to the saved tech-v1 trend package.
    if(typeof saved.state?.snapshotId==='string'){
      if(saved.state.snapshotId.startsWith('dosm-')){
        state.marketSnapshotId=saved.state.snapshotId;
        state.matchingSnapshotId=state.trendPackage?.snapshotId??'';
        state.serviceMeta=state.trendPackage?.meta??null;
      }else if(state.trendPackage?.snapshotId===saved.state.snapshotId){
        state.matchingSnapshotId=saved.state.snapshotId;
      }
    }
    delete (state as AppState & {snapshotId?:string}).snapshotId;
    return {...state,...restoreHr(saved.state?.hr,saved.state?.hrProfileSaved)};
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
