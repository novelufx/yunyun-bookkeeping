import { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Plus, Coffee } from 'lucide-react';
import { useStore, formatMoney } from '../store.tsx';
import { getMonthlyTeaStats, getDailyTeas } from '../utils/teaStats';
import type { MilkTeaEntry } from '../types';
import TeaImage from './TeaImage';
import TeaAddPage from './TeaAddPage';

const WEEK_LABELS = ['日', '一', '二', '三', '四', '五', '六'];

export default function TeaPage() {
  const { state } = useStore();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [editingTea, setEditingTea] = useState<MilkTeaEntry | undefined>();

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth() + 1;
  const yearMonth = `${year}-${String(month).padStart(2, '0')}`;
  const monthLabel = `${year}年${month}月`;

  const teaStats = useMemo(() => getMonthlyTeaStats(state.milkTeas, yearMonth), [state.milkTeas, yearMonth]);
  const dailyTeas = useMemo(() => getDailyTeas(state.milkTeas, yearMonth), [state.milkTeas, yearMonth]);

  const daysInMonth = new Date(year, month, 0).getDate();
  const firstDayOfWeek = new Date(year, month - 1, 1).getDay();

  // Build calendar cells
  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDayOfWeek; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  const prevMonth = () => { setCurrentDate(new Date(year, month - 2, 1)); setSelectedDay(null); };
  const nextMonth = () => { setCurrentDate(new Date(year, month, 1)); setSelectedDay(null); };

  const handleAdd = () => {
    setEditingTea(undefined);
    setShowAdd(true);
  };

  const handleEdit = (tea: MilkTeaEntry) => {
    setEditingTea(tea);
    setShowAdd(true);
    setSelectedDay(null);
  };

  const handleCloseAdd = () => {
    setShowAdd(false);
    setEditingTea(undefined);
  };

  const dayTeas = selectedDay ? (dailyTeas[selectedDay] || []) : [];

  return (
    <div className="h-full flex flex-col overflow-y-auto scrollbar-hide animate-fade-in px-4 pt-4 pb-2">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <h1 className="text-lg font-bold text-gray-800">奶茶日历 🧋</h1>
          <p className="text-xs text-pink-400 font-medium">{monthLabel}</p>
        </div>
        <Coffee size={24} className="text-pink-300" />
      </div>

      {/* This Month + Monthly Favorite */}
      <div className="flex gap-2 mb-4">
        <div className="glass-strong p-3 flex-1 text-center">
          <p className="text-[10px] text-gray-400 mb-1">本月</p>
          <p className="text-2xl font-bold text-pink-500">{teaStats.count}</p>
          <p className="text-[10px] text-gray-400">杯 · {teaStats.brandCount} 个品牌</p>
        </div>
        {teaStats.favoriteBrand ? (
          <div className="glass-strong p-3 flex-1 text-center">
            <p className="text-[10px] text-gray-400 mb-1">本月最爱</p>
            <p className="text-base font-bold text-pink-500 truncate">{teaStats.favoriteBrand}</p>
            <p className="text-[10px] text-gray-400">喝了 {teaStats.favoriteCount} 杯</p>
          </div>
        ) : (
          <div className="glass p-3 flex-1 text-center flex items-center justify-center">
            <p className="text-xs text-gray-400">还没有奶茶记录~</p>
          </div>
        )}
      </div>

      {/* Month selector */}
      <div className="flex items-center justify-between mb-2">
        <button onClick={prevMonth} className="p-1.5 rounded-lg bg-white/85 border border-pink-200/70 active:bg-pink-50 transition-colors">
          <ChevronLeft size={16} className="text-gray-500" />
        </button>
        <p className="text-sm font-bold text-gray-700">{monthLabel}</p>
        <button onClick={nextMonth} className="p-1.5 rounded-lg bg-white/85 border border-pink-200/70 active:bg-pink-50 transition-colors">
          <ChevronRight size={16} className="text-gray-500" />
        </button>
      </div>

      {/* Calendar */}
      <div className="glass p-2 mb-3">
        {/* Week labels */}
        <div className="grid grid-cols-7 mb-1">
          {WEEK_LABELS.map(w => (
            <div key={w} className="text-center text-[10px] font-medium text-gray-400 py-1">{w}</div>
          ))}
        </div>
        {/* Day cells */}
        <div className="grid grid-cols-7 gap-1">
          {cells.map((d, i) => {
            if (d === null) return <div key={`blank-${i}`} className="aspect-square" />;
            const dateStr = `${yearMonth}-${String(d).padStart(2, '0')}`;
            const teas = dailyTeas[dateStr] || [];
            const isToday = dateStr === todayStr;
            const isSelected = selectedDay === dateStr;
            return (
              <button
                key={d}
                onClick={() => teas.length > 0 ? setSelectedDay(isSelected ? null : dateStr) : null}
                className={`relative aspect-square rounded-lg overflow-hidden transition-all ${
                  isSelected ? 'ring-2 ring-pink-400' : ''
                } ${teas.length > 0 ? 'bg-pink-50' : 'bg-transparent'}`}
              >
                {teas.length > 0 ? (
                  <>
                    <TeaImage
                      imgKey={teas[0].imgKey}
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                    {teas.length > 1 && (
                      <span className="absolute top-0.5 right-0.5 px-1 py-0.5 rounded-full bg-pink-400/90 text-white text-[8px] font-bold leading-none">
                        +{teas.length - 1}
                      </span>
                    )}
                    <span className="absolute bottom-0.5 left-0.5 text-[8px] font-bold text-white drop-shadow-md">
                      {d}
                    </span>
                  </>
                ) : (
                  <span className={`text-xs ${isToday ? 'text-pink-500 font-bold' : 'text-gray-300'}`}>{d}</span>
                )}
                {isToday && teas.length === 0 && (
                  <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-pink-400" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected day's teas */}
      {selectedDay && dayTeas.length > 0 && (
        <div className="space-y-2 mb-3 animate-fade-in">
          <p className="text-xs text-gray-500 font-medium ml-1">
            {selectedDay} · {dayTeas.length} 杯
          </p>
          {dayTeas.map(tea => (
            <button
              key={tea.id}
              onClick={() => handleEdit(tea)}
              className="w-full tx-item active:bg-pink-50/60 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl overflow-hidden bg-pink-50 flex items-center justify-center shrink-0">
                  <TeaImage imgKey={tea.imgKey} className="w-full h-full object-cover" />
                </div>
                <div className="text-left">
                  <p className="text-sm font-medium text-gray-800">{tea.brand}</p>
                  <p className="text-[10px] text-gray-400">
                    {tea.sugar ? `${tea.sugar} · ` : ''}{tea.ice || ''}{tea.note ? ` · ${tea.note}` : ''}
                  </p>
                </div>
              </div>
              <p className="text-sm font-bold text-rose-500">¥{formatMoney(tea.price)}</p>
            </button>
          ))}
        </div>
      )}

      {/* FAB */}
      <button
        onClick={handleAdd}
        className="fab absolute right-4 bottom-4 z-10"
        aria-label="加奶茶"
      >
        <Plus size={28} strokeWidth={2.5} />
      </button>

      {/* Add/Edit overlay */}
      {showAdd && (
        <TeaAddPage editingTea={editingTea} onClose={handleCloseAdd} />
      )}
    </div>
  );
}
