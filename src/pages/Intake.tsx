import {useState,useEffect,useRef} from 'react';
import {Link,useNavigate,useSearchParams} from 'react-router-dom';
import {CircleUserRound} from 'lucide-react';
import {useApp} from '../store';
import {sampleProfile,skillNames} from '../data';
import {api,isDemo} from '../services/api';
import {canAdvanceProfileQuestion,PROFILE_QUESTION_COUNT} from '../profileWizard';
import {editPersonalField,parseGoalTags,unconfirmedPersonalProfile,canConfirmPersonalProfile} from '../profilePersonalization';
import {PersonalProfileReview,WorkStyleInputs,workStyleSummary} from './PersonalProfile';
import {PageHeader,Stepper,ButtonLink,Field,DemoNotice,SkillChip,ErrorState,icons} from '../components';
import './intake-wizard.css';
const {ArrowRight,ArrowLeft,Check,GraduationCap,Building2,Compass,Leaf,BookOpen,X}=icons;
const stages=[['student','Student','在校学生','Pelajar'],['graduate','Recent graduate','应届毕业生','Graduan baharu'],['professional','Working professional','在职人士','Profesional bekerja'],['returning','Returning to work','重返职场','Kembali bekerja']] as const;
const goals=[['explore','Explore possibilities','探索职业方向','Teroka peluang'],['first-job','Find my first role','寻找第一份工作','Cari kerjaya pertama'],['switch','Change my career','转换职业方向','Tukar kerjaya'],['upskill','Grow in my field','提升现有职业','Tingkatkan kemahiran']] as const;
function IntakeSteps({current}:{current:number}){const {t}=useApp();return <Stepper current={current} steps={[t('Your direction','你的方向','Arah anda'),t('Your experience','你的经历','Pengalaman anda'),t('Review profile','确认画像','Semak profil')]}/>;}
function QuestionProgress({index}:{index:number}){
  const {t}=useApp();
  return <div className="question-progress" aria-live="polite">
    <span>{t(`Question ${index+1} of ${PROFILE_QUESTION_COUNT}`,`问卷进度：第 ${index+1} / ${PROFILE_QUESTION_COUNT} 题`,`Soalan ${index+1} daripada ${PROFILE_QUESTION_COUNT}`)}</span>
    <progress max={PROFILE_QUESTION_COUNT} value={index+1}/>
  </div>;
}
export function Intake(){
  const {state,t,copy}=useApp();const p=state.profile;const hasProfile=Boolean(p.occupation||p.education||p.experience||p.skills.length||p.interests||p.vision||p.goalTags?.length||p.preferences||Object.values(p.workStyle??{}).some(Boolean));const value=(text:string)=>text.trim()||t('Not provided yet','尚未填写','Belum diisi');
  const stage=stages.find(item=>item[0]===p.stage),goal=goals.find(item=>item[0]===p.goal);
  return <><PageHeader title={t('My profile','我的画像','Profil saya')} description={t('Review the information you have saved.','查看已保存的资料。','Semak maklumat tersimpan.')} action={<div className="profile-header-action"><DemoNotice/><div className="profile-avatar" role="img" aria-label={t('Default profile avatar','默认个人头像','Avatar profil lalai')}><CircleUserRound size={40} strokeWidth={1.4}/></div></div>}/>
    <section className="surface form-panel profile-overview"><div className="section-heading profile-overview-heading"><h2>{t('Profile overview','画像概览','Gambaran profil')}</h2>{hasProfile&&<Link className="button" to="/individual/intake/profile?edit=1">{t('Edit profile','编辑画像','Edit profil')}<ArrowRight size={16}/></Link>}</div>
      {!hasProfile?<div className="empty-inline"><p>{t('Your profile is still empty. Add your background, skills and interests when you’re ready.','画像尚为空白；准备好后可补充背景、技能和兴趣。','Profil anda masih kosong. Tambah latar belakang, kemahiran dan minat apabila sedia.')}</p><Link className="button" to="/individual/intake/start">{t('Create my profile','创建我的画像','Cipta profil saya')}<ArrowRight size={16}/></Link></div>
      :<><div className="department-detail profile-overview-details"><dl>
        <div className="profile-overview-row"><dt>{t('Current stage','当前阶段','Tahap semasa')}</dt><dd>{stage?t(stage[1],stage[2],stage[3]):value('')}</dd></div>
        <div className="profile-overview-row"><dt>{t('Career goal','职业目标','Matlamat kerjaya')}</dt><dd>{goal?t(goal[1],goal[2],goal[3]):value('')}</dd></div>
        <div className="profile-overview-row"><dt>{t('Current role / study','当前职业／专业','Jawatan / pengajian')}</dt><dd>{value(p.occupation)}</dd></div>
        <div className="profile-overview-row"><dt>{t('Education','教育背景','Pendidikan')}</dt><dd>{value(p.education)}</dd></div>
        <div className="profile-overview-row"><dt>{t('Experience','经历','Pengalaman')}</dt><dd>{value(p.experience)}</dd></div>
        <div className="profile-overview-row"><dt>{t('Skills','技能','Kemahiran')}</dt><dd>{p.skills.length?p.skills.map(s=>`${copy(skillNames[s.id]||[s.id,s.id,s.id])} · ${s.level}${s.confirmed?'':' · '+t('unconfirmed','待确认','belum disahkan')}`).join(', '):value('')}</dd></div>
        <div className="profile-overview-row"><dt>{t('Interests','兴趣','Minat')}</dt><dd>{value(p.interests)}</dd></div>
        <div className="profile-overview-row"><dt>{t('Future vision','未来愿景','Visi masa depan')}</dt><dd>{value(p.vision)}</dd></div>
        <div className="profile-overview-row"><dt>{t('Goal tags','目标标签','Tag matlamat')}</dt><dd>{value((p.goalTags??[]).join(' · '))}</dd></div>
        <div className="profile-overview-row"><dt>{t('Work style','工作方式','Gaya kerja')}</dt><dd>{value(workStyleSummary(p,t))}</dd></div>
        <div className="profile-overview-row"><dt>{t('Region','地区','Wilayah')}</dt><dd>{value(p.region)}</dd></div>
      </dl></div><p className="fine-print">{t('After an edit, refresh your matches. Career vision and work style are saved here but not scored by API v1.0 yet.','修改后请重新计算推荐。职业愿景与工作方式保存在此，但 API v1.0 尚未将其计入评分。','Selepas suntingan, kira semula padanan. Visi dan gaya kerja disimpan tetapi belum dinilai oleh API v1.0.')}</p></>}
    </section><div className="form-actions standalone"><Link className="button secondary" to="/individual">{t('My growth','我的成长','Pertumbuhan saya')}<ArrowRight size={16}/></Link></div></>;
}
export function IntakeStart(){
  const {state,setState,t}=useApp();
  const nav=useNavigate();
  const [question,setQuestion]=useState(0);
  const choose=(key:'stage'|'goal',value:string)=>setState(current=>({...current,profile:{...current.profile,[key]:value,sample:false},results:null}));
  const index=question;
  return <>
    <PageHeader title={t('Start where you are.','从现在的你，开始。','Mulakan dari sini.')} description={t('One question at a time. Your answers stay available as you move between steps.','一次只回答一题；前后切换时，已填内容会保留。','Satu soalan pada satu masa. Jawapan anda kekal apabila bertukar langkah.')} action={<DemoNotice/>}/>
    <IntakeSteps current={0}/>
    <form className="intake-surface surface question-panel" onSubmit={event=>{
      event.preventDefault();
      if(!canAdvanceProfileQuestion(state.profile,index))return;
      if(question===0)setQuestion(1);
      else nav('/individual/intake/profile');
    }}>
      <QuestionProgress index={index}/>
      {question===0?<fieldset>
        <legend>{t('Where are you in your journey?','你目前处于哪个阶段？','Di manakah anda dalam perjalanan ini?')}</legend>
        <p className="muted">{t('Choose the starting point that best fits you.','选择最符合你现状的起点。','Pilih titik mula yang paling sesuai untuk anda.')}</p>
        <div className="choice-grid">{stages.map(([value,en,zh,ms],choiceIndex)=>{
          const Icon=[BookOpen,GraduationCap,Building2,Leaf][choiceIndex];
          return <label className={`choice ${state.profile.stage===value?'chosen':''}`} key={value}>
            <input required type="radio" name="stage" value={value} checked={state.profile.stage===value} onChange={()=>choose('stage',value)}/>
            <Icon size={24} strokeWidth={1.4}/><strong>{t(en,zh,ms)}</strong>
            <span className="choice-check">{state.profile.stage===value&&<Check size={13}/>}</span>
          </label>;
        })}</div>
      </fieldset>:<fieldset>
        <legend>{t('What would you like to move toward?','你希望迈向什么目标？','Apakah matlamat anda?')}</legend>
        <div className="choice-grid compact">{goals.map(([value,en,zh,ms])=><label className={`choice ${state.profile.goal===value?'chosen':''}`} key={value}>
          <input required type="radio" name="goal" value={value} checked={state.profile.goal===value} onChange={()=>choose('goal',value)}/>
          <strong>{t(en,zh,ms)}</strong><span className="choice-check">{state.profile.goal===value&&<Check size={13}/>}</span>
        </label>)}</div>
      </fieldset>}
      <div className="form-actions">
        {question===0?<ButtonLink secondary to="/individual"><ArrowLeft size={16}/>{t('My growth','我的成长','Pertumbuhan saya')}</ButtonLink>
          :<button className="button secondary" type="button" onClick={()=>setQuestion(0)}><ArrowLeft size={16}/>{t('Previous question','上一题','Soalan sebelumnya')}</button>}
        <button className="button" type="submit" disabled={!canAdvanceProfileQuestion(state.profile,index)}>{t('Next question','下一题','Soalan seterusnya')}<ArrowRight size={16}/></button>
      </div>
    </form>
  </>;
}
export function ProfileInput(){
  const {state,setState,t,copy,toast}=useApp();
  const [draft,setDraft]=useState(()=>structuredClone(state.profile));
  const p=draft;
  const nav=useNavigate();
  const [query]=useSearchParams();
  const editing=query.get('edit')==='1';
  const [question,setQuestion]=useState(0);
  const [skill,setSkill]=useState('python');
  const [level,setLevel]=useState('beginner');
  const [fileError,setFileError]=useState('');
  const [fileName,setFileName]=useState('');
  const [cvText,setCvText]=useState('');
  const [goalTagText,setGoalTagText]=useState(()=>state.profile.goalTags?.join(', ')??'');
  const [syntheticConfirmed,setSyntheticConfirmed]=useState(false);
  const [fileSyntheticConfirmed,setFileSyntheticConfirmed]=useState(false);
  const [pasteNormalized,setPasteNormalized]=useState(false);
  const [normalizing,setNormalizing]=useState(false);
  const change=(key:string,value:unknown)=>{
    setPasteNormalized(false);
    setDraft(current=>{
      const field=key==='interests'?'interests':key==='vision'||key==='goalTags'?'vision':key==='preferences'||key==='workStyle'?'workStyle':null;
      return field?editPersonalField(current,field,{[key]:value}):{...current,[key]:value,sample:false};
    });
  };
  const questionIndex=editing?question:question+2;
  const canContinue=canAdvanceProfileQuestion(p,questionIndex);

  async function prepareReview(){
    setNormalizing(true);setFileError('');
    try{
      const normalized=pasteNormalized?p:await api.normalize(p);
      const interestSource=normalized.interests.trim()!==p.interests.trim()?'ai_draft':p.personalSources?.interests;
      setState(current=>({...current,profile:unconfirmedPersonalProfile({...normalized,personalSources:{...normalized.personalSources,interests:interestSource}}),results:null}));
      nav('/individual/intake/review');
    }catch(error){setFileError((error as Error).message);}
    finally{setNormalizing(false);}
  }

  async function upload(file:File|undefined){
    if(!file)return;
    setFileError('');setFileName(file.name);
    if(!fileSyntheticConfirmed){setFileError(t('Confirm this file is fictional before importing it.','导入前请先确认文件为虚构资料。','Sahkan fail ini rekaan sebelum mengimport.'));return;}
    if(file.size>5*1024*1024){setFileError(t('Use a file smaller than 5 MB.','请选择小于 5 MB 的文件。','Gunakan fail di bawah 5 MB.'));return;}
    if(!/\.txt$/i.test(file.name)){setFileError(t('Only synthetic TXT files are supported here.','此处只支持合成 TXT 文件。','Hanya fail TXT sintetik disokong di sini.'));return;}
    try{
      change('experience',await file.text());
      setQuestion(editing?4:2);
      toast(t('Text imported. Review it before continuing.','文字已导入，请核对后继续。','Teks diimport. Semak sebelum meneruskan.'));
    }catch{setFileError(t('This text file could not be read.','无法读取该文本文件。','Fail teks ini tidak dapat dibaca.'));}
  }

  async function pasteFromClipboard(){
    if(!syntheticConfirmed){setFileError(t('Confirm this CV is fictional before reading the clipboard.','读取剪贴板前，请先确认简历为虚构资料。','Sahkan CV ini rekaan sebelum membaca papan klip.'));return;}
    try{
      const text=await navigator.clipboard.readText();
      if(!text.trim())throw new Error('empty');
      setCvText(text);
      setFileError('');
      toast(t('Fictional CV text pasted. Review it before analyzing.','虚构简历文字已粘贴，请核对后解析。','Teks CV rekaan ditampal. Semak sebelum menganalisis.'));
    }catch{setFileError(t('Clipboard access is unavailable. Paste into the text box manually.','无法读取剪贴板，请直接粘贴到文本框。','Papan klip tidak tersedia. Tampal terus ke dalam kotak teks.'));}
  }

  async function analyzePasted(){
    const text=cvText.trim();
    if(!syntheticConfirmed){setFileError(t('Confirm this CV is fictional before importing it.','请先确认这份简历为虚构资料。','Sahkan CV ini rekaan sebelum mengimport.'));return;}
    if(text.length<20||text.length>20000){setFileError(t('Use 20 to 20,000 characters of fictional CV text.','请粘贴 20 至 20,000 字符的虚构简历文字。','Gunakan 20 hingga 20,000 aksara teks CV rekaan.'));return;}
    setNormalizing(true);setFileError('');
    try{
      if(isDemo){
        change('experience',text);
        setQuestion(editing?4:2);
        toast(t('Text imported locally. AI parsing is available only with the connected service.','文字已在本地导入；智能解析仅在连接服务模式可用。','Teks diimport secara setempat. Analisis AI memerlukan perkhidmatan bersambung.'));
      }else{
        const normalized=await api.normalizeSyntheticText({...p,experience:text},text);
        setDraft(unconfirmedPersonalProfile({...normalized,sample:false,personalSources:{...normalized.personalSources,interests:'ai_draft'}}));
        setGoalTagText(normalized.goalTags?.join(', ')??'');
        setPasteNormalized(true);
        setQuestion(0);
        toast(t('Text analyzed. Review each answer before confirming.','文字已解析，请逐题核对后确认。','Teks dianalisis. Semak setiap jawapan sebelum mengesahkan.'));
      }
    }catch(error){setFileError((error as Error).message);}
    finally{setNormalizing(false);}
  }

  const questions=[
    ...(editing?[
      <fieldset key="stage"><legend>{t('Where are you in your journey?','你目前处于哪个阶段？','Di manakah anda dalam perjalanan ini?')}</legend><div className="choice-grid">{stages.map(([value,en,zh,ms])=><label className={`choice ${p.stage===value?'chosen':''}`} key={value}><input required type="radio" name="edit-stage" value={value} checked={p.stage===value} onChange={()=>change('stage',value)}/><strong>{t(en,zh,ms)}</strong><span className="choice-check">{p.stage===value&&<Check size={13}/>}</span></label>)}</div></fieldset>,
      <fieldset key="goal"><legend>{t('What would you like to move toward?','你希望迈向什么目标？','Apakah matlamat anda?')}</legend><div className="choice-grid compact">{goals.map(([value,en,zh,ms])=><label className={`choice ${p.goal===value?'chosen':''}`} key={value}><input required type="radio" name="edit-goal" value={value} checked={p.goal===value} onChange={()=>change('goal',value)}/><strong>{t(en,zh,ms)}</strong><span className="choice-check">{p.goal===value&&<Check size={13}/>}</span></label>)}</div></fieldset>,
    ]:[]),
    <Field label={t('Current role or area of study *','当前职业或专业 *','Jawatan atau bidang pengajian *')} key="occupation"><input required autoFocus value={p.occupation} onChange={e=>change('occupation',e.target.value)} placeholder={t('e.g. Business analytics student','如：商业分析专业学生','cth. Pelajar analitik perniagaan')}/></Field>,
    <Field label={t('Education / qualifications *','教育背景／资格 *','Pendidikan / kelayakan *')} key="education"><input required autoFocus value={p.education} onChange={e=>change('education',e.target.value)} placeholder={t('Degree, diploma, certification…','学位、文凭、证书等','Ijazah, diploma, sijil…')}/></Field>,
    <Field label={t('Projects and experience','项目与经历','Projek dan pengalaman')} hint={t('Study projects, work, volunteering or a career break.','可填写课程项目、工作、志愿活动或职业间歇。','Projek, kerja, sukarelawan atau rehat kerjaya.')} key="experience"><textarea rows={6} autoFocus value={p.experience} onChange={e=>change('experience',e.target.value)}/></Field>,
    <div key="skills"><Field label={t('Skills you already bring','你已具备的技能','Kemahiran sedia ada')}><div className="skill-input-row"><select aria-label={t('Skill','技能','Kemahiran')} value={skill} onChange={e=>setSkill(e.target.value)}>{Object.entries(skillNames).map(([id,c])=><option key={id} value={id}>{copy(c)}</option>)}</select><select aria-label={t('Confidence level','熟练程度','Tahap kemahiran')} value={level} onChange={e=>setLevel(e.target.value)}><option value="beginner">{t('Beginner','入门','Pemula')}</option><option value="intermediate">{t('Intermediate','中等','Pertengahan')}</option><option value="advanced">{t('Advanced','熟练','Mahir')}</option></select><button type="button" className="button secondary" disabled={p.skills.some(s=>s.id===skill)} onClick={()=>change('skills',[...p.skills,{id:skill,level,source:'manual',confirmed:true}])}>{t('Add skill','添加技能','Tambah')}</button></div></Field><div className="skill-row">{p.skills.map(s=><span className="editable-chip" key={s.id}>{copy(skillNames[s.id]||[s.id,s.id,s.id])}<button type="button" aria-label={`${t('Remove','移除','Buang')} ${s.id}`} onClick={()=>change('skills',p.skills.filter(x=>x.id!==s.id))}><X size={13}/></button></span>)}</div></div>,
    <Field label={t('Interests (optional)','兴趣（选填）','Minat (pilihan)')} hint={t('Tell us yourself. A CV never decides your interests.','请自行填写；简历不会替你决定兴趣。','Nyatakan sendiri; CV tidak menentukan minat anda.')} key="interests"><input autoFocus value={p.interests} onChange={e=>change('interests',e.target.value)} placeholder={t('e.g. Technology, education, green energy','如：科技、教育、绿色能源','cth. Teknologi, pendidikan, tenaga hijau')}/></Field>,
    <div key="vision"><Field label={t('Your future vision (optional)','职业愿景（选填）','Visi masa depan (pilihan)')}><textarea rows={4} autoFocus value={p.vision} onChange={e=>change('vision',e.target.value)} placeholder={t('What would a fulfilling next chapter look like?','你期待的下一段职业生活是什么样的？','Apakah bab kerjaya yang anda inginkan?')}/></Field><Field label={t('Goal tags for future matching (optional)','未来匹配用的目标标签（选填）','Tag matlamat untuk padanan masa depan (pilihan)')} hint={t('Choose and edit your own tags, separated by commas. Not used in the current API v1.0 score.','自行选择或编辑标签，用逗号分隔；当前 API v1.0 评分尚未使用。','Pilih dan sunting tag sendiri, dipisahkan dengan koma. Belum digunakan dalam skor API v1.0.')}><input value={goalTagText} onChange={e=>{setGoalTagText(e.target.value);change('goalTags',parseGoalTags(e.target.value));}} placeholder={t('e.g. Learning, social impact','如：持续学习、社会影响','cth. Pembelajaran, impak sosial')}/></Field><div className="goal-tag-suggestions">{[t('Continuous learning','持续学习','Pembelajaran berterusan'),t('Social impact','社会影响','Impak sosial'),t('Career stability','职业稳定','Kestabilan kerjaya')].map(tag=><button className="button secondary" type="button" key={tag} onClick={()=>{const next=parseGoalTags([...parseGoalTags(goalTagText),tag].join(', '));setGoalTagText(next.join(', '));change('goalTags',next);}}>{tag}</button>)}</div></div>,
    <WorkStyleInputs key="preferences" value={p.workStyle} note={p.preferences} onChange={(style,note)=>{if(style)change('workStyle',style);else change('preferences',note??'');}}/>,
    <Field label={t('MBTI (optional)','MBTI（选填）','MBTI (pilihan)')} hint={t('Exploration only; never an eligibility filter.','仅用于自我探索，不作为资格筛选。','Untuk penerokaan, bukan penapis kelayakan.')} key="mbti"><select value={p.mbti} onChange={e=>change('mbti',e.target.value)}><option value="">{t('Prefer not to say','暂不填写','Tidak mahu berkongsi')}</option>{['INTJ','INTP','ENTJ','ENTP','INFJ','INFP','ENFJ','ENFP','ISTJ','ISFJ','ESTJ','ESFJ','ISTP','ISFP','ESTP','ESFP'].map(v=><option key={v}>{v}</option>)}</select></Field>,
    <Field label={t('Career region','职业地区','Wilayah kerjaya')} key="region"><select value={p.region} onChange={e=>change('region',e.target.value)}><option>Malaysia</option><option>Singapore</option><option>Global / remote</option></select></Field>,
  ];

  return <>
    <PageHeader title={editing?t('Edit my profile','编辑我的画像','Edit profil saya'):t('There’s more to you than a job title.','你，不止一个职业标签。','Anda lebih daripada jawatan.')} description={t('Answer one question at a time. You can return to any earlier answer.','一次只填写一题；可以返回修改已填内容。','Jawab satu soalan pada satu masa. Anda boleh kembali menyunting jawapan.')} action={<DemoNotice/>}/>
    <IntakeSteps current={editing?0:1}/>
    {fileError&&<ErrorState message={fileError}/>}
    <div className="profile-layout">
      <form className="surface form-panel question-panel" onSubmit={event=>{
        event.preventDefault();
        if(!canContinue)return;
        if(question<questions.length-1)setQuestion(current=>current+1);
        else void prepareReview();
      }}>
        <QuestionProgress index={questionIndex}/>
        <span className="subtle-tag">{t('Synthetic inputs only','仅使用合成资料','Input sintetik sahaja')}</span>
        <div className="question-body" key={question}>{questions[question]}</div>
        <div className="form-actions">
          {question===0?<ButtonLink secondary to={editing?'/individual/intake':'/individual/intake/start'}><ArrowLeft size={16}/>{editing?t('Back to profile','返回画像','Kembali ke profil'):t('Previous question','上一题','Soalan sebelumnya')}</ButtonLink>
            :<button className="button secondary" type="button" onClick={()=>setQuestion(current=>current-1)}><ArrowLeft size={16}/>{t('Previous question','上一题','Soalan sebelumnya')}</button>}
          <button className="button" type="submit" disabled={!canContinue||normalizing}>{question===questions.length-1?t('Review my profile','核对我的画像','Semak profil saya'):t('Next question','下一题','Soalan seterusnya')}<ArrowRight size={16}/></button>
        </div>
      </form>
      <aside className="profile-aside">
        <div className="sample-cv"><div className="sample-paper"><span/><span/><span/><div/><span/><span/></div><h3>{t('Try a fresh perspective','先试一次，发现可能','Cuba perspektif baharu')}</h3><p>{t('Explore with a fictional graduate’s profile. Every field stays editable.','使用虚构毕业生资料体验流程，所有字段均可编辑。','Teroka dengan profil graduan rekaan. Semua medan boleh diedit.')}</p><button type="button" className="button secondary" onClick={()=>{setDraft({...structuredClone(sampleProfile),stage:p.stage||'graduate',goal:p.goal||'explore'});setGoalTagText(sampleProfile.goalTags?.join(', ')??'');setPasteNormalized(false);setQuestion(0);toast(t('Sample CV loaded','示例简历已载入','CV contoh dimuatkan'));}}>{t('Use sample CV','使用示例简历','Guna CV contoh')}</button></div>
        <div className="upload-box"><BookOpen size={22}/><h3>{t('Have a synthetic CV file?','已有合成简历文件？','Ada fail CV sintetik?')}</h3><label className="paste-consent"><input type="checkbox" checked={fileSyntheticConfirmed} onChange={event=>setFileSyntheticConfirmed(event.target.checked)}/>{t('I confirm this file is fictional.','我确认该文件为虚构资料。','Saya mengesahkan fail ini rekaan.')}</label><label className="button secondary upload-label">{t('Choose a file','选择文件','Pilih fail')}<input type="file" accept=".txt,text/plain" disabled={!fileSyntheticConfirmed} onChange={event=>void upload(event.target.files?.[0])}/></label><small>{t('Synthetic TXT only · ≤ 5 MB. PDF/DOCX will be available after the protected backend upload is connected.','目前仅支持合成 TXT · ≤ 5 MB。PDF/DOCX 待受保护的后端上传接通后开放。','TXT sintetik sahaja · ≤ 5 MB. PDF/DOCX akan tersedia selepas muat naik backend selamat disambungkan.')}</small>{fileName&&<p>{fileName}</p>}</div>
        <div className="paste-cv"><h3>{t('Paste a fictional text CV','粘贴虚构的文字简历','Tampal CV teks rekaan')}</h3><p>{t('Use a fictional CV only. Never paste real personal information.','仅限虚构简历，请勿粘贴真实个人资料。','Gunakan CV rekaan sahaja. Jangan tampal maklumat peribadi sebenar.')}</p><button type="button" className="button secondary" onClick={()=>void pasteFromClipboard()}>{t('Paste from clipboard','一键粘贴','Tampal dari papan klip')}</button><textarea aria-label={t('Fictional CV text','虚构简历文字','Teks CV rekaan')} value={cvText} onChange={event=>setCvText(event.target.value)} rows={6} placeholder={t('Paste fictional CV text here…','在这里粘贴虚构简历文字…','Tampal teks CV rekaan di sini…')}/><label className="paste-consent"><input type="checkbox" checked={syntheticConfirmed} onChange={event=>setSyntheticConfirmed(event.target.checked)}/>{t('I confirm this CV is fictional.','我确认这份简历为虚构资料。','Saya mengesahkan CV ini rekaan.')}</label><button type="button" className="button" disabled={normalizing||!syntheticConfirmed||!cvText.trim()} onClick={()=>void analyzePasted()}>{normalizing?t('Analyzing…','解析中…','Menganalisis…'):isDemo?t('Import text (demo)','导入文字（演示）','Import teks (demo)'):t('Analyze text with AI','智能解析文字','Analisis teks dengan AI')}</button><small>{isDemo?t('Demo mode imports text locally; it does not call AI.','演示模式只在本地导入文字，不调用 AI。','Mod demo mengimport teks secara setempat tanpa AI.'):t('The connected profile service extracts a draft for you to review; no profile is confirmed automatically.','连接的画像服务会提取待核对草稿，不会自动确认画像。','Perkhidmatan profil mengekstrak draf untuk anda semak; profil tidak disahkan secara automatik.')}</small></div>
        <p className="aside-note">{t('In demo mode, your information stays on this device.','演示模式下资料仅保存在当前设备。','Dalam mod demo, maklumat anda kekal pada peranti ini.')}</p>
      </aside>
    </div>
  </>;
}
export function ProfileReview(){
  const {state,setState,t,copy}=useApp();const [busy,setBusy]=useState(false),[error,setError]=useState('');const nav=useNavigate();const p=state.profile;
  const pending=p.skills.filter(s=>!s.confirmed).length;
  async function submit(){
    if(!canConfirmPersonalProfile(p)){setError(t('Confirm each provided interest, vision and work-style answer first.','请先确认已填写的兴趣、愿景和工作方式。','Sahkan minat, visi dan gaya kerja yang diisi dahulu.'));return;}
    setBusy(true);setError('');
    try {
      // Normalization already happened before this review page; only reviewed skills are submitted.
      const profile=await api.confirm(p);
      setState(s=>({...s,profile}));nav('/individual/analyzing');
    }catch(e){setError((e as Error).message);}finally{setBusy(false);}
  }
  const update=(key:string,value:string)=>setState(s=>({...s,profile:{...s.profile,[key]:value,sample:false},results:null}));
  return <><PageHeader title={t('Does this feel like you?','这份画像，像你吗？','Adakah ini menggambarkan anda?')} description={t('You know yourself best. Review your profile before we explore the possibilities.','你最了解自己。先核对画像，再探索职业可能。','Anda paling mengenali diri anda. Semak profil sebelum meneroka peluang.')} action={<DemoNotice/>}/><IntakeSteps current={2}/>{!isDemo&&<p className="muted">{t('To change background or interests, return to Edit profile and normalize again.','若要修改背景或兴趣，请返回“编辑资料”并重新规范化。','Untuk ubah latar belakang atau minat, kembali dan normalkan semula.')}</p>}{!isDemo&&!p.id&&<ErrorState message={t('Normalize this profile before confirmation. Return to the profile form and continue again.','确认前请先规范化画像。请返回资料表单并再次继续。','Normalkan profil sebelum pengesahan. Kembali ke borang dan teruskan semula.')}/>} {error&&<ErrorState message={error} retry={submit}/>}<div className="review-grid"><section className="surface form-panel"><h2>{t('Background','背景经历','Latar belakang')}</h2><Field label={t('Role / study','职业／专业','Jawatan / pengajian')}><input value={p.occupation} readOnly={!isDemo} onChange={e=>update('occupation',e.target.value)}/></Field><Field label={t('Education','教育背景','Pendidikan')}><input value={p.education} readOnly={!isDemo} onChange={e=>update('education',e.target.value)}/></Field><Field label={t('Experience','相关经历','Pengalaman')}><textarea value={p.experience} readOnly={!isDemo} onChange={e=>update('experience',e.target.value)}/></Field></section><section className="surface form-panel"><div className="section-heading"><h2>{t('Skills & strengths','技能与优势','Kemahiran & kekuatan')}</h2><button className="text-button" disabled={!pending} onClick={()=>setState(s=>({...s,profile:{...s.profile,skills:s.profile.skills.map(x=>({...x,confirmed:!isDemo&&x.backendSupported===false?false:true}))}}))}>{t('Confirm all','全部确认','Sahkan semua')}</button></div><p className="muted">{t('Confirm each extracted or inferred skill. You can change its level or remove it.','请逐项确认提取或推断的技能，可以调整等级或移除。','Sahkan setiap kemahiran yang diekstrak. Ubah tahap atau buangnya.')}</p>{p.skills.length===0&&<p>{t('No skills added. Add skills to improve the profile.','尚未添加技能，可返回补充。','Tiada kemahiran. Tambah untuk melengkapkan profil.')}</p>}{p.skills.map(s=><div className="review-skill" key={s.id}><div><SkillChip id={s.id}/><small>{s.source==='manual'?t('Self-reported','自行填写','Dilaporkan sendiri'):s.source==='inferred'?t('Inferred · please verify','推断信息 · 请核实','Inferens · sila sahkan'):t('Extracted from sample CV','从示例简历提取','Daripada CV contoh')} · {!isDemo&&s.backendSupported===false?t('Not in service catalogue; remove before continuing','不在服务技能目录中；请移除后继续','Tiada dalam katalog perkhidmatan; buang dahulu')+' · ':''}{s.confidence!==undefined?t(`Confidence ${Math.round(s.confidence*100)}%`,`置信度 ${Math.round(s.confidence*100)}%`,`Keyakinan ${Math.round(s.confidence*100)}%`):t('Confidence unavailable','置信度未知','Keyakinan tiada')}</small></div><select aria-label={`${copy(skillNames[s.id]||[s.id,s.id,s.id])} ${t('level','等级','tahap')}`} value={s.level} onChange={e=>setState(v=>({...v,profile:{...v.profile,sample:false,skills:v.profile.skills.map(x=>x.id===s.id?{...x,level:e.target.value}:x)}}))}><option value="beginner">{t('Beginner','入门','Pemula')}</option><option value="intermediate">{t('Intermediate','中等','Pertengahan')}</option><option value="advanced">{t('Advanced','熟练','Mahir')}</option></select><button className={`icon-button confirm-skill ${s.confirmed?'confirmed':''}`} disabled={!isDemo&&s.backendSupported===false} aria-label={`${t('Confirm','确认','Sahkan')} ${s.id}`} onClick={()=>setState(v=>({...v,profile:{...v.profile,skills:v.profile.skills.map(x=>x.id===s.id?{...x,confirmed:!x.confirmed}:x)}}))}><Check size={18}/></button><button aria-label={`${t('Remove','移除','Buang')} ${s.id}`} className="icon-button" onClick={()=>setState(v=>({...v,profile:{...v.profile,sample:false,skills:v.profile.skills.filter(x=>x.id!==s.id)}}))}><X size={16}/></button></div>)}</section><PersonalProfileReview profile={p} onConfirm={field=>setState(current=>({...current,profile:{...current.profile,personalConfirmed:{...current.profile.personalConfirmed,[field]:true}}}))}/></div><div className="form-actions standalone"><ButtonLink to="/individual/intake/profile?edit=1" secondary><ArrowLeft size={16}/>{t('Edit profile','编辑资料','Edit profil')}</ButtonLink><span className="muted">{pending?t(`${pending} skills to confirm`,`${pending} 项技能待确认`,`${pending} kemahiran perlu disahkan`):t('Your profile, confirmed by you.','这份画像，由你确认。','Profil anda, disahkan oleh anda.')}</span><button className="button" disabled={busy||(!isDemo&&!p.id)||pending>0||!p.occupation.trim()||!p.education.trim()||!canConfirmPersonalProfile(p)} onClick={submit}>{busy?t('Saving…','保存中…','Menyimpan…'):t('Explore my matches','查看我的职业推荐','Teroka padanan saya')}<ArrowRight size={16}/></button></div></>;
}
export function Analyzing(){
  const {state,setState,t}=useApp();const [stage,setStage]=useState(0),[error,setError]=useState(''),[attempt,setAttempt]=useState(0);const nav=useNavigate();const input=useRef(state);
  useEffect(()=>{let active=true;async function run(){try{setStage(0);setError('');const profile=input.current.profile;setStage(1);const trends=await api.trends();if(!active)return;setStage(2);const recommendation=await api.recommendDetailed(profile,input.current.scenario,input.current.selectedRole,trends.snapshotId);if(!active)return;setState(s=>({...s,profile,results:recommendation.results,snapshotId:trends.snapshotId,serviceMeta:recommendation.meta,trendPackage:trends}));setStage(3);}catch(e){if(active)setError((e as Error).message);}}run();return()=>{active=false;};},[attempt,setState]);
  const labels=[t('Profile prepared','准备技能画像','Profil disediakan'),t('Trend package loaded','读取趋势数据包','Pakej trend dimuatkan'),t('Career matches ready','准备职业推荐','Padanan kerjaya tersedia')];
  return <><PageHeader title={t('Connecting the possibilities.','连接，你的职业可能。','Menghubungkan peluang.')} description={isDemo?t('Loading the synthetic profile and demonstration responses. No AI service is being simulated.','正在读取合成资料与演示响应，此过程不代表真实 AI 分析。','Memuatkan profil sintetik dan respons demo, bukan simulasi perkhidmatan AI.'):t('We’ll show the result of each service request as it completes.','每个服务请求完成后，都会更新当前状态。','Status dikemas kini selepas setiap permintaan selesai.')}/><div className="analysis-panel surface"><Compass size={46} strokeWidth={1}/><h2>{stage===3?t('Ready for your next chapter.','你的下一章，已准备就绪。','Sedia untuk bab seterusnya.'):t('Bringing your profile into focus','让你的画像更加清晰','Memahami profil anda')}</h2><ol className="analysis-steps">{labels.map((l,i)=><li key={i} className={stage>i?'done':''}><span>{stage>i?<Check size={17}/>:i+1}</span>{l}<small>{stage>i?t('Complete','已完成','Selesai'):stage===i?t('In progress','进行中','Sedang diproses'):t('Waiting','等待中','Menunggu')}</small></li>)}</ol>{error?<ErrorState message={error} retry={()=>setAttempt(n=>n+1)}/>:stage===3?<button className="button" onClick={()=>nav('/individual/recommendations')}>{t('See my career matches','查看职业推荐','Lihat padanan kerjaya')}<ArrowRight size={16}/></button>:<div className="loading-bar" role="status">{t('Working…','处理中…','Memproses…')}</div>}<DemoNotice/></div></>;
}
