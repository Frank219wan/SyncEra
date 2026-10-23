export function latestMarketPeriod(periods: readonly string[], selectedPeriod: string): string {
  return periods.reduce((latest, period) => period > latest ? period : latest, selectedPeriod);
}
