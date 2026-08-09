import { getBudgetStatus, presetCategories, presetAccounts } from '../src/store';
import type { State } from '../src/store';

let pass = 0, fail = 0;
function eq(label: string, got: any, want: any) {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (ok) pass++;
  else { fail++; console.log(`✗ ${label}\n    got:  ${JSON.stringify(got)}\n    want: ${JSON.stringify(want)}`); }
}

const state: State = {
  transactions: [
    { id: '1', type: 'expense', amount: 400000, categoryId: 'c-food', accountId: 'a-cash', date: '2026-08-01', note: '', createdAt: '' },
    { id: '2', type: 'expense', amount: 100000, categoryId: 'c-shopping', accountId: 'a-cash', date: '2026-08-02', note: '', createdAt: '' },
    { id: '3', type: 'income', amount: 1200000, categoryId: 'c-salary', accountId: 'a-cash', date: '2026-08-03', note: '', createdAt: '' },
  ],
  categories: presetCategories,
  accounts: presetAccounts,
  budget: { monthlyTotal: 300000, categories: { 'c-food': 5000, 'c-shopping': 200000 } },
};

const bs = getBudgetStatus(state, '2026-08');

eq('月预算已设', !!bs.monthly, true);
eq('月支出 = 500000', bs.monthly!.used, 500000);
eq('月预算 = 300000', bs.monthly!.limit, 300000);
eq('月预算超支', bs.monthly!.exceeded, true);
eq('月预算剩余为负', bs.monthly!.remain, -200000);
eq('仅 c-food 超分类预算', bs.cats.length, 1);
eq('超支分类 = c-food', bs.cats[0]?.catId, 'c-food');
eq('c-shopping 未进提醒(未超80%)', bs.cats.some(c => c.catId === 'c-shopping'), false);

// 未设预算时 monthly 为 null
const bs2 = getBudgetStatus({ ...state, budget: { monthlyTotal: undefined, categories: {} } }, '2026-08');
eq('未设月预算 → monthly null', bs2.monthly, null);
eq('未设预算 → cats 空', bs2.cats.length, 0);

console.log(`\n预算逻辑测试：${pass} 通过 / ${fail} 失败`);
if (fail > 0) process.exit(1);
