import type {Profile} from '../types';
import type {PersonalField} from '../profilePersonalization';
import {hasPersonalValue} from '../profilePersonalization';
import {Field} from '../components';
import {useApp} from '../store';

type WorkStyle=NonNullable<Profile['workStyle']>;
type Translate=(en:string,zh:string,ms:string)=>string;
const dimensions=[
  {key:'collaboration',label:['Collaboration','协作程度','Kerjasama'],options:[['solo','Prefer independent work','偏好独立完成','Lebih suka kerja sendiri'],['balanced','A mix of independent and team work','独立与协作兼顾','Gabungan kerja sendiri dan pasukan'],['team','Prefer close collaboration','偏好紧密协作','Lebih suka kerjasama rapat']]},
  {key:'pace',label:['Work pace','工作节奏','Rentak kerja'],options:[['steady','Steady pace','稳定节奏','Rentak stabil'],['varied','Varied pace','节奏多变','Rentak pelbagai'],['fast','Fast pace','较快节奏','Rentak pantas']]},
  {key:'structure',label:['Structure','结构化程度','Struktur'],options:[['flexible','Flexible exploration','灵活探索','Penerokaan fleksibel'],['balanced','A balance of structure and freedom','结构与自主兼顾','Seimbang struktur dan kebebasan'],['structured','Clear plans and steps','清晰计划与步骤','Pelan dan langkah jelas']]},
] as const;

export function workStyleSummary(profile: Profile,t:Translate): string {
  const selected=dimensions.flatMap(dimension=>{
    const option=dimension.options.find(item=>item[0]===profile.workStyle?.[dimension.key]);
    return option?[t(...option.slice(1) as [string,string,string])]:[];
  });
  if(profile.preferences.trim())selected.push(profile.preferences.trim());
  return selected.join(' · ');
}

export function WorkStyleInputs({value,note,onChange}:{value:Profile['workStyle'];note:string;onChange:(style:WorkStyle|null,note?:string)=>void}) {
  const {t}=useApp();
  return <div className="work-style-inputs">
    <h2>{t('Your work style (optional self-assessment)','你的工作方式（选填自评）','Gaya kerja anda (penilaian sendiri pilihan)')}</h2>
    <p className="muted">{t('Choose what feels right today. Nothing is inferred from your CV or MBTI, and these choices are not job filters.','请按自己的感受选择；不从简历或 MBTI 推断，也不作为岗位筛选条件。','Pilih sendiri; tidak disimpulkan daripada CV atau MBTI dan bukan penapis kerjaya.')}</p>
    <div className="work-style-grid">{dimensions.map(dimension=><Field key={dimension.key} label={t(dimension.label[0],dimension.label[1],dimension.label[2])}><select value={value?.[dimension.key]??''} onChange={event=>onChange({...{collaboration:'',pace:'',structure:''},...value,[dimension.key]:event.target.value})}><option value="">{t('Not provided','暂不填写','Tidak diisi')}</option>{dimension.options.map(option=><option value={option[0]} key={option[0]}>{t(option[1],option[2],option[3])}</option>)}</select></Field>)}</div>
    <Field label={t('Anything else about how you like to work?','其他工作方式补充（选填）','Catatan lain tentang cara kerja (pilihan)')}><input value={note} onChange={event=>onChange(null,event.target.value)} placeholder={t('In your own words','用自己的话描述','Dengan kata-kata anda sendiri')}/></Field>
  </div>;
}

export function PersonalProfileReview({profile,onConfirm}:{profile:Profile;onConfirm:(field:PersonalField)=>void}) {
  const {t}=useApp();
  const rows:[PersonalField,string,string][]=[
    ['interests',t('Interests','兴趣','Minat'),profile.interests],
    ['vision',t('Career vision and goal tags','职业愿景与目标标签','Visi kerjaya dan tag matlamat'),[profile.vision,(profile.goalTags??[]).join(' · ')].filter(Boolean).join(' · ')],
    ['workStyle',t('Work style','工作方式','Gaya kerja'),workStyleSummary(profile,t)],
  ];
  const sourceLabel=(field:PersonalField)=>profile.personalSources?.[field]==='ai_draft'
    ?t('Source: AI-extracted draft, not yet accepted by you','来源：AI 提取草稿，尚未经你确认','Sumber: draf diekstrak AI, belum disahkan')
    :profile.personalSources?.[field]==='sample'
      ?t('Source: synthetic example','来源：虚构示例','Sumber: contoh sintetik')
      :profile.personalSources?.[field]==='self_reported'
        ?t('Source: your own input','来源：本人填写','Sumber: input anda')
        :t('Source: saved profile; please verify','来源：已保存画像，请核对','Sumber: profil tersimpan; sila semak');
  return <section className="surface form-panel personal-review"><h2>{t('Your words, your confirmation','你的信息，由你确认','Maklumat anda, disahkan oleh anda')}</h2>
    <p className="muted">{t('Optional fields can stay empty. Confirm any information you supplied before continuing.','选填项可留空；若已填写，请逐项确认后继续。','Medan pilihan boleh kosong. Sahkan maklumat yang anda berikan sebelum meneruskan.')}</p>
    <div className="personal-review-list">{rows.map(([field,label,content])=>{
      const filled=hasPersonalValue(profile,field);const confirmed=profile.personalConfirmed?.[field]===true;
      return <div className="personal-review-row" key={field}><div><h3>{label}</h3><p>{content||t('Not provided; no role will be excluded for this missing answer.','未填写；此项缺失不会使前端排除岗位。','Tidak diisi; tiada kerjaya dikecualikan oleh frontend.')}</p><small>{filled?sourceLabel(field):t('Source: none','来源：未提供','Sumber: tiada')} · {filled?(confirmed?t('Confirmed by you','已由你确认','Disahkan oleh anda'):t('Awaiting your confirmation','待你确认','Menunggu pengesahan')):t('Not provided','未填写','Tidak diisi')}</small></div><button type="button" className="button secondary" disabled={!filled||confirmed} onClick={()=>onConfirm(field)}>{confirmed?t('Confirmed','已确认','Disahkan'):t('Confirm','确认','Sahkan')}</button></div>;
    })}</div>
  </section>;
}
