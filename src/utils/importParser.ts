import type { Category, TxType } from '../types';

export interface ParsedItem {
  date: string; // YYYY-MM-DD
  type: TxType;
  categoryId: string;
  amount: number; // cents
  note: string;
  ok: boolean;
}

export interface ParseResult {
  items: ParsedItem[];
  errors: { raw: string; reason: string }[];
}

const KEYWORD_MAP: { keys: string[]; catId: string; type: TxType }[] = [
  { keys: ['餐饮', '吃饭', '吃', '饭', '食', '外卖', '点餐', '菜', '早餐', '午餐', '晚餐', '夜宵', '奶茶', '咖啡', '饮料', '水果'], catId: 'c-food', type: 'expense' },
  { keys: ['交通', '打车', '出租', '地铁', '公交', '高铁', '火车', '机票', '车票', '加油', '停车', '过路', '滴滴', '出行', '的士'], catId: 'c-transport', type: 'expense' },
  { keys: ['购物', '买', '淘宝', '京东', '拼多多', '衣服', '服装', '鞋', '包', '化妆品', '数码', '日用品', '超市', '百货'], catId: 'c-shopping', type: 'expense' },
  { keys: ['房租', '物业', '水电', '电费', '水费', '燃气', '话费', '宽带', '居住', '房贷', '装修', '家居', '网费'], catId: 'c-home', type: 'expense' },
  { keys: ['教育', '书', '课本', '学费', '培训', '课程', '网课', '考试', '补课', '学习'], catId: 'c-edu', type: 'expense' },
  { keys: ['医疗', '药', '医院', '看病', '门诊', '挂号', '体检', '牙', '保健', '诊所'], catId: 'c-medical', type: 'expense' },
  { keys: ['娱乐', '电影', '游戏', '旅游', '旅行', '聚会', 'KTV', '游玩', '演出', '会员', '按摩'], catId: 'c-entertain', type: 'expense' },
  { keys: ['人情', '红包', '随礼', '份子', '礼金', '请客', '生日', '结婚', '白事', '送礼'], catId: 'c-social', type: 'expense' },
  { keys: ['工资', '薪资', '薪水', '发薪', '月薪', '收入', '俸'], catId: 'c-salary', type: 'income' },
  { keys: ['兼职', '外快', '副业', '打工', '稿费', '佣金'], catId: 'c-parttime', type: 'income' },
  { keys: ['退款', '退', '报销'], catId: 'c-refund', type: 'income' },
];

const OTHER_EXP = 'c-other-exp';
const OTHER_INC = 'c-other-inc';

function matchCategory(text: string, categories: Category[], forcedType?: TxType): { catId: string; type: TxType; matched: string } {
  // 1) 精确匹配现有分类（含自定义）
  for (const c of categories) {
    if (text.includes(c.name) && (!forcedType || c.type === forcedType)) {
      return { catId: c.id, type: c.type, matched: c.name };
    }
  }
  // 2) 关键词映射
  for (const m of KEYWORD_MAP) {
    if (m.keys.some(k => text.includes(k))) {
      if (!forcedType || m.type === forcedType) {
        const hit = m.keys.find(k => text.includes(k)) || '';
        return { catId: m.catId, type: m.type, matched: hit };
      }
    }
  }
  // 3) 仅 type 已知时回退 other
  if (forcedType === 'income') return { catId: OTHER_INC, type: 'income', matched: '' };
  return { catId: OTHER_EXP, type: 'expense', matched: '' };
}

function parseDate(text: string, today: Date): { date: string; rest: string } {
  let y = today.getFullYear(), mo = today.getMonth() + 1, d = today.getDate();
  let matched = '';

  const ymd = text.match(/(\d{4})([.\/-])(\d{1,2})([.\/-])(\d{1,2})/);
  if (ymd) {
    y = +ymd[1]; mo = +ymd[3]; d = +ymd[5]; matched = ymd[0];
  } else {
    const cn = text.match(/(\d{1,2})\s*月\s*(\d{1,2})\s*[日号]?/);
    if (cn) {
      mo = +cn[1]; d = +cn[2]; matched = cn[0];
    } else {
      const md = text.match(/(\d{1,2})([.\/-])(\d{1,2})/);
      if (md) {
        mo = +md[1]; d = +md[3]; matched = md[0];
      }
    }
  }

  // 月日合法性修正
  if (mo > 12 && d <= 12) { const t = mo; mo = d; d = t; }
  mo = Math.min(12, Math.max(1, mo));
  d = Math.min(31, Math.max(1, d));

  const date = `${y}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  const rest = matched ? text.replace(matched, ' ') : text;
  return { date, rest };
}

/**
 * 金额提取策略（按优先级）：
 *  1. 行首带符号金额： "-20.60 711 关东煮" → 20.60
 *  2. 任意带符号数字：  "-20.60 711 关东煮" → 20.60（带符号的一定是金额，备注里的裸数字不算）
 *  3. 最后一个数字：    "餐饮 35" → 35（兼容「分类在前、金额在后」的旧格式）
 */
function pickAmount(rest: string): string | null {
  const head = rest.match(/^\s*([+-]?\d+(?:\.\d+)?)(?=\s|$)/);
  if (head) return head[1];
  const all = rest.match(/[+-]?\d+(?:\.\d+)?/g);
  if (!all || all.length === 0) return null;
  const signed = all.filter(x => /^[+-]/.test(x));
  if (signed.length) return signed[signed.length - 1];
  return all[all.length - 1];
}

export function parseImportText(raw: string, categories: Category[]): ParseResult {
  const today = new Date();
  const items: ParsedItem[] = [];
  const errors: { raw: string; reason: string }[] = [];

  const lines = raw.split(/\r?\n/).map(l => l.trim()).filter(Boolean);

  for (const line of lines) {
    try {
      // 日期
      const { date, rest } = parseDate(line, today);

      // 金额（行首带符号优先，否则取最后一个数字）
      // 注意：正则必须带上 + 号，否则 "+1250" 会退化成无符号数字、收入被误判为支出
      const amtStr = pickAmount(rest);
      if (amtStr === null) {
        errors.push({ raw: line, reason: '没找到金额' });
        continue;
      }
      const negative = amtStr.startsWith('-');
      const positive = amtStr.startsWith('+');
      const amount = Math.round(parseFloat(amtStr.replace(/[+-]/, '')) * 100);
      if (amount <= 0 || isNaN(amount)) {
        errors.push({ raw: line, reason: '金额无效' });
        continue;
      }

      // 类型：先看符号，再看分类
      let forcedType: TxType | undefined;
      if (negative) forcedType = 'expense';
      else if (positive) forcedType = 'income';

      const { catId, type, matched } = matchCategory(rest, categories, forcedType);
      const finalType: TxType = forcedType || type;

      // 备注：去除日期、金额、分类关键词后的剩余
      let note = line;
      note = note.replace(/[+-]?\d+(?:\.\d+)?/g, ' '); // 去金额
      note = note.replace(/(\d{4})[.\/-]\d{1,2}[.\/-]\d{1,2}/g, ' ');
      note = note.replace(/\d{1,2}[.\/-]\d{1,2}/g, ' ');
      note = note.replace(/\d{1,2}\s*月\s*\d{1,2}\s*[日号]?/g, ' ');
      // 去分类关键词
      for (const m of KEYWORD_MAP) {
        for (const k of m.keys) note = note.split(k).join(' ');
      }
      // 去匹配到的分类名（含自定义分类，避免泄漏进备注）
      if (matched) note = note.split(matched).join(' ');
      note = note.replace(/[+\-¥$￥\s]+/g, ' ').trim();

      items.push({ date, type: finalType, categoryId: catId, amount, note, ok: true });
    } catch {
      errors.push({ raw: line, reason: '无法解析' });
    }
  }

  return { items, errors };
}
