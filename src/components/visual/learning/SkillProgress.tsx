import type {Copy} from '../../../types';
import type {LearningSkillProgress,LearningWeekLoad} from './learningVisualModel';

interface SkillProgressProps {
  skills:LearningSkillProgress[];
  weeks:LearningWeekLoad[];
  copy:(value:Copy)=>string;
  skillNames:Record<string,Copy>;
  t:(en:string,zh:string,ms:string)=>string;
}

export function SkillProgress({skills,weeks,copy,skillNames,t}:SkillProgressProps){
  const maxHours=Math.max(1,...weeks.map(item=>item.hours));
  return <section className="learning-insights" aria-labelledby="learning-insights-title">
    <div className="learning-section-heading">
      <div><span className="learning-eyebrow">{t('Plan signals','计划信号','Isyarat pelan')}</span><h2 id="learning-insights-title">{t('See how your effort is taking shape','看见努力如何逐步成形','Lihat usaha anda berkembang')}</h2></div>
      <p>{t('Calculated only from the tasks in this adopted plan.','仅根据这份已采纳计划中的任务计算。','Dikira hanya daripada tugasan dalam pelan ini.')}</p>
    </div>
    <div className="learning-insight-grid">
      <article className="learning-chart-card">
        <h3>{t('Skill checkpoints','技能验收进度','Kemajuan kemahiran')}</h3>
        <div className="skill-progress-list">{skills.map(item=><div className="skill-progress-row" key={item.skill}>
          <div><strong>{skillNames[item.skill]?copy(skillNames[item.skill]):item.skill}</strong><span>{item.done}/{item.total}</span></div>
          <div className="skill-progress-track" role="progressbar" aria-valuemin={0} aria-valuemax={item.total} aria-valuenow={item.done} aria-label={`${skillNames[item.skill]?copy(skillNames[item.skill]):item.skill}: ${item.done}/${item.total}`}><span style={{width:`${item.percent}%`}}/></div>
        </div>)}</div>
      </article>
      <article className="learning-chart-card">
        <h3>{t('Weekly effort','每周投入','Usaha mingguan')}</h3>
        <div className="weekly-load-chart" aria-label={t('Scheduled learning hours by week','按周安排的学习小时','Jam pembelajaran mengikut minggu')}>{weeks.map(item=><div className="weekly-load-column" key={item.week}>
          <span className="weekly-load-value">{item.hours}h</span>
          <span className="weekly-load-bar" style={{height:`${Math.max(12,item.hours/maxHours*100)}%`}}/>
          <span className="weekly-load-label">{t(`W${item.week}`,`第${item.week}周`,`M${item.week}`)}</span>
        </div>)}</div>
        <p>{t('Scheduled hours, not time tracked.','这是计划小时，并非实际计时。','Jam dijadualkan, bukan masa dijejak.')}</p>
      </article>
    </div>
  </section>;
}
