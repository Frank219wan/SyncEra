import type {Organization} from './types';

const stages=['0','1','2'] as const;

export function reviewedTrainingStages(training:Organization['training'],employeeId:string,skillId:string):number{
  if(!employeeId||!skillId)return 0;
  const recorded=training[`${employeeId}:${skillId}`]||[];
  return stages.filter(stage=>recorded.includes(stage)).length;
}
