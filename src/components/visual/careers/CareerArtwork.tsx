import dataArt from '../../../assets/careers/data.svg';
import workflowArt from '../../../assets/careers/workflow.svg';
import greenArt from '../../../assets/careers/green.svg';
import generalArt from '../../../assets/careers/general.svg';

export function CareerArtwork({roleId,domain}:{roleId:string;domain:string}){
  const src=domain==='green'?greenArt:roleId==='ai-workflow'?workflowArt:roleId==='data-analyst'||roleId==='research-analyst'?dataArt:generalArt;
  return <img className="matches-card-art" src={src} alt="" aria-hidden="true"/>;
}
