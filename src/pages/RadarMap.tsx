import {useEffect,useMemo,useRef,useState,type CSSProperties} from 'react';
import {useApp} from '../store';
import {layoutRadar} from '../radarLayout';
import type {Role} from '../types';

function industryName(id:string,t:ReturnType<typeof useApp>['t']){
  if(id==='technology')return t('Technology','科技','Teknologi');
  if(id==='green')return t('Green economy','绿色经济','Ekonomi hijau');
  if(id==='business')return t('Business','商业','Perniagaan');
  if(id==='education')return t('Education','教育','Pendidikan');
  return id;
}

export function RadarMap({roles,onRole,focusedDomain,onFocus}:{roles:Role[];onRole:(role:Role)=>void;focusedDomain:string|null;onFocus:(domain:string|null)=>void}){
  const {t,copy}=useApp();
  const mapRef=useRef<HTMLDivElement>(null);
  const [size,setSize]=useState({width:920,height:440});
  const [reducedMotion,setReducedMotion]=useState(()=>window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  useEffect(()=>{
    const element=mapRef.current;if(!element)return;
    const measure=()=>setSize({width:element.clientWidth||920,height:element.clientHeight||440});
    measure();
    const observer=new ResizeObserver(measure);observer.observe(element);
    return()=>observer.disconnect();
  },[]);
  useEffect(()=>{
    const media=window.matchMedia('(prefers-reduced-motion: reduce)');
    const update=()=>setReducedMotion(media.matches);
    media.addEventListener('change',update);
    return()=>media.removeEventListener('change',update);
  },[]);
  const activeFocus=focusedDomain&&roles.some(role=>role.domain===focusedDomain)?focusedDomain:null;
  const groups=useMemo(()=>layoutRadar(roles,size.width,size.height,activeFocus),[roles,size.width,size.height,activeFocus]);
  const movement=reducedMotion?'none':'left .32s ease, top .32s ease, width .32s ease, height .32s ease';
  return <div className="bubble-map" ref={mapRef} aria-label={t('Career industry map','职业行业图谱','Peta industri kerjaya')}>
    {activeFocus&&<button type="button" className="button secondary" style={{position:'absolute',left:12,top:10,zIndex:4}} onClick={()=>onFocus(null)}>{t('Back to All Industries','返回全部行业','Kembali ke semua industri')}</button>}
    {groups.map(group=><div key={group.domain}>
      <button type="button" className={`domain-orbit orbit-${group.domain}`} aria-label={`${industryName(group.domain,t)} · ${t('focus industry','聚焦行业','fokus industri')}`} aria-pressed={activeFocus===group.domain} onClick={()=>onFocus(group.domain)} style={{left:group.x-group.radius,top:group.y-group.radius,right:'auto',bottom:'auto',width:group.radius*2,height:group.radius*2,zIndex:0,cursor:'pointer',transition:movement} as CSSProperties}><span style={{top:activeFocus===group.domain?-3:2,fontSize:Math.max(10,Math.min(18,group.radius/12))}}>{industryName(group.domain,t)}</span></button>
      {group.children.map(({role,x,y,radius})=>{const trend=role.trend==='rising'?['↑',t('Rising','上升','Meningkat')]:role.trend==='emerging'?['↗',t('Emerging','新兴','Baharu')]:['→',t('Stable','稳定','Stabil')];return <button type="button" key={role.id} className={`career-bubble bubble-${role.id} ${role.trend}`} aria-label={`${copy(role.name)} ${trend[1]}`} style={{left:x-radius,top:y-radius,right:'auto',bottom:'auto',width:radius*2,height:radius*2,padding:Math.min(13,radius/5),zIndex:1,transition:movement,overflow:'hidden'} as CSSProperties} onClick={()=>onRole(role)}><span style={{fontSize:Math.max(9,Math.min(17,radius/4.5)),lineHeight:1.16,maxWidth:'100%',overflowWrap:'anywhere'}}>{copy(role.name)}</span><small style={{fontSize:Math.max(8,Math.min(11,radius/5.5)),lineHeight:1.1,marginTop:Math.min(5,radius/12)}}><b aria-hidden="true">{trend[0]}</b> {trend[1]}</small></button>})}
    </div>)}
    <span className="map-caption">{activeFocus?t('Select a career or return to all industries','选择职业，或返回全部行业','Pilih kerjaya atau kembali ke semua industri'):t('Select an industry to focus','点击行业，查看其中职业','Pilih industri untuk fokus')}</span>
  </div>;
}
