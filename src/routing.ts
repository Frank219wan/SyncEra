export type RouteContext = {
  workspace: 'home' | 'individual' | 'organization';
  program: 'home' | 'individual' | 'organization' | 'hr' | 'tvet';
};

/** Sidebar context comes from the active URL, never from a remembered workspace toggle. */
export function routeContextFromPath(pathname: string): RouteContext {
  if (pathname === '/') return { workspace: 'home', program: 'home' };
  if (pathname.startsWith('/organization/hr/')) return { workspace: 'organization', program: 'hr' };
  if (pathname.startsWith('/organization/tvet/')) return { workspace: 'organization', program: 'tvet' };
  if (pathname.startsWith('/organization')) return { workspace: 'organization', program: 'organization' };
  return { workspace: 'individual', program: 'individual' };
}

type Translate = (en: string, zh: string, ms: string) => string;
export type Breadcrumb = { label: string; to?: string };

/** The final crumb names the active page; earlier crumbs are navigable parents. */
export function breadcrumbsForPath(pathname: string, t: Translate): Breadcrumb[] {
  const individual = {label: t('Your personal space', '个人成长空间', 'Ruang peribadi anda'), to: '/individual'};
  const organization = {label: t('Organization', '机构', 'Organisasi'), to: '/organization'};
  if (pathname === '/individual') return [{...individual, to: '/'}, {label: t('My growth', '我的成长', 'Pertumbuhan saya')}];
  if (pathname === '/organization') return [{...organization, to: '/'}, {label: t('Choose workspace', '选择工作区', 'Pilih ruang kerja')}];

  if (pathname.startsWith('/individual/')) {
    const pages: Record<string, string> = {
      radar: t('Career radar', '职业雷达', 'Radar kerjaya'),
      intake: t('My profile', '我的画像', 'Profil saya'),
      recommendations: t('Career matches', '职业推荐', 'Padanan kerjaya'),
      'learning-journey': t('Learning journey', '学习旅程', 'Perjalanan belajar'),
      about: t('About', '关于', 'Tentang'),
    };
    const segments = pathname.split('/').filter(Boolean);
    if (segments[1] === 'intake' && segments[2]) {
      const detail = segments[2] === 'start'
        ? t('Questionnaire', '信息问卷', 'Soal selidik')
        : segments[2] === 'review'
          ? t('Review skills', '核对技能', 'Semak kemahiran')
          : t('Profile details', '画像详情', 'Butiran profil');
      return [individual, {label: pages.intake, to: '/individual/intake'}, {label: detail}];
    }
    if (segments[1] === 'roles') return [individual, {label: pages.recommendations, to: '/individual/recommendations'}, {label: t('Career details', '职业详情', 'Butiran kerjaya')}];
    if (segments[1] === 'skills') return [individual, {label: pages['learning-journey'], to: '/individual/learning-journey'}, {label: t('Learning resources', '学习资源', 'Sumber pembelajaran')}];
    if (segments[1] === 'roadmap') return [individual, {label: pages['learning-journey'], to: '/individual/learning-journey'}, {label: segments[2] === 'draft' ? t('Draft plan', '计划草稿', 'Draf pelan') : t('Plan details', '计划详情', 'Butiran pelan')}];
    if (segments[1] === 'analyzing') return [individual, {label: pages.recommendations, to: '/individual/recommendations'}, {label: t('Calculating matches', '计算推荐', 'Mengira padanan')}];
    return [individual, {label: pages[segments[1]] ?? t('Page', '页面', 'Halaman')}];
  }

  if (pathname.startsWith('/organization/')) {
    const segments = pathname.split('/').filter(Boolean);
    if (segments[1] === 'hr') {
      const labels: Record<string, string> = {
        dashboard: t('HR dashboard', 'HR 工作台', 'Papan pemuka HR'),
        intake: t('Team profile', '团队资料', 'Profil pasukan'),
        heatmap: t('Skill heatmap', '技能热图', 'Peta kemahiran'),
        mobility: t('Internal mobility', '内部转型', 'Mobiliti dalaman'),
        training: t('Enterprise training', '企业培训', 'Latihan perusahaan'),
        department: t('Department details', '部门详情', 'Butiran jabatan'),
        about: t('About', '关于', 'Tentang'),
      };
      if (segments[2] === 'dashboard') return [organization, {label: labels.dashboard}];
      return [organization, {label: 'HR / L&D', to: '/organization/hr/dashboard'}, {label: labels[segments[2]] ?? t('Page', '页面', 'Halaman')}];
    }
    if (segments[1] === 'tvet') {
      const labels: Record<string, string> = {
        students: t('Student analysis', '学生分析', 'Analisis pelajar'),
        trends: t('Industry trends', '行业趋势', 'Trend industri'),
        gaps: t('Career gaps', '职业差距', 'Jurang kerjaya'),
        cohort: t('Cohort analysis', '群体分析', 'Analisis kohort'),
        insights: t('Institution insights', '院校洞察', 'Wawasan institusi'),
        about: t('About', '关于', 'Tentang'),
      };
      if (segments[2] === 'students') return [organization, {label: labels.students}];
      return [organization, {label: 'TVET / University', to: '/organization/tvet/students'}, {label: labels[segments[2]] ?? t('Page', '页面', 'Halaman')}];
    }
    return [organization, {label: t('About', '关于', 'Tentang')}];
  }
  return [{label: t('Home', '首页', 'Laman utama')}];
}
