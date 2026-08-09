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
  icon: string; // emoji
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

export type TabKey = 'home' | 'detail' | 'stats' | 'settings' | 'budget' | 'import';
