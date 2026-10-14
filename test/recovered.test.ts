import { readFileSync } from 'node:fs';
import { parseImportText } from '../src/utils/importParser';
import { presetCategories } from '../src/store';

const raw = readFileSync(new URL('../recovered-2026-10-14.txt', import.meta.url), 'utf8');
const r = parseImportText(raw, presetCategories);

const inc = (a: number) => (a / 100).toFixed(2);
let fail = 0;
function chk(name: string, got: unknown, want: unknown) {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  console.log(`  ${ok ? '✅' : '❌'} ${name}` + (ok ? '' : `\n     期望 ${JSON.stringify(want)}，实际 ${JSON.stringify(got)}`));
  if (!ok) fail++;
}

console.log('===== 解析无错误 =====');
chk('错误行数 = 0', r.errors.length, 0);
if (r.errors.length) console.log(r.errors.slice(0, 5));
chk('解析出 75 笔', r.items.length, 75);

const sept = r.items.filter(i => i.date.startsWith('2026-09'));
const oct = r.items.filter(i => i.date.startsWith('2026-10'));

const sum = (arr: any[]) => arr.filter(i => i.type === 'expense').reduce((s, i) => s + i.amount, 0);
const incSum = (arr: any[]) => arr.filter(i => i.type === 'income').reduce((s, i) => s + i.amount, 0);

console.log('\n===== 金额核对（与截图上的每日小计逐一比对）=====');
chk('9月笔数 = 55', sept.length, 55);
chk('9月支出 = 559.14', inc(sum(sept)), '559.14');
chk('9月收入 = 1250.00', inc(incSum(sept)), '1250.00');

chk('10月笔数 = 20', oct.length, 20);
chk('10月支出 = 283.30', inc(sum(oct)), '283.30');
chk('10月收入 = 690.86', inc(incSum(oct)), '690.86');

chk('总笔数 = 75', r.items.length, 75);
chk('总支出 = 842.44', inc(sum(r.items)), '842.44');
chk('总收入 = 1940.86', inc(incSum(r.items)), '1940.86');

console.log('\n===== 每日小计（对照截图红字）=====');
const byDay: Record<string, number> = {};
for (const i of r.items) if (i.type === 'expense') byDay[i.date] = (byDay[i.date] || 0) + i.amount;
const expect: Record<string, string> = {
  '2026-09-07': '23.40', '2026-09-08': '19.90', '2026-09-09': '30.00', '2026-09-10': '24.50',
  '2026-09-11': '20.80', '2026-09-12': '83.00', '2026-09-13': '20.60', '2026-09-14': '27.40',
  '2026-09-15': '31.90', '2026-09-16': '31.50', '2026-09-17': '17.00', '2026-09-18': '47.00',
  '2026-09-19': '77.44', '2026-09-20': '30.40', '2026-09-21': '23.20', '2026-09-22': '24.90',
  '2026-09-23': '26.20', '2026-10-08': '32.90', '2026-10-09': '22.00', '2026-10-10': '44.00',
  '2026-10-11': '93.90', '2026-10-12': '35.50', '2026-10-13': '27.00', '2026-10-14': '28.00',
};
let dayOk = 0;
for (const [d, want] of Object.entries(expect)) {
  const got = inc(byDay[d] || 0);
  const ok = got === want;
  if (!ok) console.log(`  ❌ ${d}: 期望 ${want} 实际 ${got}`);
  else dayOk++;
}
chk(`每日小计全部吻合 (${dayOk}/${Object.keys(expect).length})`, dayOk, Object.keys(expect).length);

console.log('\n===== 分类分布 =====');
const byCat: Record<string, number> = {};
for (const i of r.items) byCat[i.categoryId] = (byCat[i.categoryId] || 0) + 1;
const name = (id: string) => presetCategories.find(c => c.id === id)?.name || id;
Object.entries(byCat).sort((a, b) => b[1] - a[1]).forEach(([k, v]) => console.log(`  ${name(k).padEnd(4)} ${v} 笔`));

console.log('\n===== 类型判定 =====');
chk('收入笔数 = 2', r.items.filter(i => i.type === 'income').length, 2);
chk('支出笔数 = 73', r.items.filter(i => i.type === 'expense').length, 73);

console.log(`\n===== 结果：${fail === 0 ? '✅ 全部核对通过' : '❌ 有 ' + fail + ' 处不符'} =====`);