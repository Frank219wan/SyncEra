import {useState} from 'react';
import {useNavigate} from 'react-router-dom';
import {PageHeader,DemoNotice,Field,icons} from '../components';
import {sampleProfile,skillNames} from '../data';
import {useApp} from '../store';
import type {Profile,Skill} from '../types';

const {ArrowRight,ArrowLeft,X}=icons;
const stages=[['student','Student','在校学生','Pelajar'],['graduate','Recent graduate','应届毕业生','Graduan baharu'],['professional','Working professional','在职人士','Profesional bekerja'],['returning','Returning to work','重返职场','Kembali bekerja']] as const;
const goals=[['explore','Explore possibilities','探索职业方向','Teroka peluang'],['first-job','Find my first role','寻找第一份工作','Cari kerjaya pertama'],['switch','Change my career','转换职业方向','Tukar kerjaya'],['upskill','Grow in my field','提升现有职业','Tingkatkan kemahiran']] as const;

export function ProfileEdit(){
  const {state,setState,t,copy,toast}=useApp();
  const nav=useNavigate();
  const [draft,setDraft]=useState<Profile>(()=>structuredClone(state.profile));
  const [skill,setSkill]=useState('python');
  const [level,setLevel]=useState('beginner');
  const [fileError,setFileError]=useState('');
  const [fileName,setFileName]=useState('');
  const change=<K extends keyof Profile>(key:K,value:Profile[K])=>setDraft(current=>({...current,[key]:value,sample:false}));
  const skills=(value:Skill[])=>change('skills',value);
  async function upload(file?:File){
    if(!file)return;
    setFileError('');setFileName(file.name);
    if(file.size>5*1024*1024){setFileError(t('Use a file smaller than 5 MB.','请选择小于 5 MB 的文件。','Gunakan fail di bawah 5 MB.'));return;}
    if(!/\.txt$/i.test(file.name)){setFileError(t('PDF and DOCX extraction requires the profile service. Use a TXT file or the form here.','PDF 和 DOCX 提取需要画像服务。请使用 TXT 文件或此表单。','PDF dan DOCX memerlukan perkhidmatan profil. Gunakan TXT atau borang ini.'));return;}
    change('experience',await file.text());
  }
  function save(){
    const changed=JSON.stringify(draft)!==JSON.stringify(state.profile);
    setState(current=>changed?({...current,profile:{...draft,revision:(current.profile.revision||0)+1},results:null,plan:current.plan?{...current.plan,revisionPending:true}:null}):current);
    toast(changed?t('Profile saved. Calculate matches from your current information.','画像已保存；请根据当前资料重新计算职业推荐。','Profil disimpan. Kira padanan daripada maklumat semasa.'):t('Profile unchanged.','画像未作修改。','Profil tidak berubah.'));
    nav('/individual/intake');
  }
  const source=state.profile;
  return <><PageHeader title={t('Edit my profile','编辑我的画像','Edit profil saya')} description={t('Review each field, then save your changes.','核对各项资料后再保存。','Semak setiap medan sebelum menyimpan.')} action={<DemoNotice/>}/><div className="profile-layout"><form className="surface form-panel" onSubmit={event=>{event.preventDefault();save();}}>
    <fieldset><legend>{t('Current stage','当前阶段','Tahap semasa')}</legend><div className="choice-grid">{stages.map(([id,en,zh,ms])=><label className={`choice ${draft.stage===id?'chosen':''}`} key={id}><input required type="radio" name="stage" checked={draft.stage===id} onChange={()=>change('stage',id)}/><strong>{t(en,zh,ms)}</strong></label>)}</div></fieldset>
    <fieldset><legend>{t('Career goal','职业目标','Matlamat kerjaya')}</legend><div className="choice-grid compact">{goals.map(([id,en,zh,ms])=><label className={`choice ${draft.goal===id?'chosen':''}`} key={id}><input required type="radio" name="goal" checked={draft.goal===id} onChange={()=>change('goal',id)}/><strong>{t(en,zh,ms)}</strong></label>)}</div></fieldset>
    <div className="section-heading"><h2>{t('Your background','你的背景','Latar belakang anda')}</h2><span className="subtle-tag">{t('Synthetic inputs only','仅使用合成资料','Input sintetik sahaja')}</span></div>
    <div className="field-grid"><Field label={t('Current role or area of study *','当前职业或专业 *','Jawatan atau bidang pengajian *')}><input required value={draft.occupation} onChange={e=>change('occupation',e.target.value)}/></Field><Field label={t('Education / qualifications *','教育背景／资格 *','Pendidikan / kelayakan *')}><input required value={draft.education} onChange={e=>change('education',e.target.value)}/></Field></div>
    <Field label={t('Projects and experience','项目与经历','Projek dan pengalaman')}><textarea rows={3} value={draft.experience} onChange={e=>change('experience',e.target.value)}/></Field>
    <h2 className="form-section-title">{t('Skills you already bring','你已具备的技能','Kemahiran sedia ada')}</h2><div className="skill-input-row"><Field label={t('Skill','技能','Kemahiran')}><select value={skill} onChange={e=>setSkill(e.target.value)}>{Object.entries(skillNames).map(([id,name])=><option key={id} value={id}>{copy(name)}</option>)}</select></Field><Field label={t('Confidence level','熟练程度','Tahap kemahiran')}><select value={level} onChange={e=>setLevel(e.target.value)}><option value="beginner">{t('Beginner','入门','Pemula')}</option><option value="intermediate">{t('Intermediate','中等','Pertengahan')}</option><option value="advanced">{t('Advanced','熟练','Mahir')}</option></select></Field><button type="button" className="button secondary" disabled={draft.skills.some(item=>item.id===skill)} onClick={()=>skills([...draft.skills,{id:skill,level,source:'manual',confirmed:true}])}>{t('Add skill','添加技能','Tambah')}</button></div>
    <div className="skill-row">{draft.skills.map(item=><span className="editable-chip" key={item.id}>{copy(skillNames[item.id]||[item.id,item.id,item.id])}<button type="button" aria-label={`${t('Remove','移除','Buang')} ${item.id}`} onClick={()=>skills(draft.skills.filter(other=>other.id!==item.id))}><X size={13}/></button></span>)}</div>
    <h2 className="form-section-title">{t('What matters to you','你在意什么','Apa yang penting bagi anda')}</h2><Field label={t('Interests and industries *','兴趣与行业偏好 *','Minat dan industri *')}><input required value={draft.interests} onChange={e=>change('interests',e.target.value)}/></Field><Field label={t('Your future vision *','未来愿景 *','Visi masa depan *')}><textarea required rows={2} value={draft.vision} onChange={e=>change('vision',e.target.value)}/></Field>
    <div className="field-grid"><Field label={t('Work preferences (optional)','工作偏好（选填）','Keutamaan kerja (pilihan)')}><input value={draft.preferences} onChange={e=>change('preferences',e.target.value)}/></Field><Field label={t('MBTI (optional)','MBTI（选填）','MBTI (pilihan)')}><select value={draft.mbti} onChange={e=>change('mbti',e.target.value)}><option value="">{t('Prefer not to say','暂不填写','Tidak mahu berkongsi')}</option>{['INTJ','INTP','ENTJ','ENTP','INFJ','INFP','ENFJ','ENFP','ISTJ','ISFJ','ESTJ','ESFJ','ISTP','ISFP','ESTP','ESFP'].map(id=><option key={id}>{id}</option>)}</select></Field></div>
    <Field label={t('Career region','职业地区','Wilayah kerjaya')}><select value={draft.region} onChange={e=>change('region',e.target.value)}><option>Malaysia</option><option>Singapore</option><option>Global / remote</option></select></Field>
    <div className="form-actions"><button type="button" className="button secondary" onClick={()=>nav('/individual/intake')}><ArrowLeft size={16}/>{t('Cancel','取消','Batal')}</button><button className="button" type="submit">{t('Save profile','保存画像','Simpan profil')}<ArrowRight size={16}/></button></div>
  </form><aside className="profile-aside"><div className="sample-cv"><h3>{t('Try a fresh perspective','先试一次，发现可能','Cuba perspektif baharu')}</h3><p>{t('Load a fictional graduate profile into this draft.','把虚构毕业生画像载入当前草稿。','Muat profil graduan rekaan ke dalam draf ini.')}</p><button type="button" className="button secondary" onClick={()=>setDraft({...structuredClone(sampleProfile),stage:draft.stage||'graduate',goal:draft.goal||'explore'})}>{t('Use sample CV','使用示例简历','Guna CV contoh')}</button></div><div className="upload-box"><h3>{t('Have a synthetic CV?','已有合成简历？','Ada CV sintetik?')}</h3><label className="button secondary upload-label">{t('Choose a file','选择文件','Pilih fail')}<input type="file" accept=".txt,.pdf,.docx" onChange={e=>void upload(e.target.files?.[0])}/></label>{fileName&&<p>{fileName}</p>}{fileError&&<p className="field-error" role="alert">{fileError}</p>}</div><p className="aside-note">{t('Changes are saved only when you press Save profile.','只有按下“保存画像”才会写入修改。','Perubahan disimpan hanya apabila anda menekan Simpan profil.')}{source.sample?' · '+t('Current saved profile uses a synthetic example.','当前已保存画像使用合成示例。','Profil tersimpan menggunakan contoh sintetik.'):''}</p></aside></div></>;
}
