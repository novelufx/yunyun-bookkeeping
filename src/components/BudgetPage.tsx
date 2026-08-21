import { useState, useMemo } from 'react';
import { ChevronLeft, Wallet } from 'lucide-react';
import { useStore, getBudgetStatus, getCategoryStats, formatMoney } from '../store.tsx';
import CategoryIcon from './CategoryIcon';

interface Props {
  onBack: () => void;
}

export default function BudgetPage({ onBack }: Props) {
  const { state, dispatch } = useStore();
  const now = new Date();
  const yearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const monthLabel = `${now.getFullYear()}年${now.getMonth() + 1}月`;

  const [monthly, setMonthly] = useState(
    state.budget.monthlyTotal ? (state.budget.monthlyTotal / 100).toString() : ''
  );
  const [cats, setCats] = useState<Record<string, string>>(
    Object.fromEntries(
      Object.entries(state.budget.categories).map(([k, v]) => [k, (v / 100).toString()])
    )
  );

  const expenseCats = state.categories.filter(c => c.type === 'expense');
  const status = getBudgetStatus(state, yearMonth);
  const catUsed = useMemo(
    () => getCategoryStats(state.transactions, yearMonth, 'expense'),
    [state.transactions, yearMonth]
  );

  const handleSave = () => {
    const mt = parseFloat(monthly);
    const newBudget = {
      monthlyTotal: monthly.trim() === '' || isNaN(mt) || mt <= 0 ? undefined : Math.round(mt * 100),
      categories: Object.fromEntries(
        Object.entries(cats)
          .map(([k, v]): [string, number] => {
            const n = parseFloat(v);
            return [k, isNaN(n) || n <= 0 ? 0 : Math.round(n * 100)];
          })
          .filter(([, v]) => v > 0)
      ) as Record<string, number>,
    };
    dispatch({ type: 'SET_BUDGET', payload: newBudget });
    onBack();
  };

  return (
    <div className="absolute inset-0 z-40 flex flex-col bg-pink-50/95 backdrop-blur-xl animate-slide-up">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 pt-4 pb-2">
        <button onClick={onBack} className="p-2 rounded-xl bg-white/85 border border-pink-200/70 active:bg-pink-50 transition-colors">
          <ChevronLeft size={20} className="text-gray-500" />
        </button>
        <p className="text-sm font-bold text-gray-700">预算管理 💰</p>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-hide px-4 pb-4">
        {/* Monthly budget overview */}
        <div className="glass-strong p-4 mb-3">
          <p className="text-xs font-bold text-gray-700 mb-3">{monthLabel} · 月度预算</p>
          {status.monthly ? (
            <>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs text-gray-500">已用 ¥{formatMoney(status.monthly.used)}</span>
                <span className={`text-xs font-semibold ${status.monthly.exceeded ? 'text-rose-500' : 'text-pink-500'}`}>
                  预算 ¥{formatMoney(status.monthly.limit)}
                </span>
              </div>
              <div className="h-2.5 rounded-full bg-pink-100 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${status.monthly.exceeded ? 'bg-rose-400' : 'bg-pink-400'}`}
                  style={{ width: `${status.monthly.pct}%` }}
                />
              </div>
              <p className={`text-[10px] mt-1.5 ${status.monthly.exceeded ? 'text-rose-500' : 'text-gray-400'}`}>
                {status.monthly.exceeded
                  ? `已超支 ¥${formatMoney(Math.abs(status.monthly.remain))} 😣`
                  : `还剩 ¥${formatMoney(status.monthly.remain)}`}
              </p>
            </>
          ) : (
            <p className="text-xs text-gray-400 mb-3">尚未设置月度预算</p>
          )}

          <div className="flex items-center gap-2 p-2.5 rounded-2xl bg-white/85 border border-pink-200/60">
            <Wallet size={16} className="text-pink-400 shrink-0" />
            <span className="text-xs text-gray-400 shrink-0">月预算</span>
            <span className="text-sm text-gray-400 shrink-0">¥</span>
            <input
              type="number"
              inputMode="decimal"
              value={monthly}
              onChange={e => setMonthly(e.target.value)}
              placeholder="例如 3000"
              className="flex-1 bg-transparent text-sm text-gray-700 outline-none min-w-0"
            />
          </div>
        </div>

        {/* Category budgets */}
        <div className="glass p-4">
          <p className="text-xs font-bold text-gray-700 mb-3">分类预算</p>
          <div className="space-y-2">
            {expenseCats.map(cat => {
              const used = catUsed[cat.id] || 0;
              const limit = parseFloat(cats[cat.id] || '') || 0;
              const pct = limit > 0 && used > 0 ? Math.min(100, (used / limit) * 100) : 0;
              const exceeded = limit > 0 && used > limit;
              return (
                <div key={cat.id} className="p-2.5 rounded-2xl bg-white/85 border border-pink-200/60">
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <CategoryIcon category={cat} className="text-base" />
                      <span className="text-sm text-gray-700">{cat.name}</span>
                    </div>
                    <span className="text-[10px] text-gray-400">
                      {limit > 0 ? `已用 ¥${formatMoney(used)}` : '暂未设置'}
                    </span>
                  </div>
                  {limit > 0 && (
                    <div className="h-1.5 rounded-full bg-pink-100 overflow-hidden mb-1.5">
                      <div
                        className={`h-full rounded-full ${exceeded ? 'bg-rose-400' : 'bg-pink-300'}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-400 shrink-0">预算 ¥</span>
                    <input
                      type="number"
                      inputMode="decimal"
                      value={cats[cat.id] || ''}
                      onChange={e => setCats(prev => ({ ...prev, [cat.id]: e.target.value }))}
                      placeholder="不设"
                      className="flex-1 bg-transparent text-sm text-gray-700 outline-none min-w-0"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <p className="text-[10px] text-gray-400 text-center mt-3 leading-relaxed">
          预算仅作提醒，不会拦截记账 💕<br />下月自动重新开始计算
        </p>
      </div>

      <div className="px-4 pb-safe pt-2 shrink-0">
        <button onClick={handleSave} className="btn-pink">保存预算</button>
      </div>
    </div>
  );
}
