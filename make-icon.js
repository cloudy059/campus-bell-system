// 生成应用图标 icon.png（256x256，渐变铃铛图形）
// 纯 Node 实现：像素绘制 + zlib PNG 编码，无需任何第三方依赖
// 运行：node make-icon.js
'use strict';
const zlib = require('zlib');
const fs = require('fs');
const path = require('path');

const SIZE = 256;
const CX = SIZE / 2;

// ---------- 几何：判断点是否在铃铛图形内 ----------
function insideBell(x, y) {
  const dx = x - CX;
  // 顶部提环：圆环，圆心 (128,40)，外径 26，内径 13
  const ringD = Math.sqrt(dx * dx + (y - 40) * (y - 40));
  if (ringD <= 26 && ringD >= 13) return true;
  // 钟形主体：上半圆顶（圆心 128,96，r=54）
  if (y >= 42 && y <= 96) {
    const halfW = Math.sqrt(Math.max(0, 54 * 54 - (y - 96) * (y - 96)));
    if (Math.abs(x - CX) <= halfW) return true;
  }
  // 下摆裙：96 -> 188，半宽 54 -> 76（外扩）
  if (y > 96 && y <= 188) {
    const t = (y - 96) / 92;
    if (Math.abs(x - CX) <= 54 + t * 22) return true;
  }
  // 底缘横条
  if (y > 188 && y <= 200 && Math.abs(x - CX) <= 78) return true;
  // 铃舌：圆 (128,208) r=14
  const clD = Math.sqrt(dx * dx + (y - 208) * (y - 208));
  if (y > 198 && clD <= 14) return true;
  return false;
}

// 2x2 超采样抗锯齿，返回覆盖率 [0,1]
function coverage(px, py) {
  let hit = 0;
  for (let sy = 0; sy < 2; sy++) {
    for (let sx = 0; sx < 2; sx++) {
      if (insideBell(px + (sx - 0.5) * 0.5, py + (sy - 0.5) * 0.5)) hit++;
    }
  }
  return hit / 4;
}

// ---------- 渐变着色：顶部 indigo -> 底部 violet ----------
function lerp(a, b, t) { return a + (b - a) * t; }
function colorAt(y) {
  const t = Math.min(1, Math.max(0, y / SIZE));
  return [
    Math.round(lerp(99, 168, t)),   // #6366f1 -> #a855f7
    Math.round(lerp(102, 85, t)),
    Math.round(lerp(241, 247, t))
  ];
}

// ---------- 生成 RGBA 像素 ----------
const raw = Buffer.alloc(SIZE * (1 + SIZE * 4)); // 每行 1 字节 filter + RGBA
for (let y = 0; y < SIZE; y++) {
  const rowStart = y * (1 + SIZE * 4);
  raw[rowStart] = 0; // PNG filter: None
  const [r, g, b] = colorAt(y);
  for (let x = 0; x < SIZE; x++) {
    const cov = coverage(x + 0.5, y + 0.5);
    const i = rowStart + 1 + x * 4;
    raw[i] = r; raw[i + 1] = g; raw[i + 2] = b;
    raw[i + 3] = Math.round(cov * 255);
  }
}

// ---------- PNG 编码 ----------
const CRC_TABLE = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    t[n] = c;
  }
  return t;
})();
function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const t = Buffer.from(type, 'ascii');
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([t, data])));
  return Buffer.concat([len, t, data, crc]);
}

const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(SIZE, 0);
ihdr.writeUInt32BE(SIZE, 4);
ihdr[8] = 8;  // bit depth
ihdr[9] = 6;  // color type: RGBA
const png = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  chunk('IHDR', ihdr),
  chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
  chunk('IEND', Buffer.alloc(0))
]);

const out = path.join(__dirname, 'icon.png');
fs.writeFileSync(out, png);
console.log('icon.png 生成成功: ' + out + ' (' + png.length + ' bytes)');
