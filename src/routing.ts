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
