import type {Task} from '../../../types';

export interface LearningSkillProgress {
  skill: string;
  done: number;
  total: number;
  percent: number;
}

export interface LearningWeekLoad {
  week: number;
  hours: number;
  tasks: number;
}

export interface RoadmapPoint {
  x: number;
  y: number;
}

export function nextLearningTask(tasks: readonly Task[]): Task | null {
  return tasks.find(task=>!task.done)??null;
}

export function skillProgressFor(tasks: readonly Task[]): LearningSkillProgress[] {
  const grouped=new Map<string,{done:number;total:number}>();
  for(const task of tasks){
    const current=grouped.get(task.skill)??{done:0,total:0};
    current.total+=1;
    if(task.done)current.done+=1;
    grouped.set(task.skill,current);
  }
  return [...grouped.entries()].map(([skill,value])=>({
    skill,
    ...value,
    percent:value.total?Math.round(value.done/value.total*100):0,
  }));
}

export function weeklyLearningLoad(tasks: readonly Task[]): LearningWeekLoad[] {
  const grouped=new Map<number,{hours:number;tasks:number}>();
  for(const task of tasks){
    const current=grouped.get(task.week)??{hours:0,tasks:0};
    current.hours+=task.hours;
    current.tasks+=1;
    grouped.set(task.week,current);
  }
  return [...grouped.entries()]
    .sort(([weekA],[weekB])=>weekA-weekB)
    .map(([week,value])=>({week,...value}));
}

export function roadmapNodePoints(total:number): RoadmapPoint[] {
  if(total<=0)return [];
  if(total===1)return [{x:50,y:52}];
  const lanes=[68,52,34,48,27,42,23,37,19,31];
  return Array.from({length:total},(_,index)=>({
    x:8+index*(84/(total-1)),
    y:lanes[index%lanes.length]-(Math.floor(index/lanes.length)*6),
  }));
}
