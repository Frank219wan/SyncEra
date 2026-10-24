import {useCallback,useEffect,useLayoutEffect,useRef,useState,type CSSProperties} from 'react';
import {useLocation} from 'react-router-dom';
import {useApp} from './store';
import {PAGE_TRANSITION_MS,workspaceTransitionScene,type LoadingScene} from './loading';
import './loading.css';

function BambooArt(){
  return <svg className="growth-drawing" viewBox="0 0 320 270" role="img" aria-label="Bamboo shoot growing into a grove">
    <path className="growth-ground" d="M29 244 Q78 238 119 245 Q166 250 211 244 Q260 238 291 245"/>
    <path className="growth-root" d="M159 241 q-17 14-42 15 m42-15 q18 15 43 15 m-43-15 q-5 13-3 22"/>
    <path className="growth-shoot" d="M149 241 Q150 222 159 212 Q169 225 169 241 Z"/>
    <path className="growth-stem stem-one" pathLength="1" d="M105 240 Q108 190 105 145 Q102 93 108 51"/>
    <path className="growth-stem stem-two" pathLength="1" d="M158 241 Q154 196 159 146 Q161 88 158 21"/>
    <path className="growth-stem stem-three" pathLength="1" d="M213 240 Q209 188 214 141 Q218 94 211 57"/>
    <g className="growth-nodes"><path d="M96 184 q9 4 19 0 M99 133 q9 4 17 0 M149 192 q10 4 20-1 M150 136 q9 4 19-1 M202 183 q11 4 21-1 M204 134 q10 4 20-1"/></g>
    <g className="growth-leaves leaf-one"><path d="M105 148 Q68 136 47 116 Q86 115 105 148 Z M107 145 Q127 113 146 104 Q138 136 107 145 Z M159 117 Q125 97 108 78 Q141 79 159 117 Z"/></g>
    <g className="growth-leaves leaf-two"><path d="M159 82 Q125 52 113 35 Q143 42 159 82 Z M160 80 Q183 49 211 39 Q199 67 160 80 Z M210 150 Q229 119 260 110 Q246 138 210 150 Z"/></g>
    <g className="growth-leaves leaf-three"><path d="M211 101 Q180 77 169 60 Q199 65 211 101 Z M212 99 Q238 72 271 66 Q256 88 212 99 Z M106 89 Q79 62 58 54 Q72 83 106 89 Z"/></g>
    <path className="growth-ink-detail" d="M154 238 q-2-11 5-19 m-53-39 q5 2 9 0 m94-47 q6 3 13 0"/>
  </svg>;
}

function IvyArt(){
  return <svg className="growth-drawing" viewBox="0 0 320 270" role="img" aria-label="Ivy seedling climbing into a leafy vine">
    <path className="growth-trellis" d="M77 24 V238 M157 24 V238 M238 24 V238 M44 70 H273 M44 140 H273 M44 211 H273"/>
    <path className="growth-ground" d="M28 244 Q100 239 157 244 Q221 249 292 242"/>
    <path className="growth-root" d="M157 242 q-15 12-40 15 m40-15 q15 13 34 17"/>
    <path className="growth-shoot" d="M148 242 Q151 224 158 217 Q166 225 168 242 Z"/>
    <path className="growth-stem ivy-main" pathLength="1" d="M157 239 C143 213 187 204 175 179 C157 150 106 158 112 129 C118 101 200 115 206 82 C210 55 155 51 160 27"/>
    <path className="growth-stem ivy-branch" pathLength="1" d="M174 178 Q209 171 225 139 M112 130 Q79 114 68 90 M205 83 Q230 75 247 48"/>
    <g className="growth-leaves leaf-one"><path d="M159 218 Q133 207 133 186 L145 195 L151 184 L164 202 L178 190 Q178 213 159 218 Z M177 180 Q193 151 211 153 L203 165 L217 173 L193 180 L188 190 Z"/></g>
    <g className="growth-leaves leaf-two"><path d="M116 135 Q88 143 74 126 L88 123 L85 107 L103 116 L111 104 Q123 120 116 135 Z M204 113 Q216 91 238 100 L226 108 L233 119 L216 116 L207 128 Z"/></g>
    <g className="growth-leaves leaf-three"><path d="M205 84 Q182 72 178 52 L191 62 L199 49 L207 67 L222 57 Q222 78 205 84 Z M159 45 Q137 37 128 18 L143 26 L151 16 L162 31 L177 20 Q175 42 159 45 Z M243 52 Q244 27 267 22 L257 35 L271 42 L253 44 L250 59 Z"/></g>
    <path className="growth-ink-detail" d="M157 231 q-4-12 2-21 m16-29 q9-5 17-8 m14-89 q-6-4-12-5"/>
  </svg>;
}

function Screen({scene}:{scene:LoadingScene}){
  const {t}=useApp();
  const title=scene==='bamboo'?t('A little growth begins here','从一株竹笋，长出新的方向','Pertumbuhan bermula di sini')
    :scene==='ivy'?t('Growing together, finding a way','顺势生长，连接团队','Berkembang bersama, mencari arah')
    :t('Two paths, one place to begin','竹林与爬山虎，在这里相遇','Dua arah, satu permulaan');
  const description=scene==='bamboo'?t('Opening your personal space','正在打开个人空间','Membuka ruang peribadi')
    :scene==='ivy'?t('Opening your organization space','正在打开机构空间','Membuka ruang organisasi')
    :t('Returning to workspace selection','正在返回空间选择','Kembali ke pilihan ruang');
  return <div className={`growth-loading growth-loading--${scene}`} role="status" aria-live="polite" aria-label={description}>
    <div className="growth-paper">
      <div className="growth-art" aria-hidden="true">{scene==='home'?<><BambooArt/><IvyArt/></>:scene==='bamboo'?<BambooArt/>:<IvyArt/>}</div>
      <p className="growth-loading-kicker">SKILLOGY <span>✦</span> GROW WITH PURPOSE</p>
      <h2>{title}</h2>
      <p className="growth-loading-description">{description}</p>
      <div className="pixel-track" aria-hidden="true">{Array.from({length:16},(_,i)=><span key={i} style={{'--pixel-index':i} as CSSProperties}/>)}</div>
      <p className="growth-loading-note">{t('Every step takes root.','每一步，都有根可循。','Setiap langkah berakar.')}</p>
    </div>
  </div>;
}

function TimedScreen({id,scene,onDone}:{id:number;scene:LoadingScene;onDone:(id:number)=>void}){
  useLayoutEffect(()=>{
    const view=document.getElementById('site-routes');
    const previousOverflow=document.body.style.overflow;
    view?.setAttribute('inert','');
    document.body.style.overflow='hidden';
    return()=>{view?.removeAttribute('inert');document.body.style.overflow=previousOverflow;};
  },[]);
  useEffect(()=>{
    const reduced=window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const timer=window.setTimeout(()=>onDone(id),reduced?180:PAGE_TRANSITION_MS);
    return()=>window.clearTimeout(timer);
  },[id,onDone]);
  return <Screen scene={scene}/>;
}

export function RouteLoadingScreen(){
  const {pathname}=useLocation();
  const previousPath=useRef(pathname);
  const nextId=useRef(0);
  const [active,setActive]=useState<{id:number;scene:LoadingScene}|null>(()=>{
    const scene=workspaceTransitionScene(null,pathname);
    return scene?{id:0,scene}:null;
  });
  useLayoutEffect(()=>{
    if(previousPath.current===pathname)return;
    const scene=workspaceTransitionScene(previousPath.current,pathname);
    previousPath.current=pathname;
    setActive(scene?{id:++nextId.current,scene}:null);
  },[pathname]);
  const complete=useCallback((id:number)=>setActive(current=>current?.id===id?null:current),[]);
  return active?<TimedScreen key={active.id} id={active.id} scene={active.scene} onDone={complete}/>:null;
}
