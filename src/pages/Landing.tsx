import {useEffect, useRef, useState, type CSSProperties} from 'react';
import {Link} from 'react-router-dom';
import {LocaleSwitcher} from '../components';
import {ArrowUpRight, Pause, Play} from 'lucide-react';
import {useApp} from '../store';
import {careerContours} from './careerContours';
import {SlowSilhouetteTunnel} from '../components/SlowSilhouetteTunnel';
import './landing.css';

const INTRO_KEY = 'futureproof-home-intro';
const bambooLeafShapes = [
  'M0 0 C19 -21 55 -29 94 -15 C65 1 32 7 0 0Z',
  'M0 0 C24 -13 52 -14 78 -4 C55 9 26 10 0 0Z',
  'M0 0 C16 -25 42 -35 73 -31 C53 -10 28 3 0 0Z',
  'M0 0 C23 -11 62 -8 103 10 C63 18 27 12 0 0Z',
];
const ivyLeafShapes = [
  'M0 39 C-28 18 -40 -4 -31 -28 L-9 -11 0 -43 13 -10 37 -25 C49 3 29 28 0 39Z',
  'M0 39 C-31 21 -39 -8 -22 -31 L-5 -15 4 -43 14 -12 34 -20 C43 8 25 32 0 39Z',
  'M0 39 C-24 26 -37 1 -29 -25 L-12 -15 0 -41 12 -15 31 -29 C47 -2 32 26 0 39Z',
];
const figureLinks = [
  'M285 505 C324 493 325 438 350 416',
  'M290 226 C357 193 404 151 480 140',
  'M205 610 C343 585 418 481 560 463',
  'M1053 226 C963 222 897 128 802 94',
  'M1230 575 C1087 593 1018 465 854 445',
  'M1260 270 C1167 281 1118 205 1032 210',
];

function splitCareerContour(path: string) {
  const outerStart = path.lastIndexOf(' M');
  return {detail: path.slice(0, outerStart), outline: path.slice(outerStart + 1)};
}

function motionAllowed(element: Element) {
  return !document.hidden && !matchMedia('(prefers-reduced-motion: reduce)').matches && !element.closest('.intro-active, .motion-paused');
}

function flutterLeaf(element: SVGElement) {
  if (!motionAllowed(element)) return;
  const direction = Number(element.dataset.windDirection || 1);
  element.getAnimations().forEach(animation => animation.cancel());
  element.animate([
    {transform: 'rotate(0deg)'},
    {transform: `rotate(${7 * direction}deg)`, offset: .17},
    {transform: `rotate(${-4.5 * direction}deg)`, offset: .38},
    {transform: `rotate(${2.5 * direction}deg)`, offset: .61},
    {transform: `rotate(${-1 * direction}deg)`, offset: .82},
    {transform: 'rotate(0deg)'},
  ], {duration: 1050, easing: 'ease-in-out'});
}

function hopLetter(element: HTMLElement) {
  if (!motionAllowed(element)) return;
  element.getAnimations().forEach(animation => animation.cancel());
  element.animate([
    {transform: 'translateY(0)'},
    {transform: 'translateY(-9px)', offset: .38},
    {transform: 'translateY(-5px)', offset: .57},
    {transform: 'translateY(0)'},
  ], {duration: 470, easing: 'cubic-bezier(.22,.8,.25,1)'});
}

function WindLeaf({d, pivot, direction, className = ''}: {d: string; pivot: string; direction: number; className?: string}) {
  return <path className={`wind-leaf ${className}`} d={d} style={{transformOrigin: pivot}} data-wind-direction={direction} onPointerEnter={event => flutterLeaf(event.currentTarget)}/>;
}

function WindIvyLeaf({fill, opacity, direction = 1}: {fill: string; opacity: number; direction?: number}) {
  return <g className="wind-leaf vine-blade" data-wind-direction={direction} onPointerEnter={event => flutterLeaf(event.currentTarget)}>
    <path d="M0 45 C-33 23 -54 3 -38 -23 L-12 -10 L0 -42 L17 -10 L45 -22 C59 7 34 36 0 45Z" fill={fill} opacity={opacity}/>
    <path d="M0 45 L0 -30 M0 22 L-28 -9 M0 9 L27 -7" stroke="url(#ivy-stem-gradient)"/>
  </g>;
}

/** CSS owns the timeline; this controller only handles session and visibility. */
function useHomepageMotion() {
  const root = useRef<HTMLDivElement>(null);
  const [paused, setPaused] = useState(false);
  const [introFinished, setIntroFinished] = useState(false);
  const [playIntro] = useState(() => {
    try { return sessionStorage.getItem(INTRO_KEY) !== 'seen' && !matchMedia('(prefers-reduced-motion: reduce)').matches; }
    catch { return false; }
  });
  useEffect(() => {
    const element = root.current;
    try { sessionStorage.setItem(INTRO_KEY, 'seen'); } catch { /* Storage is optional. */ }
    const sync = () => element?.classList.toggle('page-hidden', document.hidden);
    sync();
    document.addEventListener('visibilitychange', sync);
    // Let the final dissolve finish before removing intro-only layers. This
    // also keeps the sequence in sync when the tab is hidden mid-animation.
    const finishIntro = (event: AnimationEvent) => {
      if (event.animationName === 'ink-drops-exit') setIntroFinished(true);
    };
    const media = matchMedia('(prefers-reduced-motion: reduce)');
    const reduceMotion = () => { if (media.matches) setIntroFinished(true); };
    element?.addEventListener('animationend', finishIntro);
    media.addEventListener('change', reduceMotion);
    return () => {
      document.removeEventListener('visibilitychange', sync);
      element?.removeEventListener('animationend', finishIntro);
      media.removeEventListener('change', reduceMotion);
      element?.querySelectorAll('.wind-leaf, .headline-glyph').forEach(node => node.getAnimations().forEach(animation => animation.cancel()));
    };
  }, []);
  useEffect(() => {
    const element = root.current;
    if (!element || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    let frame = 0;
    const move = (event: PointerEvent) => {
      if (element.classList.contains('intro-active') || element.classList.contains('motion-paused')) return;
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const box = element.getBoundingClientRect();
        element.style.setProperty('--garden-x', `${((event.clientX-box.left)/box.width-.5)*14}px`);
        element.style.setProperty('--garden-y', `${((event.clientY-box.top)/box.height-.5)*10}px`);
      });
    };
    const reset = () => { element.style.setProperty('--garden-x', '0px'); element.style.setProperty('--garden-y', '0px'); };
    element.addEventListener('pointermove', move, {passive:true});
    element.addEventListener('pointerleave', reset);
    return () => { cancelAnimationFrame(frame); element.removeEventListener('pointermove', move); element.removeEventListener('pointerleave', reset); };
  }, []);
  return {root, paused, setPaused, playIntro:playIntro && !introFinished};
}

/** Botanical linework and career pathways share the same growth points. */
function BotanicalBackground({paused}: {paused: boolean}) {
  return <div className="ink-garden" aria-hidden="true">
    <SlowSilhouetteTunnel paused={paused}/>
    <div className="intro-ink-drops"><span/><span/><span/><span/><span/></div>
    <div className="garden-light"/>
    <svg className="intro-forest" viewBox="0 0 1440 900" preserveAspectRatio="xMidYMid slice" fill="none">
      <defs>
        <linearGradient id="intro-bamboo-stroke" x1="0" y1="0" x2="0" y2="1" gradientUnits="objectBoundingBox"><stop stopColor="#506e58"/><stop offset="1" stopColor="#a9baa0"/></linearGradient>
        <linearGradient id="intro-vine-stroke" x1="0" y1="0" x2="0" y2="1" gradientUnits="objectBoundingBox"><stop stopColor="#9eae99"/><stop offset="1" stopColor="#627a66"/></linearGradient>
        <linearGradient id="intro-warm-stroke" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#cbbb83"/><stop offset="1" stopColor="#c99e83"/></linearGradient>
        <linearGradient id="intro-leaf-green" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#d9e2c9"/><stop offset="1" stopColor="#9ab495"/></linearGradient>
        <linearGradient id="intro-leaf-olive" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#e3e4be"/><stop offset="1" stopColor="#9bab79"/></linearGradient>
        <linearGradient id="intro-leaf-sage" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#d5e5d8"/><stop offset="1" stopColor="#82a18b"/></linearGradient>
        <linearGradient id="intro-leaf-warm" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#eee3b8"/><stop offset="1" stopColor="#d8c8a0"/></linearGradient>
        <linearGradient id="intro-ivy-warm" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#e9d5b9"/><stop offset="1" stopColor="#c9ad9b"/></linearGradient>
      </defs>
      <g className="intro-bamboo-grove">
        {[{x:44,s:1.1,r:-3},{x:155,s:.86,r:2},{x:278,s:1.05,r:-2},{x:1040,s:.92,r:3},{x:1180,s:1.15,r:-4},{x:1350,s:.84,r:2}].map(({x,s,r},i)=><g className="intro-bamboo" key={x} style={{'--draw-delay':`${(i<3?i:5-i)*.08}s`} as CSSProperties} transform={`translate(${x} 0) rotate(${r} 0 900) scale(${s} 1)`}>
          <path className="intro-stem-wash" pathLength="1" d={i<3?'M21 -50 Q-8 170 3 420 Q-13 660 0 950':'M0 950 Q-13 660 3 420 Q-8 170 21 -50'}/>
          <path className="intro-stem" pathLength="1" d={i<3?'M21 -50 Q-8 170 3 420 Q-13 660 0 950':'M0 950 Q-13 660 3 420 Q-8 170 21 -50'}/>
          <path className="intro-stem-highlight" pathLength="1" d={i<3?'M19 -50 Q-10 170 1 420 Q-15 660 -2 950':'M-2 950 Q-15 660 1 420 Q-10 170 19 -50'}/>
          {[105,226,364,505,653,790].map((y,j)=><g key={y} className="intro-spray" style={{'--cluster-delay':`${i<3?.28+i*.26+j*.18:.28+(5-i)*.26+(5-j)*.18}s`} as CSSProperties}>
            <g className="intro-node" transform={`translate(${[6,1,1,-2,-6,-5][j]} ${y})`}><ellipse rx="4.5" ry="2.5"/><path d="M-4 4 Q0 5.5 4 4"/></g>
            <path className={`intro-branch ${j%3===0?'warm-branch':''}`} pathLength="1" d={`M${j%2?6:0} ${y} Q${j%2?-52:55} ${y-36} ${j%2?-115:115} ${y-48}`}/>
            {[0,1].map((leafIndex)=>{const variation=(i*3+j+leafIndex)%4;const left=j%2===1;const tone=['sage','olive','green','warm'][(i+j+leafIndex*2)%4];const leafScale=[.7,.88,1.08,.79][variation]*(leafIndex===1?.74:1);return <g className={`intro-leaf tone-${tone}`} key={leafIndex} style={{'--leaf-opacity':`${.5+variation*.07}`} as CSSProperties} transform={`translate(${left?-(leafIndex?62:104):(leafIndex?61:105)} ${y-(leafIndex?28:52)}) scale(${left?-leafScale:leafScale} ${leafScale}) rotate(${[-11,5,-19,9][variation]})`}><path d={bambooLeafShapes[variation]}/><path className="intro-leaf-vein" d="M3 0 Q43 -8 82 -13"/></g>})}
          </g>)}
        </g>)}
      </g>
      <g className="intro-vines">
        <path className="intro-vine-wash" pathLength="1" d="M1450 -40 C1240 110 1430 230 1220 360 S1420 520 1170 720 S1060 890 940 970"/>
        <path className="intro-vine-wash" pathLength="1" d="M-45 90 C180 190 0 330 220 420 S120 650 365 760"/>
        <path className="intro-vine-stem" pathLength="1" d="M1450 -40 C1240 110 1430 230 1220 360 S1420 520 1170 720 S1060 890 940 970"/>
        <path className="intro-vine-stem warm-vine-line" pathLength="1" d="M-45 90 C180 190 0 330 220 420 S120 650 365 760"/>
        <path className="intro-vine-tendril" pathLength="1" d="M1220 360 C1178 341 1159 365 1138 396 M1170 720 C1123 690 1086 726 1055 767 M220 420 C253 402 270 431 283 467"/>
        {[{x:1345,y:118,r:-20},{x:1260,y:270,r:26},{x:1370,y:420,r:-35},{x:1230,y:575,r:21},{x:1115,y:745,r:-28},{x:115,y:202,r:18},{x:165,y:390,r:-25},{x:205,y:610,r:33}].map(({x,y,r},i)=><g className="intro-vine-cluster" key={i} style={{'--cluster-delay':`${[1.46,1.19,.89,.55,.28,.28,.78,1.29][i]}s`} as CSSProperties} transform={`translate(${x} ${y}) rotate(${r}) scale(${[.76,1.04,.88,1.12,.71,.82,1.06,.91][i]})`}>{[0,1,2].map((leafIndex)=><g className={`intro-vine-leaf tone-${['sage','green','olive','warm'][(i+leafIndex)%4]}`} key={leafIndex} style={{'--leaf-opacity':`${.43+(i%3)*.07-leafIndex*.04}`} as CSSProperties} transform={`translate(${[0,-41,39][leafIndex]} ${[0,26,35][leafIndex]}) rotate(${[0,-29,35][leafIndex]}) scale(${[1,.55,.64][leafIndex]})`}><path d={ivyLeafShapes[(i+leafIndex)%3]}/><path d="M0 38V-30M0 13l-24-25M0 8l24-22"/></g>)}</g>)}
      </g>
    </svg>
    <svg className="intro-careers" viewBox="0 0 1440 900" preserveAspectRatio="xMidYMid slice" fill="none">
      <defs><linearGradient id="career-pencil" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#3b594b"/><stop offset=".58" stopColor="#696f59"/><stop offset="1" stopColor="#967e67"/></linearGradient></defs>
      <g className="intro-figure-links">{figureLinks.map((path,i)=><path className="figure-link" key={path} pathLength="1" d={path} style={{'--link-delay':`${1.87+i*.36}s`} as CSSProperties}/>)}</g>
      {careerContours.map((figure,i)=>{const {detail,outline}=splitCareerContour(figure.path);return <g className="intro-figure" key={figure.id} style={{'--figure-delay':`${2.1+i*.36}s`} as CSSProperties} transform={`translate(${[300,330,530,720,800,930][i]} ${[420,130,455,85,430,205][i]}) rotate(${[-6,4,-3,5,-4,3][i]}) scale(${[.83,.8,.72,.78,.73,.8][i]})`}><path className="figure-matte" d={outline}/><path className="figure-understroke" pathLength="1" d={outline}/><path className="figure-ink" pathLength="1" d={outline}/><path className="figure-detail" pathLength="1" d={detail}/></g>})}
    </svg>
    <svg className="ink-stage" viewBox="0 0 1440 900" preserveAspectRatio="xMidYMid slice" fill="none">
      <defs>
        <radialGradient id="wash-spot"><stop offset="0" stopColor="#829875" stopOpacity=".24"/><stop offset="1" stopColor="#829875" stopOpacity="0"/></radialGradient>
        <linearGradient id="brush-ink" x1="0" x2="1"><stop stopColor="#324d38"/><stop offset=".52" stopColor="#849b76"/><stop offset="1" stopColor="#d3ddc7" stopOpacity=".2"/></linearGradient>
      </defs>
      <g className="wash-clouds" opacity=".78"><ellipse cx="400" cy="240" rx="330" ry="210" fill="url(#wash-spot)"/><ellipse cx="1070" cy="630" rx="430" ry="250" fill="url(#wash-spot)"/><ellipse cx="750" cy="390" rx="260" ry="165" fill="url(#wash-spot)"/></g>
      <g className="brush-garden" stroke="url(#brush-ink)" strokeLinecap="round">
        <path pathLength="1" strokeWidth="10" d="M80 930 Q110 640 82 360 T130 -50"/><path pathLength="1" strokeWidth="5" d="M135 930 Q170 680 148 470 T190 30"/>
        <path pathLength="1" strokeWidth="7" d="M1370 -40 Q1270 210 1330 390 T1270 940"/><path pathLength="1" strokeWidth="3" d="M1320 0 Q1225 210 1290 420 T1190 900"/>
        <path className="brush-crossing" pathLength="1" strokeWidth="2" d="M0 720 C180 580 300 750 460 630 S700 520 840 620 S1100 720 1440 520"/>
      </g>
      <g className="brush-details" stroke="currentColor" strokeWidth="1" opacity=".7"><path pathLength="1" d="M270 180h180M915 510h220M500 770h180"/><circle cx="270" cy="180" r="4"/><circle cx="450" cy="180" r="4"/><circle cx="915" cy="510" r="4"/><circle cx="1135" cy="510" r="4"/><circle cx="500" cy="770" r="4"/><circle cx="680" cy="770" r="4"/></g>
      <path className="brush-route" pathLength="1" d="M72 760 C240 530 350 520 520 430 S790 250 1000 330 S1200 510 1380 260"/>
      <circle className="brush-tip" cx="72" cy="760" r="7"/>
    </svg>
    <svg className="ink-bamboo" viewBox="0 0 300 800" preserveAspectRatio="none" fill="none">
      <defs>
        <linearGradient id="bamboo-stem-gradient" x1="0" y1="0" x2="0" y2="800" gradientUnits="userSpaceOnUse"><stop stopColor="#193d2f"/><stop offset=".4" stopColor="#2f6f46"/><stop offset="1" stopColor="#cfe0d6"/></linearGradient>
        <linearGradient id="bamboo-leaf-gradient" x1="0" y1="0" x2="0" y2="800" gradientUnits="userSpaceOnUse"><stop stopColor="#2f6f46"/><stop offset=".45" stopColor="#7ba48a"/><stop offset="1" stopColor="#cfe0d6"/></linearGradient>
        <linearGradient id="bamboo-yellow-leaf" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#b3aa55"/><stop offset=".55" stopColor="#d8ce80"/><stop offset="1" stopColor="#eadfcc"/></linearGradient>
      </defs>
      <g className="ink-strokes" stroke="url(#bamboo-stem-gradient)" strokeLinecap="round">
        <path pathLength="1" strokeWidth="9" d="M65 820 Q100 550 75 310 T88 -20"/>
        <path pathLength="1" strokeWidth="6" d="M123 820 Q141 580 128 390 T160 -20"/>
        <path pathLength="1" strokeWidth="7" opacity=".72" d="M173 830 Q155 610 177 410 T196 -30"/>
        <path pathLength="1" strokeWidth="5" opacity=".5" d="M205 825 Q189 600 212 350 T238 -20"/>
        <path pathLength="1" strokeWidth="6" opacity=".58" d="M101 830 Q66 570 103 360 T119 -20"/>
        <g className="bamboo-nodes" strokeWidth="2.2" opacity=".78">
          <path pathLength="1" d="M75 150 Q83 155 91 150 M69 301 Q77 306 85 301 M76 460 Q84 465 92 461 M83 628 Q91 633 99 629"/>
          <path pathLength="1" d="M143 166 Q151 171 159 166 M128 335 Q136 340 144 335 M126 500 Q134 505 142 501 M131 673 Q139 678 147 673"/>
          <path pathLength="1" d="M181 184 Q189 189 197 184 M172 365 Q180 370 188 365 M160 535 Q168 540 176 536 M167 703 Q175 708 183 704"/>
        </g>
        {[178,337,526,719].map((y,i)=><path key={`grove-${y}`} pathLength="1" strokeWidth="1" d={`M175 ${y} l14 -2 M208 ${y-43} l12 -1 M177 ${y} Q215 ${y-35} 262 ${y-24} M207 ${y-43} Q170 ${y-80} 139 ${y-73}`}/>)}
        {[130,270,410,550,690].map((y,i)=><g key={y}><path pathLength="1" strokeWidth="2" d={`M${i%2?75:80} ${y} l17 -2 M130 ${y+50} l13 -1`}/><path pathLength="1" strokeWidth="1" d={`M86 ${y} Q140 ${y-45} 210 ${y-35} M133 ${y+50} Q88 ${y+20} 30 ${y+6}`}/></g>)}
      </g>
      <g className="ink-foliage" fill="url(#bamboo-leaf-gradient)">
        {[168,349,552,726].map((y,i)=><g key={`extra-${y}`} opacity={.65-i*.08}>
          <WindLeaf d={`M178 ${y} Q212 ${y-39} 253 ${y-30} Q223 ${y-5} 178 ${y}`} pivot="0% 100%" direction={1}/>
          <WindLeaf d={`M204 ${y-17} Q238 ${y-7} 264 ${y+17} Q228 ${y+10} 204 ${y-17}`} pivot="0% 0%" direction={-1}/>
          <WindLeaf d={`M176 ${y+8} Q147 ${y-20} 132 ${y-55} Q166 ${y-39} 176 ${y+8}`} pivot="100% 100%" direction={-1}/>
        </g>)}
        {[108,286,481,683].map((y,i)=><g key={y} className="leaf-cluster" style={{'--leaf-delay':`${-i*1.7}s`} as CSSProperties} transform={`translate(${[0,12,-8,14][i]} 0) scale(${[1,.92,1.08,.88][i]} 1)`}>
          <WindLeaf d={`M115 ${y+15} Q154 ${y-38} 205 ${y-35} Q175 ${y+3} 115 ${y+15}`} pivot="0% 100%" direction={1}/>
          <WindLeaf d={`M151 ${y} Q184 ${y+30} 227 ${y+22} Q192 ${y+4} 151 ${y}`} pivot="0% 0%" direction={-1}/>
          <WindLeaf d={`M75 ${y+39} Q48 ${y-7} 5 ${y-15} Q21 ${y+22} 75 ${y+39}`} pivot="100% 100%" direction={-1}/>
          <WindLeaf d={`M96 ${y+5} Q72 ${y-26} 32 ${y-34} Q55 ${y-3} 96 ${y+5}`} pivot="100% 100%" direction={1}/>
          <WindLeaf d={`M127 ${y+34} Q160 ${y+44} 183 ${y+67} Q144 ${y+57} 127 ${y+34}`} pivot="0% 0%" direction={1}/>
          {i<2&&<>
            <WindLeaf className="bamboo-warm-leaf" d={`M102 ${y+28} Q132 ${y-12} 168 ${y-19} Q148 ${y+15} 102 ${y+28}Z`} pivot="0% 100%" direction={-1}/>
            <WindLeaf className="bamboo-warm-leaf" d={`M83 ${y-2} Q109 ${y-28} 143 ${y-30} Q118 ${y-9} 83 ${y-2}Z`} pivot="0% 100%" direction={1}/>
            <WindLeaf className="bamboo-warm-leaf" d={`M35 ${y+13} Q58 ${y-22} 94 ${y-29} Q76 ${y+1} 35 ${y+13}Z`} pivot="0% 100%" direction={-1}/>
          </>}
        </g>)}
      </g>
    </svg>
    <svg className="ink-ivy" viewBox="0 0 300 800" fill="none">
      <defs>
        <linearGradient id="ivy-stem-gradient" x1="0" y1="0" x2="0" y2="800" gradientUnits="userSpaceOnUse"><stop stopColor="#cfe0d6"/><stop offset=".48" stopColor="#7ba48a"/><stop offset="1" stopColor="#193d2f"/></linearGradient>
        <linearGradient id="ivy-leaf-gradient" x1="0" y1="0" x2="0" y2="1"><stop stopColor="#cbd8c1"/><stop offset="1" stopColor="#789578"/></linearGradient>
        <linearGradient id="ivy-orange-leaf" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#eadfcc"/><stop offset=".48" stopColor="#d8bb91"/><stop offset="1" stopColor="#2f6f46"/></linearGradient>
        <linearGradient id="ivy-deep-leaf" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#7ba48a"/><stop offset="1" stopColor="#193d2f"/></linearGradient>
      </defs>
      <path className="ivy-stem ink-strokes" pathLength="1" d="M240 -20 C100 100 280 200 182 312 S264 491 167 610 S157 730 97 820" stroke="url(#ivy-stem-gradient)" strokeWidth="2"/>
      <path className="ivy-stem ink-strokes" pathLength="1" d="M285 20 C174 160 269 249 220 367 S122 510 155 614 S103 751 64 824 M270 240 C183 315 226 417 160 477 S109 643 125 708" stroke="url(#ivy-stem-gradient)" strokeWidth="1.5" opacity=".74"/>
      <path className="ivy-stem ink-strokes" pathLength="1" d="M260 570 C206 619 229 682 165 742 S108 798 75 840 M218 655 C165 682 163 753 124 825" stroke="url(#ivy-stem-gradient)" strokeWidth="1.6" opacity=".75"/>
      {[{x:88,y:688,r:-29,s:.58},{x:125,y:753,r:24,s:.68},{x:178,y:783,r:-42,s:.57}].map(({x,y,r,s},i)=><g className="ivy-leaf leaf-cluster" key={`lower-vine-${i}`} style={{'--leaf-delay':`${-i*1.4}s`} as CSSProperties} transform={`translate(${x} ${y}) rotate(${r}) scale(${s})`}><WindIvyLeaf fill={i===1?'url(#ivy-orange-leaf)':'url(#ivy-deep-leaf)'} opacity={i===1?.77:.6} direction={i%2?-1:1}/></g>)}
      {[{x:225,y:148,r:28,s:.58},{x:201,y:287,r:-32,s:.67},{x:184,y:438,r:39,s:.62},{x:143,y:566,r:-24,s:.72},{x:132,y:737,r:31,s:.68}].map(({x,y,r,s},i)=><g className="ivy-leaf leaf-cluster" key={`vine-${y}`} style={{'--leaf-delay':`${-i*1.9}s`} as CSSProperties} transform={`translate(${x} ${y}) rotate(${r}) scale(${s})`}><WindIvyLeaf fill={i>2?'url(#ivy-deep-leaf)':'url(#ivy-leaf-gradient)'} opacity={.38+i*.08} direction={i%2?-1:1}/></g>)}
      {[72,219,365,518,676].map((y,i)=><g className="ivy-leaf leaf-cluster" key={y} style={{'--leaf-delay':`${-i*1.3}s`} as CSSProperties} transform={`translate(${[164,195,156,204,174][i]} ${y}) rotate(${[-30,38,-17,29,-36][i]})`}>
        <WindIvyLeaf fill={i>=3?'url(#ivy-orange-leaf)':'url(#ivy-leaf-gradient)'} opacity={i>=3?.78:.49} direction={i%2?-1:1}/>
        <g transform={`translate(${i%2?42:-37} ${i%2?34:16}) rotate(${i%2?-26:30}) scale(.52)`}><WindIvyLeaf fill={i>=3?'url(#ivy-deep-leaf)':'url(#ivy-leaf-gradient)'} opacity={i>=3?.7:.42} direction={i%2?1:-1}/></g>
      </g>)}
    </svg>
    <svg className="career-network" viewBox="0 0 1440 900" preserveAspectRatio="xMidYMid slice" fill="none">
      <g className="network-paths" stroke="currentColor" strokeWidth="1">
        <path pathLength="1" d="M65 690 H180 Q210 690 210 660 V610 Q210 580 240 580 H305 M210 630 H320 Q350 630 350 660 V745 H520"/>
        <path pathLength="1" d="M1020 140 H1140 Q1170 140 1170 170 V240 H1310 M1170 195 H1260 V105 H1370"/>
        <path pathLength="1" d="M1010 790 H1120 V730 H1210 V655 H1355"/>
      </g>
      {[[65,690],[210,630],[305,580],[350,745],[520,745],[1020,140],[1170,195],[1310,240],[1260,105],[1120,790],[1210,730],[1355,655]].map(([x,y],i)=><circle key={i} className="skill-node" cx={x} cy={y} r={i%3===0?5:3} style={{animationDelay:`${-i*.6}s`}}/>) }
      <g className="network-labels" fill="currentColor" fontSize="11" letterSpacing="1.6"><text x="250" y="566">LEARN</text><text x="368" y="766">GROW</text><text x="1020" y="126">CONNECT</text><text x="1120" y="817">OPPORTUNITY</text></g>
      <path className="network-signal" pathLength="1" d="M65 690 H180 Q210 690 210 660 V610 Q210 580 240 580 H305" stroke="currentColor" strokeWidth="2"/>
    </svg>
  </div>;
}

type EmblemProps = {keywords?: string[]; radius?: number; duration?: number; inclination?: number; perspective?: number};
/** Real CSS 3D orbit: counter-rotation keeps each moving word upright. */
export function FloatingBrandEmblem({keywords=['Skills','Career','Growth','AI'], radius=118, duration=28, inclination=18, perspective=650}: EmblemProps) {
  const style = {'--orbit-radius':`${radius}px`, '--orbit-duration':`${duration}s`, '--orbit-inclination':`${inclination}deg`, '--orbit-perspective':`${perspective}px`} as CSSProperties;
  return <div className="emblem-entrance" aria-hidden="true"><div className="brand-emblem" style={style}>
    <div className="emblem-shadow"/>
    <div className="emblem-space">
      <div className="sculpture"><div className="sprout-stem"/><div className="sculpted-leaf leaf-left"/><div className="sculpted-leaf leaf-right"/><div className="sculpted-leaf leaf-crown"/><div className="growth-joint"/></div>
      <div className="orbital-plane"><div className="orbital-guide"/>{keywords.map((word,i)=><div className="word-orbit" key={word} style={{'--phase':`${-duration*i/keywords.length}s`} as CSSProperties}><span className="word-position"><span className="orbit-word">{word}</span></span></div>)}</div>
    </div>
  </div></div>;
}

export function Home() {
  const {t} = useApp();
  const {root, paused, setPaused, playIntro} = useHomepageMotion();
  return <div ref={root} className={`landing cinematic-home ${playIntro?'intro-active':''} ${paused?'motion-paused':''}`}>
    <BotanicalBackground paused={paused}/>
    <header className="landing-header"><div className="landing-tools"><button className="motion-toggle" onClick={()=>setPaused(v=>!v)} aria-pressed={paused} aria-label={paused?t('Resume ambient animation','继续环境动画','Sambung animasi'):t('Pause ambient animation','暂停环境动画','Jeda animasi')}>{paused?<Play size={15}/>:<Pause size={15}/>}</button><LocaleSwitcher/></div></header>
    <main className="landing-main">
      <div className="landing-copy">
        <FloatingBrandEmblem/>
        <h1 aria-label="Skillogy"><span className="type-mask" aria-hidden="true"><span className="headline-line">{[...'Skillogy'].map((letter,i)=><span className="headline-letter" style={{'--letter-delay':`${i*0.13}s`} as CSSProperties} key={`${letter}-${i}`} onPointerEnter={event => hopLetter(event.currentTarget.firstElementChild as HTMLElement)}><span className="headline-glyph">{letter}</span></span>)}</span></span></h1>
        <p className="hero-tagline type-mask"><span>{t('Grow your career with AI','与 AI 一起，生长职业未来','Kembangkan kerjaya anda dengan AI')}</span></p>
        <p className="hero-description"><span className="type-mask"><span>{t('Understand your strengths. Find your direction.','读懂自身优势，找到前行方向。','Kenali kekuatan anda. Temui arah anda.')}</span></span><span className="type-mask"><span>{t('Build the skills for what comes next.','培养技能，迎接未来的可能。','Bina kemahiran untuk masa depan.')}</span></span></p>
      </div>
      <div className="entry-pair">
        <div className="entry-reveal"><Link to="/individual" className="entry-card individual-entry"><span className="card-art card-bamboo" aria-hidden="true"><i/><i/><i/></span><div><h2>{t('Individual','个人','Individu')}</h2><p className="entry-tagline">{t('rooted to rise','扎根，向上生长','berakar untuk berkembang')}</p></div><p className="entry-description" lang="en">Discover your career direction, build essential skills, and grow toward your future.</p><ArrowUpRight className="entry-arrow" size={22} aria-hidden="true"/></Link></div>
        <div className="entry-reveal"><Link to="/organization" className="entry-card organization-entry"><span className="card-art card-ivy" aria-hidden="true"><i/><i/><i/></span><div><h2>{t('Organization','机构','Organisasi')}</h2><p className="entry-tagline">{t('guided to thrive','相引，共同繁茂','dibimbing untuk maju')}</p></div><p className="entry-description" lang="en">Identify workforce skill gaps, develop talent, and plan for tomorrow.</p><ArrowUpRight className="entry-arrow" size={22} aria-hidden="true"/></Link></div>
      </div>
    </main>
  </div>;
}
