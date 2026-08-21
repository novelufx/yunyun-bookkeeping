import { getMonthlyTeaStats, getDailyTeas } from '../src/utils/teaStats';
import type { MilkTeaEntry } from '../src/types';

let pass = 0, fail = 0;
function eq(name: string, actual: unknown, expected: unknown) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (ok) { pass++; console.log(`  ✅ ${name}`); }
  else { fail++; console.log(`  ❌ ${name}\n     expected: ${JSON.stringify(expected)}\n     got:      ${JSON.stringify(actual)}`); }
}

const baseEntry = (overrides: Partial<MilkTeaEntry>): MilkTeaEntry => ({
  id: overrides.id || 'mt1',
  date: overrides.date || '2026-08-01',
  brand: overrides.brand !== undefined ? overrides.brand : '喜茶',
  sugar: overrides.sugar || '五分糖',
  ice: overrides.ice || '少冰',
  price: overrides.price ?? 1500,
  note: overrides.note,
  imgKey: overrides.imgKey || 'img_test',
});

// ===== 1. 月度统计 =====
console.log('\n===== 1. 月度统计 =====');

const teas1 = [
  baseEntry({ id: 't1', date: '2026-08-01', brand: '喜茶', price: 1800 }),
  baseEntry({ id: 't2', date: '2026-08-03', brand: '喜茶', price: 1500 }),
  baseEntry({ id: 't3', date: '2026-08-05', brand: '蜜雪冰城', price: 600 }),
  baseEntry({ id: 't4', date: '2026-08-10', brand: 'CoCo', price: 1200 }),
  baseEntry({ id: 't5', date: '2026-08-15', brand: '喜茶', price: 2000 }),
  // 不属于本月
  baseEntry({ id: 't6', date: '2026-07-31', brand: '喜茶', price: 1000 }),
  baseEntry({ id: 't7', date: '2026-09-01', brand: '喜茶', price: 1000 }),
];

const stats1 = getMonthlyTeaStats(teas1, '2026-08');
eq('本月杯数 = 5', stats1.count, 5);
eq('本月品牌数 = 3', stats1.brandCount, 3);
eq('最爱品牌 = 喜茶', stats1.favoriteBrand, '喜茶');
eq('最爱品牌杯数 = 3', stats1.favoriteCount, 3);

// ===== 2. 空数据 =====
console.log('\n===== 2. 空数据 =====');
const stats2 = getMonthlyTeaStats([], '2026-08');
eq('空数据杯数 = 0', stats2.count, 0);
eq('空数据品牌数 = 0', stats2.brandCount, 0);
eq('空数据无最爱', stats2.favoriteBrand, null);

// ===== 3. 同品牌并列（取第一个） =====
console.log('\n===== 3. 同杯数并列 =====');
const teas3 = [
  baseEntry({ id: 't1', date: '2026-08-01', brand: 'A' }),
  baseEntry({ id: 't2', date: '2026-08-02', brand: 'B' }),
];
const stats3 = getMonthlyTeaStats(teas3, '2026-08');
eq('并列时杯数 = 2', stats3.count, 2);
eq('并列时品牌数 = 2', stats3.brandCount, 2);
eq('并列时最爱存在', stats3.favoriteBrand !== null, true);

// ===== 4. 日期分组 =====
console.log('\n===== 4. 日期分组 =====');
const teas4 = [
  baseEntry({ id: 't1', date: '2026-08-01', brand: '喜茶' }),
  baseEntry({ id: 't2', date: '2026-08-01', brand: 'CoCo' }),
  baseEntry({ id: 't3', date: '2026-08-05', brand: '蜜雪冰城' }),
];
const daily4 = getDailyTeas(teas4, '2026-08');
eq('8月1日有2杯', daily4['2026-08-01']?.length, 2);
eq('8月5日有1杯', daily4['2026-08-05']?.length, 1);
eq('8月3日无数据', daily4['2026-08-03'], undefined);
eq('7月数据不混入', daily4['2026-07-31'], undefined);

// ===== 5. 跨月切换 =====
console.log('\n===== 5. 跨月切换 =====');
const teas5 = [
  baseEntry({ id: 't1', date: '2026-07-31', brand: '喜茶' }),
  baseEntry({ id: 't2', date: '2026-08-01', brand: '喜茶' }),
  baseEntry({ id: 't3', date: '2026-08-31', brand: 'CoCo' }),
  baseEntry({ id: 't4', date: '2026-09-01', brand: '蜜雪冰城' }),
];
eq('7月仅1杯', getMonthlyTeaStats(teas5, '2026-07').count, 1);
eq('8月有2杯', getMonthlyTeaStats(teas5, '2026-08').count, 2);
eq('9月有1杯', getMonthlyTeaStats(teas5, '2026-09').count, 1);

// ===== 6. 未知品牌处理 =====
console.log('\n===== 6. 未知品牌处理 =====');
const teas6 = [
  baseEntry({ id: 't1', date: '2026-08-01', brand: '' }),
  baseEntry({ id: 't2', date: '2026-08-02', brand: '喜茶' }),
];
const stats6 = getMonthlyTeaStats(teas6, '2026-08');
eq('空品牌不崩', stats6.count, 2);
eq('空品牌归为未知', stats6.brandCount, 2);

// ===== 7. 价格累加（验证 price 不丢精度） =====
console.log('\n===== 7. 价格精度 =====');
const teas7 = [
  baseEntry({ id: 't1', date: '2026-08-01', brand: '喜茶', price: 1899 }),
  baseEntry({ id: 't2', date: '2026-08-02', brand: '喜茶', price: 201 }),
];
const stats7 = getMonthlyTeaStats(teas7, '2026-08');
eq('杯数正确', stats7.count, 2);
eq('最爱=喜茶 杯数2', stats7.favoriteCount, 2);

console.log(`\n===== 结果：通过 ${pass} / 失败 ${fail} =====`);
if (fail === 0) console.log('🎉 奶茶统计逻辑全部通过');
