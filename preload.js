// 预加载脚本：通过 contextBridge 安全暴露 API 给渲染进程
'use strict';
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('bellApi', {
  library: {
    list: () => ipcRenderer.invoke('library:list'),
    import: () => ipcRenderer.invoke('library:import'),
    save: (items) => ipcRenderer.invoke('library:save', items),
    delete: (id) => ipcRenderer.invoke('library:delete', id),
    addClip: (payload) => ipcRenderer.invoke('library:addClip', payload)
  },
  music: {
    getUrl: (id) => ipcRenderer.invoke('music:getUrl', id),
    getBuffer: (id) => ipcRenderer.invoke('music:getBuffer', id)
  },
  online: {
    search: (keywords) => ipcRenderer.invoke('online:search', keywords),
    songUrl: (id) => ipcRenderer.invoke('online:songUrl', id),
    download: (song) => ipcRenderer.invoke('online:download', song),
    playlist: (input) => ipcRenderer.invoke('online:playlist', input),
    daily: () => ipcRenderer.invoke('online:daily'),
    discover: () => ipcRenderer.invoke('online:discover')
  },
  schedules: {
    load: () => ipcRenderer.invoke('schedules:load'),
    save: (data) => ipcRenderer.invoke('schedules:save', data)
  },
  exams: {
    load: () => ipcRenderer.invoke('exams:load'),
    save: (data) => ipcRenderer.invoke('exams:save', data)
  },
  examSchemes: {
    load: () => ipcRenderer.invoke('exam-schemes:load'),
    save: (data) => ipcRenderer.invoke('exam-schemes:save', data)
  },
  tts: {
    generate: (payload) => ipcRenderer.invoke('tts:generate', payload),
    preview: (payload) => ipcRenderer.invoke('tts:preview', payload),
    voices: () => ipcRenderer.invoke('tts:voices')
  },
  settings: {
    load: () => ipcRenderer.invoke('settings:load'),
    save: (s) => ipcRenderer.invoke('settings:save', s)
  },
  logs: {
    load: () => ipcRenderer.invoke('logs:load'),
    append: (entry) => ipcRenderer.invoke('logs:append', entry),
    clear: () => ipcRenderer.invoke('logs:clear')
  },
  window: {
    minimize: () => ipcRenderer.send('window:minimize'),
    toggleMaximize: () => ipcRenderer.send('window:toggleMaximize'),
    close: () => ipcRenderer.send('window:close'),
    onStateChange: (cb) => ipcRenderer.on('window:state', (_e, s) => cb(s))
  },
  mini: {
    hide: () => ipcRenderer.send('mini:hide'),
    openMain: () => ipcRenderer.send('mini:openMain')
  },
  app: {
    info: () => ipcRenderer.invoke('app:info'),
    setAutoLaunch: (v) => ipcRenderer.invoke('app:setAutoLaunch', v),
    setKeepAwake: (v) => ipcRenderer.invoke('app:setKeepAwake', v),
    openDataFolder: () => ipcRenderer.invoke('app:openDataFolder'),
    relaunch: () => ipcRenderer.invoke('app:relaunch')
  },
  notify: {
    show: (title, content) => ipcRenderer.send('notify:show', { title, content })
  },
  backup: {
    export: () => ipcRenderer.invoke('backup:export'),
    restore: () => ipcRenderer.invoke('backup:restore')
  }
});
