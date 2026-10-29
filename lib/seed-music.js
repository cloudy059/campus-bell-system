// 内置铃声合成器 + 默认作息方案
// 首次运行时用纯代码合成 5 首 WAV 铃声（正弦分音叠加 + 指数衰减，模拟钟声音色）
// 同时提供开箱即用的"标准作息"示例方案
'use strict';
const fs = require('fs');
const path = require('path');

const SR = 44100; // 采样率
const PARTIALS = [1, 2, 3, 4.16];        // 分音倍频（4.16 为钟体特征泛音）
const PARTIAL_GAINS = [1, 0.5, 0.25, 0.12];

// 音符频率表
const F = {
  G3: 196.00, C4: 261.63, D4: 293.66, E4: 329.63, G4: 392.00,
  C5: 523.25, D5: 587.33, E5: 659.25, F5: 698.46, G5: 783.99, C6: 1046.50
};

/**
 * 渲染一段钟声旋律为 Float32 采样
 * @param {Array<{f:number,t:number,gain?:number,rate?:number}>} notes 音符列表
 * @param {number} total 总时长（秒）
 */
function renderTrack(notes, total) {
  const n = Math.ceil(total * SR);
  const buf = new Float32Array(n);
  for (const note of notes) {
    const rate = note.rate || 1.9;               // 基音衰减速率（越大余音越短）
    const amp = note.gain != null ? note.gain : 1;
    const start = Math.floor(note.t * SR);
    // 单音符只需渲染到衰减为静音（5τ），避免无谓计算
    const len = Math.min(n - start, Math.ceil((5 / rate) * SR));
    for (let i = 0; i < len; i++) {
      const tt = i / SR;
      const attack = Math.min(1, tt / 0.004);   // 4ms 起音，消除爆音
      let s = 0;
      for (let p = 0; p < PARTIALS.length; p++) {
        const pr = rate * (1 + p * 0.9);        // 高次分音衰减更快
        s += Math.sin(2 * Math.PI * note.f * PARTIALS[p] * tt)
           * PARTIAL_GAINS[p] * Math.exp(-tt * pr);
      }
      buf[start + i] += s * attack * amp * 0.28;
    }
  }
  // 峰值归一化 + 全局 80ms 淡出
  let peak = 0;
  for (let i = 0; i < n; i++) peak = Math.max(peak, Math.abs(buf[i]));
  const g = peak > 0 ? 0.85 / peak : 1;
  const fadeN = Math.min(n, Math.floor(0.08 * SR));
  for (let i = 0; i < n; i++) {
    let v = buf[i] * g;
    if (i >= n - fadeN) v *= (n - i) / fadeN;
    buf[i] = v;
  }
  return buf;
}

/** Float32 采样 -> 16bit PCM WAV 文件 Buffer */
function toWav(f32) {
  const samples = f32.length;
  const dataLen = samples * 2;
  const out = Buffer.alloc(44 + dataLen);
  out.write('RIFF', 0);
  out.writeUInt32LE(36 + dataLen, 4);
  out.write('WAVE', 8);
  out.write('fmt ', 12);
  out.writeUInt32LE(16, 16);
  out.writeUInt16LE(1, 20);            // PCM
  out.writeUInt16LE(1, 22);            // 单声道
  out.writeUInt32LE(SR, 24);
  out.writeUInt32LE(SR * 2, 28);       // 字节率
  out.writeUInt16LE(2, 32);            // 块对齐
  out.writeUInt16LE(16, 34);           // 位深
  out.write('data', 36);
  out.writeUInt32LE(dataLen, 40);
  for (let i = 0; i < samples; i++) {
    out.writeInt16LE(Math.max(-32768, Math.min(32767, Math.round(f32[i] * 32767))), 44 + i * 2);
  }
  return out;
}

// ---------- 5 首内置铃声定义 ----------
const track1Notes = [];
for (let i = 0; i < 6; i++) track1Notes.push({ f: i % 2 === 0 ? F.E5 : F.C5, t: i * 0.38, rate: 2.2 });

const arpOffsets = [0, 0.18, 0.36, 0.54, 0.72, 1.0, 1.18, 1.36];
const arpFreqs = [F.C5, F.D5, F.E5, F.G5, F.C6, F.G5, F.E5, F.C5];
const track2Notes = [];
for (let c = 0; c < 2; c++) arpOffsets.forEach((o, i) => track2Notes.push({ f: arpFreqs[i], t: c * 1.72 + o, gain: 0.85, rate: 2.4 }));

const melody = [F.E5, F.D5, F.C5, F.D5, F.E5, F.E5, F.E5, F.D5, F.D5, F.D5, F.E5, F.G5, F.G5];
const track4Notes = melody.map((f, i) => ({ f, t: i * 0.24, gain: 0.9, rate: 2.0 }));

const track5Notes = [];
[F.E4, F.C4, F.D4, F.G3].forEach((f, i) => track5Notes.push({ f, t: i * 0.75, rate: 1.5 }));
[F.G3, F.D4, F.E4, F.C4].forEach((f, i) => track5Notes.push({ f, t: 3.6 + i * 0.75, rate: 1.5 }));

const TRACKS = [
  { id: 'seed-1', name: '上课铃 · 清脆双音', fileName: 'seed-1-shangke.wav', category: '上课铃', notes: track1Notes, total: 4.2 },
  { id: 'seed-2', name: '下课铃 · 欢快琶音', fileName: 'seed-2-xiake.wav', category: '下课铃', notes: track2Notes, total: 5.4 },
  { id: 'seed-3', name: '预备铃 · 柔和双音', fileName: 'seed-3-yubei.wav', category: '预备铃', notes: [
    { f: F.G4, t: 0, gain: 0.95, rate: 1.3 },
    { f: F.D5, t: 0.7, gain: 0.6, rate: 1.6 }
  ], total: 4.6 },
  { id: 'seed-4', name: '放学铃 · 欢快旋律', fileName: 'seed-4-fangxue.wav', category: '放学', notes: track4Notes, total: 5.2 },
  { id: 'seed-5', name: '西敏寺钟声 · 报时曲', fileName: 'seed-5-chime.wav', category: '仪式', notes: track5Notes, total: 8.6 }
];

/** 生成全部内置铃声文件到 mediaDir，返回音乐库条目列表 */
function buildSeedLibrary(mediaDir) {
  fs.mkdirSync(mediaDir, { recursive: true });
  const now = new Date().toISOString();
  return TRACKS.map(tr => {
    const samples = renderTrack(tr.notes, tr.total);
    fs.writeFileSync(path.join(mediaDir, tr.fileName), toWav(samples));
    return {
      id: tr.id, name: tr.name, fileName: tr.fileName, ext: '.wav',
      duration: Math.round(tr.total * 10) / 10,
      category: tr.category, builtIn: true, addedAt: now
    };
  });
}

/** 开箱即用的默认作息方案（周一~周五） */
function defaultSchedule() {
  const rows = [
    ['07:30', '早读', 'seed-3'],
    ['07:50', '预备铃', 'seed-3'],
    ['08:00', '第一节 · 上课', 'seed-1'],
    ['08:45', '第一节 · 下课', 'seed-2'],
    ['08:55', '第二节 · 上课', 'seed-1'],
    ['09:40', '第二节 · 下课', 'seed-2'],
    ['09:50', '第三节 · 上课', 'seed-1'],
    ['10:35', '第三节 · 下课', 'seed-2'],
    ['10:45', '第四节 · 上课', 'seed-1'],
    ['11:30', '第四节 · 下课', 'seed-2'],
    ['11:40', '上午放学', 'seed-4'],
    ['14:00', '午休预备', 'seed-3'],
    ['14:10', '第五节 · 上课', 'seed-1'],
    ['14:55', '第五节 · 下课', 'seed-2'],
    ['15:05', '第六节 · 上课', 'seed-1'],
    ['15:50', '第六节 · 下课', 'seed-2'],
    ['16:00', '第七节 · 上课', 'seed-1'],
    ['16:45', '放学', 'seed-4']
  ];
  return {
    sets: [{
      id: 'set-standard',
      name: '标准作息',
      enabled: true,
      days: [1, 2, 3, 4, 5],
      bells: rows.map((r, i) => ({ id: 'b' + (i + 1), time: r[0], name: r[1], musicId: r[2], enabled: true }))
    }],
    overrides: []
  };
}

module.exports = { buildSeedLibrary, defaultSchedule };
