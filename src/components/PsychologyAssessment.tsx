import {useState} from 'react';
import {useApp} from '../store';
import type {PsychologyAssessment, PsychologyChoice} from '../types';

const items = [
  {title:'Navigating Structural Change', situation:'Your company announces a major shift in how your department operates. Roles, tools, and daily workflows will be restructured over the next year.', question:'How do you naturally respond to this kind of news?', options:["I feel stuck or overwhelmed because it’s hard to predict where my role will end up.","I assume leadership will decide my fate, so I just wait and see what happens to me.","I get worried that my experience won't hold value anymore, making effort feel pointless.","I look for small, manageable areas within the change where I can build new skills."]},
  {title:'Pace of Skill Demands', situation:'You notice that the expectations for your field are evolving rapidly. Every few months, new methods and tools are introduced that change how work gets done.', question:'Which statement best matches your internal reaction?', options:['No matter how hard I try to learn, the bar keeps moving faster than I can keep up.',"I'm capable of learning, but I feel like I'm constantly starting from scratch as a beginner.",'I feel confident that my core human judgment and problem-solving matter more than mastering every tool.',"I don't bother trying to learn every new trend; it’s usually just temporary hype."]},
  {title:'Career Ownership & Direction', situation:'Think about your professional growth over the next 3 to 5 years.', question:'Who or what do you feel is currently driving your professional trajectory?', options:['External market trends, corporate decisions, and economic factors outside my control.',"My immediate manager's demands and whatever my current job requires today.",'My own deliberate choices, personal goals, and long-term vision.','Pure chance and luck—I just react to whatever comes my way.']},
  {title:'Connection to Work & Purpose', situation:'Imagine completing a major project at work after weeks of intense effort.', question:'What thought gives you the deepest sense of satisfaction?', options:["I'm just glad it's over and I checked the box so I can get my paycheck.",'I proved that I am capable and expanded my personal mastery.','I solved a real problem that positively impacted other people or a broader cause.',"I don't really feel much satisfaction from work anymore."]},
  {title:'Approach to Learning & Mastery', situation:'You are asked to master a completely new skill set to remain competitive in your field.', question:"When you look at the total list of things you don't know yet, what is your initial reaction?", options:["I freeze—the gap feels too wide, and I don't know where to start without making a mistake.","I feel anxious, but I try to swallow the whole list at once by frantically cramming.",'I prefer to break it down into one tiny, bite-sized step at a time so I can see organic progress.','I feel confident in my ability to learn anything once I have a clear roadmap.']}
] as const;

export const emptyPsychology = ():PsychologyAssessment=>({assessment_version:'1.0',assessment_type:'self_report_reflection',scenario_answers:{S1:null,S2:null,S3:null,S4:null,S5:null},other_responses:{},consent_to_personalization:false});

export function PsychologyAssessmentForm({value,onChange}:{value?:PsychologyAssessment;onChange:(value:PsychologyAssessment)=>void}) {
  const {t}=useApp();
  const [index,setIndex]=useState(0);
  const blank=emptyPsychology();
  const current=value?{...blank,...value,scenario_answers:{...blank.scenario_answers,...value.scenario_answers}}:blank;
  const key='S'+(index+1);
  const choice=current.scenario_answers[key]??null;
  const other=current.other_responses[key]??'';
  const update=(selected:PsychologyChoice)=>onChange({
    ...current,
    scenario_answers:{...current.scenario_answers,[key]:selected},
    other_responses:selected==='E'
      ?current.other_responses
      :Object.fromEntries(Object.entries(current.other_responses).filter(([k])=>k!==key)),
  });

  return <section className="surface form-panel psychology-assessment" aria-label={t('Optional growth reflection','可选成长反思','Refleksi pertumbuhan pilihan')}>
    <div className="section-heading psychology-heading">
      <h2>{t('Understanding Your Growth Journey','了解你的成长旅程','Memahami perjalanan pertumbuhan anda')}</h2>
      <span className="subtle-tag">{t('Optional','可选','Pilihan')} · {index+1}/5</span>
    </div>
    <p className="muted psychology-intro">{t('Everyone responds differently to career changes. These five short questions help us understand how to support your learning journey.','每个人面对职业变化的方式不同。这五道题可帮助我们了解如何支持你的学习旅程。','Setiap orang menghadapi perubahan kerjaya dengan cara berbeza. Lima soalan ini membantu kami memahami cara menyokong pembelajaran anda.')}</p>
    <progress className="psychology-progress" max={5} value={index+1} aria-label={t('Question progress','题目进度','Kemajuan soalan')}/>
    <fieldset className="psychology-question">
      <legend>{key} — {items[index].title}</legend>
      <p className="psychology-situation">{items[index].situation}</p>
      <p className="psychology-prompt"><strong>{items[index].question}</strong></p>
      <div className="psychology-options">
        {items[index].options.map((label,i)=>{
          const answer=('ABCD'[i]) as Exclude<PsychologyChoice,null>;
          return <label className={`psychology-option${choice===answer?' selected':''}`} key={answer}>
            <input type="radio" name={key} value={answer} checked={choice===answer} onChange={()=>update(answer)}/>
            <span className="psychology-option-letter">{answer})</span>
            <span>{label}</span>
          </label>;
        })}
        <label className={`psychology-option${choice==='E'?' selected':''}`}>
          <input type="radio" name={key} value="E" checked={choice==='E'} onChange={()=>update('E')}/>
          <span className="psychology-option-letter">E)</span>
          <span>{t('Other (open response)','其他（自由填写）','Lain-lain (jawapan terbuka)')}</span>
        </label>
      </div>
      {choice==='E'&&<label className="psychology-other">
        <span>{t('Tell us in your own words','请用自己的话回答','Jawab dengan kata-kata anda sendiri')}</span>
        <textarea aria-label={t('Other response','其他回答','Jawapan lain')} maxLength={2000} required value={other} onChange={e=>onChange({...current,other_responses:{...current.other_responses,[key]:e.target.value}})} rows={3}/>
      </label>}
    </fieldset>
    <label className="psychology-consent">
      <input type="checkbox" checked={current.consent_to_personalization} onChange={e=>onChange({...current,consent_to_personalization:e.target.checked})}/>
      <span>{t('Use these responses to personalize learning support','使用这些回答个性化学习支持','Gunakan jawapan ini untuk menyesuaikan sokongan pembelajaran')}</span>
    </label>
    <p className="fine-print psychology-disclaimer">{t('This optional reflection is not a clinical or psychological diagnosis. Career eligibility and match scores are not decided by these answers.','这项可选反思不属于临床或心理诊断；职业资格和匹配分不会由这些回答决定。','Refleksi pilihan ini bukan diagnosis klinikal atau psikologi. Kelayakan kerjaya dan skor padanan tidak ditentukan oleh jawapan ini.')}</p>
    <div className="form-actions psychology-actions">
      <button className="button secondary" type="button" disabled={index===0} onClick={()=>setIndex(v=>v-1)}>{t('Back','上一题','Kembali')}</button>
      <button className="button secondary" type="button" onClick={()=>{update(null);setIndex(v=>Math.min(4,v+1));}}>{t('Skip question','跳过此题','Langkau soalan')}</button>
      <button className="button secondary" type="button" onClick={()=>{onChange(emptyPsychology());setIndex(0);}}>{t('Skip entire assessment','跳过整份问卷','Langkau semua soalan')}</button>
      <button className="button secondary" type="button" onClick={()=>onChange(emptyPsychology())}>{t('Clear assessment','清除问卷','Kosongkan penilaian')}</button>
      {index===4
        ?<span className="psychology-last-step" role="status">{t('Last question — continue with “Review my profile” below.','最后一题——请点击下方“核对我的画像”继续。','Soalan terakhir — teruskan dengan “Semak profil saya” di bawah.')}</span>
        :<button className="button" type="button" disabled={choice==='E'&&!other.trim()} onClick={()=>setIndex(v=>v+1)}>{t('Next question','下一题','Soalan seterusnya')}</button>}
    </div>
  </section>;
}
