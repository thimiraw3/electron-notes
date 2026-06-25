const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  // Notes
  getNotes: () => ipcRenderer.invoke('notes:getAll'),
  createNote: () => ipcRenderer.invoke('notes:create'),
  updateNote: (data) => ipcRenderer.invoke('notes:update', data),
  deleteNote: (id) => ipcRenderer.invoke('notes:delete', id),

  // File dialogs
  exportNote: (data) => ipcRenderer.invoke('dialog:exportNote', data),
  importNote: () => ipcRenderer.invoke('dialog:importNote'),

  // Shell
  openExternal: (url) => ipcRenderer.invoke('shell:openExternal', url),

  // Menu → renderer events (main pushes, renderer listens)
  onNewNote: (cb) => {
    ipcRenderer.on('menu:new-note', cb)
    return () => ipcRenderer.removeListener('menu:new-note', cb)
  },
  onExport: (cb) => {
    ipcRenderer.on('menu:export', cb)
    return () => ipcRenderer.removeListener('menu:export', cb)
  }
})
