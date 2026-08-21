import { useState, useMemo } from 'react';
import { EMOJI_GROUPS, ALL_EMOJIS } from '../utils/emojiData';

interface Props {
  onSelect: (emoji: string) => void;
}

export default function EmojiPicker({ onSelect }: Props) {
  const [activeGroup, setActiveGroup] = useState(0);
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    if (!search.trim()) return EMOJI_GROUPS[activeGroup].emojis;
    return ALL_EMOJIS.filter(e => e.includes(search.trim()));
  }, [search, activeGroup]);

  return (
    <div className="flex flex-col">
      {/* Search */}
      <input
        type="text"
        value={search}
        onChange={e => setSearch(e.target.value)}
        placeholder="搜索 emoji..."
        className="w-full px-3 py-2 rounded-xl bg-white/80 border border-pink-200/60 text-sm text-gray-700 outline-none mb-2"
      />

      {/* Group tabs */}
      {!search.trim() && (
        <div className="flex gap-1.5 overflow-x-auto scrollbar-hide mb-2 pb-1">
          {EMOJI_GROUPS.map((g, i) => (
            <button
              key={g.label}
              onClick={() => setActiveGroup(i)}
              className={`px-2.5 py-1 rounded-lg text-[10px] font-medium whitespace-nowrap transition-colors ${
                activeGroup === i
                  ? 'bg-pink-400 text-white'
                  : 'bg-white/80 text-gray-500 border border-pink-200/60'
              }`}
            >
              {g.label}
            </button>
          ))}
        </div>
      )}

      {/* Emoji grid */}
      <div className="grid grid-cols-8 gap-1 max-h-48 overflow-y-auto scrollbar-hide">
        {filtered.map((emoji, i) => (
          <button
            key={`${emoji}-${i}`}
            onClick={() => onSelect(emoji)}
            className="w-8 h-8 flex items-center justify-center text-xl rounded-lg hover:bg-pink-100 active:bg-pink-200 transition-colors"
          >
            {emoji}
          </button>
        ))}
        {filtered.length === 0 && (
          <p className="col-span-8 text-center text-xs text-gray-400 py-4">没有找到 emoji</p>
        )}
      </div>
    </div>
  );
}
