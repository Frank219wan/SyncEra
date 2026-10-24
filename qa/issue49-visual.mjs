import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {emptyHr,emptyProfile,hrSample,tvetSample} from '../src/data.ts';
import {hrOrganizationToAnalyzeRequest,mapHRAnalysis,mapOrganizationAnalysis,mapRecommendations,mergeNormalizedProfile,organizationToAnalyzeRequest,profileToConfirmRequest,profileToNormalizeRequest,toServiceMeta} from '../src/services/api-contract.ts';

const base=process.env.SYNCERA_BASE_URL??'http://127.0.0.1:18749';
const out=process.env.SYNCERA_SCREENSHOTS??'/private/tmp/syncera-issue49-screenshots';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE??'playwright');
async function envelope(path,body){
  const response=await fetch(`${base}/api/v1${path}`,body?{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}:undefined);
  if(!response.ok)throw new Error(`${path}: ${response.status} ${await response.text()}`);
  return response.json();
}

const input={...emptyProfile,occupation:'Synthetic analyst',interests:'analytics',vision:'Build useful tools',
  goalTags:['Learning'],workStyle:{collaboration:'team',pace:'steady',structure:'balanced'},
  skills:[{id:'sql',level:'intermediate',source:'manual',confirmed:true}]};
const normalized=await envelope('/profiles/normalize',profileToNormalizeRequest(input));
const profile=mergeNormalizedProfile(normalized.data.profile,input);
const confirmed=await envelope('/profiles/confirm',profileToConfirmRequest(profile));
const ready=mergeNormalizedProfile(confirmed.data.profile,profile);
const trends=await envelope('/trends/roles?region=MY&limit=50');
const snapshotId=trends.meta.snapshot_id;
const recommendation=await envelope('/recommendations',{profile_id:ready.id,region:'MY',ai_scenario:'moderate',top_k:5,snapshot_id:snapshotId});
const results=mapRecommendations(recommendation.data.recommendations);
const state={locale:'en',profile:ready,scenario:'moderate',selectedRole:'',results,snapshotId,
  serviceMeta:toServiceMeta(recommendation.meta),plan:null,hr:emptyHr,hrProfileSaved:false,tvet:tvetSample};
const selected=tvetSample.people.slice(0,2).map(person=>person.id);
const tvetInput={...structuredClone(tvetSample),selected};
const tvetResponse=await envelope('/organizations/career_centre/analyze',organizationToAnalyzeRequest(tvetInput,'moderate','en',true));
const tvetAnalysis=mapOrganizationAnalysis(tvetResponse.data);
const tvet={...tvetInput,analysis:tvetAnalysis,analysisMeta:toServiceMeta(tvetResponse.meta),analyzedRevision:tvetInput.revision,
  workspaceId:tvetAnalysis.workspaceId,workspaceRevision:tvetAnalysis.workspaceRevision};
const hrInput=structuredClone(hrSample);
const hrResponse=await envelope('/organizations/hr/analyze',hrOrganizationToAnalyzeRequest(hrInput,'moderate','en'));
const hrAnalysis=mapHRAnalysis(hrResponse.data);
const hr={...hrInput,hrAnalysis,analysisMeta:toServiceMeta(hrResponse.meta),analyzedRevision:hrInput.revision,
  workspaceId:hrAnalysis.workspaceId,workspaceRevision:hrAnalysis.workspaceRevision};
await mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH??'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',args:['--no-sandbox']});
try {
  for(const width of [1440,768,390]){
    const context=await browser.newContext({viewport:{width,height:900},deviceScaleFactor:1});
    const page=await context.newPage();
    await page.addInitScript(seed=>localStorage.setItem('futureproof-v1',JSON.stringify({schema:1,state:seed})),state);
    await page.goto(`${base}/individual/recommendations`,{waitUntil:'networkidle'});
    await page.locator('.matches-card').first().waitFor();
    await page.locator('.growth-loading').waitFor({state:'hidden'});
    for(const detail of await page.locator('.why-details').all())await detail.locator('summary').click();
    await page.locator('.connected-evidence article').first().waitFor();
    const originalScores=(await page.locator('.matches-service-score').allTextContents()).map(value=>value.match(/^\d+(?:\.\d+)?/)?.[0]);
    for(const [locale,label] of [['en','English'],['zh','简体中文'],['ms','Bahasa Melayu']]){
      await page.locator('.locale select').selectOption(locale);
      await page.waitForTimeout(150);
      const headings=await page.locator('.matches-card h2').allTextContents();
      const scores=(await page.locator('.matches-service-score').allTextContents()).map(value=>value.match(/^\d+(?:\.\d+)?/)?.[0]);
      assert.deepEqual(scores,originalScores,`score/order changed for ${locale} at ${width}`);
      assert.equal(await page.locator('.matches-card').count(),results.length);
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,`horizontal overflow ${locale} ${width}`);
      if(locale==='zh')assert.ok(headings.some(value=>value.includes('分析师')),`Chinese role names absent at ${width}`);
      if(locale==='ms')assert.ok(headings.some(value=>value.includes('Penganalisis')),`Malay role names absent at ${width}`);
      if(locale==='en')assert.ok(headings.some(value=>value.includes('Analyst')),`English role names absent at ${width}`);
      const explanations=await page.locator('.why-details').first().innerText();
      if(locale==='zh')assert.match(explanations,/不确定性.*合成样例/s);
      if(locale==='ms')assert.match(explanations,/Ketidakpastian.*Data sintetik/s);
      const profileId=await page.evaluate(()=>JSON.parse(localStorage.getItem('futureproof-v1')).state.profile.id);
      assert.equal(profileId,ready.id);
      await page.evaluate(()=>{document.activeElement?.blur();window.scrollTo(0,0);});
      await page.waitForTimeout(80);
      await page.screenshot({path:`${out}/career-matches-${locale}-${width}.png`,fullPage:true});
      console.log(`${label} ${width}: ${headings.join(' | ')}; scores ${scores.join(' | ')}`);
    }
    await page.locator('.locale select').selectOption('zh');
    await page.locator('.theme-switch').click();
    assert.equal(await page.locator('html').getAttribute('data-theme'),'dark');
    await page.evaluate(()=>{document.activeElement?.blur();window.scrollTo(0,0);});
    await page.screenshot({path:`${out}/career-matches-zh-dark-${width}.png`,fullPage:true});
    await context.close();
  }
  for(const [area,route,seed,selector] of [
    ['b1','/organization/hr/heatmap',{...state,hr,hrProfileSaved:true},'.heatmap-table'],
    ['b2','/organization/tvet/insights',{...state,tvet},'.workshop-grid'],
  ])for(const width of [1440,390]){
    const context=await browser.newContext({viewport:{width,height:900},deviceScaleFactor:1});
    const page=await context.newPage();
    await page.addInitScript(value=>localStorage.setItem('futureproof-v1',JSON.stringify({schema:1,state:value})),seed);
    await page.goto(`${base}${route}`,{waitUntil:'networkidle'});
    await page.locator('.growth-loading').waitFor({state:'hidden'});
    await page.locator(selector).waitFor();
    for(const locale of ['en','zh','ms']){
      await page.locator('.locale select').selectOption(locale);
      await page.waitForTimeout(100);
      const body=await page.locator('main').innerText();
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,`${area} overflow ${locale} ${width}`);
      if(area==='b2'&&locale==='zh')assert.match(body,/实践工作坊/);
      if(area==='b2'&&locale==='ms')assert.match(body,/dalam amalan/);
      if(area==='b1'&&locale==='zh')assert.match(body,/技能覆盖/);
      if(area==='b1'&&locale==='ms')assert.match(body,/Liputan kemahiran/);
      await page.evaluate(()=>{document.activeElement?.blur();window.scrollTo(0,0);});
      await page.screenshot({path:`${out}/organization-${area}-${locale}-${width}.png`,fullPage:true});
      console.log(`${area.toUpperCase()} ${locale} ${width}: visible, no horizontal overflow`);
    }
    await context.close();
  }
  for(const [route,selector,terms] of [
    ['/individual/roles/data-analyst','.task-impact-card h3',{en:/Review analysis outputs/,zh:/核查分析输出/,ms:/Semak output analisis/}],
    ['/individual/skills/validation/mind-map?role=data-analyst','.map-node strong',{en:/Review AI Output Validation fundamentals/,zh:/复习AI 输出验证基础概念/,ms:/Semak asas Pengesahan output AI/}],
  ]){
    const context=await browser.newContext({viewport:{width:390,height:900},deviceScaleFactor:1});
    const page=await context.newPage();
    await page.addInitScript(seed=>localStorage.setItem('futureproof-v1',JSON.stringify({schema:1,state:seed})),state);
    await page.goto(`${base}${route}`,{waitUntil:'networkidle'});
    await page.locator(selector).first().waitFor();
    for(const locale of ['en','zh','ms']){
      await page.locator('.locale select').selectOption(locale);
      await page.locator(selector).first().waitFor();
      assert.match(await page.locator(selector).first().innerText(),terms[locale],`${route} ${locale}`);
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,`${route} ${locale} overflow`);
      console.log(`${route} ${locale}: localized without leaving the page`);
    }
    await context.close();
  }
} finally {await browser.close();}
console.log(`screenshots: ${out}`);
