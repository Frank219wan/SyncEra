import test from 'node:test';
import assert from 'node:assert/strict';
import type {Task} from '../src/types.ts';
import {nextLearningTask,roadmapNodePoints,skillProgressFor,weeklyLearningLoad} from '../src/components/visual/learning/learningVisualModel.ts';

const title=['Task','任务','Tugasan'] as const;
const tasks:Task[]=[
  {id:'one',skill:'sql',title,hours:2,done:true,week:1,evidence:'query exercise'},
  {id:'two',skill:'sql',title,hours:3,done:false,week:1},
  {id:'three',skill:'python',title,hours:4,done:false,week:2},
];

test('next milestone follows plan order and ignores completed tasks',()=>{
  assert.equal(nextLearningTask(tasks)?.id,'two');
  assert.equal(nextLearningTask(tasks.map(task=>({...task,done:true}))),null);
  assert.equal(nextLearningTask([]),null);
});

test('skill checkpoint charts use real task completion values',()=>{
  assert.deepEqual(skillProgressFor(tasks),[
    {skill:'sql',done:1,total:2,percent:50},
    {skill:'python',done:0,total:1,percent:0},
  ]);
});

test('weekly effort groups scheduled hours without inventing tracked time',()=>{
  assert.deepEqual(weeklyLearningLoad(tasks),[
    {week:1,hours:5,tasks:2},
    {week:2,hours:4,tasks:1},
  ]);
});

test('roadmap points are deterministic and stay inside the canvas',()=>{
  const points=roadmapNodePoints(12);
  assert.equal(points.length,12);
  assert.ok(points.every(point=>point.x>=0&&point.x<=100&&point.y>=0&&point.y<=100));
  assert.deepEqual(roadmapNodePoints(1),[{x:50,y:52}]);
  assert.deepEqual(roadmapNodePoints(0),[]);
});
