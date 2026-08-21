import { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useStore, getMonthlyStats, getCategoryStats, getDailyStats, getBudgetStatus, formatMoney, recalcAccounts } from '../store.tsx';
import CategoryIcon from './CategoryIcon';

export default function StatsPage() {
  const { state } = useStore();
  const [currentDate, setCurrentDate] = useState(new Date());
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth() + 1;
  const yearMonth = `${year}-${String(month).padStart(2, '0')}`;
  const monthLabel = `${year}年${month}月`;

  const stats = useMemo(() => getMonthlyStats(state.transactions, yearMonth), [state.transactions, yearMonth]);
  const catStats = useMemo(() => getCategoryStats(state.transactions, yearMonth, 'expense'), [state.transactions, yearMonth]);
  const dailyStats = useMemo(() => getDailyStats(state.transactions, yearMonth), [state.transactions, yearMonth]);
  const accounts = useMemo(() => recalcAccounts(state.transactions, state.accounts), [state.transactions, state.accounts]);
  const budget = useMemo(() => getBudgetStatus(state, yearMonth), [state, yearMonth]);

  const totalExpense = stats.expense;
  const catEntries = Object.entries(catStats)
    .map(([id, amount]) => ({
      id,
      name: state.categories.find(c => c.id === id)?.name || '其他',
      icon: state.categories.find(c => c.id === id)?.icon || '📝',
      amount,
      pct: totalExpense > 0 ? (amount / totalExpense) * 100 : 0,
    }))
    .sort((a, b) => b.amount - a.amount);

  // Build conic-gradient for pie chart
  const pieColors = ['#FF5C8D', '#FF7AA3', '#FFA0B8', '#FFC8D6', '#FFD6E0', '#FECDD3', '#FDA4AF', '#FB7185', '#F43F5E', '#E11D48'];
  let accDeg = 0;
  const pieSlices = catEntries.map((c, i) => {
    const deg = (c.pct / 100) * 360;
    const start = accDeg;
    accDeg += deg;
    return { ...c, start, deg, color: pieColors[i % pieColors.length] };
  });
  const pieGradient = pieSlices.length > 0
    ? `conic-gradient(${pieSlices.map(s => `${s.color} ${s.start}deg ${s.start + s.deg}deg`).join(', ')})`
    : 'conic-gradient(#FFE4EC 0deg 360deg)';

  // Daily chart
  const daysInMonth = new Date(year, month, 0).getDate();
  const maxDaily = Math.max(...Object.values(dailyStats).map(d => Math.max(d.income, d.expense)), 1);

  return (
    <div className="h-full flex flex-col overflow-y-auto scrollbar-hide animate-fade-in px-4 pt-4 pb-4">
      {/* Month selector */}
      <div className="flex items-center justify-between mb-4">
        <button onClick={() => setCurrentDate(new Date(year, month - 2, 1))} className="p-2 rounded-xl bg-white/85 border border-pink-200/70 active:bg-pink-50 transition-colors">
          <ChevronLeft size={18} className="text-gray-500" />
        </button>
        <p className="text-sm font-bold text-gray-800">{monthLabel} 统计</p>
        <button onClick={() => setCurrentDate(new Date(year, month, 1))} className="p-2 rounded-xl bg-white/85 border border-pink-200/70 active:bg-pink-50 transition-colors">
          <ChevronRight size={18} className="text-gray-500" />
        </button>
      </div>

      {/* Overview */}
      <div className="glass-strong p-4 mb-4">
        <div className="flex items-center justify-around">
          <div className="text-center">
            <p className="text-[10px] text-gray-400 mb-0.5">收入</p>
            <p className="text-base font-bold text-pink-500">+¥{formatMoney(stats.income)}</p>
          </div>
          <div className="w-px h-8 bg-pink-100" />
          <div className="text-center">
            <p className="text-[10px] text-gray-400 mb-0.5">支出</p>
            <p className="text-base font-bold text-rose-500">-¥{formatMoney(stats.expense)}</p>
          </div>
          <div className="w-px h-8 bg-pink-100" />
          <div className="text-center">
            <p className="text-[10px] text-gray-400 mb-0.5">结余</p>
            <p className={`text-base font-bold ${stats.balance >= 0 ? 'text-pink-500' : 'text-rose-500'}`}>
              ¥{formatMoney(Math.abs(stats.balance))}
            </p>
          </div>
        </div>
      </div>

      {/* Budget card */}
      {budget.monthly && (
        <div className="glass p-4 mb-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-bold text-gray-700">本月预算</p>
            <span className={`text-[10px] font-semibold ${budget.monthly.exceeded ? 'text-rose-500' : 'text-pink-500'}`}>
              {formatMoney(budget.monthly.used)} / {formatMoney(budget.monthly.limit)}
            </span>
          </div>
          <div className="h-2.5 rounded-full bg-pink-100 overflow-hidden">
            <div
              className={`h-full rounded-full ${budget.monthly.exceeded ? 'bg-rose-400' : 'bg-pink-400'}`}
              style={{ width: `${budget.monthly.pct}%` }}
            />
          </div>
          <p className={`text-[10px] mt-1.5 ${budget.monthly.exceeded ? 'text-rose-500' : 'text-gray-400'}`}>
            {budget.monthly.exceeded
              ? `已超支 ¥${formatMoney(Math.abs(budget.monthly.remain))}`
              : `还剩 ¥${formatMoney(budget.monthly.remain)}（${budget.monthly.pct.toFixed(0)}%）`}
          </p>
          {budget.cats.length > 0 && (
            <div className="mt-3 space-y-1.5">
              {budget.cats.map(c => (
                <div key={c.catId} className="flex items-center gap-2">
                  <span className="text-xs text-gray-600 w-12 truncate">{c.name}</span>
                  <div className="flex-1 h-1.5 rounded-full bg-pink-100 overflow-hidden">
                    <div className={`h-full rounded-full ${c.used > c.limit ? 'bg-rose-400' : 'bg-pink-300'}`} style={{ width: `${c.pct}%` }} />
                  </div>
                  <span className="text-[10px] text-gray-400 w-16 text-right">
                    {formatMoney(c.used)}/{formatMoney(c.limit)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Pie chart */}
      <div className="glass p-4 mb-4">
        <p className="text-xs font-bold text-gray-700 mb-3">支出分类占比</p>
        {catEntries.length === 0 ? (
          <div className="text-center py-4 text-sm text-gray-400">本月暂无支出</div>
        ) : (
          <div className="flex items-center gap-4">
            <div className="relative w-24 h-24 shrink-0">
              <div className="w-24 h-24 rounded-full" style={{ background: pieGradient }} />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-14 h-14 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center">
                  <span className="text-[10px] text-gray-500 font-medium">支出</span>
                </div>
              </div>
            </div>
            <div className="flex-1 space-y-1.5 min-w-0">
              {catEntries.slice(0, 6).map(c => {
                const cat = state.categories.find(cc => cc.id === c.id);
                return (
                  <div key={c.id} className="flex items-center gap-2">
                    <CategoryIcon category={cat} className="text-sm" />
                    <span className="text-xs text-gray-600 flex-1 truncate">{c.name}</span>
                    <span className="text-xs font-medium text-gray-500">{c.pct.toFixed(0)}%</span>
                    <span className="text-xs text-gray-400">¥{formatMoney(c.amount)}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Daily bar chart */}
      <div className="glass p-4 mb-4">
        <p className="text-xs font-bold text-gray-700 mb-3">每日收支趋势</p>
        {Object.keys(dailyStats).length === 0 ? (
          <div className="text-center py-4 text-sm text-gray-400">暂无数据</div>
        ) : (
          <div className="flex items-end gap-[3px] h-28 px-1">
            {Array.from({ length: daysInMonth }, (_, i) => {
              const d = `${yearMonth}-${String(i + 1).padStart(2, '0')}`;
              const ds = dailyStats[d] || { income: 0, expense: 0 };
              const incH = ds.income > 0 ? (ds.income / maxDaily) * 100 : 0;
              const expH = ds.expense > 0 ? (ds.expense / maxDaily) * 100 : 0;
              const hasData = ds.income > 0 || ds.expense > 0;
              return (
                <div key={d} className="flex-1 flex flex-col items-center justify-end gap-[1px]">
                  {incH > 0 && (
                    <div className="w-full rounded-t-[2px] bg-pink-300" style={{ height: `${incH}%` }} />
                  )}
                  {expH > 0 && (
                    <div className="w-full rounded-t-[2px] bg-rose-300" style={{ height: `${expH}%` }} />
                  )}
                  {!hasData && <div className="w-full h-[2px] rounded-full bg-gray-100" />}
                  {i % 5 === 0 && <span className="text-[8px] text-gray-300 mt-1">{i + 1}</span>}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Account balances */}
      <div className="glass p-4">
        <p className="text-xs font-bold text-gray-700 mb-3">账户余额</p>
        <div className="space-y-2">
          {accounts.map(acc => (
            <div key={acc.id} className="flex items-center justify-between p-2.5 rounded-xl bg-white/80 border border-pink-200/60">
              <div className="flex items-center gap-2">
                <span className="text-base">{acc.icon}</span>
                <span className="text-sm text-gray-700">{acc.name}</span>
              </div>
              <span className={`text-sm font-bold ${acc.balance >= 0 ? 'text-gray-800' : 'text-rose-500'}`}>
                ¥{formatMoney(acc.balance)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
