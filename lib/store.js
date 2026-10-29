// JSON 文件读写小工具（原子写入，避免断电/崩溃导致数据损坏）
'use strict';
const fs = require('fs');
const path = require('path');

function readJson(file, fallback = null) {
  try {
    // 去 BOM：带 BOM 的 UTF-8（如 PowerShell Set-Content -Encoding UTF8 写出）会导致 JSON.parse 失败
    const raw = fs.readFileSync(file, 'utf-8').replace(/^\uFEFF/, '');
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function writeJson(file, data) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const tmp = file + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2), 'utf-8');
  fs.renameSync(tmp, file);
}

module.exports = { readJson, writeJson };
