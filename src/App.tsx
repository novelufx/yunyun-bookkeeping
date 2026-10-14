import { useState, useCallback } from 'react';
import { Home, List, BarChart3, Settings, Plus, Coffee, AlertTriangle } from 'lucide-react';
import { StoreProvider, useStore } from './store.tsx';
import type { TabKey, Transaction } from './types';
import HomePage from './components/HomePage';
import DetailPage from './components/DetailPage';
import StatsPage from './components/StatsPage';
import SettingsPage from './components/SettingsPage';
import TeaPage from './components/TeaPage';
import AddTransaction from './components/AddTransaction';
import BudgetPage from './components/BudgetPage';
import ImportPage from './components/ImportPage';
import ShortcutsPage from './components/ShortcutsPage';

const tabs: { key: TabKey; label: string; icon: typeof Home }[] = [
  { key: 'home', label: '首页', icon: Home },
  { key: 'detail', label: '明细', icon: List },
  { key: 'tea', label: '奶茶', icon: Coffee },
  { key: 'stats', label: '统计', icon: BarChart3 },
  { key: 'settings', label: '设置', icon: Settings },
];

function AppInner() {
  const { health } = useStore();
  const [activeTab, setActiveTab] = useState<TabKey>('home');
  const [showAdd, setShowAdd] = useState(false);
  const [editingTx, setEditingTx] = useState<Transaction | undefined>();
  const [defaultCategoryId, setDefaultCategoryId] = useState<string | undefined>();
  const [overlay, setOverlay] = useState<null | 'budget' | 'import' | 'shortcuts'>(null);
  const [recoveredDismissed, setRecoveredDismissed] = useState(false);

  const handleAdd = useCallback((catId?: string) => {
    setDefaultCategoryId(catId);
    setEditingTx(undefined);
    setShowAdd(true);
  }, []);

  const handleEdit = useCallback((tx: Transaction) => {
    setEditingTx(tx);
    setDefaultCategoryId(undefined);
    setShowAdd(true);
  }, []);

  const handleCloseAdd = useCallback(() => {
    setShowAdd(false);
    setEditingTx(undefined);
    setDefaultCategoryId(undefined);
  }, []);

  return (
    <>
      {/* Main content */}
      <div className="flex-1 overflow-hidden relative">
        {activeTab === 'home' && (
          <HomePage
            onAdd={handleAdd}
            onOpenBudget={() => setOverlay('budget')}
            onOpenSettings={() => setActiveTab('settings')}
          />
        )}
        {activeTab === 'detail' && <DetailPage onEdit={handleEdit} />}
        {activeTab === 'tea' && <TeaPage />}
        {activeTab === 'stats' && <StatsPage />}
        {activeTab === 'settings' && <SettingsPage onOpenBudget={() => setOverlay('budget')} onOpenImport={() => setOverlay('import')} onOpenShortcuts={() => setOverlay('shortcuts')} />}

        {/* Budget / Import overlay pages */}
        {overlay === 'budget' && <BudgetPage onBack={() => setOverlay(null)} />}
        {overlay === 'import' && <ImportPage onBack={() => setOverlay(null)} />}
        {overlay === 'shortcuts' && <ShortcutsPage onBack={() => setOverlay(null)} />}

        {/* FAB on home */}
        {activeTab === 'home' && (
          <button
            onClick={() => handleAdd()}
            className="fab absolute right-4 bottom-4 z-10"
            aria-label="记一笔"
          >
            <Plus size={28} strokeWidth={2.5} />
          </button>
        )}
      </div>

      {/* Tab bar */}
      <nav className="tab-glass flex items-center justify-around px-2 pb-safe pt-2 shrink-0 z-20">
        {tabs.map(t => {
          const Icon = t.icon;
          const active = activeTab === t.key;
          return (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className={`flex flex-col items-center gap-0.5 py-1 px-2 rounded-xl transition-all ${
                active ? 'text-pink-500' : 'text-gray-400'
              }`}
            >
              <Icon size={22} strokeWidth={active ? 2.5 : 2} />
              <span className="text-[10px] font-medium">{t.label}</span>
            </button>
          );
        })}
      </nav>

      {/* 全局异常提示：写入失败 / 自动恢复（各弹一次） */}
      {health.writeError && (
        <div className="absolute inset-x-0 top-0 z-50 px-4 pt-14 animate-slide-up pointer-events-none">
          <div className="pointer-events-auto rounded-2xl bg-rose-500/95 backdrop-blur px-3.5 py-2.5 shadow-lg flex items-start gap-2">
            <AlertTriangle size={15} className="text-white shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-bold text-white">数据保存失败</p>
              <p className="text-[10px] text-white/85 leading-snug mt-0.5">{health.writeError}</p>
              <button
                onClick={() => setActiveTab('settings')}
                className="mt-1.5 text-[10px] bg-white/25 text-white px-2.5 py-1 rounded-lg font-semibold"
              >
                去处理
              </button>
            </div>
          </div>
        </div>
      )}

      {health.recoveredFrom && !recoveredDismissed && (
        <div
          className="absolute inset-0 z-50 flex items-center justify-center px-6 animate-fade-in"
          onClick={() => setRecoveredDismissed(true)}
        >
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />
          <div className="glass-strong p-5 w-full max-w-xs relative z-10" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xl">🔧</span>
              <p className="text-sm font-bold text-gray-800">数据异常，已自动恢复</p>
            </div>
            <p className="text-xs text-gray-500 leading-relaxed mb-1">
              主存储不可用，已从「备份 {health.recoveredFrom.slice(-1)}」恢复账目。
            </p>
            <p className="text-[10px] text-gray-400 leading-relaxed mb-3">
              请立刻到「设置 → 账本信息」导出一份备份，避免再次丢失。
            </p>
            <div className="flex gap-2">
              <button onClick={() => setRecoveredDismissed(true)} className="btn-pink-outline flex-1 text-xs py-2.5">知道了</button>
              <button onClick={() => { setRecoveredDismissed(true); setActiveTab('settings'); }} className="btn-pink flex-1 text-xs py-2.5">去备份</button>
            </div>
          </div>
        </div>
      )}

      {/* Add transaction overlay */}
      {showAdd && (
        <AddTransaction
          defaultCategoryId={defaultCategoryId}
          editingTx={editingTx}
          onClose={handleCloseAdd}
        />
      )}
    </>
  );
}

export default function App() {
  return (
    <StoreProvider>
      <AppInner />
    </StoreProvider>
  );
}
