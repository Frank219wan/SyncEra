import { useState } from 'react';
import type { PsychologyAssessment } from '../types';

const QUESTIONS = [
  { title: 'Navigating Structural Change', situation: 'Your company announces a major shift in how your department operates. Roles, tools, and daily workflows will be restructured over the next year.', prompt: 'How do you naturally respond to this kind of news?', options: ['I feel stuck or overwhelmed because it’s hard to predict where my role will end up.', 'I assume leadership will decide my fate, so I just wait and see what happens to me.', "I get worried that my experience won't hold value anymore, making effort feel pointless.", 'I look for small, manageable areas within the change where I can build new skills.', 'Other (Open response)'] },
  { title: 'Pace of Skill Demands', situation: 'You notice that the expectations for your field are evolving rapidly. Every few months, new methods and tools are introduced that change how work gets done.', prompt: 'Which statement best matches your internal reaction?', options: ['No matter how hard I try to learn, the bar keeps moving faster than I can keep up.', "I'm capable of learning, but I feel like I'm constantly starting from scratch as a beginner.", 'I feel confident that my core human judgment and problem-solving matter more than mastering every tool.', "I don't bother trying to learn every new trend; it’s usually just temporary hype.", 'Other (Open response)'] },
  { title: 'Career Ownership & Direction', situation: 'Think about your professional growth over the next 3 to 5 years.', prompt: 'Who or what do you feel is currently driving your professional trajectory?', options: ['External market trends, corporate decisions, and economic factors outside my control.', "My immediate manager's demands and whatever my current job requires today.", 'My own deliberate choices, personal goals, and long-term vision.', 'Pure chance and luck—I just react to whatever comes my way.', 'Other (Open response)'] },
  { title: 'Connection to Work & Purpose', situation: 'Imagine completing a major project at work after weeks of intense effort.', prompt: 'What thought gives you the deepest sense of satisfaction?', options: ["I'm just glad it's over and I checked the box so I can get my paycheck.", 'I proved that I am capable and expanded my personal mastery.', 'I solved a real problem that positively impacted other people or a broader cause.', "I don't really feel much satisfaction from work anymore.", 'Other (Open response)'] },
  { title: 'Approach to Learning & Mastery', situation: 'You are asked to master a completely new skill set to remain competitive in your field.', prompt: "When you look at the total list of things you don't know yet, what is your initial reaction?", options: ["I freeze—the gap feels too wide, and I don't know where to start without making a mistake.", 'I feel anxious, but I try to swallow the whole list at once by frantically cramming.', 'I prefer to break it down into one tiny, bite-sized step at a time so I can see organic progress.', 'I feel confident in my ability to learn anything once I have a clear roadmap.', 'Other (Open response)'] },
] as const;

type Id = 'S1'|'S2'|'S3'|'S4'|'S5';
type Choice = 'A'|'B'|'C'|'D'|'E';
const initial = (): PsychologyAssessment => ({ assessment_version: '1.0', assessment_type: 'self_report_reflection', scenario_answers: {}, other_responses: {}, consent_to_personalization: false });

export function PsychologyQuestionnaire({ value, onChange }: { value?: PsychologyAssessment|null; onChange: (value: PsychologyAssessment|null) => void }) {
  const [step, setStep] = useState(0);
  const data = value ?? initial();
  const id = ('S' + (step+1)) as Id;
  const choice = data.scenario_answers[id];
  const next = () => setStep(x => Math.min(4,x+1));
  const choose = (answer: Choice) => onChange({ ...data, scenario_answers: { ...data.scenario_answers, [id]:answer }, other_responses: answer === 'E' ? data.other_responses : Object.fromEntries(Object.entries(data.other_responses).filter(([key])=>key!==id)) });
  return <section className="surface form-panel" aria-label="Optional growth reflection">
    <div className="section-heading"><h2>Understanding Your Growth Journey</h2><span className="subtle-tag">Optional · {step+1} / 5</span></div>
    <p>Everyone responds differently to career changes. These questions help us understand how to support your learning journey.</p>
    <progress value={step+1} max={5} style={{width:'100%'}} aria-label="Questionnaire progress"/>
    <fieldset><legend>{QUESTIONS[step].title}</legend>
      <p>{QUESTIONS[step].situation}</p><p><strong>{QUESTIONS[step].prompt}</strong></p>
      {QUESTIONS[step].options.map((option,index) => { const key=String.fromCharCode(65+index) as Choice;return <label key={key} className={'choice '+(choice===key?'chosen':'')} style={{display:'flex',marginBlock:8,padding:12,gap:12}}>
        <input type="radio" name={'psychology-'+id} value={key} checked={choice===key} onChange={()=>choose(key)}/><span>{key}) {option}</span>
      </label>;})}
      {choice==='E' && <label>Describe your reaction<textarea rows={3} maxLength={1000} value={data.other_responses[id]??''} onChange={e=>onChange({...data,other_responses:{...data.other_responses,[id]:e.target.value}})}/></label>}
    </fieldset>
    <label className="checkbox-row"><input type="checkbox" checked={data.consent_to_personalization} onChange={e=>onChange({...data, consent_to_personalization:e.target.checked})}/>Use these optional answers to personalize how my learning steps are presented.</label>
    <p className="fine-print">This is a self-report reflection, not a clinical or psychological diagnosis. It does not determine career eligibility or match scores.</p>
    <div className="form-actions">
      <button type="button" className="button secondary" disabled={step===0} onClick={()=>setStep(x=>Math.max(0,x-1))}>Back</button>
      <button type="button" className="button secondary" onClick={()=>{onChange(null);setStep(0);}}>Clear assessment</button>
      <button type="button" className="button secondary" onClick={()=>{const other=Object.fromEntries(Object.entries(data.other_responses).filter(([key])=>key!==id));onChange({...data,scenario_answers:{...data.scenario_answers,[id]:null},other_responses:other});next();}}>Skip</button>
      {step<4 && <button type="button" className="button" disabled={choice==='E'&&!data.other_responses[id]?.trim()} onClick={next}>Next</button>}
      {step===4 && <span role="status" className="subtle-tag">You can continue to profile review below.</span>}
    </div>
  </section>;
}
