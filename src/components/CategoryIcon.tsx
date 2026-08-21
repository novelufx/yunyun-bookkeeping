import { useState, useEffect } from 'react';
import type { Category } from '../types';
import { getImage } from '../utils/imageDb';

interface Props {
  category?: Category;
  /** fallback emoji if category not found */
  fallback?: string;
  className?: string;
}

/**
 * 渲染分类图标：emoji 字符或 IndexedDB 图片。
 * 统一处理图片加载与 object URL 生命周期。
 */
export default function CategoryIcon({ category, fallback = '📝', className = 'emoji' }: Props) {
  const [imgUrl, setImgUrl] = useState<string | null>(null);

  const icon = category?.icon || fallback;
  const iconType = category?.iconType || 'emoji';

  useEffect(() => {
    let cancelled = false;
    let url: string | null = null;

    if (iconType === 'image' && icon) {
      getImage(icon).then(u => {
        if (cancelled) {
          if (u) URL.revokeObjectURL(u);
        } else {
          url = u;
          setImgUrl(u);
        }
      });
    } else {
      setImgUrl(null);
    }

    return () => {
      cancelled = true;
      if (url) URL.revokeObjectURL(url);
    };
  }, [icon, iconType]);

  if (iconType === 'image' && imgUrl) {
    return <img src={imgUrl} className="w-5 h-5 rounded object-cover" alt="" />;
  }
  return <span className={className}>{icon}</span>;
}
