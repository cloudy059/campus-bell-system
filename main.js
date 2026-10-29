// 主进程：窗口管理、系统托盘、数据持久化（IPC）、单实例、开机自启
'use strict';
const { app, BrowserWindow, Tray, Menu, ipcMain, dialog, shell, nativeImage, screen, powerSaveBlocker } = require('electron');
const path = require('path');
const fs = require('fs');
const { pathToFileURL } = require('url');
const { execFile } = require('child_process');
const tls = require('tls');
const crypto = require('crypto');
const { readJson, writeJson } = require('./lib/store');
const { buildSeedLibrary, defaultSchedule } = require('./lib/seed-music');
const nc = require('NeteaseCloudMusicApi'); // 网易云音乐 API（在线音乐来源，SPlayer 同源）

// ---------- 数据文件位置（%APPDATA%\campus-bell-system） ----------
const DATA_DIR = app.getPath('userData');
const MEDIA_DIR = path.join(DATA_DIR, 'media');
const LIB_FILE = path.join(DATA_DIR, 'library.json');
const SCH_FILE = path.join(DATA_DIR, 'schedules.json');
const EXAM_FILE = path.join(DATA_DIR, 'exams.json');
const EXAM_SCHEMES_FILE = path.join(DATA_DIR, 'exam-schemes.json');
const TTS_PREVIEW_DIR = path.join(DATA_DIR, 'tts-preview');
const SET_FILE = path.join(DATA_DIR, 'settings.json');
const LOG_FILE = path.join(DATA_DIR, 'logs.json');
const LOG_LIMIT = 2000;

let win = null;
let tray = null;
let isQuitting = false;
let miniWin = null;       // 顶部迷你悬浮条（主窗口关闭到托盘时显示）
let miniEnabled = true;   // 迷你条开关（托盘菜单可切换；× 隐藏即关闭）
let sleepBlockerId = null; // 防休眠阻塞器（prevent-app-suspension：系统保持唤醒，屏幕可正常关闭）

// ---------- 运行时防电脑睡眠 ----------
// 铃声依赖定时器触发：电脑一旦休眠，铃声将整段漏播。默认开启阻塞（仅阻止系统休眠，不阻止屏幕熄灭）。
function applyKeepAwake(enabled) {
  const on = enabled !== false; // 默认开启
  if (on && sleepBlockerId === null) {
    sleepBlockerId = powerSaveBlocker.start('prevent-app-suspension');
    console.log('[power] 已阻止系统休眠（屏幕仍可正常关闭）');
  } else if (!on && sleepBlockerId !== null) {
    powerSaveBlocker.stop(sleepBlockerId);
    sleepBlockerId = null;
    console.log('[power] 已恢复系统默认休眠策略');
  }
  return on;
}

// ---------- 单实例锁：防止重复启动导致重复打铃 ----------
if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', () => showWindow());
  app.whenReady().then(init);
  app.on('window-all-closed', () => { /* 由托盘退出流程控制 */ });
}

function init() {
  fs.mkdirSync(MEDIA_DIR, { recursive: true });
  seedFirstRun();
  applyKeepAwake(readJson(SET_FILE, {}).keepAwake); // 按设置启动防休眠（默认开启）
  createWindow();
  createTray();
  registerIpc();
  app.on('will-quit', () => applyKeepAwake(false)); // 退出时释放，恢复系统默认电源策略
}

/** 首次运行：生成内置铃声与默认作息方案 */
function seedFirstRun() {
  if (!fs.existsSync(LIB_FILE)) {
    const items = buildSeedLibrary(MEDIA_DIR);
    writeJson(LIB_FILE, { items });
    console.log('[seed] 已生成 ' + items.length + ' 首内置铃声');
  }
  if (!fs.existsSync(SCH_FILE)) {
    writeJson(SCH_FILE, defaultSchedule());
    console.log('[seed] 已生成默认作息方案');
  }
}

// ---------- 窗口 ----------
function createWindow() {
  win = new BrowserWindow({
    width: 1220,
    height: 780,
    minWidth: 1020,
    minHeight: 700,
    frame: false,                       // 无边框，自定义标题栏
    show: false,
    backgroundColor: '#0b0f1d',
    icon: path.join(__dirname, 'icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      spellcheck: false
    }
  });
  win.loadFile(path.join(__dirname, 'src', 'index.html'));
  win.once('ready-to-show', () => win.show());
  // 关闭按钮 -> 隐藏到托盘，铃声继续按时播放；同时显示顶部迷你悬浮条
  win.on('close', (e) => {
    if (!isQuitting) {
      e.preventDefault();
      win.hide();
      if (miniEnabled) showMini();
    }
  });
  // 主窗口重新显示时收起迷你条（开关状态保留，下次关闭再出现）
  win.on('show', () => { if (miniWin && !miniWin.isDestroyed()) miniWin.hide(); });
  const sendState = () => { if (!win.isDestroyed()) win.webContents.send('window:state', { maximized: win.isMaximized() }); };
  win.on('maximize', sendState);
  win.on('unmaximize', sendState);
}

function showWindow() {
  if (!win) return;
  if (win.isMinimized()) win.restore();
  win.show();
  win.focus();
}

// ---------- 顶部迷你悬浮条 ----------
const MINI_W = 420, MINI_H = 44;
function createMiniWin() {
  miniWin = new BrowserWindow({
    width: MINI_W, height: MINI_H,
    frame: false, transparent: true, resizable: false,
    alwaysOnTop: true, skipTaskbar: true, show: false, hasShadow: false,
    icon: path.join(__dirname, 'icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      spellcheck: false
    }
  });
  miniWin.loadFile(path.join(__dirname, 'src', 'mini.html'));
  miniWin.on('closed', () => { miniWin = null; });
}
/** 显示迷你条：贴屏幕顶端居中，不抢焦点 */
function showMini() {
  if (!miniWin || miniWin.isDestroyed()) createMiniWin();
  const wa = screen.getPrimaryDisplay().workArea;
  miniWin.setPosition(Math.round(wa.x + (wa.width - MINI_W) / 2), wa.y, false);
  miniWin.showInactive();
}
function hideMini() {
  if (miniWin && !miniWin.isDestroyed()) miniWin.hide();
}

// ---------- 托盘 ----------
function buildTrayMenu() {
  return Menu.buildFromTemplate([
    { label: '显示主窗口', click: () => showWindow() },
    { type: 'separator' },
    {
      label: '迷你悬浮条', type: 'checkbox', checked: miniEnabled,
      click: () => {
        miniEnabled = !miniEnabled;
        if (miniEnabled && win && !win.isVisible()) showMini();
        else hideMini();
        updateTrayMenu();
      }
    },
    { type: 'separator' },
    { label: '退出', click: () => { isQuitting = true; app.quit(); } }
  ]);
}
function updateTrayMenu() { tray && tray.setContextMenu(buildTrayMenu()); }
function createTray() {
  const icon = nativeImage.createFromPath(path.join(__dirname, 'icon.png')).resize({ width: 16, height: 16 });
  tray = new Tray(icon);
  tray.setToolTip('校园音乐铃声系统 · 运行中');
  updateTrayMenu();
  tray.on('click', () => showWindow());
}

// ---------- IPC ----------
function registerIpc() {
  const lib = () => readJson(LIB_FILE, { items: [] });
  const musicFile = (item) => path.join(MEDIA_DIR, item.fileName);

  // 音乐库
  ipcMain.handle('library:list', () => lib());

  ipcMain.handle('library:import', async () => {
    const r = await dialog.showOpenDialog(win, {
      title: '导入铃声音乐',
      filters: [{ name: '音频文件', extensions: ['mp3', 'wav', 'm4a', 'aac', 'ogg', 'flac', 'opus'] }],
      properties: ['openFile', 'multiSelections']
    });
    if (r.canceled || r.filePaths.length === 0) return { added: [] };
    const data = lib();
    const added = [];
    for (const src of r.filePaths) {
      const ext = path.extname(src).toLowerCase();
      if (!['.mp3', '.wav', '.m4a', '.aac', '.ogg', '.flac', '.opus'].includes(ext)) continue;
      const base = path.basename(src, ext);
      const id = 'm-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 6);
      fs.copyFileSync(src, path.join(MEDIA_DIR, id + ext)); // 统一拷贝到媒体目录，避免外部文件被移动/删除
      const item = { id, name: base, fileName: id + ext, ext, duration: null, category: '其他', builtIn: false, addedAt: new Date().toISOString() };
      data.items.push(item);
      added.push(item);
    }
    if (added.length) writeJson(LIB_FILE, data);
    return { added };
  });

  ipcMain.handle('library:save', (_e, items) => {
    writeJson(LIB_FILE, { items });
    return { ok: true };
  });

  ipcMain.handle('library:delete', (_e, id) => {
    const data = lib();
    const item = data.items.find(x => x.id === id);
    if (item) {
      try { fs.unlinkSync(musicFile(item)); } catch { /* 文件可能已不存在 */ }
      data.items = data.items.filter(x => x.id !== id);
      writeJson(LIB_FILE, data);
    }
    return { ok: true };
  });

  ipcMain.handle('music:getUrl', (_e, id) => {
    const item = lib().items.find(x => x.id === id);
    if (!item || !fs.existsSync(musicFile(item))) return { url: null };
    return { url: pathToFileURL(musicFile(item)).href };
  });

  // 读取音频原始数据（base64）供渲染进程解码 / 截取片段
  ipcMain.handle('music:getBuffer', (_e, id) => {
    const item = lib().items.find(x => x.id === id);
    if (!item || !fs.existsSync(musicFile(item))) return { ok: false, error: '音频文件不存在' };
    try { return { ok: true, b64: fs.readFileSync(musicFile(item)).toString('base64') }; }
    catch (err) { return { ok: false, error: '读取音频失败：' + (err.message || err) }; }
  });

  // 保存截取的片段（WAV）为新曲目
  ipcMain.handle('library:addClip', (_e, { name, category, duration, b64 }) => {
    try {
      const buf = Buffer.from(String(b64 || ''), 'base64');
      if (!buf.length) return { ok: false, error: '音频数据为空' };
      const id = 'm-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 6);
      fs.writeFileSync(path.join(MEDIA_DIR, id + '.wav'), buf);
      const data = lib();
      const item = {
        id, name: String(name || '音乐片段').slice(0, 80), fileName: id + '.wav', ext: '.wav',
        duration: duration ? Math.round(duration * 10) / 10 : null,
        category: category || '其他', builtIn: false, online: false, clip: true,
        addedAt: new Date().toISOString()
      };
      data.items.push(item);
      writeJson(LIB_FILE, data);
      return { ok: true, item };
    } catch (err) { return { ok: false, error: '保存失败：' + (err.message || err) }; }
  });

  // ---------- 在线音乐（网易云音乐 API，仅用于获取音乐，下载后本地播放） ----------
  const artistNames = (ar) => (ar || []).map(a => a.name).filter(Boolean).join('/') || '未知歌手';

  ipcMain.handle('online:search', async (_e, keywords) => {
    try {
      const r = await nc.search({ keywords: String(keywords || '').trim(), limit: 30 });
      const songs = (r.body && r.body.result && r.body.result.songs) || [];
      return { ok: true, songs: songs.map(sg => ({
        id: sg.id, name: sg.name, artist: artistNames(sg.artists),
        album: (sg.album && sg.album.name) || '',
        duration: sg.duration ? Math.round(sg.duration / 1000) : null,
        fee: sg.fee })) };
    } catch (err) { return { ok: false, error: '搜索失败，请检查网络连接' }; }
  });

  ipcMain.handle('online:songUrl', async (_e, id) => {
    try {
      const r = await nc.song_url_v1({ id, level: 'exhigh' });
      const d = (r.body && r.body.data && r.body.data[0]) || {};
      // CDN 支持 https：用 https 避免 file:// 页面被混合内容策略拦截
      return { ok: true, url: d.url ? d.url.replace(/^http:/, 'https:') : null, type: d.type || '', trial: d.freeTrialInfo || null };
    } catch (err) { return { ok: false, error: '获取试听地址失败' }; }
  });

  ipcMain.handle('online:download', async (_e, song) => {
    try {
      const r = await nc.song_url_v1({ id: song.id, level: 'exhigh' });
      const d = (r.body && r.body.data && r.body.data[0]) || {};
      if (!d.url) return { ok: false, error: '无法获取音频（可能为 VIP 或无版权歌曲）' };
      const res = await fetch(d.url);
      if (!res.ok) return { ok: false, error: '下载失败：HTTP ' + res.status };
      const buf = Buffer.from(await res.arrayBuffer());
      const ext = '.' + (/^[a-z0-9]{2,5}$/i.test(String(d.type)) ? d.type : 'mp3');
      const newId = 'm-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 6);
      fs.writeFileSync(path.join(MEDIA_DIR, newId + ext), buf);
      const item = {
        id: newId, name: `${song.name} - ${song.artist}`.slice(0, 80), fileName: newId + ext, ext,
        duration: null, category: '其他', builtIn: false, online: true, onlineId: song.id,
        addedAt: new Date().toISOString()
      };
      const data = lib();
      data.items.push(item);
      writeJson(LIB_FILE, data);
      return { ok: true, item, trial: d.freeTrialInfo || null };
    } catch (err) {
      return { ok: false, error: '下载失败，请检查网络连接' };
    }
  });

  ipcMain.handle('online:playlist', async (_e, input) => {
    try {
      const m = String(input || '').match(/(?:id=|^)(\d{4,})/);
      if (!m) return { ok: false, error: '无法识别歌单 ID，请粘贴歌单链接或纯数字 ID' };
      const plId = m[1];
      const det = await nc.playlist_detail({ id: plId });
      const pl = det.body && det.body.playlist;
      if (!pl) return { ok: false, error: '歌单不存在或无法访问' };
      const tr = await nc.playlist_track_all({ id: plId, limit: 100 }); // 最多取前 100 首
      const tracks = (tr.body && tr.body.songs) || [];
      return { ok: true, name: pl.name, total: pl.trackCount || tracks.length,
        songs: tracks.map(sg => ({
          id: sg.id, name: sg.name, artist: artistNames(sg.ar || sg.artists),
          duration: (sg.dt || sg.duration) ? Math.round((sg.dt || sg.duration) / 1000) : null,
          fee: sg.fee })) };
    } catch (err) { return { ok: false, error: '歌单获取失败，请检查网络连接' }; }
  });

  // 个性推荐（推荐新歌 personalized_newsong，匿名可用）
  ipcMain.handle('online:daily', async () => {
    try {
      const r = await nc.personalized_newsong({ limit: 30 });
      const list = (r.body && r.body.result) || [];
      if (!list.length) throw new Error('empty');
      return { ok: true, songs: list.map(it => ({
        id: it.id, name: it.name, artist: artistNames(it.song && (it.song.artists || it.song.ar)),
        duration: (it.song && it.song.duration) ? Math.round(it.song.duration / 1000) : null,
        fee: (it.song && it.song.fee) || it.fee })) };
    } catch (err) { return { ok: false, error: '获取个性推荐失败，请检查网络连接' }; }
  });

  // 发现音乐（推荐歌单）
  ipcMain.handle('online:discover', async () => {
    try {
      const r = await nc.personalized({ limit: 12 });
      const pls = (r.body && r.body.result) || [];
      return { ok: true, playlists: pls.map(pl => ({
        id: pl.id, name: pl.name,
        picUrl: pl.picUrl ? String(pl.picUrl).replace(/^http:/, 'https:') : '',
        playCount: pl.playCount })) };
    } catch (err) { return { ok: false, error: '获取推荐歌单失败，请检查网络连接' }; }
  });

  // 作息方案（加载时一次性迁移：提前播放 advance 由"分钟"改为"秒"）
  // 迁移标记使用独立文件：写在 schedules.json 内会随渲染端保存而丢失，导致每次启动重复 ×60（180 → 10800）
  const MIG_ADV_SEC = path.join(DATA_DIR, '.adv-unit-sec');
  ipcMain.handle('schedules:load', () => {
    const data = readJson(SCH_FILE, { sets: [], overrides: [] });
    if (!fs.existsSync(MIG_ADV_SEC)) {
      const legacy = !data.advUnitSec; // 旧标记缺失 = 历史上从未迁移过（advance 仍为分钟）
      for (const s of (data.sets || [])) {
        for (const b of (s.bells || [])) {
          let a = Number(b.advance) || 0;
          if (legacy && a > 0) {
            a = Math.round(a * 60);                       // 分钟 → 秒
          } else {
            // 修复历史重复迁移污染的数据（UI 上限 1800 秒，超出即被污染）
            while (a > 1800) a = Math.round(a / 60);
          }
          b.advance = a;
        }
      }
      delete data.advUnitSec;
      writeJson(SCH_FILE, data);
      fs.writeFileSync(MIG_ADV_SEC, String(Date.now()));
    }
    return data;
  });
  ipcMain.handle('schedules:save', (_e, data) => { writeJson(SCH_FILE, data); return { ok: true }; });

  // 考试播报安排
  ipcMain.handle('exams:load', () => readJson(EXAM_FILE, { exams: [] }));
  ipcMain.handle('exams:save', (_e, data) => { writeJson(EXAM_FILE, { exams: (data && data.exams) || [] }); return { ok: true }; });

  // 考试播报节点方案（多套可复用，考试通过 schemeId 引用）
  ipcMain.handle('exam-schemes:load', () => readJson(EXAM_SCHEMES_FILE, { schemes: [] }));
  ipcMain.handle('exam-schemes:save', (_e, data) => { writeJson(EXAM_SCHEMES_FILE, { schemes: (data && data.schemes) || [] }); return { ok: true }; });

  // ---------- Edge TTS：微软免费在线语音合成（可选播音人）----------
  // 播音人（微软官方神经语音，免费、无需密钥）
  const EDGE_VOICES = [
    { id: 'zh-CN-XiaoxiaoNeural', label: '晓晓', name: '晓晓（女声·亲切）' },
    { id: 'zh-CN-XiaoyiNeural', label: '晓伊', name: '晓伊（女声·活泼）' },
    { id: 'zh-CN-YunjianNeural', label: '云健', name: '云健（男声·浑厚）' },
    { id: 'zh-CN-YunxiNeural', label: '云希', name: '云希（男声·阳光）' },
    { id: 'zh-CN-YunxiaNeural', label: '云夏', name: '云夏（男声·少年）' },
    { id: 'zh-CN-YunyangNeural', label: '云扬', name: '云扬（男声·播报）' },
    { id: 'zh-CN-liaoning-XiaobeiNeural', label: '晓北', name: '晓北（女声·东北）' },
    { id: 'zh-CN-shaanxi-XiaoniNeural', label: '晓妮', name: '晓妮（女声·陕西）' },
    { id: 'zh-HK-HiuMaanNeural', label: '曉滿', name: '曉滿（女声·粤语）' },
    { id: 'zh-TW-HsiaoChenNeural', label: '曉臻', name: '曉臻（女声·台湾）' }
  ];
  ipcMain.handle('tts:voices', () => EDGE_VOICES);
  // Edge TTS 通道：手写 TLS+WSS 客户端直连微软免费语音服务（零第三方依赖）
  const EDGE_TTS_CONF = {
    token: '6A5AA1D4EAFF4E9FB37E23D68491D6F4',
    gecVer: '1-143.0.3650.96',
    host: 'speech.platform.bing.com',
    ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0'
  };
  function edgeDate() {
    const t = new Date();
    const W = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const M = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const p = n => String(n).padStart(2, '0');
    return `${W[t.getUTCDay()]} ${M[t.getUTCMonth()]} ${p(t.getUTCDate())} ${t.getUTCFullYear()} ${p(t.getUTCHours())}:${p(t.getUTCMinutes())}:${p(t.getUTCSeconds())} GMT+0000 (Coordinated Universal Time)`;
  }
  /* 语速 / 音调 / 风格。实测免费朗读端点不支持 mstts:express-as（任何风格都直接断开无音频）：
     带风格失败时自动去掉风格重试一次，并标记 styleDropped 让界面提示用户 */
  function edgeTts(text, voiceId, opts) {
    const o = opts || {};
    if (!o.style) return edgeTtsOnce(text, voiceId, o, false);
    return edgeTtsOnce(text, voiceId, o, true).catch(() =>
      edgeTtsOnce(text, voiceId, o, false).then(res => { res.styleDropped = true; return res; }));
  }
  function edgeTtsOnce(text, voiceId, opts, withStyle) {
    return new Promise((resolve, reject) => {
      // Sec-MS-GEC 鉴权：Windows 纪元秒按 5 分钟取整转 100ns 计数，与令牌直接拼接后 SHA256 大写
      let ticks = Math.floor(Date.now() / 1000) + 11644473600;
      ticks -= ticks % 300;
      const gec = crypto.createHash('sha256').update(`${ticks * 10000000}${EDGE_TTS_CONF.token}`).digest('hex').toUpperCase();
      const rid = crypto.randomUUID().replace(/-/g, '');
      const qs = `/consumer/speech/synthesize/readaloud/edge/v1?TrustedClientToken=${EDGE_TTS_CONF.token}&Sec-MS-GEC=${gec}&Sec-MS-GEC-Version=${EDGE_TTS_CONF.gecVer}&ConnectionId=${rid}`;
      const sock = tls.connect({ host: EDGE_TTS_CONF.host, port: 443, servername: EDGE_TTS_CONF.host }, () => {
        sock.write(
          `GET ${qs} HTTP/1.1\r\n` +
          `Host: ${EDGE_TTS_CONF.host}\r\n` +
          `Upgrade: websocket\r\n` +
          `Connection: Upgrade\r\n` +
          `Sec-WebSocket-Key: ${crypto.randomBytes(16).toString('base64')}\r\n` +
          `Sec-WebSocket-Version: 13\r\n` +
          `Origin: chrome-extension://jdiccldimpdaibmpdkjnbmckianbfold\r\n` +
          `User-Agent: ${EDGE_TTS_CONF.ua}\r\n` +
          `\r\n`
        );
      });
      let buf = Buffer.alloc(0);
      let up = false;
      const audio = [];
      let settled = false;
      const end = (fn, arg) => { if (settled) return; settled = true; clearTimeout(timer); try { sock.destroy(); } catch { } fn(arg); };
      const fail = (msg) => end(reject, new Error(msg));
      const ok = () => end(resolve, { buf: Buffer.concat(audio), ext: '.mp3' });
      const timer = setTimeout(() => fail('响应超时'), 25000);
      // 客户端帧必须掩码
      const send = (op, payload) => {
        const mk = crypto.randomBytes(4);
        const m = Buffer.allocUnsafe(payload.length);
        for (let i = 0; i < payload.length; i++) m[i] = payload[i] ^ mk[i & 3];
        let h;
        if (payload.length < 126) h = Buffer.from([0x80 | op, 0x80 | payload.length]);
        else { h = Buffer.alloc(4); h[0] = 0x80 | op; h[1] = 0x80 | 126; h.writeUInt16BE(payload.length, 2); }
        sock.write(Buffer.concat([h, mk, m]));
      };
      sock.on('data', d => {
        buf = Buffer.concat([buf, d]);
        if (!up) {
          const i = buf.indexOf('\r\n\r\n');
          if (i < 0) return;
          if (!/^HTTP\/1\.1 101/.test(buf.slice(0, i).toString())) return fail('服务拒绝连接（鉴权或网络受限）');
          up = true;
          buf = buf.slice(i + 4);
          send(1, Buffer.from('X-Timestamp:' + edgeDate() + '\r\nContent-Type:application/json; charset=utf-8\r\nPath:speech.config\r\n\r\n' + JSON.stringify({
            context: { synthesis: { audio: {
              metadataoptions: { sentenceBoundaryEnabled: 'false', wordBoundaryEnabled: 'false' },
              outputFormat: 'audio-24khz-48kbitrate-mono-mp3'
            } } }
          }), 'utf8'));
          const escXml = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
          // 语速 / 音调 / 风格参数白名单校验（值来自渲染进程，防止拼坏 SSML）
          const rate = /^[+-]\d{1,3}%$/.test(String(opts.rate)) ? opts.rate : '+0%';
          const pitch = /^[+-]\d{1,2}Hz$/.test(String(opts.pitch)) ? opts.pitch : '+0Hz';
          const style = withStyle && /^[a-z]{2,32}$/.test(String(opts.style || '')) ? opts.style : '';
          const styleOpen = style ? `<mstts:express-as style='${style}'>` : '';
          const styleClose = style ? '</mstts:express-as>' : '';
          send(1, Buffer.from(
            'X-RequestId:' + rid + '\r\nContent-Type:application/ssml+xml\r\nX-Timestamp:' + edgeDate() + '\r\nPath:ssml\r\n\r\n' +
            `<speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' xmlns:mstts='https://www.w3.org/2001/mstts' xml:lang='zh-CN'><voice name='${voiceId}'>${styleOpen}<prosody pitch='${pitch}' rate='${rate}' volume='+0%'>${escXml(text)}</prosody>${styleClose}</voice></speak>`, 'utf8'));
        }
        // WebSocket 帧解析
        for (;;) {
          if (buf.length < 2) break;
          const b1 = buf[1];
          const op = buf[0] & 0x0f, masked = (b1 & 0x80) !== 0;
          let len = b1 & 0x7f, off = 2;
          if (len === 126) { if (buf.length < 4) break; len = buf.readUInt16BE(2); off = 4; }
          else if (len === 127) { if (buf.length < 10) break; len = Number(buf.readBigUInt64BE(2)); off = 10; }
          const mLen = masked ? 4 : 0;
          if (buf.length < off + mLen + len) break;
          let pl = buf.slice(off + mLen, off + mLen + len);
          if (masked) {
            const mk = buf.slice(off, off + 4);
            const u = Buffer.allocUnsafe(len);
            for (let i = 0; i < len; i++) u[i] = pl[i] ^ mk[i & 3];
            pl = u;
          }
          buf = buf.slice(off + mLen + len);
          if (op === 0x9) { send(0xA, pl); continue; }
          if (op === 0xA) continue;
          if (op === 0x8) return audio.length ? ok() : fail('连接被服务端关闭');
          if (op === 0x1) {
            if (/Path:turn\.end/.test(pl.toString('utf8'))) return audio.length ? ok() : fail('未返回音频数据');
          } else if (op === 0x2) {
            // 二进制帧：按 "Path:audio\r\n" 标记定位音频数据（不依赖首字节魔数）
            const marker = 'Path:audio\r\n';
            const idx = pl.indexOf(marker);
            if (idx >= 0) audio.push(pl.slice(idx + marker.length));
          }
        }
      });
      sock.on('error', e => fail(e.message || String(e)));
      sock.on('close', () => { if (!settled) { if (audio.length) ok(); else fail('连接提前关闭'); } });
    });
  }

  // ---------- TTS 文字转语音：Edge 在线优先，百度在线次之，离线回退 Windows 系统语音 ----------
  // 在线通道：百度翻译语音（免密钥，中文清晰，需要联网）
  async function ttsOnline(text) {
    const url = 'https://fanyi.baidu.com/gettts?lan=zh&text=' + encodeURIComponent(text) + '&spd=3&source=web';
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), 15000);
    try {
      const res = await fetch(url, { signal: ctl.signal, headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' } });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const buf = Buffer.from(await res.arrayBuffer());
      if (buf.length < 2000) throw new Error('返回的音频数据异常');
      return { buf, ext: '.mp3', engine: '在线语音' };
    } finally { clearTimeout(timer); }
  }
  // 离线通道：Windows SAPI 语音（PowerShell 生成 WAV，自动优先选择中文语音包）
  function ttsSapi(text, outPath) {
    return new Promise((resolve, reject) => {
      const safeText = String(text).replace(/'/g, "''");
      const safePath = String(outPath).replace(/'/g, "''");
      const script = [
        'Add-Type -AssemblyName System.Speech',
        '$s = New-Object System.Speech.Synthesis.SpeechSynthesizer',
        "$cn = $s.GetInstalledVoices() | ForEach-Object { $_.VoiceInfo.Name } | Where-Object { $_ -match 'Huihui|Yaoyao|Kangkang|Xiaoxiao|Chinese|中文' } | Select-Object -First 1",
        'if ($cn) { $s.SelectVoice($cn) }',
        '$s.Rate = 0',
        "$s.SetOutputToWaveFile('" + safePath + "')",
        "$s.Speak('" + safeText + "')",
        '$s.Dispose()',
        "if ($cn) { Write-Output ('VOICE=' + $cn) } else { Write-Output 'VOICE=' }"
      ].join('\n');
      const encoded = Buffer.from(script, 'utf16le').toString('base64');
      execFile('powershell.exe', ['-NoProfile', '-NonInteractive', '-EncodedCommand', encoded], { timeout: 60000, windowsHide: true }, (err, stdout) => {
        if (err) return reject(new Error(String(err.message || err)));
        const m = String(stdout || '').match(/VOICE=(.*)/);
        resolve({ voice: m ? m[1].trim() : '' });
      });
    });
  }
  // 生成语音铃声入库：itemId 传入时为「编辑重生成」——替换音频文件但保持 id，引用它的考试节点 / 方案不失效
  // TTS 合成（Edge → 百度 → 系统语音三级回退），返回 { result, onlineErr }
  // result: { buf, path, ext, engine, voice, styleDropped }；SAPI 回退时写到 sapiOutPath
  async function ttsSynthesize(clean, vInfo, rate, pitch, style, sapiOutPath) {
    let result = null, onlineErr = '';
    try { result = await edgeTts(clean, vInfo.id, { rate, pitch, style }); result.engine = 'Edge·' + vInfo.label; }
    catch (e) { onlineErr = 'Edge 通道：' + (e.message || String(e)); }
    if (!result) {
      try { result = await ttsOnline(clean); }
      catch (e) { onlineErr = onlineErr + '；百度通道：' + (e.message || String(e)); }
    }
    if (!result) {
      try {
        const { voice } = await ttsSapi(clean, sapiOutPath);
        if (!fs.existsSync(sapiOutPath) || fs.statSync(sapiOutPath).size < 2000) {
          try { fs.unlinkSync(sapiOutPath); } catch { /* ignore */ }
          throw new Error('系统语音未生成有效音频（可能缺少中文语音包）');
        }
        result = { buf: null, path: sapiOutPath, ext: '.wav', engine: '系统语音', voice };
      } catch (e2) {
        return { result: null, onlineErr, sapiErr: e2.message || String(e2) };
      }
    }
    return { result, onlineErr };
  }

  ipcMain.handle('tts:generate', async (_e, { text, name, voice, rate, pitch, style, category, itemId }) => {
    const clean = String(text || '').trim().slice(0, 200);
    if (!clean) return { ok: false, error: '播报文字为空' };
    const id = String(itemId || '') || 'm-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 6);
    const vInfo = EDGE_VOICES.find(v => v.id === voice) || EDGE_VOICES[0];
    const { result, onlineErr, sapiErr } = await ttsSynthesize(clean, vInfo, rate, pitch, style, path.join(MEDIA_DIR, id + '.wav'));
    if (!result) {
      return { ok: false, error: '语音生成失败：' + (onlineErr ? onlineErr + '，' : '') + (sapiErr || '') };
    }
    try {
      if (result.buf) fs.writeFileSync(path.join(MEDIA_DIR, id + result.ext), result.buf);
      const data = lib();
      const params = {
        text: clean, voice: vInfo.id,
        rate: /^[+-]\d{1,3}%$/.test(String(rate)) ? rate : '+0%',
        pitch: /^[+-]\d{1,2}Hz$/.test(String(pitch)) ? pitch : '+0Hz',
        style: /^[a-z]{2,32}$/.test(String(style || '')) ? style : ''
      };
      let item = data.items.find(x => x.id === id);
      if (item) {
        // 编辑重生成：删除旧音频文件（可能正被播放，失败则忽略），其余字段原位更新
        if (item.fileName !== id + result.ext) { try { fs.unlinkSync(path.join(MEDIA_DIR, item.fileName)); } catch { /* 旧文件可能不存在或占用中 */ } }
        Object.assign(item, {
          name: String(name || '语音播报').slice(0, 80), fileName: id + result.ext, ext: result.ext,
          duration: null, category: String(category || item.category || '其他').slice(0, 12),
          tts: true, ttsParams: params
        });
      } else {
        item = {
          id, name: String(name || '语音播报').slice(0, 80), fileName: id + result.ext, ext: result.ext,
          duration: null, category: String(category || '其他').slice(0, 12), builtIn: false, online: false, clip: false, tts: true,
          ttsParams: params, addedAt: new Date().toISOString()
        };
        data.items.push(item);
      }
      writeJson(LIB_FILE, data);
      return { ok: true, item, engine: result.engine, voice: result.voice || '', styleDropped: !!result.styleDropped };
    } catch (err) { return { ok: false, error: '保存语音失败：' + (err.message || err) }; }
  });

  // TTS 试听：生成到临时目录，返回 file URL 供渲染进程播放，不入库
  ipcMain.handle('tts:preview', async (_e, { text, voice, rate, pitch, style }) => {
    const clean = String(text || '').trim().slice(0, 200);
    if (!clean) return { ok: false, error: '播报文字为空' };
    const pid = 'prev-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 6);
    const vInfo = EDGE_VOICES.find(v => v.id === voice) || EDGE_VOICES[0];
    fs.mkdirSync(TTS_PREVIEW_DIR, { recursive: true });
    // 清理超过 10 分钟的旧试听文件
    try {
      const now = Date.now();
      for (const f of fs.readdirSync(TTS_PREVIEW_DIR)) {
        const fp = path.join(TTS_PREVIEW_DIR, f);
        if (now - fs.statSync(fp).mtimeMs > 10 * 60 * 1000) { try { fs.unlinkSync(fp); } catch { /* ignore */ } }
      }
    } catch { /* ignore */ }
    const sapiOut = path.join(TTS_PREVIEW_DIR, pid + '.wav');
    const { result, onlineErr, sapiErr } = await ttsSynthesize(clean, vInfo, rate, pitch, style, sapiOut);
    if (!result) return { ok: false, error: '语音生成失败：' + (onlineErr ? onlineErr + '，' : '') + (sapiErr || '') };
    try {
      let outPath;
      if (result.buf) {
        outPath = path.join(TTS_PREVIEW_DIR, pid + result.ext);
        fs.writeFileSync(outPath, result.buf);
      } else {
        outPath = result.path;
      }
      return { ok: true, url: pathToFileURL(outPath).href, engine: result.engine, styleDropped: !!result.styleDropped };
    } catch (err) { return { ok: false, error: '试听失败：' + (err.message || err) }; }
  });

  // 设置
  ipcMain.handle('settings:load', () => readJson(SET_FILE, {}));
  ipcMain.handle('settings:save', (_e, s) => { writeJson(SET_FILE, s); return { ok: true }; });

  // 播放日志（最新在前，上限 2000 条）
  ipcMain.handle('logs:append', (_e, entry) => {
    const data = readJson(LOG_FILE, { entries: [] });
    data.entries.unshift(entry);
    if (data.entries.length > LOG_LIMIT) data.entries.length = LOG_LIMIT;
    writeJson(LOG_FILE, data);
    return { ok: true };
  });
  ipcMain.handle('logs:load', () => readJson(LOG_FILE, { entries: [] }));
  ipcMain.handle('logs:clear', () => { writeJson(LOG_FILE, { entries: [] }); return { ok: true }; });

  // 窗口控制
  ipcMain.on('window:minimize', () => win && win.minimize());
  ipcMain.on('window:toggleMaximize', () => { if (!win) return; win.isMaximized() ? win.unmaximize() : win.maximize(); });
  ipcMain.on('window:close', () => win && win.close()); // close 事件被拦截 -> 隐藏到托盘

  // 迷你悬浮条
  ipcMain.on('mini:hide', () => { miniEnabled = false; hideMini(); updateTrayMenu(); });
  ipcMain.on('mini:openMain', () => showWindow());

  // 应用
  ipcMain.handle('app:info', () => ({
    version: app.getVersion(),
    dataDir: DATA_DIR,
    autoLaunch: app.getLoginItemSettings().openAtLogin,
    keepAwake: sleepBlockerId !== null
  }));
  ipcMain.handle('app:setAutoLaunch', (_e, enabled) => {
    app.setLoginItemSettings({
      openAtLogin: !!enabled,
      path: process.execPath,
      args: [path.resolve(app.getAppPath())]
    });
    return { ok: true };
  });
  // 运行时防休眠开关（持久化由渲染端随 settings.json 保存）
  ipcMain.handle('app:setKeepAwake', (_e, enabled) => ({ ok: true, keepAwake: applyKeepAwake(enabled) }));
  ipcMain.handle('app:openDataFolder', () => { shell.openPath(DATA_DIR); return { ok: true }; });
  // 恢复备份后重启应用（isQuitting 防止托盘拦截关闭）
  ipcMain.handle('app:relaunch', () => { isQuitting = true; app.relaunch(); app.exit(0); return { ok: true }; });

  // 系统通知（托盘气泡）：自动铃声播放失败告警等
  ipcMain.on('notify:show', (_e, { title, content }) => {
    tray && tray.displayBalloon({
      icon: path.join(__dirname, 'icon.png'),
      title: String(title || '校园音乐铃声系统'),
      content: String(content || '')
    });
  });

  // 数据备份：导出方案 / 曲库 / 设置 / 日志 / 全部音频到所选目录
  ipcMain.handle('backup:export', async () => {
    const r = await dialog.showOpenDialog(win, { title: '选择备份保存位置', properties: ['openDirectory', 'createDirectory'] });
    if (r.canceled || !r.filePaths.length) return { ok: false, canceled: true };
    try {
      const s = new Date();
      const p = (n) => String(n).padStart(2, '0');
      const sub = `campus-bell-backup-${s.getFullYear()}${p(s.getMonth() + 1)}${p(s.getDate())}-${p(s.getHours())}${p(s.getMinutes())}${p(s.getSeconds())}`;
      const out = path.join(r.filePaths[0], sub);
      fs.mkdirSync(path.join(out, 'media'), { recursive: true });
      for (const f of ['schedules.json', 'exams.json', 'exam-schemes.json', 'library.json', 'settings.json', 'logs.json']) {
        const src = path.join(DATA_DIR, f);
        if (fs.existsSync(src)) fs.copyFileSync(src, path.join(out, f));
      }
      for (const f of fs.readdirSync(MEDIA_DIR)) fs.copyFileSync(path.join(MEDIA_DIR, f), path.join(out, 'media', f));
      return { ok: true, dir: out, count: fs.readdirSync(path.join(out, 'media')).length };
    } catch (err) { return { ok: false, error: '备份失败：' + (err.message || '未知错误') }; }
  });

  // 数据恢复：从备份文件夹还原（覆盖当前数据）
  ipcMain.handle('backup:restore', async () => {
    const r = await dialog.showOpenDialog(win, { title: '选择备份文件夹（应包含 schedules.json）', properties: ['openDirectory'] });
    if (r.canceled || !r.filePaths.length) return { ok: false, canceled: true };
    const dir = r.filePaths[0];
    try {
      if (!fs.existsSync(path.join(dir, 'schedules.json'))) return { ok: false, error: '所选文件夹中没有 schedules.json，不是有效的备份目录' };
      for (const f of ['schedules.json', 'exams.json', 'exam-schemes.json', 'library.json', 'settings.json', 'logs.json']) {
        const src = path.join(dir, f);
        if (fs.existsSync(src)) fs.copyFileSync(src, path.join(DATA_DIR, f));
      }
      const srcMedia = path.join(dir, 'media');
      if (fs.existsSync(srcMedia)) {
        fs.mkdirSync(MEDIA_DIR, { recursive: true });
        for (const f of fs.readdirSync(srcMedia)) fs.copyFileSync(path.join(srcMedia, f), path.join(MEDIA_DIR, f));
      }
      return { ok: true };
    } catch (err) { return { ok: false, error: '恢复失败：' + (err.message || '未知错误') }; }
  });
}
