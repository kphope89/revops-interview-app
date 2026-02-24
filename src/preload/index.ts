import { contextBridge, ipcRenderer } from 'electron'

// Expose a typed API to the renderer process
contextBridge.exposeInMainWorld('electronAPI', {
  // Settings
  getSettings: () => ipcRenderer.invoke('settings:get'),
  saveSettings: (settings: { apiKey: string; model: string; resume: string; openaiApiKey: string }) =>
    ipcRenderer.invoke('settings:save', settings),

  // Job posting
  fetchJobUrl: (url: string) => ipcRenderer.invoke('job:fetch-url', url),

  // Claude streaming analysis
  analyzeQuestionStream: (
    payload: {
      question: string
      jobDescription: string
      knowledgeContext: string
      conversationHistory: string
      resume: string
    },
    requestId: string
  ) => ipcRenderer.send('claude:analyze-stream', { ...payload, requestId }),

  onStreamChunk: (callback: (data: { requestId: string; delta: string }) => void) =>
    ipcRenderer.on('claude:stream-chunk', (_event, data) => callback(data)),

  onStreamDone: (callback: (data: { requestId: string; fullText: string }) => void) =>
    ipcRenderer.on('claude:stream-done', (_event, data) => callback(data)),

  onStreamError: (callback: (data: { requestId: string; error: string }) => void) =>
    ipcRenderer.on('claude:stream-error', (_event, data) => callback(data)),

  removeStreamListeners: () => {
    ipcRenderer.removeAllListeners('claude:stream-chunk')
    ipcRenderer.removeAllListeners('claude:stream-done')
    ipcRenderer.removeAllListeners('claude:stream-error')
  },

  detectQuestion: (payload: { transcript: string; previousTranscript: string }) =>
    ipcRenderer.invoke('claude:detect-question', payload),

  generatePrepQuestions: (payload: { jobDescription: string; knowledgeContext: string; resume: string }) =>
    ipcRenderer.invoke('claude:prep-questions', payload),

  transcribeAudio: (base64Audio: string, mimeType: string) =>
    ipcRenderer.invoke('stt:transcribe', { base64Audio, mimeType })
})
