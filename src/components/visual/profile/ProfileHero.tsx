import {ArrowRight,MapPin,Sprout} from 'lucide-react';
import {Link} from 'react-router-dom';

type ProfileHeroProps={
  role:string;
  education:string;
  stage:string;
  region:string;
  careerGoal:string;
  missingLabel:string;
  careerGoalLabel:string;
  editLabel:string;
};

function BotanicalProfileEmblem(){
  return <svg className="profile-botanical-emblem" viewBox="0 0 240 240" role="img" aria-label="Botanical profile emblem">
    <defs>
      <linearGradient id="profile-leaf" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#719b81"/><stop offset="1" stopColor="#8976b4"/></linearGradient>
      <linearGradient id="profile-seed" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#d8c58b"/><stop offset="1" stopColor="#d58b66"/></linearGradient>
    </defs>
    <circle cx="120" cy="120" r="94" fill="none" stroke="currentColor" strokeOpacity=".13"/>
    <circle cx="120" cy="120" r="76" fill="none" stroke="currentColor" strokeOpacity=".08" strokeDasharray="4 8"/>
    <path d="M120 176c-4-43 3-83 24-119" fill="none" stroke="currentColor" strokeWidth="5" strokeLinecap="round"/>
    <path d="M136 82c17-25 38-26 53-20-2 22-20 39-47 34" fill="url(#profile-leaf)" stroke="currentColor" strokeOpacity=".35"/>
    <path d="M124 113c-20-24-43-20-57-8 8 23 31 33 54 21" fill="url(#profile-leaf)" stroke="currentColor" strokeOpacity=".35"/>
    <path d="M128 145c20-18 41-12 51 1-10 20-31 27-50 12" fill="url(#profile-leaf)" stroke="currentColor" strokeOpacity=".35"/>
    <path d="M105 177c7-18 22-24 37-18-1 17-13 30-31 30" fill="url(#profile-seed)" stroke="currentColor" strokeOpacity=".35"/>
    <path d="M85 192c22-9 49-8 72 1" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" opacity=".48"/>
  </svg>;
}

export function ProfileHero({role,education,stage,region,careerGoal,missingLabel,careerGoalLabel,editLabel}:ProfileHeroProps){
  return <section className="profile-identity-hero" aria-labelledby="profile-identity-title">
    <div className="profile-identity-copy">
      <span className="profile-identity-kicker"><Sprout size={16}/>{stage||missingLabel}</span>
      <h2 id="profile-identity-title">{role||missingLabel}</h2>
      <p className="profile-identity-education">{education||missingLabel}</p>
      <div className="profile-identity-pills">
        <span>{stage||missingLabel}</span>
        <span><MapPin size={14}/>{region||missingLabel}</span>
      </div>
      <div className="profile-goal-strip"><span>{careerGoalLabel}</span><strong>{careerGoal||missingLabel}</strong></div>
      <Link className="button profile-edit-action" to="/individual/intake/profile?edit=1">{editLabel}<ArrowRight size={16}/></Link>
    </div>
    <div className="profile-identity-art" aria-hidden="true"><BotanicalProfileEmblem/></div>
  </section>;
}
