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

console.log(`\n解析器测试：${pass} 通过 / ${fail} 失败`);
if (fail > 0) process.exit(1);
