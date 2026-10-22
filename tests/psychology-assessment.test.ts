import test from 'node:test';
import assert from 'node:assert/strict';
import {emptyProfile,sampleProfile} from '../src/data.ts';
import {buildPsychologyAssessment,canAdvanceAssessment,emptyAssessmentAnswers,nextAssessmentIndex,previousAssessmentIndex,psychologyQuestions} from '../src/psychologyAssessment.ts';
import {deriveLearningSupport} from '../src/psychologySupport.ts';
import {mergeNormalizedProfile,profileToConfirmRequest,profileToNormalizeRequest} from '../src/services/api-contract.ts';

test('questionnaire contains the exact English scenario and question wording',()=>{
  assert.deepEqual(psychologyQuestions.map(question=>question.situation[0]),[
    'Your company announces a major shift in how your department operates. Roles, tools, and daily workflows will be restructured over the next year.',
    'You notice that the expectations for your field are evolving rapidly. Every few months, new methods and tools are introduced that change how work gets done.',
    'Think about your professional growth over the next 3 to 5 years.',
    'Imagine completing a major project at work after weeks of intense effort.',
    'You are asked to master a completely new skill set to remain competitive in your field.',
  ]);
  assert.deepEqual(psychologyQuestions.map(question=>question.question[0]),[
    'How do you naturally respond to this kind of news?',
    'Which statement best matches your internal reaction?',
    'Who or what do you feel is currently driving your professional trajectory?',
    'What thought gives you the deepest sense of satisfaction?',
    "When you look at the total list of things you don't know yet, what is your initial reaction?",
  ]);
  assert.ok(psychologyQuestions.every(question=>question.options.map(option=>option.id).join('')==='ABCDE'));
});

test('questionnaire contains the exact English answer wording',()=>{
  assert.deepEqual(psychologyQuestions.map(question=>question.options.map(option=>option.label[0])),[
    [
      'I feel stuck or overwhelmed because it’s hard to predict where my role will end up.',
      'I assume leadership will decide my fate, so I just wait and see what happens to me.',
      "I get worried that my experience won't hold value anymore, making effort feel pointless.",
      'I look for small, manageable areas within the change where I can build new skills.',
      'Other (Open response)',
    ],
    [
      '"No matter how hard I try to learn, the bar keeps moving faster than I can keep up."',
      "\"I'm capable of learning, but I feel like I'm constantly starting from scratch as a beginner.\"",
      '"I feel confident that my core human judgment and problem-solving matter more than mastering every tool."',
      "\"I don't bother trying to learn every new trend; it’s usually just temporary hype.\"",
      'Other (Open response)',
    ],
    [
      'External market trends, corporate decisions, and economic factors outside my control.',
      "My immediate manager's demands and whatever my current job requires today.",
      'My own deliberate choices, personal goals, and long-term vision.',
      'Pure chance and luck—I just react to whatever comes my way.',
      'Other (Open response)',
    ],
    [
      "\"I'm just glad it's over and I checked the box so I can get my paycheck.\"",
      '"I proved that I am capable and expanded my personal mastery."',
      '"I solved a real problem that positively impacted other people or a broader cause."',
      "\"I don't really feel much satisfaction from work anymore.\"",
      'Other (Open response)',
    ],
    [
      "I freeze—the gap feels too wide, and I don't know where to start without making a mistake.",
      'I feel anxious, but I try to swallow the whole list at once by frantically cramming.',
      'I prefer to break it down into one tiny, bite-sized step at a time so I can see organic progress.',
      'I feel confident in my ability to learn anything once I have a clear roadmap.',
      'Other (Open response)',
    ],
  ]);
});

test('open response requires text, while an explicit skip can move forward',()=>{
  assert.equal(canAdvanceAssessment(null),false);
  assert.equal(canAdvanceAssessment('A'),true);
  assert.equal(canAdvanceAssessment('E'),false);
  assert.equal(canAdvanceAssessment('E','   '),false);
  assert.equal(canAdvanceAssessment('E','A different response'),true);
  assert.equal(nextAssessmentIndex(0),1);
  assert.equal(nextAssessmentIndex(4),4);
  assert.equal(previousAssessmentIndex(4),3);
  assert.equal(previousAssessmentIndex(0),0);
});

test('assessment preserves selected answers, open response text, and skipped nulls',()=>{
  const answers=emptyAssessmentAnswers();
  answers.S1='E';answers.S2='B';answers.S3=null;answers.S4='C';answers.S5=null;
  const written='  I would ask for a clear first milestone.  ';
  const assessment=buildPsychologyAssessment(answers,{S1:written});
  assert.equal(assessment.scenario_answers.S1,'E');
  assert.equal(assessment.scenario_answers.S2,'B');
  assert.equal(assessment.scenario_answers.S3,null);
  assert.equal(assessment.other_responses.S1,written);
  assert.equal(assessment.consent_to_personalization,true);
  assert.throws(()=>buildPsychologyAssessment({...answers,S1:'E'},{S1:'  '}),/nonempty response/);
});

test('presentation preferences are optional and change with self-reported answers',()=>{
  const base={assessment_version:'1.0' as const,assessment_type:'self_report_reflection' as const,other_responses:{},consent_to_personalization:true};
  const mastery=deriveLearningSupport({...base,scenario_answers:{S1:'A',S2:'C',S3:'D',S4:'B',S5:'C'}})!;
  assert.equal(mastery.preferences.stepSize,'micro');
  assert.equal(mastery.preferences.guidanceLevel,'high');
  assert.equal(mastery.preferences.motivationFocus,'mastery');
  assert.equal(mastery.preferences.emphasizeTransferableSkills,true);
  assert.equal(mastery.preferences.preferStructuredMilestones,true);
  assert.ok(mastery.reflectionInsights.some(insight=>insight.message[0].includes('practice projects')));
  const purpose=deriveLearningSupport({...base,scenario_answers:{S1:null,S2:null,S3:'C',S4:'C',S5:null}})!;
  assert.equal(purpose.preferences.motivationFocus,'purpose');
  assert.ok(purpose.reflectionInsights.some(insight=>insight.message[0].includes('people and problems')));
  assert.equal(deriveLearningSupport({...base,consent_to_personalization:false}),null);
  assert.equal(deriveLearningSupport({...base,scenario_answers:{S1:null,S2:null,S3:null,S4:null,S5:null}}),null);
});

test('synthetic sample profile includes five completed demonstration responses',()=>{
  const assessment=sampleProfile.psychology?.assessment;
  assert.ok(assessment);
  assert.deepEqual(Object.values(assessment.scenario_answers).every(answer=>answer!==null),true);
  assert.equal(assessment.consent_to_personalization,true);
});

test('profile adapters carry assessment through normalize, confirm, and normalized response mapping',()=>{
  const assessment=sampleProfile.psychology!.assessment!;
  const profile={...sampleProfile,psychology:{...sampleProfile.psychology!,assessment}};
  assert.deepEqual(profileToNormalizeRequest(profile).psychology.assessment,assessment);
  assert.deepEqual(profileToConfirmRequest(profile).psychology?.assessment,assessment);
  const mapped=mergeNormalizedProfile({
    profile_id:'profile_psychology_001',pipeline:'A',current_occupation:'Synthetic analyst',skills:[],interests:['analytics'],
    psychology:{mbti:'INTJ',intrinsic_motivators:['mastery'],assessment},reviewed_by_user:false,revision:2,
  },emptyProfile);
  assert.deepEqual(mapped.psychology?.assessment,assessment);
  assert.equal(mapped.mbti,'INTJ');
  assert.deepEqual(mapped.psychology?.intrinsic_motivators,['mastery']);
});
