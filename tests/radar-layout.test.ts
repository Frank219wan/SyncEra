import assert from 'node:assert/strict';
import test from 'node:test';
import {roles} from '../src/data.ts';
import {layoutRadar} from '../src/radarLayout.ts';

function verify(width:number,height:number,focus:string|null=null){
  const groups=layoutRadar(roles,width,height,focus);
  assert.equal(groups.length,focus?1:4);
  for(const group of groups){
    assert.ok(group.x-group.radius>=0&&group.x+group.radius<=width,'parent is inside map width');
    assert.ok(group.y-group.radius>=0&&group.y+group.radius<=height,'parent is inside map height');
    const source=roles.filter(role=>role.domain===group.domain);
    assert.equal(group.children.length,source.length);
    const remainingRim=group.radius-Math.max(...group.children.map(child=>Math.hypot(child.x-group.x,child.y-group.y)+child.radius));
    assert.ok(remainingRim<=20,`${group.domain} occupations use the available parent radius`);
    for(const child of group.children){
      assert.ok(Math.hypot(child.x-group.x,child.y-group.y)+child.radius+9<=group.radius+1e-5,`${child.role.id} stays inside ${group.domain}`);
      assert.equal(child.role.signal,source.find(role=>role.id===child.role.id)!.signal);
    }
    for(let i=0;i<group.children.length;i++)for(let j=i+1;j<group.children.length;j++){
      const a=group.children[i],b=group.children[j];
      assert.ok(Math.hypot(a.x-b.x,a.y-b.y)+1e-5>=a.radius+b.radius+5,`${a.role.id} and ${b.role.id} do not overlap`);
      const intended=(100+a.role.signal*.65)/(100+b.role.signal*.65);
      assert.ok(Math.abs(a.radius/b.radius-intended)<1e-7,'one scale factor preserves size ratios');
    }
  }
  for(let i=0;i<groups.length;i++)for(let j=i+1;j<groups.length;j++){
    const a=groups[i],b=groups[j];
    assert.ok(Math.hypot(a.x-b.x,a.y-b.y)>=a.radius+b.radius,`${a.domain} and ${b.domain} do not overlap`);
  }
  if(!focus){
    const children=groups.flatMap(group=>group.children);
    for(let i=0;i<children.length;i++)for(let j=i+1;j<children.length;j++){
      const a=children[i],b=children[j];
      const intended=(100+a.role.signal*.65)/(100+b.role.signal*.65);
      assert.ok(Math.abs(a.radius/b.radius-intended)<1e-7,'overview uses one size scale across industries');
    }
  }
  assert.deepEqual(layoutRadar([...roles].reverse(),width,height,focus),groups,'layout is independent of input order');
}

test('industry and occupation circles remain contained at desktop and compact widths',()=>{
  verify(920,440);
  verify(590,410);
  verify(320,440);
});

test('focused industry is centered, enlarged, and recomputed',()=>{
  const all=layoutRadar(roles,920,440);
  for(const group of all){
    verify(920,440,group.domain);
    const focused=layoutRadar(roles,920,440,group.domain)[0];
    assert.equal(focused.x,460);
    assert.equal(focused.y,220);
    assert.ok(focused.radius>group.radius);
  }
});
