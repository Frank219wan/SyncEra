import {roles,skillNames} from './data.ts';
import type {Copy,Locale,Recommendation} from './types.ts';

export const localeText=(locale:Locale,copy:Copy)=>copy[locale==='zh'?1:locale==='ms'?2:0];

export function originalLanguage(text:string,locale:Locale):string {
  if(locale==='en'||!text)return text;
  return `${text} (${localeText(locale,['original-language source','原文资料','teks bahasa asal'])})`;
}

export function roleLabel(id:string,raw:string,locale:Locale):string {
  const role=roles.find(item=>item.id===id.replace(/^role_/,'').replace(/_/g,'-'));
  return role&&raw===role.name[0]?localeText(locale,role.name):originalLanguage(raw||id,locale);
}

export function skillLabel(id:string,raw:string,locale:Locale):string {
  const key=id.replace(/^skill_/,'');
  const known=skillNames[key];
  const expected=backendSkillNames[key]??known?.[0];
  return known&&(raw===key||raw.toLowerCase()===expected?.toLowerCase())
    ?localeText(locale,known):originalLanguage(raw||id,locale);
}

export function dataLabel(value:string,locale:Locale):string {
  const labels:Record<string,Copy>={
    synthetic_demo:['Synthetic demo','合成演示','Demo sintetik'],
    mixed_demo:['Mixed demo data','混合演示数据','Data demo campuran'],
    public_open:['Public open data','公开数据','Data terbuka awam'],
  };
  return labels[value]?localeText(locale,labels[value]):originalLanguage(value,locale);
}

export function recommendationText(item:Recommendation,field:'reason'|'uncertainty'|'scenarioAssumptions',locale:Locale):string|string[] {
  const raw=field==='scenarioAssumptions'?item.scenarioAssumptions??[]:item[field]??'';
  if(locale==='en')return raw;
  const reasonCode=item.reason==='Deterministic match from confirmed skill levels, explicit interests/field, study capacity, and the selected dated scenario.'?'matching_v1'
    :item.reason==='Rule-only demo match using confirmed skills, interests, and scenario-adjusted dated signals.'?'demo_v1':null;
  if(field==='reason'){
    if(reasonCode==='matching_v1')return localeText(locale,[item.reason!,
      '根据已确认的技能等级、明确填写的兴趣与领域、学习时间，以及所选日期快照情景进行的确定性匹配。',
      'Padanan deterministik berdasarkan tahap kemahiran yang disahkan, minat dan bidang yang dinyatakan, masa belajar, serta senario bertarikh yang dipilih.']);
    if(reasonCode==='demo_v1')return localeText(locale,[item.reason!,
      '仅使用规则的演示匹配，依据已确认技能、兴趣及按情景调整的带日期信号。',
      'Padanan demo berasaskan peraturan daripada kemahiran dan minat yang disahkan serta isyarat bertarikh yang dilaraskan mengikut senario.']);
  }
  if(field==='scenarioAssumptions')return (raw as string[]).map(text=>{
    if(!reasonCode)return originalLanguage(text,locale);
    const tech=/^(moderate|fast) multiplier (\d+(?:\.\d+)?) applied to role outlook (\d+(?:\.\d+)?); observed snapshot metrics are unchanged\.$/.exec(text);
    const demo=/^(moderate|fast) assumption multiplier (\d+(?:\.\d+)?); observed signal remains (\d+(?:\.\d+)?)$/.exec(text);
    if(reasonCode==='matching_v1'&&tech){
      const scenario=localeText(locale,[tech[1],tech[1]==='fast'?'快速':'中等',tech[1]==='fast'?'pantas':'sederhana']);
      return localeText(locale,[text,`在所选${scenario}情景中，职业前景基数 ${tech[3]} 乘以 ${tech[2]}；已观测的快照指标保持不变。`,
        `Dalam senario ${scenario}, faktor ${tech[2]} digunakan pada prospek asas ${tech[3]}; metrik gambaran yang diperhatikan tidak berubah.`]);
    }
    if(reasonCode==='demo_v1'&&demo){
      const scenario=localeText(locale,[demo[1],demo[1]==='fast'?'快速':'中等',demo[1]==='fast'?'pantas':'sederhana']);
      return localeText(locale,[text,`${scenario}情景假设系数为 ${demo[2]}；已观测信号保持 ${demo[3]}。`,
        `Faktor andaian senario ${scenario} ialah ${demo[2]}; isyarat yang diperhatikan kekal ${demo[3]}.`]);
    }
    return originalLanguage(text,locale);
  });
  const uncertainty=raw as string;
  const synthetic='Synthetic fixture; no observed job-demand claim';
  if(reasonCode==='matching_v1'&&uncertainty===`${synthetic}; matching weights and level-to-hours conversion are transparent Phase-1 heuristics and are not outcome-calibrated.`)
    return localeText(locale,[uncertainty,'合成样例；不构成对实际岗位需求的观测结论；匹配权重与技能等级到学习小时的换算是透明的第一阶段启发式规则，尚未经实际结果校准。',
      'Data sintetik; tiada dakwaan tentang permintaan pekerjaan yang diperhatikan; pemberat padanan dan penukaran tahap kemahiran kepada jam belajar ialah heuristik Fasa 1 yang telus dan belum ditentukur dengan hasil sebenar.']);
  if(reasonCode==='demo_v1'&&uncertainty===`${synthetic}; rule-only demo fit heuristic is not empirically calibrated`)
    return localeText(locale,[uncertainty,'合成样例；不构成对实际岗位需求的观测结论；仅使用规则的演示匹配启发式尚未经实际结果校准。',
      'Data sintetik; tiada dakwaan tentang permintaan pekerjaan yang diperhatikan; heuristik padanan demo berasaskan peraturan belum ditentukur secara empirikal.']);
  return originalLanguage(uncertainty,locale);
}

export function careerAnalysisReason(raw:string,locale:Locale):string {
  if(raw==='Rule recommendation from confirmed skills and the selected scenario.')
    return localeText(locale,[raw,'根据已确认技能与所选情景形成的规则推荐。','Cadangan berasaskan peraturan daripada kemahiran yang disahkan dan senario dipilih.']);
  if(raw==='No eligible role in the selected snapshot.')
    return localeText(locale,[raw,'所选快照中没有符合条件的职业。','Tiada kerjaya yang layak dalam gambaran yang dipilih.']);
  return originalLanguage(raw,locale);
}

export function analysisStatusText(raw:string,locale:Locale):string {
  const copy:Record<string,Copy>={success:['Success','成功','Berjaya'],disabled:['Disabled','已停用','Dilumpuhkan'],unavailable:['Unavailable','不可用','Tidak tersedia'],invalid_output:['Invalid output','输出无效','Output tidak sah'],in_progress:['In progress','处理中','Sedang diproses'],rate_limited:['Rate limited','请求受限','Had kadar'],input_limit:['Input limit','输入超限','Had input']};
  return copy[raw]?localeText(locale,copy[raw]):originalLanguage(raw,locale);
}

const evidenceCopy:Record<string,{title:Copy;limitations:Copy}>={
  ev_demo_001:{
    title:['Synthetic role-signal fixture','合成职业信号样例','Contoh sintetik isyarat kerjaya'],
    limitations:['Synthetic demo fixture; not public market evidence','合成演示样例；不是公开市场证据','Contoh demo sintetik; bukan bukti pasaran awam'],
  },
};
export function evidenceText(id:string,field:'title'|'limitations',raw:string,locale:Locale):string {
  const known=evidenceCopy[id];
  return known&&raw===known[field][0]?localeText(locale,known[field]):originalLanguage(raw,locale);
}

const taskCopy:Record<string,{title:Copy;reason:Copy;uncertainty:Copy}>={
  task_data_review:{
    title:['Review analysis outputs','核查分析输出','Semak output analisis'],
    reason:['A human checks context and consequences of reported results.','由人工核查结果的背景与可能后果。','Manusia menyemak konteks dan kesan keputusan yang dilaporkan.'],
    uncertainty:['Synthetic task illustration; impact not empirically assessed','合成任务示例；影响尚未经实证评估','Contoh tugas sintetik; kesannya belum dinilai secara empirikal'],
  },
  task_stakeholder_review:{
    title:['Clarify stakeholder needs','澄清相关方需求','Jelaskan keperluan pihak berkepentingan'],
    reason:['Context and accountability require human review.','背景判断与责任归属需要人工审核。','Konteks dan akauntabiliti memerlukan semakan manusia.'],
    uncertainty:['Synthetic task illustration; impact not empirically assessed','合成任务示例；影响尚未经实证评估','Contoh tugas sintetik; kesannya belum dinilai secara empirikal'],
  },
};
export function taskText(id:string,field:'title'|'reason'|'uncertainty',raw:string,locale:Locale):string {
  const known=taskCopy[id];
  return known&&raw===known[field][0]?localeText(locale,known[field]):originalLanguage(raw,locale);
}

const roleSummary:Record<string,Copy>={
  'data-analyst':['Synthetic example role focused on data interpretation.','聚焦数据解读的合成职业示例。','Contoh kerjaya sintetik yang tertumpu pada tafsiran data.'],
  'business-analyst':['Synthetic example role focused on business decisions.','聚焦商业决策的合成职业示例。','Contoh kerjaya sintetik yang tertumpu pada keputusan perniagaan.'],
};
export function roleSummaryText(id:string,raw:string,locale:Locale):string {
  return roleSummary[id]&&raw===roleSummary[id][0]?localeText(locale,roleSummary[id]):originalLanguage(raw,locale);
}

const warningCopy:Record<string,Copy>={
  'Synthetic organization catalogue; no employability probability is claimed.':['Synthetic organization catalogue; no employability probability is claimed.','合成机构职业目录；不声称任何就业概率。','Katalog organisasi sintetik; tiada dakwaan tentang kebarangkalian pekerjaan.'],
  'Recommendations and curriculum suggestions require adviser review.':['Recommendations and curriculum suggestions require adviser review.','推荐和课程建议须经导师审核。','Cadangan kerjaya dan kurikulum memerlukan semakan penasihat.'],
  'A single member result is not an institutional cohort insight.':['A single member result is not an institutional cohort insight.','单人成果不能代表院校群体洞察。','Hasil seorang ahli bukan wawasan kohort institusi.'],
  'No anonymous employee profiles were supplied; skill coverage remains unknown.':['No anonymous employee profiles were supplied; skill coverage remains unknown.','未提供匿名员工资料；技能覆盖情况仍未知。','Tiada profil pekerja tanpa nama; liputan kemahiran masih tidak diketahui.'],
  'Employee profiles were supplied, but no recorded skill baseline is available.':['Employee profiles were supplied, but no recorded skill baseline is available.','已有员工资料，但没有已记录的技能基础。','Profil pekerja disediakan, tetapi tiada asas kemahiran direkodkan.'],
  'Anonymous employee profile count exceeds the reported department headcount.':['Anonymous employee profile count exceeds the reported department headcount.','匿名员工资料数量超过所填部门人数。','Bilangan profil pekerja tanpa nama melebihi jumlah pekerja jabatan yang dilaporkan.'],
  'No target skills were selected for this department.':['No target skills were selected for this department.','该部门尚未选择目标技能。','Tiada kemahiran sasaran dipilih untuk jabatan ini.'],
  'Department-only planning is available, but employee skill coverage and mobility remain unknown.':['Department-only planning is available, but employee skill coverage and mobility remain unknown.','可仅按部门制定规划，但员工技能覆盖与内部流动情况仍未知。','Perancangan jabatan tersedia, tetapi liputan kemahiran dan mobiliti pekerja masih tidak diketahui.'],
  'B1 uses a synthetic role catalogue and deterministic rules; it is not a workforce decision system.':['B1 uses a synthetic role catalogue and deterministic rules; it is not a workforce decision system.','B1 使用合成职业目录和确定性规则；不能用作人员决策系统。','B1 menggunakan katalog kerjaya sintetik dan peraturan deterministik; ia bukan sistem keputusan tenaga kerja.'],
  'Budget feasibility is not assessed because verified course prices are not connected.':['Budget feasibility is not assessed because verified course prices are not connected.','尚未接入已核实的课程价格，因此未评估预算可行性。','Kebolehlaksanaan bajet belum dinilai kerana harga kursus yang disahkan belum dihubungkan.'],
  'Employee notes, personality descriptions and protected characteristics are excluded from scoring.':['Employee notes, personality descriptions and protected characteristics are excluded from scoring.','员工备注、性格描述和受保护特征均不参与评分。','Nota pekerja, huraian personaliti dan ciri yang dilindungi dikecualikan daripada pemarkahan.'],
  'All internal mobility and training suggestions require HR and manager review.':['All internal mobility and training suggestions require HR and manager review.','所有内部流动和培训建议均须由 HR 与管理者审核。','Semua cadangan mobiliti dalaman dan latihan memerlukan semakan HR dan pengurus.'],
};
export function warningText(raw:string,locale:Locale):string {
  return warningCopy[raw]?localeText(locale,warningCopy[raw]):originalLanguage(raw,locale);
}

export function confidenceText(value:string,locale:Locale):string {
  const copy:Record<string,Copy>={high:['High','高','Tinggi'],medium:['Medium','中','Sederhana'],low:['Low','低','Rendah']};
  return copy[value]?localeText(locale,copy[value]):originalLanguage(value,locale);
}

export function missingInputText(value:string,locale:Locale):string {
  const copy:Record<string,Copy>={interests:['Interests','兴趣','Minat'],goal_tags:['Goal tags','目标标签','Tag matlamat'],work_style:['Work style','工作方式','Gaya kerja'],skill_levels:['Skill levels','技能等级','Tahap kemahiran']};
  return copy[value]?localeText(locale,copy[value]):originalLanguage(value,locale);
}

export function studentPlanText(
  raw:string,kind:'course'|'topic'|'project',
  role:{id:string;name:string},gaps:Array<{skillId:string;name:string}>,locale:Locale,
):string {
  const names=gaps.slice(0,3).map(gap=>gap.name);
  const translated=gaps.slice(0,3).map(gap=>skillLabel(gap.skillId,gap.name,locale));
  if(kind==='course'){
    const index=names.slice(0,2).findIndex(name=>raw===`Review available modules covering ${name}`);
    if(index>=0)return localeText(locale,[raw,`查看涵盖${translated[index]}的现有课程模块`,`Semak modul sedia ada yang merangkumi ${translated[index]}`]);
    if(raw==='Review an advanced elective with an academic adviser')return localeText(locale,[raw,'与学术导师讨论进阶选修课','Semak kursus elektif lanjutan bersama penasihat akademik']);
  }
  if(kind==='topic'){
    const index=names.indexOf(raw);
    if(index>=0)return translated[index];
    if(raw==='Portfolio evidence and reflective practice')return localeText(locale,[raw,'作品集证据与反思实践','Bukti portfolio dan amalan reflektif']);
  }
  if(kind==='project'&&raw===`Complete a supervised ${role.name} project demonstrating ${names.length?names.join(', '):'advanced role practice'}.`){
    const roleName=roleLabel(role.id,role.name,locale);
    const topics=translated.length?translated.join(locale==='zh'?'、':', '):localeText(locale,['advanced role practice','进阶职业实践','amalan kerjaya lanjutan']);
    return localeText(locale,[raw,`完成一个有导师指导的${roleName}项目，展示${topics}。`,`Lengkapkan projek ${roleName} dengan penyeliaan untuk menunjukkan ${topics}.`]);
  }
  return originalLanguage(raw,locale);
}

export function workshopTitle(raw:string,skillId:string,skillRaw:string,locale:Locale):string {
  if(raw!==`${skillRaw} in practice`)return originalLanguage(raw,locale);
  const skill=skillLabel(skillId,skillRaw,locale);
  return localeText(locale,[raw,`${skill}实践工作坊`,`${skill} dalam amalan`]);
}

export function curriculumText(
  raw:string,kind:'module'|'reason',skillId:string,skillRaw:string,affected:number,locale:Locale,
):string {
  if(kind==='module'&&raw===`Applied ${skillRaw}`){
    const skill=skillLabel(skillId,skillRaw,locale);
    return localeText(locale,[raw,`${skill}应用模块`,`Modul aplikasi ${skill}`]);
  }
  if(kind==='reason'&&raw===`Addresses a recorded gap for ${affected} selected members.`)
    return localeText(locale,[raw,`回应所选群体中 ${affected} 人的已记录缺口。`,`Menangani jurang yang direkodkan bagi ${affected} ahli yang dipilih.`]);
  return originalLanguage(raw,locale);
}

type CohortGap={skillId:string;name:string;affectedMembers:number};
export function cohortSkillText(raw:string,gaps:CohortGap[],locale:Locale):string {
  const gap=gaps.find(item=>item.name===raw);
  return gap?skillLabel(gap.skillId,gap.name,locale):originalLanguage(raw,locale);
}

export function cohortCurriculumText(raw:string,kind:'module'|'reason',gaps:CohortGap[],locale:Locale):string {
  const gap=gaps.find(item=>kind==='module'?raw===`Applied ${item.name}`:raw===`Addresses a recorded gap for ${item.affectedMembers} selected members.`);
  return gap?curriculumText(raw,kind,gap.skillId,gap.name,gap.affectedMembers,locale):originalLanguage(raw,locale);
}

export function courseSourceText(raw:string,locale:Locale):string {
  return raw==='Course mapping required'?localeText(locale,[raw,'需补充课程映射','Pemetaan kursus diperlukan']):raw;
}

export function priorityText(raw:string,locale:Locale):string {
  const copy:Record<string,Copy>={review_required:['Review required','需要核查','Semakan diperlukan'],high:['High','高','Tinggi'],medium:['Medium','中','Sederhana'],low:['Low','低','Rendah']};
  return copy[raw]?localeText(locale,copy[raw]):originalLanguage(raw,locale);
}

const backendSkillNames:Record<string,string>={sql:'SQL',excel:'Excel',python:'Python',validation:'AI Output Validation',communication:'Communication'};
export function roadmapStepTitle(skillId:string,raw:string,locale:Locale):string {
  const backendName=backendSkillNames[skillId];
  if(!backendName||raw!==`Practice ${backendName}`)return originalLanguage(raw,locale);
  const skill=skillLabel(skillId,backendName,locale);
  return localeText(locale,[raw,`练习${skill}`,`Latih ${skill}`]);
}

export function skillMapNodeTitle(skillId:string,kind:string,raw:string,locale:Locale):string {
  const name=backendSkillNames[skillId];
  if(!name)return originalLanguage(raw,locale);
  const skill=skillLabel(skillId,name,locale);
  if(kind==='concept'&&raw===`Review ${name} fundamentals`)
    return localeText(locale,[raw,`复习${skill}基础概念`,`Semak asas ${skill}`]);
  if(kind==='practice'&&raw===`Practice ${name} on a synthetic task`)
    return localeText(locale,[raw,`在合成任务中练习${skill}`,`Latih ${skill} dengan tugas sintetik`]);
  if(kind==='checkpoint'&&raw===`Check a ${name} practice result`)
    return localeText(locale,[raw,`核查${skill}练习成果`,`Semak hasil latihan ${skill}`]);
  return originalLanguage(raw,locale);
}

export function roadmapWarning(raw:string,locale:Locale):string {
  const missing=/^No eligible reviewed resource for (skill_[a-z_]+); self-directed synthetic practice only\.$/.exec(raw);
  if(missing){
    const skillId=missing[1].replace(/^skill_/,'');
    if(backendSkillNames[skillId]){
      const skill=skillLabel(skillId,backendSkillNames[skillId],locale);
      return localeText(locale,[raw,`暂无适用且经过核查的${skill}学习资源；仅提供自主合成练习。`,
        `Tiada sumber ${skill} yang sesuai dan disemak; hanya latihan sintetik kendiri tersedia.`]);
    }
  }
  const capacity=/^Estimated (\d+(?:\.\d+)?) hours exceeds capacity of (\d+(?:\.\d+)?) hours\.$/.exec(raw);
  if(capacity)return localeText(locale,[raw,`预计 ${capacity[1]} 小时超过 ${capacity[2]} 小时的可用学习时间。`,
    `Anggaran ${capacity[1]} jam melebihi kapasiti ${capacity[2]} jam.`]);
  return originalLanguage(raw,locale);
}

export function radarWarning(raw:string,locale:Locale):string {
  const copy:Record<string,Copy>={
    'Bubble data is incomplete or has non-comparable sizes; showing neutral bubbles.':['Bubble data is incomplete or has non-comparable sizes; showing neutral bubbles.','泡泡数据不完整或大小不可比较；使用中性泡泡。','Data gelembung tidak lengkap atau saiznya tidak setara; gelembung neutral dipaparkan.'],
    'Bubble data does not match the role snapshot or source label.':['Bubble data does not match the role snapshot or source label.','泡泡数据与职业快照或来源标签不符。','Data gelembung tidak sepadan dengan gambaran kerjaya atau label sumber.'],
    'Skill data does not match the role snapshot or source label.':['Skill data does not match the role snapshot or source label.','技能数据与职业快照或来源标签不符。','Data kemahiran tidak sepadan dengan gambaran kerjaya atau label sumber.'],
  };
  return copy[raw]?localeText(locale,copy[raw]):originalLanguage(raw,locale);
}

export function movementText(raw:string,locale:Locale):string {
  const copy:Record<string,Copy>={rising:['Rising','上升','Meningkat'],declining:['Declining','下降','Menurun'],stable:['Stable','稳定','Stabil'],emerging:['Emerging','新兴','Baharu']};
  return copy[raw]?localeText(locale,copy[raw]):originalLanguage(raw,locale);
}

export function feasibilityText(raw:string|undefined,locale:Locale):string {
  if(!raw)return localeText(locale,['not stated','未说明','tidak dinyatakan']);
  const copy:Record<string,Copy>={feasible:['Feasible','可行','Boleh dilaksanakan'],stretch:['Stretch','较紧张','Mencabar'],insufficient_time:['Insufficient time','时间不足','Masa tidak mencukupi']};
  return copy[raw]?localeText(locale,copy[raw]):originalLanguage(raw,locale);
}

export function scenarioText(raw:string,locale:Locale):string {
  const copy:Record<string,Copy>={moderate:['Moderate','中等','Sederhana'],fast:['Fast','快速','Pantas']};
  return copy[raw]?localeText(locale,copy[raw]):originalLanguage(raw,locale);
}

export function horizonText(raw:string,locale:Locale):string {
  const copy:Record<string,Copy>={not_assessed:['Not assessed','尚未评估','Belum dinilai'],feasible:['Feasible','可行','Boleh dilaksanakan'],stretch:['Stretch','较紧张','Mencabar']};
  return copy[raw]?localeText(locale,copy[raw]):originalLanguage(raw,locale);
}

// Reviewed against the bundled DOSM JMI/QES category IDs and source names.
// Source numbers, reporting periods, and category IDs are never translated.
const marketCategories:Record<string,Copy>=Object.fromEntries(([
  ['occupation-managers','Managers','管理人员','Pengurus'],
  ['occupation-professionals','Professionals','专业人员','Profesional'],
  ['occupation-technicians-and-associate-professionals','Technicians and associate professionals','技术人员与辅助专业人员','Juruteknik dan profesional bersekutu'],
  ['occupation-clerical-support-workers','Clerical support workers','文书支持人员','Pekerja sokongan perkeranian'],
  ['occupation-service-and-sales-workers','Service and sales workers','服务与销售人员','Pekerja perkhidmatan dan jualan'],
  ['occupation-skilled-agricultural-forestry-livestock-and-fishery-workers','Skilled agricultural, forestry, livestock and fishery workers','农业、林业、畜牧业与渔业熟练工人','Pekerja mahir pertanian, perhutanan, penternakan dan perikanan'],
  ['occupation-craft-and-related-trades-workers','Craft and related trades workers','工艺与相关行业工人','Pekerja kemahiran dan pertukangan'],
  ['occupation-plant-and-machine-operators-and-assemblers','Plant and machine operators and assemblers','设备与机械操作及装配人员','Operator loji dan mesin serta pemasang'],
  ['occupation-elementary-occupations','Elementary Occupations','基础职业人员','Pekerjaan asas'],
  ['occupation-unclassified','Unclassified','未分类','Tidak diklasifikasikan'],
  ['industry-agriculture-forestry-and-fishing','Agriculture, forestry and fishing','农业、林业与渔业','Pertanian, perhutanan dan perikanan'],
  ['industry-mining-and-quarrying','Mining and quarrying','采矿与采石','Perlombongan dan pengkuarian'],
  ['industry-manufacturing','Manufacturing','制造业','Pembuatan'],
  ['industry-electricity-gas-steam-and-air-conditioning-supply','Electricity, gas, steam and air conditioning supply','电力、燃气、蒸汽与空调供应','Bekalan elektrik, gas, wap dan pendingin hawa'],
  ['industry-water-supply-sewerage-waste-management-and-remediation-activities','Water supply, sewerage, waste management and remediation activities','供水、污水处理、废物管理与修复活动','Bekalan air, pembetungan, pengurusan sisa dan pemulihan'],
  ['industry-construction','Construction','建筑业','Pembinaan'],
  ['industry-wholesale-and-retail-trade-repair-of-motor-vehicles-and-motorcycles','Wholesale and retail trade; repair of motor vehicles and motorcycles','批发零售；机动车与摩托车维修','Perdagangan borong dan runcit; pembaikan kenderaan bermotor dan motosikal'],
  ['industry-transportation-and-storage','Transportation and storage','运输与仓储','Pengangkutan dan penyimpanan'],
  ['industry-accommodation-and-food-service-activities','Accommodation and food service activities','住宿与餐饮服务','Penginapan dan perkhidmatan makanan'],
  ['industry-information-and-communication','Information and communication','信息与通信','Maklumat dan komunikasi'],
  ['industry-financial-and-insurance-takaful-activities','Financial and insurance/ takaful activities','金融与保险／伊斯兰保险','Aktiviti kewangan dan insurans/takaful'],
  ['industry-real-estate-activities','Real estate activities','房地产活动','Aktiviti hartanah'],
  ['industry-professional-scientific-and-technical-activities','Professional, scientific and technical activities','专业、科学与技术活动','Aktiviti profesional, saintifik dan teknikal'],
  ['industry-administrative-and-support-service-activities','Administrative and support service activities','行政与支持服务活动','Aktiviti pentadbiran dan perkhidmatan sokongan'],
  ['industry-public-administration-and-defence-compulsory-social-security','Public administration and defence; compulsory social security','公共行政与国防；强制性社会保障','Pentadbiran awam dan pertahanan; keselamatan sosial wajib'],
  ['industry-education','Education','教育','Pendidikan'],
  ['industry-human-health-and-social-work-activities','Human health and social work activities','人类健康与社会工作活动','Aktiviti kesihatan manusia dan kerja sosial'],
  ['industry-arts-entertainment-and-recreation','Arts, entertainment and recreation','艺术、娱乐与休闲','Kesenian, hiburan dan rekreasi'],
  ['industry-other-service-activities','Other service activities','其他服务活动','Aktiviti perkhidmatan lain'],
  ['industry-activities-of-households-as-employers','Activities of households as employers','家庭作为雇主的活动','Aktiviti isi rumah sebagai majikan'],
  ['industry-activities-of-extraterritorial-organizations-and-bodies','Activities of extraterritorial organizations and bodies','境外组织与机构活动','Aktiviti organisasi dan badan luar wilayah'],
  ['industry-unclassified','Unclassified','未分类','Tidak diklasifikasikan'],
  ['employment-agriculture','Agriculture','农业','Pertanian'],
  ['employment-construction','Construction','建筑业','Pembinaan'],
  ['employment-manufacturing','Manufacturing','制造业','Pembuatan'],
  ['employment-mining-quarrying','Mining & Quarrying','采矿与采石','Perlombongan dan pengkuarian'],
  ['employment-services','Services','服务业','Perkhidmatan'],
] as Array<[string,string,string,string]>).map(([id,en,zh,ms])=>[id,[en,zh,ms] as Copy]));

export function marketCategoryText(id:string,raw:string,locale:Locale):string {
  const copy=marketCategories[id];
  return copy&&raw===copy[0]?localeText(locale,copy):originalLanguage(raw,locale);
}

export function marketAttributionText(raw:string,locale:Locale):string {
  const official='Data source: Department of Statistics Malaysia. Derived and visualized by SyncEra; DOSM does not endorse this application or its analysis.';
  return raw===official?localeText(locale,[official,
    '数据来源：马来西亚统计局。由 SyncEra 整理与可视化；马来西亚统计局未认可本应用或其分析。',
    'Sumber data: Jabatan Perangkaan Malaysia. Diolah dan divisualkan oleh SyncEra; DOSM tidak mengendors aplikasi atau analisis ini.']):originalLanguage(raw,locale);
}
