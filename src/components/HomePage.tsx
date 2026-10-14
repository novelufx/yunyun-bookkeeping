import { useMemo, useState } from 'react';
import { useStore, getMonthlyStats, getBudgetStatus, formatMoney, presetCategories, exportState, markExported } from '../store.tsx';
import type { Transaction } from '../types';
import CategoryIcon from './CategoryIcon';
import { readMeta, shouldRemindBackup } from '../utils/storageHealth';

interface Props {
  onAdd: (categoryId?: string) => void;
  onOpenBudget: () => void;
  onOpenSettings: () => void;
}

export default function HomePage({ onAdd, onOpenBudget, onOpenSettings }: Props) {
  const { state } = useStore();
  const now = new Date();
  const yearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const monthLabel = `${now.getFullYear()}年${now.getMonth() + 1}月`;

  const [metaTick, setMetaTick] = useState(0);
  const reminder = useMemo(
    () => shouldRemindBackup(readMeta()),
    [state.transactions.length, metaTick],
  );

  const stats = useMemo(() => getMonthlyStats(state.transactions, yearMonth), [state.transactions, yearMonth]);
  const budget = useMemo(() => getBudgetStatus(state, yearMonth), [state, yearMonth]);

  const recentTxs = useMemo(() => state.transactions.slice(0, 10), [state.transactions]);

  const quickCategories = useMemo(() =>
    state.shortcutCategories
      .map(id => state.categories.find(c => c.id === id))
      .filter((c): c is NonNullable<typeof c> => !!c),
    [state.shortcutCategories, state.categories]);

  return (
    <div className="h-full flex flex-col px-4 pt-4 pb-2 overflow-y-auto scrollbar-hide animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-lg font-bold text-gray-800">芸芸的记账本 🎀</h1>
          <p className="text-xs text-pink-400 font-medium">{monthLabel}</p>
        </div>
        <div className="w-10 h-10 rounded-full bg-pink-100 flex items-center justify-center text-lg">
          🐱
        </div>
      </div>

      {/* 备份提醒（静默横幅，不弹窗） */}
      {reminder.needed && state.transactions.length > 0 && (
        <button
          onClick={async () => {
            const d = new Date();
            const stamp = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
            const outcome = await exportBackup(
              exportState(state),
              `yunyun-bookkeeping-${stamp}.json`,
              'application/json'
            );
            markExported();
            setMetaTick(t => t + 1);
            if (outcome === 'failed') {
              alert('导出失败了 😢\n请到「设置 → 账本信息 → 存储详情」里手动复制。');
            } else if (outcome === 'copied') {
              alert('备份内容已复制 💕\n\n请粘贴到「文件传输助手」保存。');
            }
          }}
          className="w-full mb-3 flex items-center gap-2 px-3 py-2.5 rounded-2xl bg-amber-50/85 border border-amber-200/70 active:bg-amber-100 transition-colors text-left"
        >
          <span className="text-sm">💾</span>
          <span className="flex-1 text-[11px] text-amber-700 leading-snug">
            距上次备份已 {reminder.days} 天，点此复制 · 粘贴到文件传输助手
          </span>
          <span className="text-[10px] text-amber-500 font-semibold shrink-0">复制 ›</span>
        </button>
      )}

      {/* Monthly summary card */}
      <div className="glass-strong p-5 mb-4">
        <div className="text-center mb-4">
          <p className="text-xs text-gray-500 mb-1">本月结余</p>
          <p className={`text-3xl font-bold ${stats.balance >= 0 ? 'text-pink-500' : 'text-rose-500'}`}>
            ¥{formatMoney(Math.abs(stats.balance))}
          </p>
        </div>
        <div className="flex items-center justify-around">
          <div className="text-center">
            <p className="text-[10px] text-gray-400 mb-0.5">收入</p>
            <p className="text-sm font-semibold text-pink-500">+¥{formatMoney(stats.income)}</p>
          </div>
          <div className="w-px h-8 bg-pink-100" />
          <div className="text-center">
            <p className="text-[10px] text-gray-400 mb-0.5">支出</p>
            <p className="text-sm font-semibold text-rose-500">-¥{formatMoney(stats.expense)}</p>
          </div>
        </div>
      </div>

      {/* Budget progress */}
      <button onClick={onOpenBudget} className="glass p-3 mb-4 flex items-center gap-3 active:bg-pink-50/60 transition-colors text-left">
        {budget.monthly ? (
          <>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-gray-500">本月预算</span>
                <span className={`text-[10px] font-semibold ${budget.monthly.exceeded ? 'text-rose-500' : 'text-pink-500'}`}>
                  {formatMoney(budget.monthly.used)} / {formatMoney(budget.monthly.limit)}
                </span>
              </div>
              <div className="h-2 rounded-full bg-pink-100 overflow-hidden">
                <div
                  className={`h-full rounded-full ${budget.monthly.exceeded ? 'bg-rose-400' : 'bg-pink-400'}`}
                  style={{ width: `${budget.monthly.pct}%` }}
                />
              </div>
            </div>
            <span className="text-[10px] text-pink-400 shrink-0">管理 ›</span>
          </>
        ) : (
          <>
            <span className="text-2xl">💰</span>
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-700">设置月度预算</p>
              <p className="text-[10px] text-gray-400">超支会温柔提醒你～</p>
            </div>
            <span className="text-[10px] text-pink-400 shrink-0">去设置 ›</span>
          </>
        )}
      </button>

      {/* Quick categories */}
      <div className="mb-3">
        <p className="text-xs text-gray-500 font-medium mb-2 ml-1">快捷记账</p>
        <div className="grid grid-cols-4 gap-2">
          {quickCategories.map(cat => (
            <button key={cat.id} onClick={() => onAdd(cat.id)} className="cat-chip">
              <CategoryIcon category={cat} />
              <span className="label">{cat.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Recent transactions */}
      <div className="flex-1 min-h-0">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs text-gray-500 font-medium ml-1">最近明细</p>
          {recentTxs.length > 0 && (
            <span className="text-[10px] text-gray-400">最近 {recentTxs.length} 笔</span>
          )}
        </div>

        {recentTxs.length === 0 ? (
          <div className="glass p-6 text-center">
            <p className="text-3xl mb-2">🐾</p>
            <p className="text-sm text-gray-500">还没有记账哦</p>
            <p className="text-xs text-gray-400 mt-1">点击右下角 + 开始记录第一笔~</p>
          </div>
        ) : (
          <div className="space-y-2 pb-2">
            {recentTxs.map(tx => (
              <TxRow key={tx.id} tx={tx} categories={state.categories} accounts={state.accounts} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function TxRow({ tx, categories, accounts }: { tx: Transaction; categories: typeof presetCategories; accounts: any[] }) {
  const cat = categories.find(c => c.id === tx.categoryId);
  const acc = accounts.find(a => a.id === tx.accountId);
  const isExp = tx.type === 'expense';
  const isInc = tx.type === 'income';
  return (
    <div className="tx-item">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-pink-50 flex items-center justify-center">
          <CategoryIcon category={cat} fallback="📝" className="text-lg" />
        </div>
        <div>
          <p className="text-sm font-medium text-gray-800">{cat?.name || '其他'}{tx.note ? ` · ${tx.note}` : ''}</p>
          <p className="text-[10px] text-gray-400">{tx.date} · {acc?.name || ''}</p>
        </div>
      </div>
      <p className={`text-sm font-bold ${isExp ? 'text-rose-500' : isInc ? 'text-pink-500' : 'text-gray-500'}`}>
        {isExp ? '-' : isInc ? '+' : ''}¥{formatMoney(tx.amount)}
      </p>
    </div>
  );
}
