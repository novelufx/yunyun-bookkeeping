import { useState } from 'react';
import { X, Check } from 'lucide-react';
import { useStore, genId } from '../store.tsx';
import type { Category, TxType } from '../types';
import CategoryIcon from './CategoryIcon';
import IconPicker from './IconPicker';

interface Props {
  editingCat?: Category;
  onClose: () => void;
}

export default function CategoryAddModal({ editingCat, onClose }: Props) {
  const { dispatch } = useStore();
  const [name, setName] = useState(editingCat?.name || '');
  const [txType, setTxType] = useState<TxType>(editingCat?.type || 'expense');
  const [icon, setIcon] = useState(editingCat?.icon || '📝');
  const [iconType, setIconType] = useState<'emoji' | 'image'>(editingCat?.iconType || 'emoji');
  const [showIconPicker, setShowIconPicker] = useState(false);

  const canSave = name.trim().length > 0;

  const handleSave = () => {
    if (!canSave) return;
    if (editingCat) {
      dispatch({
        type: 'UPDATE_CATEGORY',
        payload: { ...editingCat, name: name.trim(), icon, iconType },
      });
    } else {
      dispatch({
        type: 'ADD_CATEGORY',
        payload: {
          id: genId(),
          name: name.trim(),
          type: txType,
          icon,
          iconType,
          sort: 100,
        } as Category,
      });
    }
    onClose();
  };

  const tempCat: Category = { id: 'preview', name: name || '预览', type: txType, icon, iconType, sort: 0 };

  return (
    <div className="absolute inset-0 z-40 flex flex-col animate-slide-up">
      <div className="absolute inset-0 bg-pink-50/95 backdrop-blur-xl" />
      <div className="relative flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center justify-between px-4 pt-4 pb-2">
          <button onClick={onClose} className="p-2 rounded-xl bg-white/85 border border-pink-200/70 active:bg-pink-50 transition-colors">
            <X size={20} className="text-gray-500" />
          </button>
          <p className="text-sm font-bold text-gray-700">
            {editingCat ? '编辑分类' : '添加分类'} 🎀
          </p>
          <button
            onClick={handleSave}
            disabled={!canSave}
            className="px-3 py-1.5 rounded-xl bg-pink-400 text-white text-xs font-bold active:bg-pink-500 disabled:opacity-40 transition-colors"
          >
            <Check size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto scrollbar-hide px-4 py-4">
          {/* Icon preview */}
          <div className="flex flex-col items-center mb-4">
            <button
              onClick={() => setShowIconPicker(true)}
              className="w-20 h-20 rounded-3xl bg-white/85 border-2 border-pink-200/70 flex items-center justify-center text-4xl active:bg-pink-50 transition-colors mb-2"
            >
              <CategoryIcon category={tempCat} className="text-4xl" />
            </button>
            <p className="text-[10px] text-pink-400">点击图标更换</p>
          </div>

          {/* Name input */}
          <div className="glass p-4 mb-3">
            <p className="text-xs font-bold text-gray-700 mb-2">分类名称</p>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="如：奶茶、情侣、宠物..."
              className="w-full px-3 py-2.5 rounded-xl bg-white/80 border border-pink-200/60 text-sm text-gray-700 outline-none focus:border-pink-300"
              autoFocus
            />
          </div>

          {/* Type toggle (only for new categories) */}
          {!editingCat && (
            <div className="glass p-4 mb-3">
              <p className="text-xs font-bold text-gray-700 mb-2">分类类型</p>
              <div className="flex gap-2">
                <button
                  onClick={() => setTxType('expense')}
                  className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-colors ${
                    txType === 'expense' ? 'bg-rose-400 text-white' : 'bg-white/80 text-gray-500 border border-pink-200/60'
                  }`}
                >
                  支出
                </button>
                <button
                  onClick={() => setTxType('income')}
                  className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-colors ${
                    txType === 'income' ? 'bg-pink-400 text-white' : 'bg-white/80 text-gray-500 border border-pink-200/60'
                  }`}
                >
                  收入
                </button>
              </div>
            </div>
          )}

          {/* Emoji quick pick */}
          <div className="glass p-4">
            <p className="text-xs font-bold text-gray-700 mb-2">快捷 emoji</p>
            <div className="grid grid-cols-8 gap-1">
              {['🧋', '🍰', '🌹', '💑', '💝', '🐱', '🎮', '✨', '🎁', '🍕', '☕', '💄', '📱', '🚗', '🏠', '📚'].map(e => (
                <button
                  key={e}
                  onClick={() => { setIcon(e); setIconType('emoji'); }}
                  className={`w-8 h-8 flex items-center justify-center text-xl rounded-lg transition-colors ${
                    icon === e && iconType === 'emoji' ? 'bg-pink-200 border border-pink-400' : 'hover:bg-pink-100 active:bg-pink-200'
                  }`}
                >
                  {e}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Icon picker drawer */}
      {showIconPicker && (
        <IconPicker
          onSelect={(newIcon, newType) => {
            setIcon(newIcon);
            setIconType(newType);
            setShowIconPicker(false);
          }}
          onClose={() => setShowIconPicker(false)}
        />
      )}
    </div>
  );
}
