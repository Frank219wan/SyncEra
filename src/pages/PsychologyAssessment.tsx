import {useState} from 'react';
import {useNavigate} from 'react-router-dom';
import {useApp} from '../store';
import {ApiError,api,isDemo} from '../services/api';
import {buildPsychologyAssessment,canAdvanceAssessment,emptyAssessmentAnswers,nextAssessmentIndex,previousAssessmentIndex,psychologyQuestions} from '../psychologyAssessment';
import type {PsychologyAnswer,PsychologyAssessment,PsychologyScenarioId} from '../types';
import {ButtonLink,DemoNotice,ErrorState,Field,PageHeader,Stepper,icons} from '../components';
import './PsychologyAssessment.css';

const {ArrowLeft,ArrowRight}=icons;
const emptyOtherResponses=()=>({});

function requestErrorMessage(error:unknown,t:(en:string,zh:string,ms:string)=>string){
  if(error instanceof ApiError&&error.code==='VALIDATION_ERROR'){
    const stalePsychologySchema=error.details.some(detail=>detail.field?.includes('psychology')&&(detail.reason==='extra_forbidden'||detail.field.includes('.assessment')));
    if(stalePsychologySchema)return t(
      'The API server rejected the questionnaire fields. Stop and restart the FutureProof API task in VS Code, then try again.',
      'API 服务拒绝了问卷字段。请在 VS Code 中停止并重新启动 FutureProof API 任务，然后重试。',
      'Pelayan API menolak medan soal selidik. Hentikan dan mulakan semula tugas FutureProof API dalam VS Code, kemudian cuba lagi.',
    );
    const details=error.details.map(detail=>[detail.field,detail.reason].filter(Boolean).join(': ')).filter(Boolean).join('; ');
    return details?`${error.message} (${details})`:error.message;
  }
  return (error as Error).message;
}

export function PsychologyAssessmentPage(){
  const {state,setState,t,copy}=useApp();
  const nav=useNavigate();
  const existing=state.profile.psychology?.assessment;
  const [answers,setAnswers]=useState(()=>existing?.scenario_answers??emptyAssessmentAnswers());
  const [otherResponses,setOtherResponses]=useState<Partial<Record<PsychologyScenarioId,string>>>(()=>existing?.other_responses??emptyOtherResponses());
  const [consent,setConsent]=useState(()=>existing?.consent_to_personalization??false);
  const [started,setStarted]=useState(()=>Boolean(existing?.consent_to_personalization));
  const [questionIndex,setQuestionIndex]=useState(0);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const question=psychologyQuestions[questionIndex];
  const selected=answers[question.id];
  const otherText=otherResponses[question.id]??'';
  const isLast=questionIndex===psychologyQuestions.length-1;

  function profileWithAssessment(assessment:PsychologyAssessment|null){
    return {...state.profile,psychology:{...(state.profile.psychology??{}),mbti:state.profile.mbti||null,intrinsic_motivators:state.profile.psychology?.intrinsic_motivators??[],assessment}};
  }

  function saveDraft(nextAnswers=answers,nextOther=otherResponses){
    const draft:PsychologyAssessment={
      assessment_version:'1.0',assessment_type:'self_report_reflection',
      scenario_answers:{...nextAnswers},other_responses:{...nextOther},consent_to_personalization:true,
    };
    setState(current=>({...current,profile:{...current.profile,psychology:{...(current.profile.psychology??{}),mbti:current.profile.mbti||current.profile.psychology?.mbti||null,intrinsic_motivators:current.profile.psychology?.intrinsic_motivators??[],assessment:draft}}}));
  }

  async function returnToReview(assessment:PsychologyAssessment|null){
    setBusy(true);setError('');
    const edited=profileWithAssessment(assessment);
    try{
      // An already-normalized profile is updated at the existing confirmation step.
      // New profiles use the existing normalize endpoint with the optional psychology object.
      const isExistingServiceProfile=!isDemo&&/^profile_/.test(state.profile.id);
      const profile=isExistingServiceProfile?edited:await api.normalize(edited);
      setState(current=>({...current,profile,results:null}));
      nav('/individual/intake/review');
    }catch(e){setError(requestErrorMessage(e,t));}
    finally{setBusy(false);}
  }

  function startAssessment(){
    if(!consent)return;
    setStarted(true);
    saveDraft(answers,otherResponses);
  }

  function chooseAnswer(answer:PsychologyAnswer){
    const nextAnswers={...answers,[question.id]:answer};
    const nextOther={...otherResponses};
    if(answer!=='E')delete nextOther[question.id];
    setAnswers(nextAnswers);setOtherResponses(nextOther);saveDraft(nextAnswers,nextOther);
  }

  function writeOther(value:string){
    const nextOther={...otherResponses,[question.id]:value};
    setOtherResponses(nextOther);saveDraft(answers,nextOther);
  }

  async function submitAnswers(nextAnswers=answers,nextOther=otherResponses){
    try{
      const assessment=buildPsychologyAssessment(nextAnswers,nextOther);
      await returnToReview(assessment);
    }catch(e){setError((e as Error).message);}
  }

  function next(){
    if(!canAdvanceAssessment(selected,otherText))return;
    if(isLast){void submitAnswers();return;}
    setQuestionIndex(nextAssessmentIndex(questionIndex));
  }

  function skipQuestion(){
    const nextAnswers={...answers,[question.id]:null};
    const nextOther={...otherResponses};delete nextOther[question.id];
    setAnswers(nextAnswers);setOtherResponses(nextOther);saveDraft(nextAnswers,nextOther);
    if(isLast){void submitAnswers(nextAnswers,nextOther);return;}
    setQuestionIndex(nextAssessmentIndex(questionIndex));
  }

  function clearCurrentAnswer(){
    const nextAnswers={...answers,[question.id]:null};
    const nextOther={...otherResponses};delete nextOther[question.id];
    setAnswers(nextAnswers);setOtherResponses(nextOther);saveDraft(nextAnswers,nextOther);
  }

  function previous(){
    if(questionIndex===0){setStarted(false);return;}
    setQuestionIndex(previousAssessmentIndex(questionIndex));
  }

  function clearAll(){
    const nextAnswers=emptyAssessmentAnswers();
    setAnswers(nextAnswers);setOtherResponses({});setConsent(false);setStarted(false);setQuestionIndex(0);
    setState(current=>({...current,profile:{...current.profile,psychology:{...(current.profile.psychology??{}),assessment:null}}}));
  }

  function skipAssessment(){void returnToReview(null);}

  return <>
    <PageHeader title={t('Understanding Your Growth Journey','了解你的成长旅程','Memahami Perjalanan Perkembangan Anda')} description={t('Everyone responds differently to career changes. These five short questions help us understand how to support your learning journey.','每个人面对职业变化时的反应都不同。这五个简短问题将帮助我们了解如何支持你的学习旅程。','Setiap orang memberi reaksi berbeza terhadap perubahan kerjaya. Lima soalan ringkas ini membantu kami memahami cara menyokong perjalanan pembelajaran anda.')} back="/individual/intake/profile" action={<DemoNotice/>}/>
    <Stepper current={2} steps={[t('Your direction','你的方向','Arah anda'),t('Your experience','你的经历','Pengalaman anda'),t('Growth reflection','成长反思','Refleksi perkembangan'),t('Review profile','确认画像','Semak profil')]}/>
    <section className="surface psychology-assessment">
      <div className="assessment-topline"><span>{t('Optional reflection','可选反思','Refleksi pilihan')}</span><button className="text-button" type="button" disabled={busy} onClick={skipAssessment}>{t('Skip assessment','跳过反思','Langkau penilaian')}</button></div>
      {!started?<div className="assessment-intro">
        <h2>{t('Understanding Your Growth Journey','了解你的成长旅程','Memahami Perjalanan Perkembangan Anda')}</h2>
        <p>{t('Everyone responds differently to career changes. These five short questions help us understand how to support your learning journey.','每个人面对职业变化时的反应都不同。这五个简短问题将帮助我们了解如何支持你的学习旅程。','Setiap orang memberi reaksi berbeza terhadap perubahan kerjaya. Lima soalan ringkas ini membantu kami memahami cara menyokong perjalanan pembelajaran anda.')}</p>
        <p className="assessment-disclaimer">{t('This optional reflection helps personalize your learning experience. It is not a clinical or psychological diagnosis.','这项可选反思用于个性化你的学习体验，并非临床或心理诊断。','Refleksi pilihan ini membantu menyesuaikan pengalaman pembelajaran anda. Ini bukan diagnosis klinikal atau psikologi.')}</p>
        <label className="assessment-consent"><input type="checkbox" checked={consent} onChange={event=>event.target.checked?setConsent(true):clearAll()}/><span>{t('I agree that my answers may be used to personalize how my learning pathway is presented.','我同意使用这些回答来个性化呈现我的学习路径。','Saya bersetuju jawapan saya digunakan untuk menyesuaikan cara laluan pembelajaran dipaparkan.')}</span></label>
        <div className="assessment-intro-actions"><button className="button" type="button" disabled={!consent||busy} onClick={startAssessment}>{t('Start assessment','开始反思','Mulakan penilaian')}<ArrowRight size={16}/></button><ButtonLink to="/individual/intake/profile" secondary>{t('Back to profile','返回资料','Kembali ke profil')}</ButtonLink></div>
      </div>:<>
        <div className="assessment-progress-row"><span aria-live="polite">{t(`Question ${questionIndex+1} of ${psychologyQuestions.length}`,`第 ${questionIndex+1} 题，共 ${psychologyQuestions.length} 题`,`Soalan ${questionIndex+1} daripada ${psychologyQuestions.length}`)}</span><button className="text-button" type="button" disabled={busy} onClick={clearAll}>{t('Clear all answers','清除所有回答','Padam semua jawapan')}</button></div>
        <div className="assessment-progress" role="progressbar" aria-label={t('Questionnaire progress','问卷进度','Kemajuan soal selidik')} aria-valuemin={1} aria-valuemax={psychologyQuestions.length} aria-valuenow={questionIndex+1}><span style={{width:`${((questionIndex+1)/psychologyQuestions.length)*100}%`}}/></div>
        <p className="assessment-situation">{copy(question.situation)}</p>
        <fieldset className="assessment-question">
          <legend>{copy(question.question)}</legend>
          <div className="assessment-options">{question.options.map(option=><label className={`assessment-option ${selected===option.id?'selected':''}`} key={option.id}>
            <input type="radio" name={`answer-${question.id}`} value={option.id} checked={selected===option.id} onChange={()=>chooseAnswer(option.id)}/>
            <span className="assessment-option-letter">{option.id}</span><span>{copy(option.label)}</span>
          </label>)}</div>
        </fieldset>
        {selected==='E'&&<Field label={t('Your response *','补充说明 *','Jawapan anda *')} hint={t('Please write a response, or skip this question.','请填写回答，或跳过此题。','Sila tulis jawapan atau langkau soalan ini.')}><textarea rows={4} maxLength={1200} required value={otherText} onChange={event=>writeOther(event.target.value)} aria-label={t('Other response','其他回答','Jawapan lain')}/></Field>}
        <p className="assessment-disclaimer">{t('This optional reflection helps personalize your learning experience. It is not a clinical or psychological diagnosis.','这项可选反思用于个性化你的学习体验，并非临床或心理诊断。','Refleksi pilihan ini membantu menyesuaikan pengalaman pembelajaran anda. Ini bukan diagnosis klinikal atau psikologi.')}</p>
        {error&&<ErrorState message={error}/>}
        <div className="assessment-actions"><button className="button secondary" type="button" disabled={busy} onClick={previous}><ArrowLeft size={16}/>{t('Previous','上一题','Sebelumnya')}</button><div className="assessment-next-actions">{selected&&<button className="text-button" type="button" disabled={busy} onClick={clearCurrentAnswer}>{t('Clear answer','清除回答','Padam jawapan')}</button>}<button className="text-button" type="button" disabled={busy} onClick={skipQuestion}>{t('Skip question','跳过此题','Langkau soalan')}</button><button className="button" type="button" disabled={busy||!canAdvanceAssessment(selected,otherText)} onClick={next}>{busy?t('Saving…','保存中…','Menyimpan…'):isLast?t('Save and continue','保存并继续','Simpan dan teruskan'):t('Next','下一题','Seterusnya')}<ArrowRight size={16}/></button></div></div>
      </>}
    </section>
    {!started&&error&&<ErrorState message={error}/>}
  </>;
}
