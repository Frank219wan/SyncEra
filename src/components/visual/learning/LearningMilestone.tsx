import {Check,Leaf} from 'lucide-react';
import type {CSSProperties} from 'react';
import type {Task} from '../../../types';
import type {RoadmapPoint} from './learningVisualModel';

interface LearningMilestoneProps {
  task:Task;
  index:number;
  point:RoadmapPoint;
  selected:boolean;
  next:boolean;
  label:string;
  statusLabel:string;
  onSelect:()=>void;
}

export function LearningMilestone({task,index,point,selected,next,label,statusLabel,onSelect}:LearningMilestoneProps){
  const style={'--milestone-x':`${point.x}%`,'--milestone-y':`${point.y}%`} as CSSProperties;
  return <button
    type="button"
    className={`learning-milestone ${task.done?'is-complete':'is-pending'} ${selected?'is-selected':''} ${next?'is-next':''}`}
    style={style}
    aria-pressed={selected}
    aria-label={`${index+1}. ${label}. ${statusLabel}`}
    onClick={onSelect}
  >
    <span className="learning-milestone-mark" aria-hidden="true">{task.done?<Check size={17}/>:next?<Leaf size={17}/>:index+1}</span>
    <span className="learning-milestone-label">{label}</span>
  </button>;
}
