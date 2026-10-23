import {useEffect,useState} from 'react';
import {Link,useParams} from 'react-router-dom';
import {api} from '../services/api';
import {fromContractSkillId,type ApiRoleData,type ApiTaskImpact} from '../services/api-contract';
import {useApp} from '../store';
import type {Evidence,MarketRadarPackage,Recommendation,TrendPackage} from '../types';
import {ButtonLink,DemoNotice,EmptyState,ErrorState,PageHeader,ScenarioSwitcher,SkillChip} from '../components';
import {LiveCareerRadar} from './LiveCareerRadar';
import {Radar} from './RadarExperience';

const dosmRadarEnabled=import.meta.env.VITE_DOSM_MARKET_RADAR_ENABLED==='true';

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

export function ConnectedRadar(){
  return dosmRadarEnabled?<ConnectedDosmRadar/>:<ConnectedMatchingRadar/>;
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
  const {state,setState,t}=useApp();
  const eligible=Boolean(state.snapshotId&&state.results?.length&&state.results.every(item=>item.origin==='computed'));
  const [results,setResults]=useState<Recommendation[]|null>(eligible?state.results:null);
  const [error,setError]=useState('');
  const [busy,setBusy]=useState(false);
  const [attempt,setAttempt]=useState(0);
  useEffect(()=>{
    if(!eligible)return;
    let active=true;
    setResults(null);setError('');setBusy(true);
    api.recommendDetailed(state.profile,state.scenario,state.selectedRole,state.snapshotId).then(({results:rows,meta})=>{
      if(active){setResults(rows);setState(previous=>({...previous,results:rows,serviceMeta:meta}));}
    }).catch(e=>{if(active)setError((e as Error).message);}).finally(()=>{if(active)setBusy(false);});
    return()=>{active=false;};
  },[eligible,state.profile.id,state.scenario,state.snapshotId,attempt,setState]);
  if(!eligible)return <EmptyState title={t('Confirm your profile first','请先确认画像','Sahkan profil dahulu')} description={t('A connected recommendation requires a confirmed profile and a current snapshot.','连接服务的推荐需要已确认画像和当前快照。','Cadangan memerlukan profil disahkan dan gambaran semasa.')} action={<ButtonLink to="/individual/intake/start">{t('Build my profile','创建画像','Bina profil')}</ButtonLink>}/>;
  return <>
    <PageHeader title={t('Career matches','职业推荐','Padanan kerjaya')} description={t('Relative fit from the selected snapshot and scenario.','基于所选快照和情景的相对匹配。','Padanan relatif daripada gambaran dan senario terpilih.')} action={<DemoNotice/>}/>
    <div className="results-context"><div><strong>{t('Current snapshot','当前快照','Gambaran semasa')}: {state.snapshotId}</strong><p>{state.serviceMeta?.dataLabel} · {t('Scores are not hiring probabilities.','评分不代表录用概率。','Skor bukan kebarangkalian diambil bekerja.')}</p></div><ScenarioSwitcher/></div>
    {error&&<ErrorState message={error} retry={()=>setAttempt(value=>value+1)}/>}
    {busy&&<p className="muted">{t('Checking this scenario…','正在计算此情景…','Mengira senario ini…')}</p>}
    {results&&!error&&<div className="career-grid">{results.map(item=><article className="career-card" key={item.roleId}>
      <div className="career-top"><span className="rank-number">{item.rank}</span><span className="fit-score">{item.matchScore??'—'}<small>{t('relative fit / 100','相对匹配 / 100','padanan relatif / 100')}</small></span></div>
      <h2><Link to={`/individual/roles/${item.roleId}`}>{item.roleName??item.roleId}</Link></h2>
      <p>{item.reason}</p>
      <div className="skill-row">{item.strengths?.map(id=><SkillChip key={id} id={id} tone="strength"/>)}</div>
      <details className="why-details"><summary>{t('Evidence and assumptions','依据与假设','Bukti dan andaian')}</summary>
        {item.scenarioAssumptions?.map((assumption,index)=><p key={index}>{assumption}</p>)}
        {item.uncertainty&&<p>{t('Uncertainty','不确定性','Ketidakpastian')}: {item.uncertainty}</p>}
        <EvidenceSources ids={item.evidenceIds??[]}/>
      </details>
    </article>)}</div>}
  </>;
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
      {result&&<p>{t('Your relative fit','你的相对匹配','Padanan relatif anda')}: {result.matchScore??'—'} / 100 · {result.reason}</p>}
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
