import type {MarketRadarSignal} from '../types';

export function sortMarketSignals(items:MarketRadarSignal[],descending:boolean){
  return [...items].sort((a,b)=>a.postings===null?(b.postings===null?0:1):b.postings===null?-1:descending?b.postings-a.postings:a.postings-b.postings);
}

export function barWidth(postings:number|null,max:number){
  return postings===null||max<=0?0:Math.max(0,Math.min(100,postings/max*100));
}
