'use strict';
/* ============================================================
   校园音乐铃声系统 — 渲染进程应用逻辑
   页面切换 / 自动打铃调度引擎 / 播放器 / 音乐库 / 方案管理 / 日志 / 设置
   ============================================================ */

/* ---------- SVG 图标（lucide 风格） ---------- */
const _svg = (inner) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${inner}</svg>`;
const ICONS = {
  bell: _svg('<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>'),
  grid: _svg('<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>'),
  calendar: _svg('<rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>'),
  filetext: _svg('<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><line x1="10" y1="9" x2="8" y2="9"/>'),
  music: _svg('<path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>'),
  list: _svg('<line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>'),
  sliders: _svg('<line x1="21" y1="4" x2="14" y2="4"/><line x1="10" y1="4" x2="3" y2="4"/><line x1="21" y1="12" x2="12" y2="12"/><line x1="8" y1="12" x2="3" y2="12"/><line x1="21" y1="20" x2="16" y2="20"/><line x1="12" y1="20" x2="3" y2="20"/><line x1="14" y1="2" x2="14" y2="6"/><line x1="8" y1="10" x2="8" y2="14"/><line x1="16" y1="18" x2="16" y2="22"/>'),
  play: _svg('<polygon points="6 3 20 12 6 21 6 3"/>'),
  pause: _svg('<rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/>'),
  stop: _svg('<rect x="5" y="5" width="14" height="14" rx="2"/>'),
  plus: _svg('<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>'),
  trash: _svg('<polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>'),
  pencil: _svg('<path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/>'),
  cut: _svg('<circle cx="6" cy="6" r="3"/><path d="M8.12 8.12 12 12"/><path d="M20 4 8.12 15.88"/><circle cx="6" cy="18" r="3"/><path d="M14.8 14.8 20 20"/>'),
  volume: _svg('<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/>'),
  x: _svg('<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>'),
  min: _svg('<line x1="5" y1="12" x2="19" y2="12"/>'),
  max: _svg('<rect x="5" y="5" width="14" height="14" rx="2"/>'),
  restore: _svg('<path d="M8 8V6a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-2"/><rect x="4" y="8" width="12" height="12" rx="2"/>'),
  check: _svg('<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>'),
  alert: _svg('<circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>'),
  info: _svg('<circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>')
};
const icon = (n) => ICONS[n] || '';

/* ---------- 工具函数 ---------- */
const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];
const pad = (n) => String(n).padStart(2, '0');
const clamp01 = (v) => Math.max(0, Math.min(1, v));
const dateKey = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const timeToMin = (t) => { const [h, m] = String(t).split(':').map(Number); return (h || 0) * 60 + (m || 0); };
const fmtHM = (d) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;
const fmtHMS = (sec) => `${pad(Math.floor(sec / 3600))}:${pad(Math.floor(sec / 60) % 60)}:${pad(Math.floor(sec) % 60)}`;
const fmtDur = (s) => (s == null || isNaN(s)) ? '--:--' : `${Math.floor(s / 60)}:${pad(Math.round(s % 60))}`;
const uid = () => 'u' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const WEEK_CN = ['日', '一', '二', '三', '四', '五', '六'];
const CATEGORIES = ['预备铃', '上课铃', '下课铃', '课间操', '午休', '放学', '仪式', '考试', '其他'];
const fmtDateCn = (d) => `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日 星期${WEEK_CN[d.getDay()]}`;
const fmtDateTime = (ts) => { const d = new Date(ts); return `${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`; };
const updateFill = (input, pct) => input.style.setProperty('--fill', pct + '%');
const eqHtml = () => `<div class="eq"><i></i><i></i><i></i><i></i></div>`;

/* ---------- 全局状态 ---------- */
const DEFAULT_SETTINGS = { volume: 0.85, fadeIn: 0, fadeOut: 0, outputDevice: 'default', tempMuteUntil: null, theme: 'dark', keepAwake: true };
const state = {
  library: { items: [] },
  schedules: { sets: [], overrides: [] },
  exams: { exams: [] },
  examSchemes: { schemes: [] },
  settings: { ...DEFAULT_SETTINGS },
  logs: { entries: [] },
  appInfo: { version: '', dataDir: '', autoLaunch: false },
  firedToday: {},      // bellId -> true（当日已触发）
  skippedToday: {},    // bellId -> true（当日静音跳过）
  todayKey: null,
  current: null,       // 当前播放 {url, musicId, bellName, kind}
  queue: null,         // 多曲连播队列 [{musicId, bellName, kind, note}]（随机/顺序连播模式）
  bellDeadline: null,  // 多曲连播的总限时（时间戳），到点整队淡出停止
  rotation: {},        // 顺序轮换进度：bellId -> 下次要播的池下标
  playing: false,
  paused: false,
  activePage: 'dashboard',
  seekDragging: false,
  fadeTimer: null,
  stopping: false,
  tlCounter: 0
};
const audio = new Audio();
audio.preload = 'auto';

/* ---------- 入口 ---------- */
document.addEventListener('DOMContentLoaded', init);

async function init() {
  injectIcons();
  bindTitlebar();
  bindNav();
  bindPlayer();
  bindDashboard();
  bindSchedulesPage();
  bindExamPage();
  bindMusicPage();
  bindLogsPage();
  bindSettingsPage();
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeModal(); });

  const [lib, sch, set, exa, esch] = await Promise.all([bellApi.library.list(), bellApi.schedules.load(), bellApi.settings.load(), bellApi.exams.load(), bellApi.examSchemes.load()]);
  state.library = lib && lib.items ? lib : { items: [] };
  state.schedules = sch && sch.sets ? { sets: sch.sets, overrides: sch.overrides || [] } : { sets: [], overrides: [] };
  state.exams = exa && exa.exams ? exa : { exams: [] };
  state.examSchemes = esch && esch.schemes ? esch : { schemes: [] };
  state.settings = { ...DEFAULT_SETTINGS, ...(set || {}) };
  applyTheme();
  if (state.settings.tempMuteUntil && Date.now() >= state.settings.tempMuteUntil) state.settings.tempMuteUntil = null;
  try { const lg = await bellApi.logs.load(); state.logs = lg || { entries: [] }; } catch { /* ignore */ }
  try { state.appInfo = await bellApi.app.info(); } catch { /* ignore */ }
  // 同步防休眠状态：主进程启动时已按设置开启，此处确保渲染端与主进程一致
  try { if ((state.appInfo.keepAwake || false) !== (state.settings.keepAwake !== false)) bellApi.app.setKeepAwake(state.settings.keepAwake !== false); } catch { /* ignore */ }

  await populateOutputs();
  applyOutputDevice();
  syncSettingsUI();
  renderSets();
  renderOverrides();
  renderMusic();
  renderLogs();
  updateLibCount();
  startTicker();
  measureMissingDurations();
}

function injectIcons() {
  $('#tb-logo').innerHTML = icon('bell');
  const navIcons = { dashboard: 'grid', schedules: 'calendar', exams: 'filetext', music: 'music', logs: 'list', settings: 'sliders' };
  $$('.nav-item').forEach(n => { n.querySelector('.nav-ico').innerHTML = icon(navIcons[n.dataset.page]); });
  $('#btn-win-min').innerHTML = icon('min');
  $('#btn-win-max').innerHTML = icon('max');
  $('#btn-win-close').innerHTML = icon('x');
  $('#btn-import').innerHTML = icon('plus') + '<span>导入音乐</span>';
  $('#btn-add-set').innerHTML = icon('plus') + '<span>新建方案</span>';
  $('#btn-add-exam').innerHTML = icon('plus') + '<span>添加考试</span>';
  $('#btn-add-override').innerHTML = icon('plus') + '<span>添加特殊日期</span>';
  $('#pb-volico').innerHTML = icon('volume');
  $('#pb-toggle').innerHTML = icon('play');
  $('#pb-stop').innerHTML = icon('stop');
  $('#music-empty .empty-ico').innerHTML = icon('music');
  const vol = $('#set-volume');
  updateFill(vol, state.settings.volume * 100);
  updateFill($('#pb-seek'), 0);
}

/* ============================================================
   标题栏 / 导航
   ============================================================ */
function bindTitlebar() {
  $('#btn-win-min').addEventListener('click', () => bellApi.window.minimize());
  $('#btn-win-max').addEventListener('click', () => bellApi.window.toggleMaximize());
  $('#btn-win-close').addEventListener('click', () => bellApi.window.close());
  $('#titlebar').addEventListener('dblclick', (e) => {
    if (!e.target.closest('.tb-btn')) bellApi.window.toggleMaximize();
  });
  bellApi.window.onStateChange((s) => { $('#btn-win-max').innerHTML = icon(s.maximized ? 'restore' : 'max'); });
}

function bindNav() {
  $$('.nav-item').forEach(item => {
    item.addEventListener('click', () => switchPage(item.dataset.page));
  });
}

function switchPage(page) {
  state.activePage = page;
  $$('.nav-item').forEach(n => n.classList.toggle('active', n.dataset.page === page));
  $$('.page').forEach(p => p.classList.toggle('active', p.id === 'page-' + page));
  if (page === 'schedules') { renderSets(); renderOverrides(); }
  if (page === 'exams') renderExams();
  if (page === 'music') {
    renderMusic();
    if (!$('#music-online').classList.contains('hidden')) renderOnline(); // 刷新"已入库"状态
  }
  if (page === 'logs') renderLogs();
  if (page === 'settings') syncSettingsUI();
  if (page === 'dashboard') { state.tlCounter = 0; const now = new Date(); renderTimeline(nowSecOf(now), resolveToday(now)); }
}
const nowSecOf = (d) => d.getHours() * 3600 + d.getMinutes() * 60 + d.getSeconds();
const secToHM = (sec) => `${pad(Math.floor(sec / 3600))}:${pad(Math.floor(sec / 60) % 60)}`;
/* 铃声实际触发秒数（考虑提前播放 advance，单位秒，最早不早于 00:00） */
const bellSecOf = (b) => Math.max(0, timeToMin(b.time) * 60 - (Number(b.advance) || 0));
/* 提前播放秒数 → 显示文案：90 → "提前1分30秒" */
const fmtAdv = (sec) => {
  sec = Math.round(Number(sec) || 0);
  if (sec <= 0) return '';
  if (sec < 60) return `提前${sec}秒`;
  const m = Math.floor(sec / 60), s = sec % 60;
  return s ? `提前${m}分${s}秒` : `提前${m}分`;
};
const bellDurOf = (b) => Number(b.duration) > 0 ? Math.round(Number(b.duration)) : 0;

/* ============================================================
   今日方案解析 + 调度引擎
   ============================================================ */
function resolveToday(now) {
  const key = dateKey(now);
  const ov = (state.schedules.overrides || []).find(o => o.date === key);
  if (ov) {
    if (ov.type === 'holiday') return { set: null, bells: [], label: '特殊安排 · 假期（不打铃）', holiday: true };
    const s = state.schedules.sets.find(x => x.id === ov.setId);
    if (s) return { set: s, bells: bellsOf(s), label: `特殊安排 · ${s.name}`, holiday: false };
  }
  const wd = now.getDay();
  const set = state.schedules.sets.find(s => s.enabled && (s.days || []).includes(wd));
  if (set) return { set, bells: bellsOf(set), label: `今日方案 · ${set.name}`, holiday: false };
  return { set: null, bells: [], label: '今日无方案（休息）', holiday: true };
}
const bellsOf = (set) => [...(set.bells || [])].sort((a, b) => timeToMin(a.time) - timeToMin(b.time));

function startTicker() {
  state.todayKey = dateKey(new Date());
  setInterval(tick, 250);
}

let lastTickSecond = -1;
function tick() {
  const now = new Date();
  const key = dateKey(now);
  if (key !== state.todayKey) { state.todayKey = key; state.firedToday = {}; state.skippedToday = {}; }

  const plan = resolveToday(now);
  const nowSec = nowSecOf(now);
  const muted = isMuted();

  // 时钟
  $('#clock-time').textContent = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
  $('#clock-date').textContent = fmtDateCn(now);
  $('#chip-set').textContent = plan.label;
  const cm = $('#chip-mute');
  if (muted) { cm.classList.remove('hidden'); cm.textContent = `已静音 · ${fmtHM(new Date(state.settings.tempMuteUntil))} 恢复`; }
  else cm.classList.add('hidden');

  // 触发铃声（5 秒宽限窗，当日防重复）
  const secMark = now.getSeconds();
  if (secMark !== lastTickSecond) {
    lastTickSecond = secMark;
    for (const b of plan.bells) {
      if (!b.enabled) continue;
      const bellSec = bellSecOf(b);
      const diff = nowSec - bellSec;
      if (diff >= 0 && diff < 5 && !state.firedToday[b.id]) {
        state.firedToday[b.id] = true;
        if (muted) {
          state.skippedToday[b.id] = true;
          addLog({ type: '跳过', bell: b.name, music: bellMusicLabel(b), result: '—', note: '临时静音' });
        } else {
          triggerBell(b, '自动', fmtAdv(b.advance));
        }
      }
    }
    // 考试播报：按考试日期独立触发，不受临时静音 / 考试模式影响（考试当天到点必定播报）
    for (const ex of (state.exams.exams || [])) {
      if (!ex.enabled || ex.date !== key) continue;
      for (const ev of examEventsOf(ex)) {
        const diff = nowSec - ev.sec;
        if (diff >= 0 && diff < 5 && !state.firedToday[ev.key]) {
          state.firedToday[ev.key] = true;
          triggerExamEvent(ex, ev, '考试');
        }
      }
    }
  }

  renderNext(nowSec, plan);
  // 仪表盘考试播报状态卡（每秒刷新；仅当天有考试时显示）
  if (state.activePage === 'dashboard') renderExamStatus(nowSec);

  // 仪表盘时间线（每 2 秒刷新一次）
  if (state.activePage === 'dashboard' && (state.tlCounter++ % 8 === 0)) renderTimeline(nowSec, plan);
  // 考试页倒计时（每 2 秒刷新一次）
  if (state.activePage === 'exams' && ((state.exCounter = (state.exCounter || 0) + 1) % 8 === 0)) updateExamCountdowns();

  // 侧栏运行状态
  $('#sb-status').innerHTML = muted
    ? '<span class="dot" style="background:var(--warn)"></span>临时静音中'
    : '<span class="dot dot-ok"></span>调度运行中';
}

/* 按实际触发时间找出下一条待响的铃声 */
const nextBellOf = (plan, nowSec) => {
  let best = null, bestSec = Infinity;
  for (const b of plan.bells) {
    if (!b.enabled) continue;
    const s = bellSecOf(b);
    if (s > nowSec && s < bestSec) { best = b; bestSec = s; }
  }
  return best;
};

/* 今天还未播的最近一个考试播报事件（铃声音符以外的事件源） */
function nextExamEventOf(nowSec) {
  const key = dateKey(new Date());
  let best = null;
  for (const ex of (state.exams.exams || [])) {
    if (!ex.enabled || ex.date !== key) continue;
    for (const ev of examEventsOf(ex)) {
      if (ev.sec > nowSec && (!best || ev.sec < best.sec)) best = { ex, ev, sec: ev.sec };
    }
  }
  return best;
}
/* 综合下一次事件：常规铃声与考试播报中更早的一个 */
function nextEventInfo(nowSec, plan) {
  const nb = nextBellOf(plan, nowSec);
  const examEv = nextExamEventOf(nowSec);
  if (nb && (!examEv || bellSecOf(nb) <= examEv.sec)) return { type: 'bell', bell: nb, sec: bellSecOf(nb) };
  if (examEv) return { type: 'exam', ex: examEv.ex, ev: examEv.ev, sec: examEv.sec };
  return null;
}

function renderNext(nowSec, plan) {
  const nx = nextEventInfo(nowSec, plan);
  if (nx) {
    $('#next-name').textContent = nx.type === 'exam'
      ? `考试播报 · ${nx.ex.subject} · ${nx.ev.label}`
      : nx.bell.name;
    $('#next-countdown').textContent = fmtHMS(nx.sec - nowSec);
    const musicTxt = nx.type === 'exam' ? musicName(nx.ev.musicId) : bellMusicLabel(nx.bell);
    const advTxt = nx.type === 'bell' && fmtAdv(nx.bell.advance) ? ' · ' + fmtAdv(nx.bell.advance) : '';
    $('#next-time').textContent = `${secToHM(nx.sec)} · ${musicTxt}${advTxt}`;
    $('#btn-preview-next').disabled = false;
  } else {
    $('#next-name').textContent = plan.bells.length ? '今日铃声已全部结束' : (plan.holiday ? '今日为假期，不打铃' : '今日无铃声安排');
    $('#next-countdown').textContent = '--:--:--';
    $('#next-time').textContent = '';
    $('#btn-preview-next').disabled = true;
  }
}

/* ============================================================
   临时静音
   ============================================================ */
const isMuted = () => !!(state.settings.tempMuteUntil && Date.now() < state.settings.tempMuteUntil);

function bindDashboard() {
  $('#btn-mute-30').addEventListener('click', () => setMute(Date.now() + 30 * 60 * 1000, '已静音 30 分钟'));
  $('#btn-mute-today').addEventListener('click', async () => {
    const ok = await confirmDialog({ title: '开启考试模式', message: '今日剩余时间将不再自动打铃，所有自动铃声会被跳过并记录到播放记录（不影响已设置的特殊日期方案）。确定开启？', okText: '开启' });
    if (!ok) return;
    const end = new Date(); end.setHours(23, 59, 59, 999);
    setMute(end.getTime(), '考试模式已开启，今日不再自动打铃');
  });
  $('#btn-mute-cancel').addEventListener('click', () => setMute(null, '已取消静音'));
  $('#btn-preview-next').addEventListener('click', () => {
    const now = new Date();
    const nx = nextEventInfo(nowSecOf(now), resolveToday(now));
    if (!nx) return;
    if (nx.type === 'exam') triggerExamEvent(nx.ex, nx.ev, '手动');
    else triggerBell(nx.bell, '手动', fmtAdv(nx.bell.advance));
  });
}
function setMute(until, msg) {
  state.settings.tempMuteUntil = until;
  saveSettingsSoon();
  updateMuteButtons(isMuted());
  toast(msg, 'success');
  const now = new Date();
  if (state.activePage === 'dashboard') renderTimeline(nowSecOf(now), resolveToday(now));
}
function updateMuteButtons(muted) {
  $('#btn-mute-cancel').classList.toggle('hidden', !muted);
  $('#btn-mute-30').classList.toggle('hidden', muted);
  $('#btn-mute-today').classList.toggle('hidden', muted);
  $('#mute-note').textContent = muted
    ? `静音至 ${fmtHM(new Date(state.settings.tempMuteUntil))}，期间自动铃声将被跳过并记录。`
    : '临时静音期间，自动铃声将被跳过并记录到播放记录。';
}

/* ============================================================
   播放器
   ============================================================ */
function bindPlayer() {
  $('#pb-toggle').addEventListener('click', togglePlayPause);
  $('#pb-stop').addEventListener('click', fadeStop);
  const seek = $('#pb-seek');
  seek.addEventListener('pointerdown', () => { state.seekDragging = true; });
  seek.addEventListener('pointerup', () => { state.seekDragging = false; });
  seek.addEventListener('input', () => {
    if (!state.current) return;
    const d = audio.duration;
    if (d && isFinite(d)) {
      const limit = state.current.duration > 0 ? Math.min(d, state.current.duration) : d;
      audio.currentTime = (seek.value / 100) * limit;
      updateFill(seek, seek.value);
    }
  });
  $('#pb-volume').addEventListener('input', (e) => applyVolume(e.target.value / 100));

  audio.addEventListener('timeupdate', () => {
    if (!state.current) return;
    const d = audio.duration;
    const limit = state.current.duration > 0 ? Math.min(d, state.current.duration) : d;
    $('#pb-time').textContent = `${fmtDur(audio.currentTime)} / ${fmtDur(limit)}`;
    if (!state.seekDragging && d && isFinite(d)) {
      const pct = limit > 0 ? Math.min(100, (audio.currentTime / limit) * 100) : 0;
      seek.value = pct;
      updateFill(seek, pct);
    }
    // 自定义播放时长：到时自动淡出停止（若设置了淡出，提前淡出秒数开始，正好在限时点结束）
    // 多曲连播时限时作用于整队（bellDeadline 为首曲起算的截止时间戳）
    if (!state.stopping && !state.paused) {
      const fo = Number(state.settings.fadeOut) || 0;
      if (state.bellDeadline && Date.now() >= state.bellDeadline - fo * 1000) fadeStop();
      else if (state.current.duration > 0 && audio.currentTime >= state.current.duration - fo) fadeStop();
    }
  });
  audio.addEventListener('ended', () => {
    state.playing = false; state.current = null;
    if (Array.isArray(state.queue) && state.queue.length) { playNextInQueue(); return; } // 多曲连播：接下一首
    state.queue = null; state.bellDeadline = null;
    updatePlayerBar(); if (state.activePage === 'music') renderMusic();
  });
  audio.addEventListener('error', () => {
    if (!state.current) return;
    const cur = state.current;
    addLog({ type: cur.kind, bell: cur.bellName || '—', music: musicName(cur.musicId), result: '失败', note: '音频解码失败' });
    toast('音频播放失败，文件可能已损坏', 'error');
    if (cur.kind === '自动' || cur.kind === '考试') notifyBellFailure(cur.bellName || '自动铃声', musicName(cur.musicId), '音频解码失败');
    state.playing = false; state.current = null;
    updatePlayerBar();
  });
}

/* 自动铃声播放失败 → 系统级托盘告警（用户可能不在屏幕前） */
function notifyBellFailure(bellName, music, reason) {
  try { bellApi.notify.show(`铃声播放失败：${bellName}`, `${reason}（音乐：${music}）。请检查铃声库文件，当天后续铃声不受影响。`); }
  catch { /* 通知失败不影响主流程 */ }
}

/* 按铃点的播放模式从曲目池挑选本次要播的曲目 */
function pickBellIds(b) {
  const pool = validPoolOf(b);
  if (pool.length <= 1) return { ids: [pool.length ? pool[0] : b.musicId], modeNote: '' };
  const mode = ['cycle-one', 'shuffle-all', 'order-all'].includes(b.playMode) ? b.playMode : 'shuffle-one';
  if (mode === 'cycle-one') {  // 顺序轮换：每次播一首，按顺序循环
    const idx = (state.rotation[b.id] || 0) % pool.length;
    state.rotation[b.id] = (idx + 1) % pool.length;
    return { ids: [pool[idx]], modeNote: '顺序轮换' };
  }
  if (mode === 'shuffle-all') { // 随机连播：全部曲目随机排序连播
    const ids = [...pool];
    for (let i = ids.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [ids[i], ids[j]] = [ids[j], ids[i]]; }
    return { ids, modeNote: '随机连播' };
  }
  if (mode === 'order-all') return { ids: [...pool], modeNote: '顺序连播' };
  return { ids: [pool[Math.floor(Math.random() * pool.length)]], modeNote: '随机轮换' };
}

async function triggerBell(b, kind, note) {
  const { ids, modeNote } = pickBellIds(b);
  const mid = ids[0];
  const mname = musicName(mid);
  const r = await bellApi.music.getUrl(mid);
  if (!r || !r.url) {
    toast(`铃声「${esc(mname)}」文件缺失，本次已跳过`, 'error');
    addLog({ type: kind, bell: b.name, music: mname, result: '失败', note: '文件缺失' });
    if (kind === '自动' || kind === '考试') notifyBellFailure(b.name, mname, '音乐文件缺失');
    return;
  }
  const fullNote = [note, modeNote].filter(Boolean).join(' · ');
  const dur = bellDurOf(b);
  const multi = ids.length > 1;
  // 多曲连播：限时作用于整队（首曲起算，到点整队淡出停止）；轮换模式每次只播一首，限时照旧
  state.bellDeadline = multi && dur > 0 ? Date.now() + dur * 1000 : null;
  state.queue = multi ? ids.slice(1).map(id => ({ musicId: id, bellName: b.name, kind, note: fullNote })) : null;
  playUrl(r.url, { musicId: mid, bellName: b.name, kind, duration: multi && dur > 0 ? 0 : dur, note: fullNote, keepQueue: multi });
}

/* 连播队列：接播下一首（文件缺失则跳过并继续） */
async function playNextInQueue() {
  const next = state.queue.shift();
  const r = await bellApi.music.getUrl(next.musicId);
  if (!r || !r.url) {
    toast(`铃声「${esc(musicName(next.musicId))}」文件缺失，已跳过`, 'error');
    addLog({ type: next.kind, bell: next.bellName || '—', music: musicName(next.musicId), result: '失败', note: '文件缺失' });
    if (Array.isArray(state.queue) && state.queue.length) { playNextInQueue(); return; }
    state.queue = null; state.bellDeadline = null;
    updatePlayerBar();
    return;
  }
  playUrl(r.url, { musicId: next.musicId, bellName: next.bellName, kind: next.kind, duration: 0, note: next.note, keepQueue: true });
}

/* 考试播报事件触发：组装为铃声对象复用 triggerBell（kind = '考试'） */
function triggerExamEvent(ex, ev, kind) {
  triggerBell({
    id: ev.key, time: secToHM(ev.sec), name: `考试播报·${ex.subject}·${ev.label}`,
    musicId: ev.musicId, enabled: true, advance: 0, duration: 0
  }, kind, '');
}

async function playUrl(url, { musicId, bellName, kind, duration = 0, note = '', displayName = '', keepQueue = false }) {
  stopFade();
  if (!keepQueue) { state.queue = null; state.bellDeadline = null; } // 新播放打断旧连播队列
  state.stopping = false;
  state.current = { url, musicId, bellName, kind, duration, note, displayName };
  const logMusic = displayName || musicName(musicId);
  audio.src = url;
  const target = clamp01(state.settings.volume);
  audio.volume = state.settings.fadeIn > 0 ? 0.0001 : target;
  try {
    await audio.play();
  } catch (err) {
    state.current = null;
    updatePlayerBar();
    toast('播放失败：' + (err && err.message ? err.message : '音频无法播放'), 'error');
    addLog({ type: kind, bell: bellName || '—', music: logMusic, result: '失败' });
    if (kind === '自动' || kind === '考试') notifyBellFailure(bellName || '自动铃声', logMusic, '音频无法播放');
    return;
  }
  if (state.settings.fadeIn > 0) fadeTo(target, state.settings.fadeIn);
  state.playing = true;
  state.paused = false;
  updatePlayerBar();
  if (state.activePage === 'music') renderMusic();
  const logNote = [note, duration > 0 ? `限时${duration}秒` : ''].filter(Boolean).join(' · ');
  addLog({ type: kind, bell: bellName || '—', music: logMusic, result: '成功', note: logNote });
}

async function playMusicById(id, kind) {
  const r = await bellApi.music.getUrl(id);
  if (!r || !r.url) { toast('音乐文件不存在', 'error'); return; }
  playUrl(r.url, { musicId: id, bellName: null, kind });
}

function togglePlayPause() {
  if (!state.current) { toast('当前没有正在播放的音频', 'info'); return; }
  if (state.playing) {
    audio.pause();
    state.playing = false;
    state.paused = true;
  } else {
    audio.play().then(() => {
      state.playing = true;
      state.paused = false;
      updatePlayerBar();
      if (state.activePage === 'music') renderMusic();
    }).catch(() => {});
  }
  updatePlayerBar();
  if (state.activePage === 'music') renderMusic();
}

function fadeStop() {
  if (state.stopping) return; // 已在停止流程中（如限时到达自动停止），避免重复触发
  const secs = Number(state.settings.fadeOut) || 0;
  if (secs > 0 && state.current) {
    state.stopping = true;
    const start = audio.volume;
    const t0 = Date.now();
    stopFade();
    state.fadeTimer = setInterval(() => {
      const p = Math.min(1, (Date.now() - t0) / (secs * 1000));
      audio.volume = Math.max(0.0001, start * (1 - p));
      if (p >= 1) { stopFade(); finishStop(); }
    }, 50);
  } else finishStop();
}
function finishStop() {
  stopFade();
  state.queue = null;       // 停止即整队结束（手动停止 / 连播总限时到达）
  state.bellDeadline = null;
  state.stopping = false;
  audio.pause();
  try { audio.currentTime = 0; } catch { /* ignore */ }
  state.playing = false;
  state.paused = false;
  state.current = null;
  audio.volume = clamp01(state.settings.volume);
  updatePlayerBar();
  if (state.activePage === 'music') renderMusic();
}
function fadeTo(target, secs) {
  stopFade();
  const start = audio.volume;
  const t0 = Date.now();
  state.fadeTimer = setInterval(() => {
    const p = Math.min(1, (Date.now() - t0) / (secs * 1000));
    audio.volume = start + (target - start) * p;
    if (p >= 1) stopFade();
  }, 50);
}
function stopFade() { if (state.fadeTimer) { clearInterval(state.fadeTimer); state.fadeTimer = null; } }

function updatePlayerBar() {
  const cur = state.current;
  $('#pb-name').textContent = cur ? (cur.bellName || cur.displayName || musicName(cur.musicId)) : '未在播放';
  $('#pb-sub').textContent = cur
    ? (cur.bellName
        ? `${cur.displayName || musicName(cur.musicId)}${cur.duration > 0 ? ` · 限时${cur.duration}秒` : ''}${cur.kind === '自动' ? ' · 自动打铃' : ' · 手动播放'}`
        : (cur.displayName ? '在线试听' : '铃声库试听'))
    : '等待下一次铃声';
  $('#pb-eq').classList.toggle('stopped', !state.playing);
  $('#pb-toggle').innerHTML = icon(state.playing ? 'pause' : 'play');
  $('#pb-stop').style.opacity = cur ? 1 : 0.4;
  if (!cur) {
    $('#pb-time').textContent = '0:00 / 0:00';
    $('#pb-seek').value = 0;
    updateFill($('#pb-seek'), 0);
  }
}

function applyVolume(v) {
  state.settings.volume = clamp01(v);
  if (state.current && !state.fadeTimer) audio.volume = state.settings.volume;
  $('#vol-show').textContent = Math.round(state.settings.volume * 100) + '%';
  const sv = $('#set-volume');
  sv.value = Math.round(state.settings.volume * 100);
  updateFill(sv, sv.value);
  const pv = $('#pb-volume');
  pv.value = Math.round(state.settings.volume * 100);
  updateFill(pv, pv.value);
  saveSettingsSoon();
}

/* ---------- 输出设备 ---------- */
async function populateOutputs() {
  try {
    const devs = await navigator.mediaDevices.enumerateDevices();
    const outs = devs.filter(d => d.type === 'audiooutput');
    const sel = $('#set-output');
    sel.innerHTML = '<option value="default">系统默认输出</option>' +
      outs.map((d, i) => `<option value="${d.deviceId}">${esc(d.label || '输出设备 ' + (i + 1))}</option>`).join('');
    if (state.settings.outputDevice && state.settings.outputDevice !== 'default' &&
        outs.some(d => d.deviceId === state.settings.outputDevice)) {
      sel.value = state.settings.outputDevice;
    } else {
      state.settings.outputDevice = 'default';
      sel.value = 'default';
    }
  } catch { /* 设备枚举失败时仅保留默认输出 */ }
}
function applyOutputDevice() {
  const id = state.settings.outputDevice || 'default';
  audio.setSinkId(id).catch(() => { /* 部分设备可能切换失败，保持原设备 */ });
}

/* ============================================================
   仪表盘时间线
   ============================================================ */
function renderTimeline(nowSec, plan) {
  const list = $('#today-list');
  const bells = plan.bells;
  if (!bells.length) {
    list.innerHTML = `<div class="ov-note" style="padding:26px 0;text-align:center">${plan.holiday ? '今日为假期或休息日，没有自动铃声安排。' : '今日没有铃声安排，可在「铃声方案」中配置。'}</div>`;
    $('#timeline-sum').textContent = '';
    return;
  }
  const next = nextBellOf(plan, nowSec);
  let firedCount = 0;
  const sorted = [...bells].sort((a, b) => bellSecOf(a) - bellSecOf(b));
  list.innerHTML = sorted.map(b => {
    const bellSec = bellSecOf(b);
    const fired = !!state.firedToday[b.id];
    const skipped = !!state.skippedToday[b.id];
    if (fired) firedCount++;
    let cls = '', chip = '';
    if (!b.enabled) { cls = 'tl-off'; chip = '<span class="chip chip-off">已停用</span>'; }
    else if (fired) { cls = 'tl-done'; chip = '<span class="chip chip-ok">已播放</span>'; }
    else if (skipped) { cls = 'tl-skip'; chip = '<span class="chip chip-warn">静音跳过</span>'; }
    else if (bellSec + 5 <= nowSec) { cls = 'tl-past'; chip = '<span class="chip chip-off">已过未播</span>'; }
    else if (next && next.id === b.id) { cls = 'is-next'; chip = '<span class="chip chip-pulse">即将响铃</span>'; }
    else chip = '<span class="chip chip-off">等待中</span>';
    const advTag = Number(b.advance) > 0 ? `<span class="tl-adv" title="原定 ${esc(b.time)}，提前 ${b.advance} 秒播放">${fmtAdv(b.advance)}</span>` : '';
    const durTag = bellDurOf(b) > 0 ? `<span class="tl-limit" title="播放 ${bellDurOf(b)} 秒后自动停止">限${bellDurOf(b)}秒</span>` : '';
    return `<div class="tl-row ${cls}">
      <span class="tl-time" title="${Number(b.advance) > 0 ? `原定 ${esc(b.time)}` : ''}">${secToHM(bellSec)}</span>
      <span class="tl-dot"></span>
      <span class="tl-name">${esc(b.name)}<span class="tl-music">${esc(bellMusicLabel(b))}</span>${advTag}${durTag}</span>
      ${chip}
      <button class="tl-play" data-bell="${b.id}" data-set="${plan.set ? plan.set.id : ''}" title="立即播放">${icon('play')}</button>
    </div>`;
  }).join('');
  $('#timeline-sum').textContent = `共 ${bells.length} 条 · 已播放 ${firedCount}`;

  list.querySelectorAll('.tl-play').forEach(btn => {
    btn.addEventListener('click', () => {
      const set = state.schedules.sets.find(s => s.id === btn.dataset.set);
      const b = set && set.bells.find(x => x.id === btn.dataset.bell);
      if (b) triggerBell(b, '手动', fmtAdv(b.advance));
    });
  });
}

/* ============================================================
   铃声方案页
   ============================================================ */
function saveSchedulesSoon() {
  clearTimeout(saveSchedulesSoon._t);
  saveSchedulesSoon._t = setTimeout(() => bellApi.schedules.save(state.schedules), 350);
}
const findSet = (id) => state.schedules.sets.find(s => s.id === id);

function bindSchedulesPage() {
  $('#btn-add-set').addEventListener('click', () => {
    state.schedules.sets.push({
      id: uid(), name: '新方案 ' + (state.schedules.sets.length + 1),
      enabled: false, days: [1, 2, 3, 4, 5], bells: []
    });
    renderSets(); saveSchedulesSoon();
    toast('已创建新方案，请添加铃声时间', 'success');
  });
  $('#btn-add-override').addEventListener('click', () => {
    state.schedules.overrides.push({ date: dateKey(new Date()), type: 'holiday', setId: state.schedules.sets[0] ? state.schedules.sets[0].id : null });
    renderOverrides(); saveSchedulesSoon();
  });
  $('#btn-import-holidays').addEventListener('click', importHolidays);

  // 方案卡片（事件委托）
  const box = $('#sets-list');
  box.addEventListener('change', (e) => {
    const t = e.target;
    const setId = t.dataset.set;
    const set = findSet(setId);
    if (!set) return;
    const bell = t.dataset.bell ? (set.bells || []).find(b => b.id === t.dataset.bell) : null;
    if (t.classList.contains('set-name')) set.name = t.value.trim() || set.name;
    else if (t.classList.contains('set-enabled')) set.enabled = t.checked;
    else if (bell && t.classList.contains('bell-time')) { bell.time = t.value || '08:00'; renderSets(); }
    else if (bell && t.classList.contains('bell-name-in')) bell.name = t.value.trim() || '铃声';
    else if (bell && t.classList.contains('bell-music-sel')) bell.musicId = t.value;
    else if (bell && t.classList.contains('bell-enabled')) bell.enabled = t.checked;
    saveSchedulesSoon();
  });
  box.addEventListener('click', async (e) => {
    const day = e.target.closest('.day-chip');
    if (day) {
      const set = findSet(day.dataset.set);
      const d = Number(day.dataset.day);
      const i = set.days.indexOf(d);
      if (i >= 0) set.days.splice(i, 1); else set.days.push(d);
      day.classList.toggle('on', i < 0);
      saveSchedulesSoon();
      return;
    }
    const addBell = e.target.closest('.add-bell');
    if (addBell) {
      const set = findSet(addBell.dataset.set);
      set.bells.push({ id: uid(), time: '12:00', name: '新铃声', musicId: state.library.items[0] ? state.library.items[0].id : '', enabled: true, advance: 0, duration: 0 });
      renderSets(); saveSchedulesSoon();
      return;
    }
    const cfgBell = e.target.closest('.bell-cfg');
    if (cfgBell) {
      const set = findSet(cfgBell.dataset.set);
      const bell = set && (set.bells || []).find(b => b.id === cfgBell.dataset.bell);
      if (bell) {
        const saved = await bellCfgDialog(bell);
        if (saved) { renderSets(); saveSchedulesSoon(); toast('铃声参数已保存', 'success'); }
      }
      return;
    }
    const delBell = e.target.closest('.del-bell');
    if (delBell) {
      const set = findSet(delBell.dataset.set);
      const ok = await confirmDialog({ title: '删除铃声', message: '确定删除这条铃声时间安排吗？', okText: '删除', danger: true });
      if (!ok) return;
      set.bells = set.bells.filter(b => b.id !== delBell.dataset.bell);
      renderSets(); saveSchedulesSoon();
      return;
    }
    const delSet = e.target.closest('.del-set');
    if (delSet) {
      const set = findSet(delSet.dataset.set);
      const ok = await confirmDialog({ title: '删除方案', message: `确定删除方案「${esc(set.name)}」？其中所有铃声将一并删除。`, okText: '删除', danger: true });
      if (!ok) return;
      state.schedules.sets = state.schedules.sets.filter(s => s.id !== set.id);
      state.schedules.overrides.forEach(o => { if (o.setId === set.id) o.setId = null; });
      renderSets(); renderOverrides(); saveSchedulesSoon();
      toast('方案已删除', 'success');
    }
  });

  // 特殊日期（事件委托）
  const ovBox = $('#overrides-list');
  ovBox.addEventListener('change', (e) => {
    const t = e.target;
    const o = state.schedules.overrides[Number(t.dataset.idx)];
    if (!o) return;
    if (t.classList.contains('ov-date')) o.date = t.value || dateKey(new Date());
    else if (t.classList.contains('ov-type')) {
      o.type = t.value;
      const sel = t.closest('.ov-row').querySelector('.ov-set');
      sel.disabled = o.type !== 'set';
    }
    else if (t.classList.contains('ov-set')) o.setId = t.value;
    saveSchedulesSoon();
  });
  ovBox.addEventListener('click', async (e) => {
    const del = e.target.closest('.del-ov');
    if (!del) return;
    state.schedules.overrides.splice(Number(del.dataset.idx), 1);
    renderOverrides(); saveSchedulesSoon();
  });
}

function setCard(s) {
  const days = [1, 2, 3, 4, 5, 6, 0].map(d =>
    `<button class="day-chip ${(s.days || []).includes(d) ? 'on' : ''}" data-set="${s.id}" data-day="${d}">${WEEK_CN[d]}</button>`).join('');
  const musicOpts = state.library.items.map(m =>
    `<option value="${m.id}">${esc(m.name)}</option>`).join('');
  const bells = bellsOf(s).map(b => {
    const tags = [];
    if (Number(b.advance) > 0) tags.push(fmtAdv(b.advance));
    if (bellDurOf(b) > 0) tags.push(`限${bellDurOf(b)}秒`);
    if (validPoolOf(b).length) tags.push(`随机${validPoolOf(b).length}首`);
    return `
    <div class="bell-row" data-bell="${b.id}">
      <input type="time" class="bell-time" data-set="${s.id}" data-bell="${b.id}" value="${b.time}">
      <input class="bell-name-in" data-set="${s.id}" data-bell="${b.id}" value="${esc(b.name)}" placeholder="铃声名称">
      <select class="bell-music-sel" data-set="${s.id}" data-bell="${b.id}">
        ${musicIdSelected(musicOpts, b.musicId)}
      </select>
      <div class="bell-tags">${tags.length ? tags.map(t => `<span class="btag">${t}</span>`).join('') : ''}</div>
      <label class="switch"><input type="checkbox" class="bell-enabled" data-set="${s.id}" data-bell="${b.id}" ${b.enabled ? 'checked' : ''}><span class="slider"></span></label>
      <button class="icon-btn bell-cfg" data-set="${s.id}" data-bell="${b.id}" title="播放参数（提前播放 / 播放时长）">${icon('sliders')}</button>
      <button class="icon-btn danger del-bell" data-set="${s.id}" data-bell="${b.id}" title="删除铃声">${icon('trash')}</button>
    </div>`;
  }).join('');
  const isTodaySet = resolveToday(new Date()).set && resolveToday(new Date()).set.id === s.id;
  return `<div class="card set-card" data-set-id="${s.id}">
    <div class="set-head">
      <input class="set-name" data-set="${s.id}" value="${esc(s.name)}" title="方案名称">
      <div class="set-days">${days}</div>
      <div class="set-actions">
        ${isTodaySet ? '<span class="chip">今日生效</span>' : ''}
        <label class="switch"><input type="checkbox" class="set-enabled" data-set="${s.id}" ${s.enabled ? 'checked' : ''}><span class="slider"></span></label>
        <button class="icon-btn danger del-set" data-set="${s.id}" title="删除方案">${icon('trash')}</button>
      </div>
    </div>
    ${s.bells.length ? `<div class="bell-rows">${bells}</div>` : '<div class="ov-note" style="padding:16px 20px">暂无铃声，点击下方按钮添加。</div>'}
    <div class="set-foot">
      <button class="btn ghost sm add-bell" data-set="${s.id}">＋ 添加铃声</button>
      <span class="set-summary">共 ${s.bells.length} 条铃声</span>
    </div>
  </div>`;
}
// 处理音乐下拉框选中项（保留已删除音乐的占位提示）
function musicIdSelected(optsHtml, musicId) {
  const exists = state.library.items.some(m => m.id === musicId);
  if (!exists && musicId) return `<option value="${musicId}" selected>（音乐已删除）</option>` + optsHtml;
  const re = new RegExp(`(<option value="${musicId}")`);
  return optsHtml.replace(re, '$1 selected');
}

function renderSets() {
  const box = $('#sets-list');
  if (!state.schedules.sets.length) {
    box.innerHTML = '<div class="empty"><div class="empty-ico">' + icon('calendar') + '</div><div>还没有铃声方案，点击右上角「新建方案」开始配置作息时间</div></div>';
    return;
  }
  box.innerHTML = state.schedules.sets.map(setCard).join('');
}

function renderOverrides() {
  const box = $('#overrides-list');
  const ovs = state.schedules.overrides || [];
  if (!ovs.length) {
    box.innerHTML = '<div class="ov-note" style="padding:4px 0 12px">暂无特殊日期。可将某个日期设为「假期」（全天不打铃）或「使用指定方案」（如考试周、运动会）。</div>';
    return;
  }
  box.innerHTML = ovs.map((o, i) => `
    <div class="ov-row">
      <input type="date" class="ov-date" data-idx="${i}" value="${o.date}">
      <select class="ov-type" data-idx="${i}">
        <option value="holiday" ${o.type === 'holiday' ? 'selected' : ''}>假期（不打铃）</option>
        <option value="set" ${o.type === 'set' ? 'selected' : ''}>使用指定方案</option>
      </select>
      <select class="ov-set" data-idx="${i}" ${o.type !== 'set' ? 'disabled' : ''}>
        ${state.schedules.sets.map(s => `<option value="${s.id}" ${o.setId === s.id ? 'selected' : ''}>${esc(s.name)}</option>`).join('')}
      </select>
      <button class="icon-btn danger del-ov" data-idx="${i}" title="删除">${icon('trash')}</button>
    </div>`).join('');
}

/* 法定节假日模板（依据国务院办公厅公布的放假安排整理；如有出入以官方通知为准，导入后可在上方列表手动增删） */
const HOLIDAY_TEMPLATES = [
  { year: 2025, name: '元旦', dates: ['2025-01-01'] },
  { year: 2025, name: '春节', dates: ['2025-01-28', '2025-01-29', '2025-01-30', '2025-01-31', '2025-02-01', '2025-02-02', '2025-02-03', '2025-02-04'] },
  { year: 2025, name: '清明节', dates: ['2025-04-04', '2025-04-05', '2025-04-06'] },
  { year: 2025, name: '劳动节', dates: ['2025-05-01', '2025-05-02', '2025-05-03', '2025-05-04', '2025-05-05'] },
  { year: 2025, name: '端午节', dates: ['2025-05-31', '2025-06-01', '2025-06-02'] },
  { year: 2025, name: '国庆节、中秋节', dates: ['2025-10-01', '2025-10-02', '2025-10-03', '2025-10-04', '2025-10-05', '2025-10-06', '2025-10-07', '2025-10-08'] },
  { year: 2026, name: '元旦', dates: ['2026-01-01', '2026-01-02', '2026-01-03'] },
  { year: 2026, name: '春节', dates: ['2026-02-16', '2026-02-17', '2026-02-18', '2026-02-19', '2026-02-20', '2026-02-21', '2026-02-22', '2026-02-23'] },
  { year: 2026, name: '清明节', dates: ['2026-04-04', '2026-04-05', '2026-04-06'] },
  { year: 2026, name: '劳动节', dates: ['2026-05-01', '2026-05-02', '2026-05-03', '2026-05-04', '2026-05-05'] },
  { year: 2026, name: '端午节', dates: ['2026-06-19', '2026-06-20', '2026-06-21'] },
  { year: 2026, name: '中秋节', dates: ['2026-09-25', '2026-09-26', '2026-09-27'] },
  { year: 2026, name: '国庆节', dates: ['2026-10-01', '2026-10-02', '2026-10-03', '2026-10-04', '2026-10-05', '2026-10-06', '2026-10-07'] }
];

/* 连续日期数组 → 「1月1日 ~ 1月3日（3 天）」文案 */
function fmtHolRange(dates) {
  if (!dates.length) return '';
  const f = (d) => { const [, m, day] = d.split('-'); return `${+m}月${+day}日`; };
  return dates.length === 1 ? f(dates[0]) : `${f(dates[0])} ~ ${f(dates[dates.length - 1])}（${dates.length} 天）`;
}

/* 导入节假日模板：写入特殊日期（假期类型），已存在的日期跳过 */
async function importHolidays() {
  const years = [...new Set(HOLIDAY_TEMPLATES.map(t => t.year))].sort();
  const detail = years.map((y) => {
    const items = HOLIDAY_TEMPLATES.filter(t => t.year === y);
    const total = items.reduce((a, t) => a + t.dates.length, 0);
    return `<div class="hol-year">${y} 年 · 共 ${total} 天</div>` +
      items.map(t => `<div class="hol-item"><b>${t.name}</b><span>${fmtHolRange(t.dates)}</span></div>`).join('');
  }).join('');
  const ov = openModal(`<h3>导入法定节假日模板</h3>
    <div class="modal-body">
      <p class="hol-tip">导入后对应日期全天不打铃；已存在的日期自动跳过。日期如与实际放假安排有出入，导入后可在「特殊日期」中手动调整。</p>
      ${detail}
    </div>
    <div class="modal-btns">
      <button class="btn ghost" data-r="0">取消</button>
      <button class="btn" data-r="1">导入全部</button>
    </div>`);
  const choice = await new Promise((resolve) => {
    ov.addEventListener('click', (e) => {
      const b = e.target.closest('[data-r]');
      if (b) { closeModal(); resolve(b.dataset.r === '1'); }
    });
  });
  if (!choice) return;
  const ovs = state.schedules.overrides || (state.schedules.overrides = []);
  let added = 0;
  for (const t of HOLIDAY_TEMPLATES) {
    for (const d of t.dates) {
      if (!ovs.some(o => o.date === d)) { ovs.push({ date: d, type: 'holiday' }); added++; }
    }
  }
  ovs.sort((a, b) => a.date < b.date ? -1 : 1);
  await bellApi.schedules.save(state.schedules);
  renderOverrides();
  toast(added ? `已导入 ${added} 天法定节假日` : '假期日期均已存在，无需导入', 'success');
}

/* ============================================================
   音乐库页
   ============================================================ */
const musicName = (id) => {
  const m = state.library.items.find(x => x.id === id);
  return m ? m.name : '未指定音乐';
};

/* ---------- 多曲播放：bell.musicIds 为曲目池（可选），bell.playMode 为播放模式 ---------- */
/* 播放模式：shuffle-one 每次随机一首 / cycle-one 每次顺序一首 / shuffle-all 全部随机连播 / order-all 全部顺序连播 */
const PLAY_MODES = { 'shuffle-one': '随机轮换', 'cycle-one': '顺序轮换', 'shuffle-all': '随机连播', 'order-all': '顺序连播' };
/* 过滤掉已被删除的曲目，返回仍有效的池 */
const validPoolOf = (b) => (Array.isArray(b.musicIds) ? b.musicIds : []).filter(id => state.library.items.some(m => m.id === id));
/* 铃声的展示名称：有曲目池时显示「模式N首」，否则显示单曲名 */
const bellMusicLabel = (b) => {
  const pool = validPoolOf(b);
  if (!pool.length) return musicName(b.musicId);
  if (pool.length === 1) return musicName(pool[0]);
  return `${PLAY_MODES[b.playMode] || PLAY_MODES['shuffle-one']}${pool.length}首`;
};

function bindMusicPage() {
  $('#btn-import').addEventListener('click', importMusic);
  $('#btn-tts').addEventListener('click', () => openTtsDialog(null));
  $('#music-search').addEventListener('input', () => renderMusic());

  // 在线音乐（网易云音乐）
  $('#btn-online').addEventListener('click', () => toggleOnlineView($('#music-online').classList.contains('hidden')));
  $('#ol-search-btn').addEventListener('click', onlineSearch);
  $('#ol-kw').addEventListener('keydown', (e) => { if (e.key === 'Enter') onlineSearch(); });
  $('#ol-daily').addEventListener('click', onlineDaily);
  $('#ol-discover').addEventListener('click', onlineDiscover);
  $('#ol-pls').addEventListener('click', (e) => {
    const card = e.target.closest('.ol-pl');
    if (card) onlineLoadPlaylistById(card.dataset.id);
  });
  $('#ol-pl-btn').addEventListener('click', onlineLoadPlaylist);
  $('#ol-pl').addEventListener('keydown', (e) => { if (e.key === 'Enter') onlineLoadPlaylist(); });
  $('#ol-dl-all').addEventListener('click', onlineDownloadAll);
  $('#ol-body').addEventListener('click', onOnlineRowClick);

  const grid = $('#music-grid');
  grid.addEventListener('click', async (e) => {
    const playBtn = e.target.closest('.act-play');
    if (playBtn) {
      const id = playBtn.dataset.id;
      if (state.current && state.current.musicId === id && (state.playing || state.paused)) fadeStop();
      else playMusicById(id, '手动');
      return;
    }
    const clip = e.target.closest('.act-clip');
    if (clip) {
      const m = state.library.items.find(x => x.id === clip.dataset.id);
      if (m) clipDialog(m);
      return;
    }
    const ren = e.target.closest('.act-rename');
    if (ren) {
      const m = state.library.items.find(x => x.id === ren.dataset.id);
      if (m && m.tts) { openTtsDialog(m); return; } // 语音项：打开编辑弹窗，改文字/播音人后重新生成
      const name = await promptDialog({ title: '重命名铃声', label: '请输入新名称', value: m ? m.name : '' });
      if (name) { m.name = name; await bellApi.library.save(state.library.items); renderMusic(); renderSets(); toast('已重命名', 'success'); }
      return;
    }
    const del = e.target.closest('.act-del');
    if (del) {
      const id = del.dataset.id;
      const m = state.library.items.find(x => x.id === id);
      const ok = await confirmDialog({ title: '删除铃声', message: `确定删除「${esc(m ? m.name : '')}」？删除后文件将同时被移除，正在使用它的方案将提示音乐缺失。`, okText: '删除', danger: true });
      if (!ok) return;
      if (state.current && state.current.musicId === id) finishStop();
      await bellApi.library.delete(id);
      state.library.items = state.library.items.filter(x => x.id !== id);
      renderMusic(); renderSets(); updateLibCount();
      toast('已删除', 'success');
    }
  });
  grid.addEventListener('change', async (e) => {
    if (!e.target.classList.contains('mc-cat')) return;
    const m = state.library.items.find(x => x.id === e.target.dataset.id);
    if (m) { m.category = e.target.value; await bellApi.library.save(state.library.items); }
  });
}

async function importMusic() {
  const r = await bellApi.library.import();
  if (!r || !r.added || !r.added.length) return;
  state.library.items.push(...r.added);
  toast(`成功导入 ${r.added.length} 个音频文件`, 'success');
  for (const m of r.added) {
    const g = await bellApi.music.getUrl(m.id);
    if (g && g.url) {
      const d = await probeDuration(g.url);
      if (d) m.duration = Math.round(d * 10) / 10;
    }
  }
  await bellApi.library.save(state.library.items);
  renderMusic(); renderSets(); updateLibCount();
}

/* ---------- 文字转语音：把播报文字生成语音铃声（Edge 在线 → 百度 → 系统语音三级回退） ---------- */
/* Edge TTS 播音人列表（启动时从主进程获取；获取失败时用默认列表） */
let TTS_VOICES = [{ id: 'zh-CN-XiaoxiaoNeural', label: '晓晓', name: '晓晓（女声·亲切）' }];
bellApi.tts.voices().then(vs => { if (Array.isArray(vs) && vs.length) TTS_VOICES = vs; }).catch(() => {});

/* TTS 语速 / 音调 / 风格选项（语速音调走 SSML prosody；风格免费通道不支持时自动按默认风格生成） */
const TTS_RATE_OPTS = [['+0%', '语速正常'], ['-10%', '慢一点'], ['-20%', '慢'], ['+10%', '快一点'], ['+20%', '快']];
const TTS_PITCH_OPTS = [['+0Hz', '音调正常'], ['-4Hz', '低沉'], ['-8Hz', '更低'], ['+4Hz', '高亢'], ['+8Hz', '更高']];
const TTS_STYLE_OPTS = [['', '默认风格'], ['cheerful', '愉快'], ['excited', '兴奋'], ['gentle', '温柔'], ['serious', '严肃'], ['newscast', '新闻播报'], ['customerservice', '客服'], ['whispering', '悄悄话']];
const ttsOptsHtml = (opts, sel) => opts.map(([v, l]) => `<option value="${esc(v)}" ${v === sel ? 'selected' : ''}>${esc(l)}</option>`).join('');

/* TTS 弹窗：新建语音铃声；传入 item 时为编辑模式（预填参数，重新生成后原位替换、id 不变，引用不失效） */
function openTtsDialog(item) {
  const isEdit = !!item;
  const p = (item && item.ttsParams) || {};
  const ov = openModal(`<h3>${isEdit ? '编辑语音' : '文字转语音'}</h3>
    <div class="modal-body">
      <input class="modal-input" id="tts-name" maxlength="60" value="${esc(isEdit ? item.name : '')}" placeholder="语音名称（留空自动取播报文字前几个字）">
      <textarea class="modal-input tts-text" id="tts-text" maxlength="200" placeholder="输入要朗读的文字，如：请考生有序入场，考试即将开始。">${esc(p.text || '')}</textarea>
      <div class="tts-opts">
        <select class="tts-voice" title="播音人">${TTS_VOICES.map(v => `<option value="${v.id}" ${v.id === p.voice ? 'selected' : ''}>${esc(v.name)}</option>`).join('')}</select>
        <select class="tts-rate" title="语速">${ttsOptsHtml(TTS_RATE_OPTS, p.rate || '+0%')}</select>
        <select class="tts-pitch" title="音调">${ttsOptsHtml(TTS_PITCH_OPTS, p.pitch || '+0Hz')}</select>
        <select class="tts-style" title="朗读风格（免费语音通道暂不支持风格，选非默认时将自动按默认风格生成）">${ttsOptsHtml(TTS_STYLE_OPTS, p.style || '')}</select>
        <select class="tts-cat" title="分类">${CATEGORIES.map(c => `<option ${c === (isEdit ? item.category : '其他') ? 'selected' : ''}>${c}</option>`).join('')}</select>
      </div>
    </div>
    <div class="modal-btns">
      <button class="btn ghost" data-r="0">取消</button>
      <button class="btn" id="tts-preview-btn" type="button">试听</button>
      <button class="btn primary" id="tts-gen">${isEdit ? '重新生成' : '生成语音'}</button>
    </div>`);
  ov.querySelector('.modal').classList.add('modal-wide');
  const textEl = ov.querySelector('#tts-text');
  textEl.focus();
  ov.addEventListener('click', (e) => { if (e.target.closest('[data-r="0"]')) { stopTtsPreview(); closeModal(); } });
  ov.addEventListener('keydown', (e) => { if (e.key === 'Escape') { stopTtsPreview(); closeModal(); } });

  /* ---------- 试听：合成到临时目录播放，不入铃声库 ---------- */
  const previewAudio = new Audio();
  const previewBtn = ov.querySelector('#tts-preview-btn');
  const stopTtsPreview = () => { try { previewAudio.pause(); } catch { /* ignore */ } };
  previewBtn.addEventListener('click', async () => {
    const text = textEl.value.trim();
    if (!text) { toast('请输入播报文字', 'error'); return; }
    stopTtsPreview();
    previewBtn.disabled = true;
    previewBtn.textContent = '合成中…';
    let r = null;
    try {
      r = await bellApi.tts.preview({
        text, voice: ov.querySelector('.tts-voice').value,
        rate: ov.querySelector('.tts-rate').value,
        pitch: ov.querySelector('.tts-pitch').value,
        style: ov.querySelector('.tts-style').value
      });
    } catch (err) { r = { ok: false, error: err && err.message ? err.message : String(err) }; }
    previewBtn.disabled = false;
    previewBtn.textContent = '试听';
    if (!r || !r.ok) { toast('试听失败：' + ((r && r.error) || '未知错误'), 'error'); return; }
    if (r.styleDropped) toast('免费通道不支持所选风格，已按默认风格合成试听', 'info');
    previewAudio.src = r.url;
    try { await previewAudio.play(); } catch { /* ignore */ }
  });

  const genBtn = ov.querySelector('#tts-gen');
  genBtn.addEventListener('click', async () => {
    const text = textEl.value.trim();
    if (!text) { toast('请输入播报文字', 'error'); return; }
    const name = ov.querySelector('#tts-name').value.trim() || text.replace(/\s+/g, '').slice(0, 16);
    stopTtsPreview();
    genBtn.disabled = true;
    genBtn.textContent = '生成中…';
    let r = null;
    try {
      r = await bellApi.tts.generate({
        text, name, voice: ov.querySelector('.tts-voice').value,
        rate: ov.querySelector('.tts-rate').value,
        pitch: ov.querySelector('.tts-pitch').value,
        style: ov.querySelector('.tts-style').value,
        category: ov.querySelector('.tts-cat').value,
        itemId: isEdit ? item.id : ''
      });
    } catch (err) { r = { ok: false, error: err && err.message ? err.message : String(err) }; }
    if (!r || !r.ok) {
      genBtn.disabled = false;
      genBtn.textContent = isEdit ? '重新生成' : '生成语音';
      toast('语音生成失败：' + ((r && r.error) || '未知错误'), 'error');
      return;
    }
    // 更新铃声库状态（编辑模式为原位替换）并补测时长
    const idx = state.library.items.findIndex(x => x.id === r.item.id);
    if (idx >= 0) state.library.items[idx] = r.item; else state.library.items.push(r.item);
    const g = await bellApi.music.getUrl(r.item.id);
    if (g && g.url) {
      const dur = await probeDuration(g.url);
      if (dur) r.item.duration = Math.round(dur * 10) / 10;
    }
    await bellApi.library.save(state.library.items);
    renderMusic(); renderSets(); updateLibCount();
    closeModal();
    if (r.styleDropped) toast(`语音已生成${r.engine ? '（' + r.engine + '）' : ''}，但免费语音通道不支持所选风格，已按默认风格生成`, 'info');
    else toast(`语音「${name}」已生成${r.engine ? '（' + r.engine + '）' : ''}，已保存到铃声库`, 'success');
  });
}

/* ---------- 截取片段：把整首过长的音乐裁出 30-60 秒另存为新铃声 ---------- */
const clipAudio = new Audio();  // 片段试听专用（与主播放器分离，不打断正在播的铃声）
function stopClipPreview() { try { clipAudio.pause(); } catch { /* ignore */ } }

/* Uint8Array → base64（分段转换，避免 String.fromCharCode 一次传参过多） */
function u8ToB64(u8) {
  let s = '';
  const CH = 0x8000;
  for (let i = 0; i < u8.length; i += CH) s += String.fromCharCode.apply(null, u8.subarray(i, i + CH));
  return btoa(s);
}

/* 从解码后的 AudioBuffer 裁出 [startSec, endSec) 并编码为 16 位 PCM WAV */
function encodeClipWav(audioBuf, startSec, endSec) {
  const sr = audioBuf.sampleRate;
  const chs = Math.min(2, audioBuf.numberOfChannels);
  const s0 = Math.max(0, Math.floor(startSec * sr));
  const s1 = Math.min(audioBuf.length, Math.ceil(endSec * sr));
  const frames = Math.max(1, s1 - s0);
  const chans = [];
  for (let c = 0; c < chs; c++) chans.push(audioBuf.getChannelData(c));
  const dataSize = frames * chs * 2;
  const buf = new ArrayBuffer(44 + dataSize);
  const v = new DataView(buf);
  const wstr = (off, str) => { for (let i = 0; i < str.length; i++) v.setUint8(off + i, str.charCodeAt(i)); };
  wstr(0, 'RIFF'); v.setUint32(4, 36 + dataSize, true); wstr(8, 'WAVE');
  wstr(12, 'fmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true);   // PCM
  v.setUint16(22, chs, true); v.setUint32(24, sr, true);
  v.setUint32(28, sr * chs * 2, true); v.setUint16(32, chs * 2, true);
  v.setUint16(34, 16, true); wstr(36, 'data'); v.setUint32(40, dataSize, true);
  let off = 44;
  for (let i = 0; i < frames; i++) {
    for (let c = 0; c < chs; c++) {
      const s = Math.max(-1, Math.min(1, chans[c][s0 + i]));
      v.setInt16(off, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
      off += 2;
    }
  }
  return { wav: new Uint8Array(buf), duration: frames / sr };
}

/* 截取弹窗：解码原曲 → 选起点/终点（可试听）→ WAV 编码 → 入库 */
async function clipDialog(m) {
  toast('正在解析音频，请稍候…', 'info');
  const r = await bellApi.music.getBuffer(m.id);
  if (!r || !r.ok) { toast((r && r.error) || '读取音频失败', 'error'); return; }
  let audioBuf;
  try {
    const bytes = Uint8Array.from(atob(r.b64), c => c.charCodeAt(0));
    const ac = new (window.AudioContext || window.webkitAudioContext)();
    audioBuf = await ac.decodeAudioData(bytes.buffer);
    ac.close();
  } catch (err) {
    toast('音频解码失败，该格式暂不支持截取', 'error');
    return;
  }
  const total = audioBuf.duration;
  const g = await bellApi.music.getUrl(m.id);
  if (!g || !g.url) { toast('音频文件不存在', 'error'); return; }
  const url = g.url;
  const defEnd = Math.min(total, 45).toFixed(1);

  const ov = openModal(`<h3>截取片段 · ${esc(m.name)}</h3>
      <div class="modal-body">
        <div class="cfg-row">
          <div class="cfg-label">片段名称</div>
          <div class="cfg-field">
            <input class="modal-input clip-name" maxlength="60" value="${esc(m.name)}（片段）" style="margin-bottom:0;flex:1">
          </div>
        </div>
        <div class="cfg-row">
          <div class="cfg-label">保存到分类</div>
          <div class="cfg-field">
            <select class="mc-cat clip-cat">${CATEGORIES.map(c => `<option ${c === m.category ? 'selected' : ''}>${c}</option>`).join('')}</select>
          </div>
        </div>
        <div class="cfg-row">
          <div class="cfg-label">起点 / 终点（秒）</div>
          <div class="cfg-field">
            <input type="number" class="cfg-input clip-start" style="width:92px" min="0" max="${total.toFixed(1)}" step="0.1" value="0">
            <span class="cfg-unit">→</span>
            <input type="number" class="cfg-input clip-end" style="width:92px" min="0" max="${total.toFixed(1)}" step="0.1" value="${defEnd}">
            <span class="cfg-unit">全长 ${fmtDur(total)}</span>
          </div>
          <div class="cfg-help">建议截取 30 – 60 秒。先试听确认效果，试听播放中可点「设为起点 / 设为终点」用当前播放位置快速定位。</div>
        </div>
      </div>
      <div class="modal-btns" style="justify-content:flex-start;margin-bottom:12px">
        <button class="btn ghost" data-act="preview">试听片段</button>
        <button class="btn ghost" data-act="markstart">设为起点</button>
        <button class="btn ghost" data-act="markend">设为终点</button>
      </div>
      <div class="modal-btns">
        <button class="btn ghost" data-r="0">取消</button>
        <button class="btn" data-r="1">保存为新铃声</button>
      </div>`);
  const startIn = ov.querySelector('.clip-start');
  const endIn = ov.querySelector('.clip-end');
  const previewBtn = ov.querySelector('[data-act="preview"]');
  previewBtn.textContent = '试听片段';
  const setPreviewBtn = () => { previewBtn.textContent = clipAudio.paused ? '试听片段' : '停止试听'; };
  const onTick = () => { if (clipAudio.currentTime >= (Number(endIn.value) || 0)) stopClipPreview(); };
  clipAudio.addEventListener('timeupdate', onTick);
  clipAudio.addEventListener('pause', setPreviewBtn);
  clipAudio.addEventListener('ended', setPreviewBtn);
  const doPreview = () => {
    if (!clipAudio.paused) { stopClipPreview(); return; }
    const s = Math.max(0, Number(startIn.value) || 0);
    clipAudio.src = url;
    clipAudio.onloadedmetadata = () => { clipAudio.currentTime = s; clipAudio.play().catch(() => {}); };
  };
  const markPos = (inp) => {
    if (!clipAudio.src || clipAudio.currentTime <= 0) { toast('请先试听片段，再用当前播放位置定位', 'info'); return; }
    inp.value = Math.min(total, Math.round(clipAudio.currentTime * 10) / 10);
  };
  const cleanup = () => {
    clipAudio.removeEventListener('timeupdate', onTick);
    clipAudio.removeEventListener('pause', setPreviewBtn);
    clipAudio.removeEventListener('ended', setPreviewBtn);
    clipAudio.onloadedmetadata = null;
    stopClipPreview();
  };
  // 弹窗被其他途径关闭（Esc / 点击遮罩）时也要停掉试听
  const mo = new MutationObserver(() => {
    if (!$('#modal-root').firstElementChild) { cleanup(); mo.disconnect(); }
  });
  mo.observe($('#modal-root'), { childList: true });
  const saveClip = async () => {
    const s = Math.max(0, Number(startIn.value) || 0);
    const e = Number(endIn.value) || 0;
    if (e <= s + 0.99) { toast('片段太短：终点需比起点至少多 1 秒', 'error'); return false; }
    if (e > total + 0.01) { toast('终点超出了音频全长', 'error'); return false; }
    const name = ov.querySelector('.clip-name').value.trim() || `${m.name}（片段）`;
    const category = ov.querySelector('.clip-cat').value;
    const btn = ov.querySelector('[data-r="1"]');
    btn.disabled = true; btn.textContent = '正在保存…';
    const { wav, duration } = encodeClipWav(audioBuf, s, e);
    const rr = await bellApi.library.addClip({ name, category, duration, b64: u8ToB64(wav) });
    if (!rr || !rr.ok) {
      btn.disabled = false; btn.textContent = '保存为新铃声';
      toast((rr && rr.error) || '保存失败', 'error');
      return false;
    }
    state.library.items.push(rr.item);
    closeModal();
    renderMusic(); renderSets(); updateLibCount();
    toast(`已保存片段「${esc(name)}」（约 ${Math.round(duration)} 秒）`, 'success');
    return true;
  };
  ov.addEventListener('click', async (e) => {
    const act = e.target.closest('[data-act]');
    if (act) {
      if (act.dataset.act === 'preview') doPreview();
      else if (act.dataset.act === 'markstart') markPos(startIn);
      else if (act.dataset.act === 'markend') markPos(endIn);
      return;
    }
    const b = e.target.closest('[data-r]');
    if (!b) return;
    if (b.dataset.r === '0') { cleanup(); mo.disconnect(); closeModal(); }
    else { if (await saveClip()) { cleanup(); mo.disconnect(); } }
  });
}

/* ---------- 在线音乐（网易云音乐，下载入库后本地播放） ---------- */
const onlineState = { songs: [], mode: 'search', busy: false };

function toggleOnlineView(on) {
  $('#music-online').classList.toggle('hidden', !on);
  $('#music-local').classList.toggle('hidden', on);
  $('#music-search').classList.toggle('hidden', on);
  $('#btn-import').classList.toggle('hidden', on);
  $('#btn-tts').classList.toggle('hidden', on);
  $('#btn-online').classList.toggle('on', on);
  if (on) setTimeout(() => $('#ol-kw').focus(), 80);
}

async function onlineSearch() {
  const kw = $('#ol-kw').value.trim();
  if (!kw) { toast('请输入搜索关键词', 'info'); return; }
  $('#ol-result-title').textContent = '正在搜索…';
  const r = await bellApi.online.search(kw);
  if (!r || !r.ok) {
    $('#ol-result-title').textContent = '搜索结果';
    toast((r && r.error) || '搜索失败', 'error');
    return;
  }
  onlineState.songs = r.songs;
  onlineState.mode = 'search';
  $('#ol-result-title').textContent = `搜索“${kw.slice(0, 16)}”的结果`;
  $('#ol-pl-info').textContent = '';
  $('#ol-dl-all').classList.add('hidden');
  renderOnline();
}

async function onlineLoadPlaylist() {
  const v = $('#ol-pl').value.trim();
  if (!v) { toast('请粘贴歌单链接或 ID', 'info'); return; }
  onlineLoadPlaylistById(v);
}

async function onlineLoadPlaylistById(id) {
  $('#ol-result-title').textContent = '正在获取歌单…';
  const r = await bellApi.online.playlist(String(id));
  if (!r || !r.ok) {
    $('#ol-result-title').textContent = '搜索结果';
    toast((r && r.error) || '歌单获取失败', 'error');
    return;
  }
  onlineState.songs = r.songs;
  onlineState.mode = 'playlist';
  $('#ol-result-title').textContent = `歌单：${r.name.slice(0, 24)}`;
  $('#ol-pl-info').textContent = `共 ${r.total} 首${r.songs.length < r.total ? `，已载入前 ${r.songs.length} 首` : ''}，可批量下载`;
  $('#ol-dl-all').classList.remove('hidden');
  renderOnline();
}

/* 个性推荐：直接填充结果表（可试听 / 下载 / 批量下载） */
async function onlineDaily() {
  const btn = $('#ol-daily');
  if (btn.disabled) return;
  btn.disabled = true;
  $('#ol-result-title').textContent = '正在获取个性推荐…';
  const r = await bellApi.online.daily();
  btn.disabled = false;
  if (!r || !r.ok) {
    $('#ol-result-title').textContent = '搜索结果';
    toast((r && r.error) || '获取个性推荐失败', 'error');
    return;
  }
  onlineState.songs = r.songs;
  onlineState.mode = 'daily';
  $('#ol-result-title').textContent = '个性推荐';
  $('#ol-pl-info').textContent = `共 ${r.songs.length} 首，可批量下载`;
  $('#ol-dl-all').classList.remove('hidden');
  renderOnline();
}

/* 发现音乐：展示推荐歌单封面，点击歌单载入曲目 */
async function onlineDiscover() {
  const box = $('#ol-pls');
  const btn = $('#ol-discover');
  if (!box.classList.contains('hidden')) { box.classList.add('hidden'); return; } // 再点一次收起
  if (btn.disabled) return;
  btn.disabled = true;
  const r = await bellApi.online.discover();
  btn.disabled = false;
  if (!r || !r.ok) { toast((r && r.error) || '获取发现音乐失败', 'error'); return; }
  box.innerHTML = r.playlists.map(pl => `
    <div class="ol-pl" data-id="${pl.id}" title="${esc(pl.name)}">
      <img src="${esc(pl.picUrl)}" alt="" loading="lazy">
      <div class="ol-pl-name">${esc(pl.name)}</div>
      <div class="ol-pl-count">${pl.playCount ? fmtPlayCount(pl.playCount) : ''}</div>
    </div>`).join('');
  box.classList.remove('hidden');
}

const fmtPlayCount = (n) => n >= 1e8 ? (n / 1e8).toFixed(1) + '亿' : n >= 1e4 ? (n / 1e4).toFixed(1) + '万' : String(n);

function renderOnline() {
  const body = $('#ol-body');
  const songs = onlineState.songs;
  $('#ol-empty').classList.toggle('hidden', songs.length > 0);
  const libIds = new Set(state.library.items.filter(m => m.onlineId).map(m => m.onlineId));
  body.innerHTML = songs.map(sg => {
    const has = libIds.has(sg.id);
    return `<tr>
      <td><div class="ol-name-flex"><span class="ol-name" title="${esc(sg.name)}">${esc(sg.name)}</span>${sg.fee === 1 ? '<span class="ol-badge">VIP</span>' : ''}</div></td>
      <td>${esc(sg.artist)}</td>
      <td>${sg.duration ? fmtDur(sg.duration) : '--:--'}</td>
      <td class="ta-r"><div class="ol-actions">
        <button class="btn sm ghost ol-play" data-id="${sg.id}">试听</button>
        <button class="btn sm ol-dl" data-id="${sg.id}" ${has ? 'disabled' : ''}>${has ? '已入库' : '下载'}</button>
      </div></td>
    </tr>`;
  }).join('');
}

async function onOnlineRowClick(e) {
  const play = e.target.closest('.ol-play');
  if (play) {
    const sg = onlineState.songs.find(x => x.id === Number(play.dataset.id)); // dataset.id 为字符串，需转数字比较
    if (!sg) return;
    play.textContent = '获取中…';
    const r = await bellApi.online.songUrl(sg.id);
    play.textContent = '试听';
    if (!r || !r.ok) { toast((r && r.error) || '获取试听失败', 'error'); return; }
    if (!r.url) { toast('该歌曲无法播放（可能为 VIP 或无版权）', 'error'); return; }
    playUrl(r.url, { musicId: null, bellName: null, kind: '手动', displayName: `${sg.name} - ${sg.artist}`.slice(0, 80) });
    return;
  }
  const dl = e.target.closest('.ol-dl');
  if (dl && !dl.disabled) await onlineDownloadOne(dl);
}

async function onlineDownloadOne(btn) {
  const sg = onlineState.songs.find(x => x.id === Number(btn.dataset.id));
  if (!sg) return;
  btn.disabled = true;
  btn.textContent = '下载中…';
  const r = await bellApi.online.download({ id: sg.id, name: sg.name, artist: sg.artist });
  if (r && r.ok) {
    state.library.items.push(r.item);
    updateLibCount();
    renderMusic(); renderSets(); // 刷新本地网格与方案页音乐下拉
    btn.textContent = '已入库';
    toast(r.trial ? `「${sg.name}」已下载（试听片段）` : `「${sg.name}」已下载入库`, 'success');
    const g = await bellApi.music.getUrl(r.item.id);
    if (g && g.url) {
      const d = await probeDuration(g.url);
      if (d) { r.item.duration = Math.round(d * 10) / 10; await bellApi.library.save(state.library.items); }
    }
  } else {
    btn.disabled = false;
    btn.textContent = '下载';
    toast((r && r.error) || '下载失败', 'error');
  }
}

async function onlineDownloadAll() {
  if (onlineState.busy) return;
  const btnAll = $('#ol-dl-all');
  const btns = $$('#ol-body .ol-dl').filter(b => !b.disabled);
  if (!btns.length) { toast('歌单中的歌曲均已入库', 'info'); return; }
  onlineState.busy = true;
  btnAll.disabled = true;
  let ok = 0, fail = 0;
  for (const b of btns) {
    const sg = onlineState.songs.find(x => x.id === Number(b.dataset.id));
    if (!sg) continue;
    b.disabled = true;
    b.textContent = '下载中…';
    const r = await bellApi.online.download({ id: sg.id, name: sg.name, artist: sg.artist });
    if (r && r.ok) {
      ok++;
      b.textContent = '已入库';
      state.library.items.push(r.item);
      updateLibCount();
    } else {
      fail++;
      b.disabled = false;
      b.textContent = '下载';
    }
  }
  for (const m of state.library.items.filter(x => x.online && x.duration == null)) {
    const g = await bellApi.music.getUrl(m.id);
    if (g && g.url) {
      const d = await probeDuration(g.url);
      if (d) m.duration = Math.round(d * 10) / 10;
    }
  }
  await bellApi.library.save(state.library.items);
  onlineState.busy = false;
  btnAll.disabled = false;
  renderMusic(); renderSets(); // 刷新本地网格与方案页音乐下拉
  toast(`批量下载完成：成功 ${ok} 首${fail ? `，失败 ${fail} 首` : ''}`, fail ? 'info' : 'success');
}

function renderMusic() {
  const grid = $('#music-grid');
  const kw = $('#music-search').value.trim().toLowerCase();
  const items = state.library.items.filter(m => !kw || m.name.toLowerCase().includes(kw));
  $('#music-empty').classList.toggle('hidden', state.library.items.length > 0);
  grid.innerHTML = items.map(m => {
    const active = state.current && state.current.musicId === m.id && (state.playing || state.paused);
    return `<div class="music-card ${active ? 'playing' : ''}" data-id="${m.id}">
      <button class="mc-play-btn act-play" data-id="${m.id}" title="${active ? '停止' : '试听'}">${active ? eqHtml() : icon('play')}</button>
      <div class="mc-info">
        <div class="mc-name" title="${esc(m.name)}">${esc(m.name)}</div>
        <div class="mc-meta"><span>${fmtDur(m.duration)}</span>${m.online ? '<span>网易云</span>' : ''}${m.clip ? '<span>片段</span>' : ''}${m.tts ? '<span>语音</span>' : ''}</div>
      </div>
      <div class="mc-actions">
        <select class="mc-cat" data-id="${m.id}" title="分类">${CATEGORIES.map(c => `<option ${c === m.category ? 'selected' : ''}>${c}</option>`).join('')}</select>
        <button class="icon-btn act-clip" data-id="${m.id}" title="截取片段（从这首音乐中裁出一段另存为新铃声）">${icon('cut')}</button>
        <button class="icon-btn act-rename" data-id="${m.id}" title="${m.tts ? '编辑语音（修改文字与播音人后重新生成）' : '重命名'}">${icon('pencil')}</button>
        <button class="icon-btn danger act-del" data-id="${m.id}" title="删除">${icon('trash')}</button>
      </div>
    </div>`;
  }).join('');
  updateLibCount();
}

function updateLibCount() {
  $('#lib-count').textContent = state.library.items.length + ' 首';
}

async function measureMissingDurations() {
  const missing = state.library.items.filter(m => m.duration == null);
  if (!missing.length) return;
  let fixed = 0;
  for (const m of missing) {
    const g = await bellApi.music.getUrl(m.id);
    if (!g || !g.url) continue;
    const d = await probeDuration(g.url);
    if (d) { m.duration = Math.round(d * 10) / 10; fixed++; }
  }
  if (fixed) {
    await bellApi.library.save(state.library.items);
    if (state.activePage === 'music') renderMusic();
  }
}

function probeDuration(url) {
  return new Promise((resolve) => {
    const a = new Audio();
    let done = false;
    const finish = (v) => { if (!done) { done = true; resolve(v); } };
    a.preload = 'metadata';
    a.onloadedmetadata = () => finish(a.duration || null);
    a.onerror = () => finish(null);
    setTimeout(() => finish(a.duration || null), 6000);
    a.src = url;
  });
}

/* ============================================================
   考试播报页
   ============================================================ */
/* 考试所引用的播报节点方案（未选或方案已删则返回 null，不播报） */
function examSchemeOf(ex) {
  if (!ex || !ex.schemeId) return null;
  return (state.examSchemes.schemes || []).find(s => s.id === ex.schemeId) || null;
}

/* 播报节点的触发时机类型（poststart 仅兼容旧数据，界面上不再提供新增） */
const NODE_TYPES = [
  { key: 'prestart', label: '开考前', offset: true, offsetLabel: '开考前' },
  { key: 'start', label: '开始考试', offset: false },
  { key: 'preend', label: '结束前', offset: true, offsetLabel: '结束前' },
  { key: 'end', label: '考试结束', offset: false },
  { key: 'poststart', label: '开考后', offset: true, offsetLabel: '开考后' }
];

/* 节点类型归一（仅计算语义，不落盘）：旧 enter→prestart、warn→preend、
   custom 按 偏移<0→prestart / =0→start / >0→poststart */
function nodeTypeOf(node) {
  const k = node.key;
  if (k === 'prestart' || k === 'start' || k === 'preend' || k === 'end' || k === 'poststart') return k;
  const off = Number(node.offsetMin) || 0;
  if (k === 'enter') return 'prestart';
  if (k === 'warn') return 'preend';
  return off < 0 ? 'prestart' : off === 0 ? 'start' : 'poststart';
}

/* 旧节点迁移为新结构（管理器渲染时用，收集保存后落盘） */
function migrateNode(node) {
  const off = Number(node.offsetMin) || 0;
  const key = nodeTypeOf(node);
  const t = NODE_TYPES.find(x => x.key === key) || NODE_TYPES[0];
  return {
    id: node.id || ('c-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 6)),
    key: t.key,
    label: ((node.label || '') || '').trim().slice(0, 12) || t.label,
    offsetMin: t.key === 'prestart' ? Math.abs(off) : (t.offset ? off : 0),
    enabled: node.enabled != null ? node.enabled : true,
    musicId: node.musicId || ''
  };
}

/* 考试全部播报节点（含未启用的），统一供调度过滤 / 列表展示。
   选了方案：全部节点来自方案，按各节点触发时机（开考前 / 开始考试 / 结束前 / 考试结束）计算；
   未选方案：不播报。 */
function examNodesOf(ex) {
  const sc = examSchemeOf(ex);
  if (!sc) return [];
  const startSec = timeToMin(ex.startTime || '00:00') * 60;
  const endSec = startSec + Math.max(1, Number(ex.duration) || 1) * 60;
  const list = [];
  for (const node of (sc.nodes || [])) {
    if (!node) continue;
    const t = nodeTypeOf(node);
    const off = (Number(node.offsetMin) || 0) * 60;
    const sec = t === 'prestart' ? Math.max(0, startSec - Math.abs(off))
      : t === 'start' ? startSec
      : t === 'preend' ? Math.max(0, endSec - Math.max(0, off))
      : t === 'end' ? endSec
      : Math.max(0, startSec + off); // poststart（开考后偏移，兼容旧数据，可为负）
    list.push({ key: ex.id + ':n:' + (node.id || ''), label: node.label || '自定义播报', sec, enabled: !!node.enabled, musicId: node.musicId || '' });
  }
  return list;
}

/* 待播报事件列表：仅保留已启用且配置了铃声的节点 */
function examEventsOf(ex) {
  return examNodesOf(ex).filter(n => n.enabled && n.musicId);
}

/* "08:30" → "8点30分"；分钟为 0 → "8点整" */
function fmtTimeCn(t) {
  const m = timeToMin(t);
  const h = Math.floor(m / 60), mm = m % 60;
  return mm === 0 ? `${h}点整` : `${h}点${mm}分`;
}

/* 播报文字占位符替换：{科目} {时间} {分钟} */
function fillExamText(text, { subject, startTime, min }) {
  return String(text || '')
    .replace(/\{科目\}/g, subject || '考试')
    .replace(/\{时间\}/g, startTime != null ? fmtTimeCn(startTime) : '')
    .replace(/\{分钟\}/g, min != null ? String(min) : '');
}

let saveExamsTimer = null;
function saveExamsSoon() {
  clearTimeout(saveExamsTimer);
  saveExamsTimer = setTimeout(() => bellApi.exams.save(state.exams), 350);
}

let saveSchemesTimer = null;
function saveExamSchemesSoon() {
  clearTimeout(saveSchemesTimer);
  saveSchemesTimer = setTimeout(() => bellApi.examSchemes.save(state.examSchemes), 350);
}

function bindExamPage() {
  $('#btn-add-exam').addEventListener('click', () => openExamEditor(null));
  $('#btn-manage-schemes').addEventListener('click', () => openSchemeManager());
  $('#exams-list').addEventListener('change', (e) => {
    if (!e.target.classList.contains('exam-enabled')) return;
    const ex = state.exams.exams.find(x => x.id === e.target.dataset.id);
    if (ex) { ex.enabled = e.target.checked; saveExamsSoon(); updateExamCountdowns(); }
  });
  $('#exams-list').addEventListener('click', async (e) => {
    const editBtn = e.target.closest('.act-edit-exam');
    const delBtn = e.target.closest('.act-del-exam');
    if (editBtn) {
      const ex = state.exams.exams.find(x => x.id === editBtn.dataset.id);
      if (ex) openExamEditor(ex);
    } else if (delBtn) {
      const ex = state.exams.exams.find(x => x.id === delBtn.dataset.id);
      if (!ex) return;
      const ok = await confirmDialog({ title: '删除考试', message: `确定删除「${esc(ex.subject)}」这场考试的播报配置吗？已生成的语音文件仍会保留在铃声库中。`, okText: '删除', danger: true });
      if (!ok) return;
      state.exams.exams = state.exams.exams.filter(x => x.id !== ex.id);
      saveExamsSoon();
      renderExams();
      toast('考试已删除', 'success');
    }
  });
}

function renderExams() {
  const list = $('#exams-list');
  const exams = [...(state.exams.exams || [])].sort((a, b) =>
    (a.date + String(a.startTime)).localeCompare(b.date + String(b.startTime)));
  if (!exams.length) {
    list.innerHTML = `<div class="empty"><div class="empty-ico">${icon('filetext')}</div><div>暂无考试播报安排，点击右上角「添加考试」配置</div></div>`;
    return;
  }
  list.innerHTML = exams.map(examCard).join('');
  updateExamCountdowns();
}

function examCard(ex) {
  const today = dateKey(new Date());
  const startSec = timeToMin(ex.startTime || '00:00') * 60;
  const durMin = Math.max(1, Number(ex.duration) || 1);
  const rangeTxt = `${secToHM(startSec)} - ${secToHM(startSec + durMin * 60)}`;
  const chips = examNodesOf(ex).map(n => {
    const on = !!(n.enabled && n.musicId);
    const tip = on ? `已配置：${esc(musicName(n.musicId))}` : '未配置铃声或未启用';
    return `<span class="stage-chip ${on ? '' : 'off'}" title="${tip}">${esc(n.label)} ${secToHM(n.sec)}</span>`;
  }).join('');
  return `<div class="card exam-card" data-id="${ex.id}">
    <div class="exam-head">
      <div class="exam-info">
        <div class="exam-subject">${esc(ex.subject)}<span class="chip chip-exam">${ex.date === today ? '今天' : esc(ex.date)}</span><span class="exam-meta">${rangeTxt} · 共 ${durMin} 分钟</span></div>
      </div>
      <div class="exam-acts">
        <span class="exam-countdown" data-id="${ex.id}"></span>
        <label class="switch"><input type="checkbox" class="exam-enabled" data-id="${ex.id}" ${ex.enabled ? 'checked' : ''}><span class="slider"></span></label>
        <button class="icon-btn act-edit-exam" data-id="${ex.id}" title="编辑">${icon('pencil')}</button>
        <button class="icon-btn danger act-del-exam" data-id="${ex.id}" title="删除">${icon('trash')}</button>
      </div>
    </div>
    <div class="exam-stage-row">${chips}</div>
    <div class="exam-progress"><div class="exam-progress-fill"></div></div>
  </div>`;
}

/* 列表卡片上的状态行：今天才显示倒计时/进行中，其他日期给静态说明；进行中的考试同步刷新底部进度条 */
function updateExamCountdowns() {
  const today = dateKey(new Date());
  const nowSec = nowSecOf(new Date());
  $$('.exam-countdown').forEach(el => {
    const ex = state.exams.exams.find(x => x.id === el.dataset.id);
    if (!ex) return;
    const startSec = timeToMin(ex.startTime || '00:00') * 60;
    const endSec = startSec + Math.max(1, Number(ex.duration) || 1) * 60;
    let txt = '', off = false;
    if (!ex.enabled) { txt = '已停用'; off = true; }
    else if (ex.date < today) { txt = '已过期'; off = true; }
    else if (ex.date > today) { txt = '未到考试日'; off = true; }
    else if (nowSec < startSec) txt = `距开考 ${fmtHMS(startSec - nowSec)}`;
    else if (nowSec < endSec) txt = `进行中 · 剩 ${Math.max(1, Math.ceil((endSec - nowSec) / 60))} 分钟`;
    else { txt = '已结束'; off = true; }
    el.textContent = txt;
    el.classList.toggle('off', off);
  });
  $$('.exam-card').forEach(card => {
    const bar = card.querySelector('.exam-progress');
    if (!bar) return;
    const ex = state.exams.exams.find(x => x.id === card.dataset.id);
    if (!ex) return;
    const startSec = timeToMin(ex.startTime || '00:00') * 60;
    const endSec = startSec + Math.max(1, Number(ex.duration) || 1) * 60;
    const active = ex.enabled && ex.date === today && nowSec >= startSec && nowSec < endSec;
    bar.classList.toggle('on', active);
    if (active) bar.querySelector('.exam-progress-fill').style.width = (((nowSec - startSec) / (endSec - startSec)) * 100).toFixed(1) + '%';
  });
}

/* 仪表盘「考试播报状态」卡片：仅当天有考试时显示，展示进行中 / 待开考 / 已结束与进度 */
function renderExamStatus(nowSec) {
  const card = $('#exam-status-card');
  const list = $('#exam-status-list');
  if (!card || !list) return;
  const today = dateKey(new Date());
  const todays = (state.exams.exams || []).filter(ex => ex.date === today)
    .sort((a, b) => timeToMin(a.startTime || '00:00') - timeToMin(b.startTime || '00:00'));
  if (!todays.length) { card.classList.add('hidden'); return; }
  card.classList.remove('hidden');
  list.innerHTML = todays.map(ex => {
    const startSec = timeToMin(ex.startTime || '00:00') * 60;
    const endSec = startSec + Math.max(1, Number(ex.duration) || 1) * 60;
    let cls = 'soon', txt = '';
    if (!ex.enabled) { cls = 'off'; txt = '已停用'; }
    else if (nowSec < startSec) { cls = 'soon'; txt = `${secToHM(startSec)} 开考 · 距开考 ${fmtHMS(startSec - nowSec)}`; }
    else if (nowSec < endSec) { cls = 'live'; txt = `进行中 · 剩 ${Math.max(1, Math.ceil((endSec - nowSec) / 60))} 分钟`; }
    else { cls = 'done'; txt = '已结束'; }
    const pct = nowSec >= endSec ? 100 : (nowSec > startSec ? ((nowSec - startSec) / (endSec - startSec)) * 100 : 0);
    return `<div class="es-row ${cls}">
      <span class="es-subject">${esc(ex.subject)}</span>
      <span class="es-range">${secToHM(startSec)} - ${secToHM(endSec)}</span>
      <span class="es-state">${txt}</span>
      <div class="es-bar"><div class="es-bar-fill" style="width:${pct.toFixed(1)}%"></div></div>
    </div>`;
  }).join('');
}

/* 音乐下拉选项：含「（不播报）」空值项；已删曲目显示占位项 */
function examMusicOptions(sel) {
  let html = '<option value="">（不播报）</option>';
  if (sel && !state.library.items.some(m => m.id === sel)) {
    html += `<option value="${esc(sel)}" selected>（原铃声已删除，请重新选择）</option>`;
  }
  html += state.library.items.map(m =>
    `<option value="${m.id}" ${m.id === sel ? 'selected' : ''}>${esc(m.name)}${m.tts ? '（语音）' : ''}</option>`).join('');
  return html;
}

/* 考试编辑弹窗：基本信息 + 选择「播报节点方案」（全部节点在方案中设定与维护） */
function openExamEditor(ex) {
  const isNew = !ex;
  const d = ex || {
    id: 'ex-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 6),
    date: dateKey(new Date()), subject: '', startTime: '08:30', duration: 120, enabled: true, stages: {}, schemeId: ''
  };
  // 新建考试且已有方案时默认选第一套，减少一次选择
  if (isNew && !d.schemeId && (state.examSchemes.schemes || []).length) d.schemeId = state.examSchemes.schemes[0].id;

  const schemeOptionsHtml = () => {
    const cur = d.schemeId || '';
    const opts = (state.examSchemes.schemes || []).map(s =>
      `<option value="${esc(s.id)}" ${s.id === cur ? 'selected' : ''}>${esc(s.name)}</option>`).join('');
    return `<option value="">（不使用方案）</option>${opts}`;
  };

  const ov = openModal(`<h3>${isNew ? '添加考试' : '编辑考试'}</h3>
    <div class="modal-body">
      <div class="exam-grid">
        <label>考试日期<input class="modal-input" type="date" id="ex-date" value="${esc(d.date)}"></label>
        <label>考试科目<input class="modal-input" id="ex-subject" maxlength="30" value="${esc(d.subject)}" placeholder="如：语文 / 数学 / 英语"></label>
        <label>开始时间<input class="modal-input" type="time" id="ex-start" value="${esc(d.startTime)}"></label>
        <label>时长（分钟）<input class="modal-input" type="number" id="ex-dur" min="1" max="720" step="5" value="${Math.max(1, Number(d.duration) || 120)}"></label>
      </div>
      <div class="scheme-pick-row">
        <label class="scheme-pick-label">播报节点方案</label>
        <select class="scheme-pick" id="ex-scheme">${schemeOptionsHtml()}</select>
        <button class="btn ghost sm" id="ex-manage-scheme" type="button">管理方案…</button>
        <span class="scheme-pick-tip">选方案时整场考试按方案播报；不使用方案时该考试不进行播报。</span>
      </div>
      <p class="stage-tip">需语音播报时，先在「铃声库 → 文字转语音」生成语音铃声，再在方案的各节点中选择。</p>
    </div>
    <div class="modal-btns">
      <button class="btn ghost" data-r="0">取消</button>
      <button class="btn" data-r="1">保存</button>
    </div>`);
  ov.querySelector('.modal').classList.add('modal-wide');

  /* 方案选择 / 管理 */
  $('#ex-manage-scheme').addEventListener('click', () => {
    openSchemeManager(() => {
      // 方案管理器关闭后刷新下拉选项（保留当前选择）
      const sel = $('#ex-scheme');
      const cur = sel.value;
      sel.innerHTML = schemeOptionsHtml();
      sel.value = cur;
    });
  });

  /* 保存：全部播报节点由所选方案决定；未选方案时保留考试原有 stages（旧数据兼容） */
  const done = (ok) => {
    if (!ok) { closeModal(); return; }
    const date = $('#ex-date').value || dateKey(new Date());
    const subject = $('#ex-subject').value.trim() || '未命名考试';
    const startTime = $('#ex-start').value || '08:30';
    const duration = Math.max(1, Math.min(720, Math.round(Number($('#ex-dur').value) || 60)));
    const schemeId = $('#ex-scheme').value;
    Object.assign(d, { date, subject, startTime, duration, schemeId });
    if (isNew) { d.enabled = true; state.exams.exams.push(d); }
    saveExamsSoon();
    renderExams();
    closeModal();
    toast(isNew ? '考试已添加' : '考试已保存', 'success');
  };
  ov.addEventListener('click', (e) => {
    const b = e.target.closest('[data-r]');
    if (b) done(b.dataset.r === '1');
  });
  ov.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeModal(); });
}

/* ---------- 播报节点方案管理器 ----------
   多套可复用的播报节点集合，考试通过 schemeId 引用，选中后整场考试按方案播报。
   节点结构：{ id, key, label, offsetMin, enabled, musicId }
   key 为触发时机：prestart(开考前 N 分钟) / start(开始考试) / preend(结束前 N 分钟) / end(考试结束)
   poststart(开考后 N 分钟) 仅兼容旧数据，不再提供新增 */
function openSchemeManager(onClose) {
  const SCHEME_NODE_TEMPLATES = [
    { label: '考场纪律', key: 'prestart', offsetMin: 5 },
    { label: '发放试卷', key: 'prestart', offsetMin: 1 },
    { label: '开始答题', key: 'start', offsetMin: 0 },
    { label: '提醒填涂答题卡', key: 'preend', offsetMin: 15 },
    { label: '收卷', key: 'end', offsetMin: 0 }
  ];

  /* 类型下拉选项（poststart 只在行本身为该类型时显示，供旧数据编辑） */
  const typeOptionsHtml = (cur) => NODE_TYPES
    .filter(t => t.key !== 'poststart' || cur === 'poststart')
    .map(t => `<option value="${t.key}" ${t.key === cur ? 'selected' : ''}>${t.label}</option>`)
    .join('');

  /* 单个节点行：开关 / 时机 / 名称 / 偏移(按时机显隐) / 铃声 / 删除 —— 全部同一行 */
  const nodeRowHtml = (node) => {
    const on = node.enabled != null ? node.enabled : true;
    const t = NODE_TYPES.find(x => x.key === node.key) || NODE_TYPES[0];
    return `<div class="scheme-node-row ${on ? 'on' : ''}" data-nid="${esc(node.id)}" data-key="${t.key}">
      <label class="switch"><input type="checkbox" class="sn-enabled" ${on ? 'checked' : ''}><span class="slider"></span></label>
      <select class="sn-type" title="触发时机">${typeOptionsHtml(t.key)}</select>
      <input class="modal-input sn-label" maxlength="12" value="${esc(node.label || '')}" placeholder="节点名称">
      ${t.offset
        ? `<span class="sn-offset"><span class="sn-off-label">${t.offsetLabel}</span> <input type="number" class="sn-offset-in" min="${t.key === 'poststart' ? -720 : 0}" max="720" step="1" value="${Number(node.offsetMin) || 0}"> 分钟</span>`
        : `<span class="sn-offset" style="display:none"><span class="sn-off-label"></span> <input type="number" class="sn-offset-in" min="0" max="720" step="1" value="0"> 分钟</span>`}
      <select class="sn-music" title="选择铃声">${examMusicOptions(node.musicId)}</select>
      <button class="icon-btn danger sn-del" title="删除该节点">${icon('trash')}</button>
    </div>`;
  };

  /* 时机切换 → 更新偏移区文案 / 显隐 / 取值范围 */
  const syncRowType = (row) => {
    const t = NODE_TYPES.find(x => x.key === row.querySelector('.sn-type').value) || NODE_TYPES[0];
    row.dataset.key = t.key;
    const offSpan = row.querySelector('.sn-offset');
    const inp = row.querySelector('.sn-offset-in');
    if (t.offset) {
      offSpan.style.display = '';
      offSpan.querySelector('.sn-off-label').textContent = t.offsetLabel;
      inp.min = t.key === 'poststart' ? -720 : 0;
    } else {
      offSpan.style.display = 'none';
    }
  };

  const schemeCardHtml = (sc) => {
    const nodes = (sc.nodes || []).filter(Boolean).map(migrateNode);
    return `<div class="scheme-card" data-sid="${esc(sc.id)}">
      <div class="scheme-card-head">
        <input class="modal-input scheme-name" maxlength="30" value="${esc(sc.name || '')}" placeholder="方案名称，如：标准考试流程">
        <span class="scheme-node-count">${nodes.length} 个节点</span>
        <button class="btn ghost sm sn-add" type="button">＋ 添加节点</button>
        <button class="icon-btn danger scheme-del" title="删除该方案">${icon('trash')}</button>
      </div>
      <div class="scheme-node-list">${nodes.map(nodeRowHtml).join('')}</div>
    </div>`;
  };

  const renderList = () => {
    const box = $('#sm-list');
    const schemes = state.examSchemes.schemes || [];
    if (!schemes.length) {
      box.innerHTML = '<div class="scheme-empty">还没有播报节点方案，点击右上角「新建方案」创建。</div>';
      return;
    }
    box.innerHTML = schemes.map(schemeCardHtml).join('');
  };

  const ov = openModal(`<h3>播报节点方案</h3>
    <div class="modal-body sm-body">
      <div class="sm-tip">每套方案由若干播报节点组成，每个节点可选择触发时机：开考前、结束前（可设提前分钟数）、开始考试、考试结束；添加考试时选一套方案，整场考试即按该方案播报。</div>
      <div class="sm-head">
        <button class="btn primary sm" id="sm-new">＋ 新建方案</button>
        <span class="sm-count">共 ${(state.examSchemes.schemes || []).length} 套</span>
      </div>
      <div id="sm-list"></div>
    </div>
    <div class="modal-btns">
      <button class="btn" data-r="1">完成</button>
    </div>`);
  ov.querySelector('.modal').classList.add('modal-sm');
  renderList();

  const collectScheme = (card) => {
    const id = card.dataset.sid;
    const name = (card.querySelector('.scheme-name').value || '').trim().slice(0, 30) || '未命名方案';
    const nodes = [...card.querySelectorAll('.scheme-node-row')].map(row => {
      const t = NODE_TYPES.find(x => x.key === row.querySelector('.sn-type').value) || NODE_TYPES[0];
      const offIn = row.querySelector('.sn-offset-in');
      const off = offIn && t.offset
        ? Math.max(t.key === 'poststart' ? -720 : 0, Math.min(720, Math.round(Number(offIn.value) || 0)))
        : 0;
      return {
        id: row.dataset.nid,
        key: t.key,
        label: ((row.querySelector('.sn-label') || {}).value || '').trim().slice(0, 12) || t.label,
        offsetMin: t.key === 'prestart' ? Math.abs(off) : off,
        enabled: row.querySelector('.sn-enabled').checked,
        musicId: row.querySelector('.sn-music').value
      };
    });
    return { id, name, nodes };
  };

  /* 从 DOM 收集所有方案并保存 */
  const collectAll = () => {
    state.examSchemes.schemes = [...ov.querySelectorAll('.scheme-card')].map(collectScheme);
    saveExamSchemesSoon();
  };

  /* 绑定单个方案卡片内的交互 */
  const bindCard = (card) => {
    const count = () => {
      card.querySelector('.scheme-node-count').textContent = card.querySelectorAll('.scheme-node-row').length + ' 个节点';
    };
    const bindRow = (row) => {
      row.querySelector('.sn-enabled').addEventListener('change', () => row.classList.toggle('on', row.querySelector('.sn-enabled').checked));
      row.querySelector('.sn-type').addEventListener('change', () => syncRowType(row));
      row.querySelector('.sn-del').addEventListener('click', () => { row.remove(); count(); });
    };
    card.querySelectorAll('.scheme-node-row').forEach(bindRow);
    card.querySelector('.sn-add').addEventListener('click', () => {
      const tpl = SCHEME_NODE_TEMPLATES[card.querySelectorAll('.scheme-node-row').length % SCHEME_NODE_TEMPLATES.length];
      const node = {
        id: 'c-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 6),
        key: tpl.key, label: tpl.label, offsetMin: tpl.offsetMin, enabled: true, musicId: ''
      };
      const wrap = document.createElement('div');
      wrap.innerHTML = nodeRowHtml(node);
      const row = wrap.firstElementChild;
      card.querySelector('.scheme-node-list').appendChild(row);
      bindRow(row);
      row.querySelector('.sn-label').focus();
      count();
    });
  };
  ov.querySelectorAll('.scheme-card').forEach(bindCard);

  /* 新建方案 */
  $('#sm-new').addEventListener('click', () => {
    collectAll(); // 先保存当前输入
    const sc = {
      id: 'sch-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 6),
      name: '新方案', nodes: []
    };
    state.examSchemes.schemes.push(sc);
    renderList();
    ov.querySelectorAll('.scheme-card').forEach(bindCard);
    const cards = ov.querySelectorAll('.scheme-card');
    if (cards.length) {
      const nameIn = cards[cards.length - 1].querySelector('.scheme-name');
      nameIn.focus(); nameIn.select();
    }
  });

  /* 删除方案（confirmDialog 会替换模态，需先收集再重开管理器） */
  ov.addEventListener('click', async (e) => {
    const del = e.target.closest('.scheme-del');
    if (!del) return;
    const sid = del.closest('.scheme-card').dataset.sid;
    const sc = state.examSchemes.schemes.find(s => s.id === sid);
    const name = sc ? sc.name : '该方案';
    collectAll();
    const ok = await confirmDialog({ title: '删除方案', message: `确定删除方案「${esc(name)}」吗？引用该方案的考试将不再播报其节点。`, okText: '删除', danger: true });
    if (!ok) { openSchemeManager(onClose); return; }
    state.examSchemes.schemes = state.examSchemes.schemes.filter(s => s.id !== sid);
    saveExamSchemesSoon();
    openSchemeManager(onClose);
  });

  const finish = () => { collectAll(); closeModal(); if (typeof onClose === 'function') onClose(); };
  ov.addEventListener('click', (e) => {
    if (e.target.closest('[data-r="1"]')) finish();
  });
  ov.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { collectAll(); closeModal(); if (typeof onClose === 'function') onClose(); }
  });
}

/* ============================================================
   播放记录页
   ============================================================ */
function addLog({ type, bell, music, result, note }) {
  const entry = {
    ts: Date.now(), type, bell: bell || '—', music: music || '—',
    volume: Math.round(state.settings.volume * 100), result: result || '—', note: note || ''
  };
  state.logs.entries.unshift(entry);
  if (state.logs.entries.length > 2000) state.logs.entries.length = 2000;
  bellApi.logs.append(entry);
  if (state.activePage === 'logs') renderLogs();
}

function bindLogsPage() {
  $('#btn-clear-logs').addEventListener('click', async () => {
    const ok = await confirmDialog({ title: '清空播放记录', message: '确定清空全部播放记录吗？此操作不可恢复。', okText: '清空', danger: true });
    if (!ok) return;
    await bellApi.logs.clear();
    state.logs.entries = [];
    renderLogs();
    toast('播放记录已清空', 'success');
  });
}

function renderLogs() {
  const body = $('#logs-body');
  const entries = state.logs.entries || [];
  $('#logs-empty').classList.toggle('hidden', entries.length > 0);
  body.innerHTML = entries.slice(0, 300).map(L => {
    const typeCls = { '自动': 'chip', '手动': 'chip chip-ok', '跳过': 'chip chip-warn', '考试': 'chip chip-exam' }[L.type] || 'chip chip-off';
    return `<tr>
      <td class="log-time">${fmtDateTime(L.ts)}</td>
      <td><span class="${typeCls}">${L.type}</span></td>
      <td>${esc(L.bell)}</td>
      <td>${esc(L.music)}</td>
      <td>${L.volume}%</td>
      <td class="${L.result === '失败' ? 'log-res-fail' : ''}">${L.result}${L.note ? ' · ' + esc(L.note) : ''}</td>
    </tr>`;
  }).join('');
}

/* ============================================================
   设置页
   ============================================================ */
let saveSettingsTimer = null;
function saveSettingsSoon() {
  clearTimeout(saveSettingsTimer);
  saveSettingsTimer = setTimeout(() => bellApi.settings.save(state.settings), 300);
}

function bindSettingsPage() {
  $('#set-volume').addEventListener('input', (e) => applyVolume(e.target.value / 100));
  $('#set-theme').addEventListener('change', (e) => {
    state.settings.theme = e.target.value;
    applyTheme();
    saveSettingsSoon();
    toast(e.target.value === 'light' ? '已切换到亮色主题' : '已切换到深色主题', 'success');
  });
  $('#set-fadein').addEventListener('change', (e) => { state.settings.fadeIn = Number(e.target.value) || 0; saveSettingsSoon(); });
  $('#set-fadeout').addEventListener('change', (e) => { state.settings.fadeOut = Number(e.target.value) || 0; saveSettingsSoon(); });
  $('#set-output').addEventListener('change', (e) => {
    state.settings.outputDevice = e.target.value;
    applyOutputDevice();
    saveSettingsSoon();
    toast('输出设备已切换', 'success');
  });
  $('#set-autolaunch').addEventListener('change', async (e) => {
    try {
      await bellApi.app.setAutoLaunch(e.target.checked);
      state.appInfo.autoLaunch = e.target.checked;
      toast(e.target.checked ? '已设置开机自启' : '已取消开机自启', 'success');
    } catch {
      e.target.checked = !e.target.checked;
      toast('设置失败，请稍后重试', 'error');
    }
  });
  $('#set-keepawake').addEventListener('change', async (e) => {
    const on = e.target.checked;
    try {
      await bellApi.app.setKeepAwake(on);
      state.settings.keepAwake = on;
      saveSettingsSoon();
      toast(on ? '运行期间将阻止电脑休眠' : '已恢复系统默认休眠策略', 'success');
    } catch {
      e.target.checked = !on;
      toast('设置失败，请稍后重试', 'error');
    }
  });
  $('#btn-open-data').addEventListener('click', () => bellApi.app.openDataFolder());
  $('#btn-backup-export').addEventListener('click', async () => {
    const r = await bellApi.backup.export();
    if (!r || r.canceled) return;
    if (!r.ok) { toast(r.error || '备份失败', 'error'); return; }
    toast(`备份完成（${r.count} 个音频文件）`, 'success');
  });
  $('#btn-backup-restore').addEventListener('click', async () => {
    const ok = await confirmDialog({ title: '恢复备份', message: '将用备份内容覆盖当前的铃声方案、铃声库、设置与播放记录，完成后应用自动重启。此操作不可撤销，确定继续？', okText: '恢复', danger: true });
    if (!ok) return;
    const r = await bellApi.backup.restore();
    if (!r || r.canceled) return;
    if (!r.ok) { toast(r.error || '恢复失败', 'error'); return; }
    toast('恢复完成，应用即将重启…', 'success');
    setTimeout(() => bellApi.app.relaunch(), 800);
  });
}

function syncSettingsUI() {
  const v = Math.round(clamp01(state.settings.volume) * 100);
  const sv = $('#set-volume');
  sv.value = v;
  updateFill(sv, v);
  $('#vol-show').textContent = v + '%';
  const pv = $('#pb-volume');
  pv.value = v;
  updateFill(pv, v);
  $('#set-fadein').value = state.settings.fadeIn || 0;
  $('#set-fadeout').value = state.settings.fadeOut || 0;
  $('#set-theme').value = state.settings.theme === 'light' ? 'light' : 'dark';
  $('#set-autolaunch').checked = !!state.appInfo.autoLaunch;
  $('#set-keepawake').checked = state.settings.keepAwake !== false;
  $('#data-dir-show').textContent = state.appInfo.dataDir || '—';
  $('#about-version').textContent = 'v' + (state.appInfo.version || '1.0.0');
  updateMuteButtons(isMuted());
}

/* 主题切换 */
function applyTheme() {
  document.body.dataset.theme = state.settings.theme === 'light' ? 'light' : 'dark';
}

/* ============================================================
   弹窗 / Toast
   ============================================================ */
function openModal(html) {
  const root = $('#modal-root');
  root.innerHTML = `<div class="modal-overlay"><div class="modal">${html}</div></div>`;
  const ov = root.firstElementChild;
  ov.addEventListener('mousedown', (e) => { if (e.target === ov) closeModal(); });
  return ov;
}
function closeModal() { $('#modal-root').innerHTML = ''; }

function confirmDialog({ title, message, okText = '确定', danger = false }) {
  return new Promise((resolve) => {
    const ov = openModal(`<h3>${title}</h3><div class="modal-body">${message}</div>
      <div class="modal-btns">
        <button class="btn ghost" data-r="0">取消</button>
        <button class="btn ${danger ? 'danger' : ''}" data-r="1">${okText}</button>
      </div>`);
    ov.addEventListener('click', (e) => {
      const b = e.target.closest('[data-r]');
      if (b) { closeModal(); resolve(b.dataset.r === '1'); }
    });
  });
}

function promptDialog({ title, label = '', value = '' }) {
  return new Promise((resolve) => {
    const ov = openModal(`<h3>${title}</h3>${label ? `<div class="modal-body">${label}</div>` : '<div style="height:8px"></div>'}
      <input class="modal-input" value="${esc(value)}" maxlength="60">
      <div class="modal-btns">
        <button class="btn ghost" data-r="0">取消</button>
        <button class="btn" data-r="1">确定</button>
      </div>`);
    const input = ov.querySelector('.modal-input');
    input.focus();
    input.select();
    const done = (ok) => {
      const v = input.value.trim();
      closeModal();
      resolve(ok && v ? v : null);
    };
    ov.addEventListener('click', (e) => {
      const b = e.target.closest('[data-r]');
      if (b) done(b.dataset.r === '1');
    });
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') done(true);
      if (e.key === 'Escape') done(false);
    });
  });
}

/* 铃声播放参数弹窗：提前播放（秒）/ 播放时长（秒） / 多曲播放（模式 + 曲目池） */
function bellCfgDialog(bell) {
  return new Promise((resolve) => {
    const poolSaved = Array.isArray(bell.musicIds) ? bell.musicIds : [];
    const poolHtml = state.library.items.map(mm => `
      <label class="pool-item"><input type="checkbox" class="cfg-pool-item" value="${mm.id}" ${poolSaved.includes(mm.id) ? 'checked' : ''}><span class="pool-name">${esc(mm.name)}</span><em>${fmtDur(mm.duration)}</em></label>`).join('');
    const ov = openModal(`<h3>播放参数 · ${esc(bell.time)} ${esc(bell.name)}</h3>
      <div class="modal-body">
        <div class="cfg-row">
          <div class="cfg-dual">
            <div class="cfg-cell">
              <div class="cfg-label">提前播放</div>
              <div class="cfg-field">
                <input type="number" class="cfg-input" id="cfg-adv" min="0" max="1800" step="1" value="${Number(bell.advance) || 0}">
                <span class="cfg-unit">秒</span>
              </div>
              <div class="cfg-help">0 = 按设定时间播放。按秒精确提前，如设为 90 表示提前 90 秒（1 分 30 秒）开始播放。</div>
            </div>
            <div class="cfg-cell">
              <div class="cfg-label">播放时长</div>
              <div class="cfg-field">
                <input type="number" class="cfg-input" id="cfg-dur" min="0" max="3600" step="5" value="${bellDurOf(bell)}">
                <span class="cfg-unit">秒</span>
              </div>
              <div class="cfg-help">0 = 播放完整音频。设置后到时自动淡出停止，适合用较长的音乐作为铃声。</div>
            </div>
          </div>
        </div>
        <div class="cfg-row">
          <div class="cfg-label">多曲播放</div>
          <div class="cfg-field" style="display:block">
            <div class="cfg-modes">
              ${Object.entries(PLAY_MODES).map(([k, v]) => `<label class="cfg-mode"><input type="radio" name="cfg-mode" value="${k}" ${(bell.playMode || 'shuffle-one') === k ? 'checked' : ''}>${v}</label>`).join('')}
            </div>
            <div class="pool-list">${poolHtml || '<div class="pool-empty">铃声库为空，无法配置多曲播放</div>'}</div>
            <div class="cfg-help">勾选 2 首或以上时按所选模式播放：随机轮换 / 顺序轮换 = 每次打铃播一首；随机连播 / 顺序连播 = 每次打铃依次播完勾选的全部曲目。全部不勾选则使用铃声行选中的单曲。</div>
          </div>
        </div>
      </div>
      <div class="modal-btns">
        <button class="btn ghost" data-r="0">取消</button>
        <button class="btn" data-r="1">保存</button>
      </div>`);
    ov.querySelector('.modal').classList.add('modal-sm'); // 加宽弹窗，提前播放 / 播放时长同排一行
    const advIn = ov.querySelector('#cfg-adv');
    const durIn = ov.querySelector('#cfg-dur');
    advIn.focus();
    advIn.select();
    const done = (ok) => {
      if (!ok) { closeModal(); resolve(false); return; }
      bell.advance = Math.max(0, Math.min(1800, Math.round(Number(advIn.value) || 0)));
      bell.duration = Math.max(0, Math.min(3600, Math.round(Number(durIn.value) || 0)));
      bell.musicIds = [...ov.querySelectorAll('.cfg-pool-item:checked')].map(c => c.value);
      const modeSel = ov.querySelector('input[name="cfg-mode"]:checked');
      bell.playMode = modeSel ? modeSel.value : 'shuffle-one';
      closeModal();
      resolve(true);
    };
    ov.addEventListener('click', (e) => {
      const b = e.target.closest('[data-r]');
      if (b) done(b.dataset.r === '1');
    });
    [advIn, durIn].forEach(inp => inp.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') done(true);
      if (e.key === 'Escape') done(false);
    }));
  });
}

function toast(msg, type = 'info') {
  const root = $('#toast-root');
  const t = document.createElement('div');
  t.className = 'toast ' + type;
  t.innerHTML = `${icon(type === 'success' ? 'check' : type === 'error' ? 'alert' : 'info')}<span>${msg}</span>`;
  root.appendChild(t);
  while (root.children.length > 5) root.firstChild.remove();
  setTimeout(() => {
    t.classList.add('out');
    setTimeout(() => t.remove(), 260);
  }, 2800);
}
