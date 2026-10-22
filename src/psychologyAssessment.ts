import type {Copy, PsychologyAnswer, PsychologyAssessment, PsychologyScenarioId} from './types.ts';

export interface AssessmentOption { id: PsychologyAnswer; label: Copy }
export interface AssessmentQuestion {
  id: PsychologyScenarioId;
  situation: Copy;
  question: Copy;
  options: AssessmentOption[];
}

export const psychologyQuestions: AssessmentQuestion[] = [
  {
    id: 'S1',
    situation: [
      'Your company announces a major shift in how your department operates. Roles, tools, and daily workflows will be restructured over the next year.',
      '你的公司宣布部门运作方式将发生重大变化。未来一年，岗位、工具和日常工作流程都将重新调整。',
      'Syarikat anda mengumumkan perubahan besar dalam operasi jabatan. Peranan, alat dan aliran kerja harian akan disusun semula dalam tempoh setahun.',
    ],
    question: [
      'How do you naturally respond to this kind of news?',
      '听到这类消息时，你通常会有什么反应？',
      'Bagaimanakah reaksi semula jadi anda terhadap berita seperti ini?',
    ],
    options: [
      {id:'A',label:['I feel stuck or overwhelmed because it’s hard to predict where my role will end up.','我感到不知所措，因为很难预测自己的岗位会变成什么样。','Saya berasa buntu atau terbeban kerana sukar menjangka perubahan pada peranan saya.']},
      {id:'B',label:['I assume leadership will decide my fate, so I just wait and see what happens to me.','我认为领导层会决定我的去向，所以只好等待结果。','Saya menganggap pihak kepimpinan akan menentukan nasib saya, jadi saya hanya menunggu dan melihat.']},
      {id:'C',label:["I get worried that my experience won't hold value anymore, making effort feel pointless.",'我担心过往经验不再有价值，因此觉得努力可能没有意义。','Saya bimbang pengalaman saya tidak lagi bernilai, lalu usaha terasa sia-sia.']},
      {id:'D',label:['I look for small, manageable areas within the change where I can build new skills.','我会在变化中寻找一些可掌控的小领域，培养新技能。','Saya mencari ruang kecil yang mampu diurus dalam perubahan ini untuk membina kemahiran baharu.']},
      {id:'E',label:['Other (Open response)','其他（请补充）','Lain-lain (Jawapan terbuka)']},
    ],
  },
  {
    id: 'S2',
    situation: [
      'You notice that the expectations for your field are evolving rapidly. Every few months, new methods and tools are introduced that change how work gets done.',
      '你发现所在领域的要求正在快速变化。每隔几个月，就会出现改变工作方式的新方法和工具。',
      'Anda melihat jangkaan dalam bidang anda berubah dengan pantas. Setiap beberapa bulan, kaedah dan alat baharu diperkenalkan lalu mengubah cara kerja dilakukan.',
    ],
    question: [
      'Which statement best matches your internal reaction?',
      '哪句话最能描述你内心的反应？',
      'Pernyataan manakah paling menggambarkan reaksi dalaman anda?',
    ],
    options: [
      {id:'A',label:['"No matter how hard I try to learn, the bar keeps moving faster than I can keep up."','“无论我多努力学习，要求提高的速度总是快过我跟上的速度。”','“Walau sekuat mana saya cuba belajar, tahap yang diperlukan sentiasa berubah lebih pantas daripada kemampuan saya mengikutinya.”']},
      {id:'B',label:["\"I'm capable of learning, but I feel like I'm constantly starting from scratch as a beginner.\"",'“我有能力学习，但总觉得自己不断从零开始，像个初学者。”','“Saya mampu belajar, tetapi terasa seperti sentiasa bermula semula sebagai orang baharu.”']},
      {id:'C',label:['"I feel confident that my core human judgment and problem-solving matter more than mastering every tool."','“我相信，核心判断力和解决问题的能力比掌握每一种工具更重要。”','“Saya yakin pertimbangan manusia dan penyelesaian masalah asas lebih penting daripada menguasai setiap alat.”']},
      {id:'D',label:["\"I don't bother trying to learn every new trend; it’s usually just temporary hype.\"",'“我不会费心学习每个新趋势；它们通常只是短暂的炒作。”','“Saya tidak bersusah payah mempelajari setiap trend baharu; biasanya ia hanya heboh sementara.”']},
      {id:'E',label:['Other (Open response)','其他（请补充）','Lain-lain (Jawapan terbuka)']},
    ],
  },
  {
    id: 'S3',
    situation: [
      'Think about your professional growth over the next 3 to 5 years.',
      '想一想未来 3 至 5 年的职业发展。',
      'Fikirkan perkembangan kerjaya anda dalam tempoh 3 hingga 5 tahun akan datang.',
    ],
    question: [
      'Who or what do you feel is currently driving your professional trajectory?',
      '你觉得目前是谁或什么因素在推动你的职业轨迹？',
      'Pada pendapat anda, siapa atau apakah yang sedang mempengaruhi hala tuju kerjaya anda?',
    ],
    options: [
      {id:'A',label:['External market trends, corporate decisions, and economic factors outside my control.','我无法控制的外部市场趋势、公司决策和经济因素。','Trend pasaran, keputusan syarikat dan faktor ekonomi di luar kawalan saya.']},
      {id:'B',label:["My immediate manager's demands and whatever my current job requires today.",'直属经理的要求，以及当前工作眼下需要我做的事。','Tuntutan pengurus saya dan keperluan kerja semasa.']},
      {id:'C',label:['My own deliberate choices, personal goals, and long-term vision.','我自己的慎重选择、个人目标和长期愿景。','Pilihan yang saya buat dengan sengaja, matlamat peribadi dan visi jangka panjang saya.']},
      {id:'D',label:['Pure chance and luck—I just react to whatever comes my way.','纯粹是偶然和运气——我只是对遇到的事情作出反应。','Nasib semata-mata—saya hanya bertindak balas terhadap apa sahaja yang berlaku.']},
      {id:'E',label:['Other (Open response)','其他（请补充）','Lain-lain (Jawapan terbuka)']},
    ],
  },
  {
    id: 'S4',
    situation: [
      'Imagine completing a major project at work after weeks of intense effort.',
      '想象一下，经过数周的努力，你终于完成了一项重要工作项目。',
      'Bayangkan anda menyiapkan projek besar di tempat kerja selepas berusaha bersungguh-sungguh selama beberapa minggu.',
    ],
    question: [
      'What thought gives you the deepest sense of satisfaction?',
      '什么想法最能让你感到满足？',
      'Apakah fikiran yang paling memberi anda rasa kepuasan?',
    ],
    options: [
      {id:'A',label:["\"I'm just glad it's over and I checked the box so I can get my paycheck.\"",'“我很庆幸事情终于结束、任务完成了，这样就能领到薪水。”','“Saya cuma lega ia selesai dan tugas ditandakan siap supaya saya menerima gaji.”']},
      {id:'B',label:['"I proved that I am capable and expanded my personal mastery."','“我证明了自己的能力，也提升了个人专长。”','“Saya membuktikan kemampuan diri dan memperluas penguasaan peribadi.”']},
      {id:'C',label:['"I solved a real problem that positively impacted other people or a broader cause."','“我解决了一个真实问题，并对他人或更广泛的事业产生了积极影响。”','“Saya menyelesaikan masalah sebenar yang memberi kesan positif kepada orang lain atau tujuan yang lebih besar.”']},
      {id:'D',label:["\"I don't really feel much satisfaction from work anymore.\"",'“我现在从工作中已经很难感到满足了。”','“Saya tidak lagi berasa banyak kepuasan daripada kerja.”']},
      {id:'E',label:['Other (Open response)','其他（请补充）','Lain-lain (Jawapan terbuka)']},
    ],
  },
  {
    id: 'S5',
    situation: [
      'You are asked to master a completely new skill set to remain competitive in your field.',
      '为了在所在领域保持竞争力，你需要掌握一套全新的技能。',
      'Anda diminta menguasai set kemahiran yang benar-benar baharu untuk kekal berdaya saing dalam bidang anda.',
    ],
    question: [
      "When you look at the total list of things you don't know yet, what is your initial reaction?",
      '看到自己尚未掌握的所有内容时，你的第一反应是什么？',
      'Apakah reaksi awal anda apabila melihat senarai penuh perkara yang belum anda ketahui?',
    ],
    options: [
      {id:'A',label:["I freeze—the gap feels too wide, and I don't know where to start without making a mistake.",'我会僵住——差距似乎太大，而且不知道从哪里开始才不会犯错。','Saya menjadi kaku—jurangnya terasa terlalu besar dan saya tidak tahu cara bermula tanpa membuat kesilapan.']},
      {id:'B',label:['I feel anxious, but I try to swallow the whole list at once by frantically cramming.','我会感到焦虑，但还是试图一次性啃下全部内容，拼命突击。','Saya berasa cemas, tetapi cuba menghabiskan seluruh senarai sekaligus dengan belajar secara tergesa-gesa.']},
      {id:'C',label:['I prefer to break it down into one tiny, bite-sized step at a time so I can see organic progress.','我更愿意把它拆成一个个很小的步骤，逐步看到自然的进展。','Saya lebih suka membahagikannya kepada langkah kecil supaya dapat melihat kemajuan secara beransur-ansur.']},
      {id:'D',label:['I feel confident in my ability to learn anything once I have a clear roadmap.','只要有清晰的路线图，我就有信心学会任何东西。','Saya yakin boleh mempelajari apa sahaja apabila mempunyai pelan hala tuju yang jelas.']},
      {id:'E',label:['Other (Open response)','其他（请补充）','Lain-lain (Jawapan terbuka)']},
    ],
  },
];

export const emptyAssessmentAnswers = (): PsychologyAssessment['scenario_answers'] => ({S1:null,S2:null,S3:null,S4:null,S5:null});

export function isAssessmentAnswerComplete(answer: PsychologyAnswer | null, otherResponse = ''): boolean {
  return answer !== null && (answer !== 'E' || otherResponse.trim().length > 0);
}

export function canAdvanceAssessment(answer: PsychologyAnswer | null, otherResponse = ''): boolean {
  return isAssessmentAnswerComplete(answer, otherResponse);
}

export function nextAssessmentIndex(index: number): number {
  return Math.min(psychologyQuestions.length - 1, index + 1);
}

export function previousAssessmentIndex(index: number): number {
  return Math.max(0, index - 1);
}

export function buildPsychologyAssessment(
  answers: PsychologyAssessment['scenario_answers'],
  otherResponses: Partial<Record<PsychologyScenarioId, string>>,
): PsychologyAssessment {
  const cleanOther: Partial<Record<PsychologyScenarioId, string>> = {};
  for (const question of psychologyQuestions) {
    const answer = answers[question.id];
    // null means the user explicitly skipped this step in the sequential UI.
    if (answer === null) continue;
    if (!isAssessmentAnswerComplete(answer, otherResponses[question.id] ?? '')) throw new Error(`${question.id} requires a nonempty response for option E.`);
    if (answer === 'E') cleanOther[question.id] = otherResponses[question.id]!;
  }
  return {
    assessment_version: '1.0',
    assessment_type: 'self_report_reflection',
    scenario_answers: {...answers},
    other_responses: cleanOther,
    consent_to_personalization: true,
  };
}
