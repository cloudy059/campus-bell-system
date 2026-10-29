// 临时打包脚本：直接调用 electron-builder API（系统无 node，用 electron.exe 以 node 模式运行）
// 日志同步写入 .build-log.txt（stdout 在 RUN_AS_NODE 下不可靠，改 hook 进程内写文件）
'use strict';
process.noAsar = true; // 关键：RUN_AS_NODE 下 Electron 的 fs 会拦截 .asar 路径，禁用后按普通文件处理
const fs = require('fs');
const path = require('path');
const LOG = path.join(__dirname, '.build-log.txt');
const w = (s) => { try { fs.appendFileSync(LOG, s + '\n'); } catch (e) { /* ignore */ } };
fs.writeFileSync(LOG, 'build start: ' + new Date().toISOString() + '\n');
// 捕获所有 stdout/stderr 输出（electron-builder 进度、报错）
const soW = process.stdout.write.bind(process.stdout);
const seW = process.stderr.write.bind(process.stderr);
process.stdout.write = (c, ...r) => { w(Buffer.isBuffer(c) ? c.toString('utf8') : String(c)); return soW(c, ...r); };
process.stderr.write = (c, ...r) => { w('[ERR] ' + (Buffer.isBuffer(c) ? c.toString('utf8') : String(c))); return seW(c, ...r); };
process.on('uncaughtException', (e) => { w('UNCAUGHT: ' + ((e && e.stack) || e)); process.exit(1); });
process.on('exit', (code) => w('exit code ' + code));
process.chdir(__dirname);
const { build } = require('electron-builder');
build({ projectDir: __dirname, win: ['nsis'], x64: true })
  .then((r) => { w('BUILD OK: ' + r.map(x => x.path).join(' | ')); process.exit(0); })
  .catch((e) => { w('BUILD FAILED: ' + ((e && e.stack) || e)); process.exit(1); });
