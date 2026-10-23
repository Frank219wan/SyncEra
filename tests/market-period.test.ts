import assert from 'node:assert/strict';
import test from 'node:test';
import {latestMarketPeriod} from '../src/marketPeriod.ts';

test('radar note uses the latest imported quarter, not the selected historical quarter', () => {
  assert.equal(latestMarketPeriod(['2026-Q2', '2026-Q1', '2027-Q1'], '2026-Q1'), '2027-Q1');
  assert.equal(latestMarketPeriod([], '2026-Q1'), '2026-Q1');
});
