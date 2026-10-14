/**
 * exportBackup 路由测试
 * 核心断言：微信 UA 下必须走剪贴板，绝不能走 Blob 下载（会被拦截）
 */

let pass = 0, fail = 0;
function eq(name: string, got: unknown, want: unknown) {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (ok) { pass++; console.log(`  ✅ ${name}`); }
  else { fail++; console.log(`  ❌ ${name}  期望 ${JSON.stringify(want)} 实际 ${JSON.stringify(got)}`); }
}

// ---------- 环境 mock ----------
let clipboardWrites: string[] = [];
let clipboardWorks = true;
let downloads: { filename: string; mime: string }[] = [];
let downloadWorks = true;

const navigatorMock = {
  userAgent: '',
  get clipboard() {
    return clipboardWorks
      ? { writeText: async (t: string) => { clipboardWrites.push(t); } }
      : undefined;
  },
};

const docMock = {
  createElement: () => {
    const el: any = {
      _href: '', _download: '', style: {},
      set href(v: string) { this._href = v; },
      get href() { return this._href; },
      set download(v: string) { this._download = v; },
      get download() { return this._download; },
      click() { downloads.push({ filename: this._download, mime: '' }); },
    };
    return el;
  },
  body: { appendChild() {}, removeChild() {} },
  execCommand: () => clipboardWorks,
};

const windowMock = {
  get isSecureContext() { return true; },
  URL: { createObjectURL: () => 'blob:fake', revokeObjectURL() {} },
};

// ---------- 被测逻辑（与 src/utils/exportHelper.ts 同源，此处内联以便 Node 运行） ----------
function isWeChatBrowser(ua: string): boolean {
  return ua.toLowerCase().includes('micromessenger');
}

async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigatorMock.clipboard && windowMock.isSecureContext) {
      await navigatorMock.clipboard.writeText(text);
      return true;
    }
  } catch { /* fallthrough */ }
  try {
    const ta = docMock.createElement();
    ta.value = text;
    docMock.body.appendChild(ta);
    ta.setSelectionRange(0, text.length);
    const ok = docMock.execCommand('copy');
    docMock.body.removeChild(ta);
    return ok;
  } catch { return false; }
}

function downloadFile(content: string, filename: string, mime: string): boolean {
  if (!downloadWorks) return false;
  try {
    const a = docMock.createElement();
    a.href = 'blob:fake';
    a.download = filename;
    docMock.body.appendChild(a);
    a.click();
    docMock.body.removeChild(a);
    return true;
  } catch { return false; }
}

async function exportBackup(content: string, filename: string, mime: string): Promise<'copied' | 'downloaded' | 'failed'> {
  if (isWeChatBrowser(navigatorMock.userAgent)) {
    const ok = await copyToClipboard(content);
    if (ok) return 'copied';
  }
  return downloadFile(content, filename, mime) ? 'downloaded' : 'failed';
}

const reset = () => { clipboardWrites = []; downloads = []; clipboardWorks = true; downloadWorks = true; };

// ===== 1. 微信内：必须走剪贴板 =====
console.log('\n===== 1. 微信内置浏览器 =====');
reset();
navigatorMock.userAgent = 'Mozilla/5.0 ... MicroMessenger/8.0.49 ...';
const r1 = await exportBackup('{"a":1}', 'bk.json', 'application/json');
eq('微信内返回 copied', r1, 'copied');
eq('剪贴板被写入 1 次', clipboardWrites.length, 1);
eq('剪贴板内容就是备份 JSON', clipboardWrites[0], '{"a":1}');
eq('微信内没有触发文件下载', downloads.length, 0);

// ===== 2. 微信内剪贴板失败：降级到下载（而不是报错）=====
console.log('\n===== 2. 微信内剪贴板被禁 =====');
reset();
clipboardWorks = false;
const r2 = await exportBackup('{"a":1}', 'bk.json', 'application/json');
eq('降级为 downloaded', r2, 'downloaded');
eq('下载被触发', downloads.length, 1);
eq('文件名正确', downloads[0]?.filename, 'bk.json');

// ===== 3. 普通浏览器：走文件下载 =====
console.log('\n===== 3. 普通浏览器 =====');
reset();
navigatorMock.userAgent = 'Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 Chrome/120 Mobile Safari/537.36';
const r3 = await exportBackup('{"a":1}', 'bk.json', 'application/json');
eq('浏览器内返回 downloaded', r3, 'downloaded');
eq('下载被触发', downloads.length, 1);
eq('浏览器内不写剪贴板', clipboardWrites.length, 0);

// ===== 4. 两条路都断：返回 failed =====
console.log('\n===== 4. 下载也失败 =====');
reset();
downloadWorks = false;
const r4 = await exportBackup('{"a":1}', 'bk.json', 'application/json');
eq('返回 failed', r4, 'failed');
eq('不应谎报成功', r4 === 'downloaded' || r4 === 'copied', false);

// ===== 5. UA 识别 =====
console.log('\n===== 5. UA 识别 =====');
eq('MicroMessenger 识别为微信', isWeChatBrowser('Mozilla/5.0 MicroMessenger/8.0'), true);
eq('micromessenger 小写也识别', isWeChatBrowser('micromessenger/8.0'), true);
eq('Chrome 不是微信', isWeChatBrowser('Chrome/120'), false);
eq('Safari 不是微信', isWeChatBrowser('Safari/605.1.15'), false);
eq('空 UA 不是微信', isWeChatBrowser(''), false);

console.log(`\n===== 结果：通过 ${pass} / 失败 ${fail} =====`);
if (fail === 0) console.log('🎉 微信内必定走剪贴板，不会再被"可在浏览器打开"拦截');