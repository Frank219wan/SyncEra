import {createContext,useContext,useEffect,useLayoutEffect,useState,type ReactNode} from 'react';
import type {AppState,Copy,Locale} from './types';
import {emptyProfile,emptyHr,tvetSample} from './data';
import {restoreHr} from './hrState';
const initial:AppState={locale:'en',profile:emptyProfile,scenario:'moderate',selectedRole:'',results:null,snapshotId:'',serviceMeta:null,plan:null,hr:emptyHr,hrProfileSaved:false,tvet:tvetSample};
function read():AppState {
  try {
    const saved=JSON.parse(localStorage.getItem('futureproof-v1')||'null');
    if(saved?.schema!==1)return structuredClone(initial);
    const state={...initial,...saved.state};
    return {...state,...restoreHr(saved.state?.hr,saved.state?.hrProfileSaved)};
  }
  catch {return structuredClone(initial);}
}
export type Theme='light'|'dark';
function readTheme():Theme {
  try{return localStorage.getItem('skillogy-theme')==='dark'?'dark':'light';}
  catch{return 'light';}
}
type Store={state:AppState;setState:React.Dispatch<React.SetStateAction<AppState>>;theme:Theme;setTheme:React.Dispatch<React.SetStateAction<Theme>>;t:(en:string,zh:string,ms:string)=>string;copy:(copy:Copy)=>string;toast:(message:string)=>void};
const Context=createContext<Store>(null!);
export function Provider({children}:{children:ReactNode}) {
  const [state,setState]=useState(read); const [notice,setNotice]=useState('');
  const [theme,setTheme]=useState<Theme>(readTheme);
  useLayoutEffect(()=>{
    document.documentElement.dataset.theme=theme;
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content',theme==='dark'?'#111c18':'#e8efe5');
    try{localStorage.setItem('skillogy-theme',theme);}catch{/* Theme remains usable for this tab. */}
  },[theme]);
  useEffect(()=>{try{localStorage.setItem('futureproof-v1',JSON.stringify({schema:1,state}));}catch{setNotice('Browser storage is unavailable. Keep this tab open to preserve your work.');}document.documentElement.lang=state.locale==='zh'?'zh-CN':state.locale;},[state]);
  useEffect(()=>{if(notice){const timer=setTimeout(()=>setNotice(''),4500);return()=>clearTimeout(timer);}},[notice]);
  const idx=({en:0,zh:1,ms:2} as Record<Locale,number>)[state.locale];
  return <Context.Provider value={{state,setState,theme,setTheme,t:(...v)=>v[idx],copy:v=>v[idx],toast:setNotice}}>{children}{notice&&<div className="toast" role="status">{notice}</div>}</Context.Provider>;
}
export const useApp=()=>useContext(Context);
