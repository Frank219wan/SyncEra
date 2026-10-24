import {createContext,useCallback,useContext,useEffect,useLayoutEffect,useRef,useState,type ReactNode} from 'react';
import type {AppState,Copy,HrRequestIdentity,Locale,Organization} from './types';
import {emptyProfile,emptyHr,tvetSample} from './data';
import {restoreHr} from './hrState';
import {resetIndividualState,STORAGE_KEY} from './individual-state';
import {HR_STORAGE_KEY,readCanonicalHr,TabPersistence,type HrEditStatus} from './multitabPersistence';
const initial:AppState={locale:'en',profile:emptyProfile,scenario:'moderate',selectedRole:'',results:null,snapshotId:'',serviceMeta:null,plan:null,hr:emptyHr,hrProfileSaved:false,tvet:tvetSample};
const hrStatusMessages:Record<Exclude<HrEditStatus,'active'>,Copy>={
  checking:['Checking this workspace for another editor.','正在检查是否有其他标签页编辑此工作区。','Menyemak sama ada tab lain sedang menyunting ruang kerja ini.'],
  blocked:['Another tab is editing this HR workspace. This tab is read-only until that tab closes.','另一标签页正在编辑此 HR 工作区；关闭该标签页前，此处为只读。','Tab lain sedang menyunting ruang HR ini. Tab ini hanya baca sehingga tab itu ditutup.'],
  conflict:['This workspace changed in another tab. Your open draft remains here; review the latest revision before saving or analyzing.','另一标签页已修改工作区。当前草稿仍在；保存或分析前请核对最新版本。','Ruang kerja berubah di tab lain. Draf anda kekal; semak versi terkini sebelum menyimpan atau menganalisis.'],
  unsupported:['Safe cross-tab locking is unavailable. HR editing and analysis are disabled in this browser.','此浏览器不支持安全的跨标签页锁定，HR 编辑与分析已禁用。','Kunci selamat antara tab tidak tersedia. Suntingan dan analisis HR dinyahaktifkan.'],
};
function read():AppState {
  try {
    const saved=JSON.parse(localStorage.getItem(STORAGE_KEY)||'null');
    const canonical=readCanonicalHr(localStorage);
    if(saved?.schema!==1&&!canonical)return structuredClone(initial);
    const state={...initial,...(saved?.schema===1?saved.state:{})};
    return {...state,...restoreHr(canonical?.hr||saved?.state?.hr,canonical?.hrProfileSaved??saved?.state?.hrProfileSaved)};
  }
  catch {return structuredClone(initial);}
}
export type Theme='light'|'dark';
function readTheme():Theme {
  try{return localStorage.getItem('skillogy-theme')==='dark'?'dark':'light';}
  catch{return 'light';}
}
type Store={state:AppState;setState:React.Dispatch<React.SetStateAction<AppState>>;startNewProfile:()=>void;theme:Theme;setTheme:React.Dispatch<React.SetStateAction<Theme>>;t:(en:string,zh:string,ms:string)=>string;copy:(copy:Copy)=>string;toast:(message:string)=>void;hrEditStatus:HrEditStatus;retryHrEditor:()=>void;acceptLatestHr:()=>void;reserveHrRequest:(request:HrRequestIdentity)=>Promise<boolean>;saveHrWorkspace:(hr:Organization)=>Promise<boolean>};
const Context=createContext<Store>(null!);
export function Provider({children}:{children:ReactNode}) {
  const [state,rawSetState]=useState(read); const [notice,setNotice]=useState('');
  const [hrEditStatus,setHrEditStatus]=useState<HrEditStatus>('checking');
  const coordinator=useRef<TabPersistence|null>(null);
  const stateRef=useRef(state);stateRef.current=state;
  const [theme,setTheme]=useState<Theme>(readTheme);
  const setState=useCallback<React.Dispatch<React.SetStateAction<AppState>>>(change=>{
    rawSetState(current=>{
      const next=typeof change==='function'?change(current):change;
      if(next.hr!==current.hr&&coordinator.current?.status!=='active')
        return {...next,hr:current.hr,hrProfileSaved:current.hrProfileSaved};
      return next;
    });
  },[]);
  useEffect(()=>{
    setHrEditStatus('checking');
    const locks=typeof navigator!=='undefined'?navigator.locks:undefined;
    const instance=new TabPersistence(stateRef.current,localStorage,locks,(status)=>setHrEditStatus(status));
    coordinator.current=instance;
    instance.start();
    const onStorage=(event:StorageEvent)=>{if(event.key===HR_STORAGE_KEY)instance.externalChange();};
    window.addEventListener('storage',onStorage);
    return()=>{window.removeEventListener('storage',onStorage);instance.close();if(coordinator.current===instance)coordinator.current=null;};
  },[]);
  useLayoutEffect(()=>{
    document.documentElement.dataset.theme=theme;
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content',theme==='dark'?'#111c18':'#e8efe5');
    try{localStorage.setItem('skillogy-theme',theme);}catch{/* Theme remains usable for this tab. */}
  },[theme]);
  useEffect(()=>{
    if(hrEditStatus!=='checking'){
      void coordinator.current?.persist(state).catch(()=>setNotice('Browser storage is unavailable. Keep this tab open to preserve your work.'));
    }
    document.documentElement.lang=state.locale==='zh'?'zh-CN':state.locale;
  },[state,hrEditStatus]);
  useEffect(()=>{if(notice){const timer=setTimeout(()=>setNotice(''),4500);return()=>clearTimeout(timer);}},[notice]);
  const idx=({en:0,zh:1,ms:2} as Record<Locale,number>)[state.locale];
  const startNewProfile=()=>{
    const fresh=resetIndividualState(state);
    setState(fresh);
  };
  const acceptLatestHr=()=>{
    const instance=coordinator.current;
    const latest=instance?.acceptLatest();
    if(!latest){instance?.retryEditor();return;}
    if(latest)rawSetState(current=>({...current,...restoreHr(latest.hr,latest.hrProfileSaved)}));
  };
  const reserveHrRequest=(request:HrRequestIdentity)=>coordinator.current?.reserveHrRequest(request,stateRef.current)??Promise.resolve(false);
  const saveHrWorkspace=async(hr:Organization)=>{
    const instance=coordinator.current;
    if(!instance||instance.status!=='active')return false;
    try {
      const saved=await instance.persist({...stateRef.current,hr,hrProfileSaved:true});
      if(instance.status!=='active'||saved.hr.clientWorkspaceId!==hr.clientWorkspaceId||saved.hr.revision!==hr.revision)return false;
      rawSetState(current=>({...current,hr:saved.hr,hrProfileSaved:true}));
      return true;
    }catch {setNotice('Browser storage is unavailable. Keep this tab open to preserve your work.');return false;}
  };
  return <Context.Provider value={{state,setState,startNewProfile,theme,setTheme,t:(...v)=>v[idx],copy:v=>v[idx],toast:setNotice,
    hrEditStatus,retryHrEditor:()=>coordinator.current?.retryEditor(),acceptLatestHr,reserveHrRequest,saveHrWorkspace}}>{children}
    {hrEditStatus!=='active'&&window.location.pathname.startsWith('/organization/hr')&&<div className="toast" role="alert">
      {hrStatusMessages[hrEditStatus][idx]}
      {hrEditStatus==='blocked'&&<button type="button" onClick={()=>coordinator.current?.retryEditor()}>{(['Try again','重试','Cuba lagi'] as Copy)[idx]}</button>}
      {hrEditStatus==='conflict'&&<button type="button" onClick={acceptLatestHr}>{(['Review latest workspace','核对最新工作区','Semak ruang kerja terkini'] as Copy)[idx]}</button>}
    </div>}{notice&&<div className="toast" role="status">{notice}</div>}</Context.Provider>;
}
export const useApp=()=>useContext(Context);
