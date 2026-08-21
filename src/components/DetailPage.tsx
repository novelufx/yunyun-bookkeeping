import { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Trash2, Edit2 } from 'lucide-react';
import { useStore, formatMoney } from '../store.tsx';
import type { Transaction } from '../types';
import CategoryIcon from './CategoryIcon';

interface Props {
  onEdit: (tx: Transaction) => void;
}

export default function DetailPage({ onEdit }: Props) {
  const { state, dispatch } = useStore();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth() + 1;
  const yearMonth = `${year}-${String(month).padStart(2, '0')}`;
  const monthLabel = `${year}年${month}月`;

  const monthTxs = useMemo(() =>
    state.transactions
      .filter(t => t.date.startsWith(yearMonth))
      .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt)),
  [state.transactions, yearMonth]);

  const grouped = useMemo(() => {
    const map: Record<string, Transaction[]> = {};
    monthTxs.forEach(t => {
      if (!map[t.date]) map[t.date] = [];
      map[t.date].push(t);
    });
    return map;
  }, [monthTxs]);

  const handleDelete = (id: string) => {
    if (confirmDelete === id) {
      dispatch({ type: 'DELETE_TX', payload: id });
      setConfirmDelete(null);
    } else {
      setConfirmDelete(id);
      setTimeout(() => setConfirmDelete(null), 2500);
    }
  };

  const prevMonth = () => setCurrentDate(new Date(year, month - 2, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month, 1));

  return (
    <div className="h-full flex flex-col animate-fade-in">
      {/* Month header */}
      <div className="flex items-center justify-between px-4 py-3">
        <button onClick={prevMonth} className="p-2 rounded-xl bg-white/85 border border-pink-200/70 active:bg-pink-50 transition-colors">
          <ChevronLeft size={18} className="text-gray-500" />
        </button>
        <p className="text-sm font-bold text-gray-800">{monthLabel}</p>
        <button onClick={nextMonth} className="p-2 rounded-xl bg-white/85 border border-pink-200/70 active:bg-pink-50 transition-colors">
          <ChevronRight size={18} className="text-gray-500" />
        </button>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto scrollbar-hide px-4 pb-4">
        {monthTxs.length === 0 ? (
          <div className="glass p-8 text-center mt-8">
            <p className="text-3xl mb-2">🐾</p>
            <p className="text-sm text-gray-500">{monthLabel} 还没有记账哦</p>
          </div>
        ) : (
          <div className="space-y-4">
            {Object.entries(grouped).map(([date, txs]) => {
              const dayTotal = txs.reduce((s, t) => s + (t.type === 'expense' ? t.amount : t.type === 'income' ? -t.amount : 0), 0);
              return (
                <div key={date}>
                  <div className="flex items-center justify-between mb-2 px-1">
                    <p className="text-xs font-semibold text-gray-500">{date}</p>
                    <p className={`text-xs font-medium ${dayTotal > 0 ? 'text-rose-500' : dayTotal < 0 ? 'text-pink-500' : 'text-gray-400'}`}>
                      {dayTotal !== 0 ? `${dayTotal > 0 ? '支出' : '结余'} ¥${formatMoney(Math.abs(dayTotal))}` : ''}
                    </p>
                  </div>
                  <div className="space-y-2">
                    {txs.map(tx => (
                      <DetailRow
                        key={tx.id}
                        tx={tx}
                        categories={state.categories}
                        accounts={state.accounts}
                        onEdit={() => onEdit(tx)}
                        onDelete={() => handleDelete(tx.id)}
                        confirming={confirmDelete === tx.id}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function DetailRow({
  tx, categories, accounts, onEdit, onDelete, confirming,
}: {
  tx: Transaction; categories: any[]; accounts: any[];
  onEdit: () => void; onDelete: () => void; confirming: boolean;
}) {
  const cat = categories.find(c => c.id === tx.categoryId);
  const acc = accounts.find(a => a.id === tx.accountId);
  const isExp = tx.type === 'expense';
  const isInc = tx.type === 'income';

  return (
    <div className={`tx-item ${confirming ? 'bg-rose-50/70 border-rose-200' : ''}`}>
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <div className="w-9 h-9 rounded-xl bg-pink-50 flex items-center justify-center shrink-0">
          <CategoryIcon category={cat} className="text-lg" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium text-gray-800 truncate">{cat?.name || '其他'}{tx.note ? ` · ${tx.note}` : ''}</p>
          <p className="text-[10px] text-gray-400">{acc?.name || ''} · {tx.type === 'transfer' ? '转账' : ''}</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <p className={`text-sm font-bold shrink-0 ${isExp ? 'text-rose-500' : isInc ? 'text-pink-500' : 'text-gray-500'}`}>
          {isExp ? '-' : isInc ? '+' : ''}¥{formatMoney(tx.amount)}
        </p>
        <button onClick={onEdit} className="p-1.5 rounded-lg bg-white/80 border border-pink-200/60 active:bg-pink-50 transition-colors">
          <Edit2 size={14} className="text-gray-400" />
        </button>
        <button
          onClick={onDelete}
          className={`p-1.5 rounded-lg border transition-colors ${confirming ? 'bg-rose-400 text-white border-rose-400' : 'bg-white/80 border-pink-200/60 active:bg-rose-50'}`}
        >
          <Trash2 size={14} className={confirming ? 'text-white' : 'text-gray-400'} />
        </button>
      </div>
    </div>
  );
}
