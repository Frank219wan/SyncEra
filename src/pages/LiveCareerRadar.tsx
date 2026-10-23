import {useEffect,useState,type CSSProperties} from 'react';
import {Info,RadioTower,TrendingDown,TrendingUp} from 'lucide-react';
import {PageHeader} from '../components';
import {useApp} from '../store';
import type {MarketEmploymentSector,MarketRadarPackage,MarketRadarSignal} from '../types';
import './LiveCareerRadar.css';

type RadarTab='occupations'|'industries'|'employment';

function formatCount(value:number|null){
  return value===null?'—':new Intl.NumberFormat('en-MY').format(value);
}
function formatCompact(value:number|null){
  if(value===null)return '—';
  if(value>=1_000_000)return `${(value/1_000_000).toFixed(2)}m`;
  if(value>=10_000)return `${(value/1_000).toFixed(0)}k`;
  if(value>=1_000)return `${(value/1_000).toFixed(1)}k`;
  return formatCount(value);
}
function formatQes(value:number){
  return value>=1_000?`${(value/1_000).toFixed(2)}m`:`${value.toLocaleString('en-MY',{maximumFractionDigits:1})}k`;
}
function formatQesThousands(value:number){
  return `${value.toLocaleString('en-MY',{maximumFractionDigits:1})}k`;
}
function formatPercent(value:number|null){
  return value===null?'—':`${value>0?'+':''}${value.toFixed(1)}%`;
}
function direction(value:number|null){return value===null?'neutral':value>0?'rising':value<0?'declining':'stable';}
function bubbleLabel(name:string){
  const shortNames:Record<string,string>={
    'Technicians and associate professionals':'Technicians & associates',
    'Plant and machine operators and assemblers':'Plant & machine operators',
    'Skilled agricultural, forestry, livestock and fishery workers':'Agriculture & fishery',
    'Craft and related trades workers':'Craft & trades',
    'Elementary Occupations':'Elementary',
    'Agriculture, forestry and fishing':'Agriculture & fishing',
    'Electricity, gas, steam and air conditioning supply':'Electricity & utilities',
    'Water supply, sewerage, waste management and remediation activities':'Water & waste',
    'Wholesale and retail trade; repair of motor vehicles and motorcycles':'Wholesale & retail',
    'Transportation and storage':'Transport & storage',
    'Accommodation and food service activities':'Accommodation & food',
    'Information and communication':'Information & comms',
    'Financial and insurance/ takaful activities':'Finance & insurance',
    'Professional, scientific and technical activities':'Professional & technical',
    'Administrative and support service activities':'Admin & support',
    'Public administration and defence; compulsory social security':'Public administration',
    'Human health and social work activities':'Health & social work',
    'Activities of households as employers':'Household employers',
    'Activities of extraterritorial organizations and bodies':'Extraterritorial orgs',
  };
  const label=shortNames[name]??name;
  return label.length>28?`${label.slice(0,25).trimEnd()}…`:label;
}

function ChangeValue({value,label}:{value:number|null;label:string}){
  const trend=direction(value);
  const Icon=trend==='rising'?TrendingUp:trend==='declining'?TrendingDown:null;
  return <span className={`market-change market-change--${trend}`}>{Icon&&<Icon size={14} aria-hidden="true"/>}{formatPercent(value)}<small>{label}</small></span>;
}

function MarketBubbles({items,selectedId,onSelect}:{items:MarketRadarSignal[];selectedId:string;onSelect:(id:string)=>void}){
  const {t}=useApp();
  const max=Math.max(1,...items.map(item=>item.postings??0));
  return <div className="market-bubble-cloud" aria-label={t('Online job offerings by category','按类别统计的线上招聘广告','Iklan kerja dalam talian mengikut kategori')}>
    {items.map(item=>{
      const trend=direction(item.yoyChangePercent);
      const diameter=Math.round(90+96*Math.sqrt((item.postings??0)/max));
      return <button
        className={`market-bubble market-bubble--${trend}${item.id===selectedId?' is-selected':''}`}
        type="button"
        key={item.id}
        aria-pressed={item.id===selectedId}
        aria-label={`${item.name}: ${formatCount(item.postings)} ${t('online job offerings','线上招聘广告','iklan kerja dalam talian')}, ${formatPercent(item.yoyChangePercent)} ${t('year over year','同比','tahun ke tahun')}`}
        onClick={()=>onSelect(item.id)}
        style={{'--market-bubble-size':`${diameter}px`} as CSSProperties}
      >
        <span className="market-bubble__name">{bubbleLabel(item.name)}</span>
        <strong>{formatCompact(item.postings)}</strong>
        <small>{item.yoyChangePercent===null?t('No YoY comparison','暂无同比数据','Tiada perbandingan tahunan'):`${formatPercent(item.yoyChangePercent)} ${t('YoY','同比','YoY')}`}</small>
      </button>;
    })}
  </div>;
}

function SignalHighlights({items,tab,selectedId,onSelect}:{items:MarketRadarSignal[];tab:'occupations'|'industries';selectedId:string;onSelect:(id:string)=>void}){
  const {t}=useApp();
  const classified=items.filter(item=>item.postings!==null&&(tab!=='industries'||item.name.toLowerCase()!=='unclassified'));
  const top=classified.slice().sort((a,b)=>(b.postings??-1)-(a.postings??-1)).slice(0,3);
  const fastest=classified.slice().sort((a,b)=>(b.postings??-1)-(a.postings??-1)).slice(0,5)
    .filter(item=>item.yoyChangePercent!==null).sort((a,b)=>(b.yoyChangePercent??-Infinity)-(a.yoyChangePercent??-Infinity))[0];
  const unclassified=tab==='industries'?items.find(item=>item.name.toLowerCase()==='unclassified'):undefined;
  const cards=[
    ...top.map((item,index)=>({item,label:t(`Rank ${index+1} by ads`,`按广告量排名第 ${index+1}`,`Kedudukan ${index+1} mengikut iklan`),key:`top-${item.id}`})),
    ...(fastest?[{item:fastest,label:t('Fastest YoY growth in the top five','广告量前五组中同比增长最快','Pertumbuhan YoY terpantas dalam lima teratas'),key:`growth-${fastest.id}`}]:[]),
  ];
  return <section className="market-highlights" aria-label={tab==='occupations'?t('Leading occupation groups','领先职业大类','Kumpulan pekerjaan utama'):t('Leading industries','领先行业','Industri utama')}>
    <div className="market-highlight-heading"><h3>{tab==='occupations'?t('Position signals','职位信号','Isyarat jawatan'):t('Industry signals','行业信号','Isyarat industri')}</h3><span>{tab==='occupations'?t('DOSM major groups; this file does not list job titles','DOSM 职业大类；此文件未列出具体职位名称','Kumpulan utama DOSM; fail ini tidak menyenaraikan tajuk jawatan'):t('Classified economic activities with job-ad volumes','已分类经济活动及招聘广告数量','Aktiviti ekonomi dikelaskan dengan jumlah iklan kerja')}</span></div>
    <div className="market-highlight-grid">{cards.map(({item,label,key})=><button type="button" className={`market-highlight-card${item.id===selectedId?' is-selected':''}`} key={key} aria-pressed={item.id===selectedId} onClick={()=>onSelect(item.id)}>
      <span className="market-highlight-card__eyebrow">{label}</span><strong className="market-highlight-card__name">{item.name}</strong>
      <span className="market-highlight-card__measure"><b>{formatCount(item.postings)}</b><small>{item.marketSharePercent===null?'—':`${item.marketSharePercent.toFixed(1)}%`} {t('of JMI ads','占 JMI 广告','daripada iklan JMI')}</small></span>
      <ChangeValue value={item.yoyChangePercent} label={t('year over year','同比','tahun ke tahun')}/>
      <span className="market-highlight-card__hint">{t('Select to inspect','选择查看详情','Pilih untuk melihat')}</span>
    </button>)}</div>
    {unclassified?.postings!==null&&unclassified?.postings!==undefined&&<p className="market-classification-note"><Info size={15}/><span><b>{formatCount(unclassified.postings)} {t('ads','条广告','iklan')} ({unclassified.marketSharePercent?.toFixed(1)??'—'}%)</b> {t('are unclassified by industry in this release. Treat industry rankings as partial until this share is classified.','在此版本中未归类到行业。该部分完成分类前，应将行业排名视为不完整。','tidak dikelaskan mengikut industri dalam keluaran ini. Anggap kedudukan industri sebagai separa sehingga bahagian ini dikelaskan.')}</span></p>}
  </section>;
}

function MatchPreparation({readiness}:{readiness:MarketRadarPackage['matchingReadiness']}){
  const {t}=useApp();
  const ready=readiness.evidenceBasedMatchingReady&&readiness.namedPositionsAvailable&&readiness.namedSkillRequirementsAvailable;
  return <section className="market-match-prep surface" aria-label={t('CV to position matching preparation','简历与职位匹配准备','Persediaan padanan CV dan jawatan')}>
    <div><span className="market-eyebrow">{t('Next radar step','雷达下一步','Langkah radar seterusnya')}</span><h2>{t('Prepare CV-to-position matching','准备简历与职位匹配','Sediakan padanan CV dengan jawatan')}</h2>
      <p>{ready?t('The selected data package includes named positions and sourced skill requirements.','所选数据包包含具体职位名称及有来源依据的技能要求。','Pakej data terpilih merangkumi jawatan khusus dan keperluan kemahiran bersumber.'):t('The CV side can use normalized, user-confirmed skills. This DOSM file has broad occupation groups and ad counts, but no job titles or required named skills, so an evidence-based LLM match needs a detailed position-and-skills source first.','简历侧可使用已标准化并由用户确认的技能。此 DOSM 文件只有宽泛职业大类和广告数量，没有职位名称或具体技能要求，因此需要先接入详细职位与技能来源，才能进行有依据的 LLM 匹配。','Bahagian CV boleh menggunakan kemahiran yang dinormalkan dan disahkan pengguna. Fail DOSM ini hanya mengandungi kumpulan pekerjaan luas dan jumlah iklan, tanpa tajuk jawatan atau kemahiran khusus yang diperlukan. Sumber jawatan dan kemahiran terperinci diperlukan sebelum padanan LLM berasaskan bukti.')}</p>
    </div><div className="market-match-status"><span className={readiness.candidateSkillsSource?'is-ready':''}>{t('CV skill input','Input kemahiran CV','输入 CV 技能')}: {t('confirmed profile skills','已确认的个人技能','kemahiran profil disahkan')}</span><span className={ready?'is-ready':'is-pending'}>{t('Position skill evidence','职位技能依据','Bukti kemahiran jawatan')}: {ready?t('available','可用','tersedia'):t('needed','待补充','diperlukan')}</span><small>{t('Only confirmed skill IDs and levels should be sent to the matching adapter; do not send the raw CV by default.','匹配适配器只应接收已确认的技能 ID 和等级；默认不要发送原始简历。','Hanya ID dan tahap kemahiran yang disahkan patut dihantar kepada penyesuai padanan; jangan hantar CV mentah secara lalai.')}</small></div>
  </section>;
}

function SignalDetail({item,period}:{item:MarketRadarSignal;period:string}){
  const {t}=useApp();
  const quarter=period.split('-')[1];
  const year=period.split('-')[0];
  return <aside className="market-signal-detail">
    <div><span className="market-eyebrow">{t('Selected category','所选类别','Kategori dipilih')}</span><h3>{item.name}</h3></div>
    {item.postings===null?<p className="market-detail-empty">{t('DOSM reports no comparable value for this category and period.','DOSM 未报告此类别和时期的可比数值。','DOSM tidak melaporkan nilai setanding bagi kategori dan tempoh ini.')}</p>:<>
      <div className="market-detail-primary"><strong>{formatCount(item.postings)}</strong><span>{t('online job offerings','线上招聘广告','iklan kerja dalam talian')} · {period}</span></div>
      <div className="market-detail-comparisons">
        <div><span>{t('Quarter over quarter','环比','Suku ke suku')}</span><strong>{formatPercent(item.qoqChangePercent)}</strong><small>{item.previousPostings===null?t('No previous quarter value','无上一季度数值','Tiada nilai suku sebelumnya'):`${formatCount(item.previousPostings)} · ${t('prior quarter','上一季度','suku sebelumnya')}`}</small></div>
        <div><span>{t('Year over year','同比','Tahun ke tahun')}</span><strong>{formatPercent(item.yoyChangePercent)}</strong><small>{item.yearAgoPostings===null?t('No same-quarter value','无去年同期数值','Tiada nilai suku sama tahun lalu'):`${formatCount(item.yearAgoPostings)} · ${quarter} ${Number(year)-1}`}</small></div>
      </div>
    </>}
  </aside>;
}

function EmploymentView({data}:{data:MarketRadarPackage}){
  const {t}=useApp();
  const levels:[MarketEmploymentSector['skillLevels'][number]['name'],string][]=[
    ['Skilled',t('Skilled','熟练','Mahir')],
    ['Semi-skilled',t('Semi-skilled','半熟练','Separuh mahir')],
    ['Low-skilled',t('Low-skilled','低技能','Berkemahiran rendah')],
  ];
  const totals=data.employmentTotals;
  return <div className="market-employment-view">
    <div className="market-section-intro"><div><h2>{t('Employment and skill levels','就业与技能等级','Pekerjaan dan tahap kemahiran')}</h2><p>{t('Quarterly Employment Survey context. These counts are not online job ads.','季度就业调查背景数据；这些数字不是线上招聘广告。','Konteks Tinjauan Guna Tenaga Suku Tahunan. Angka ini bukan iklan kerja dalam talian.')}</p></div><span className="market-unit-tag">{t("Jobs and vacancies in thousands ('000)","职位和空缺以千计 ('000)","Pekerjaan dan kekosongan dalam ribu ('000)")}</span></div>
    <div className="market-kpi-grid market-kpi-grid--employment">
      <article className="market-kpi"><span>{t('Total jobs','职位总数','Jumlah pekerjaan')}</span><strong>{formatQes(totals.jobs)}</strong><ChangeValue value={totals.yoyChangePercent} label={t('jobs · YoY','职位 · 同比','pekerjaan · YoY')}/></article>
      <article className="market-kpi"><span>{t('Vacancies','职位空缺','Kekosongan')}</span><strong>{formatQesThousands(totals.vacancies)}</strong><small>{t('surveyed vacancies','调查统计的空缺','kekosongan dalam tinjauan')}</small></article>
      <article className="market-kpi"><span>{t('Jobs created','新增职位','Pekerjaan diwujudkan')}</span><strong>{formatQesThousands(totals.jobsCreated)}</strong><small>{t('created during the quarter','本季度新增','diwujudkan pada suku ini')}</small></article>
    </div>
    <div className="market-section-intro market-sector-heading"><div><h2>{t('Employment by economic activity','按经济活动划分的就业','Pekerjaan mengikut aktiviti ekonomi')}</h2><p>{t('The five DOSM QES activity groups, each with its broad occupational skill mix.','DOSM 季度就业调查的五类经济活动及其宽泛职业技能等级。','Lima kumpulan aktiviti DOSM QES dengan campuran tahap kemahiran pekerjaan.')}</p></div></div>
    <div className="market-sector-grid">{data.employmentSectors.map(sector=>{
      const growth=direction(sector.yoyChangePercent);
      return <article className="market-sector-card" key={sector.id}>
        <div className="market-sector-top"><h3>{sector.name}</h3><ChangeValue value={sector.yoyChangePercent} label={t('jobs · YoY','职位 · 同比','pekerjaan · YoY')}/></div>
        <strong className="market-sector-jobs">{formatQes(sector.jobs)} <small>{t('jobs','职位','pekerjaan')}</small></strong>
        <div className="market-sector-facts"><span>{t('Vacancies','空缺','Kekosongan')} <b>{formatQesThousands(sector.vacancies)}</b></span><span>{t('Created','新增','Diwujudkan')} <b>{formatQesThousands(sector.jobsCreated)}</b></span></div>
        <div className="market-skill-mix" role="img" aria-label={`${t('Skill level mix','技能等级构成','Campuran tahap kemahiran')}: ${sector.skillLevels.map(level=>`${level.name} ${Math.round(level.jobs/Math.max(sector.jobs,0.001)*100)}%`).join(', ')}`}>
          {sector.skillLevels.map(level=><span key={level.name} className={`market-skill-segment market-skill-segment--${level.name.toLowerCase().replaceAll('-','')}`} style={{width:`${Math.max(0,Math.min(100,level.jobs/Math.max(sector.jobs,0.001)*100))}%`}}/>)}
        </div>
        <div className="market-skill-legend">{levels.map(([key,label])=>{const level=sector.skillLevels.find(item=>item.name===key);const share=level?level.jobs/Math.max(sector.jobs,0.001)*100:0;return <span key={key}><i className={`market-skill-dot market-skill-dot--${key.toLowerCase().replaceAll('-','')}`}/>{label} <b>{share.toFixed(0)}%</b></span>})}</div>
        {growth==='neutral'&&<small className="market-neutral-note">{t('No comparable annual jobs value','暂无可比的年度职位数据','Tiada nilai pekerjaan tahunan setanding')}</small>}
      </article>;
    })}</div>
    <p className="market-skill-explainer"><Info size={16}/>{t('These are DOSM skill-level categories, not named skills such as Python or SQL.','这些是 DOSM 的技能等级类别，并非 Python 或 SQL 等具体技能。','Ini kategori tahap kemahiran DOSM, bukan kemahiran khusus seperti Python atau SQL.')}</p>
  </div>;
}

export function LiveCareerRadar({data,onPeriodChange}:{data:MarketRadarPackage;onPeriodChange:(period:string)=>void}){
  const {t}=useApp();
  const [tab,setTab]=useState<RadarTab>('occupations');
  const [selectedId,setSelectedId]=useState('');
  const items=tab==='industries'?data.industries:data.occupationGroups;
  const selected=items.find(item=>item.id===selectedId)??items[0];
  const selectedPeriod=data.period;
  const tabs:[RadarTab,string][]=[
    ['occupations',t('Occupation groups','职业大类','Kumpulan pekerjaan')],
    ['industries',t('Industries','行业','Industri')],
    ['employment',t('Employment & skill levels','就业与技能等级','Pekerjaan & tahap kemahiran')],
  ];
  useEffect(()=>{
    if(!items.some(item=>item.id===selectedId))setSelectedId(items[0]?.id??'');
  },[tab,selectedId,data.period]);
  return <>
    <PageHeader title={t('Malaysia Career Radar','马来西亚职业雷达','Radar Kerjaya Malaysia')} description={t('Explore observed job-ad demand and employment context from DOSM quarterly data.','通过 DOSM 季度数据探索实际招聘广告需求和就业背景。','Teroka permintaan iklan kerja dan konteks pekerjaan daripada data suku tahunan DOSM.')} action={<span className="market-source-badge"><RadioTower size={15}/>{t('DOSM source data','DOSM 来源数据','Data sumber DOSM')}</span>}/>
    <section className="market-radar-context surface">
      <div className="market-context-copy"><span className="market-eyebrow">{t('Latest source snapshot','最新来源快照','Gambaran sumber terkini')}</span><strong>{data.period} <span>· {t('Malaysia','马来西亚','Malaysia')}</span></strong><p>{t('Q2 2026 is the latest period in the files you supplied. Values refresh when a new DOSM release is imported.','你提供的文件截至 2026 年第二季度。导入 DOSM 新发布数据后即可更新。','Suku kedua 2026 ialah tempoh terkini dalam fail yang diberi. Data dikemas kini selepas keluaran DOSM baharu diimport.')}</p></div>
      <label className="market-period-select">{t('Quarter','季度','Suku')}<select value={data.period} onChange={event=>onPeriodChange(event.target.value)} aria-label={t('Choose reporting quarter','选择报告季度','Pilih suku laporan')}>{[...data.periods].reverse().map(period=><option key={period} value={period}>{period}</option>)}</select></label>
    </section>
    <div className="market-kpi-grid">
      <article className="market-kpi market-kpi--lead"><span>{t('Online job offerings','线上招聘广告','Iklan kerja dalam talian')}</span><strong>{formatCount(data.totalJobOfferings)}</strong><small>{t('published ads · JMI','已发布广告 · JMI','iklan diterbitkan · JMI')}</small></article>
      <article className="market-kpi"><span>{t('Quarter over quarter','环比','Suku ke suku')}</span><strong className={`market-kpi-change market-kpi-change--${direction(data.totalQoqChangePercent)}`}>{formatPercent(data.totalQoqChangePercent)}</strong><small>{t('online ads vs prior quarter','线上广告 · 对比上一季度','iklan dalam talian · suku sebelumnya')}</small></article>
      <article className="market-kpi"><span>{t('Year over year','同比','Tahun ke tahun')}</span><strong className={`market-kpi-change market-kpi-change--${direction(data.totalYoyChangePercent)}`}>{formatPercent(data.totalYoyChangePercent)}</strong><small>{t('online ads vs same quarter last year','线上广告 · 对比去年同期','iklan dalam talian · suku sama tahun lalu')}</small></article>
    </div>
    <nav className="market-radar-tabs" aria-label={t('Radar views','雷达视图','Paparan radar')} role="tablist">{tabs.map(([id,label])=><button type="button" role="tab" aria-selected={tab===id} className={tab===id?'is-active':''} key={id} onClick={()=>setTab(id)}>{label}</button>)}</nav>
    <section className="market-radar-surface surface">
      {tab==='employment'?<EmploymentView data={data}/>:<>
        <div className="market-section-intro"><div><h2>{tab==='occupations'?t('Online job ads by major occupation group','按主要职业大类统计的线上招聘广告','Iklan kerja mengikut kumpulan utama pekerjaan'):t('Online job ads by economic activity','按经济活动统计的线上招聘广告','Iklan kerja mengikut aktiviti ekonomi')}</h2><p>{tab==='occupations'?t('Each bubble is a DOSM major occupation group. Larger circles represent more ads.','每个气泡代表 DOSM 的一个主要职业大类；气泡越大，广告数量越多。','Setiap gelembung mewakili kumpulan pekerjaan utama DOSM. Lebih besar, lebih banyak iklan.'):t('Each bubble is an industry category. Unclassified ads remain visible when reported.','每个气泡代表一个行业类别；已分类为“未分类”的广告仍会显示。','Setiap gelembung mewakili kategori industri. Iklan tidak dikelaskan dikekalkan.')}</p></div><span className="market-unit-tag">{t('Bubble size = ad count','气泡大小 = 广告数','Saiz gelembung = bilangan iklan')}</span></div>
        <SignalHighlights items={items} tab={tab} selectedId={selected?.id??''} onSelect={setSelectedId}/>
        <MarketBubbles items={items} selectedId={selected?.id??''} onSelect={setSelectedId}/>
        {selected&&<SignalDetail item={selected} period={selectedPeriod}/>}
      </>}
    </section>
    <MatchPreparation readiness={data.matchingReadiness}/>
    <section className="market-source-notes surface">
      <div className="market-section-intro"><div><h2>{t('Sources and reading notes','来源与阅读说明','Sumber dan nota bacaan')}</h2><p>{data.attribution}</p></div></div>
      <ul className="market-note-list">{data.notes.map(note=><li key={note}>{note}</li>)}</ul>
      <div className="market-source-links">{data.sources.map(source=><a href={source.url} key={source.id} target="_blank" rel="noreferrer"><strong>{source.title}</strong><span>{source.file} · {t('released','发布于','diterbitkan')} {source.publishedOn}</span></a>)}<a href={data.termsUrl} target="_blank" rel="noreferrer"><strong>{t('DOSM terms of use','DOSM 使用条款','Syarat penggunaan DOSM')}</strong><span>{t('Attribution and reuse terms','署名与再使用条款','Terma atribusi dan penggunaan semula')}</span></a></div>
    </section>
  </>;
}
