import {Check,Layers3} from 'lucide-react';

export type ProfileSkillCard={
  id:string;
  name:string;
  level:string;
  source:string;
  status:string;
  confirmed:boolean;
  catalogueNote?:string;
};

export function ProfileSkills({skills,title,emptyLabel}:{skills:ProfileSkillCard[];title:string;emptyLabel:string}){
  return <section className="profile-skills-section" aria-labelledby="profile-skills-title">
    <div className="profile-section-heading"><span><Layers3 size={20}/></span><h2 id="profile-skills-title">{title}</h2></div>
    {skills.length?<div className="profile-skill-grid">{skills.map((skill,index)=><article className={`profile-skill-card profile-skill-tone-${index%4}`} key={skill.id}>
      <span className="profile-skill-marker" aria-hidden="true"/>
      <div><h3>{skill.name}</h3><p>{skill.level}</p><small>{skill.source}</small>{skill.catalogueNote&&<small>{skill.catalogueNote}</small>}</div>
      <span className={`profile-skill-status${skill.confirmed?' is-confirmed':''}`}>{skill.confirmed&&<Check size={13}/>} {skill.status}</span>
    </article>)}</div>:<p className="profile-empty-copy">{emptyLabel}</p>}
  </section>;
}
