import {Link} from 'react-router-dom';
import {ArrowRight, Check, Compass, Leaf} from 'lucide-react';
import type {ReactNode} from 'react';

export function IllustratedHeader({title,description,notice}:{title:string;description:string;notice:ReactNode}){
  return <header className="individual-hero"><div className="individual-hero-copy"><h1>{title}</h1><p>{description}</p><div className="individual-hero-notice">{notice}</div></div><img src="/images/skillogy-botanical-s-relief.png" alt="" className="individual-hero-art"/></header>;
}

export function JourneySteps({labels,stage,currentLabel,doneLabel}:{labels:string[];stage:number;currentLabel:string;doneLabel:string}){
  return <ol className="individual-steps" aria-label={currentLabel}>{labels.map((label,index)=><li key={label} className={index<stage?'is-complete':index===stage?'is-current':''} aria-current={index===stage?'step':undefined}><span className="individual-step-mark" aria-hidden="true">{index<stage?<Check size={18}/>:index===stage?<Leaf size={18}/>:index+1}</span><span><strong>{label}</strong><small>{index<stage?doneLabel:index===stage?currentLabel:''}</small></span></li>)}</ol>;
}

export function NextAction({title,description,to,label}:{title:string;description:string;to:string;label:string}){
  return <section className="individual-next"><div><Compass size={21} aria-hidden="true"/><h2>{title}</h2><p>{description}</p></div><Link className="individual-next-link" to={to}>{label}<ArrowRight size={18} aria-hidden="true"/></Link></section>;
}

export function InsightCard({title,children}:{title:string;children:ReactNode}){
  return <section className="individual-insight"><h2>{title}</h2>{children}</section>;
}
