import type { Copy, Profile, Person, Organization, Role } from './types';
export const skillNames: Record<string, Copy> = {
  python: ['Python', 'Python', 'Python'], sql: ['SQL', 'SQL', 'SQL'],
  excel: ['Excel', 'Excel', 'Excel'], validation: ['AI output validation', 'AI 输出验证', 'Pengesahan output AI'],
  analytics: ['Data analysis', '数据分析', 'Analisis data'], communication: ['Communication', '沟通协作', 'Komunikasi'],
  ai: ['Applied AI', 'AI 应用', 'AI gunaan'], visualization: ['Data storytelling', '数据叙事', 'Penceritaan data'],
  sustainability: ['Sustainability', '可持续发展', 'Kelestarian'], design: ['Learning design', '学习设计', 'Reka bentuk pembelajaran'],
  research: ['User research', '用户研究', 'Penyelidikan pengguna'], automation: ['Workflow automation', '流程自动化', 'Automasi aliran kerja'],
};
export const organizationGoals: Array<{id:string;label:Copy}> = [
  {id:'productivity',label:['Productivity','提升效率','Produktiviti']},
  {id:'digital-transformation',label:['Digital transformation','数字化转型','Transformasi digital']},
  {id:'internal-mobility',label:['Internal mobility','内部流动','Mobiliti dalaman']},
  {id:'retention',label:['Retention & engagement','员工留任与参与度','Pengekalan & penglibatan']},
  {id:'leadership',label:['Leadership development','领导力发展','Pembangunan kepimpinan']},
  {id:'service-quality',label:['Service quality','服务质量','Kualiti perkhidmatan']},
  {id:'resilience',label:['Operational resilience','运营韧性','Daya tahan operasi']},
];
export const roles: Role[] = [
  {id:'data-analyst',name:['Data Analyst','数据分析师','Penganalisis Data'],domain:'technology',
    description:['Turn information into decisions. Combine analytical thinking with clear, human communication.','把信息转化为决策，将分析思维与清晰的沟通相结合。','Tukar maklumat kepada keputusan melalui analisis dan komunikasi yang jelas.'],
    skills:['sql','python','validation'],scores:{moderate:86,fast:79},signal:84,trend:'rising',sdgs:[8,9]},
  {id:'business-analyst',name:['Business Analyst','业务分析师','Penganalisis Perniagaan'],domain:'business',
    description:['Clarify business needs, connect evidence with decisions, and communicate practical improvements.','澄清业务需求，以证据支持决策，并推动可执行的改进。','Jelaskan keperluan perniagaan, hubungkan bukti dengan keputusan dan cadangkan penambahbaikan praktikal.'],
    skills:['excel','communication','validation'],scores:{moderate:64,fast:61},signal:64,trend:'stable',sdgs:[8]},
  {id:'ai-workflow',name:['AI Workflow Designer','AI 工作流设计师','Pereka Aliran Kerja AI'],domain:'technology',
    description:['Design useful human–AI workflows, test their reliability, and help teams use them thoughtfully.','设计实用的人机协作流程，验证可靠性，并帮助团队合理使用 AI。','Reka aliran kerja manusia–AI yang berguna dan uji kebolehpercayaannya.'],
    skills:['ai','automation','python','communication'],scores:{moderate:80,fast:89},signal:90,trend:'emerging',sdgs:[8,9]},
  {id:'sustainability-analyst',name:['Sustainability Analyst','可持续发展分析师','Penganalisis Kelestarian'],domain:'green',
    description:['Connect data with environmental goals to help organizations understand and improve their impact.','将数据与环境目标相结合，帮助机构理解并改善环境影响。','Hubungkan data dengan matlamat alam sekitar untuk memperbaiki impak organisasi.'],
    skills:['analytics','sustainability','visualization','communication'],scores:{moderate:77,fast:76},signal:72,trend:'rising',sdgs:[7,13]},
  {id:'learning-designer',name:['Learning Experience Designer','学习体验设计师','Pereka Pengalaman Pembelajaran'],domain:'education',
    description:['Build accessible learning experiences around the needs of real learners.','围绕学习者的实际需要，设计易于使用的学习体验。','Bina pengalaman pembelajaran yang mudah diakses berasaskan keperluan pelajar.'],
    skills:['design','research','communication','ai'],scores:{moderate:73,fast:82},signal:65,trend:'stable',sdgs:[4,8]},
  {id:'research-analyst',name:['UX Researcher','用户体验研究员','Penyelidik UX'],domain:'technology',
    description:['Understand people through research and translate findings into better products and services.','通过研究理解用户，把发现转化为更好的产品与服务。','Fahami pengguna melalui penyelidikan untuk membentuk produk dan perkhidmatan yang lebih baik.'],
    skills:['research','analytics','communication','visualization'],scores:{moderate:71,fast:74},signal:62,trend:'stable',sdgs:[9]},
];
export const emptyProfile: Profile = {id:'demo-individual-001',stage:'',goal:'',occupation:'',education:'',experience:'',skills:[],interests:'',vision:'',preferences:'',mbti:'',region:'Malaysia',synthetic:true,sample:false};
export const sampleProfile: Profile = {...emptyProfile,stage:'graduate',goal:'explore',occupation:'Business graduate',education:'Bachelor of Business Analytics (synthetic)',experience:'Built an Excel dashboard for a student project; presented findings to a team.',skills:[{id:'analytics',level:'intermediate',source:'cv_extracted',confirmed:false},{id:'communication',level:'intermediate',source:'inferred',confirmed:false},{id:'sql',level:'beginner',source:'cv_extracted',confirmed:false}],interests:'Technology, sustainability, solving practical problems',vision:'Use data to make useful decisions and continue learning.',sample:true};
const person = (id:string, department:string, skills:string[], target:string): Person => ({id,department,skills,target,known:true,role:'Analyst',traits:'Collaboration, problem solving',aspiration:'Build applied digital skills',hours:4,courses:'Statistics, Information Systems',interests:'Data and technology',notes:'Synthetic record for interface demonstration',year:'Year 3'});
export const hrSample: Organization = {name:'Canopy Works · Demo',sector:'Professional services',needs:['analytics','ai','automation','visualization'],budget:1200,weeks:8,goals:['productivity','digital-transformation','internal-mobility'],departments:[
  {id:'dept-operations',name:'Operations',responsibilities:'Deliver reliable internal workflows and services.',currentStatus:'Growing',challenges:'Manual reporting and disconnected tools.',goals:['productivity','digital-transformation'],headcount:2},
  {id:'dept-marketing',name:'Marketing',responsibilities:'Understand audiences and communicate product value.',currentStatus:'Stable',challenges:'Limited analytics capacity and inconsistent campaign measurement.',goals:['digital-transformation','service-quality'],headcount:2},
  {id:'dept-people',name:'People & Culture',responsibilities:'Support employee experience, development, and workforce planning.',currentStatus:'Growing',challenges:'Career pathways and learning needs are not yet consistently mapped.',goals:['internal-mobility','retention'],headcount:2},
],people:[
  person('EMP-001','Operations',['analytics','communication'],'ai-workflow'),person('EMP-002','Operations',['sql','analytics'],'data-analyst'),
  person('EMP-003','Marketing',['communication','research'],'learning-designer'),person('EMP-004','Marketing',['analytics','visualization'],'data-analyst'),
  person('EMP-005','People & Culture',['communication','design'],'learning-designer'),person('EMP-006','People & Culture',['research','communication'],'research-analyst'),
],selected:[],revision:1,analyzedRevision:0,training:{}};
export const tvetSample: Organization = {name:'Greenfield Institute · Demo',sector:'Higher education',needs:[],budget:0,weeks:12,people:[
  {...person('STU-001','Business Analytics',['analytics','communication'],'data-analyst'),role:'Student'},
  {...person('STU-002','Computer Science',['python','sql'],'ai-workflow'),role:'Student'},
  {...person('STU-003','Business Analytics',['sql','analytics'],'data-analyst'),role:'Student'},
  {...person('STU-004','Environmental Studies',['sustainability','research'],'sustainability-analyst'),role:'Student'},
  {...person('STU-005','Computer Science',['python','automation'],'ai-workflow'),role:'Student'},
  {...person('STU-006','Education',['communication','design'],'learning-designer'),role:'Student'},
],selected:[],revision:1,analyzedRevision:0,training:{}};
export const resources = [
  {id:'python',title:'The Python Tutorial',provider:'Python Software Foundation',url:'https://docs.python.org/3/tutorial/',language:'English'},
  {id:'sql',title:'PostgreSQL Tutorial',provider:'PostgreSQL Global Development Group',url:'https://www.postgresql.org/docs/current/tutorial.html',language:'English'},
  {id:'ai',title:'Introduction to generative AI and agents',provider:'Microsoft Learn',url:'https://learn.microsoft.com/en-us/training/modules/fundamentals-generative-ai/',language:'English'},
];
