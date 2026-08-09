import { useState, useRef, type ChangeEvent } from 'react';
import { Plus, Trash2, Edit3, RotateCcw, AlertTriangle, Download, Upload, PiggyBank } from 'lucide-react';
import { useStore, formatMoney, genId, exportState, mergeWithPresets, presetCategories, presetAccounts } from '../store.tsx';
import type { Category, Account } from '../types';

interface Props {
  onOpenBudget: () => void;
  onOpenImport: () => void;
}

export default function SettingsPage({ onOpenBudget, onOpenImport }: Props) {
  const { state, dispatch } = useStore();
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isPresetCategory = (id: string) => presetCategories.some(c => c.id === id);
  const isPresetAccount = (id: string) => presetAccounts.some(a => a.id === id);

  const handleAddCategory = () => {
    const name = prompt('输入分类名称');
    if (!name?.trim()) return;
    const type = confirm('是收入分类吗？\n（确定=收入，取消=支出）') ? 'income' : 'expense';
    const icon = type === 'income' ? '✨' : '📝';
    dispatch({
      type: 'ADD_CATEGORY',
      payload: { id: genId(), name: name.trim(), type, icon, sort: 100 } as Category,
    });
  };

  const handleAddAccount = () => {
    const name = prompt('输入账户名称');
    if (!name?.trim()) return;
    dispatch({
      type: 'ADD_ACCOUNT',
      payload: { id: genId(), name: name.trim(), type: 'other', icon: '💰', balance: 0, initialBalance: 0, sort: 100 } as Account,
    });
  };

  const handleEditAccount = (acc: Account) => {
    const newName = prompt('修改账户名称', acc.name);
    if (newName === null) return;
    const newBalance = prompt('修改初始余额（元）', (acc.initialBalance / 100).toFixed(2));
    if (newBalance === null) return;
    const init = Math.round(parseFloat(newBalance) * 100) || 0;
    dispatch({
      type: 'UPDATE_ACCOUNT',
      payload: { ...acc, name: newName.trim() || acc.name, initialBalance: init },
    });
  };

  const handleExport = () => {
    const data = exportState(state);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const d = new Date();
    const localDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    a.download = `yunyun-bookkeeping-${localDate}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImportBackup = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result));
        const isOurs = parsed && parsed._app === 'yunyun-bookkeeping';
        const msg = isOurs
          ? '导入备份将覆盖当前所有数据，确定继续吗？'
          : '这似乎不是「芸芸的记账本」的备份文件，仍要导入并覆盖当前数据吗？';
        if (!confirm(msg)) {
          e.target.value = '';
          return;
        }
        dispatch({ type: 'LOAD', payload: mergeWithPresets(parsed) });
        alert('备份已成功恢复 💕');
      } catch {
        alert('文件格式不正确，恢复失败');
      }
      e.target.value = '';
    };
    reader.readAsText(file);
  };

  return (
    <div className="h-full overflow-y-auto scrollbar-hide animate-fade-in px-4 pt-4 pb-4">
      <h1 className="text-lg font-bold text-gray-800 mb-4">设置 ⚙️</h1>

      {/* Categories */}
      <div className="glass p-4 mb-3">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-bold text-gray-700">分类管理</p>
          <button onClick={handleAddCategory} className="p-1.5 rounded-lg bg-pink-50 text-pink-500 active:bg-pink-100 transition-colors">
            <Plus size={16} />
          </button>
        </div>
        <div className="space-y-1.5">
          {state.categories.map(cat => (
            <div key={cat.id} className="flex items-center justify-between p-2 rounded-xl bg-white/80 border border-pink-200/60">
              <div className="flex items-center gap-2">
                <span className="text-base">{cat.icon}</span>
                <span className="text-sm text-gray-700">{cat.name}</span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${cat.type === 'income' ? 'bg-pink-100 text-pink-500' : 'bg-rose-100 text-rose-500'}`}>
                  {cat.type === 'income' ? '收' : '支'}
                </span>
              </div>
              {!isPresetCategory(cat.id) && (
                <button
                  onClick={() => dispatch({ type: 'DELETE_CATEGORY', payload: cat.id })}
                  className="p-1.5 rounded-lg active:bg-rose-50 transition-colors"
                >
                  <Trash2 size={14} className="text-gray-300" />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Accounts */}
      <div className="glass p-4 mb-3">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-bold text-gray-700">账户管理</p>
          <button onClick={handleAddAccount} className="p-1.5 rounded-lg bg-pink-50 text-pink-500 active:bg-pink-100 transition-colors">
            <Plus size={16} />
          </button>
        </div>
        <div className="space-y-1.5">
          {state.accounts.map(acc => (
            <div key={acc.id} className="flex items-center justify-between p-2 rounded-xl bg-white/80 border border-pink-200/60">
              <div className="flex items-center gap-2">
                <span className="text-base">{acc.icon}</span>
                <div>
                  <span className="text-sm text-gray-700">{acc.name}</span>
                  <p className="text-[10px] text-gray-400">初始 ¥{formatMoney(acc.initialBalance)}</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => handleEditAccount(acc)} className="p-1.5 rounded-lg active:bg-pink-50 transition-colors">
                  <Edit3 size={14} className="text-gray-300" />
                </button>
                {!isPresetAccount(acc.id) && (
                  <button
                    onClick={() => dispatch({ type: 'DELETE_ACCOUNT', payload: acc.id })}
                    className="p-1.5 rounded-lg active:bg-rose-50 transition-colors"
                  >
                    <Trash2 size={14} className="text-gray-300" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Data & tools */}
      <div className="glass p-4 mb-3">
        <p className="text-xs font-bold text-gray-700 mb-3">数据与工具</p>
        <div className="space-y-1.5">
          <button onClick={onOpenBudget} className="w-full flex items-center gap-3 p-2.5 rounded-xl bg-white/80 border border-pink-200/60 active:bg-pink-50 transition-colors text-left">
            <span className="w-8 h-8 rounded-lg bg-pink-100 flex items-center justify-center text-base"><PiggyBank size={16} className="text-pink-500" /></span>
            <span className="flex-1 text-sm text-gray-700">预算管理</span>
            <span className="text-[10px] text-pink-400">设置 ›</span>
          </button>
          <button onClick={onOpenImport} className="w-full flex items-center gap-3 p-2.5 rounded-xl bg-white/80 border border-pink-200/60 active:bg-pink-50 transition-colors text-left">
            <span className="w-8 h-8 rounded-lg bg-pink-100 flex items-center justify-center text-base">📥</span>
            <span className="flex-1 text-sm text-gray-700">导入历史账本</span>
            <span className="text-[10px] text-pink-400">去导入 ›</span>
          </button>
          <button onClick={handleExport} className="w-full flex items-center gap-3 p-2.5 rounded-xl bg-white/80 border border-pink-200/60 active:bg-pink-50 transition-colors text-left">
            <span className="w-8 h-8 rounded-lg bg-pink-100 flex items-center justify-center text-base"><Download size={16} className="text-pink-500" /></span>
            <span className="flex-1 text-sm text-gray-700">导出备份</span>
            <span className="text-[10px] text-pink-400">下载 JSON ›</span>
          </button>
          <button onClick={() => fileInputRef.current?.click()} className="w-full flex items-center gap-3 p-2.5 rounded-xl bg-white/80 border border-pink-200/60 active:bg-pink-50 transition-colors text-left">
            <span className="w-8 h-8 rounded-lg bg-pink-100 flex items-center justify-center text-base"><Upload size={16} className="text-pink-500" /></span>
            <span className="flex-1 text-sm text-gray-700">导入备份</span>
            <span className="text-[10px] text-pink-400">选择文件 ›</span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={handleImportBackup}
          />
        </div>
      </div>

      {/* About */}
      <div className="glass p-4 mb-3">
        <p className="text-xs font-bold text-gray-700 mb-2">关于</p>
        <p className="text-xs text-gray-500 leading-relaxed">
          芸芸的记账本 v1.0 🎀<br />
          为可爱的人打造的可爱账本~<br />
          数据保存在本地浏览器中
        </p>
      </div>

      {/* Reset */}
      <button
        onClick={() => setShowResetConfirm(true)}
        className="w-full py-3 rounded-2xl bg-white/80 border border-rose-200 text-rose-400 text-sm font-medium active:bg-rose-50 transition-colors flex items-center justify-center gap-2"
      >
        <RotateCcw size={16} />
        重置所有数据
      </button>

      {/* Reset confirm modal */}
      {showResetConfirm && (
        <div className="absolute inset-0 z-50 flex items-center justify-center px-6 animate-fade-in">
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setShowResetConfirm(false)} />
          <div className="glass-strong p-6 w-full max-w-xs relative z-10">
            <div className="flex items-center gap-2 mb-3 text-rose-500">
              <AlertTriangle size={20} />
              <p className="text-sm font-bold">确认重置？</p>
            </div>
            <p className="text-xs text-gray-500 mb-5">这将清除所有账目数据，不可恢复！</p>
            <div className="flex gap-2">
              <button
                onClick={() => setShowResetConfirm(false)}
                className="btn-pink-outline flex-1"
              >
                取消
              </button>
              <button
                onClick={() => { dispatch({ type: 'RESET' }); setShowResetConfirm(false); }}
                className="flex-1 py-3.5 rounded-2xl bg-rose-400 text-white font-semibold text-base active:bg-rose-500 transition-all"
              >
                确认重置
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
