import type {AppState, MarketRadarPackage} from './types.ts';

// The DOSM market snapshot is evidence for Radar, never a matching input.
export function withMarketSnapshot(previous: AppState, market: MarketRadarPackage): AppState {
  return {...previous, marketSnapshotId: market.snapshotId, marketMeta: market.meta};
}
