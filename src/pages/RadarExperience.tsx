import {useRef,useState} from 'react';
import {useNavigate} from 'react-router-dom';
import {useApp} from '../store';
import {roles,skillNames} from '../data';
import {PageHeader,DemoNotice,EmptyState,Modal,SkillChip,icons} from '../components';
import type {Role,TrendPackage} from '../types';
import {RadarMap} from './RadarMap';
import {demoSkillCoverage,skillMovement} from '../trendSemantics';

const {ArrowRight,Compass,Search,Info}=icons;
function domainName(id:string,t:ReturnType<typeof useApp>['t']){
  if(id==='technology')return t('Technology','科技','Teknologi');
  if(id==='green')return t('Green economy','绿色经济','Ekonomi hijau');
  if(id==='business')return t('Business','商业','Perniagaan');
  if(id==='education')return t('Education','教育','Pendidikan');
  return id.replace(/^field_/,'');
}

function SkillSection({data,shown}:{data?:TrendPackage;shown:Role[]}){
  const {t,copy}=useApp();
  const demoSkills=data?[]:demoSkillCoverage(shown);
  const realSkills=data?.skills??[];
  const comparable=Boolean(data&&!data.meta.isMock&&realSkills.length&&realSkills.every(skill=>skill.score!==null&&Number.isFinite(skill.score)));
  return <section className="surface skill-trends"><div className="section-heading"><div><h2>{data?t('Skill trends','技能趋势','Trend kemahiran'):t('Skills in demo roles','演示职业中的技能','Kemahiran dalam kerjaya demo')}</h2><p className="muted">{data?t('Skill signals come from the same snapshot as the careers above.','技能信号与上方职业来自同一快照。','Isyarat kemahiran daripada gambaran yang sama.'):t('Counts show how many synthetic roles include each skill, not market demand.','数量表示多少个合成职业包含该技能，不代表市场需求。','Bilangan menunjukkan kerjaya sintetik yang mengandungi kemahiran, bukan permintaan pasaran.')}</p></div><span className="subtle-tag">{data?data.meta.isMock?t('Synthetic Demo API','合成演示 API','API demo sintetik'):t('Current snapshot','当前快照','Gambaran semasa'):t('Synthetic Demo','合成演示','Demo sintetik')}</span></div>
    {data?realSkills.length?<ul className="skill-trend-grid">{realSkills.map(skill=>{const diameter=comparable?Math.round(94+Math.max(0,skill.score!)*.55):112;const movement=skillMovement(skill);const arrow=movement?(movement==='rising'?'↑':movement==='declining'?'↓':'→'):'';return <li key={skill.id} className="skill-trend-bubble steady" style={{width:diameter,height:diameter}}><span>{skill.name}</span><small>{arrow} {movement?movement.replace(/^./,c=>c.toUpperCase()):t('Current snapshot','当前快照','Gambaran semasa')}</small></li>})}</ul>:<p className="muted">{t('Insufficient Evidence: skill trends are unavailable for this snapshot.','证据不足：此快照暂无可用技能趋势。','Bukti tidak mencukupi: trend kemahiran tiada bagi gambaran ini.')}</p>
    :demoSkills.length?<ul className="skill-trend-grid">{demoSkills.map(([id,count])=>{const diameter=Math.round(94+66*count/Math.max(1,shown.length));return <li key={id} className="skill-trend-bubble steady" style={{width:diameter,height:diameter}}><span>{skillNames[id]?copy(skillNames[id]):id}</span><small>{count} {t('demo roles','个演示职业','kerjaya demo')}</small></li>})}</ul>:<p className="muted">{t('No skills match this search.','当前搜索没有对应技能。','Tiada kemahiran sepadan.')}</p>}
    <p className="skill-trend-note">{data?t('Without comparable historical skill data, arrows and market importance are not inferred.','没有可比的历史技能数据时，不推断趋势箭头或市场重要性。','Tanpa data sejarah setara, arah dan kepentingan pasaran tidak diinferens.'):t('Synthetic coverage only. Career growth labels do not imply that all related skills are rising.','仅为合成样例覆盖情况；职业增长标签不代表其相关技能都在上升。','Liputan sintetik sahaja; pertumbuhan kerjaya tidak bermakna semua kemahirannya meningkat.')}</p>
  </section>;
}

export function Radar({data}:{data?:TrendPackage}){
  const {state,setState,t,copy}=useApp();
  const nav=useNavigate();
  const [domain,setDomain]=useState('all');
  const [search,setSearch]=useState('');
  const searchRef=useRef<HTMLInputElement>(null);
  const [role,setRole]=useState<Role|null>(null);
  const [view,setView]=useState<'map'|'list'>('map');
  const allRoles=data?.roles??roles;
  const mapAvailable=!data||allRoles.every(item=>item.domain!=='unclassified');
  const effectiveView=mapAvailable?view:'list';
  const domains=[...new Set(allRoles.map(item=>item.domain).filter(id=>id!=='unclassified'))];
  const shown=allRoles.filter(item=>(domain==='all'||item.domain===domain)&&(copy(item.name).toLowerCase().includes(search.trim().toLowerCase())||domainName(item.domain,t).toLowerCase().includes(search.trim().toLowerCase())));
  function selectDomain(id:string,{focusSearch=true}={}){setDomain(id);setSearch(id==='all'?'':domainName(id,t));if(focusSearch)requestAnimationFrame(()=>{searchRef.current?.focus();searchRef.current?.select();});}
  function fit(){
    if(!role)return;
    setState(current=>({...current,selectedRole:role.id}));
    nav(state.results||state.profile.occupation&&state.profile.education?'/individual/recommendations':'/individual/intake/start');
  }
  function openRole(item:Role){
    if(data){setState(current=>({...current,selectedRole:item.id}));nav(`/individual/roles/${item.id}`);}
    else setRole(item);
  }
  return <><PageHeader title={t('Follow your curiosity.','跟随好奇，发现方向。','Ikuti rasa ingin tahu.')} description={t('Explore how careers and skills connect. Start anywhere that interests you.','探索职业与技能之间的联系，从感兴趣的地方开始。','Teroka hubungan kerjaya dan kemahiran. Mulakan dengan minat anda.')} action={<DemoNotice/>}/>
    {data&&<div className="inline-note"><Info size={17}/><p>{data.meta.isMock?t('Synthetic Demo from the connected API','连接 API 的合成演示数据','Demo sintetik daripada API'):t('Connected snapshot','已连接快照','Gambaran tersambung')} · {data.snapshotId} · {data.region} · {data.roles[0]?.sourceWindow?`${data.roles[0].sourceWindow.from}–${data.roles[0].sourceWindow.to}`:t('Observation window unavailable','观测时间未知','Tempoh pemerhatian tiada')} · {data.meta.dataLabel}. {data.warnings?.join(' ')}</p></div>}
    <div className="toolbar"><div className="filter-tabs" role="group" aria-label={t('Career domains','职业领域','Bidang kerjaya')}>{['all',...domains].map(id=><button type="button" aria-pressed={domain===id} className={domain===id?'selected':''} key={id} onClick={()=>selectDomain(id)}>{id==='all'?t('All fields','全部领域','Semua bidang'):domainName(id,t)}</button>)}</div><label className="search-box"><Search size={17}/><input ref={searchRef} value={search} onChange={e=>setSearch(e.target.value)} placeholder={t('Find a career','搜索职业','Cari kerjaya')} aria-label={t('Find a career','搜索职业','Cari kerjaya')}/></label><div className="segmented"><button type="button" aria-pressed={effectiveView==='map'} disabled={!mapAvailable} className={effectiveView==='map'?'selected':''} onClick={()=>setView('map')}>{t('Map','图谱','Peta')}</button><button type="button" aria-pressed={effectiveView==='list'} className={effectiveView==='list'?'selected':''} onClick={()=>setView('list')}>{t('List','列表','Senarai')}</button></div></div>
    <section className="radar-surface surface">{!shown.length?<EmptyState title={t('No careers found','未找到相关职业','Tiada kerjaya ditemui')} description={t('Try a different term or field.','换个关键词或领域试试。','Cuba kata kunci atau bidang lain.')} action={<button className="button secondary" onClick={()=>selectDomain('all',{focusSearch:false})}>{t('Clear filters','清除筛选','Kosongkan penapis')}</button>}/>:effectiveView==='map'?<RadarMap roles={shown} focusedDomain={domain==='all'?null:domain} onFocus={id=>selectDomain(id||'all',{focusSearch:false})} onRole={openRole}/>:<div className="radar-list">{shown.map(item=><button className="radar-list-row" onClick={()=>openRole(item)} key={item.id}><Compass size={23}/><div><strong>{copy(item.name)}</strong><span>{domainName(item.domain,t)}</span>{data&&<small>{item.sourceWindow?`${item.sourceWindow.from}–${item.sourceWindow.to}`:t('Date unavailable','日期不可用','Tarikh tiada')} · {item.evidenceIds?.length??0} {t('sources','条来源','sumber')}</small>}</div><span>{data?(item.signalAvailable?`${item.signal} / 100`:t('Insufficient Evidence','证据不足','Bukti tidak mencukupi')):`${item.signal} / 100`}</span><ArrowRight size={18}/></button>)}</div>}
      <div className="radar-legend">{!data&&<><span><i className="legend-dot rising"/>{t('Rising','上升','Meningkat')}</span><span><i className="legend-dot emerging"/>{t('Emerging','新兴','Baharu')}</span><span><i className="legend-dot stable"/>{t('Stable','稳定','Stabil')}</span></>}<p>{data?(data.bubbleSizeBasis||t('Neutral equal-sized bubbles: no comparable size metric available.','中性等大小泡泡：暂无可比的面积指标。','Gelembung sama saiz: tiada metrik sebanding.')):t('Bubble size = illustrative synthetic signal strength, not job count.','泡泡大小 = 合成示例信号强度，不代表招聘数量。','Saiz gelembung = isyarat sintetik, bukan jumlah pekerjaan.')}</p></div>
    </section>
    <SkillSection data={data} shown={shown}/>
    {!data&&<section className="snapshot-bar"><div><strong>{t('Historical snapshots','历史快照','Gambaran sejarah')}</strong><p>{t('Insufficient historical data. Matching always uses the latest available package.','历史数据不足。个人匹配始终使用最新可用数据包。','Data sejarah tidak mencukupi. Padanan menggunakan pakej terkini.')}</p></div><input aria-label={t('Historical snapshot timeline','历史快照时间轴','Garis masa sejarah')} type="range" disabled min="0" max="1" value="1" readOnly/><span>{t('Demo v1','演示 v1','Demo v1')}</span></section>}
    {role&&<Modal title={copy(role.name)} onClose={()=>setRole(null)}><span className="subtle-tag">{domainName(role.domain,t)}</span><p>{copy(role.description)}</p><h3>{t('Skills to explore','相关技能','Kemahiran berkaitan')}</h3><div className="skill-row">{role.skills.map(id=><SkillChip id={id} key={id}/>)}</div><div className="inline-note"><Info size={17}/><p>{t('Synthetic signal. No verified observation date, sample size, salary or employer data available. AI exposure is task-specific, not a prediction of job loss.','合成趋势信号。暂无已核实的观测日期、样本量、薪资或雇主数据。AI 影响针对工作任务，不是岗位消失预测。','Isyarat sintetik. Tarikh, sampel, gaji dan majikan belum disahkan. Pendedahan AI bukan ramalan kehilangan pekerjaan.')}</p></div><div className="sdg-row">{role.sdgs.map(id=><a key={id} href={`https://sdgs.un.org/goals/goal${id}`} target="_blank" rel="noreferrer">SDG {id}</a>)}</div><div className="form-actions"><button className="button" onClick={fit}>{t('Check my career fit','查看与我的匹配','Semak kesesuaian saya')}<ArrowRight size={16}/></button></div></Modal>}
  </>;
}
