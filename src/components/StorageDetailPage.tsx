import { useMemo, useState, useEffect } from 'react';
import { ChevronLeft, HardDrive, Check, AlertTriangle, Download, RefreshCw, FileJson, FileSpreadsheet } from 'lucide-react';
import {
  useStore, exportState, exportCsv, markExported, loadState, mergeWithPresets, formatMoney,
} from '../store.tsx';
import {
  fingerprintOf, inspectSlots, readMeta, shouldRemindBackup, estimateUsage, formatBytes,
} from '../utils/storageHealth';
import { countImages } from '../utils/imageDb';

interface Props { onBack: () => void }

export default function StorageDetailPage({ onBack }: Props) {
  const { state, dispatch } = useStore();
  const [imgCount, setImgCount] = useState<number | null>(null);
  const [restored, setRestored] = useState<string | null>(null);
  const [, force] = useState(0);

  useEffect(() => {
    countImages().then(setImgCount).catch(() => setImgCount(null));
  }, []);

  const fp = useMemo(() => fingerprintOf(state), [state]);
  const slots = useMemo(() => inspectSlots(), [state, restored]);
  const meta = readMeta();
  const reminder = shouldRemindBackup(meta);
  const usage = estimateUsage();
  const healthyCount = slots.filter(s => s.exists && s.healthy).length;

  const download = (content: string, filename: string, type: string) => {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    markExported();
    setRestored(Date.now() as unknown as string);
  };

  const d = new Date();
  const stamp = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;

  const handleRestore = () => {
    const { state: best, recoveredFrom } = loadState();
    if (!recoveredFrom) return;
    if (!confirm(`将从「${recoveredFrom.includes('bk') ? '备份 ' + (recoveredFrom.slice(-1)) : '主存储'}」恢复 ${best.transactions.length} 笔账目，覆盖当前数据。确定继续吗？`)) return;
    dispatch({ type: 'LOAD', payload: mergeWithPresets(best) });
    setRestored(Date.now() as unknown as string);
    alert('已恢复 💕');
  };

  const canRestore = slots.some(s => s.exists && s.healthy && s.txCount > 0 && s.txCount !== fp.txCount);

  return (
    <div className="absolute inset-0 z-30 flex flex-col animate-slide-up">
      <div className="absolute inset-0 bg-pink-50/95 backdrop-blur-xl" />
      <div className="relative flex flex-col h-full">
        <div className="flex items-center justify-between px-4 pt-4 pb-2 shrink-0">
          <button onClick={onBack} className="p-2 rounded-xl bg-white/85 border border-pink-200/70 active:bg-pink-50 transition-colors">
            <ChevronLeft size={20} className="text-gray-500" />
          </button>
          <p className="text-sm font-bold text-gray-700">存储详情</p>
          <button onClick={() => force(x => x + 1)} className="p-2 rounded-xl bg-white/85 border border-pink-200/70 active:bg-pink-50 transition-colors">
            <RefreshCw size={16} className="text-gray-500" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto scrollbar-hide px-4 pb-6">
          {/* 账本指纹 */}
          <div className="glass-strong p-4 mb-3">
            <p className="text-xs text-gray-400 mb-2">本账本指纹</p>
            <div className="text-center py-2">
              <p className="text-3xl font-bold text-pink-500">{fp.txCount}</p>
              <p className="text-[10px] text-gray-400">笔账目 · {fp.teaCount} 杯奶茶</p>
            </div>
            <div className="flex justify-around text-center">
              <div>
                <p className="text-[10px] text-gray-400 mb-0.5">收入</p>
                <p className="text-xs font-bold text-pink-500">¥{formatMoney(fp.income)}</p>
              </div>
              <div>
                <p className="text-[10px] text-gray-400 mb-0.5">支出</p>
                <p className="text-xs font-bold text-rose-500">¥{formatMoney(fp.expense)}</p>
              </div>
              <div>
                <p className="text-[10px] text-gray-400 mb-0.5">记录区间</p>
                <p className="text-xs font-bold text-gray-700">{fp.firstDate ? fp.firstDate.slice(5) + ' ~ ' + fp.lastDate.slice(5) : '—'}</p>
              </div>
            </div>
            <p className="text-[10px] text-gray-400 text-center mt-2">
              {fp.txCount === 0
                ? '当前这个浏览器/微信里没有任何数据'
                : meta.lastExportAt
                  ? `上次导出：${new Date(meta.lastExportAt).toLocaleDateString('zh-CN')}`
                  : '还没有导出过备份'}
            </p>
          </div>

          {/* 健康状态 */}
          <div className="glass p-4 mb-3">
            <p className="text-xs font-bold text-gray-700 mb-2.5">数据副本健康度</p>
            {slots.map(s => (
              <div key={s.key} className="flex items-center gap-2 py-1.5 border-b border-pink-100/60 last:border-none">
                <span className={`w-2 h-2 rounded-full shrink-0 ${!s.exists ? 'bg-gray-300' : s.healthy ? 'bg-green-400' : 'bg-rose-400'}`} />
                <span className="text-xs text-gray-600 flex-1">{s.label}</span>
                {s.exists ? (
                  <>
                    <span className="text-[10px] text-gray-400">{s.txCount} 笔</span>
                    <span className="text-[10px] text-gray-300 w-12 text-right">{formatBytes(s.bytes)}</span>
                    {s.healthy
                      ? <Check size={12} className="text-green-400 shrink-0" />
                      : <AlertTriangle size={12} className="text-rose-400 shrink-0" />}
                  </>
                ) : (
                  <span className="text-[10px] text-gray-300">无数据</span>
                )}
              </div>
            ))}
            <div className="flex items-center justify-between mt-2 pt-2 border-t border-pink-100">
              <span className="text-[10px] text-gray-400">
                {healthyCount}/4 份正常 · 图片 {imgCount === null ? '—' : imgCount + ' 张'}
              </span>
              <span className="text-[10px] text-gray-400">{formatBytes(usage.usedBytes)} / 5 MB</span>
            </div>
            {canRestore && (
              <button onClick={handleRestore} className="w-full mt-2 py-2 rounded-xl bg-pink-50 border border-pink-200 text-pink-500 text-xs font-bold active:bg-pink-100 transition-colors">
                从副本恢复账本
              </button>
            )}
          </div>

          {/* 导出 */}
          <div className="glass p-4 mb-3">
            <p className="text-xs font-bold text-gray-700 mb-2.5">导出备份</p>
            <div className="space-y-2">
              <button
                onClick={() => download(exportState(state), `yunyun-bookkeeping-${stamp}.json`, 'application/json')}
                className="w-full flex items-center gap-2.5 p-3 rounded-xl bg-white/85 border border-pink-200/60 active:bg-pink-50 transition-colors text-left"
              >
                <FileJson size={16} className="text-pink-500 shrink-0" />
                <div className="flex-1">
                  <p className="text-xs font-semibold text-gray-700">JSON 备份（可完整还原）</p>
                  <p className="text-[10px] text-gray-400">含分类/账户/预算/快捷设置，换设备用这个</p>
                </div>
                <Download size={14} className="text-pink-400 shrink-0" />
              </button>
              <button
                onClick={() => download(exportCsv(state), `yunyun-bookkeeping-${stamp}.csv`, 'text/csv;charset=utf-8')}
                className="w-full flex items-center gap-2.5 p-3 rounded-xl bg-white/85 border border-pink-200/60 active:bg-pink-50 transition-colors text-left"
              >
                <FileSpreadsheet size={16} className="text-green-500 shrink-0" />
                <div className="flex-1">
                  <p className="text-xs font-semibold text-gray-700">CSV 表格（Excel/微信可看）</p>
                  <p className="text-[10px] text-gray-400">只能看和打印，不能导入还原</p>
                </div>
                <Download size={14} className="text-pink-400 shrink-0" />
              </button>
            </div>
            <div className="flex items-start gap-1.5 mt-2.5 px-1">
              <HardDrive size={12} className="text-gray-300 shrink-0 mt-0.5" />
              <p className="text-[10px] text-gray-400 leading-relaxed">
                导出的文件请发到「文件传输助手」或存网盘。只存在手机里的话，清理浏览器缓存时一起没。
              </p>
            </div>
          </div>

          {/* 容器说明 */}
          <div className="glass p-4">
            <p className="text-xs font-bold text-gray-700 mb-2">当前存储位置</p>
            <p className="text-[10px] text-gray-500 font-mono break-all mb-2">{location.origin}</p>
            <div className="flex items-start gap-1.5">
              <AlertTriangle size={12} className="text-amber-500 shrink-0 mt-0.5" />
              <p className="text-[10px] text-gray-500 leading-relaxed">
                浏览器按「协议+域名+端口」隔离存储。微信分身、不同浏览器、不同链接 = 4 个独立账本，数据互不相通。
                换地方看到「0 笔」不代表数据没了，先回来核对旧位置。
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}