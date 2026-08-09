import { createContext, useContext, useReducer, useEffect, type ReactNode } from 'react';
import type { Transaction, Category, Account, TxType, Budget } from './types';

const STORAGE_KEY = 'yunyun-bookkeeping-v1';

export const presetCategories: Category[] = [
  { id: 'c-food', name: '餐饮', type: 'expense', icon: '🍱', sort: 0 },
  { id: 'c-transport', name: '交通', type: 'expense', icon: '🚗', sort: 1 },
  { id: 'c-shopping', name: '购物', type: 'expense', icon: '🛍️', sort: 2 },
  { id: 'c-home', name: '居住', type: 'expense', icon: '🏠', sort: 3 },
  { id: 'c-edu', name: '教育', type: 'expense', icon: '📚', sort: 4 },
  { id: 'c-medical', name: '医疗', type: 'expense', icon: '💊', sort: 5 },
  { id: 'c-entertain', name: '娱乐', type: 'expense', icon: '🎮', sort: 6 },
  { id: 'c-social', name: '人情', type: 'expense', icon: '🎁', sort: 7 },
  { id: 'c-other-exp', name: '其他', type: 'expense', icon: '📝', sort: 8 },
  { id: 'c-salary', name: '工资', type: 'income', icon: '💰', sort: 9 },
  { id: 'c-parttime', name: '兼职', type: 'income', icon: '💼', sort: 10 },
  { id: 'c-refund', name: '退款', type: 'income', icon: '↩️', sort: 11 },
  { id: 'c-other-inc', name: '其他', type: 'income', icon: '✨', sort: 12 },
];

export const presetAccounts: Account[] = [
  { id: 'a-cash', name: '现金', type: 'cash', icon: '💵', balance: 0, initialBalance: 0, sort: 0 },
  { id: 'a-wechat', name: '微信', type: 'wechat', icon: '💬', balance: 0, initialBalance: 0, sort: 1 },
  { id: 'a-alipay', name: '支付宝', type: 'alipay', icon: '🔵', balance: 0, initialBalance: 0, sort: 2 },
  { id: 'a-bank', name: '银行卡', type: 'bank', icon: '💳', balance: 0, initialBalance: 0, sort: 3 },
];

interface State {
  transactions: Transaction[];
  categories: Category[];
  accounts: Account[];
  budget: Budget;
}

type Action =
  | { type: 'LOAD'; payload: State }
  | { type: 'ADD_TX'; payload: Transaction }
  | { type: 'UPDATE_TX'; payload: Transaction }
  | { type: 'DELETE_TX'; payload: string }
  | { type: 'IMPORT_TX'; payload: Transaction[] }
  | { type: 'ADD_CATEGORY'; payload: Category }
  | { type: 'DELETE_CATEGORY'; payload: string }
  | { type: 'ADD_ACCOUNT'; payload: Account }
  | { type: 'UPDATE_ACCOUNT'; payload: Account }
  | { type: 'DELETE_ACCOUNT'; payload: string }
  | { type: 'SET_BUDGET'; payload: Budget }
  | { type: 'RESET' };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'LOAD':
      return action.payload;
    case 'ADD_TX':
      return { ...state, transactions: [action.payload, ...state.transactions] };
    case 'UPDATE_TX': {
      const txs = state.transactions.map(t => t.id === action.payload.id ? action.payload : t);
      return { ...state, transactions: txs };
    }
    case 'DELETE_TX':
      return { ...state, transactions: state.transactions.filter(t => t.id !== action.payload) };
    case 'IMPORT_TX': {
      // 去重：跳过与现有交易完全一致的（日期+类型+金额+分类+账户+备注）
      const exist = new Set(state.transactions.map(t =>
        `${t.date}|${t.type}|${t.amount}|${t.categoryId}|${t.accountId}|${t.note}`));
      const fresh = action.payload.filter(t => !exist.has(`${t.date}|${t.type}|${t.amount}|${t.categoryId}|${t.accountId}|${t.note}`));
      return { ...state, transactions: [...fresh, ...state.transactions] };
    }
    case 'ADD_CATEGORY':
      return { ...state, categories: [...state.categories, action.payload] };
    case 'DELETE_CATEGORY': {
      const categories = state.categories.filter(c => c.id !== action.payload);
      const restCats = { ...state.budget.categories };
      delete restCats[action.payload];
      return { ...state, categories, budget: { ...state.budget, categories: restCats } };
    }
    case 'ADD_ACCOUNT':
      return { ...state, accounts: [...state.accounts, action.payload] };
    case 'UPDATE_ACCOUNT':
      return { ...state, accounts: state.accounts.map(a => a.id === action.payload.id ? action.payload : a) };
    case 'DELETE_ACCOUNT':
      return { ...state, accounts: state.accounts.filter(a => a.id !== action.payload) };
    case 'SET_BUDGET':
      return { ...state, budget: action.payload };
    case 'RESET':
      return getInitialState();
    default:
      return state;
  }
}

function getInitialState(): State {
  return {
    transactions: [],
    categories: [...presetCategories],
    accounts: [...presetAccounts],
    budget: { monthlyTotal: undefined, categories: {} },
  };
}

function loadState(): State {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      return mergeWithPresets(JSON.parse(raw) as Partial<State>);
    }
  } catch {
    // ignore
  }
  return getInitialState();
}

// 与预设分类/账户合并，确保即使旧备份缺少某项也不会缺字段
export function mergeWithPresets(parsed: Partial<State>): State {
  const catIds = new Set((parsed.categories || []).map(c => c.id));
  const mergedCats = [...(parsed.categories || []), ...presetCategories.filter(c => !catIds.has(c.id))];
  const accIds = new Set((parsed.accounts || []).map(a => a.id));
  const mergedAccs = [...(parsed.accounts || []), ...presetAccounts.filter(a => !accIds.has(a.id))];
  return {
    transactions: parsed.transactions || [],
    categories: mergedCats,
    accounts: mergedAccs,
    budget: parsed.budget || { monthlyTotal: undefined, categories: {} },
  };
}

function saveState(state: State) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // ignore
  }
}

const StoreContext = createContext<{ state: State; dispatch: React.Dispatch<Action> } | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, getInitialState());

  useEffect(() => {
    const saved = loadState();
    dispatch({ type: 'LOAD', payload: saved });
  }, []);

  useEffect(() => {
    saveState(state);
  }, [state]);

  return (
    <StoreContext.Provider value={{ state, dispatch }}>
      {children}
    </StoreContext.Provider>
  );
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be inside StoreProvider');
  return ctx;
}

export function getMonthlyStats(transactions: Transaction[], yearMonth: string) {
  const monthTxs = transactions.filter(t => t.date.startsWith(yearMonth) && t.type !== 'transfer');
  const income = monthTxs.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const expense = monthTxs.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  return { income, expense, balance: income - expense };
}

export function getDailyStats(transactions: Transaction[], yearMonth: string) {
  const days: Record<string, { income: number; expense: number }> = {};
  transactions
    .filter(t => t.date.startsWith(yearMonth) && t.type !== 'transfer')
    .forEach(t => {
      if (!days[t.date]) days[t.date] = { income: 0, expense: 0 };
      days[t.date][t.type as 'income' | 'expense'] += t.amount;
    });
  return days;
}

export function getCategoryStats(transactions: Transaction[], yearMonth: string, txType: TxType) {
  const map: Record<string, number> = {};
  transactions
    .filter(t => t.date.startsWith(yearMonth) && t.type === txType)
    .forEach(t => {
      map[t.categoryId] = (map[t.categoryId] || 0) + t.amount;
    });
  return map;
}

export function recalcAccounts(transactions: Transaction[], accounts: Account[]): Account[] {
  return accounts.map(acc => {
    let balance = acc.initialBalance;
    transactions.forEach(t => {
      if (t.type === 'expense' && t.accountId === acc.id) balance -= t.amount;
      if (t.type === 'income' && t.accountId === acc.id) balance += t.amount;
      if (t.type === 'transfer') {
        if (t.accountId === acc.id) balance -= t.amount;
        if (t.toAccountId === acc.id) balance += t.amount;
      }
    });
    return { ...acc, balance };
  });
}

export function formatMoney(cents: number): string {
  return (cents / 100).toFixed(2);
}

export function genId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

export interface BudgetMonthlyStatus {
  limit: number;
  used: number;
  remain: number;
  pct: number;
  exceeded: boolean;
}
export interface BudgetCatStatus {
  catId: string;
  name: string;
  limit: number;
  used: number;
  remain: number;
  pct: number;
}
export interface BudgetStatus {
  monthly: BudgetMonthlyStatus | null;
  cats: BudgetCatStatus[];
}

export function getBudgetStatus(state: State, yearMonth: string): BudgetStatus {
  const { budget } = state;
  const stats = getMonthlyStats(state.transactions, yearMonth);
  const result: BudgetStatus = { monthly: null, cats: [] };

  if (budget.monthlyTotal && budget.monthlyTotal > 0) {
    const limit = budget.monthlyTotal;
    const used = stats.expense;
    result.monthly = {
      limit,
      used,
      remain: limit - used,
      pct: Math.min(100, limit > 0 ? (used / limit) * 100 : 0),
      exceeded: used > limit,
    };
  }

  const catStats = getCategoryStats(state.transactions, yearMonth, 'expense');
  for (const [catId, limitRaw] of Object.entries(budget.categories)) {
    const limit = limitRaw || 0;
    if (limit <= 0) continue;
    const used = catStats[catId] || 0;
    if (used > 0) {
      result.cats.push({
        catId,
        name: state.categories.find(c => c.id === catId)?.name || '其他',
        limit,
        used,
        remain: limit - used,
        pct: Math.min(100, (used / limit) * 100),
      });
    }
  }
  // 仅保留超支或接近（>80%）的分类，按使用额降序
  result.cats = result.cats
    .filter(c => c.used > c.limit * 0.8)
    .sort((a, b) => b.used - a.used);

  return result;
}

export function exportState(state: State): string {
  return JSON.stringify({
    transactions: state.transactions,
    categories: state.categories,
    accounts: state.accounts,
    budget: state.budget,
    _app: 'yunyun-bookkeeping',
    _exportedAt: new Date().toISOString(),
  }, null, 2);
}
