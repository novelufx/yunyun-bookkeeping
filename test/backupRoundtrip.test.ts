/**
 * 验证备份 JSON 能被 APP 的 mergeWithPresets 无损加载
 * 这是「导入备份」的真实代码路径，跑通才敢交给用户。
 */
import { readFileSync } from 'node:fs';
import { mergeWithPresets, exportState, recalcAccounts, presetAccounts, presetCategories } from '../src/store';

const raw = readFileSync(new URL('../recovered-2026-10-14.json', import.meta.url), 'utf8');
const parsed = JSON.parse(raw);

let fail = 0;
const chk = (n: string, g: unknown, w: unknown) => {
  const ok = JSON.stringify(g) === JSON.stringify(w);
  console.log(`  ${ok ? '✅' : '❌'} ${n}` + (ok ? '' : ` 期望 ${JSON.stringify(w)} 实际 ${JSON.stringify(g)}`));
  if (!ok) fail++;
};
const yuan = (c: number) => (c / 100).toFixed(2);

console.log('===== mergeWithPresets 无损加载 =====');
const st = mergeWithPresets(parsed);

chk('交易 75 笔', st.transactions.length, 75);
chk('支出 73 笔', st.transactions.filter(t => t.type === 'expense').length, 73);
chk('收入 2 笔', st.transactions.filter(t => t.type === 'income').length, 2);
chk('总支出 842.44', yuan(st.transactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0)), '842.44');
chk('总收入 1940.86', yuan(st.transactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0)), '1940.86');
chk('自定义「饮料」保留', st.categories.some(c => c.name === '饮料'), true);
chk('预设分类未被顶掉', st.categories.filter(c => c.type === 'expense').length >= presetCategories.filter(c => c.type === 'expense').length, true);
chk('账户 4 个', st.accounts.length, presetAccounts.length);
chk('快捷分类 8 个', st.shortcutCategories.length, 8);
chk('快捷分类全部有效', st.shortcutCategories.every(id => st.categories.some(c => c.id === id)), true);
chk('奶茶记录 0', st.milkTeas.length, 0);
chk('所有交易账户仍是微信', st.transactions.every(t => t.accountId === 'a-wechat'), true);

console.log('\n===== 账户余额重算（微信应为净流出）=====');
const accs = recalcAccounts(st.transactions, st.accounts);
const wechat = accs.find(a => a.id === 'a-wechat')!;
chk('微信余额 = 1940.86 - 842.44', yuan(wechat.balance), '1098.42');
chk('现金余额 = 0', yuan(accs.find(a => a.id === 'a-cash')!.balance), '0.00');

console.log('\n===== 再导出 → JSON 往返不丢数据 =====');
const re = JSON.parse(exportState(st));
chk('往返后仍是 75 笔', re.transactions.length, 75);
chk('往返后总支出不变', yuan(re.transactions.filter((t: any) => t.type === 'expense').reduce((s: number, t: any) => s + t.amount, 0)), '842.44');
chk('往返后饮料分类仍在', re.categories.some((c: any) => c.name === '饮料'), true);
chk('导出标记正确', re._app, 'yunyun-bookkeeping');

console.log('\n===== 兼容旧版导入（无 shortcutCategories/milkTeas 字段）=====');
const legacy = { transactions: parsed.transactions, categories: parsed.categories, accounts: parsed.accounts, budget: parsed.budget, _app: 'yunyun-bookkeeping' };
const st2 = mergeWithPresets(legacy);
chk('旧格式仍能加载 75 笔', st2.transactions.length, 75);
chk('旧格式自动补齐快捷分类', st2.shortcutCategories.length, 8);

console.log(fail === 0 ? '\n🎉 备份可被无损导入，且兼容旧版' : `\n❌ ${fail} 处不符`);
process.exit(fail === 0 ? 0 : 1);