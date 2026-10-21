import type {Role} from './types';

export interface Circle { x:number; y:number; radius:number }
export interface RadarChild extends Circle { role:Role }
export interface RadarGroup extends Circle { domain:string; children:RadarChild[] }

const PADDING=18;
const GAP=5;

function placeChildren(roles:Role[],parentRadius:number,scale:number):RadarChild[]|null{
  const placed:RadarChild[]=[];
  const ordered=[...roles].sort((a,b)=>b.signal-a.signal||a.id.localeCompare(b.id));
  if(ordered.length===2||ordered.length===3){
    const radii=ordered.map(role=>(100+role.signal*.65)/1.8*scale);
    const separation=Math.max(...radii.flatMap((radius,i)=>radii.slice(i+1).map(other=>radius+other+GAP)));
    const ring=ordered.length===3?separation/Math.sqrt(3):separation/2;
    const centers=ordered.length===3
      ? [{x:0,y:-ring},{x:ring*Math.sqrt(3)/2,y:ring/2},{x:-ring*Math.sqrt(3)/2,y:ring/2}]
      : [{x:-ring,y:0},{x:ring,y:0}];
    if(centers.some((center,i)=>Math.hypot(center.x,center.y)+radii[i]+PADDING>parentRadius))return null;
    return ordered.map((role,i)=>({role,...centers[i],radius:radii[i]}));
  }
  for(const role of ordered){
    // Use more of each industry's available interior while retaining signal ratios.
    const radius=(100+role.signal*.65)/1.8*scale;
    const limit=parentRadius-PADDING-radius;
    if(limit<0)return null;
    let center:{x:number;y:number}|null=null;
    if(!placed.length)center={x:0,y:0};
    else{
      const step=Math.max(2,Math.min(8,radius/3));
      for(let distance=0;distance<=limit+step&&!center;distance+=step){
        const ring=Math.min(distance,limit);
        for(let index=0;index<72;index++){
          const angle=2*Math.PI*index/72;
          const x=ring*Math.cos(angle),y=ring*Math.sin(angle);
          if(Math.hypot(x,y)+radius+PADDING>parentRadius+1e-6)continue;
          if(placed.every(other=>Math.hypot(x-other.x,y-other.y)+1e-6>=radius+other.radius+GAP)){center={x,y};break;}
        }
      }
    }
    if(!center)return null;
    placed.push({role,x:center.x,y:center.y,radius});
  }
  return placed;
}

/** One scale factor is shared by all occupations in an industry. Raw signals are never changed. */
export function packRadarChildren(roles:Role[],parentRadius:number):RadarChild[]{
  if(!roles.length)return [];
  let low=0,high=1;
  while(placeChildren(roles,parentRadius,high)&&high<16)high*=2;
  let best:RadarChild[]=[];
  for(let i=0;i<22;i++){
    const middle=(low+high)/2;
    const result=placeChildren(roles,parentRadius,middle);
    if(result){low=middle;best=result;}else high=middle;
  }
  return best;
}

function overviewCircles(domains:string[],width:number,height:number):Array<Circle&{domain:string}>{
  const templates:Record<string,Circle>={
    technology:{x:225,y:250,radius:185},
    green:{x:610,y:126,radius:107},
    education:{x:610,y:374,radius:107},
    business:{x:850,y:250,radius:106},
  };
  if(domains.every(domain=>domain in templates)){
    const scale=Math.min(width/1000,height/500);
    const offsetX=(width-1000*scale)/2,offsetY=(height-500*scale)/2;
    return domains.map(domain=>({domain,x:offsetX+templates[domain].x*scale,y:offsetY+templates[domain].y*scale,radius:templates[domain].radius*scale}));
  }
  const count=domains.length;
  const columns=Math.max(1,Math.ceil(Math.sqrt(count*width/height)));
  const rows=Math.ceil(count/columns);
  const cellWidth=width/columns,cellHeight=height/rows;
  const radius=Math.max(12,Math.min(cellWidth,cellHeight)/2-12);
  return domains.map((domain,index)=>({domain,x:(index%columns+.5)*cellWidth,y:(Math.floor(index/columns)+.5)*cellHeight,radius}));
}

export function layoutRadar(roles:Role[],width:number,height:number,focusedDomain:string|null=null):RadarGroup[]{
  const groups=new Map<string,Role[]>();
  for(const role of roles){if(!groups.has(role.domain))groups.set(role.domain,[]);groups.get(role.domain)!.push(role);}
  const domains=[...groups.keys()].sort();
  const visible=focusedDomain&&groups.has(focusedDomain)?[focusedDomain]:domains;
  const isFocused=Boolean(focusedDomain&&groups.has(focusedDomain));
  const circles=isFocused
    ? [{domain:focusedDomain!,x:width/2,y:height/2,radius:Math.max(12,Math.min(width,height)/2-18)}]
    : overviewCircles(visible,width,height);
  // In the overview, all occupation radii share a single scale so signals remain comparable across industries.
  const globalScale=isFocused?1:Math.min(1,...circles.map(parent=>{
    const first=packRadarChildren(groups.get(parent.domain)!,parent.radius)[0];
    return first?first.radius/((100+first.role.signal*.65)/1.8):1;
  }));
  return circles.map(parent=>{
    const children=isFocused?packRadarChildren(groups.get(parent.domain)!,parent.radius)
      : placeChildren(groups.get(parent.domain)!,parent.radius,globalScale*(1-1e-5))||[];
    const radius=!isFocused&&children.length===1?children[0].radius+PADDING+1:parent.radius;
    return {...parent,radius,children:children.map(child=>({...child,x:parent.x+child.x,y:parent.y+child.y}))};
  });
}
