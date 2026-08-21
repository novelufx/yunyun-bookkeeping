import { useState, useEffect } from 'react';
import { getImage } from '../utils/imageDb';

interface Props {
  imgKey: string;
  className?: string;
  fallback?: string;
}

/**
 * 从 IndexedDB 加载奶茶图片并渲染。
 * 自动管理 object URL 生命周期。
 */
export default function TeaImage({ imgKey, className = '', fallback = '🧋' }: Props) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let objUrl: string | null = null;
    if (imgKey) {
      getImage(imgKey).then(u => {
        if (cancelled) {
          if (u) URL.revokeObjectURL(u);
        } else {
          objUrl = u;
          setUrl(u);
        }
      });
    }
    return () => {
      cancelled = true;
      if (objUrl) URL.revokeObjectURL(objUrl);
    };
  }, [imgKey]);

  if (url) {
    return <img src={url} className={className} alt="奶茶" />;
  }
  return <span className={className}>{fallback}</span>;
}
