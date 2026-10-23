import {Quote,Sprout} from 'lucide-react';
import {Link} from 'react-router-dom';

type SourceStatus={source:string;status:string};

export function ProfileVision({vision,title,emptyLabel,editLabel,meta}:{vision:string;title:string;emptyLabel:string;editLabel:string;meta:SourceStatus}){
  return <section className="profile-vision-card" aria-labelledby="profile-vision-title">
    <Quote className="profile-vision-quote" size={42} aria-hidden="true"/>
    <div className="profile-vision-copy"><span><Sprout size={16}/>{title}</span><h2 id="profile-vision-title">{vision||emptyLabel}</h2><small className="profile-content-meta">{meta.source}<span aria-hidden="true">·</span>{meta.status}</small></div>
    {!vision&&<Link className="text-button" to="/individual/intake/profile?edit=1">{editLabel}</Link>}
  </section>;
}
