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
    ipcRenderer.invoke('stt:transcribe', { base64Audio, mimeType }),

  // User profile
  getProfile: () => ipcRenderer.invoke('profile:get'),
  saveProfile: (profile: unknown) => ipcRenderer.invoke('profile:save', profile),

  // Knowledge base
  getKnowledgeItems: () => ipcRenderer.invoke('knowledge:get-all'),
  upsertKnowledgeItem: (item: unknown) => ipcRenderer.invoke('knowledge:upsert', item),
  deleteKnowledgeItem: (id: string) => ipcRenderer.invoke('knowledge:delete', id),

  // Job context persistence
  getSavedJobContext: () => ipcRenderer.invoke('job:get-saved'),
  saveJobContext: (ctx: unknown) => ipcRenderer.invoke('job:save-context', ctx),

  // Follow-up question prediction
  generateFollowUpQuestions: (payload: unknown) =>
    ipcRenderer.invoke('claude:followup-questions', payload),

  // Teleprompter window control (called from main renderer)
  openTeleprompter: (data: unknown) => ipcRenderer.send('teleprompter:open', data),
  closeTeleprompter: () => ipcRenderer.send('teleprompter:close'),
  updateTeleprompter: (data: unknown) => ipcRenderer.send('teleprompter:update', data),

  // Teleprompter window receives these (used by TeleprompterWindow.tsx)
  onTeleprompterQuestion: (cb: (data: unknown) => void) =>
    ipcRenderer.on('teleprompter:question', (_e, data) => cb(data)),
  onTeleprompterChunk: (cb: (data: { requestId: string; delta: string }) => void) =>
    ipcRenderer.on('teleprompter:chunk', (_e, data) => cb(data)),
  onTeleprompterDone: (cb: (data: { requestId: string; fullText: string }) => void) =>
    ipcRenderer.on('teleprompter:done', (_e, data) => cb(data)),
  onTeleprompterError: (cb: (data: { requestId: string; error: string }) => void) =>
    ipcRenderer.on('teleprompter:error', (_e, data) => cb(data)),
  removeTeleprompterListeners: () => {
    ipcRenderer.removeAllListeners('teleprompter:question')
    ipcRenderer.removeAllListeners('teleprompter:chunk')
    ipcRenderer.removeAllListeners('teleprompter:done')
    ipcRenderer.removeAllListeners('teleprompter:error')
  },
})
