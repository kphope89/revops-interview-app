import { contextBridge, ipcRenderer } from 'electron'

// Expose a typed API to the renderer process
contextBridge.exposeInMainWorld('electronAPI', {
  // Settings
  getSettings: () => ipcRenderer.invoke('settings:get'),
  saveSettings: (settings: { apiKey: string; model: string }) =>
    ipcRenderer.invoke('settings:save', settings),

  // Job posting
  fetchJobUrl: (url: string) => ipcRenderer.invoke('job:fetch-url', url),

  // Claude analysis
  analyzeQuestion: (payload: {
    question: string
    jobDescription: string
    knowledgeContext: string
    conversationHistory: string
  }) => ipcRenderer.invoke('claude:analyze', payload),

  detectQuestion: (payload: { transcript: string; previousTranscript: string }) =>
    ipcRenderer.invoke('claude:detect-question', payload)
})
