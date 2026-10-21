import React from 'react';
import ReactDOM from 'react-dom/client';
import {BrowserRouter,Routes,Route,Outlet} from 'react-router-dom';
import '@fontsource/noto-sans/400.css';
import '@fontsource/noto-sans/500.css';
import '@fontsource/noto-sans/600.css';
import '@fontsource/noto-serif/500.css';
import '@fontsource/noto-sans-sc/400.css';
import '@fontsource/noto-sans-sc/500.css';
import '@fontsource/noto-serif-sc/500.css';
import './styles.css';
import {Provider,useApp} from './store';
import {Shell,EmptyState,ButtonLink} from './components';
import {Home,IndividualHome,OrganizationHome} from './pages/Home';
import {Intake,ProfileInput,ProfileReview,Analyzing} from './pages/Intake';
import {Radar,Recommendations,RoleDetail} from './pages/Careers';
import {MindMap,RoadmapDraft,LearningJourney} from './pages/Learning';
import {OrganizationPages} from './pages/Organization';
function NotFound(){const {t}=useApp();return <EmptyState title={t('This path isn’t here yet.','暂时没有这条路径。','Laluan ini belum tersedia.')} description={t('Return home to find your next step.','返回首页，找到你的下一步。','Kembali ke laman utama untuk langkah seterusnya.')} action={<ButtonLink to="/">{t('Return home','返回首页','Kembali ke utama')}</ButtonLink>}/>;}
class ErrorBoundary extends React.Component<{children:React.ReactNode},{error:boolean}>{
  state={error:false};
  static getDerivedStateFromError(){return{error:true};}
  render(){return this.state.error?<main className="crash-page"><h1>Something needs a fresh start.</h1><p>Your saved progress remains on this device. Reload the page to try again.</p><button className="button" onClick={()=>window.location.reload()}>Reload page</button></main>:this.props.children;}
}
ReactDOM.createRoot(document.getElementById('root')!).render(<React.StrictMode><ErrorBoundary><Provider><BrowserRouter><Routes><Route path="/" element={<Home/>}/><Route element={<Shell><Outlet/></Shell>}>
  <Route path="/individual" element={<IndividualHome/>}/>
  <Route path="/individual/radar" element={<Radar/>}/>
  <Route path="/individual/intake" element={<Intake/>}/>
  <Route path="/individual/intake/profile" element={<ProfileInput/>}/>
  <Route path="/individual/intake/review" element={<ProfileReview/>}/>
  <Route path="/individual/analyzing" element={<Analyzing/>}/>
  <Route path="/individual/recommendations" element={<Recommendations/>}/>
  <Route path="/individual/roles/:roleId" element={<RoleDetail/>}/>
  <Route path="/individual/skills/:skillId/mind-map" element={<MindMap/>}/>
  <Route path="/individual/roadmap/draft" element={<RoadmapDraft/>}/>
  <Route path="/individual/roadmap/:planId" element={<LearningJourney/>}/>
  <Route path="/organization" element={<OrganizationHome/>}/>
  {['intake','heatmap','mobility','training','dashboard'].map(p=><Route key={p} path={`/organization/hr/${p}`} element={<OrganizationPages key={`hr-${p}`}/>}/>)}
  {['students','trends','gaps','cohort','insights'].map(p=><Route key={p} path={`/organization/tvet/${p}`} element={<OrganizationPages key={`tvet-${p}`}/>}/>)}
  <Route path="*" element={<NotFound/>}/>
</Route></Routes></BrowserRouter></Provider></ErrorBoundary></React.StrictMode>);
