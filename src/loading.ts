export type LoadingScene = 'home' | 'bamboo' | 'ivy';

export const PAGE_TRANSITION_MS = 1450;

export function loadingSceneForPath(pathname: string): LoadingScene | null {
  if (pathname === '/individual' || pathname.startsWith('/individual/')) return 'bamboo';
  if (pathname === '/organization' || pathname.startsWith('/organization/')) return 'ivy';
  return null;
}

/** Animate workspace entry and the return to selection, not internal navigation. */
export function workspaceTransitionScene(previousPath: string | null, nextPath: string): LoadingScene | null {
  if(nextPath==='/' && previousPath!==null && loadingSceneForPath(previousPath)!==null)return 'home';
  const next=loadingSceneForPath(nextPath);
  if(next===null)return null;
  return previousPath!==null && loadingSceneForPath(previousPath)===next ? null : next;
}
