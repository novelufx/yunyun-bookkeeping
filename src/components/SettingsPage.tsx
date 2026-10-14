import { useState, useRef, useMemo, type ChangeEvent } from 'react';
import { Plus, Trash2, Edit3, RotateCcw, AlertTriangle, Download, Upload, PiggyBank, Grid3x3, HardDrive } from 'lucide-react';
import { useStore, formatMoney, genId, exportState, exportCsv, markExported, mergeWithPresets, presetCategories, presetAccounts } from '../store.tsx';
import type { Category, Account } from '../types';
import CategoryIcon from './CategoryIcon';
import CategoryAddModal from './CategoryAddModal';
import StorageDetailPage from './StorageDetailPage';
import { exportBackup } from '../utils/exportHelper';
import { fingerprintOf, readMeta, shouldRemindBackup, inspectSlots } from '../utils/storageHealth';

interface Props {
  onOpenBudget: () => void;
  onOpenImport: () => void;
  onOpenShortcuts: () => void;
}

export default function SettingsPage({ onOpenBudget, onOpenImport, onOpenShortcuts }: Props) {
  const { state, dispatch, health } = useStore();
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showCatModal, setShowCatModal] = useState(false);
  const [editingCat, setEditingCat] = useState<Category | undefined>();
  const [showStorage, setShowStorage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fp = useMemo(() => fingerprintOf(state), [state]);
  const meta = useMemo(() => readMeta(), [state]);
  const reminder = shouldRemindBackup(meta);
  const healthyCount = useMemo(() => inspectSlots().filter(s => s.exists && s.healthy).length, [state]);

  const isPresetCategory = (id: string) => presetCategories.some(c => c.id === id);
  const isPresetAccount = (id: string) => presetAccounts.some(a => a.id === id);

  const handleAddCategory = () => {
    setEditingCat(undefined);
    setShowCatModal(true);
  };

  const handleEditCategory = (cat: Category) => {
    setEditingCat(cat);
    setShowCatModal(true);
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

  const doDownload = (content: string, ext: string, mime: string) => {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const d = new Date();
    const localDate = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
    a.download = `yunyun-bookkeeping-${localDate}.${ext}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    markExported();
  };

  const handleExport = async () => {
    const json = exportState(state);
    const d = new Date();
    const stamp = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
    const outcome = await exportBackup(json, `yunyun-bookkeeping-${stamp}.json`, 'application/json');
    if (outcome === 'copied') {
      alert('备份内容已复制 💕\n\n请粘贴到「文件传输助手」保存。\n\n（微信里不让直接下载文件，所以改成复制）');
    } else if (outcome === 'downloaded') {
      alert('备份已下载 💕\n\n建议立刻发到「文件传输助手」，\n只存在手机里的话清缓存会一起没。');
    } else {
      alert('导出失败了 😢\n\n请到「账本信息 → 存储详情」里手动复制。');
    }
  };

  const handleExportCsv = async () => {
    const d = new Date();
    const stamp = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
    const outcome = await exportBackup(exportCsv(state), `yunyun-bookkeeping-${stamp}.csv`, 'text/csv;charset=utf-8');
    if (outcome === 'copied') {
      alert('CSV 内容已复制 💕\n\n粘贴到「文件传输助手」或任意记事本即可保存。');
    } else if (outcome === 'downloaded') {
      alert('CSV 已下载 💕');
    } else {
      alert('导出失败，请重试');
    }
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

  /** 粘贴文本恢复（微信里文件被拦截时的通道） */
  const [showPaste, setShowPaste] = useState(false);
  const [pasteText, setPasteText] = useState('');

  const handlePasteRestore = () => {
    const text = pasteText.trim();
    if (!text) return;
    try {
      const parsed = JSON.parse(text);
      const isOurs = parsed && parsed._app === 'yunyun-bookkeeping';
      const msg = isOurs
        ? `导入备份将覆盖当前所有数据，确定继续吗？`
        : '这似乎不是「芸芸的记账本」的备份文件，仍要导入并覆盖当前数据吗？';
      if (!confirm(msg)) return;
      dispatch({ type: 'LOAD', payload: mergeWithPresets(parsed) });
      setShowPaste(false);
      setPasteText('');
      alert('备份已成功恢复 💕');
    } catch {
      alert('粘贴的内容不是有效的备份 JSON');
    }
  };

  return (
    <div className="h-full overflow-y-auto scrollbar-hide animate-fade-in px-4 pt-4 pb-4">
      <h1 className="text-lg font-bold text-gray-800 mb-4">设置 ⚙️</h1>

      {/* 账本信息卡 */}
      <button
        onClick={() => setShowStorage(true)}
        className="glass-strong p-4 mb-3 w-full text-left active:bg-pink-50/60 transition-colors"
      >
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-bold text-gray-700">账本信息</p>
          <span className="text-[10px] text-pink-400">存储详情 ›</span>
        </div>
        <div className="flex items-end justify-between">
          <div>
            <p className="text-2xl font-bold text-pink-500 leading-none">{fp.txCount}</p>
            <p className="text-[10px] text-gray-400 mt-1">笔账目 · {fp.teaCount} 杯奶茶</p>
          </div>
          <div className="text-right space-y-0.5">
            <p className="text-[10px] text-gray-400">
              记录区间 {fp.firstDate ? fp.firstDate.slice(5) + ' ~ ' + fp.lastDate.slice(5) : '—'}
            </p>
            <p className="text-[10px] text-gray-400">
              存储健康 <span className={healthyCount >= 2 ? 'text-green-500 font-semibold' : 'text-amber-500 font-semibold'}>{healthyCount}/4 份正常</span>
            </p>
            <p className={`text-[10px] ${reminder.needed ? 'text-amber-500 font-semibold' : 'text-gray-400'}`}>
              {meta.lastExportAt
                ? (reminder.needed ? `距上次导出 ${reminder.days} 天` : '已备份')
                : '还没导出过备份'}
            </p>
          </div>
        </div>
        {health.writeError && (
          <p className="text-[10px] text-rose-500 mt-2 flex items-start gap-1">
            <AlertTriangle size={11} className="shrink-0 mt-0.5" />
            {health.writeError}
          </p>
        )}
        <p className="text-[10px] text-gray-400 leading-relaxed mt-2 pt-2 border-t border-pink-100">
          ⚠️ 换浏览器 / 微信分身 = 另一个独立账本，数据互不相通
        </p>
      </button>

      {/* 恢复提示 */}
      {health.recoveredFrom && (
        <div className="glass p-3 mb-3 border-amber-200 bg-amber-50/60">
          <p className="text-xs font-bold text-amber-700 mb-1">🔧 已自动从备份恢复</p>
          <p className="text-[10px] text-amber-600 leading-relaxed">
            主存储不可用，已从「{health.recoveredFrom.includes('bk') ? '备份 ' + health.recoveredFrom.slice(-1) : '主存储'}」恢复 {fp.txCount} 笔账目。
            请尽快导出一份备份。
          </p>
        </div>
      )}
      {health.isFresh && fp.txCount === 0 && (
        <div className="glass p-3 mb-3">
          <p className="text-xs font-bold text-gray-700 mb-1">当前环境没有数据</p>
          <p className="text-[10px] text-gray-400 leading-relaxed">
            这个浏览器/微信里没有任何账本记录。若你以前记过账，说明换了容器或换了链接，请回到旧位置核对。
          </p>
        </div>
      )}

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
                <CategoryIcon category={cat} className="text-base" />
                <span className="text-sm text-gray-700">{cat.name}</span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${cat.type === 'income' ? 'bg-pink-100 text-pink-500' : 'bg-rose-100 text-rose-500'}`}>
                  {cat.type === 'income' ? '收' : '支'}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => handleEditCategory(cat)} className="p-1.5 rounded-lg active:bg-pink-50 transition-colors">
                  <Edit3 size={14} className="text-gray-300" />
                </button>
                {!isPresetCategory(cat.id) && (
                  <button
                    onClick={() => dispatch({ type: 'DELETE_CATEGORY', payload: cat.id })}
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
          <button onClick={onOpenShortcuts} className="w-full flex items-center gap-3 p-2.5 rounded-xl bg-white/80 border border-pink-200/60 active:bg-pink-50 transition-colors text-left">
            <span className="w-8 h-8 rounded-lg bg-pink-100 flex items-center justify-center text-base"><Grid3x3 size={16} className="text-pink-500" /></span>
            <span className="flex-1 text-sm text-gray-700">快捷记账管理</span>
            <span className="text-[10px] text-pink-400">自定义 ›</span>
          </button>
          <button onClick={onOpenImport} className="w-full flex items-center gap-3 p-2.5 rounded-xl bg-white/80 border border-pink-200/60 active:bg-pink-50 transition-colors text-left">
            <span className="w-8 h-8 rounded-lg bg-pink-100 flex items-center justify-center text-base">📥</span>
            <span className="flex-1 text-sm text-gray-700">导入历史账本</span>
            <span className="text-[10px] text-pink-400">去导入 ›</span>
          </button>
          <button onClick={handleExport} className="w-full flex items-center gap-3 p-2.5 rounded-xl bg-pink-50 border border-pink-300 active:bg-pink-100 transition-colors text-left">
            <span className="w-8 h-8 rounded-lg bg-pink-100 flex items-center justify-center text-base"><Download size={16} className="text-pink-500" /></span>
            <span className="flex-1 text-sm text-pink-600 font-semibold">导出备份</span>
            <span className="text-[10px] text-pink-400">复制到剪贴板 ›</span>
          </button>
          <button onClick={handleExportCsv} className="w-full flex items-center gap-3 p-2.5 rounded-xl bg-white/80 border border-pink-200/60 active:bg-pink-50 transition-colors text-left">
            <span className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center text-base">📄</span>
            <span className="flex-1 text-sm text-gray-700">导出 CSV 表格</span>
            <span className="text-[10px] text-pink-400">Excel 可看 ›</span>
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
          <button
            onClick={() => setShowPaste(v => !v)}
            className="w-full flex items-center gap-3 p-2.5 rounded-xl bg-white/80 border border-pink-200/60 active:bg-pink-50 transition-colors text-left"
          >
            <span className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center text-base">📋</span>
            <span className="flex-1 text-sm text-gray-700">粘贴备份内容恢复</span>
            <span className="text-[10px] text-pink-400">{showPaste ? '收起' : '粘贴文本 ›'}</span>
          </button>
          {showPaste && (
            <div className="p-2.5 rounded-xl bg-white/80 border border-pink-200/60">
              <textarea
                value={pasteText}
                onChange={e => setPasteText(e.target.value)}
                placeholder="把复制的备份内容粘贴到这里…"
                className="w-full h-20 p-2 rounded-lg bg-white border border-pink-100 text-[10px] font-mono text-gray-600 outline-none focus:border-pink-300"
              />
              <button onClick={handlePasteRestore} className="w-full mt-2 py-2 rounded-lg bg-pink-400 text-white text-xs font-bold active:bg-pink-500 transition-colors">
                恢复
              </button>
            </div>
          )}
        </div>
        <p className="text-[10px] text-gray-400 px-2 mt-1.5 leading-relaxed">
          ℹ️ 奶茶日历的图片仅保存在本机，不参与备份导出。换手机或清除浏览器数据会丢失奶茶图片。
        </p>
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

      {/* Category add/edit modal */}
      {showCatModal && (
        <CategoryAddModal
          editingCat={editingCat}
          onClose={() => { setShowCatModal(false); setEditingCat(undefined); }}
        />
      )}

      {/* Storage detail overlay */}
      {showStorage && <StorageDetailPage onBack={() => setShowStorage(false)} />}
    </div>
  );
}
