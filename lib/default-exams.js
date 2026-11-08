// 内置示例：2026 年高考（新高考「3+1+2」常见日程）考试播报安排 + 标准播报节点方案
// 仅在首次运行（exams.json / exam-schemes.json 不存在）时写入，也可以在「考试播报」页手动重新载入。
// 铃声先指向内置合成的 WAV 铃声占位，学校可在「铃声库 → 文字转语音」生成语音后再替换各节点。
'use strict';

const SCHEME_ID = 'sch-gaokao-2026';
const OVERRIDE_ID = 'ov-gaokao-2026';

/** 标准高考播报流程：入场 / 纪律 / 发卷 / 开考 / 剩余 15 分钟 / 收卷 */
const SCHEME_NODES = [
  { id: 'gk-n1', key: 'prestart', label: '考生入场', offsetMin: 30, enabled: true, musicId: 'seed-3' },
  { id: 'gk-n2', key: 'prestart', label: '宣读考场纪律', offsetMin: 15, enabled: true, musicId: 'seed-3' },
  { id: 'gk-n3', key: 'prestart', label: '发放试卷', offsetMin: 5, enabled: true, musicId: 'seed-1' },
  { id: 'gk-n4', key: 'start', label: '开始答题', offsetMin: 0, enabled: true, musicId: 'seed-1' },
  { id: 'gk-n5', key: 'preend', label: '剩余15分钟', offsetMin: 15, enabled: true, musicId: 'seed-5' },
  { id: 'gk-n6', key: 'end', label: '考试结束收卷', offsetMin: 0, enabled: true, musicId: 'seed-2' }
];

/** 2026 年高考：6 月 7 日 ~ 6 月 9 日（各省选考科目时间略有差异，请按本地考试院通知调整） */
const EXAM_ROWS = [
  ['2026-06-07', '语文', '09:00', 150],
  ['2026-06-07', '数学', '15:00', 120],
  ['2026-06-08', '物理 / 历史', '09:00', 75],
  ['2026-06-08', '外语（含听力）', '15:00', 120],
  ['2026-06-09', '化学', '08:30', 75],
  ['2026-06-09', '地理', '11:00', 75],
  ['2026-06-09', '思想政治', '14:30', 75],
  ['2026-06-09', '生物学', '17:00', 75]
];

function defaultExamSchemes() {
  return [{
    id: SCHEME_ID,
    name: '2026 高考 · 标准播报流程',
    nodes: SCHEME_NODES.map(n => ({ ...n }))
  }];
}

function defaultExams() {
  return EXAM_ROWS.map((r, i) => ({
    id: `ex-gaokao-2026-${i + 1}`,
    date: r[0],
    subject: r[1],
    startTime: r[2],
    duration: r[3],
    enabled: true,
    schemeId: SCHEME_ID
  }));
}

/** 高考期间暂停常规铃声的特殊日期范围（可在载入示例时勾选添加） */
function gaokaoOverride() {
  return {
    id: OVERRIDE_ID,
    name: '2026年高考（常规铃声暂停）',
    date: '2026-06-07',
    endDate: '2026-06-09',
    type: 'holiday',
    setId: null,
    collapsed: true
  };
}

module.exports = { defaultExams, defaultExamSchemes, gaokaoOverride, SCHEME_ID, OVERRIDE_ID };
