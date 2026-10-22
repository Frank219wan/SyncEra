import type {Copy, PsychologyAssessment} from './types.ts';

export interface LearningSupportPreferences {
  stepSize: 'micro' | 'standard';
  guidanceLevel: 'high' | 'standard';
  motivationFocus: 'mastery' | 'purpose' | 'practical' | 'choice' | 'balanced';
  emphasizeTransferableSkills: boolean;
  preferStructuredMilestones: boolean;
}

export interface LearningSupport {
  preferences: LearningSupportPreferences;
  reflectionInsights: Array<{
    dimension: 'uncertainty' | 'skill_demands' | 'career_agency' | 'motivation' | 'learning_approach';
    message: Copy;
  }>;
}

/**
 * Product heuristics for presentation only. These choices do not change role
 * eligibility, recommendation scores, disruption assumptions, or market data.
 */
export function deriveLearningSupport(assessment?: PsychologyAssessment | null): LearningSupport | null {
  if (!assessment?.consent_to_personalization) return null;
  const answers = assessment.scenario_answers;
  if (!Object.values(answers).some(answer => answer !== null)) return null;

  const smallStep = answers.S1 === 'A' || answers.S1 === 'D' || answers.S2 === 'A'
    || answers.S5 === 'A' || answers.S5 === 'B' || answers.S5 === 'C';
  const highGuidance = answers.S1 === 'A' || answers.S1 === 'B'
    || answers.S2 === 'A' || answers.S2 === 'B'
    || answers.S3 === 'D' || answers.S5 === 'A' || answers.S5 === 'B';
  const motivationFocus = answers.S4 === 'B' ? 'mastery'
    : answers.S4 === 'C' ? 'purpose'
      : answers.S4 === 'A' ? 'practical'
        : answers.S4 === 'D' ? 'choice' : 'balanced';
  const emphasizeTransferableSkills = answers.S1 === 'C' || answers.S2 === 'B' || answers.S2 === 'C';
  const preferStructuredMilestones = highGuidance || answers.S5 === 'D';
  const reflectionInsights: LearningSupport['reflectionInsights'] = [];

  if (smallStep) reflectionInsights.push({dimension:'learning_approach',message:[
    'We’ll make one manageable first action easy to find.',
    '我们会先突出一个容易开始、可逐步完成的行动。',
    'Kami akan menonjolkan satu tindakan awal yang mudah dimulakan.',
  ]});
  if (emphasizeTransferableSkills) reflectionInsights.push({dimension:'skill_demands',message:[
    'We’ll connect new learning to skills and experience you already have.',
    '我们会把新学习内容与您已有的技能和经验联系起来。',
    'Kami akan menghubungkan pembelajaran baharu dengan kemahiran dan pengalaman sedia ada.',
  ]});
  if (answers.S2 === 'D') reflectionInsights.push({dimension:'skill_demands',message:[
    'We’ll explain why a skill belongs in the pathway before adding it.',
    '在把技能加入学习路径前，我们会先说明它为何重要。',
    'Kami akan menerangkan sebab sesuatu kemahiran penting sebelum memasukkannya ke dalam laluan.',
  ]});
  if (answers.S3 === 'A' || answers.S3 === 'B' || answers.S3 === 'D') reflectionInsights.push({dimension:'career_agency',message:[
    'We’ll keep your choices visible and focus on actions you can control.',
    '我们会清楚呈现您的选择，并聚焦于您能掌控的行动。',
    'Kami akan menjelaskan pilihan anda dan menumpukan pada tindakan yang boleh anda kawal.',
  ]});
  if (motivationFocus === 'mastery') reflectionInsights.push({dimension:'motivation',message:[
    'We’ll make practice projects and concrete skill checkpoints easy to track.',
    '我们会让实践项目和具体技能检查点更容易追踪。',
    'Kami akan memudahkan penjejakan projek amali dan pencapaian kemahiran yang jelas.',
  ]});
  if (motivationFocus === 'purpose') reflectionInsights.push({dimension:'motivation',message:[
    'We’ll connect practice to the people and problems the work can support.',
    '我们会说明实践如何帮助他人或解决实际问题。',
    'Kami akan menghubungkan latihan dengan orang dan masalah yang boleh dibantu oleh kerja itu.',
  ]});
  if (motivationFocus === 'practical') reflectionInsights.push({dimension:'motivation',message:[
    'We’ll foreground practical outcomes for each learning milestone.',
    '我们会优先说明每个学习里程碑带来的实际成果。',
    'Kami akan mengutamakan hasil praktikal bagi setiap pencapaian pembelajaran.',
  ]});
  if (motivationFocus === 'choice') reflectionInsights.push({dimension:'motivation',message:[
    'We’ll keep the pathway flexible and make it easy to revise your next step.',
    '我们会保持路径灵活，并让您容易调整下一步。',
    'Kami akan memastikan laluan ini fleksibel dan memudahkan anda mengubah langkah seterusnya.',
  ]});

  return {
    preferences: {
      stepSize: smallStep ? 'micro' : 'standard',
      guidanceLevel: highGuidance ? 'high' : 'standard',
      motivationFocus,
      emphasizeTransferableSkills,
      preferStructuredMilestones,
    },
    reflectionInsights,
  };
}

export function shouldShowFirstStep(preferences: LearningSupportPreferences): boolean {
  return preferences.stepSize === 'micro' || preferences.guidanceLevel === 'high';
}
