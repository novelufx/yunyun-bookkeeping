import { useState, useCallback } from 'react';
import { Home, List, BarChart3, Settings, Plus, Coffee } from 'lucide-react';
import { StoreProvider } from './store.tsx';
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
  const [activeTab, setActiveTab] = useState<TabKey>('home');
  const [showAdd, setShowAdd] = useState(false);
  const [editingTx, setEditingTx] = useState<Transaction | undefined>();
  const [defaultCategoryId, setDefaultCategoryId] = useState<string | undefined>();
  const [overlay, setOverlay] = useState<null | 'budget' | 'import' | 'shortcuts'>(null);

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
        {activeTab === 'home' && <HomePage onAdd={handleAdd} onOpenBudget={() => setOverlay('budget')} />}
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
