import {strict as assert} from 'node:assert';
import {test} from 'node:test';
import {barWidth,sortMarketSignals} from '../src/pages/radarCompare.ts';
import type {MarketRadarSignal} from '../src/types.ts';

const signal=(id:string,postings:number|null):MarketRadarSignal=>({id,name:id,sourceId:'fixture',sourceRow:1,postings,marketSharePercent:null,previousPostings:null,yearAgoPostings:null,qoqChangePercent:null,yoyChangePercent:null});

test('comparison sorting retains unavailable values at the end in either direction',()=>{
  const items=[signal('missing',null),signal('large',100),signal('small',10)];
  assert.deepEqual(sortMarketSignals(items,true).map(item=>item.id),['large','small','missing']);
  assert.deepEqual(sortMarketSignals(items,false).map(item=>item.id),['small','large','missing']);
  assert.equal(items[0].id,'missing');
});

test('bar length uses comparable counts and never treats missing as a count',()=>{
  assert.equal(barWidth(50,100),50);
  assert.equal(barWidth(null,100),0);
  assert.equal(barWidth(0,0),0);
  assert.equal(barWidth(200,100),100);
});
