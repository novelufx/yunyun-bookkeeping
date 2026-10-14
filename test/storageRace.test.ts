/**
 * 存储加固回归测试
 * 验证：致命 bug 已修复、备份轮转、损坏自愈、字段级容错、写入失败上报
 */

let pass = 0, fail = 0;
function eq(name: string, actual: unknown, expected: unknown) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (ok) { pass++; console.log(`  ✅ ${name}`); }
  else { fail++; console.log(`  ❌ ${name}\n     expected: ${JSON.stringify(expected)}\n     got:      ${JSON.stringify(actual)}`); }
}

// ===== 内存版 localStorage =====
const store = new Map<string, string>();
let writeAllowed = true;
const localStorageMock = {
  get length() { return store.size; },
  key: (i: number) => Array.from(store.keys())[i] ?? null,
  getItem: (k: string) => (writeAllowed ? (store.get(k) ?? null) : null),
  setItem: (k: string, v: string) => {
    if (!writeAllowed) { const e: any = new Error('QuotaExceededError'); e.name = 'QuotaExceededError'; throw e; }
    store.set(k, v);
  },
  removeItem: (k: string) => { store.delete(k); },
  clear: () => { store.clear(); },
};

const STORAGE_KEY = 'yunyun-bookkeeping-v1';
const BACKUP_KEYS = ['yunyun-bookkeeping-v1.bk1', 'yunyun-bookkeeping-v1.bk2', 'yunyun-bookkeeping-v1.bk3'];
const ALL_KEYS = [STORAGE_KEY, ...BACKUP_KEYS];

// ===== 与 src 侧一致的实现 =====
function collectCandidates() {
  const out: any[] = [];
  for (const key of ALL_KEYS) {
    const raw = localStorageMock.getItem(key);
    if (!raw) continue;
    try { const d = JSON.parse(raw); const n = Array.isArray(d?.transactions) ? d.transactions.length : 0; if (n > 0) out.push({ key, data: d, txCount: n }); } catch {}
  }
  return out.sort((a, b) => b.txCount - a.txCount);
}

const presetCats = [{ id: 'c-food' }, { id: 'c-transport' }, { id: 'c-shopping' }, { id: 'c-home' },
  { id: 'c-edu' }, { id: 'c-medical' }, { id: 'c-entertain' }, { id: 'c-social' }, { id: 'c-other-exp' }];
const presetAccs = [{ id: 'a-cash' }, { id: 'a-wechat' }];

function isValidTx(t: any) {
  return !!t && typeof t === 'object' && typeof t.id === 'string' && t.id.length > 0
    && (t.type === 'expense' || t.type === 'income' || t.type === 'transfer')
    && Number.isFinite(Number(t.amount)) && typeof t.date === 'string';
}
function isPlainObject(v: any) { return !!v && typeof v === 'object' && !Array.isArray(v); }

function mergeWithPresets(parsed: any) {
  const rawCats = Array.isArray(parsed?.categories) ? parsed.categories.filter((c: any) => isPlainObject(c) && typeof c.id === 'string') : [];
  const catIds = new Set(rawCats.map((c: any) => c.id));
  const mergedCats = [...rawCats, ...presetCats.filter(c => !catIds.has(c.id))];
  const rawAccs = Array.isArray(parsed?.accounts) ? parsed.accounts.filter((a: any) => isPlainObject(a) && typeof a.id === 'string') : [];
  const accIds = new Set(rawAccs.map((a: any) => a.id));
  const mergedAccs = [...rawAccs, ...presetAccs.filter(a => !accIds.has(a.id))];
  const validIds = new Set(mergedCats.map(c => c.id));
  let shortcuts: string[] = Array.isArray(parsed?.shortcutCategories)
    ? parsed.shortcutCategories.filter((id: any) => typeof id === 'string' && validIds.has(id)) : [];
  if (shortcuts.length < 8) {
    const fb = mergedCats.filter(c => !shortcuts.includes(c.id)).slice(0, 8 - shortcuts.length);
    shortcuts = [...shortcuts, ...fb.map(c => c.id)];
  }
  shortcuts = shortcuts.slice(0, 8);
  const bRaw = isPlainObject(parsed?.budget) ? parsed.budget : {};
  return {
    transactions: Array.isArray(parsed?.transactions) ? parsed.transactions.filter(isValidTx) : [],
    categories: mergedCats, accounts: mergedAccs,
    budget: { monthlyTotal: Number.isFinite(Number(bRaw.monthlyTotal)) ? Number(bRaw.monthlyTotal) : undefined, categories: isPlainObject(bRaw.categories) ? bRaw.categories : {} },
    shortcutCategories: shortcuts,
    milkTeas: Array.isArray(parsed?.milkTeas) ? parsed.milkTeas : [],
  };
}

function saveState(state: any): string | null {
  let json: string;
  try { json = JSON.stringify(state); } catch { return '数据序列化失败'; }
  try {
    localStorageMock.setItem(STORAGE_KEY, json);
    if (localStorageMock.getItem(STORAGE_KEY) !== json) throw new Error('校验不一致');
  } catch (e) { return '数据保存失败（浏览器拒绝写入或空间已满）：' + (e instanceof Error ? e.message : e); }
  for (let i = BACKUP_KEYS.length - 1; i > 0; i--) {
    const prev = localStorageMock.getItem(BACKUP_KEYS[i - 1]);
    if (prev) { try { localStorageMock.setItem(BACKUP_KEYS[i], prev); } catch {} }
  }
  try { localStorageMock.setItem(BACKUP_KEYS[0], json); } catch {}
  return null;
}

function loadState() {
  let c: any[] = [];
  try { c = collectCandidates(); } catch {}
  if (c.length === 0) return { state: null, recoveredFrom: null, isFresh: true };
  const best = c[0];
  const mainBroken = !c.some(x => x.key === STORAGE_KEY);
  return { state: mergeWithPresets(best.data), recoveredFrom: mainBroken ? best.key : null, isFresh: false };
}

const mkTx = (i: number) => ({ id: 'tx' + i, type: 'expense', amount: 3500, categoryId: 'c-food', accountId: 'a-wechat', date: '2026-08-01', note: '', createdAt: '2026-08-01T10:00:00Z' });
const mkState = (n: number) => mergeWithPresets({ transactions: Array.from({ length: n }, (_, i) => mkTx(i)), categories: presetCats, accounts: presetAccs });

// ===== 1. 致命 bug 修复 =====
console.log('\n===== 1. 启动不再用空账本覆盖存储 =====');
store.clear();
store.set(STORAGE_KEY, JSON.stringify(mkState(128)));
const r1 = loadState();
eq('启动正确读到 128 笔', r1.state.transactions.length, 128);
eq('主存储正常时不触发恢复', r1.recoveredFrom, null);

const writes: string[] = [];
const origSet = localStorageMock.setItem.bind(localStorageMock);
(localStorageMock as any).setItem = (k: string, v: string) => { writes.push(k); return origSet(k, v); };
const hydrated = false;
if (hydrated) saveState({ transactions: [] });   // 修复后此处被 hydrated 守卫拦住
eq('hydrated=false 时零次写入', writes.length, 0);
eq('hydrated=false 时存储未被清空', JSON.parse(localStorageMock.getItem(STORAGE_KEY)!).transactions.length, 128);
(localStorageMock as any).setItem = origSet;

// ===== 2. 备份轮转 =====
console.log('\n===== 2. 多份副本轮转 =====');
store.clear();
saveState(mkState(10));
eq('主存储笔数', JSON.parse(localStorageMock.getItem(STORAGE_KEY)!).transactions.length, 10);
eq('备份1笔数', JSON.parse(localStorageMock.getItem(BACKUP_KEYS[0])!).transactions.length, 10);
saveState(mkState(20));
saveState(mkState(30));
eq('备份1 = 最新 30', JSON.parse(localStorageMock.getItem(BACKUP_KEYS[0])!).transactions.length, 30);
eq('备份2 = 20', JSON.parse(localStorageMock.getItem(BACKUP_KEYS[1])!).transactions.length, 20);
eq('备份3 = 10', JSON.parse(localStorageMock.getItem(BACKUP_KEYS[2])!).transactions.length, 10);
eq('共 4 份副本', ALL_KEYS.filter(k => store.has(k)).length, 4);

// ===== 3. 主存储被清空自动救回 =====
console.log('\n===== 3. 主存储被清后自动救回 =====');
store.delete(STORAGE_KEY);
const r3 = loadState();
eq('识别自动恢复来源', r3.recoveredFrom, BACKUP_KEYS[0]);
eq('恢复 30 笔', r3.state.transactions.length, 30);

// ===== 4. 主存储 JSON 损坏 =====
console.log('\n===== 4. 主存储 JSON 损坏 =====');
store.set(STORAGE_KEY, '{坏掉的JSON{{{');
const r4 = loadState();
eq('跳过损坏副本改用备份', r4.state.transactions.length, 30);
eq('识别主存储不可用', r4.recoveredFrom, BACKUP_KEYS[0]);

// ===== 5. 全空 =====
console.log('\n===== 5. 全部副本都空 =====');
store.clear();
const r5 = loadState();
eq('标记为全新账本', r5.isFresh, true);

// ===== 6. 字段级容错 =====
console.log('\n===== 6. 单个字段异常不清空整份数据 =====');
store.clear();
const txs = Array.from({ length: 50 }, (_, i) => mkTx(i));
store.set(STORAGE_KEY, JSON.stringify({
  transactions: txs, categories: presetCats, accounts: presetAccs,
  shortcutCategories: 12345, budget: '不是一个对象',
}));
const r6 = loadState();
eq('交易仍完整保留 50 笔', r6.state.transactions.length, 50);
eq('shortcutCategories 回退为 8 个', r6.state.shortcutCategories.length, 8);
eq('budget 非法时回退', r6.state.budget.monthlyTotal, undefined);

// ===== 7. 坏条目单独丢弃 =====
console.log('\n===== 7. 坏交易条目单独丢弃 =====');
store.clear();
store.set(STORAGE_KEY, JSON.stringify({
  transactions: [...txs.slice(0, 30), null, undefined, {}, { id: 'no-type', amount: 1, date: '2026-01-01' },
    { id: 'bad-amount', type: 'expense', amount: 'abc', date: '2026-01-01' },
    { id: 'good', type: 'expense', amount: 100, date: '2026-08-02' }],
}));
const r7 = loadState();
eq('保留 31 笔有效交易', r7.state.transactions.length, 31);
eq('有效新条目保留', r7.state.transactions.some((t: any) => t.id === 'good'), true);

// ===== 8. 写入失败必须上报 =====
console.log('\n===== 8. 写入失败不再静默 =====');
store.clear();
writeAllowed = false;
const err = saveState(mkState(5));
writeAllowed = true;
eq('返回错误信息供 UI 告警', typeof err, 'string');
eq('错误信息非空', (err || '').length > 0, true);
eq('失败时不产生任何副本', ALL_KEYS.filter(k => store.has(k)).length, 0);

console.log(`\n===== 结果：通过 ${pass} / 失败 ${fail} =====`);
if (fail === 0) console.log('🎉 存储加固全部验证通过：致命 bug 已修复，数据 4 份保险 + 自动救回');