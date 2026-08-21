import type { MilkTeaEntry } from '../types';

export interface MonthlyTeaStats {
  count: number;
  brandCount: number;
  favoriteBrand: string | null;
  favoriteCount: number;
}

/** 本月奶茶统计：杯数 / 品牌数 / 最爱品牌(喝最多的) */
export function getMonthlyTeaStats(milkTeas: MilkTeaEntry[], yearMonth: string): MonthlyTeaStats {
  const monthTeas = milkTeas.filter(t => t.date.startsWith(yearMonth));
  const count = monthTeas.length;

  const brandMap: Record<string, number> = {};
  monthTeas.forEach(t => {
    const b = t.brand || '未知';
    brandMap[b] = (brandMap[b] || 0) + 1;
  });

  const brands = Object.entries(brandMap);
  const brandCount = brands.length;

  let favoriteBrand: string | null = null;
  let favoriteCount = 0;
  for (const [brand, cnt] of brands) {
    if (cnt > favoriteCount) {
      favoriteBrand = brand;
      favoriteCount = cnt;
    }
  }

  return { count, brandCount, favoriteBrand, favoriteCount };
}

/** 按日期分组：返回 date -> MilkTeaEntry[] */
export function getDailyTeas(milkTeas: MilkTeaEntry[], yearMonth: string): Record<string, MilkTeaEntry[]> {
  const map: Record<string, MilkTeaEntry[]> = {};
  milkTeas
    .filter(t => t.date.startsWith(yearMonth))
    .forEach(t => {
      if (!map[t.date]) map[t.date] = [];
      map[t.date].push(t);
    });
  return map;
}
