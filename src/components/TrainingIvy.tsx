import {skillNames} from '../data';
import {useApp} from '../store';
import type {Organization} from '../types';
import {reviewedTrainingStages} from '../trainingProgress';

export function TrainingIvy({completed}:{completed:number}){
  return <svg className="training-ivy-art" viewBox="0 0 320 220" aria-hidden="true" focusable="false">
    <defs>
      <linearGradient id="training-ivy-leaf" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#a9c793"/><stop offset="1" stopColor="#527c49"/></linearGradient>
    </defs>
    <path className="ivy-trellis" d="M77 188V22M132 188V22M187 188V22M242 188V22M64 58H255M64 105H255M64 152H255"/>
    <ellipse cx="160" cy="199" rx="89" ry="8" fill="#c8dac0"/>
    <path className="ivy-stem" d="M160 195Q153 181 158 165"/>
    <path className="ivy-leaf" d="M158 179Q135 175 136 160Q152 159 158 179ZM158 170Q162 153 177 153Q177 169 158 170Z"/>
    {completed>=1&&<g className="ivy-unfurl"><path className="ivy-stem" d="M158 165Q139 149 145 124Q151 111 138 101"/><path className="ivy-leaf" d="M145 145Q117 149 109 131Q128 121 145 145ZM145 129Q156 109 176 111Q167 129 145 129ZM138 104Q117 103 115 85Q131 84 138 104Z"/></g>}
    {completed>=2&&<g className="ivy-unfurl"><path className="ivy-stem" d="M138 101Q132 77 155 69Q178 62 185 47M155 69Q181 87 210 74"/><path className="ivy-leaf" d="M153 69Q146 47 160 37Q173 52 153 69ZM179 59Q187 39 207 39Q201 59 179 59ZM190 79Q203 61 224 65Q215 84 190 79Z"/></g>}
    {completed>=3&&<g className="ivy-unfurl"><path className="ivy-stem" d="M185 47Q204 27 228 34M210 74Q229 70 246 53M155 69Q138 54 120 53"/><path className="ivy-leaf" d="M215 37Q221 18 242 17Q242 35 215 37ZM230 37Q247 27 262 39Q248 51 230 37ZM237 61Q245 43 264 48Q258 65 237 61ZM124 55Q109 37 89 45Q97 62 124 55ZM123 54Q118 70 99 75Q97 57 123 54Z"/><circle cx="227" cy="34" r="3" fill="#d6e6c9"/></g>}
  </svg>;
}

export function TrainingGrowthPanel({training,employeeId,skillId}:{training:Organization['training'];employeeId:string;skillId:string}){
  const {t,copy}=useApp();
  const completed=reviewedTrainingStages(training,employeeId,skillId);
  const phase=completed===0?t('A new seedling','一株小苗','Anak pokok baharu'):completed===3?t('A flourishing ivy','一株茂盛的爬山虎','Ivy yang subur'):t('Growing step by step','一步步向上生长','Tumbuh selangkah demi selangkah');
  const skill=skillNames[skillId]?copy(skillNames[skillId]):skillId;
  return <section className="surface training-growth-panel" aria-labelledby="training-growth-title">
    <div className="training-growth-copy">
      <span className="training-growth-eyebrow">{t('TEAM GROWTH','团队成长','PERTUMBUHAN PASUKAN')}</span>
      <h2 id="training-growth-title">{t('Every reviewed step helps us grow.','每一次审核，都让成长继续。','Setiap semakan membantu kita berkembang.')}</h2>
      <p>{employeeId} · {skill}</p>
      <strong className="training-growth-phase">{phase}</strong>
      <label className="training-growth-count" htmlFor="training-growth-progress"><span>{t('Reviewed training stages','已审核培训阶段','Tahap latihan disemak')}</span><span>{completed} / 3</span></label>
      <progress id="training-growth-progress" max={3} value={completed}>{completed} / 3</progress>
      <small>{t('The ivy reflects only manager-reviewed stages for this employee and skill. It is a progress illustration, not a skill score.','爬山虎只随当前员工与技能的已审核阶段生长。这是进度示意，不代表技能评分。','Ivy hanya mengikut tahap yang disemak pengurus untuk pekerja dan kemahiran ini. Ini ilustrasi kemajuan, bukan skor kemahiran.')}</small>
    </div>
    <TrainingIvy completed={completed}/>
  </section>;
}
