import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';

const intake=readFileSync(new URL('../src/pages/Intake.tsx',import.meta.url),'utf8');
const visualFiles=['ProfileHero','ProfileBento','ProfileSkills','ProfileVision','ProfilePreferences'].map(name=>readFileSync(new URL(`../src/components/visual/profile/${name}.tsx`,import.meta.url),'utf8')).join('\n');
const visualCss=readFileSync(new URL('../src/pages/profile-overview-visual.css',import.meta.url),'utf8');

test('profile overview passes every previously visible profile field into the bento presentation',()=>{
  for(const field of ['p.occupation','p.education','p.experience','p.skills','p.interests','p.vision','p.goalTags','workStyle','p.region'])assert.match(intake,new RegExp(field.replace('.','\\.')));
  assert.match(intake,/careerGoal=/);
  assert.match(intake,/stage=/);
});

test('profile visual components remain presentation-only and preserve the existing edit destination',()=>{
  assert.doesNotMatch(visualFiles,/useApp|services\/api|store|fetch\(|localStorage|setState/);
  assert.match(visualFiles,/\/individual\/intake\/profile\?edit=1/);
  assert.match(visualCss,/prefers-reduced-motion/);
});

test('skill presentation keeps categorical level, source, and confirmation without percentages',()=>{
  const skills=readFileSync(new URL('../src/components/visual/profile/ProfileSkills.tsx',import.meta.url),'utf8');
  assert.match(skills,/skill\.level/);
  assert.match(skills,/skill\.source/);
  assert.match(skills,/skill\.confirmed/);
  assert.doesNotMatch(skills,/\d+%|progress|score/i);
});
