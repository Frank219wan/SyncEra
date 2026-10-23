import {ArrowRight,BookOpen,Check,Clock,Leaf} from 'lucide-react';
import {Link} from 'react-router-dom';
import type {Copy,Plan,Task} from '../../../types';
import {skillNames} from '../../../data';
import {LearningMilestone} from './LearningMilestone';
import {nextLearningTask,roadmapNodePoints} from './learningVisualModel';

interface LearningRoadmapProps {
  plan:Plan;
  selectedTaskId:string;
  copy:(value:Copy)=>string;
  t:(en:string,zh:string,ms:string)=>string;
  due:(task:Task)=>string;
  onSelect:(task:Task)=>void;
  onConfirm:(task:Task)=>void;
}

export function LearningRoadmap({plan,selectedTaskId,copy,t,due,onSelect,onConfirm}:LearningRoadmapProps){
  const points=roadmapNodePoints(plan.tasks.length);
  const next=nextLearningTask(plan.tasks);
  const selected=plan.tasks.find(task=>task.id===selectedTaskId)??next??plan.tasks[0]??null;
  const polyline=points.map(point=>`${point.x*10},${point.y*4.2}`).join(' ');
  if(!selected)return <section className="learning-roadmap-empty surface"><Leaf size={30}/><h2>{t('No milestones in this plan','这份计划还没有里程碑','Tiada pencapaian dalam pelan ini')}</h2><p>{t('Review or regenerate the plan before recording progress.','请先审核或重新生成计划，再记录进度。','Semak atau jana semula pelan sebelum merekod kemajuan.')}</p></section>;
  return <section className="learning-roadmap-shell" aria-labelledby="learning-roadmap-title">
    <div className="learning-section-heading">
      <div><span className="learning-eyebrow">{t('Interactive roadmap','互动成长路线','Peta interaktif')}</span><h2 id="learning-roadmap-title">{t('Follow the vine, one milestone at a time','沿着藤蔓，一步步完成里程碑','Ikuti sulur, satu pencapaian demi satu')}</h2></div>
      <div className="learning-roadmap-legend" aria-label={t('Roadmap legend','路线图例','Petunjuk peta')}><span className="is-complete"><i/>{t('Complete','已完成','Selesai')}</span><span className="is-next"><i/>{t('Next','下一步','Seterusnya')}</span><span><i/>{t('Planned','待完成','Dirancang')}</span></div>
    </div>
    <div className="learning-roadmap-layout">
      <div className="learning-roadmap-canvas" role="group" aria-label={t('Plan milestones','计划里程碑','Pencapaian pelan')}>
        <svg className="learning-vine" viewBox="0 0 1000 420" preserveAspectRatio="none" aria-hidden="true">
          <polyline points={polyline} pathLength="1"/>
          {points.slice(1,-1).filter((_,index)=>index%2===0).map((point,index)=><g key={index} transform={`translate(${point.x*10} ${point.y*4.2}) rotate(${index%2?28:-24})`}><path d="M0 0 Q 26 -18 43 3 Q 19 15 0 0Z"/></g>)}
        </svg>
        {plan.tasks.map((task,index)=><LearningMilestone key={task.id} task={task} index={index} point={points[index]} selected={task.id===selected.id} next={task.id===next?.id} label={copy(task.title)} statusLabel={task.done?t('Complete','已完成','Selesai'):task.id===next?.id?t('Next milestone','下一里程碑','Pencapaian seterusnya'):t('Planned','待完成','Dirancang')} onSelect={()=>onSelect(task)}/>)}
      </div>
      <aside className="learning-milestone-detail surface" aria-live="polite">
        <div className="learning-detail-top"><span className={`learning-detail-status ${selected.done?'is-complete':selected.id===next?.id?'is-next':''}`}>{selected.done?<Check size={14}/>:<Leaf size={14}/>} {selected.done?t('Completed milestone','已完成里程碑','Pencapaian selesai'):selected.id===next?.id?t('Your next milestone','你的下一里程碑','Pencapaian seterusnya'):t('Planned milestone','待完成里程碑','Pencapaian dirancang')}</span><span>{String(plan.tasks.indexOf(selected)+1).padStart(2,'0')} / {String(plan.tasks.length).padStart(2,'0')}</span></div>
        <h3>{copy(selected.title)}</h3>
        <div className="learning-detail-skill">{skillNames[selected.skill]?copy(skillNames[selected.skill]):selected.skill}</div>
        <dl><div><dt><Clock size={15}/>{t('Effort','投入','Usaha')}</dt><dd>{selected.hours} {t('hours','小时','jam')}</dd></div><div><dt>{t('Scheduled','安排','Jadual')}</dt><dd>{t(`Week ${selected.week}`,`第 ${selected.week} 周`,`Minggu ${selected.week}`)} · {due(selected)}</dd></div></dl>
        {selected.evidence?<div className="learning-evidence"><strong>{t('Completion note','完成记录','Nota selesai')}</strong><p>{selected.evidence}</p></div>:<p className="learning-detail-note">{t('Select the learning resource, complete the practice, then add your own evidence.','打开学习资源、完成练习，再补充你自己的完成依据。','Buka sumber, lengkapkan latihan, kemudian tambah bukti anda.')}</p>}
        <div className="learning-detail-actions"><Link className="button secondary" to={`/individual/skills/${selected.skill}/mind-map?role=${plan.roleId}`}><BookOpen size={16}/>{t('Learning resources','学习资源','Sumber pembelajaran')}</Link><button className={`button ${selected.done?'secondary':''}`} disabled={selected.done} onClick={()=>onConfirm(selected)}>{selected.done?t('Completed','已完成','Selesai'):t('Confirm skill','确认完成技能','Sahkan kemahiran')} {!selected.done&&<ArrowRight size={16}/>}</button></div>
      </aside>
    </div>
  </section>;
}
