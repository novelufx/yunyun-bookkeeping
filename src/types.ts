export type TxType = 'expense' | 'income' | 'transfer';

export interface Transaction {
  id: string;
  type: TxType;
  amount: number; // stored in cents
  categoryId: string;
  accountId: string;
  toAccountId?: string; // for transfer
  date: string; // YYYY-MM-DD
  note: string;
  createdAt: string;
}

export interface Category {
  id: string;
  name: string;
  type: TxType;
  icon: string; // emoji character or image key (when iconType='image')
  iconType?: 'emoji' | 'image'; // default 'emoji'
  sort: number;
}

export interface Account {
  id: string;
  name: string;
  type: string;
  icon: string; // emoji
  balance: number; // cents
  initialBalance: number; // cents
  sort: number;
}

export interface Budget {
  monthlyTotal?: number; // cents, 0/undefined = 未设
  categories: Record<string, number>; // catId -> cents
}

export type TabKey = 'home' | 'detail' | 'stats' | 'settings' | 'budget' | 'import' | 'tea';

export interface MilkTeaEntry {
  id: string;
  date: string; // YYYY-MM-DD
  brand: string;
  sugar?: string; // 糖度: 全糖/七分糖/五分糖/三分糖/无糖
  ice?: string; // 冰度: 正常冰/少冰/去冰/常温/热
  price: number; // cents
  note?: string;
  imgKey: string; // IndexedDB image key
}

export const TEA_BRANDS = [
  '喜茶', '蜜雪冰城', 'CoCo', '茶百道', '古茗',
  '一点点', '益禾堂', '茶颜悦色', '沪上阿姨', '霸王茶姬',
];

export const TEA_SUGAR = ['全糖', '七分糖', '五分糖', '三分糖', '无糖'];
export const TEA_ICE = ['正常冰', '少冰', '去冰', '常温', '热'];
