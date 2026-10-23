import {useState} from 'react';
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
  const [index,setIndex]=useState(0);
  const current=value??emptyPsychology();
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

  return <section className="surface form-panel psychology-assessment" aria-label="Optional growth reflection">
    <div className="section-heading psychology-heading">
      <h2>Understanding Your Growth Journey</h2>
      <span className="subtle-tag">Optional · {index+1}/5</span>
    </div>
    <p className="muted psychology-intro">Everyone responds differently to career changes. These five short questions help us understand how to support your learning journey.</p>
    <progress className="psychology-progress" max={5} value={index+1} aria-label="Question progress"/>
    <fieldset className="psychology-question">
      <legend>{items[index].title}</legend>
      <p className="psychology-situation">{items[index].situation}</p>
      <p className="psychology-prompt"><strong>{items[index].question}</strong></p>
      <div className="psychology-options">
        {items[index].options.map((label,i)=>{
          const answer=('ABCD'[i]) as PsychologyChoice;
          return <label className={`psychology-option${choice===answer?' selected':''}`} key={answer}>
            <input type="radio" name={key} value={answer} checked={choice===answer} onChange={()=>update(answer)}/>
            <span className="psychology-option-letter">{answer})</span>
            <span>{label}</span>
          </label>;
        })}
        <label className={`psychology-option${choice==='E'?' selected':''}`}>
          <input type="radio" name={key} value="E" checked={choice==='E'} onChange={()=>update('E')}/>
          <span className="psychology-option-letter">E)</span>
          <span>Other (Open response)</span>
        </label>
      </div>
      {choice==='E'&&<label className="psychology-other">
        <span>Tell us in your own words</span>
        <textarea aria-label="Other response" maxLength={2000} required value={other} onChange={e=>onChange({...current,other_responses:{...current.other_responses,[key]:e.target.value}})} rows={3}/>
      </label>}
    </fieldset>
    <label className="psychology-consent">
      <input type="checkbox" checked={current.consent_to_personalization} onChange={e=>onChange({...current,consent_to_personalization:e.target.checked})}/>
      <span>Use these responses to personalize learning support</span>
    </label>
    <p className="fine-print psychology-disclaimer">This optional reflection is not a clinical or psychological diagnosis. Career eligibility and match scores are not decided by these answers.</p>
    <div className="form-actions psychology-actions">
      <button className="button secondary" type="button" disabled={index===0} onClick={()=>setIndex(v=>v-1)}>Back</button>
      <button className="button secondary" type="button" onClick={()=>{update(null);setIndex(v=>Math.min(4,v+1));}}>Skip question</button>
      <button className="button secondary" type="button" onClick={()=>onChange(emptyPsychology())}>Clear assessment</button>
      {index===4
        ?<span className="psychology-last-step" role="status">Last question — continue with “Review my profile” below.</span>
        :<button className="button" type="button" disabled={choice==='E'&&!other.trim()} onClick={()=>setIndex(v=>v+1)}>Next question</button>}
    </div>
  </section>;
}
