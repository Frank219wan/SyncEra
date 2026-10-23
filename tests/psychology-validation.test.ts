import test from 'node:test';
import assert from 'node:assert/strict';
import {hasIncompleteOther} from '../src/services/psychology-validation.ts';

test('Other needs meaningful text; skipped questions and no assessment remain valid', () => {
  assert.equal(hasIncompleteOther(undefined), false);
  const assessment = {
    assessment_version:'1.0' as const,
    assessment_type:'self_report_reflection' as const,
    scenario_answers:{S1:'E' as const,S2:null,S3:'A' as const,S4:null,S5:null},
    other_responses:{S1:'   '}, consent_to_personalization:false,
  };
  assert.equal(hasIncompleteOther(assessment), true);
  assert.equal(hasIncompleteOther({...assessment,other_responses:{S1:'Fictional reflection'}}), false);
  assert.equal(hasIncompleteOther({...assessment,scenario_answers:{...assessment.scenario_answers,S1:null}}), false);
});
