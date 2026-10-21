import {useRef,useState} from 'react';
import {useNavigate} from 'react-router-dom';
import {useApp} from '../store';
import {roles,skillNames} from '../data';
import {PageHeader,DemoNotice,EmptyState,Modal,SkillChip,icons} from '../components';
import type {Role} from '../types';
import {RadarMap} from './RadarMap';

const {ArrowRight,Compass,Search,Info}=icons;
function domainName(id:string,t:ReturnType<typeof useApp>['t']){
  if(id==='technology')return t('Technology','科技','Teknologi');
  if(id==='green')return t('Green economy','绿色经济','Ekonomi hijau');
  if(id==='business')return t('Business','商业','Perniagaan');
  return t('Education','教育','Pendidikan');
}

export function Radar(){
  const {state,setState,t,copy}=useApp();
  const nav=useNavigate();
  const [domain,setDomain]=useState('all');
  const [search,setSearch]=useState('');
  const searchRef=useRef<HTMLInputElement>(null);
  const [role,setRole]=useState<Role|null>(null);
  const [view,setView]=useState<'map'|'list'>('map');
  const shown=roles.filter(item=>(domain==='all'||item.domain===domain)&&(copy(item.name).toLowerCase().includes(search.trim().toLowerCase())||domainName(item.domain,t).toLowerCase().includes(search.trim().toLowerCase())));
  const skillTotals=new Map<string,{total:number;up:boolean}>();
  for(const item of shown)for(const id of item.skills){const current=skillTotals.get(id)||{total:0,up:false};skillTotals.set(id,{total:current.total+item.signal,up:current.up||item.trend!=='stable'});}
  const skillPreview=[...skillTotals].map(([id,value])=>({id,...value})).sort((a,b)=>b.total-a.total||a.id.localeCompare(b.id));
  const maxSkillTotal=Math.max(1,...skillPreview.map(item=>item.total));
  function selectDomain(id:string,{focusSearch=true}={}){setDomain(id);setSearch(id==='all'?'':domainName(id,t));if(focusSearch)requestAnimationFrame(()=>{searchRef.current?.focus();searchRef.current?.select();});}
  function fit(){
    if(!role)return;
    setState(current=>({...current,selectedRole:role.id}));
    nav(state.results||state.profile.occupation&&state.profile.education?'/individual/recommendations':'/individual/intake');
  }
  return <><PageHeader title={t('Follow your curiosity.','跟随好奇，发现方向。','Ikuti rasa ingin tahu.')} description={t('Explore how careers and skills connect. Start anywhere that interests you.','探索职业与技能之间的联系，从感兴趣的地方开始。','Teroka hubungan kerjaya dan kemahiran. Mulakan dengan minat anda.')} action={<DemoNotice/>}/>
    <div className="toolbar"><div className="filter-tabs" role="group" aria-label={t('Career domains','职业领域','Bidang kerjaya')}>{['all','technology','green','business','education'].map(id=><button type="button" aria-pressed={domain===id} className={domain===id?'selected':''} key={id} onClick={()=>selectDomain(id)}>{id==='all'?t('All fields','全部领域','Semua bidang'):domainName(id,t)}</button>)}</div><label className="search-box"><Search size={17}/><input ref={searchRef} value={search} onChange={e=>setSearch(e.target.value)} placeholder={t('Find a career','搜索职业','Cari kerjaya')} aria-label={t('Find a career','搜索职业','Cari kerjaya')}/></label><div className="segmented"><button type="button" aria-pressed={view==='map'} className={view==='map'?'selected':''} onClick={()=>setView('map')}>{t('Map','图谱','Peta')}</button><button type="button" aria-pressed={view==='list'} className={view==='list'?'selected':''} onClick={()=>setView('list')}>{t('List','列表','Senarai')}</button></div></div>
    <section className="radar-surface surface">{!shown.length?<EmptyState title={t('No careers found','未找到相关职业','Tiada kerjaya ditemui')} description={t('Try a different term or field.','换个关键词或领域试试。','Cuba kata kunci atau bidang lain.')} action={<button className="button secondary" onClick={()=>selectDomain('all',{focusSearch:false})}>{t('Clear filters','清除筛选','Kosongkan penapis')}</button>}/>:view==='map'?<RadarMap roles={shown} focusedDomain={domain==='all'?null:domain} onFocus={id=>selectDomain(id||'all',{focusSearch:false})} onRole={setRole}/>:<div className="radar-list">{shown.map(item=><button className="radar-list-row" onClick={()=>setRole(item)} key={item.id}><Compass size={23}/><div><strong>{copy(item.name)}</strong><span>{domainName(item.domain,t)}</span></div><span>{item.signal} / 100</span><ArrowRight size={18}/></button>)}</div>}
      <div className="radar-legend"><span><i className="legend-dot rising"/>{t('Rising','上升','Meningkat')}</span><span><i className="legend-dot emerging"/>{t('Emerging','新兴','Baharu')}</span><span><i className="legend-dot stable"/>{t('Stable','稳定','Stabil')}</span><p>{t('Bubble size = illustrative trend signal strength, not job count.','泡泡大小 = 示例趋势信号强度，不代表招聘数量。','Saiz gelembung = kekuatan isyarat contoh, bukan jumlah pekerjaan.')}</p></div>
    </section>
    <section className="surface skill-trends"><div className="section-heading"><div><h2>{t('Skill trends','技能趋势','Trend kemahiran')}</h2><p className="muted">{t('Explore the skills connected to the careers shown above.','探索与上方职业相关的技能。','Teroka kemahiran yang berkaitan dengan kerjaya di atas.')}</p></div><span className="subtle-tag">{t('Synthetic preview','合成演示','Pratonton sintetik')}</span></div>
      {skillPreview.length?<ul className="skill-trend-grid">{skillPreview.map(item=>{const diameter=Math.round(94+66*item.total/maxSkillTotal);const label=skillNames[item.id]?copy(skillNames[item.id]):item.id;const direction=item.up?t('Rising in sample roles','样例职业中上升','Meningkat dalam contoh'):t('Stable in sample roles','样例职业中稳定','Stabil dalam contoh');return <li key={item.id} className={`skill-trend-bubble ${item.up?'up':'steady'}`} style={{width:diameter,height:diameter}} aria-label={`${label} · ${direction}`}><span>{label}</span><small><b aria-hidden="true">{item.up?'↑':'→'}</b> {item.up?t('Rising','上升','Meningkat'):t('Stable','稳定','Stabil')}</small></li>})}</ul>:<p className="muted">{t('No skills match the current career search.','当前职业搜索没有对应技能。','Tiada kemahiran sepadan dengan carian semasa.')}</p>}
      <p className="skill-trend-note">{t('Bubble size reflects how prominently a skill appears across these synthetic careers. Arrows follow their demo labels. Current market importance or a falling trend cannot be verified without dated market evidence.','泡泡大小表示技能在当前合成职业样例中的出现权重，箭头沿用样例趋势标签。缺少带日期的市场证据，暂不能判定真实市场重要性或下降趋势。','Saiz gelembung menunjukkan kekerapan kemahiran dalam kerjaya sintetik ini. Anak panah mengikut label demo. Kepentingan pasaran semasa atau trend menurun belum dapat disahkan tanpa bukti bertarikh.')}</p>
    </section>
    <section className="snapshot-bar"><div><strong>{t('Historical snapshots','历史快照','Gambaran sejarah')}</strong><p>{t('Insufficient historical data. Matching always uses the latest available package.','历史数据不足。个人匹配始终使用最新可用数据包。','Data sejarah tidak mencukupi. Padanan menggunakan pakej terkini.')}</p></div><input aria-label={t('Historical snapshot timeline','历史快照时间轴','Garis masa sejarah')} type="range" disabled min="0" max="1" value="1" readOnly/><span>{t('Demo v1','演示 v1','Demo v1')}</span></section>
    {role&&<Modal title={copy(role.name)} onClose={()=>setRole(null)}><span className="subtle-tag">{domainName(role.domain,t)}</span><p>{copy(role.description)}</p><h3>{t('Skills to explore','相关技能','Kemahiran berkaitan')}</h3><div className="skill-row">{role.skills.map(id=><SkillChip id={id} key={id}/>)}</div><div className="inline-note"><Info size={17}/><p>{t('Synthetic signal. No verified observation date, sample size, salary or employer data available. AI exposure is task-specific, not a prediction of job loss.','合成趋势信号。暂无已核实的观测日期、样本量、薪资或雇主数据。AI 影响针对工作任务，不是岗位消失预测。','Isyarat sintetik. Tarikh, sampel, gaji dan majikan belum disahkan. Pendedahan AI bukan ramalan kehilangan pekerjaan.')}</p></div><div className="sdg-row">{role.sdgs.map(id=><a key={id} href={`https://sdgs.un.org/goals/goal${id}`} target="_blank" rel="noreferrer">SDG {id}</a>)}</div><div className="form-actions"><button className="button" onClick={fit}>{t('Check my career fit','查看与我的匹配','Semak kesesuaian saya')}<ArrowRight size={16}/></button></div></Modal>}
  </>;
}
