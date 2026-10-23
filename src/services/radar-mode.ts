export type RadarMode = 'demo' | 'matching' | 'dosm';

export function resolveRadarMode(demo: boolean, dosmFlag: string | undefined): RadarMode {
  if (demo) return 'demo';
  return dosmFlag === 'true' ? 'dosm' : 'matching';
}
