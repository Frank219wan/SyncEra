import {test} from 'node:test';
import assert from 'node:assert/strict';
import {makePlan,completeTask,revisePlan,dueDate,cohortGaps,gapsFor,validatePeople,defaultConstraints,demoRecommendations} from '../src/domain.ts';
import {hrSample,tvetSample,sampleProfile} from '../src/data.ts';
test('unknown baselines are not zero skills',()=>{assert.equal(gapsFor({...tvetSample.people[0],known:false}),null)});
test('cohort aggregation follows selected records',()=>{const org=structuredClone(tvetSample);org.selected=[org.people[0].id];assert.equal(cohortGaps(org).length,(gapsFor(org.people[0])||[]).length);org.selected=[];assert.deepEqual(cohortGaps(org),[])});
test('duplicate anonymous identifiers fail validation',()=>{const org=structuredClone(hrSample);org.people[1].id=org.people[0].id;assert.ok(validatePeople(org).includes('id'))});
test('adoption gates progress; completion is idempotent; revision preserves earned work and dates',()=>{let plan=makePlan('data-analyst',{...defaultConstraints(),start:'2026-10-21'});assert.equal(completeTask(plan,plan.tasks[0].id,'Evidence').earned,0);plan={...plan,adopted:true};plan=completeTask(plan,plan.tasks[0].id,'Evidence');const first=plan.tasks[0];const date=dueDate(plan,first);plan=revisePlan(plan);assert.equal(plan.earned,1);assert.equal(dueDate(plan,plan.tasks[0]),date);plan=completeTask(plan,first.id,'Other evidence');assert.equal(plan.earned,1);assert.equal(plan.tasks[0].evidence,'Evidence');assert.equal(plan.tasks[0].completedAt,first.completedAt)});
test('modified profiles receive no invented score',()=>{assert.ok(demoRecommendations({...sampleProfile,sample:false},'fast').every(r=>r.matchScore===null))});
