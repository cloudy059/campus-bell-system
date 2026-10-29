'use strict';
/* ============================================================
   迷你悬浮条 — 关闭主窗口到托盘时显示在屏幕顶端
   时钟 + 下次铃声倒计时；点击条体打开主窗口，× 隐藏
   ============================================================ */
const $ = (s) => document.querySelector(s);
const pad = (n) => String(n).padStart(2, '0');
const dateKey = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const timeToMin = (t) => { const [h, m] = String(t).split(':').map(Number); return (h || 0) * 60 + (m || 0); };
/* 与主界面一致：考虑提前播放（秒）后的实际触发时刻 */
const bellSecOf = (b) => Math.max(0, timeToMin(b.time) * 60 - (Number(b.advance) || 0));
const nowSecOf = (d) => d.getHours() * 3600 + d.getMinutes() * 60 + d.getSeconds();
const fmtHMS = (sec) => `${pad(Math.floor(sec / 3600))}:${pad(Math.floor(sec / 60) % 60)}:${pad(Math.floor(sec) % 60)}`;
const secToHM = (sec) => `${pad(Math.floor(sec / 3600))}:${pad(Math.floor((sec % 3600) / 60))}`;

const state = { sets: [], overrides: [], exams: [] };

/* 今日生效的铃声（特殊日期覆盖 + 按星期匹配启用方案） */
function resolveToday(now) {
  const ov = (state.overrides || []).find(o => o.date === dateKey(now));
  if (ov) {
    if (ov.type === 'holiday') return [];
    const s = state.sets.find(x => x.id === ov.setId);
    if (s) return [...(s.bells || [])];
  }
  const wd = now.getDay();
  const set = state.sets.find(s => s.enabled && (s.days || []).includes(wd));
  return set ? [...(set.bells || [])] : [];
}

function render(now) {
  $('#m-clock').textContent = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
  const bells = resolveToday(now);
  const nowSec = nowSecOf(now);
  let best = null, bestSec = Infinity;
  for (const b of bells) {
    if (!b.enabled) continue;
    const s = bellSecOf(b);
    if (s > nowSec && s < bestSec) { best = b; bestSec = s; }
  }
  if (best) {
    $('#m-bell').textContent = `下次 · ${best.name}`;
    $('#m-count').textContent = fmtHMS(bestSec - nowSec);
  } else {
    $('#m-bell').textContent = bells.length ? '今日铃声已全部结束' : '今日无铃声安排';
    $('#m-count').textContent = '';
  }
  renderExamStatus(now, nowSec);
}

/* 考试播报状态：进行中 > 待开考，仅当天启用的考试参与 */
function renderExamStatus(now, nowSec) {
  const today = dateKey(now);
  let live = null, next = null;
  for (const ex of state.exams) {
    if (!ex.enabled || ex.date !== today) continue;
    const startSec = timeToMin(ex.startTime || '00:00') * 60;
    const endSec = startSec + Math.max(1, Number(ex.duration) || 1) * 60;
    if (nowSec >= startSec && nowSec < endSec) { live = { ex, endSec }; break; }
    if (nowSec < startSec && (!next || startSec < next.startSec)) next = { ex, startSec };
  }
  const el = $('#m-exam');
  if (live) {
    el.textContent = `考试·${live.ex.subject || '未命名'} 剩${Math.max(1, Math.ceil((live.endSec - nowSec) / 60))}分`;
    el.classList.add('live');
    el.classList.remove('hidden');
  } else if (next) {
    el.textContent = `考试·${next.ex.subject || '未命名'} ${secToHM(next.startSec)}开考`;
    el.classList.remove('live');
    el.classList.remove('hidden');
  } else {
    el.classList.remove('live');
    el.classList.add('hidden');
  }
}

/* 方案可能在主窗口被修改：定时同步（主题也一并同步） */
async function reloadData() {
  try {
    const sch = await bellApi.schedules.load();
    state.sets = (sch && sch.sets) || [];
    state.overrides = (sch && sch.overrides) || [];
  } catch { /* 忽略 */ }
  try {
    const exs = await bellApi.exams.load();
    state.exams = (exs && exs.exams) || [];
  } catch { /* 忽略 */ }
  try {
    const st = await bellApi.settings.load();
    document.body.dataset.theme = (st && st.theme) || 'dark';
  } catch { /* 忽略 */ }
}

$('#m-close').addEventListener('click', (e) => { e.stopPropagation(); bellApi.mini.hide(); });
$('#bar').addEventListener('click', () => bellApi.mini.openMain());

reloadData().then(() => render(new Date()));
let lastReload = 0;
setInterval(() => {
  const now = new Date();
  render(now);
  const slot = Math.floor(now.getTime() / 30000);
  if (slot !== lastReload) { lastReload = slot; reloadData(); } // 每 30 秒同步一次
}, 250);
