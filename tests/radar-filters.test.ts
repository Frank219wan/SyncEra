import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';
import {runInNewContext} from 'node:vm';
import ts from 'typescript';
import {roles} from '../src/data.ts';
import {mapTrendRoles} from '../src/services/api-contract.ts';

// Exercise the actual component's handlers and filter expression without adding
// a DOM/test framework dependency to this small regression fix.
const source=readFileSync(new URL('../src/pages/RadarExperience.tsx',import.meta.url),'utf8');
const file=ts.createSourceFile('RadarExperience.tsx',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
function findNode(predicate:(node:ts.Node)=>boolean):ts.Node{
  let found:ts.Node|undefined;
  function visit(node:ts.Node){if(predicate(node))found=node;else ts.forEachChild(node,visit);}
  visit(file);
  assert.ok(found,'Expected Career Radar source node');
  return found;
}
function handler(name:string,context:Record<string,unknown>={}):(...args:unknown[])=>unknown{
  const node=findNode(node=>ts.isFunctionDeclaration(node)&&node.name?.text===name);
  const code=ts.transpileModule(node.getText(file),{
    compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext},
  }).outputText;
  return runInNewContext(`${code};${name}`,context);
}

test('industry selection, including All fields and map focus, never rewrites the keyword',()=>{
  let domain='all';
  const select=handler('selectDomain',{
    setDomain:(value:string)=>{domain=value;},
    setSearch:()=>assert.fail('Selecting an industry must not change the keyword'),
    domainName:(value:string)=>value,
    requestAnimationFrame:()=>{},
  });
  for(const next of ['technology','green','all']){
    select(next);
    assert.equal(domain,next);
  }
});

test('clearing the keyword preserves industry and returns focus to the input',()=>{
  let search='Data';
  let focused=false;
  handler('clearSearch',{
    setSearch:(value:string)=>{search=value;},
    setDomain:()=>assert.fail('Clearing the keyword must not change the industry'),
    searchRef:{current:{focus:()=>{focused=true;}}},
  })();
  assert.equal(search,'');
  assert.equal(focused,true);
});

test('empty-state Clear filters resets both controls',()=>{
  let domain='technology',search='no-such-career';
  handler('clearFilters',{
    setDomain:(value:string)=>{domain=value;},
    setSearch:(value:string)=>{search=value;},
    searchRef:{current:null},
  })();
  assert.equal(domain,'all');
  assert.equal(search,'');
});

const shownNode=findNode(node=>ts.isVariableDeclaration(node)&&node.name.getText(file)==='shown') as ts.VariableDeclaration;
const domainName=handler('domainName');
const connectedRoles=mapTrendRoles([
  {role_id:'role_data_analyst',name:'Data Analyst',field_id:'field_data',trend_score:null},
  {role_id:'role_business_analyst',name:'Business Analyst',field_id:'field_business',trend_score:null},
],roles);

for(const [mode,allRoles] of [['Synthetic Demo',roles],['connected API fixture',connectedRoles]] as const){
  for(const locale of [0,1,2] as const){
    test(`${mode}: industry and localized keyword intersect (locale ${locale})`,()=>{
      const copy=(name:readonly string[])=>name[locale];
      const t=(...values:string[])=>values[locale];
      const filter=(domain:string,search:string)=>
        runInNewContext(shownNode.initializer!.getText(file),{allRoles,domain,search,copy,t,domainName}) as typeof roles;
      const ids=(items:typeof roles)=>Array.from(items,item=>item.id);
      const technology=allRoles.filter(role=>role.domain==='technology');
      const target=technology[0];
      assert.ok(target);
      assert.deepEqual(ids(filter('technology','')),ids(technology));
      const keyword=`  ${copy(target.name).toUpperCase()}  `;
      assert.deepEqual(ids(filter('technology',keyword)),[target.id]);
      assert.deepEqual(ids(filter('business',keyword)),[]);
      assert.deepEqual(ids(filter('all',keyword)),[target.id]);
      assert.deepEqual(ids(filter('technology','no-such-career')),[]);
      assert.deepEqual(ids(filter('technology','')),ids(technology));
      assert.deepEqual(ids(filter('all','')),ids([...allRoles]));
    });
  }
}
