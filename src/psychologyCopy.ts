import type {Copy} from './types';

export interface PsychologyReflectionItem {
  title: Copy;
  situation: Copy;
  question: Copy;
  options: readonly [Copy,Copy,Copy,Copy];
}

export const psychologyReflectionItems: readonly PsychologyReflectionItem[] = [
  {
    title:['Navigating Structural Change','应对结构性变化','Menghadapi perubahan struktur'],
    situation:[
      'Your company announces a major shift in how your department operates. Roles, tools, and daily workflows will be restructured over the next year.',
      '公司宣布将大幅调整你所在部门的运作方式。未来一年，岗位职责、工具和日常流程都将重新规划。',
      'Syarikat anda mengumumkan perubahan besar terhadap cara jabatan anda beroperasi. Peranan, alatan dan aliran kerja harian akan disusun semula sepanjang tahun hadapan.',
    ],
    question:['How do you naturally respond to this kind of news?','面对这类消息时，你通常会有什么反应？','Apakah reaksi semula jadi anda apabila menerima berita seperti ini?'],
    options:[
      ['I feel stuck or overwhelmed because it is hard to predict where my role will end up.','我会感到无所适从或压力很大，因为很难预料自己的岗位会变成什么样。','Saya berasa buntu atau terbeban kerana sukar menjangka keadaan peranan saya kelak.'],
      ['I assume leadership will decide my fate, so I wait to see what happens.','我认为管理层会决定我的去向，所以先等待事情发展。','Saya menganggap pihak pengurusan akan menentukan nasib saya, jadi saya menunggu untuk melihat apa yang berlaku.'],
      ['I worry that my experience may no longer be valuable, making further effort feel pointless.','我担心过去的经验会失去价值，因此觉得继续努力也没有意义。','Saya bimbang pengalaman saya mungkin tidak lagi bernilai sehingga usaha seterusnya terasa sia-sia.'],
      ['I look for small, manageable parts of the change where I can build new skills.','我会从变化中寻找可掌控的小切口，并借此培养新技能。','Saya mencari bahagian perubahan yang kecil dan boleh diurus untuk membina kemahiran baharu.'],
    ],
  },
  {
    title:['Keeping Up with Changing Skill Demands','跟上不断变化的技能需求','Mengikuti perubahan keperluan kemahiran'],
    situation:[
      'Expectations in your field are changing quickly. Every few months, new methods and tools reshape how work is done.',
      '你所在领域的要求变化很快。每隔几个月，新的方法和工具都会改变工作的完成方式。',
      'Jangkaan dalam bidang anda berubah dengan pantas. Setiap beberapa bulan, kaedah dan alatan baharu mengubah cara kerja dilaksanakan.',
    ],
    question:['Which statement best matches your inner reaction?','以下哪种说法最符合你内心的反应？','Pernyataan manakah yang paling menggambarkan reaksi dalaman anda?'],
    options:[
      ['No matter how hard I learn, the expectations seem to move faster than I can keep up.','无论多努力学习，要求似乎总是变化得比我适应得更快。','Walau sekuat mana saya belajar, jangkaan nampaknya berubah lebih pantas daripada kemampuan saya mengikutinya.'],
      ['I know I can learn, but I feel as though I am repeatedly starting again as a beginner.','我知道自己学得会，但总觉得一次次回到新手起点。','Saya tahu saya boleh belajar, tetapi saya terasa seperti perlu bermula semula sebagai pemula berulang kali.'],
      ['I trust that human judgment and problem-solving matter more than mastering every tool.','我相信人的判断力和解决问题的能力，比掌握每一种工具更重要。','Saya yakin pertimbangan manusia dan keupayaan menyelesaikan masalah lebih penting daripada menguasai setiap alatan.'],
      ['I usually do not chase every new trend because many of them may be temporary.','我通常不会追逐每一个新趋势，因为其中不少可能只是暂时的。','Saya biasanya tidak mengejar setiap trend baharu kerana banyak daripadanya mungkin hanya sementara.'],
    ],
  },
  {
    title:['Career Ownership and Direction','职业主动权与方向','Pemilikan dan hala tuju kerjaya'],
    situation:[
      'Think about your professional growth over the next three to five years.',
      '请想一想未来三到五年的职业成长。',
      'Fikirkan tentang perkembangan kerjaya anda dalam tempoh tiga hingga lima tahun akan datang.',
    ],
    question:['Who or what do you feel is currently driving your professional direction?','你觉得目前是谁或什么因素在主导你的职业方向？','Siapa atau apakah yang anda rasa sedang menentukan hala tuju kerjaya anda sekarang?'],
    options:[
      ['Market trends, company decisions, and economic factors outside my control.','市场趋势、公司决策和我无法控制的经济因素。','Trend pasaran, keputusan syarikat dan faktor ekonomi di luar kawalan saya.'],
      ['My manager’s immediate needs and whatever my current role requires today.','直属主管眼前的要求，以及当前岗位今天需要我完成的事情。','Keperluan segera pengurus saya dan apa sahaja yang diperlukan oleh peranan saya sekarang.'],
      ['My own deliberate choices, personal goals, and long-term vision.','我主动做出的选择、个人目标和长期愿景。','Pilihan saya sendiri yang disengajakan, matlamat peribadi dan visi jangka panjang.'],
      ['Mostly chance and luck; I react to whatever comes my way.','主要靠机遇和运气；发生什么，我就应对什么。','Kebanyakannya kebetulan dan nasib; saya bertindak balas terhadap apa sahaja yang berlaku.'],
    ],
  },
  {
    title:['Connection to Work and Purpose','工作联结与意义感','Hubungan dengan kerja dan tujuan'],
    situation:[
      'Imagine finishing a major work project after several weeks of intense effort.',
      '想象一下，经过数周的高强度投入后，你终于完成了一项重要工作。',
      'Bayangkan anda menyiapkan sebuah projek kerja utama selepas beberapa minggu berusaha dengan gigih.',
    ],
    question:['Which thought gives you the deepest sense of satisfaction?','哪一种想法最能带给你深层的满足感？','Fikiran manakah yang memberi anda rasa kepuasan paling mendalam?'],
    options:[
      ['I am relieved it is finished and that I completed what was required for my pay.','我很庆幸工作终于结束，也完成了领取薪酬所要求的任务。','Saya lega kerana kerja itu selesai dan saya telah melaksanakan perkara yang diperlukan untuk menerima gaji.'],
      ['I proved my ability and developed greater personal mastery.','我证明了自己的能力，也进一步提升了专业掌控力。','Saya membuktikan keupayaan diri dan meningkatkan penguasaan peribadi.'],
      ['I solved a real problem that helped other people or contributed to a wider cause.','我解决了一个真实问题，帮助了他人或为更广泛的目标作出贡献。','Saya menyelesaikan masalah sebenar yang membantu orang lain atau menyumbang kepada tujuan yang lebih luas.'],
      ['I do not feel much satisfaction from work at the moment.','目前，工作并不能带给我太多满足感。','Pada masa ini, saya tidak memperoleh banyak kepuasan daripada kerja.'],
    ],
  },
  {
    title:['Approach to Learning and Mastery','学习与掌握新技能的方式','Pendekatan terhadap pembelajaran dan penguasaan'],
    situation:[
      'You need to master a completely new set of skills to remain competitive in your field.',
      '为了在所在领域保持竞争力，你需要掌握一套完全陌生的新技能。',
      'Anda perlu menguasai satu set kemahiran yang benar-benar baharu untuk kekal berdaya saing dalam bidang anda.',
    ],
    question:['When you see everything you do not yet know, what is your first reaction?','当你看到所有尚未掌握的内容时，第一反应是什么？','Apabila melihat semua perkara yang belum anda ketahui, apakah reaksi pertama anda?'],
    options:[
      ['I freeze because the gap feels too wide and I do not know how to begin without making a mistake.','我会僵住，因为差距看起来太大，也不知道怎样开始才能避免犯错。','Saya menjadi kaku kerana jurangnya terasa terlalu besar dan saya tidak tahu cara bermula tanpa melakukan kesilapan.'],
      ['I feel anxious and try to learn the entire list at once by cramming.','我会感到焦虑，并试图通过突击学习一次掌握全部内容。','Saya berasa cemas dan cuba mempelajari seluruh senarai sekali gus secara tergesa-gesa.'],
      ['I break it into one small step at a time so that I can see steady progress.','我会把任务拆成一个个小步骤，让自己看见持续的进展。','Saya memecahkannya kepada langkah kecil satu demi satu supaya dapat melihat kemajuan yang berterusan.'],
      ['I am confident that I can learn it once I have a clear roadmap.','只要有清晰的路线图，我相信自己能够学会。','Saya yakin dapat mempelajarinya apabila mempunyai pelan hala tuju yang jelas.'],
    ],
  },
];
