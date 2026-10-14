/**
 * 存储健康工具：指纹、备份副本自检、导出时间追踪
 * 独立于 store，便于测试与复用。
 */

export const STORAGE_KEY = 'yunyun-bookkeeping-v1';
export const BACKUP_KEYS = [
  'yunyun-bookkeeping-v1.bk1',
  'yunyun-bookkeeping-v1.bk2',
  'yunyun-bookkeeping-v1.bk3',
];
export const META_KEY = 'yunyun-bookkeeping-meta';
export const ALL_KEYS = [STORAGE_KEY, ...BACKUP_KEYS];

export interface Fingerprint {
  txCount: number;
  income: number;
  expense: number;
  firstDate: string;
  lastDate: string;
  teaCount: number;
}

export function fingerprintOf(data: {
  transactions?: any[];
  milkTeas?: any[];
}): Fingerprint {
  const txs = Array.isArray(data.transactions) ? data.transactions : [];
  const teas = Array.isArray(data.milkTeas) ? data.milkTeas : [];
  let income = 0, expense = 0;
  let firstDate = '', lastDate = '';
  for (const t of txs) {
    const amt = Number(t?.amount) || 0;
    if (t?.type === 'income') income += amt;
    else if (t?.type === 'expense') expense += amt;
    const d = typeof t?.date === 'string' ? t.date : '';
    if (d) {
      if (!firstDate || d < firstDate) firstDate = d;
      if (!lastDate || d > lastDate) lastDate = d;
    }
  }
  return { txCount: txs.length, income, expense, firstDate, lastDate, teaCount: teas.length };
}

export interface SlotInfo {
  key: string;
  label: string;
  exists: boolean;
  bytes: number;
  txCount: number;
  healthy: boolean;
}

export const SLOT_LABELS: Record<string, string> = {
  [STORAGE_KEY]: '主存储',
  'yunyun-bookkeeping-v1.bk1': '备份 1（最新）',
  'yunyun-bookkeeping-v1.bk2': '备份 2',
  'yunyun-bookkeeping-v1.bk3': '备份 3（最久）',
};

/** 读取全部副本状态 */
export function inspectSlots(storage: Storage = localStorage): SlotInfo[] {
  return ALL_KEYS.map(key => {
    let raw: string | null = null;
    try { raw = storage.getItem(key); } catch { /* ignore */ }
    if (!raw) {
      return { key, label: SLOT_LABELS[key] || key, exists: false, bytes: 0, txCount: 0, healthy: false };
    }
    let txCount = 0;
    let healthy = true;
    try {
      const parsed = JSON.parse(raw);
      txCount = Array.isArray(parsed?.transactions) ? parsed.transactions.length : 0;
    } catch {
      healthy = false;
    }
    return { key, label: SLOT_LABELS[key] || key, exists: true, bytes: raw.length, txCount, healthy };
  });
}

export interface Candidate {
  key: string;
  data: any;
  txCount: number;
}

/** 收集所有可解析且有账目的副本，按交易数降序 */
export function collectCandidates(storage: Storage = localStorage): Candidate[] {
  const out: Candidate[] = [];
  for (const key of ALL_KEYS) {
    let raw: string | null = null;
    try { raw = storage.getItem(key); } catch { continue; }
    if (!raw) continue;
    try {
      const data = JSON.parse(raw);
      const n = Array.isArray(data?.transactions) ? data.transactions.length : 0;
      if (n > 0) out.push({ key, data, txCount: n });
    } catch { /* 损坏的副本跳过，继续用其他副本 */ }
  }
  return out.sort((a, b) => b.txCount - a.txCount);
}

export interface Meta {
  lastExportAt?: number;
  dismissedBannerUntil?: number;
}

export function readMeta(storage: Storage = localStorage): Meta {
  try {
    const raw = storage.getItem(META_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function writeMeta(patch: Meta, storage: Storage = localStorage): void {
  try {
    const next = { ...readMeta(storage), ...patch };
    storage.setItem(META_KEY, JSON.stringify(next));
  } catch { /* ignore */ }
}

export const BACKUP_REMIND_DAYS = 14;

export interface BackupReminder {
  needed: boolean;
  days: number;
}

/** 是否需要提醒备份：超过 N 天未导出，或从未导出 */
export function shouldRemindBackup(meta: Meta, now: number = Date.now()): BackupReminder {
  const last = meta.lastExportAt || 0;
  const days = Math.floor((now - last) / 86400000);
  return { needed: days >= BACKUP_REMIND_DAYS, days };
}

/** 估算 localStorage 已用/总量（浏览器配额通常 5MB） */
export function estimateUsage(storage: Storage = localStorage): { usedBytes: number; totalBytes: number } {
  let used = 0;
  try {
    for (let i = 0; i < storage.length; i++) {
      const k = storage.key(i);
      if (k) used += (storage.getItem(k) || '').length + k.length;
    }
  } catch { /* ignore */ }
  return { usedBytes: used, totalBytes: 5 * 1024 * 1024 };
}

export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(2)} MB`;
}