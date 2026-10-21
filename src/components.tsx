import {useEffect,useRef,type ReactNode} from 'react';
import {Link,NavLink,useLocation} from 'react-router-dom';
import {ArrowRight,ArrowLeft,Check,ChevronRight,Compass,GraduationCap,LayoutDashboard,Leaf,Map,Network,Search,Settings2,Sprout,Users,X,Info,AlertCircle,Building2,BookOpen,Globe2,BarChart3} from 'lucide-react';
import {useApp} from './store';
import {skillNames} from './data';
import {isDemo} from './services/api';
export const icons={ArrowRight,ArrowLeft,Check,ChevronRight,Compass,GraduationCap,LayoutDashboard,Leaf,Map,Network,Search,Settings2,Sprout,Users,X,Info,AlertCircle,Building2,BookOpen,Globe2,BarChart3};
export function LocaleSwitcher() {
  const {state,setState,t}=useApp();
  return <label className="locale"><Globe2 size={16}/><span className="sr-only">{t('Language','语言','Bahasa')}</span><select value={state.locale} onChange={e=>setState(s=>({...s,locale:e.target.value as typeof s.locale}))}><option value="en">English</option><option value="zh">简体中文</option><option value="ms">Bahasa Melayu</option></select></label>;
}
export function Brand(){return <Link to="/" className="brand" aria-label="FutureProof AI home"><span className="brand-symbol"><Sprout size={24} strokeWidth={1.4}/></span><span>futureproof<span className="brand-ai"> AI</span></span></Link>;}
export function Shell({children}:{children:ReactNode}) {
  const {t,state}=useApp(); const {pathname}=useLocation();
  const hr=pathname.startsWith('/organization/hr'),tvet=pathname.startsWith('/organization/tvet'),org=pathname.startsWith('/organization');
  const nav=hr?[
    ['/organization/hr/dashboard',LayoutDashboard,t('Overview','工作台','Gambaran')],
    ['/organization/hr/intake',Users,t('Team profile','团队资料','Profil pasukan')],
    ['/organization/hr/heatmap',BarChart3,t('Skill heatmap','技能热图','Peta kemahiran')],
    ['/organization/hr/mobility',Network,t('Internal mobility','内部转型','Mobiliti dalaman')],
    ['/organization/hr/training',BookOpen,t('Training','企业培训','Latihan')],
  ]:tvet?[
    ['/organization/tvet/students',Users,t('Student profiles','学生资料','Profil pelajar')],
    ['/organization/tvet/trends',Compass,t('Industry trends','行业趋势','Trend industri')],
    ['/organization/tvet/gaps',Network,t('Career gaps','职业差距','Jurang kerjaya')],
    ['/organization/tvet/cohort',GraduationCap,t('Select cohort','选择学生群体','Pilih kohort')],
    ['/organization/tvet/insights',BarChart3,t('Institution insights','院校洞察','Wawasan institusi')],
  ]:[
    ['/individual',LayoutDashboard,t('My growth','我的成长','Pertumbuhan saya')],
    ['/individual/radar',Compass,t('Career radar','职业雷达','Radar kerjaya')],
    ['/individual/intake',Users,t('My profile','我的画像','Profil saya')],
    ['/individual/recommendations',Network,t('Career matches','职业推荐','Padanan kerjaya')],
    [state.plan?.adopted?`/individual/roadmap/${state.plan.id}`:'/individual/roadmap/draft',Map,t('Learning journey','学习旅程','Perjalanan belajar')],
  ];
  useEffect(()=>{window.scrollTo(0,0);},[pathname]);
  return <div className="app-shell"><a className="skip-link" href="#main">{t('Skip to content','跳至内容','Langkau ke kandungan')}</a><aside className="sidebar"><Brand/><Link className="workspace-switch" to={org?'/organization':'/'}><span className="workspace-icon">{org?<Building2 size={18}/>:<Sprout size={18}/>}</span><span>{hr?'HR / L&D':tvet?'TVET / University':org?t('Organization','机构','Organisasi'):t('Individual','个人','Individu')}</span><ChevronRight size={15}/></Link><nav aria-label={t('Main navigation','主导航','Navigasi utama')}>{nav.map(([url,Icon,label])=>{const I=Icon as typeof Leaf;return <NavLink key={url as string} to={url as string} end={url==='/individual'} className={({isActive})=>isActive?'nav-link active':'nav-link'}><I size={19} strokeWidth={1.6}/><span>{label as string}</span></NavLink>;})}</nav><div className="sidebar-bottom"><div className="growth-note"><Leaf size={20}/><p>{t('A little growth, every day.','每天，向上生长一点。','Berkembang sedikit, setiap hari.')}</p></div><Link className="nav-link" to={org?'/individual':'/organization'}>{org?<Sprout size={18}/>:<Building2 size={18}/>}<span>{org?t('Individual space','个人空间','Ruang individu'):t('Organization space','机构空间','Ruang organisasi')}</span></Link><span className="local-note">{t('Your progress is saved on this device','进度保存在当前设备','Kemajuan disimpan pada peranti ini')}</span></div></aside><div className="main-area"><header className="topbar"><div className="breadcrumb"><span>{org?t('Organization','机构','Organisasi'):t('Your personal space','个人成长空间','Ruang peribadi anda')}</span><ChevronRight size={13}/><span>{hr?'HR / L&D':tvet?'TVET / University':t('Connected growth','共同成长','Pertumbuhan terhubung')}</span></div><LocaleSwitcher/></header><main id="main" className="page-content">{children}</main><footer className="app-footer"><span>FutureProof AI</span><span>{t('Grow with intention. Move with confidence.','有方向地成长，从容地前行。','Berkembang dengan tujuan. Melangkah dengan yakin.')}</span></footer></div></div>;
}
export function PageHeader({title,description,action,back}:{title:string;description?:string;action?:ReactNode;back?:string}){
  const {t}=useApp();return <header className="page-heading">{back&&<Link to={back} className="back-link"><ArrowLeft size={16}/>{t('Back','返回','Kembali')}</Link>}<div className="heading-row"><div><h1>{title}</h1>{description&&<p>{description}</p>}</div>{action}</div></header>;
}
export function DemoNotice(){const {t,state}=useApp();const mocked=isDemo||!state.serviceMeta||state.serviceMeta.isMock;return <details className="demo-notice"><summary><span className="status-dot"/>{mocked?t('Synthetic demo data','合成演示数据','Data demo sintetik'):t('Connected service','已连接服务','Perkhidmatan disambungkan')}<Info size={14}/></summary><p>{mocked?t('Profiles and analysis examples are synthetic. Market signals and match scores are illustrative fixtures, not live forecasts. No real personal records are needed.','人物资料与分析示例为合成数据。市场信号与匹配分为界面测试样本，不代表实时预测。请勿输入真实个人敏感资料。','Profil dan contoh analisis adalah sintetik. Isyarat pasaran dan skor padanan ialah contoh, bukan ramalan langsung. Jangan masukkan rekod peribadi sebenar.'):t('The interface is connected to the versioned API. Scores remain modelled explanations, not hiring probabilities.','界面已连接版本化 API。评分仍是可解释模型结果，不代表录用概率。','Antara muka disambungkan kepada API berversi. Skor ialah penerangan model, bukan kebarangkalian pengambilan.')}</p></details>;}
export function ButtonLink({to,children,secondary=false,className='',onClick}:{to:string;children:ReactNode;secondary?:boolean;className?:string;onClick?:()=>void}){return <Link className={`button ${secondary?'secondary':''} ${className}`} to={to} onClick={onClick}>{children}</Link>;}
export function SkillChip({id,tone=''}:{id:string;tone?:string}){const {copy}=useApp();return <span className={`skill-chip ${tone}`}>{skillNames[id]?copy(skillNames[id]):id}</span>;}
export function ScenarioSwitcher(){const {state,setState,t}=useApp();return <div className="scenario-control"><span>{t('AI scenario','AI 发展情景','Senario AI')}</span><div className="segmented" aria-label={t('AI scenario','AI 发展情景','Senario AI')}>{(['moderate','fast'] as const).map(s=><button key={s} aria-pressed={state.scenario===s} className={state.scenario===s?'selected':''} onClick={()=>setState(v=>({...v,scenario:s}))}>{s==='moderate'?t('Moderate','中等','Sederhana'):t('Fast','快速','Pantas')}</button>)}</div></div>;}
export function EmptyState({title,description,action}:{title:string;description:string;action?:ReactNode}){return <div className="empty-state"><Sprout size={38} strokeWidth={1.2}/><h2>{title}</h2><p>{description}</p>{action}</div>;}
export function ErrorState({message,retry}:{message:string;retry?:()=>void}){const {t}=useApp();return <div className="error-state" role="alert"><AlertCircle size={20}/><div><strong>{t('We couldn’t complete this step','此步骤未能完成','Langkah ini tidak dapat diselesaikan')}</strong><p>{message}</p>{retry&&<button className="text-button" onClick={retry}>{t('Try again','重试','Cuba lagi')}</button>}</div></div>;}
export function Modal({title,children,onClose}:{title:string;children:ReactNode;onClose:()=>void}){
  const ref=useRef<HTMLDialogElement>(null);const {t}=useApp();
  useEffect(()=>{ref.current?.showModal();},[]);
  return <dialog ref={ref} className="modal" onCancel={onClose} onClick={e=>{if(e.target===e.currentTarget)onClose();}} aria-label={title}><div className="modal-heading"><h2>{title}</h2><button className="icon-button" onClick={onClose} aria-label={t('Close','关闭','Tutup')}><X size={20}/></button></div>{children}</dialog>;
}
export function Field({label,children,hint}:{label:string;children:ReactNode;hint?:string}){return <label className="field"><span>{label}</span>{children}{hint&&<small>{hint}</small>}</label>;}
export function Stepper({steps,current}:{steps:string[];current:number}){return <ol className="stepper">{steps.map((s,i)=><li key={s} aria-current={i===current?'step':undefined} className={i===current?'current':i<current?'complete':''}><span>{i<current?<Check size={14}/>:i+1}</span>{s}</li>)}</ol>;}
export function Bamboo({earned=0,empty=false,small=false}:{earned?:number;empty?:boolean;small?:boolean}){
  const {t}=useApp();const count=empty?0:Math.max(1,earned);
  return <div className={`bamboo-art ${small?'small':''}`}><svg viewBox="0 0 400 420" role="img" aria-label={empty?t('A seed, ready to grow','等待萌发的种子','Benih yang sedia tumbuh'):t(`${earned} of 10 growth milestones`,`${earned} / 10 个成长里程碑`,`${earned} daripada 10 tahap pertumbuhan`)} xmlns="http://www.w3.org/2000/svg"><ellipse cx="200" cy="376" rx="122" ry="13" fill="#ceddc9"/>{empty?<g fill="#789267"><path d="M200 375 Q173 352 194 337 Q210 347 200 375"/><path d="M202 366 Q209 345 220 349 Q221 363 202 366"/></g>:<>{(earned>=10?[112,156,200,244,288]:[176,221]).map((x,k)=><g key={x} opacity={k%2?0.75:1}>{Array.from({length:count},(_,i)=><g key={i} className="bamboo-segment"><path d={`M${x} ${369-i*27} Q${x+3} ${355-i*27} ${x} ${345-i*27} L${x+9} ${345-i*27} Q${x+7} ${356-i*27} ${x+10} ${369-i*27} Z`} fill={k%2?'#789267':'#547344'}/><path d={`M${x-1} ${370-i*27} H${x+12}`} stroke="#3e5e36" strokeWidth="2"/>{i%2===0&&<g fill="#6d8b5b"><path d={`M${x+5} ${350-i*27} Q${x+30} ${321-i*27} ${x+61} ${329-i*27} Q${x+41} ${344-i*27} ${x+5} ${350-i*27}`}/><path d={`M${x+5} ${350-i*27} Q${x-28} ${323-i*27} ${x-43} ${333-i*27} Q${x-21} ${350-i*27} ${x+5} ${350-i*27}`}/></g>}</g>)}<path d={`M${x+4} ${345-(count-1)*27} Q${x-9} ${317-(count-1)*27} ${x+4} ${303-(count-1)*27} Q${x+19} ${326-(count-1)*27} ${x+4} ${345-(count-1)*27}`} fill="#6d8b5b"/></g>)}</>}</svg></div>;
}
export function EvidencePanel(){
  const {t,state}=useApp();
  const connected=!isDemo&&state.serviceMeta&&!state.serviceMeta.isMock;
  const snapshot=state.serviceMeta?.snapshotId||state.snapshotId;
  return <div className="evidence-grid"><article><BookOpen size={19}/><h3>{t('Profile evidence','画像依据','Bukti profil')}</h3><p>{t('Your confirmed skills and self-reported experience. Inferred information is always reviewed by you.','来自你已确认的技能和自述经历。推断的信息需要由你审核。','Kemahiran disahkan dan pengalaman yang anda laporkan. Maklumat inferens disemak oleh anda.')}</p></article><article><BarChart3 size={19}/><h3>{t('Market signals','市场信号','Isyarat pasaran')}</h3><p>{connected?t(`Versioned public snapshot ${snapshot}. Open the source links inside each recommendation to review dates and limitations.`,`版本化公开快照 ${snapshot}。请在每项推荐中打开来源链接，核对日期与局限。`,`Gambaran awam berversi ${snapshot}. Buka pautan sumber pada setiap cadangan untuk menyemak tarikh dan batasan.`):t('Synthetic fixture v1. Live market source, observation date, salary and employer records are not connected.','合成样本 v1。实时市场来源、观测日期、薪资和雇主记录尚未接入。','Contoh sintetik v1. Sumber pasaran langsung, tarikh pemerhatian, gaji dan majikan belum disambungkan.')}</p></article><article><Info size={19}/><h3>{t('Scenario & uncertainty','情景与不确定性','Senario & ketidakpastian')}</h3><p>{t('Moderate and Fast are assumptions at the same future horizon. Scores express relative fit, never hiring probability.','中等与快速为同一未来时间点的假设情景。匹配分表示相对适配度，不是录用概率。','Sederhana dan Pantas ialah andaian pada ufuk masa yang sama. Skor bukan kebarangkalian diambil bekerja.')}</p></article></div>;
}
