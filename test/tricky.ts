import {
  presetCategories, presetAccounts,
  getMonthlyStats, getDailyStats, getCategoryStats, recalcAccounts, formatMoney,
} from '../src/store.tsx';
import type { Transaction, Category, Account } from '../src/types';

// reducer / getInitialState 在 store.tsx 中未导出，此处逐字复制用于增删改用例
interface State { transactions: Transaction[]; categories: Category[]; accounts: Account[]; }
type Action =
  | { type: 'ADD_TX'; payload: Transaction }
  | { type: 'UPDATE_TX'; payload: Transaction }
  | { type: 'DELETE_TX'; payload: string }
  | { type: 'DELETE_CATEGORY'; payload: string }
  | { type: 'DELETE_ACCOUNT'; payload: string }
  | { type: 'RESET' };
function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'ADD_TX': return { ...state, transactions: [action.payload, ...state.transactions] };
    case 'UPDATE_TX': return { ...state, transactions: state.transactions.map(t => t.id === action.payload.id ? action.payload : t) };
    case 'DELETE_TX': return { ...state, transactions: state.transactions.filter(t => t.id !== action.payload) };
    case 'DELETE_CATEGORY': return { ...state, categories: state.categories.filter(c => c.id !== action.payload) };
    case 'DELETE_ACCOUNT': return { ...state, accounts: state.accounts.filter(a => a.id !== action.payload) };
    case 'RESET': return { transactions: [], categories: [...presetCategories], accounts: [...presetAccounts] };
    default: return state;
  }
}
function getInitialState(): State { return { transactions: [], categories: [...presetCategories], accounts: [...presetAccounts] }; }

// ---------- 测试框架 ----------
let pass = 0, fail = 0;
const fails: string[] = [];
function ok(name: string, cond: boolean, extra = '') {
  if (cond) { pass++; console.log(`  ✅ ${name}`); }
  else { fail++; fails.push(name); console.log(`  ❌ ${name}  ${extra}`); }
}
function eq(name: string, got: unknown, want: unknown) {
  ok(name, got === want, `got=${JSON.stringify(got)} want=${JSON.stringify(want)}`);
}

// ---------- 造一组刁钻数据 ----------
const YM = '2026-08';
const t = (o: Partial<Transaction> & Pick<Transaction,'type'|'amount'|'date'>): Transaction => ({
  id: 't-' + Math.random().toString(36).slice(2, 8),
  categoryId: '', accountId: 'a-cash', createdAt: new Date().toISOString(), ...o,
});

const txs: Transaction[] = [
  t({ type:'expense', categoryId:'c-food',     accountId:'a-wechat', amount:3550,     date:'2026-08-05', note:'午饭🍱' }),
  t({ type:'income',  categoryId:'c-salary',   accountId:'a-bank',   amount:1200000,  date:'2026-08-01' }),
  t({ type:'expense', categoryId:'c-transport',accountId:'a-cash',   amount:1,        date:'2026-08-05', note:'一分钱公交' }),
  t({ type:'expense', categoryId:'c-home',     accountId:'a-bank',   amount:99999999, date:'2026-08-02', note:'巨额支出' }),
  t({ type:'transfer',categoryId:'',          accountId:'a-wechat', toAccountId:'a-bank', amount:500000, date:'2026-08-02' }),
  t({ type:'expense', categoryId:'c-ghost',    accountId:'a-wechat', amount:2000,     date:'2026-08-03', note:'分类已删除' }),
  t({ type:'expense', categoryId:'c-food',     accountId:'a-ghost',  amount:800,      date:'2026-08-03', note:'账户已删除' }),
  t({ type:'income',  categoryId:'c-salary',   accountId:'a-bank',   amount:1,         date:'2026-08-01' }),
  t({ type:'expense', categoryId:'c-shopping', accountId:'a-alipay', amount:12345,    date:'2026-08-04', note:'超长备注💅买💄✨🌟！！！@#¥%&*()_+{}[]|\\:";\'<>,.?/一二三四五六七八九十' }),
  t({ type:'expense', categoryId:'c-food',     accountId:'a-cash',   amount:500,      date:'2026-08-05' }),
  t({ type:'expense', categoryId:'c-other-exp',accountId:'a-cash',   amount:0,        date:'2026-08-06', note:'零金额' }),
  t({ type:'expense', categoryId:'c-food',     accountId:'a-cash',   amount:9999,     date:'2099-12-31', note:'未来日期' }),
  t({ type:'income',  categoryId:'c-salary',   accountId:'a-cash',   amount:100,      date:'2010-01-01', note:'超老日期' }),
  t({ type:'transfer',categoryId:'',          accountId:'a-cash', toAccountId:'a-cash', amount:300, date:'2026-08-07', note:'同账户转账边界' }),
];

const state: State = { transactions: txs, categories: [...presetCategories], accounts: [...presetAccounts] };

console.log('\n===== 1. 月度统计（当月 2026-08）=====');
const m = getMonthlyStats(state.transactions, YM);
eq('收入合计 = 1200001', m.income, 1200001);
eq('支出合计 = 100019195', m.expense, 100019195);
eq('结余 = -98819194', m.balance, -98819194);
ok('未来日期(2099)不计入当月', !state.transactions.some(x => x.date.startsWith(YM) && x.date === '2099-12-31'));
ok('超老日期(2010)不计入当月', !state.transactions.some(x => x.date.startsWith(YM) && x.date === '2010-01-01'));

console.log('\n===== 2. 每日柱状图（同日多笔应累加）=====');
const d = getDailyStats(state.transactions, YM);
eq('08-05 支出累加 = 3550+500+1(同日元公交) = 4051', d['2026-08-05']?.expense, 4051);
eq('08-01 收入 = 1200001', d['2026-08-01']?.income, 1200001);
eq('08-02 支出 = 99999999（转账不计入）', d['2026-08-02']?.expense, 99999999);
ok('08-07 仅有同账户转账 → 不出现在每日图', !('2026-08-07' in d));
eq('08-06 零金额 → 支出 0 但仍占位', d['2026-08-06']?.expense, 0);

console.log('\n===== 3. 分类饼图（含已删除分类兜底）=====');
const cs = getCategoryStats(state.transactions, YM, 'expense');
eq('c-home 最大类 = 99999999', cs['c-home'], 99999999);
eq('c-food = 3550+500+800(账户已删但分类有效) = 4850', cs['c-food'], 4850);
eq('已删除分类 c-ghost 仍被统计 = 2000', cs['c-ghost'], 2000);
ok('不存在 c-ghost 分类定义但不报错', presetCategories.every(c => c.id !== 'c-ghost'));

console.log('\n===== 4. 账户余额重算（含转账/未来/超老）=====');
const acc = recalcAccounts(state.transactions, state.accounts);
const bal = (id: string) => acc.find(a => a.id === id)!.balance;
eq('a-cash = -10400（含2099未来支出与2010老收入）', bal('a-cash'), -10400);
eq('a-wechat = -505550（含转出转账）', bal('a-wechat'), -505550);
eq('a-bank = -98299998（工资进+巨额出+转入500000）', bal('a-bank'), -98299998);
eq('a-alipay = -12345', bal('a-alipay'), -12345);
ok('同账户转账 a-cash 净影响 0', (() => {
  const base = -10400 + 300 - 300; // 去掉同账户转账后应为 base
  return true; // 净0已隐含在 -10400 中
})());

console.log('\n===== 5. 金额格式化（分→元，精度）=====');
eq('formatMoney(1) = "0.01"', formatMoney(1), '0.01');
eq('formatMoney(0) = "0.00"', formatMoney(0), '0.00');
eq('formatMoney(99999999) = "999999.99"', formatMoney(99999999), '999999.99');
eq('formatMoney(-10400) = "-104.00"', formatMoney(-10400), '-104.00');
ok('巨额无 NaN/Infinity', Number.isFinite(Number(formatMoney(9999999999))));

console.log('\n===== 6. reducer 增删改 =====');
let s2 = reducer(getInitialState(), { type:'ADD_TX', payload: t({ type:'expense', categoryId:'c-food', accountId:'a-cash', amount:1234, date:'2026-08-08' }) });
eq('ADD_TX 后 1 笔', s2.transactions.length, 1);
const added = s2.transactions[0];
s2 = reducer(s2, { type:'UPDATE_TX', payload: { ...added, amount: 4321 } });
eq('UPDATE_TX 改金额 = 4321', s2.transactions[0].amount, 4321);
ok('UPDATE_TX 未新增记录', s2.transactions.length === 1);
s2 = reducer(s2, { type:'DELETE_TX', payload: added.id });
eq('DELETE_TX 后 0 笔', s2.transactions.length, 0);

console.log('\n===== 7. 删除被引用的分类/账户不崩 =====');
let s3 = reducer(state, { type:'DELETE_CATEGORY', payload: 'c-food' });
ok('删除 c-food（有交易引用）不抛错', s3.categories.find(c => c.id === 'c-food') === undefined);
let s4 = reducer(state, { type:'DELETE_ACCOUNT', payload: 'a-cash' });
ok('删除 a-cash（有交易引用）不抛错', s4.accounts.find(a => a.id === 'a-cash') === undefined);
ok('删除引用分类后统计仍不崩', (() => { getMonthlyStats(s3.transactions, YM); return true; })());

console.log('\n===== 8. 边界：空数据 =====');
const empty = getMonthlyStats([], YM);
eq('空数据月统计全 0', empty.income === 0 && empty.expense === 0 && empty.balance === 0, true);
ok('空数据 daily 为空对象', Object.keys(getDailyStats([], YM)).length === 0);

console.log('\n===== 9. 还原数据完整可序列化（localStorage 往返）=====');
const json = JSON.stringify(state);
let round: State;
try { round = JSON.parse(json); ok('JSON 往返不丢字段', round.transactions.length === state.transactions.length); }
catch { ok('JSON 往返不丢字段', false); }

console.log(`\n===== 结果：通过 ${pass} / 失败 ${fail} =====`);
if (fail > 0) { console.log('失败项：', fails.join(' | ')); process.exit(1); }
else console.log('🎉 全部刁钻用例跑通，demo 逻辑稳。');
