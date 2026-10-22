import {useEffect, useRef, useState, type CSSProperties} from 'react';
import {Link} from 'react-router-dom';
import {Brand, LocaleSwitcher} from '../components';
import {ArrowUpRight, Pause, Play} from 'lucide-react';
import {useApp} from '../store';
import {careerContours} from './careerContours';
import './landing.css';

const INTRO_KEY = 'futureproof-home-intro';

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
    try { sessionStorage.setItem(INTRO_KEY, 'seen'); } catch { /* Storage is optional. */ }
    const sync = () => root.current?.classList.toggle('page-hidden', document.hidden);
    sync();
    document.addEventListener('visibilitychange', sync);
    // Restore ambient foliage rules after the entrance and clean up on navigation.
    const endIntro = window.setTimeout(() => setIntroFinished(true), 5650);
    return () => { document.removeEventListener('visibilitychange', sync); window.clearTimeout(endIntro); };
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
function BotanicalBackground() {
  return <div className="ink-garden" aria-hidden="true">
    <div className="garden-light"/>
    <svg className="intro-forest" viewBox="0 0 1440 900" preserveAspectRatio="xMidYMid slice" fill="none">
      <defs>
        <linearGradient id="intro-bamboo-stroke" x1="0" y1="0" x2="0" y2="1" gradientUnits="objectBoundingBox"><stop stopColor="#506e58"/><stop offset="1" stopColor="#a9baa0"/></linearGradient>
        <linearGradient id="intro-vine-stroke" x1="0" y1="0" x2="0" y2="1" gradientUnits="objectBoundingBox"><stop stopColor="#9eae99"/><stop offset="1" stopColor="#627a66"/></linearGradient>
        <linearGradient id="intro-warm-stroke" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#cbbb83"/><stop offset="1" stopColor="#c99e83"/></linearGradient>
        <linearGradient id="intro-leaf-green" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#d9e2c9"/><stop offset="1" stopColor="#9ab495"/></linearGradient>
        <linearGradient id="intro-leaf-warm" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#eee3b8"/><stop offset="1" stopColor="#d8c8a0"/></linearGradient>
        <linearGradient id="intro-ivy-warm" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#e9d5b9"/><stop offset="1" stopColor="#c9ad9b"/></linearGradient>
      </defs>
      <g className="intro-bamboo-grove">
        {[{x:44,s:1.1,r:-3},{x:155,s:.86,r:2},{x:278,s:1.05,r:-2},{x:1040,s:.92,r:3},{x:1180,s:1.15,r:-4},{x:1350,s:.84,r:2}].map(({x,s,r},i)=><g className="intro-bamboo" key={x} style={{'--draw-delay':`${i*.11}s`} as CSSProperties} transform={`translate(${x} 0) rotate(${r} 0 900) scale(${s} 1)`}>
          <path className="intro-stem" pathLength="1" d="M0 950 Q-13 660 3 420 Q-8 170 21 -50"/>
          {[105,226,364,505,653,790].map((y,j)=><g key={y} className="intro-spray" style={{'--spray-delay':`${.28+i*.1+j*.13}s`} as CSSProperties}>
            <path className={`intro-branch ${j%3===0?'warm-branch':''}`} pathLength="1" d={`M${j%2?6:0} ${y} Q${j%2?-52:55} ${y-36} ${j%2?-115:115} ${y-48}`}/>
            <path className={`intro-leaf ${j<2&&i%2===0?'warm-leaf':''}`} d={`M${j%2?-45:40} ${y-24} Q${j%2?-83:83} ${y-86} ${j%2?-123:123} ${y-68} Q${j%2?-86:88} ${y-36} ${j%2?-45:40} ${y-24}Z M${j%2?-68:67} ${y-35} Q${j%2?-108:107} ${y+9} ${j%2?-138:138} ${y+2} Q${j%2?-103:105} ${y-35} ${j%2?-68:67} ${y-35}Z`}/>
          </g>)}
        </g>)}
      </g>
      <g className="intro-vines">
        <path className="intro-vine-stem" pathLength="1" d="M1450 -40 C1240 110 1430 230 1220 360 S1420 520 1170 720 S1060 890 940 970"/>
        <path className="intro-vine-stem warm-vine-line" pathLength="1" d="M-45 90 C180 190 0 330 220 420 S120 650 365 760"/>
        {[{x:1345,y:118,r:-20},{x:1260,y:270,r:26},{x:1370,y:420,r:-35},{x:1230,y:575,r:21},{x:1115,y:745,r:-28},{x:115,y:202,r:18},{x:165,y:390,r:-25},{x:205,y:610,r:33}].map(({x,y,r},i)=><g className={`intro-vine-leaf ${i===3||i===4||i===7?'warm-vine':''}`} key={i} style={{'--spray-delay':`${.48+i*.17}s`} as CSSProperties} transform={`translate(${x} ${y}) rotate(${r})`}><path d="M0 39 C-28 18 -40 -4 -31 -28 L-9 -11 0 -43 13 -10 37 -25 C49 3 29 28 0 39Z"/><path d="M0 38V-30M0 13l-24-25M0 8l24-22"/></g>)}
      </g>
    </svg>
    <svg className="intro-careers" viewBox="0 0 1440 900" preserveAspectRatio="xMidYMid slice" fill="none">
      <defs><linearGradient id="career-pencil" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#3b594b"/><stop offset=".58" stopColor="#696f59"/><stop offset="1" stopColor="#967e67"/></linearGradient></defs>
      {careerContours.map((figure,i)=><g className="intro-figure" key={figure.id} style={{'--figure-delay':`${1.45+i*.22}s`} as CSSProperties} transform={`translate(${[300,330,530,720,800,930][i]} ${[420,130,455,85,430,205][i]}) rotate(${[-6,4,-3,5,-4,3][i]}) scale(${[.83,.8,.72,.78,.73,.8][i]})`}><path className="figure-matte" fillRule="evenodd" d={figure.path}/><path className="figure-understroke" pathLength="1" d={figure.path}/><path className="figure-ink" pathLength="1" d={figure.path}/></g>)}
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
        <path pathLength="1" strokeWidth="2" d="M0 720 C180 580 300 750 460 630 S700 520 840 620 S1100 720 1440 520"/>
      </g>
      <g className="brush-details" stroke="currentColor" strokeWidth="1" opacity=".7"><path pathLength="1" d="M270 180h180M915 510h220M500 770h180"/><circle cx="270" cy="180" r="4"/><circle cx="450" cy="180" r="4"/><circle cx="915" cy="510" r="4"/><circle cx="1135" cy="510" r="4"/><circle cx="500" cy="770" r="4"/><circle cx="680" cy="770" r="4"/></g>
      <path className="brush-route" pathLength="1" d="M72 760 C240 530 350 520 520 430 S790 250 1000 330 S1200 510 1380 260"/>
      <circle className="brush-tip" cx="72" cy="760" r="7"/>
    </svg>
    <svg className="ink-bamboo" viewBox="0 0 300 800" fill="none">
      <defs>
        <linearGradient id="bamboo-stem-gradient" x1="0" y1="0" x2="0" y2="800" gradientUnits="userSpaceOnUse"><stop stopColor="#193d2f"/><stop offset=".4" stopColor="#2f6f46"/><stop offset="1" stopColor="#cfe0d6"/></linearGradient>
        <linearGradient id="bamboo-leaf-gradient" x1="0" y1="0" x2="0" y2="800" gradientUnits="userSpaceOnUse"><stop stopColor="#2f6f46"/><stop offset=".45" stopColor="#7ba48a"/><stop offset="1" stopColor="#cfe0d6"/></linearGradient>
        <linearGradient id="bamboo-yellow-leaf" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#b3aa55"/><stop offset=".55" stopColor="#d8ce80"/><stop offset="1" stopColor="#eadfcc"/></linearGradient>
      </defs>
      <g className="ink-strokes" stroke="url(#bamboo-stem-gradient)" strokeLinecap="round">
        <path pathLength="1" strokeWidth="5" d="M65 820 Q100 550 75 310 T88 -20"/>
        <path pathLength="1" strokeWidth="3" d="M123 820 Q141 580 128 390 T160 -20"/>
        {[130,270,410,550,690].map((y,i)=><g key={y}><path pathLength="1" strokeWidth="2" d={`M${i%2?75:80} ${y} l17 -2 M130 ${y+50} l13 -1`}/><path pathLength="1" strokeWidth="1" d={`M86 ${y} Q140 ${y-45} 210 ${y-35} M133 ${y+50} Q88 ${y+20} 30 ${y+6}`}/></g>)}
      </g>
      <g className="ink-foliage" fill="url(#bamboo-leaf-gradient)">
        {[108,286,481,683].map((y,i)=><g key={y} className="leaf-cluster" style={{'--leaf-delay':`${-i*1.7}s`} as CSSProperties} transform={`translate(${[0,12,-8,14][i]} 0) scale(${[1,.92,1.08,.88][i]} 1)`}><path d={`M115 ${y+15} Q154 ${y-38} 205 ${y-35} Q175 ${y+3} 115 ${y+15} M151 ${y} Q184 ${y+30} 227 ${y+22} Q192 ${y+4} 151 ${y} M75 ${y+39} Q48 ${y-7} 5 ${y-15} Q21 ${y+22} 75 ${y+39} M96 ${y+5} Q72 ${y-26} 32 ${y-34} Q55 ${y-3} 96 ${y+5} M127 ${y+34} Q160 ${y+44} 183 ${y+67} Q144 ${y+57} 127 ${y+34}`}/>{i<2&&<path className="bamboo-warm-leaf" d={`M102 ${y+28} Q132 ${y-12} 168 ${y-19} Q148 ${y+15} 102 ${y+28}Z M83 ${y-2} Q109 ${y-28} 143 ${y-30} Q118 ${y-9} 83 ${y-2}Z`}/>}</g>)}
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
      {[72,219,365,518,676].map((y,i)=><g className="ivy-leaf leaf-cluster" key={y} style={{'--leaf-delay':`${-i*1.3}s`} as CSSProperties} transform={`translate(${[164,195,156,204,174][i]} ${y}) rotate(${[-30,38,-17,29,-36][i]})`}><path d="M0 45 C-33 23 -54 3 -38 -23 L-12 -10 L0 -42 L17 -10 L45 -22 C59 7 34 36 0 45Z" fill={i>=3?'url(#ivy-orange-leaf)':'url(#ivy-leaf-gradient)'} opacity={i>=3?'.78':'.49'}/><path d="M0 45 L0 -30 M0 22 L-28 -9 M0 9 L27 -7" stroke="url(#ivy-stem-gradient)"/><g transform={`translate(${i%2?42:-37} ${i%2?34:16}) rotate(${i%2?-26:30}) scale(.52)`}><path d="M0 45 C-33 23 -54 3 -38 -23 L-12 -10 L0 -42 L17 -10 L45 -22 C59 7 34 36 0 45Z" fill={i>=3?'url(#ivy-deep-leaf)':'url(#ivy-leaf-gradient)'} opacity={i>=3?'.7':'.42'}/><path d="M0 45 L0 -30 M0 22 L-28 -9 M0 9 L27 -7" stroke="url(#ivy-stem-gradient)"/></g></g>)}
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
    <BotanicalBackground/>
    <header className="landing-header"><div className="brand-reveal"><Brand/></div><div className="landing-tools"><button className="motion-toggle" onClick={()=>setPaused(v=>!v)} aria-pressed={paused} aria-label={paused?t('Resume ambient animation','继续环境动画','Sambung animasi'):t('Pause ambient animation','暂停环境动画','Jeda animasi')}>{paused?<Play size={15}/>:<Pause size={15}/>}</button><LocaleSwitcher/></div></header>
    <main className="landing-main">
      <div className="landing-copy">
        <FloatingBrandEmblem/>
        <h1 aria-label="connected growth">{['connected','growth'].map(line=><span className="type-mask" aria-hidden="true" key={line}><span className="headline-line">{[...line].map((letter,i)=><span className="headline-letter" style={{'--letter-delay':`${i*0.045}s`} as CSSProperties} key={`${line}-${i}`}>{letter}</span>)}</span></span>)}</h1>
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
