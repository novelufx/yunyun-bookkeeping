import { createContext, useContext, useReducer, useEffect, useState, type ReactNode } from 'react';
import type { Transaction, Category, Account, TxType, Budget, MilkTeaEntry } from './types';
import {
  STORAGE_KEY, BACKUP_KEYS, ALL_KEYS, collectCandidates, writeMeta,
} from './utils/storageHealth';

export { STORAGE_KEY, BACKUP_KEYS };

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
  shortcutCategories: string[];
  milkTeas: MilkTeaEntry[];
}

type Action =
  | { type: 'LOAD'; payload: State }
  | { type: 'ADD_TX'; payload: Transaction }
  | { type: 'UPDATE_TX'; payload: Transaction }
  | { type: 'DELETE_TX'; payload: string }
  | { type: 'IMPORT_TX'; payload: Transaction[] }
  | { type: 'ADD_CATEGORY'; payload: Category }
  | { type: 'UPDATE_CATEGORY'; payload: Category }
  | { type: 'DELETE_CATEGORY'; payload: string }
  | { type: 'ADD_ACCOUNT'; payload: Account }
  | { type: 'UPDATE_ACCOUNT'; payload: Account }
  | { type: 'DELETE_ACCOUNT'; payload: string }
  | { type: 'SET_BUDGET'; payload: Budget }
  | { type: 'SET_SHORTCUTS'; payload: string[] }
  | { type: 'ADD_MILKTEA'; payload: MilkTeaEntry }
  | { type: 'EDIT_MILKTEA'; payload: MilkTeaEntry }
  | { type: 'DELETE_MILKTEA'; payload: string }
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
    case 'UPDATE_CATEGORY':
      return { ...state, categories: state.categories.map(c => c.id === action.payload.id ? action.payload : c) };
    case 'DELETE_CATEGORY': {
      const categories = state.categories.filter(c => c.id !== action.payload);
      const restCats = { ...state.budget.categories };
      delete restCats[action.payload];
      const shortcutCategories = state.shortcutCategories.filter(id => id !== action.payload);
      return { ...state, categories, budget: { ...state.budget, categories: restCats }, shortcutCategories };
    }
    case 'ADD_ACCOUNT':
      return { ...state, accounts: [...state.accounts, action.payload] };
    case 'UPDATE_ACCOUNT':
      return { ...state, accounts: state.accounts.map(a => a.id === action.payload.id ? action.payload : a) };
    case 'DELETE_ACCOUNT':
      return { ...state, accounts: state.accounts.filter(a => a.id !== action.payload) };
    case 'SET_BUDGET':
      return { ...state, budget: action.payload };
    case 'SET_SHORTCUTS':
      return { ...state, shortcutCategories: action.payload };
    case 'ADD_MILKTEA':
      return { ...state, milkTeas: [action.payload, ...state.milkTeas] };
    case 'EDIT_MILKTEA':
      return { ...state, milkTeas: state.milkTeas.map(m => m.id === action.payload.id ? action.payload : m) };
    case 'DELETE_MILKTEA':
      return { ...state, milkTeas: state.milkTeas.filter(m => m.id !== action.payload) };
    case 'RESET':
      return getInitialState();
    default:
      return state;
  }
}

function getInitialState(): State {
  const defaultShortcuts = presetCategories.filter(c => c.type === 'expense').slice(0, 8).map(c => c.id);
  return {
    transactions: [],
    categories: [...presetCategories],
    accounts: [...presetAccounts],
    budget: { monthlyTotal: undefined, categories: {} },
    shortcutCategories: defaultShortcuts,
    milkTeas: [],
  };
}

// ---------- 单条数据合法性校验（坏条目单独丢弃，绝不整体回退空账本） ----------
function isValidTx(t: any): t is Transaction {
  return !!t && typeof t === 'object'
    && typeof t.id === 'string' && t.id.length > 0
    && (t.type === 'expense' || t.type === 'income' || t.type === 'transfer')
    && Number.isFinite(Number(t.amount))
    && typeof t.date === 'string';
}
function isValidTea(m: any): m is MilkTeaEntry {
  return !!m && typeof m === 'object'
    && typeof m.id === 'string' && m.id.length > 0
    && typeof m.date === 'string' && typeof m.brand === 'string';
}
function isPlainObject(v: any): v is Record<string, any> {
  return !!v && typeof v === 'object' && !Array.isArray(v);
}

// 与预设分类/账户合并，确保即使旧备份缺少某项也不会缺字段
export function mergeWithPresets(parsed: any): State {
  const rawCats = Array.isArray(parsed?.categories) ? parsed.categories.filter((c: any) => isPlainObject(c) && typeof c.id === 'string') : [];
  const catIds = new Set(rawCats.map((c: any) => c.id));
  const mergedCats = [...rawCats, ...presetCategories.filter(c => !catIds.has(c.id))];

  const rawAccs = Array.isArray(parsed?.accounts) ? parsed.accounts.filter((a: any) => isPlainObject(a) && typeof a.id === 'string') : [];
  const accIds = new Set(rawAccs.map((a: any) => a.id));
  const mergedAccs = [...rawAccs, ...presetAccounts.filter(a => !accIds.has(a.id))];

  // 快捷分类：非数组一律当空处理，绝不 .filter 抛错导致整份数据丢失
  const validIds = new Set(mergedCats.map(c => c.id));
  let shortcuts: string[] = Array.isArray(parsed?.shortcutCategories)
    ? parsed.shortcutCategories.filter((id: any) => typeof id === 'string' && validIds.has(id))
    : [];
  if (shortcuts.length < 8) {
    const fallback = mergedCats.filter(c => c.type === 'expense' && !shortcuts.includes(c.id)).slice(0, 8 - shortcuts.length);
    shortcuts = [...shortcuts, ...fallback.map(c => c.id)];
  }
  shortcuts = shortcuts.slice(0, 8);

  const budgetRaw = isPlainObject(parsed?.budget) ? parsed.budget : {};
  const budgetCats = isPlainObject(budgetRaw.categories) ? budgetRaw.categories : {};
  const safeBudgetCats: Record<string, number> = {};
  for (const [k, v] of Object.entries(budgetCats)) {
    const n = Number(v);
    if (typeof k === 'string' && Number.isFinite(n)) safeBudgetCats[k] = n;
  }

  return {
    transactions: Array.isArray(parsed?.transactions) ? parsed.transactions.filter(isValidTx) : [],
    categories: mergedCats,
    accounts: mergedAccs,
    budget: { monthlyTotal: Number.isFinite(Number(budgetRaw.monthlyTotal)) ? Number(budgetRaw.monthlyTotal) : undefined, categories: safeBudgetCats },
    shortcutCategories: shortcuts,
    milkTeas: Array.isArray(parsed?.milkTeas) ? parsed.milkTeas.filter(isValidTea) : [],
  };
}

export interface LoadResult {
  state: State;
  /** 非 null 表示主存储不可用/为空，已自动从该备份副本恢复 */
  recoveredFrom: string | null;
  /** 所有副本都没有数据 */
  isFresh: boolean;
}

export function loadState(): LoadResult {
  let candidates: ReturnType<typeof collectCandidates> = [];
  try {
    candidates = collectCandidates();
  } catch {
    // 存储不可访问（隐私模式/被禁用）时静默降级
  }
  if (candidates.length === 0) {
    // 可能主存储存在但损坏/为空 —— 直接回初始态，不做任何写入
    return { state: getInitialState(), recoveredFrom: null, isFresh: true };
  }
  const best = candidates[0];
  const mainBroken = !candidates.some(c => c.key === STORAGE_KEY);
  return {
    state: mergeWithPresets(best.data),
    recoveredFrom: mainBroken ? best.key : null,
    isFresh: false,
  };
}

let storageErrorMsg: string | null = null;
export function getStorageError() { return storageErrorMsg; }

/** 轮转备份：bk3←bk2, bk2←bk1, bk1←本次 */
function rotateBackup(json: string) {
  for (let i = BACKUP_KEYS.length - 1; i > 0; i--) {
    let prev: string | null = null;
    try { prev = localStorage.getItem(BACKUP_KEYS[i - 1]); } catch { /* ignore */ }
    if (prev) { try { localStorage.setItem(BACKUP_KEYS[i], prev); } catch { /* ignore */ } }
  }
  try { localStorage.setItem(BACKUP_KEYS[0], json); } catch { /* ignore */ }
}

/**
 * 写入主存储 + 轮转备份。
 * 返回 null 表示成功，否则返回错误信息（供 UI 告警，不再静默失败）。
 */
export function saveState(state: State): string | null {
  let json: string;
  try {
    json = JSON.stringify(state);
  } catch (e) {
    storageErrorMsg = '数据序列化失败：' + (e instanceof Error ? e.message : e);
    return storageErrorMsg;
  }
  try {
    localStorage.setItem(STORAGE_KEY, json);
    if (localStorage.getItem(STORAGE_KEY) !== json) {
      throw new Error('写入校验不一致');
    }
    storageErrorMsg = null;
  } catch (e) {
    storageErrorMsg = '数据保存失败（浏览器拒绝写入或空间已满）：'
      + (e instanceof Error ? e.message : e);
    return storageErrorMsg;
  }
  rotateBackup(json);
  return null;
}

export interface StoreHealth {
  /** 本次启动是否从备份自动恢复 */
  recoveredFrom: string | null;
  /** 全部副本都没数据（首次使用或容器被清空） */
  isFresh: boolean;
  /** 最近一次写入失败信息 */
  writeError: string | null;
}

const StoreContext = createContext<{
  state: State;
  dispatch: React.Dispatch<Action>;
  health: StoreHealth;
} | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, getInitialState());
  // ★ 关键：数据读取完成前，禁止任何写入。
  //   否则挂载时会用初始空账本覆盖 localStorage，窗口期内 WebView 被销毁即永久丢数据。
  const [hydrated, setHydrated] = useState(false);
  const [health, setHealth] = useState<StoreHealth>({ recoveredFrom: null, isFresh: false, writeError: null });

  useEffect(() => {
    const { state: saved, recoveredFrom, isFresh } = loadState();
    dispatch({ type: 'LOAD', payload: saved });
    setHydrated(true);
    setHealth({ recoveredFrom, isFresh, writeError: getStorageError() });
  }, []);

  useEffect(() => {
    if (!hydrated) return; // ★ 本次事故的根因修复
    const err = saveState(state);
    setHealth(h => (h.writeError === err ? h : { ...h, writeError: err }));
  }, [state, hydrated]);

  return (
    <StoreContext.Provider value={{ state, dispatch, health }}>
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
    shortcutCategories: state.shortcutCategories,
    milkTeas: state.milkTeas,
    _app: 'yunyun-bookkeeping',
    _version: 2,
    _exportedAt: new Date().toISOString(),
  }, null, 2);
}

function csvCell(v: any): string {
  const s = String(v ?? '');
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** 导出 CSV（UTF-8 BOM，微信/Excel 直接打开不乱码） */
export function exportCsv(state: State): string {
  const catName = (id: string) => state.categories.find(c => c.id === id)?.name || '其他';
  const accName = (id: string) => state.accounts.find(a => a.id === id)?.name || '';
  const typeName = (t: TxType) => (t === 'expense' ? '支出' : t === 'income' ? '收入' : '转账');

  const lines: string[] = [];
  lines.push(['日期', '类型', '分类', '金额(元)', '账户', '转入账户', '备注'].map(csvCell).join(','));

  const sorted = [...state.transactions].sort((a, b) => a.date.localeCompare(b.date));
  for (const t of sorted) {
    lines.push([
      t.date,
      typeName(t.type),
      t.type === 'transfer' ? '转账' : catName(t.categoryId),
      (t.amount / 100).toFixed(2),
      accName(t.accountId),
      t.type === 'transfer' ? accName(t.toAccountId || '') : '',
      t.note || '',
    ].map(csvCell).join(','));
  }
  if (state.milkTeas.length > 0) {
    lines.push('');
    lines.push(['—— 奶茶记录 ——'].join(','));
    lines.push(['日期', '品牌', '价格(元)', '糖度', '冰度', '备注'].map(csvCell).join(','));
    for (const m of [...state.milkTeas].sort((a, b) => a.date.localeCompare(b.date))) {
      lines.push([m.date, m.brand, (m.price / 100).toFixed(2), m.sugar || '', m.ice || '', m.note || ''].map(csvCell).join(','));
    }
  }
  return '\uFEFF' + lines.join('\r\n');
}

/** 记录一次导出，用于备份提醒 */
export function markExported() {
  try { writeMeta({ lastExportAt: Date.now() }); } catch { /* ignore */ }
}
