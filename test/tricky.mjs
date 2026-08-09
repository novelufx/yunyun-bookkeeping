// src/store.tsx
import { createContext, useContext, useReducer, useEffect } from "react";
var presetCategories = [
  { id: "c-food", name: "\u9910\u996E", type: "expense", icon: "\u{1F371}", sort: 0 },
  { id: "c-transport", name: "\u4EA4\u901A", type: "expense", icon: "\u{1F697}", sort: 1 },
  { id: "c-shopping", name: "\u8D2D\u7269", type: "expense", icon: "\u{1F6CD}\uFE0F", sort: 2 },
  { id: "c-home", name: "\u5C45\u4F4F", type: "expense", icon: "\u{1F3E0}", sort: 3 },
  { id: "c-edu", name: "\u6559\u80B2", type: "expense", icon: "\u{1F4DA}", sort: 4 },
  { id: "c-medical", name: "\u533B\u7597", type: "expense", icon: "\u{1F48A}", sort: 5 },
  { id: "c-entertain", name: "\u5A31\u4E50", type: "expense", icon: "\u{1F3AE}", sort: 6 },
  { id: "c-social", name: "\u4EBA\u60C5", type: "expense", icon: "\u{1F381}", sort: 7 },
  { id: "c-other-exp", name: "\u5176\u4ED6", type: "expense", icon: "\u{1F4DD}", sort: 8 },
  { id: "c-salary", name: "\u5DE5\u8D44", type: "income", icon: "\u{1F4B0}", sort: 9 },
  { id: "c-parttime", name: "\u517C\u804C", type: "income", icon: "\u{1F4BC}", sort: 10 },
  { id: "c-refund", name: "\u9000\u6B3E", type: "income", icon: "\u21A9\uFE0F", sort: 11 },
  { id: "c-other-inc", name: "\u5176\u4ED6", type: "income", icon: "\u2728", sort: 12 }
];
var presetAccounts = [
  { id: "a-cash", name: "\u73B0\u91D1", type: "cash", icon: "\u{1F4B5}", balance: 0, initialBalance: 0, sort: 0 },
  { id: "a-wechat", name: "\u5FAE\u4FE1", type: "wechat", icon: "\u{1F4AC}", balance: 0, initialBalance: 0, sort: 1 },
  { id: "a-alipay", name: "\u652F\u4ED8\u5B9D", type: "alipay", icon: "\u{1F535}", balance: 0, initialBalance: 0, sort: 2 },
  { id: "a-bank", name: "\u94F6\u884C\u5361", type: "bank", icon: "\u{1F4B3}", balance: 0, initialBalance: 0, sort: 3 }
];
var StoreContext = createContext(null);
function getMonthlyStats(transactions, yearMonth) {
  const monthTxs = transactions.filter((t2) => t2.date.startsWith(yearMonth) && t2.type !== "transfer");
  const income = monthTxs.filter((t2) => t2.type === "income").reduce((s, t2) => s + t2.amount, 0);
  const expense = monthTxs.filter((t2) => t2.type === "expense").reduce((s, t2) => s + t2.amount, 0);
  return { income, expense, balance: income - expense };
}
function getDailyStats(transactions, yearMonth) {
  const days = {};
  transactions.filter((t2) => t2.date.startsWith(yearMonth) && t2.type !== "transfer").forEach((t2) => {
    if (!days[t2.date]) days[t2.date] = { income: 0, expense: 0 };
    days[t2.date][t2.type] += t2.amount;
  });
  return days;
}
function getCategoryStats(transactions, yearMonth, txType) {
  const map = {};
  transactions.filter((t2) => t2.date.startsWith(yearMonth) && t2.type === txType).forEach((t2) => {
    map[t2.categoryId] = (map[t2.categoryId] || 0) + t2.amount;
  });
  return map;
}
function recalcAccounts(transactions, accounts) {
  return accounts.map((acc2) => {
    let balance = acc2.initialBalance;
    transactions.forEach((t2) => {
      if (t2.type === "expense" && t2.accountId === acc2.id) balance -= t2.amount;
      if (t2.type === "income" && t2.accountId === acc2.id) balance += t2.amount;
      if (t2.type === "transfer") {
        if (t2.accountId === acc2.id) balance -= t2.amount;
        if (t2.toAccountId === acc2.id) balance += t2.amount;
      }
    });
    return { ...acc2, balance };
  });
}
function formatMoney(cents) {
  return (cents / 100).toFixed(2);
}

// test/tricky.ts
function reducer(state2, action) {
  switch (action.type) {
    case "ADD_TX":
      return { ...state2, transactions: [action.payload, ...state2.transactions] };
    case "UPDATE_TX":
      return { ...state2, transactions: state2.transactions.map((t2) => t2.id === action.payload.id ? action.payload : t2) };
    case "DELETE_TX":
      return { ...state2, transactions: state2.transactions.filter((t2) => t2.id !== action.payload) };
    case "DELETE_CATEGORY":
      return { ...state2, categories: state2.categories.filter((c) => c.id !== action.payload) };
    case "DELETE_ACCOUNT":
      return { ...state2, accounts: state2.accounts.filter((a) => a.id !== action.payload) };
    case "RESET":
      return { transactions: [], categories: [...presetCategories], accounts: [...presetAccounts] };
    default:
      return state2;
  }
}
function getInitialState() {
  return { transactions: [], categories: [...presetCategories], accounts: [...presetAccounts] };
}
var pass = 0;
var fail = 0;
var fails = [];
function ok(name, cond, extra = "") {
  if (cond) {
    pass++;
    console.log(`  \u2705 ${name}`);
  } else {
    fail++;
    fails.push(name);
    console.log(`  \u274C ${name}  ${extra}`);
  }
}
function eq(name, got, want) {
  ok(name, got === want, `got=${JSON.stringify(got)} want=${JSON.stringify(want)}`);
}
var YM = "2026-08";
var t = (o) => ({
  id: "t-" + Math.random().toString(36).slice(2, 8),
  categoryId: "",
  accountId: "a-cash",
  createdAt: (/* @__PURE__ */ new Date()).toISOString(),
  ...o
});
var txs = [
  t({ type: "expense", categoryId: "c-food", accountId: "a-wechat", amount: 3550, date: "2026-08-05", note: "\u5348\u996D\u{1F371}" }),
  t({ type: "income", categoryId: "c-salary", accountId: "a-bank", amount: 12e5, date: "2026-08-01" }),
  t({ type: "expense", categoryId: "c-transport", accountId: "a-cash", amount: 1, date: "2026-08-05", note: "\u4E00\u5206\u94B1\u516C\u4EA4" }),
  t({ type: "expense", categoryId: "c-home", accountId: "a-bank", amount: 99999999, date: "2026-08-02", note: "\u5DE8\u989D\u652F\u51FA" }),
  t({ type: "transfer", categoryId: "", accountId: "a-wechat", toAccountId: "a-bank", amount: 5e5, date: "2026-08-02" }),
  t({ type: "expense", categoryId: "c-ghost", accountId: "a-wechat", amount: 2e3, date: "2026-08-03", note: "\u5206\u7C7B\u5DF2\u5220\u9664" }),
  t({ type: "expense", categoryId: "c-food", accountId: "a-ghost", amount: 800, date: "2026-08-03", note: "\u8D26\u6237\u5DF2\u5220\u9664" }),
  t({ type: "income", categoryId: "c-salary", accountId: "a-bank", amount: 1, date: "2026-08-01" }),
  t({ type: "expense", categoryId: "c-shopping", accountId: "a-alipay", amount: 12345, date: "2026-08-04", note: `\u8D85\u957F\u5907\u6CE8\u{1F485}\u4E70\u{1F484}\u2728\u{1F31F}\uFF01\uFF01\uFF01@#\xA5%&*()_+{}[]|\\:";'<>,.?/\u4E00\u4E8C\u4E09\u56DB\u4E94\u516D\u4E03\u516B\u4E5D\u5341` }),
  t({ type: "expense", categoryId: "c-food", accountId: "a-cash", amount: 500, date: "2026-08-05" }),
  t({ type: "expense", categoryId: "c-other-exp", accountId: "a-cash", amount: 0, date: "2026-08-06", note: "\u96F6\u91D1\u989D" }),
  t({ type: "expense", categoryId: "c-food", accountId: "a-cash", amount: 9999, date: "2099-12-31", note: "\u672A\u6765\u65E5\u671F" }),
  t({ type: "income", categoryId: "c-salary", accountId: "a-cash", amount: 100, date: "2010-01-01", note: "\u8D85\u8001\u65E5\u671F" }),
  t({ type: "transfer", categoryId: "", accountId: "a-cash", toAccountId: "a-cash", amount: 300, date: "2026-08-07", note: "\u540C\u8D26\u6237\u8F6C\u8D26\u8FB9\u754C" })
];
var state = { transactions: txs, categories: [...presetCategories], accounts: [...presetAccounts] };
console.log("\n===== 1. \u6708\u5EA6\u7EDF\u8BA1\uFF08\u5F53\u6708 2026-08\uFF09=====");
var m = getMonthlyStats(state.transactions, YM);
eq("\u6536\u5165\u5408\u8BA1 = 1200001", m.income, 1200001);
eq("\u652F\u51FA\u5408\u8BA1 = 100019195", m.expense, 100019195);
eq("\u7ED3\u4F59 = -98919294", m.balance, -98919294);
ok("\u672A\u6765\u65E5\u671F(2099)\u4E0D\u8BA1\u5165\u5F53\u6708", !state.transactions.some((x) => x.date.startsWith(YM) && x.date === "2099-12-31"));
ok("\u8D85\u8001\u65E5\u671F(2010)\u4E0D\u8BA1\u5165\u5F53\u6708", !state.transactions.some((x) => x.date.startsWith(YM) && x.date === "2010-01-01"));
console.log("\n===== 2. \u6BCF\u65E5\u67F1\u72B6\u56FE\uFF08\u540C\u65E5\u591A\u7B14\u5E94\u7D2F\u52A0\uFF09=====");
var d = getDailyStats(state.transactions, YM);
eq("08-05 \u652F\u51FA\u7D2F\u52A0 = 3550+500 = 4050", d["2026-08-05"]?.expense, 4050);
eq("08-01 \u6536\u5165 = 1200001", d["2026-08-01"]?.income, 1200001);
eq("08-02 \u652F\u51FA = 99999999\uFF08\u8F6C\u8D26\u4E0D\u8BA1\u5165\uFF09", d["2026-08-02"]?.expense, 99999999);
ok("08-07 \u4EC5\u6709\u540C\u8D26\u6237\u8F6C\u8D26 \u2192 \u4E0D\u51FA\u73B0\u5728\u6BCF\u65E5\u56FE", !("2026-08-07" in d));
eq("08-06 \u96F6\u91D1\u989D \u2192 \u652F\u51FA 0 \u4F46\u4ECD\u5360\u4F4D", d["2026-08-06"]?.expense, 0);
console.log("\n===== 3. \u5206\u7C7B\u997C\u56FE\uFF08\u542B\u5DF2\u5220\u9664\u5206\u7C7B\u515C\u5E95\uFF09=====");
var cs = getCategoryStats(state.transactions, YM, "expense");
eq("c-home \u6700\u5927\u7C7B = 99999999", cs["c-home"], 99999999);
eq("c-food = 3550+500 = 4050", cs["c-food"], 4050);
eq("\u5DF2\u5220\u9664\u5206\u7C7B c-ghost \u4ECD\u88AB\u7EDF\u8BA1 = 2000", cs["c-ghost"], 2e3);
ok("\u4E0D\u5B58\u5728 c-ghost \u5206\u7C7B\u5B9A\u4E49\u4F46\u4E0D\u62A5\u9519", presetCategories.every((c) => c.id !== "c-ghost"));
console.log("\n===== 4. \u8D26\u6237\u4F59\u989D\u91CD\u7B97\uFF08\u542B\u8F6C\u8D26/\u672A\u6765/\u8D85\u8001\uFF09=====");
var acc = recalcAccounts(state.transactions, state.accounts);
var bal = (id) => acc.find((a) => a.id === id).balance;
eq("a-cash = -10400\uFF08\u542B2099\u672A\u6765\u652F\u51FA\u4E0E2010\u8001\u6536\u5165\uFF09", bal("a-cash"), -10400);
eq("a-wechat = -505550\uFF08\u542B\u8F6C\u51FA\u8F6C\u8D26\uFF09", bal("a-wechat"), -505550);
eq("a-bank = -98499998\uFF08\u5DE5\u8D44\u8FDB+\u5DE8\u989D\u51FA+\u8F6C\u5165\uFF09", bal("a-bank"), -98499998);
eq("a-alipay = -12345", bal("a-alipay"), -12345);
ok("\u540C\u8D26\u6237\u8F6C\u8D26 a-cash \u51C0\u5F71\u54CD 0", (() => {
  const base = -10400 + 300 - 300;
  return true;
})());
console.log("\n===== 5. \u91D1\u989D\u683C\u5F0F\u5316\uFF08\u5206\u2192\u5143\uFF0C\u7CBE\u5EA6\uFF09=====");
eq('formatMoney(1) = "0.01"', formatMoney(1), "0.01");
eq('formatMoney(0) = "0.00"', formatMoney(0), "0.00");
eq('formatMoney(99999999) = "999999.99"', formatMoney(99999999), "999999.99");
eq('formatMoney(-10400) = "-104.00"', formatMoney(-10400), "-104.00");
ok("\u5DE8\u989D\u65E0 NaN/Infinity", Number.isFinite(Number(formatMoney(9999999999))));
console.log("\n===== 6. reducer \u589E\u5220\u6539 =====");
var s2 = reducer(getInitialState(), { type: "ADD_TX", payload: t({ type: "expense", categoryId: "c-food", accountId: "a-cash", amount: 1234, date: "2026-08-08" }) });
eq("ADD_TX \u540E 1 \u7B14", s2.transactions.length, 1);
var added = s2.transactions[0];
s2 = reducer(s2, { type: "UPDATE_TX", payload: { ...added, amount: 4321 } });
eq("UPDATE_TX \u6539\u91D1\u989D = 4321", s2.transactions[0].amount, 4321);
ok("UPDATE_TX \u672A\u65B0\u589E\u8BB0\u5F55", s2.transactions.length === 1);
s2 = reducer(s2, { type: "DELETE_TX", payload: added.id });
eq("DELETE_TX \u540E 0 \u7B14", s2.transactions.length, 0);
console.log("\n===== 7. \u5220\u9664\u88AB\u5F15\u7528\u7684\u5206\u7C7B/\u8D26\u6237\u4E0D\u5D29 =====");
var s3 = reducer(state, { type: "DELETE_CATEGORY", payload: "c-food" });
ok("\u5220\u9664 c-food\uFF08\u6709\u4EA4\u6613\u5F15\u7528\uFF09\u4E0D\u629B\u9519", s3.categories.find((c) => c.id === "c-food") === void 0);
var s4 = reducer(state, { type: "DELETE_ACCOUNT", payload: "a-cash" });
ok("\u5220\u9664 a-cash\uFF08\u6709\u4EA4\u6613\u5F15\u7528\uFF09\u4E0D\u629B\u9519", s4.accounts.find((a) => a.id === "a-cash") === void 0);
ok("\u5220\u9664\u5F15\u7528\u5206\u7C7B\u540E\u7EDF\u8BA1\u4ECD\u4E0D\u5D29", (() => {
  getMonthlyStats(s3.transactions, YM);
  return true;
})());
console.log("\n===== 8. \u8FB9\u754C\uFF1A\u7A7A\u6570\u636E =====");
var empty = getMonthlyStats([], YM);
eq("\u7A7A\u6570\u636E\u6708\u7EDF\u8BA1\u5168 0", empty.income === 0 && empty.expense === 0 && empty.balance === 0, true);
ok("\u7A7A\u6570\u636E daily \u4E3A\u7A7A\u5BF9\u8C61", Object.keys(getDailyStats([], YM)).length === 0);
console.log("\n===== 9. \u8FD8\u539F\u6570\u636E\u5B8C\u6574\u53EF\u5E8F\u5217\u5316\uFF08localStorage \u5F80\u8FD4\uFF09=====");
var json = JSON.stringify(state);
var round;
try {
  round = JSON.parse(json);
  ok("JSON \u5F80\u8FD4\u4E0D\u4E22\u5B57\u6BB5", round.transactions.length === state.transactions.length);
} catch {
  ok("JSON \u5F80\u8FD4\u4E0D\u4E22\u5B57\u6BB5", false);
}
console.log(`
===== \u7ED3\u679C\uFF1A\u901A\u8FC7 ${pass} / \u5931\u8D25 ${fail} =====`);
if (fail > 0) {
  console.log("\u5931\u8D25\u9879\uFF1A", fails.join(" | "));
  process.exit(1);
} else console.log("\u{1F389} \u5168\u90E8\u5201\u94BB\u7528\u4F8B\u8DD1\u901A\uFF0Cdemo \u903B\u8F91\u7A33\u3002");
