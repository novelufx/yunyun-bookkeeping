import { useState } from 'react';
import { ChevronLeft, ChevronUp, ChevronDown, Check } from 'lucide-react';
import { useStore } from '../store.tsx';
import CategoryIcon from './CategoryIcon';

interface Props {
  onBack: () => void;
}

const MAX_SHORTCUTS = 8;

export default function ShortcutsPage({ onBack }: Props) {
  const { state, dispatch } = useStore();
  const [selected, setSelected] = useState<string[]>([...state.shortcutCategories]);

  const expenseCats = state.categories.filter(c => c.type === 'expense');

  const toggle = (id: string) => {
    if (selected.includes(id)) {
      setSelected(selected.filter(s => s !== id));
    } else if (selected.length < MAX_SHORTCUTS) {
      setSelected([...selected, id]);
    }
  };

  const moveUp = (idx: number) => {
    if (idx <= 0) return;
    const arr = [...selected];
    [arr[idx - 1], arr[idx]] = [arr[idx], arr[idx - 1]];
    setSelected(arr);
  };

  const moveDown = (idx: number) => {
    if (idx >= selected.length - 1) return;
    const arr = [...selected];
    [arr[idx + 1], arr[idx]] = [arr[idx], arr[idx + 1]];
    setSelected(arr);
  };

  const handleSave = () => {
    dispatch({ type: 'SET_SHORTCUTS', payload: selected });
    onBack();
  };

  const selectedCats = selected
    .map(id => state.categories.find(c => c.id === id))
    .filter((c): c is NonNullable<typeof c> => !!c);

  return (
    <div className="absolute inset-0 z-30 flex flex-col animate-slide-up">
      <div className="absolute inset-0 bg-pink-50/95 backdrop-blur-xl" />
      <div className="relative flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center justify-between px-4 pt-4 pb-2">
          <button onClick={onBack} className="p-2 rounded-xl bg-white/85 border border-pink-200/70 active:bg-pink-50 transition-colors">
            <ChevronLeft size={20} className="text-gray-500" />
          </button>
          <p className="text-sm font-bold text-gray-700">快捷记账管理 🎀</p>
          <button
            onClick={handleSave}
            className="px-3 py-1.5 rounded-xl bg-pink-400 text-white text-xs font-bold active:bg-pink-500 transition-colors"
          >
            保存
          </button>
        </div>

        <div className="flex-1 overflow-y-auto scrollbar-hide px-4 pb-4">
          {/* Selected (ordered) */}
          <div className="glass p-4 mb-3">
            <p className="text-xs font-bold text-gray-700 mb-2">
              已选分类（{selected.length}/{MAX_SHORTCUTS}）— 上下排序
            </p>
            {selectedCats.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-4">还没有选择分类，从下方挑选吧~</p>
            ) : (
              <div className="space-y-1.5">
                {selectedCats.map((cat, idx) => (
                  <div key={cat.id} className="flex items-center gap-2 p-2 rounded-xl bg-white/80 border border-pink-200/60">
                    <span className="text-xs text-gray-300 w-4">{idx + 1}</span>
                    <CategoryIcon category={cat} className="text-base" />
                    <span className="text-sm text-gray-700 flex-1">{cat.name}</span>
                    <button
                      onClick={() => moveUp(idx)}
                      disabled={idx === 0}
                      className="p-1 rounded-lg active:bg-pink-50 disabled:opacity-30 transition-colors"
                    >
                      <ChevronUp size={14} className="text-gray-400" />
                    </button>
                    <button
                      onClick={() => moveDown(idx)}
                      disabled={idx === selectedCats.length - 1}
                      className="p-1 rounded-lg active:bg-pink-50 disabled:opacity-30 transition-colors"
                    >
                      <ChevronDown size={14} className="text-gray-400" />
                    </button>
                    <button
                      onClick={() => toggle(cat.id)}
                      className="p-1 rounded-lg active:bg-rose-50 transition-colors"
                    >
                      <span className="text-xs text-rose-400">移除</span>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* All expense categories */}
          <div className="glass p-4">
            <p className="text-xs font-bold text-gray-700 mb-2">所有支出分类</p>
            <div className="grid grid-cols-4 gap-2">
              {expenseCats.map(cat => {
                const isSelected = selected.includes(cat.id);
                const canSelect = selected.length < MAX_SHORTCUTS;
                return (
                  <button
                    key={cat.id}
                    onClick={() => toggle(cat.id)}
                    disabled={!isSelected && !canSelect}
                    className={`cat-chip relative ${isSelected ? 'bg-pink-100 border-pink-300' : ''} ${!isSelected && !canSelect ? 'opacity-40' : ''}`}
                  >
                    <CategoryIcon category={cat} />
                    <span className="label">{cat.name}</span>
                    {isSelected && (
                      <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-pink-400 flex items-center justify-center">
                        <Check size={10} className="text-white" strokeWidth={3} />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
