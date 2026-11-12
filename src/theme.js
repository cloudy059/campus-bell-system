/* ============================================================
   主题模式（跟随系统 / 深色 / 亮色）—— 主界面与迷你悬浮条共用
   系统主题来源：Chromium 的 prefers-color-scheme（Electron 默认
   nativeTheme.themeSource = 'system'，两者一致）；主进程 nativeTheme
   的广播会覆盖此初值，作为系统切换时的权威通知。
   ============================================================ */
(function () {
  'use strict';
  const STORE_KEY = 'campus-bell-theme-mode';
  const DEFAULT_MODE = 'system';
  const MODES = ['system', 'dark', 'light'];
  const mq = typeof window.matchMedia === 'function'
    ? window.matchMedia('(prefers-color-scheme: dark)') : null;
  let systemIsDark = mq ? mq.matches : true;
  const listeners = [];
  let bound = false;

  /** 非法 / 缺失值一律回落到默认的「跟随系统」 */
  function normalize(v) { return MODES.indexOf(v) >= 0 ? v : DEFAULT_MODE; }
  /** 把模式解析成真正写入 body[data-theme] 的值 */
  function resolve(mode) {
    const m = normalize(mode);
    return m === 'system' ? (systemIsDark ? 'dark' : 'light') : m;
  }
  /** 首屏缓存：避免异步读取 settings.json 之前先闪一下错误主题 */
  function readCached() {
    try { return normalize(window.localStorage.getItem(STORE_KEY)); } catch (_) { return DEFAULT_MODE; }
  }
  function remember(mode) {
    try { window.localStorage.setItem(STORE_KEY, normalize(mode)); } catch (_) { /* 隐私模式忽略 */ }
  }
  function applyToBody(mode) {
    if (document.body) document.body.dataset.theme = resolve(mode);
  }
  function systemLabel() { return systemIsDark ? '深色' : '亮色'; }

  /** 由主进程 nativeTheme 广播或测试注入系统主题；值未变则不重复刷新 */
  function setSystemDark(v) {
    const next = !!v;
    if (next === systemIsDark) return false;
    systemIsDark = next;
    listeners.forEach(fn => { try { fn(systemIsDark); } catch (_) { /* 单个订阅者异常不影响其他 */ } });
    return true;
  }
  function onSystemChange(fn) {
    if (typeof fn !== 'function') return;
    listeners.push(fn);
    if (bound || !mq) return;
    bound = true;
    const handler = (e) => setSystemDark(e.matches);
    if (mq.addEventListener) mq.addEventListener('change', handler);
    else if (mq.addListener) mq.addListener(handler); // 兼容旧版 Chromium
  }

  window.CampusBellTheme = {
    DEFAULT_MODE, MODES, normalize, resolve, readCached, remember,
    applyToBody, systemLabel, systemIsDark: () => systemIsDark,
    setSystemDark, onSystemChange
  };

  // 脚本在 body 末尾加载，document.body 已存在 -> 同步着色，无闪屏
  if (document.body) applyToBody(readCached());
  else document.addEventListener('DOMContentLoaded', () => applyToBody(readCached()), { once: true });
})();
