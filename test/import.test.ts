import { parseImportText } from '../src/utils/importParser';
import { presetCategories } from '../src/store';

let pass = 0, fail = 0;
function eq(label: string, got: any, want: any) {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (ok) { pass++; }
  else { fail++; console.log(`✗ ${label}\n    got:  ${JSON.stringify(got)}\n    want: ${JSON.stringify(want)}`); }
}

const sample = `8.1 餐饮 35
8.2 交通 -12
8.3 工资 +12000
8.5 买菜 52.5
8.10 娱乐 88
今天花了`;

const r = parseImportText(sample, presetCategories);

eq('识别 5 笔（1 行无金额报错）', r.items.length, 5);
eq('错误行数 = 1', r.errors.length, 1);

eq('1) 8.1 餐饮 35', [r.items[0].date, r.items[0].type, r.items[0].categoryId, r.items[0].amount, r.items[0].note], ['2026-08-01', 'expense', 'c-food', 3500, '']);
eq('2) 8.2 交通 -12（负号=支出）', [r.items[1].date, r.items[1].type, r.items[1].categoryId, r.items[1].amount], ['2026-08-02', 'expense', 'c-transport', 1200]);
eq('3) 8.3 工资 +12000（加号=收入）', [r.items[2].date, r.items[2].type, r.items[2].categoryId, r.items[2].amount], ['2026-08-03', 'income', 'c-salary', 1200000]);
eq('4) 8.5 买菜 52.5（买菜→餐饮，小数）', [r.items[3].date, r.items[3].type, r.items[3].categoryId, r.items[3].amount, r.items[3].note], ['2026-08-05', 'expense', 'c-food', 5250, '']);
eq('5) 8.10 娱乐 88', [r.items[4].date, r.items[4].type, r.items[4].categoryId, r.items[4].amount], ['2026-08-10', 'expense', 'c-entertain', 8800]);

// 额外：中文日期 + 含备注（备注中分类词会被剥离，验证主字段即可）
const r2 = parseImportText('7月15日 看病 200 挂号费', presetCategories);
eq('中文日期 7月15日 看病 200', [r2.items[0]?.date, r2.items[0]?.categoryId, r2.items[0]?.amount, typeof r2.items[0]?.note], ['2026-07-15', 'c-medical', 20000, 'string']);

// 额外：完整日期
const r3 = parseImportText('2025/12/31 购物 999', presetCategories);
eq('完整日期 2025/12/31', r3.items.length === 1 && r3.items[0].date === '2025-12-31' && r3.items[0].categoryId === 'c-shopping' && r3.items[0].amount === 99900, true);

// 回归：自定义分类名不应泄漏进备注
const withCustom = [...presetCategories, { id: 'c-badminton', name: '羽毛球', type: 'expense', icon: '🏸', sort: 99 } as any];
const r4 = parseImportText('8.5 羽毛球 30', withCustom);
eq('自定义分类 羽毛球 备注应为空（不泄漏分类名）', r4.items[0]?.note, '');
eq('自定义分类 羽毛球 归类正确', r4.items[0]?.categoryId, 'c-badminton');

// 备注应保留非分类词
const r5 = parseImportText('8.5 餐饮 35 和朋友', presetCategories);
eq('备注保留非分类词「和朋友」', r5.items[0]?.note, '和朋友');

// 回归：无分类词的加号金额必须判为收入（本次数据恢复依赖此逻辑）
const r6 = parseImportText('2026-09-07 +1250.00 餐标', presetCategories);
eq('纯 + 金额判为收入', r6.items[0]?.type, 'income');
eq('纯 + 金额金额正确', r6.items[0]?.amount, 125000);
eq('纯 + 金额备注保留', r6.items[0]?.note, '餐标');

const r7 = parseImportText('2026-10-07 +690.86 十月上旬补款', presetCategories);
eq('收入归入其他收入', r7.items[0]?.categoryId, 'c-other-inc');
eq('收入备注完整', r7.items[0]?.note, '十月上旬补款');

// 回归：金额必须是最后一个数字，备注含数字不影响金额
const r8 = parseImportText('2026-09-12 居住 -60.00 酒店', presetCategories);
eq('分类 居住 金额正确', [r8.items[0]?.categoryId, r8.items[0]?.amount], ['c-home', 6000]);
eq('备注保留 酒店', r8.items[0]?.note, '酒店');

// 回归：备注里的数字不能被当成金额（711 / 2 水 / 10.8-10.20 这类）
const r9 = parseImportText('2026-09-13 餐饮 -20.60 711 关东煮 钙奶饼干', presetCategories);
eq('备注含 711 时金额仍为 20.60', r9.items[0]?.amount, 2060);
eq('备注含 711 时日期正确', r9.items[0]?.date, '2026-09-13');
eq('备注保留非数字部分', r9.items[0]?.note?.includes('关东煮'), true);

const r10 = parseImportText('2026-10-08 购物 -7.00 超市 雪糕 2 水', presetCategories);
eq('备注含「2水」时金额仍为 7.00', r10.items[0]?.amount, 700);

// 回归：原始格式「分类在前、金额在后」仍然正常（取最后一个数字）
const r11 = parseImportText('8.5 餐饮 52.5', presetCategories);
eq('旧格式 8.5 餐饮 52.5 金额正确', r11.items[0]?.amount, 5250);
const r12 = parseImportText('8.5 和朋友 餐饮 52.5 吃了饭', presetCategories);
eq('旧格式含多余数字仍取末位金额', r12.items[0]?.amount, 5250);

console.log(`\n解析器测试：${pass} 通过 / ${fail} 失败`);
if (fail > 0) process.exit(1);
