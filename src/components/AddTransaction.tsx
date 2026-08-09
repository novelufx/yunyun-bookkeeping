import { useState, useEffect, useMemo } from 'react';
import { X, Calendar, Wallet, StickyNote, ArrowRightLeft } from 'lucide-react';
import { useStore, genId, getBudgetStatus, formatMoney } from '../store.tsx';
import type { Transaction, TxType } from '../types';

interface Props {
  defaultCategoryId?: string;
  editingTx?: Transaction;
  onClose: () => void;
}

export default function AddTransaction({ defaultCategoryId, editingTx, onClose }: Props) {
  const { state, dispatch } = useStore();
  const [txType, setTxType] = useState<TxType>(editingTx?.type || 'expense');
  const [amountStr, setAmountStr] = useState(editingTx ? (editingTx.amount / 100).toFixed(2) : '');
  const [categoryId, setCategoryId] = useState(editingTx?.categoryId || defaultCategoryId || '');
  const [accountId, setAccountId] = useState(editingTx?.accountId || (state.accounts[0]?.id ?? ''));
  const [toAccountId, setToAccountId] = useState(editingTx?.toAccountId || (state.accounts[1]?.id ?? ''));
  const [date, setDate] = useState(editingTx?.date || new Date().toISOString().slice(0, 10));
  const [note, setNote] = useState(editingTx?.note || '');
  const [showNoteInput, setShowNoteInput] = useState(false);
  const [alert, setAlert] = useState<{ monthly: any; cat: any } | null>(null);

  // Reset category when type changes
  useEffect(() => {
    if (!editingTx) {
      const cats = state.categories.filter(c => c.type === txType);
      if (!cats.some(c => c.id === categoryId)) {
        setCategoryId(cats[0]?.id || '');
      }
    }
  }, [txType]);

  // Set default category on first open
  useEffect(() => {
    if (!editingTx && !categoryId && defaultCategoryId) {
      const cat = state.categories.find(c => c.id === defaultCategoryId);
      if (cat) {
        setCategoryId(cat.id);
        setTxType(cat.type);
      }
    }
  }, [defaultCategoryId]);

  const filteredCats = useMemo(() =>
    txType === 'transfer' ? [] : state.categories.filter(c => c.type === txType),
  [state.categories, txType]);

  const displayAmount = amountStr || '0';
  const hasDecimal = amountStr.includes('.');
  const decimalPart = hasDecimal ? amountStr.split('.')[1] : '';

  const handleNum = (n: string) => {
    if (amountStr.length >= 10) return;
    if (hasDecimal && decimalPart.length >= 2) return;
    if (amountStr === '0' && n !== '.') {
      setAmountStr(n);
    } else {
      setAmountStr(amountStr + n);
    }
  };

  const handleDot = () => {
    if (!hasDecimal && amountStr.length < 10) {
      setAmountStr(amountStr + '.');
    }
  };

  const handleBack = () => {
    setAmountStr(amountStr.slice(0, -1));
  };

  const handleSave = () => {
    const amount = Math.round(parseFloat(displayAmount) * 100);
    if (amount <= 0) return;
    if (txType !== 'transfer' && !categoryId) return;
    if (txType === 'transfer' && accountId === toAccountId) return;

    const payload: Transaction = {
      id: editingTx?.id || genId(),
      type: txType,
      amount,
      categoryId: txType === 'transfer' ? '' : categoryId,
      accountId,
      toAccountId: txType === 'transfer' ? toAccountId : undefined,
      date,
      note,
      createdAt: editingTx?.createdAt || new Date().toISOString(),
    };

    if (editingTx) {
      dispatch({ type: 'UPDATE_TX', payload });
      onClose();
      return;
    }

    dispatch({ type: 'ADD_TX', payload });

    // 预算超额提醒（仅新增、且非转账时检测，不阻断记账）
    const tempState = { ...state, transactions: [payload, ...state.transactions] };
    const bs = getBudgetStatus(tempState, payload.date.slice(0, 7));
    const exceededMonthly = bs.monthly?.exceeded || false;
    const exceededCat = bs.cats.find(c => c.used > c.limit);
    if (exceededMonthly || exceededCat) {
      setAlert({ monthly: exceededMonthly ? bs.monthly : null, cat: exceededCat || null });
      return;
    }
    onClose();
  };

  const canSave = parseFloat(displayAmount) > 0 && (txType === 'transfer' || !!categoryId) && (txType !== 'transfer' || accountId !== toAccountId);

  return (
    <div className="absolute inset-0 z-40 flex flex-col animate-slide-up">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-pink-50/95 backdrop-blur-xl" />

      {/* Content */}
      <div className="relative flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center justify-between px-4 pt-4 pb-2">
          <button onClick={onClose} className="p-2 rounded-xl bg-white/85 border border-pink-200/70 active:bg-pink-50 transition-colors">
            <X size={20} className="text-gray-500" />
          </button>
          <p className="text-sm font-bold text-gray-700">
            {editingTx ? '编辑账目' : '记一笔'} 🎀
          </p>
          <div className="w-9" />
        </div>

        {/* Type tabs */}
        <div className="flex gap-2 px-4 py-2">
          {(['expense', 'income', 'transfer'] as TxType[]).map(t => (
            <button
              key={t}
              onClick={() => setTxType(t)}
              className={`type-tab ${txType === t ? 'active' : ''}`}
            >
              {t === 'expense' ? '支出' : t === 'income' ? '收入' : '转账'}
            </button>
          ))}
        </div>

        {/* Amount display */}
        <div className="px-6 py-4 text-center">
          <p className="text-5xl font-bold text-gray-800 tracking-tight">
            ¥{displayAmount}
          </p>
        </div>

        {/* Scrollable middle area */}
        <div className="flex-1 overflow-y-auto scrollbar-hide px-4 pb-2">
          {/* Category grid */}
          {txType !== 'transfer' && (
            <div className="mb-3">
              <p className="text-xs text-gray-400 font-medium mb-2">选择分类</p>
              <div className="grid grid-cols-4 gap-2">
                {filteredCats.map(cat => (
                  <button
                    key={cat.id}
                    onClick={() => setCategoryId(cat.id)}
                    className={`cat-chip ${categoryId === cat.id ? 'bg-pink-100 border-pink-300' : ''}`}
                  >
                    <span className="emoji">{cat.icon}</span>
                    <span className="label">{cat.name}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Account selection */}
          <div className="space-y-2 mb-3">
            {txType === 'transfer' ? (
              <>
                <div className="flex items-center gap-2 p-3 rounded-2xl bg-white/85 border border-pink-200/60">
                  <Wallet size={16} className="text-pink-400 shrink-0" />
                  <span className="text-xs text-gray-400 shrink-0">转出</span>
                  <select
                    value={accountId}
                    onChange={e => setAccountId(e.target.value)}
                    className="flex-1 bg-transparent text-sm text-gray-700 outline-none"
                  >
                    {state.accounts.map(a => (
                      <option key={a.id} value={a.id}>{a.icon} {a.name}</option>
                    ))}
                  </select>
                </div>
                <div className="flex items-center justify-center py-1">
                  <ArrowRightLeft size={16} className="text-pink-300" />
                </div>
                <div className="flex items-center gap-2 p-3 rounded-2xl bg-white/85 border border-pink-200/60">
                  <Wallet size={16} className="text-pink-400 shrink-0" />
                  <span className="text-xs text-gray-400 shrink-0">转入</span>
                  <select
                    value={toAccountId}
                    onChange={e => setToAccountId(e.target.value)}
                    className="flex-1 bg-transparent text-sm text-gray-700 outline-none"
                  >
                    {state.accounts.map(a => (
                      <option key={a.id} value={a.id}>{a.icon} {a.name}</option>
                    ))}
                  </select>
                </div>
              </>
            ) : (
              <div className="flex items-center gap-2 p-3 rounded-2xl bg-white/85 border border-pink-200/60">
                <Wallet size={16} className="text-pink-400 shrink-0" />
                <span className="text-xs text-gray-400 shrink-0">账户</span>
                <select
                  value={accountId}
                  onChange={e => setAccountId(e.target.value)}
                  className="flex-1 bg-transparent text-sm text-gray-700 outline-none"
                >
                  {state.accounts.map(a => (
                    <option key={a.id} value={a.id}>{a.icon} {a.name}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Date */}
            <div className="flex items-center gap-2 p-3 rounded-2xl bg-white/85 border border-pink-200/60">
              <Calendar size={16} className="text-pink-400 shrink-0" />
              <span className="text-xs text-gray-400 shrink-0">日期</span>
              <input
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
                className="flex-1 bg-transparent text-sm text-gray-700 outline-none"
              />
            </div>

            {/* Note */}
            {showNoteInput ? (
              <div className="flex items-center gap-2 p-3 rounded-2xl bg-white/85 border border-pink-200/60">
                <StickyNote size={16} className="text-pink-400 shrink-0" />
                <input
                  type="text"
                  value={note}
                  onChange={e => setNote(e.target.value)}
                  placeholder="输入备注..."
                  className="flex-1 bg-transparent text-sm text-gray-700 outline-none"
                  autoFocus
                />
                <button onClick={() => { if (!note) setShowNoteInput(false); }} className="text-xs text-gray-400">
                  收起
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowNoteInput(true)}
                className="flex items-center gap-2 p-3 rounded-2xl bg-white/85 border border-pink-200/60 w-full text-left"
              >
                <StickyNote size={16} className="text-pink-400 shrink-0" />
                <span className="text-xs text-gray-400">{note || '添加备注...'}</span>
              </button>
            )}
          </div>
        </div>

        {/* Keypad */}
        <div className="px-4 pb-safe pt-2 shrink-0">
          <div className="grid grid-cols-4 gap-2 mb-2">
            {['1', '2', '3'].map(n => (
              <button key={n} onClick={() => handleNum(n)} className="keypad-btn">{n}</button>
            ))}
            <button onClick={handleBack} className="keypad-btn text-pink-400">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 4H8l-7 8 7 8h13a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2z" />
                <line x1="18" y1="9" x2="12" y2="15" />
                <line x1="12" y1="9" x2="18" y2="15" />
              </svg>
            </button>

            {['4', '5', '6'].map(n => (
              <button key={n} onClick={() => handleNum(n)} className="keypad-btn">{n}</button>
            ))}
            <button onClick={handleSave} disabled={!canSave} className={`keypad-btn primary row-span-2 ${!canSave ? 'opacity-50' : ''}`}>
              保存
            </button>

            {['7', '8', '9'].map(n => (
              <button key={n} onClick={() => handleNum(n)} className="keypad-btn">{n}</button>
            ))}

            <button onClick={handleDot} className="keypad-btn text-lg">.</button>
            <button onClick={() => handleNum('0')} className="keypad-btn">0</button>
            <button onClick={() => handleNum('00')} className="keypad-btn text-sm">00</button>
          </div>
        </div>
      </div>

      {/* Budget exceed alert */}
      {alert && (
        <div
          className="absolute inset-0 z-50 flex items-end justify-center bg-black/30 backdrop-blur-sm animate-fade-in"
          onClick={() => onClose()}
        >
          <div
            className="glass-strong p-5 m-4 w-full max-w-xs relative z-10"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center gap-2 mb-2">
              <span className="text-2xl">💡</span>
              <p className="text-sm font-bold text-gray-800">温柔提醒</p>
            </div>
            {alert.monthly && (
              <p className="text-xs text-rose-500 mb-1">
                本月支出已超预算 ¥{formatMoney(Math.abs(alert.monthly.remain))} 啦～
              </p>
            )}
            {alert.cat && (
              <p className="text-xs text-rose-500 mb-1">
                「{alert.cat.name}」已超分类预算 ¥{formatMoney(Math.abs(alert.cat.remain))}
              </p>
            )}
            <p className="text-[10px] text-gray-400 mb-3">记得留意开销哦 💕</p>
            <button onClick={() => onClose()} className="btn-pink">知道啦</button>
          </div>
        </div>
      )}
    </div>
  );
}
