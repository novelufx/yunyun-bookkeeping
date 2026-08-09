import { useState } from 'react';
import { ChevronLeft, Check, AlertCircle, FileText, Wallet } from 'lucide-react';
import { useStore, genId, formatMoney } from '../store.tsx';
import { parseImportText } from '../utils/importParser';
import type { Transaction } from '../types';

interface Props {
  onBack: () => void;
}

const SAMPLE = `8.1 餐饮 35
8.2 交通 -12
8.3 工资 +12000
8.5 买菜 52.5
8.10 娱乐 88`;

export default function ImportPage({ onBack }: Props) {
  const { state, dispatch } = useStore();
  const [text, setText] = useState('');
  const [accountId, setAccountId] = useState(state.accounts[0]?.id || '');
  const [parsed, setParsed] = useState<ReturnType<typeof parseImportText> | null>(null);
  const [selected, setSelected] = useState<Record<number, boolean>>({});
  const [imported, setImported] = useState<number | null>(null);

  const catName = (id: string) =>
    state.categories.find(c => c.id === id)?.name || '其他';

  const handleParse = () => {
    if (!text.trim()) return;
    const res = parseImportText(text, state.categories);
    setParsed(res);
    const sel: Record<number, boolean> = {};
    res.items.forEach((_, i) => (sel[i] = true));
    setSelected(sel);
    setImported(null);
  };

  const handleImport = () => {
    if (!parsed) return;
    const toImport = parsed.items.filter((_, i) => selected[i]);
    if (toImport.length === 0) return;
    const txs: Transaction[] = toImport.map(it => ({
      id: genId(),
      type: it.type,
      amount: it.amount,
      categoryId: it.categoryId,
      accountId,
      date: it.date,
      note: it.note,
      createdAt: new Date().toISOString(),
    }));
    dispatch({ type: 'IMPORT_TX', payload: txs });
    setImported(txs.length);
    setParsed(null);
    setText('');
    setSelected({});
  };

  const toggle = (i: number) => setSelected(prev => ({ ...prev, [i]: !prev[i] }));

  return (
    <div className="absolute inset-0 z-40 flex flex-col bg-pink-50/95 backdrop-blur-xl animate-slide-up">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 pt-4 pb-2">
        <button onClick={onBack} className="p-2 rounded-xl bg-white/85 border border-pink-200/70 active:bg-pink-50 transition-colors">
          <ChevronLeft size={20} className="text-gray-500" />
        </button>
        <p className="text-sm font-bold text-gray-700">导入历史账本 📥</p>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-hide px-4 pb-4">
        {imported !== null ? (
          <div className="glass-strong p-6 text-center mt-10">
            <div className="text-4xl mb-3">🎉</div>
            <p className="text-base font-bold text-pink-500">成功导入 {imported} 笔</p>
            <p className="text-xs text-gray-400 mt-2">已合并到当前账本，去「统计」看看吧～</p>
            <button onClick={onBack} className="btn-pink mt-5">完成</button>
          </div>
        ) : (
          <>
            <div className="glass p-4 mb-3">
              <p className="text-xs font-bold text-gray-700 mb-2">导入到账户</p>
              <div className="flex items-center gap-2 p-2.5 rounded-2xl bg-white/85 border border-pink-200/60">
                <Wallet size={16} className="text-pink-400 shrink-0" />
                <span className="text-xs text-gray-400 shrink-0">账户</span>
                <select
                  value={accountId}
                  onChange={e => setAccountId(e.target.value)}
                  className="flex-1 bg-transparent text-sm text-gray-700 outline-none min-w-0"
                >
                  {state.accounts.map(a => (
                    <option key={a.id} value={a.id}>{a.icon} {a.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="glass p-4 mb-3">
              <p className="text-xs font-bold text-gray-700 mb-2">粘贴记账文本</p>
              <p className="text-[10px] text-gray-400 mb-2 leading-relaxed">
                每行一笔，格式：<b className="text-pink-500">月.日 分类 金额</b><br />
                支出可加 -，收入加 +；分类名会自动匹配
              </p>
              <textarea
                value={text}
                onChange={e => setText(e.target.value)}
                placeholder={SAMPLE}
                rows={8}
                className="input-glass w-full resize-none text-sm leading-relaxed"
              />
              <div className="flex gap-2 mt-2">
                <button onClick={() => setText(SAMPLE)} className="text-xs text-pink-400 px-3 py-2 rounded-xl bg-pink-50 active:bg-pink-100 transition-colors">
                  填入示例
                </button>
                <button onClick={handleParse} disabled={!text.trim()} className="btn-pink flex-1 disabled:opacity-50">
                  解析
                </button>
              </div>
            </div>

            {parsed && (
              <div className="space-y-3">
                {parsed.items.length > 0 && (
                  <div className="glass p-4">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs font-bold text-gray-700">识别到 {parsed.items.length} 笔</p>
                      <button onClick={handleImport} className="btn-pink-outline px-4 py-1.5 text-xs rounded-xl">
                        导入选中（{parsed.items.filter((_, i) => selected[i]).length}）
                      </button>
                    </div>
                    <div className="space-y-1.5">
                      {parsed.items.map((it, i) => (
                        <button
                          key={i}
                          onClick={() => toggle(i)}
                          className={`w-full flex items-center justify-between p-2.5 rounded-xl border transition-colors ${
                            selected[i] ? 'bg-white/90 border-pink-300' : 'bg-white/50 border-pink-200/40'
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <div className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 ${selected[i] ? 'bg-pink-400 text-white' : 'bg-pink-100 text-transparent'}`}>
                              <Check size={14} />
                            </div>
                            <div className="text-left min-w-0">
                              <p className="text-xs text-gray-700 truncate">
                                {it.date} · {catName(it.categoryId)}{it.note ? ` · ${it.note}` : ''}
                              </p>
                            </div>
                          </div>
                          <span className={`text-sm font-bold shrink-0 ${it.type === 'expense' ? 'text-rose-500' : 'text-pink-500'}`}>
                            {it.type === 'expense' ? '-' : '+'}{formatMoney(it.amount)}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {parsed.errors.length > 0 && (
                  <div className="glass p-4 border-rose-200/50">
                    <div className="flex items-center gap-1.5 mb-2 text-rose-400">
                      <AlertCircle size={14} />
                      <p className="text-xs font-bold">未识别 {parsed.errors.length} 行</p>
                    </div>
                    <div className="space-y-1">
                      {parsed.errors.map((e, i) => (
                        <p key={i} className="text-[10px] text-gray-400 truncate">
                          <span className="text-rose-400">· </span>{e.raw} <span className="text-gray-300">（{e.reason}）</span>
                        </p>
                      ))}
                    </div>
                    <p className="text-[10px] text-gray-300 mt-2">请按「月.日 分类 金额」格式修正后再试</p>
                  </div>
                )}
              </div>
            )}

            {!parsed && (
              <div className="text-center py-6 text-gray-300">
                <FileText size={32} className="mx-auto mb-2 opacity-50" />
                <p className="text-xs">粘贴文本后点击「解析」</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
