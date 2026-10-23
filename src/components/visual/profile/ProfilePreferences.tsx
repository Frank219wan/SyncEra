import {ChevronDown,SlidersHorizontal} from 'lucide-react';
import {Link} from 'react-router-dom';

type SourceStatus={source:string;status:string};

export function ProfilePreferences({title,summaryLabel,goalTagsLabel,goalTags,workStyleLabel,workStyle,emptyLabel,editLabel,meta}:{title:string;summaryLabel:string;goalTagsLabel:string;goalTags:string[];workStyleLabel:string;workStyle:string;emptyLabel:string;editLabel:string;meta:SourceStatus}){
  const supplied=goalTags.length+(workStyle?1:0);
  return <details className="profile-preferences-card">
    <summary><span className="profile-preferences-summary"><span><SlidersHorizontal size={18}/></span><span><strong>{title}</strong><small>{supplied?`${supplied} ${summaryLabel}`:emptyLabel}</small></span></span><ChevronDown className="profile-preferences-chevron" size={18}/></summary>
    <div className="profile-preferences-content">
      <div><h3>{goalTagsLabel}</h3>{goalTags.length?<div className="profile-goal-tags">{goalTags.map(tag=><span key={tag}>{tag}</span>)}</div>:<p className="profile-empty-copy">{emptyLabel}</p>}</div>
      <div><h3>{workStyleLabel}</h3><p className={workStyle?'':'profile-empty-copy'}>{workStyle||emptyLabel}</p><small className="profile-content-meta">{meta.source}<span aria-hidden="true">·</span>{meta.status}</small></div>
      <Link className="text-button" to="/individual/intake/profile?edit=1">{editLabel}</Link>
    </div>
  </details>;
}
