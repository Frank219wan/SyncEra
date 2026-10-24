import {useEffect,useState} from 'react';
import {Link,useParams} from 'react-router-dom';
import {api} from '../services/api';
import {fromContractSkillId,verifiedRoleAlignmentTags,type ApiCareerAnalysis,type ApiRoleData,type ApiTaskImpact} from '../services/api-contract';
import {hasPersonalValue,personalFields} from '../profilePersonalization';
import {useApp} from '../store';
import type {Evidence,MarketRadarPackage,Recommendation,TrendPackage} from '../types';
import {ButtonLink,DemoNotice,EmptyState,ErrorState,PageHeader,ScenarioSwitcher,SkillChip,icons} from '../components';
import {CareerArtwork} from '../components/visual/careers/CareerArtwork';
import {LiveCareerRadar} from './LiveCareerRadar';
import {Radar} from './RadarExperience';
import './career-matches-visual.css';

const {ArrowRight,BarChart3,Compass,Info,Leaf}=icons;

function EvidenceSources({ids}:{ids:string[]}) {
  const {t}=useApp();
  const [items,setItems]=useState<Array<{evidence:Evidence;isMock:boolean}>>([]);
  const [error,setError]=useState('');
  useEffect(()=>{
    let active=true;
    setItems([]);setError('');
    if(!ids.length)return;
    Promise.all(ids.map(id=>api.evidence(id))).then(rows=>{
      if(active)setItems(rows.map(row=>({evidence:row.evidence,isMock:row.meta.isMock})));
    }).catch(e=>{if(active)setError((e as Error).message);});
    return()=>{active=false;};
  },[ids.join('|')]);
  if(!ids.length)return <p className="muted">{t('No source IDs were supplied for this result.','此结果未提供来源 ID。','Tiada ID sumber untuk hasil ini.')}</p>;
  return <div className="connected-evidence">
    {error&&<ErrorState message={error}/>}
    {!error&&!items.length&&<p className="muted">{t('Loading source records…','正在加载来源记录…','Memuatkan rekod sumber…')}</p>}
    {items.map(({evidence,isMock})=><article className="surface" key={evidence.evidenceId}>
      <h4>{evidence.title}</h4>
      <p>{isMock?t('Synthetic example','合成样例','Contoh sintetik'):t('Public source','公开来源','Sumber awam')} · {evidence.sourceType} · {evidence.publishedOrCollectedAt}</p>
      {evidence.sourceUrl?.startsWith('https://')&&<a href={evidence.sourceUrl} target="_blank" rel="noreferrer">{t('Open source','打开来源','Buka sumber')}</a>}
      {evidence.limitations&&<p>{t('Limitations','局限','Batasan')}: {evidence.limitations}</p>}
    </article>)}
  </div>;
}

export function ConnectedRadar({mode}:{mode:'matching'|'dosm'}){
  return mode==='dosm'?<ConnectedDosmRadar/>:<ConnectedMatchingRadar/>;
}

function ConnectedMatchingRadar(){
  const {setState,t}=useApp();
  const [data,setData]=useState<TrendPackage|null>(null);
  const [error,setError]=useState('');
  const [attempt,setAttempt]=useState(0);
  useEffect(()=>{
    let active=true;
    setData(null);setError('');
    api.discovery().then(packageData=>{
      if(!active)return;
      setData(packageData);
      setState(previous=>({...previous,snapshotId:packageData.snapshotId,serviceMeta:packageData.meta,trendPackage:packageData}));
    }).catch(e=>{if(active)setError((e as Error).message);});
    return()=>{active=false;};
  },[attempt,setState]);
  if(error)return <ErrorState message={error} retry={()=>setAttempt(value=>value+1)}/>;
  if(!data)return <p className="muted">{t('Loading the current snapshot…','正在加载当前快照…','Memuatkan gambaran semasa…')}</p>;
  return <Radar data={data}/>;
}

function ConnectedDosmRadar(){
  const {t}=useApp();
  const [data,setData]=useState<MarketRadarPackage|null>(null);
  const [error,setError]=useState('');
  const [attempt,setAttempt]=useState(0);
  const [period,setPeriod]=useState<string|undefined>();
  useEffect(()=>{
    let active=true;
    setData(null);setError('');
    api.marketRadar(period).then(packageData=>{
      if(!active)return;
      setData(packageData);
    }).catch(e=>{if(active)setError((e as Error).message);});
    return()=>{active=false;};
  },[attempt,period]);
  if(error)return <ErrorState message={error} retry={()=>setAttempt(value=>value+1)}/>;
  if(!data)return <p className="muted">{t('Loading the current snapshot…','正在加载当前快照…','Memuatkan gambaran semasa…')}</p>;
  return <LiveCareerRadar data={data} onPeriodChange={setPeriod}/>;
}
export function ConnectedRecommendations(){
  const {state,setState,t,copy}=useApp();
  const eligible=Boolean(state.profile.id&&state.snapshotId&&state.results&&state.results.every(item=>item.origin==='computed'));
  const requestContext=[state.profile.id,state.profile.revision??0,state.scenario,state.snapshotId].join('|');
  const [results,setResults]=useState<Recommendation[]|null>(null);
  const [loadedContext,setLoadedContext]=useState('');
  const [analysis,setAnalysis]=useState<ApiCareerAnalysis|undefined>();
  const [error,setError]=useState('');
  const [busy,setBusy]=useState(false);
  const [attempt,setAttempt]=useState(0);
  useEffect(()=>{
    if(!eligible)return;
    let active=true;
    setResults(null);setLoadedContext('');setAnalysis(undefined);setError('');setBusy(true);
    api.recommendDetailed(state.profile,state.scenario,state.selectedRole,state.snapshotId).then(({results:rows,meta,analysis:detail})=>{
      if(active){setResults(rows);setLoadedContext(requestContext);setAnalysis(detail);setState(previous=>({...previous,results:rows,serviceMeta:meta}));}
    }).catch(e=>{if(active)setError((e as Error).message);}).finally(()=>{if(active)setBusy(false);});
    return()=>{active=false;};
  },[eligible,requestContext,attempt,setState]);
  if(!eligible)return <EmptyState title={t('Confirm your profile first','请先确认画像','Sahkan profil dahulu')} description={t('A connected recommendation requires a confirmed profile and a current snapshot.','连接服务的推荐需要已确认画像和当前快照。','Cadangan memerlukan profil disahkan dan gambaran semasa.')} action={<ButtonLink to="/individual/intake/start">{t('Build my profile','创建画像','Bina profil')}</ButtonLink>}/>;
  const currentResult=loadedContext===requestContext;
  const shown=currentResult&&results&&!error?results:[];
  const strengthCount=new Set(shown.flatMap(item=>item.strengths??[])).size;
  const gapCount=new Set(shown.flatMap(item=>(item.skillGaps??[]).map(gap=>gap.skillId))).size;
  const selectedRadarRole=state.trendPackage?.snapshotId===state.snapshotId
    ?state.trendPackage.roles.find(role=>role.id===state.selectedRole):undefined;
  const selectedName=shown.find(item=>item.roleId===state.selectedRole)?.roleName
    ?? (selectedRadarRole?copy(selectedRadarRole.name):undefined);
  const scenarioName=state.scenario==='fast'?t('Fast','快速','Pantas'):t('Moderate','中等','Sederhana');
  return <div className="matches-page connected-matches-page">
    <section className="matches-hero"><span className="matches-eyebrow">{t('CAREER ATLAS · YOUR NEXT CHAPTER','职业图鉴 · 你的下一章','ATLAS KERJAYA · BAB SETERUSNYA')}</span><PageHeader title={t('Possibilities that grow with you.','与你一起成长的职业可能。','Peluang yang berkembang bersama anda.')} description={t('Explore your strengths through recommendations calculated for your confirmed profile.','从已确认的画像与优势出发，探索服务端计算的职业方向。','Teroka kekuatan anda melalui cadangan yang dikira untuk profil disahkan.')} action={currentResult?<DemoNotice/>:undefined}/><div className="matches-hero-leaf" aria-hidden="true"><Leaf size={90} strokeWidth={.8}/><Leaf size={50} strokeWidth={.8}/></div></section>
    <section className="matches-overview" aria-label={t('Overview of current recommendations','当前推荐概览','Gambaran cadangan semasa')}>
      <div><span>{t('Career matches','职业推荐','Padanan kerjaya')}</span><strong>{currentResult?shown.length:'—'}</strong></div>
      <div><span>{t('Confirmed strengths','已确认优势','Kekuatan disahkan')}</span><strong>{currentResult?strengthCount:'—'}</strong></div>
      <div><span>{t('Skills to grow','待提升技能','Kemahiran untuk dibina')}</span><strong>{currentResult?gapCount:'—'}</strong></div>
      <div><span>{t('AI scenario','AI 发展情景','Senario AI')}</span><strong className="matches-scenario-value">{scenarioName}</strong></div>
    </section>
    <div className="results-context"><div><strong>{t('Your career matches','你的职业推荐','Padanan kerjaya anda')}</strong><p>{t('Current snapshot','当前快照','Gambaran semasa')}: {state.snapshotId}{currentResult&&state.serviceMeta?.dataLabel?` · ${state.serviceMeta.dataLabel}`:''} · {t('Scores are calculated by the service, not hiring probabilities.','评分由服务端计算，不代表录用概率。','Skor dikira oleh perkhidmatan, bukan kebarangkalian diambil bekerja.')}</p></div><ScenarioSwitcher/></div>
    <p className="inline-note">{t('Career vision and work style are not included in this score yet. No unimplemented sub-scores are shown.','愿景与工作方式尚未参与本次评分；不展示尚未实现的分项。','Visi kerjaya dan gaya kerja belum termasuk dalam skor ini. Tiada subskor yang belum dilaksanakan dipaparkan.')}</p>
    {personalFields.some(field=>!hasPersonalValue(state.profile,field))&&<p className="muted">{t('Some optional answers are missing; personalized interpretation may be less reliable. Missing answers do not exclude roles in the frontend.','部分选填信息未提供，个性化解读的可信度可能较低；前端不会因缺失答案排除岗位。','Sebahagian jawapan pilihan tiada; tafsiran peribadi mungkin kurang boleh dipercayai.')}</p>}
    {selectedName&&<div className="selected-role-strip"><Compass size={23}/><div><span>{t('From your radar exploration','你在雷达中关注的职业','Daripada penerokaan radar')}</span><strong>{selectedName}</strong></div><p>{t('Shown separately from the ranking','独立展示，不改变排名','Diasingkan daripada kedudukan')}</p><ButtonLink to={`/individual/roles/${state.selectedRole}`} secondary>{t('View role','查看职业','Lihat kerjaya')}<ArrowRight size={15}/></ButtonLink></div>}
    {error&&<ErrorState message={error} retry={()=>setAttempt(value=>value+1)}/>}
    {busy&&<p className="muted" role="status">{t('Checking this scenario…','正在计算此情景…','Mengira senario ini…')}</p>}
    {currentResult&&results?.length===0&&!error&&<EmptyState title={t('No matches were returned','服务未返回推荐职业','Tiada padanan dipulangkan')} description={t('Review your confirmed profile and try another scenario.','核对已确认画像，或尝试其他情景。','Semak profil disahkan dan cuba senario lain.')} action={<ButtonLink to="/individual/intake/review">{t('Review profile','核对画像','Semak profil')}</ButtonLink>}/>}
    <div aria-busy={busy} className={`career-grid ${busy?'is-loading':''}`}>{shown.map(item=><article className="career-card matches-card" key={item.roleId}>
      <div className="matches-card-heading"><span className="matches-rank" aria-label={`${t('Rank','排序','Kedudukan')} ${item.rank}`}>{String(item.rank).padStart(2,'0')}</span><span className="matches-service-score">{item.matchScore??'—'}<small>{t('Service score','服务评分','Skor perkhidmatan')}</small></span></div>
      <div className="matches-art-frame"><CareerArtwork roleId={item.roleId} domain=""/></div>
      <h2><Link to={`/individual/roles/${item.roleId}`}>{item.roleName??item.roleId}</Link></h2>
      <p className="matches-description">{item.reason}</p>
      <span className="mini-label">{t('Your confirmed strengths','你已确认的优势','Kekuatan anda yang disahkan')}</span>
      <div className="skill-row">{item.strengths?.length?item.strengths.map(id=><SkillChip key={id} id={id} tone="strength"/>):<span className="muted">{t('No confirmed overlap reported','服务未报告已确认的技能交集','Tiada pertindihan disahkan dilaporkan')}</span>}</div>
      <span className="mini-label matches-gap-label">{t('Skills to grow','值得培养的技能','Kemahiran untuk dibina')}</span>
      <div className="matches-gap-list">{item.skillGaps?.length?item.skillGaps.map(gap=><Link key={gap.skillId} to={`/individual/skills/${gap.skillId}/mind-map?role=${item.roleId}`} className="matches-gap-link">{gap.name}<ArrowRight size={14} aria-hidden="true"/></Link>):<span className="muted">{t('No skill gaps reported','服务未报告技能差距','Tiada jurang kemahiran dilaporkan')}</span>}</div>
      <details className="why-details"><summary>{t('Why this role · evidence and uncertainty','为何推荐 · 依据与不确定性','Mengapa kerjaya ini · bukti dan ketidakpastian')}<Info size={15}/></summary>
        {item.scoreBreakdown&&<dl className="matches-breakdown">{([
          ['skill_compatibility',t('Skill compatibility','技能匹配','Keserasian kemahiran')],
          ['interests_preferences',t('Interests and preferences','兴趣与偏好','Minat dan pilihan')],
          ['scenario_outlook',t('Scenario outlook','情景前景','Prospek senario')],
          ['transition_feasibility',t('Transition feasibility','转型可行性','Kebolehlaksanaan peralihan')],
        ] as const).map(([key,label])=><div key={key}><dt>{label}</dt><dd>{item.scoreBreakdown?.[key]??'—'}</dd></div>)}</dl>}
        {item.scenarioAssumptions?.map((assumption,index)=><p key={index}>{assumption}</p>)}
        {item.uncertainty&&<p><strong>{t('Uncertainty','不确定性','Ketidakpastian')}:</strong> {item.uncertainty}</p>}
        <EvidenceSources ids={item.evidenceIds??[]}/>
      </details>
      <Link className="career-link" to={`/individual/roles/${item.roleId}`}>{t('Explore role and learning path','探索职业与学习路径','Teroka kerjaya dan laluan pembelajaran')}<ArrowRight size={17}/></Link>
    </article>)}</div>
    {currentResult&&analysis&&results&&!error&&<details className="matches-analysis-details"><summary><BarChart3 size={18} aria-hidden="true"/>{t('How this recommendation was calculated','推荐如何计算','Bagaimana cadangan ini dikira')}</summary>
      <div className="matches-analysis-body"><h2>{analysis.source==='minimax'?t('MiniMax career analysis','MiniMax 职业分析','Analisis kerjaya MiniMax'):t('Rule recommendation','规则推荐','Cadangan berasaskan peraturan')}</h2>
        <p>{t('Snapshot','快照','Gambaran')}: {state.snapshotId} · {t('Model version','模型版本','Versi model')}: {state.serviceMeta?.modelVersion??t('Not supplied','未提供','Tidak disediakan')}</p>
        {analysis.source==='rules_fallback'&&<p>{t('MiniMax was not used for this result.','此结果未使用 MiniMax。','MiniMax tidak digunakan untuk hasil ini.')} ({analysis.status})</p>}
        {analysis.role_id&&<p><strong>{t('Recommended direction','推荐方向','Arah disyorkan')}:</strong> {shown.find(item=>item.roleId===analysis.role_id?.replace(/^role_/,'').replace(/_/g,'-'))?.roleName??analysis.role_id}</p>}
        <p>{analysis.reason}</p>
        {!!analysis.strength_skill_ids.length&&<div><strong>{t('Existing strengths','已有优势','Kekuatan sedia ada')}:</strong> <span className="skill-row">{analysis.strength_skill_ids.map(id=><SkillChip key={id} id={fromContractSkillId(id)} tone="strength"/>)}</span></div>}
        {!!analysis.gap_skill_ids.length&&<div><strong>{t('Main skill gaps','主要技能缺口','Jurang kemahiran utama')}:</strong> <span className="skill-row">{analysis.gap_skill_ids.map(id=><SkillChip key={id} id={fromContractSkillId(id)}/>)}</span></div>}
        <p><strong>{t('Scenario risks and uncertainty','情境风险与不确定性','Risiko senario dan ketidakpastian')}:</strong> {analysis.risk_and_uncertainty}</p>
        {!!analysis.evidence_ids.length&&<details><summary>{t('Evidence','依据','Bukti')}</summary><EvidenceSources ids={analysis.evidence_ids}/></details>}
      </div>
    </details>}
  </div>;
}

export function ConnectedRoleDetail(){
  const {roleId}=useParams();
  const {state,setState,t}=useApp();
  const [role,setRole]=useState<ApiRoleData|null>(null);
  const [error,setError]=useState('');
  const [tasks,setTasks]=useState<ApiTaskImpact[]|null>(null);
  const [tasksError,setTasksError]=useState('');
  const [attempt,setAttempt]=useState(0);
  useEffect(()=>{
    if(!roleId)return;
    let active=true;
    setRole(null);setError('');setTasks(null);setTasksError('');
    api.role(roleId).then(row=>{if(active)setRole(row.role);}).catch(e=>{if(active)setError((e as Error).message);});
    api.roleTasks(roleId,state.snapshotId||undefined).then(row=>{if(active)setTasks(row.tasks);}).catch(e=>{if(active)setTasksError((e as Error).message);});
    return()=>{active=false;};
  },[roleId,state.snapshotId,attempt]);
  const result=state.results?.find(item=>item.roleId===roleId&&item.origin==='computed');
  const impactLabel=(impact:ApiTaskImpact['impact_type'])=>impact==='automation_candidate'
    ?t('Automation candidate','自动化候选任务','Tugas berpotensi diautomasi')
    :impact==='ai_augmented'?t('AI augmented','AI 辅助','Dibantu AI'):t('Human-led oversight','人工主导与监督','Pengawasan diterajui manusia');
  return <>
    <PageHeader title={role?.name??t('Career detail','职业详情','Butiran kerjaya')} description={role?.summary} back="/individual/recommendations" action={<DemoNotice/>}/>
    {error&&<ErrorState message={error}/>}
    {tasksError&&<ErrorState message={tasksError} retry={()=>setAttempt(value=>value+1)}/>}
    {role&&<><section className="surface"><h2>{t('Required skills','所需技能','Kemahiran diperlukan')}</h2>
      {role.required_skills.map(skill=><div className="skill-line" key={skill.skill_id}><SkillChip id={fromContractSkillId(skill.skill_id)}/><span>{t('Target level','目标等级','Tahap sasaran')} {skill.target_level} · {skill.importance}</span></div>)}
      {result&&<p>{t('Service-calculated score','服务计算评分','Skor dikira perkhidmatan')}: {result.matchScore??'—'} · {result.reason}</p>}
    </section>
    <section className="surface"><h2>{t('Role alignment tags and sources','岗位关联标签与来源','Tag padanan kerjaya dan sumber')}</h2>
      {verifiedRoleAlignmentTags(role).length?verifiedRoleAlignmentTags(role).map((tag,index)=><p key={`${tag.kind}-${tag.label}-${index}`}>{tag.label} · {tag.kind==='interest'?t('Interest','兴趣','Minat'):tag.kind==='goal'?t('Goal','目标','Matlamat'):t('Work style','工作方式','Gaya kerja')} · {tag.source==='MASCO'?'MASCO':tag.source==='curated'?t('Manually curated','人工整理','Disusun secara manual'):t('AI generated','AI 生成','Dijana AI')}</p>)
        :<p className="muted">{t('API v1.0 does not yet provide sourced interest, goal or work-style tags for this role. No tags are invented here.','API v1.0 尚未提供该岗位带来源的兴趣、目标或工作方式标签；此处不编造标签。','API v1.0 belum menyediakan tag bersumber untuk kerjaya ini; tiada tag direka.')}</p>}
    </section>
    <section className="surface"><h2>{t('Task impacts','任务影响','Impak tugas')}</h2>
      <p className="muted">{t('Illustrative task scenarios from synthetic data. They do not predict job loss or replace human review.','来自合成数据的任务示例，不代表岗位流失预测，也不能替代人工审查。','Senario tugas ilustrasi daripada data sintetik. Ia bukan ramalan kehilangan kerja atau pengganti semakan manusia.')}</p>
      {tasks===null&&!tasksError&&<p className="muted">{t('Loading task impacts…','正在加载任务影响…','Memuatkan impak tugas…')}</p>}
      {tasks?.length===0&&<p className="muted">{t('No task impact examples are available for this role.','此职业暂无任务影响示例。','Tiada contoh impak tugas untuk kerjaya ini.')}</p>}
      {tasks?.map(task=><article className="task-impact-card" key={task.task_id}>
        <div className="section-heading"><h3>{task.title}</h3><span className="subtle-tag">{impactLabel(task.impact_type)}</span></div>
        <p>{task.reason}</p><p className="muted">{t('Uncertainty','不确定性','Ketidakpastian')}: {task.uncertainty}</p>
        <h4>{t('Evidence','依据','Bukti')}</h4><EvidenceSources ids={task.evidence_ids}/>
      </article>)}
    </section>
    <section className="surface"><h2>{t('Source evidence','来源依据','Bukti sumber')}</h2><EvidenceSources ids={role.evidence_ids}/></section>
    <div className="form-actions"><ButtonLink to="/individual/roadmap/draft" onClick={()=>setState(previous=>({...previous,selectedRole:roleId??''}))}>{t('Build my learning plan','制定学习计划','Bina pelan belajar')}</ButtonLink></div></>}
  </>;
}
