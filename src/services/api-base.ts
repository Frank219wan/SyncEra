export function resolveApiRoot(configuredBaseUrl: string): string {
  const base = configuredBaseUrl.replace(/\/$/, '');
  return base.endsWith('/api/v1') ? base : `${base}/api/v1`;
}
