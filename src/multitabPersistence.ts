import type {AppState,HrRequestIdentity,Organization} from './types.ts';
import {STORAGE_KEY} from './individual-state.ts';
import {beginHrAnalysis} from './hrState.ts';

// The full AppState key is kept for existing Individual and B2 sessions. B1's
// server identity has its own canonical record so an older full-state writer
// cannot replace a confirmed CAS token in a freshly loaded tab.
export const HR_STORAGE_KEY='futureproof-b1-cas-v1';
export const HR_EDITOR_LOCK='futureproof-b1-editor-v1';
export const APP_WRITE_LOCK='futureproof-app-write-v1';
const HR_EDITOR_PAGES=new Set(['intake','heatmap','mobility','training','dashboard']);
export function isHrEditorRoute(pathname:string):boolean {
  if(!pathname.startsWith('/organization/hr/'))return false;
  const rest=pathname.slice('/organization/hr/'.length);
  return HR_EDITOR_PAGES.has(rest)||/^department\/[^/]+$/.test(rest);
}
export type HrEditStatus='inactive'|'checking'|'active'|'blocked'|'conflict'|'unsupported';

export interface StoragePort {getItem(key:string):string|null;setItem(key:string,value:string):void}
export interface LocksPort {
  request<T>(name:string,options:{ifAvailable?:boolean},callback:(lock:object|null)=>T|Promise<T>):Promise<T>;
}
type HrRecord={version:number;hr:Organization;hrProfileSaved:boolean};
type StoredApp={schema:number;state:AppState};

function appRecord(storage:StoragePort):StoredApp|null {
  try {const value=JSON.parse(storage.getItem(STORAGE_KEY)||'null');return value?.schema===1&&value.state?value:null;}
  catch{return null;}
}
function hrRecord(storage:StoragePort):HrRecord|null {
  try {
    const value=JSON.parse(storage.getItem(HR_STORAGE_KEY)||'null');
    return Number.isSafeInteger(value?.version)&&value.version>=1&&value.hr&&typeof value.hrProfileSaved==='boolean'?value:null;
  }catch{return null;}
}
export function readCanonicalHr(storage:StoragePort):HrRecord|null {return hrRecord(storage);}

function safeHrTransition(current:Organization,next:Organization):boolean {
  if(current.clientWorkspaceId!==next.clientWorkspaceId)
    return !next.workspaceId&&next.workspaceRevision==null&&!next.hrRecovery&&!next.hrAnalysis;
  if(current.workspaceId && next.workspaceId!==current.workspaceId)return false;
  const before=current.workspaceRevision??0;
  const after=next.workspaceRevision??0;
  if(after<before||after>before+1)return false;
  if(after===before+1){
    // A changed server CAS token must be linked to the one reserved operation.
    return !!current.hrRecovery && next.hrLastOperationId===current.hrRecovery.request.operationId
      && current.hrRecovery.request.workspaceRevision===current.workspaceRevision
      && !!next.workspaceId && !next.hrRecovery;
  }
  if(current.workspaceId!==next.workspaceId)return false;
  if(current.hrRecovery){
    if(!next.hrRecovery||next.hrRecovery.request.operationId!==current.hrRecovery.request.operationId)return false;
    if(current.hrRecovery.status!=='pending'&&next.hrRecovery.status==='pending')return false;
  }
  if(!current.hrAnalysis&&next.hrAnalysis)return false;
  return true;
}

const fields:ReadonlyArray<keyof AppState>=['locale','profile','scenario','selectedRole','results','snapshotId',
  'serviceMeta','plan','trendPackage','draft','archivedPlans','tvet'];

export class TabPersistence {
  status:HrEditStatus='inactive';
  private expectedVersion:number;
  private baseline:AppState;
  private releaseEditor:(()=>void)|null=null;
  private editorHeld=false;
  private claiming=false;
  private closed=false;
  private initialRetryUsed=false;
  private onHrRoute=false;
  private requestInFlight=false;
  private queue:Promise<unknown>=Promise.resolve();
  private storage:StoragePort;
  private locks:LocksPort|undefined;
  private changed:(status:HrEditStatus,latest?:HrRecord)=>void;

  constructor(initial:AppState,storage:StoragePort,locks:LocksPort|undefined,
    changed:(status:HrEditStatus,latest?:HrRecord)=>void) {
    this.storage=storage;this.locks=locks;this.changed=changed;
    this.baseline=initial;
    this.expectedVersion=hrRecord(storage)?.version||0;
  }

  start():void {
    // The app store exists on every route; only B1 routes may claim B1's editor lock.
    if(!this.locks)this.setStatus('unsupported');
  }

  setHrRoute(active:boolean):void {
    this.onHrRoute=active;
    if(active){
      if(!this.locks){this.setStatus('unsupported');return;}
      if(this.editorHeld)return;
      this.setStatus('checking');
      void this.claimEditor();
    }else if(!this.requestInFlight){
      this.releaseEditor?.();
      this.setStatus('inactive');
    }
  }

  retryEditor():void {
    if(this.onHrRoute&&(this.status==='blocked'||this.status==='conflict')&&!this.closed&&!this.editorHeld)void this.claimEditor();
  }

  private async claimEditor():Promise<void> {
    if(!this.locks||this.editorHeld||this.claiming||this.closed||!this.onHrRoute)return;
    this.claiming=true;
    try {
      await this.locks.request(HR_EDITOR_LOCK,{ifAvailable:true},async lock=>{
        if(!this.onHrRoute||this.closed)return;
        if(!lock){
          this.setStatus('blocked');
          // React StrictMode releases its first mount's lock during a replay.
          // Allow one bounded retry after that release; never poll indefinitely.
          if(!this.initialRetryUsed){this.initialRetryUsed=true;setTimeout(()=>this.retryEditor(),100);}
          return;
        }
        this.editorHeld=true;
        const latest=hrRecord(this.storage);
        if(latest && latest.version!==this.expectedVersion)this.setStatus('conflict',latest);
        else this.setStatus('active',latest||undefined);
        await new Promise<void>(resolve=>{this.releaseEditor=resolve;if(this.closed||(!this.onHrRoute&&!this.requestInFlight))resolve();});
        this.editorHeld=false;
        this.releaseEditor=null;
        if(!this.closed){
          if(this.onHrRoute)this.setStatus('checking');
          else this.setStatus('inactive');
        }
      });
    }catch {this.setStatus('unsupported');}
    finally {
      this.claiming=false;
      if(this.onHrRoute&&this.status==='checking'&&!this.editorHeld&&!this.closed)void this.claimEditor();
    }
  }

  acceptLatest():HrRecord|null {
    if(this.status!=='conflict'||!this.editorHeld)return null;
    const latest=hrRecord(this.storage);
    if(!latest)return null;
    this.expectedVersion=latest.version;
    this.setStatus('active',latest);
    return latest;
  }

  externalChange():void {
    const latest=hrRecord(this.storage);
    if(latest&&latest.version!==this.expectedVersion){
      // The in-memory draft remains available. The canonical CAS record is not
      // replaced until the user explicitly accepts the newer workspace.
      this.setStatus('conflict',latest);
    }
  }

  async persist(next:AppState):Promise<AppState> {
    const job=this.queue.then(()=>this.persistLocked(next));
    this.queue=job.catch(()=>undefined);
    return job;
  }

  async reserveHrRequest(request:HrRequestIdentity,source:AppState):Promise<boolean> {
    const job=this.queue.then(async()=>{
      if(!this.locks||this.status!=='active'||!this.editorHeld)return false;
      return this.locks.request(APP_WRITE_LOCK,{},async lock=>{
        if(!lock||this.closed||this.status!=='active'||!this.editorHeld)return false;
        const canonical=hrRecord(this.storage);
        const stored=appRecord(this.storage)?.state;
        const current=canonical?.hr||stored?.hr;
        if((canonical?.version||0)!==this.expectedVersion || !current
          ||current.clientWorkspaceId!==request.clientWorkspaceId
          ||current.workspaceId!==request.workspaceId
          ||current.workspaceRevision!==request.workspaceRevision
          ||current.revision!==request.revision
          ||current.hrRecovery || source.scenario!==request.scenario
          ||(stored&&stored.scenario!==request.scenario)){
          this.setStatus('conflict',canonical||undefined);
          return false;
        }
        const pending=beginHrAnalysis(current,request);
        const record:HrRecord={version:this.expectedVersion+1,hr:pending,hrProfileSaved:true};
        this.storage.setItem(HR_STORAGE_KEY,JSON.stringify(record));
        this.expectedVersion=record.version;
        const merged={...(appRecord(this.storage)?.state||source),hr:pending,hrProfileSaved:true};
        this.storage.setItem(STORAGE_KEY,JSON.stringify({schema:1,state:merged}));
        this.baseline=source;
        this.requestInFlight=true;
        return true;
      });
    });
    this.queue=job.catch(()=>undefined);
    return job;
  }

  private async persistLocked(next:AppState):Promise<AppState> {
    const write=()=>{
      const stored=appRecord(this.storage)?.state||this.baseline;
      const canonical=hrRecord(this.storage);
      const merged={...stored};
      for(const field of fields){
        if(next[field]!==this.baseline[field])Object.assign(merged,{[field]:next[field]});
      }
      if(!this.closed&&this.status==='active'&&this.editorHeld){
        if((canonical?.version||0)!==this.expectedVersion){
          this.setStatus('conflict',canonical||undefined);
        }else if((JSON.stringify(next.hr)!==JSON.stringify(this.baseline.hr)||next.hrProfileSaved!==this.baseline.hrProfileSaved||!canonical)
          &&(!canonical||JSON.stringify(next.hr)!==JSON.stringify(canonical.hr)||next.hrProfileSaved!==canonical.hrProfileSaved)){
          if(canonical&&!safeHrTransition(canonical.hr,next.hr))this.setStatus('conflict',canonical);
          else {
            const record:HrRecord={version:this.expectedVersion+1,hr:next.hr,hrProfileSaved:next.hrProfileSaved};
            this.storage.setItem(HR_STORAGE_KEY,JSON.stringify(record));
            this.expectedVersion=record.version;
            merged.hr=record.hr;
            merged.hrProfileSaved=record.hrProfileSaved;
          }
        }
      }
      const authoritative=hrRecord(this.storage);
      if(authoritative){merged.hr=authoritative.hr;merged.hrProfileSaved=authoritative.hrProfileSaved;}
      this.storage.setItem(STORAGE_KEY,JSON.stringify({schema:1,state:merged}));
      this.baseline=next;
      if(this.requestInFlight&&authoritative?.hr.hrRecovery?.status!=='pending'){
        this.requestInFlight=false;
        if(!this.onHrRoute)this.releaseEditor?.();
      }
      return merged;
    };
    // Without Web Locks, B1 stays read-only. Individual and B2 retain their
    // existing local persistence; the canonical B1 record is never changed.
    if(!this.locks)return write();
    return this.locks.request(APP_WRITE_LOCK,{},lock=>{
      if(!lock)throw new Error('Cross-tab storage lock was not granted.');
      return write();
    });
  }

  close():void {this.closed=true;this.releaseEditor?.();}
  private setStatus(status:HrEditStatus,latest?:HrRecord):void {
    if(this.closed)return;
    this.status=status;
    this.changed(status,latest);
  }
}
