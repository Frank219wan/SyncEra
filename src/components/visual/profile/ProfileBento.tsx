import {BriefcaseBusiness,Heart} from 'lucide-react';

type SourceStatus={source:string;status:string};

function Meta({value}:{value?:SourceStatus}){
  return value?<small className="profile-content-meta">{value.source}<span aria-hidden="true">·</span>{value.status}</small>:null;
}

export function ProfileBento({experience,interests,emptyLabel,experienceLabel,interestsLabel,interestsMeta}:{experience:string;interests:string;emptyLabel:string;experienceLabel:string;interestsLabel:string;interestsMeta:SourceStatus}){
  return <div className="profile-bento-pair">
    <article className="profile-bento-card profile-experience-card">
      <div className="profile-card-heading"><span><BriefcaseBusiness size={20}/></span><h2>{experienceLabel}</h2></div>
      <p className={experience?'':'profile-empty-copy'}>{experience||emptyLabel}</p>
    </article>
    <article className="profile-bento-card profile-interests-card">
      <div className="profile-card-heading"><span><Heart size={20}/></span><h2>{interestsLabel}</h2></div>
      <div className="profile-interest-list">{interests?<span className="profile-interest-tag">{interests}</span>:<p className="profile-empty-copy">{emptyLabel}</p>}</div>
      <Meta value={interestsMeta}/>
    </article>
  </div>;
}
