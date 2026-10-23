import type {PsychologyAssessment} from '../types.ts';

export function hasIncompleteOther(assessment?: PsychologyAssessment): boolean {
  if (!assessment) return false;
  return Object.entries(assessment.scenario_answers).some(
    ([scenario, answer]) => answer === 'E' && !assessment.other_responses[scenario]?.trim(),
  );
}
