import { useState, useRef } from 'react';
import { X, Camera, Trash2 } from 'lucide-react';
import { useStore, genId, formatMoney } from '../store.tsx';
import { TEA_BRANDS, TEA_SUGAR, TEA_ICE } from '../types';
import type { MilkTeaEntry } from '../types';
import { uploadImage, deleteImage, compressImage } from '../utils/imageDb';
import TeaImage from './TeaImage';

interface Props {
  editingTea?: MilkTeaEntry;
  onClose: () => void;
}

export default function TeaAddPage({ editingTea, onClose }: Props) {
  const { state, dispatch } = useStore();
  const [date, setDate] = useState(editingTea?.date || new Date().toISOString().slice(0, 10));
  const [brand, setBrand] = useState(editingTea?.brand || TEA_BRANDS[0]);
  const [customBrand, setCustomBrand] = useState(
    editingTea?.brand && !TEA_BRANDS.includes(editingTea.brand) ? editingTea.brand : ''
  );
  const [isCustomBrand, setIsCustomBrand] = useState(
    editingTea?.brand ? !TEA_BRANDS.includes(editingTea.brand) : false
  );
  const [price, setPrice] = useState(editingTea ? (editingTea.price / 100).toFixed(2) : '');
  const [sugar, setSugar] = useState(editingTea?.sugar || '五分糖');
  const [ice, setIce] = useState(editingTea?.ice || '少冰');
  const [note, setNote] = useState(editingTea?.note || '');

  // Image: keep either an existing key or a new blob
  const [imgKey, setImgKey] = useState(editingTea?.imgKey || '');
  const [newBlob, setNewBlob] = useState<Blob | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    try {
      const compressed = await compressImage(file);
      // Show preview
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      const url = URL.createObjectURL(compressed);
      setPreviewUrl(url);
      setNewBlob(compressed);
    } catch {
      alert('图片处理失败，请重试');
    }
  };

  const hasImage = !!imgKey || !!newBlob;

  const handleSave = async () => {
    if (!hasImage) {
      alert('请先上传一杯奶茶的图片~');
      return;
    }

    setUploading(true);
    let finalImgKey = imgKey;

    try {
      // If new image, upload to IndexedDB
      if (newBlob) {
        finalImgKey = await uploadImage(newBlob);
        // If editing and had old image, delete old one
        if (editingTea?.imgKey && editingTea.imgKey !== finalImgKey) {
          await deleteImage(editingTea.imgKey);
        }
      }

      const finalBrand = isCustomBrand ? (customBrand.trim() || '未知') : brand;
      const priceCents = Math.round(parseFloat(price) * 100) || 0;

      const entry: MilkTeaEntry = {
        id: editingTea?.id || genId(),
        date,
        brand: finalBrand,
        sugar,
        ice,
        price: priceCents,
        note: note.trim() || undefined,
        imgKey: finalImgKey,
      };

      if (editingTea) {
        dispatch({ type: 'EDIT_MILKTEA', payload: entry });
      } else {
        dispatch({ type: 'ADD_MILKTEA', payload: entry });
      }
      onClose();
    } catch {
      alert('保存失败，请重试');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async () => {
    if (!editingTea) return;
    if (editingTea.imgKey) {
      await deleteImage(editingTea.imgKey);
    }
    dispatch({ type: 'DELETE_MILKTEA', payload: editingTea.id });
    onClose();
  };

  return (
    <div className="absolute inset-0 z-40 flex flex-col animate-slide-up">
      <div className="absolute inset-0 bg-pink-50/95 backdrop-blur-xl" />
      <div className="relative flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center justify-between px-4 pt-4 pb-2 shrink-0">
          <button onClick={onClose} className="p-2 rounded-xl bg-white/85 border border-pink-200/70 active:bg-pink-50 transition-colors">
            <X size={20} className="text-gray-500" />
          </button>
          <p className="text-sm font-bold text-gray-700">
            {editingTea ? '编辑奶茶' : '加一杯奶茶'} 🧋
          </p>
          <button
            onClick={handleSave}
            disabled={uploading || !hasImage}
            className="px-4 py-2 rounded-xl bg-pink-400 text-white text-xs font-bold active:bg-pink-500 disabled:opacity-40 transition-colors"
          >
            {uploading ? '保存中...' : '保存'}
          </button>
        </div>

        <div className="flex-1 overflow-y-auto scrollbar-hide px-4 pb-4">
          {/* Image upload */}
          <div className="flex flex-col items-center mb-4 mt-2">
            <button
              onClick={() => fileRef.current?.click()}
              className="relative w-40 h-40 rounded-3xl bg-white/85 border-2 border-dashed border-pink-200/70 flex items-center justify-center overflow-hidden active:bg-pink-50 transition-colors"
            >
              {previewUrl ? (
                <img src={previewUrl} className="absolute inset-0 w-full h-full object-cover" alt="预览" />
              ) : imgKey ? (
                <TeaImage imgKey={imgKey} className="absolute inset-0 w-full h-full object-cover" />
              ) : (
                <div className="flex flex-col items-center">
                  <Camera size={32} className="text-pink-300 mb-1" />
                  <p className="text-xs text-pink-300">点击上传奶茶图片</p>
                  <p className="text-[10px] text-gray-400 mt-0.5">必传哦~</p>
                </div>
              )}
              {(previewUrl || imgKey) && (
                <div className="absolute bottom-1 right-1 px-2 py-0.5 rounded-full bg-black/40 text-white text-[9px]">
                  更换
                </div>
              )}
            </button>
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
          </div>

          {/* Date */}
          <div className="glass p-3 mb-3">
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400 shrink-0">日期</span>
              <input
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
                className="flex-1 bg-transparent text-sm text-gray-700 outline-none"
              />
            </div>
          </div>

          {/* Brand */}
          <div className="glass p-3 mb-3">
            <p className="text-xs text-gray-400 mb-2">品牌</p>
            <div className="flex flex-wrap gap-1.5">
              {TEA_BRANDS.map(b => (
                <button
                  key={b}
                  onClick={() => { setBrand(b); setIsCustomBrand(false); }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    !isCustomBrand && brand === b
                      ? 'bg-pink-400 text-white'
                      : 'bg-white/80 text-gray-600 border border-pink-200/60'
                  }`}
                >
                  {b}
                </button>
              ))}
              <button
                onClick={() => setIsCustomBrand(true)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  isCustomBrand
                    ? 'bg-pink-400 text-white'
                    : 'bg-white/80 text-gray-600 border border-pink-200/60'
                }`}
              >
                自定义
              </button>
            </div>
            {isCustomBrand && (
              <input
                type="text"
                value={customBrand}
                onChange={e => setCustomBrand(e.target.value)}
                placeholder="输入品牌名..."
                className="w-full mt-2 px-3 py-2 rounded-xl bg-white/80 border border-pink-200/60 text-sm text-gray-700 outline-none focus:border-pink-300"
                autoFocus
              />
            )}
          </div>

          {/* Price */}
          <div className="glass p-3 mb-3">
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400 shrink-0">价格</span>
              <span className="text-sm text-pink-400">¥</span>
              <input
                type="text"
                inputMode="decimal"
                value={price}
                onChange={e => {
                  const v = e.target.value.replace(/[^\d.]/g, '');
                  if (v === '' || /^\d+\.?\d{0,2}$/.test(v)) setPrice(v);
                }}
                placeholder="0.00"
                className="flex-1 bg-transparent text-sm text-gray-700 outline-none"
              />
            </div>
          </div>

          {/* Sugar */}
          <div className="glass p-3 mb-3">
            <p className="text-xs text-gray-400 mb-2">糖度</p>
            <div className="flex flex-wrap gap-1.5">
              {TEA_SUGAR.map(s => (
                <button
                  key={s}
                  onClick={() => setSugar(s)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors ${
                    sugar === s
                      ? 'bg-pink-400 text-white'
                      : 'bg-white/80 text-gray-600 border border-pink-200/60'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Ice */}
          <div className="glass p-3 mb-3">
            <p className="text-xs text-gray-400 mb-2">冰度</p>
            <div className="flex flex-wrap gap-1.5">
              {TEA_ICE.map(i => (
                <button
                  key={i}
                  onClick={() => setIce(i)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors ${
                    ice === i
                      ? 'bg-pink-400 text-white'
                      : 'bg-white/80 text-gray-600 border border-pink-200/60'
                  }`}
                >
                  {i}
                </button>
              ))}
            </div>
          </div>

          {/* Note */}
          <div className="glass p-3 mb-3">
            <input
              type="text"
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="添加备注..."
              className="w-full bg-transparent text-sm text-gray-700 outline-none"
            />
          </div>

          {/* Delete (editing only) */}
          {editingTea && (
            <button
              onClick={() => {
                if (confirm('确定删除这杯奶茶吗？图片也会一并删除~')) {
                  handleDelete();
                }
              }}
              className="w-full py-3 rounded-2xl bg-white/80 border border-rose-200 text-rose-400 text-sm font-medium active:bg-rose-50 transition-colors flex items-center justify-center gap-2"
            >
              <Trash2 size={16} />
              删除这杯奶茶
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
