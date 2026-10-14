/**
 * IndexedDB 图片存储工具
 * 供自定义分类图标 + 奶茶图片共用。
 * 图片 >2MB 自动压缩到 800px JPEG。
 */

const DB_NAME = 'yunyun-images';
const DB_VERSION = 1;
const STORE_NAME = 'images';

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

/**
 * 压缩图片：>2MB 或 >800px 自动压缩
 * 返回 Blob（JPEG, quality 0.8）
 */
export function compressImage(file: Blob): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const MAX = 800;
        let { width, height } = img;
        if (width > MAX || height > MAX) {
          if (width >= height) {
            height = Math.round((height * MAX) / width);
            width = MAX;
          } else {
            width = Math.round((width * MAX) / height);
            height = MAX;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(file);
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob(
          blob => blob ? resolve(blob) : resolve(file),
          'image/jpeg',
          0.8
        );
      };
      img.onerror = () => reject(new Error('图片加载失败'));
      img.src = reader.result as string;
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

/**
 * 保存图片到 IndexedDB，返回 key
 */
export async function saveImage(blob: Blob): Promise<string> {
  const db = await openDb();
  const key = `img_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const req = store.put(blob, key);
    req.onsuccess = () => resolve(key);
    req.onerror = () => reject(req.error);
    tx.oncomplete = () => db.close();
  });
}

/**
 * 从 IndexedDB 取图片，返回 object URL
 */
export async function getImage(key: string): Promise<string | null> {
  if (!key) return null;
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const req = store.get(key);
    req.onsuccess = () => {
      const blob = req.result as Blob | undefined;
      if (blob) {
        resolve(URL.createObjectURL(blob));
      } else {
        resolve(null);
      }
    };
    req.onerror = () => reject(req.error);
    tx.oncomplete = () => db.close();
  });
}

/**
 * 删除图片
 */
export async function deleteImage(key: string): Promise<void> {
  if (!key) return;
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const req = store.delete(key);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
    tx.oncomplete = () => db.close();
  });
}

/** 统计图片总数 */
export async function countImages(): Promise<number> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const req = tx.objectStore(STORE_NAME).count();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
    tx.oncomplete = () => db.close();
  });
}

/**
 * 从文件上传图片：压缩 → 存 IndexedDB → 返回 key
 */
export async function uploadImage(file: File): Promise<string> {
  const compressed = await compressImage(file);
  return saveImage(compressed);
}
