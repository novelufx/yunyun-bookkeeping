import { useRef, useState } from 'react';
import { Camera, Smile } from 'lucide-react';
import EmojiPicker from './EmojiPicker';
import { uploadImage } from '../utils/imageDb';

interface Props {
  onSelect: (icon: string, iconType: 'emoji' | 'image') => void;
  onClose: () => void;
}

export default function IconPicker({ onSelect, onClose }: Props) {
  const [tab, setTab] = useState<'emoji' | 'image'>('emoji');
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    setUploading(true);
    try {
      const key = await uploadImage(file);
      onSelect(key, 'image');
    } catch {
      alert('图片上传失败，请重试');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="absolute inset-0 z-50 flex items-end animate-fade-in" onClick={onClose}>
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />
      <div
        className="glass-strong w-full p-4 pb-safe relative z-10 animate-slide-up"
        onClick={e => e.stopPropagation()}
      >
        {/* Tab switcher */}
        <div className="flex gap-2 mb-3">
          <button
            onClick={() => setTab('emoji')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-colors ${
              tab === 'emoji' ? 'bg-pink-400 text-white' : 'bg-white/80 text-gray-500 border border-pink-200/60'
            }`}
          >
            <Smile size={14} />
            Emoji
          </button>
          <button
            onClick={() => setTab('image')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-colors ${
              tab === 'image' ? 'bg-pink-400 text-white' : 'bg-white/80 text-gray-500 border border-pink-200/60'
            }`}
          >
            <Camera size={14} />
            自定义图片
          </button>
        </div>

        {/* Content */}
        {tab === 'emoji' ? (
          <EmojiPicker onSelect={(emoji) => onSelect(emoji, 'emoji')} />
        ) : (
          <div className="text-center py-6">
            {uploading ? (
              <p className="text-sm text-gray-500">正在上传压缩... 🔄</p>
            ) : (
              <>
                <p className="text-sm text-gray-500 mb-3">从相册选一张图片作为分类图标</p>
                <button
                  onClick={() => fileRef.current?.click()}
                  className="btn-pink"
                >
                  选择图片
                </button>
                <p className="text-[10px] text-gray-400 mt-2">大于 2MB 会自动压缩</p>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={e => {
                    const f = e.target.files?.[0];
                    if (f) handleFile(f);
                    e.target.value = '';
                  }}
                />
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
