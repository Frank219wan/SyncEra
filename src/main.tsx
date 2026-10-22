import React from 'react';
import ReactDOM from 'react-dom/client';
import {BrowserRouter,Routes,Route,Outlet,Navigate,useSearchParams} from 'react-router-dom';
import '@fontsource/noto-sans/400.css';
import '@fontsource/noto-sans/500.css';
import '@fontsource/noto-sans/600.css';
import '@fontsource/noto-serif/500.css';
import '@fontsource/bodoni-moda/500.css';
import '@fontsource/bodoni-moda/500-italic.css';
import '@fontsource/noto-sans-sc/400.css';
import '@fontsource/noto-sans-sc/500.css';
import '@fontsource/noto-serif-sc/500.css';
import './styles.css';
import {Provider,useApp} from './store';
import {Shell,EmptyState,ButtonLink} from './components';
import {Home,IndividualHome,OrganizationHome} from './pages/Home';
import {About} from './pages/About';
import {Intake,IntakeStart,ProfileInput,ProfileReview,Analyzing} from './pages/Intake';
import {PsychologyAssessmentPage} from './pages/PsychologyAssessment';
import {ProfileEdit} from './pages/ProfileEdit';
import {Recommendations,RoleDetail} from './pages/Careers';
import {Radar} from './pages/RadarExperience';
import {ConnectedRadar} from './pages/ConnectedCareers';
import {isDemo} from './services/api';
import {MindMap,RoadmapDraft,LearningJourney,LearningJourneyOverview} from './pages/Learning';
import {OrganizationPages,HRDepartmentDetails} from './pages/Organization';
import {RouteLoadingScreen} from './LoadingScreen';
function ProfileRoute(){const [params]=useSearchParams();const {state}=useApp();return params.get('edit')==='1'?<ProfileEdit/>:!state.profile.stage||!state.profile.goal?<Navigate to="/individual/intake/start" replace/>:<ProfileInput/>;}
function RadarRoute(){return isDemo?<Radar/>:<ConnectedRadar/>;}
function RecommendationsRoute(){
  const {state,t}=useApp();
  if(!isDemo&&!state.profile.id&&state.profile.occupation)return <EmptyState title={t('Review your updated profile','请核对更新后的画像','Semak profil yang dikemas kini')} description={t('Your saved edits have not been confirmed by the connected profile service. Review the profile before recalculating matches.','已保存的修改尚未通过连接服务确认；请先核对画像，再重新计算推荐。','Perubahan tersimpan belum disahkan oleh perkhidmatan profil. Semak sebelum mengira semula padanan.')} action={<ButtonLink to="/individual/intake/profile">{t('Review profile','核对画像','Semak profil')}</ButtonLink>}/>;
  if(!state.results&&state.profile.revision&&state.profile.occupation&&state.profile.education){
    const pending=state.profile.skills.some(skill=>!skill.confirmed);
    return <EmptyState title={pending?t('Review your saved profile','请核对已保存画像','Semak profil tersimpan'):t('Your saved profile is ready','已保存画像，可更新推荐','Profil tersimpan sedia')} description={pending?t('Confirm extracted or inferred skills before calculating matches.','先确认提取或推断的技能，再计算职业推荐。','Sahkan kemahiran yang diekstrak atau diinferens sebelum mengira padanan.'):t('Calculate career matches from the current profile before relying on an earlier analysis.','请根据当前画像重新计算职业推荐，再参考分析结果。','Kira padanan daripada profil semasa sebelum menggunakan analisis terdahulu.')} action={<ButtonLink to={pending?'/individual/intake/review':'/individual/analyzing'}>{pending?t('Review skills','核对技能','Semak kemahiran'):t('Calculate current matches','重新计算推荐','Kira padanan semasa')}</ButtonLink>}/>;
  }
  return <Recommendations/>;
}
function NotFound(){const {t}=useApp();return <EmptyState title={t('This path isn’t here yet.','暂时没有这条路径。','Laluan ini belum tersedia.')} description={t('Return home to find your next step.','返回首页，找到你的下一步。','Kembali ke laman utama untuk langkah seterusnya.')} action={<ButtonLink to="/">{t('Return home','返回首页','Kembali ke utama')}</ButtonLink>}/>;}
class ErrorBoundary extends React.Component<{children:React.ReactNode},{error:boolean}>{
  state={error:false};
  static getDerivedStateFromError(){return{error:true};}
  render(){return this.state.error?<main className="crash-page"><h1>Something needs a fresh start.</h1><p>Your saved progress remains on this device. Reload the page to try again.</p><button className="button" onClick={()=>window.location.reload()}>Reload page</button></main>:this.props.children;}
}
ReactDOM.createRoot(document.getElementById('root')!).render(<React.StrictMode><ErrorBoundary><Provider><BrowserRouter><div id="site-routes"><Routes><Route path="/" element={<Home/>}/><Route element={<Shell><Outlet/></Shell>}>
  <Route path="/individual" element={<IndividualHome/>}/>
  <Route path="/individual/radar" element={<RadarRoute/>}/>
  <Route path="/individual/intake" element={<Intake/>}/>
  <Route path="/individual/intake/start" element={<IntakeStart/>}/>
  <Route path="/individual/intake/profile" element={<ProfileRoute/>}/>
  <Route path="/individual/intake/assessment" element={<PsychologyAssessmentPage/>}/>
  <Route path="/individual/intake/review" element={<ProfileReview/>}/>
  <Route path="/individual/analyzing" element={<Analyzing/>}/>
  <Route path="/individual/recommendations" element={<RecommendationsRoute/>}/>
  <Route path="/individual/roles/:roleId" element={<RoleDetail/>}/>
  <Route path="/individual/skills/:skillId/mind-map" element={<MindMap/>}/>
  <Route path="/individual/roadmap/draft" element={<RoadmapDraft/>}/>
  <Route path="/individual/roadmap/:planId" element={<LearningJourney/>}/>
  <Route path="/individual/learning-journey" element={<LearningJourneyOverview/>}/>
  <Route path="/organization" element={<OrganizationHome/>}/>
  <Route path="/about" element={<Navigate to="/individual/about" replace/>}/>
  <Route path="/individual/about" element={<About/>}/>
  <Route path="/organization/about" element={<About/>}/>
  <Route path="/organization/hr/about" element={<About/>}/>
  <Route path="/organization/tvet/about" element={<About/>}/>
  {['intake','heatmap','mobility','training','dashboard'].map(p=><Route key={p} path={`/organization/hr/${p}`} element={<OrganizationPages key={`hr-${p}`}/>}/>)}
  <Route path="/organization/hr/department/:departmentId" element={<HRDepartmentDetails/>}/>
  {['students','trends','gaps','cohort','insights'].map(p=><Route key={p} path={`/organization/tvet/${p}`} element={<OrganizationPages key={`tvet-${p}`}/>}/>)}
  <Route path="*" element={<NotFound/>}/>
</Route></Routes></div><RouteLoadingScreen/></BrowserRouter></Provider></ErrorBoundary></React.StrictMode>);
