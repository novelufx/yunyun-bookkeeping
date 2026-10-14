/**
 * 生成可直接导入的备份 JSON
 * 数据源：recovered-2026-10-14.txt（从截图识别，24 个每日小计已核对）
 * 输出：recovered-2026-10-14.json（_app: yunyun-bookkeeping 格式）
 */
import { writeFileSync } from 'node:fs';
import { parseImportText } from '../src/utils/importParser';
import { presetCategories, presetAccounts } from '../src/store';

// 她自定义过的分类（截图里出现过，预设里没有）
const customCats = [
  { id: 'c-drink', name: '饮料', type: 'expense', icon: '🥤', sort: 50 },
];
const allCats = [...presetCategories, ...customCats] as any;

const src = new URL('../recovered-2026-10-14.txt', import.meta.url);
const raw = (await import('node:fs')).readFileSync(src, 'utf8');

const parsed = parseImportText(raw, allCats);
if (parsed.errors.length) {
  console.error('存在无法解析的行，终止：', parsed.errors);
  process.exit(1);
}

const nowIso = new Date().toISOString();
const transactions = parsed.items.map((it, i) => ({
  id: 'r' + String(i + 1).padStart(3, '0'),
  type: it.type,
  amount: it.amount,
  categoryId: it.categoryId,
  accountId: 'a-wechat',
  date: it.date,
  note: it.note,
  createdAt: it.date + 'T12:00:00.000Z',
}));

const backup = {
  transactions,
  categories: allCats,
  accounts: presetAccounts,
  budget: { categories: {} },
  shortcutCategories: ['c-food', 'c-transport', 'c-shopping', 'c-home', 'c-edu', 'c-medical', 'c-entertain', 'c-social'],
  milkTeas: [],
  _app: 'yunyun-bookkeeping',
  _version: 2,
  _exportedAt: nowIso,
  _recoveredFrom: 'screenshots-2026-10-14',
};

const out = new URL('../recovered-2026-10-14.json', import.meta.url);
writeFileSync(out, JSON.stringify(backup, null, 2), 'utf8');

// ---------- 自校验 ----------
let fail = 0;
const chk = (n: string, g: unknown, w: unknown) => {
  const ok = JSON.stringify(g) === JSON.stringify(w);
  console.log(`  ${ok ? '✅' : '❌'} ${n}` + (ok ? '' : ` 期望 ${JSON.stringify(w)} 实际 ${JSON.stringify(g)}`));
  if (!ok) fail++;
};
const yuan = (c: number) => (c / 100).toFixed(2);

console.log('===== 备份 JSON 自校验 =====');
chk('交易笔数 = 75', transactions.length, 75);
chk('支出笔数 = 73', transactions.filter(t => t.type === 'expense').length, 73);
chk('收入笔数 = 2', transactions.filter(t => t.type === 'income').length, 2);
chk('总支出 = 842.44', yuan(transactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0)), '842.44');
chk('总收入 = 1940.86', yuan(transactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0)), '1940.86');
chk('全部账户 = 微信', transactions.every(t => t.accountId === 'a-wechat'), true);
chk('id 无重复', new Set(transactions.map(t => t.id)).size, 75);
chk('日期无空值', transactions.every(t => /^\d{4}-\d{2}-\d{2}$/.test(t.date)), true);
chk('分类 id 均有效', transactions.every(t => allCats.some((c: any) => c.id === t.categoryId)), true);

const byCat: Record<string, number> = {};
transactions.forEach(t => { byCat[t.categoryId] = (byCat[t.categoryId] || 0) + 1; });
const nm = (id: string) => allCats.find((c: any) => c.id === id)?.name || id;
console.log('\n分类分布：');
Object.entries(byCat).sort((a, b) => b[1] - a[1]).forEach(([k, v]) => console.log(`  ${nm(k)} ${v} 笔`));

const drink = byCat['c-drink'] || 0;
chk('自定义「饮料」分类 2 笔', drink, 2);

console.log(`\n文件大小：${(JSON.stringify(backup).length / 1024).toFixed(1)} KB`);
console.log(fail === 0 ? '🎉 备份 JSON 生成并通过自校验' : `❌ ${fail} 处不符`);
process.exit(fail === 0 ? 0 : 1);