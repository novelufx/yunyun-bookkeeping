/**
 * 剪贴板工具
 * 微信内置浏览器屏蔽 Blob 文件下载，剪贴板是唯一可靠的导出通道。
 */

export async function copyToClipboard(text: string): Promise<boolean> {
  // 优先用标准 API（需要 HTTPS + 用户手势）
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // 继续走降级方案
  }
  // 降级：隐藏 textarea + execCommand
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.top = '0';
    ta.style.left = '0';
    ta.style.width = '1px';
    ta.style.height = '1px';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.focus();
    ta.setSelectionRange(0, text.length);
    let ok = false;
    try {
      ok = document.execCommand('copy');
    } catch {
      ok = false;
    }
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}

/** 触发浏览器下载（微信内会被拦，仅作为浏览器场景的通道） */
export function downloadFile(content: string, filename: string, mime: string): boolean {
  try {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    return true;
  } catch {
    return false;
  }
}

export function stampNow(): string {
  const d = new Date();
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
}

/** 是否微信内置浏览器（会屏蔽 Blob 下载） */
export function isWeChatBrowser(): boolean {
  const ua = navigator.userAgent.toLowerCase();
  return ua.includes('micromessenger');
}

export type ExportOutcome = 'copied' | 'downloaded' | 'failed';

/**
 * 统一导出入口：微信内优先走剪贴板，其他浏览器走文件下载。
 * 返回实际走了哪条路，供 UI 给准确提示（不再明明被拦截却说"已下载"）。
 */
export async function exportBackup(content: string, filename: string, mime: string): Promise<ExportOutcome> {
  if (isWeChatBrowser()) {
    const ok = await copyToClipboard(content);
    if (ok) return 'copied';
    // 剪贴板也失败时仍尝试下载（个别微信版本放行）
  }
  const ok = downloadFile(content, filename, mime);
  return ok ? 'downloaded' : 'failed';
}