export type AppScreen = 'setup' | 'interview' | 'settings'

export interface Settings {
  apiKey: string
  model: string
  resume: string
  openaiApiKey: string
}

export interface JobContext {
  title: string
  company: string
  description: string
  url?: string
}

export interface TranscriptEntry {
  id: string
  text: string
  timestamp: Date
  isQuestion: boolean
  questionType?: 'behavioral' | 'technical' | 'situational' | 'general'
  relatedQuestionId?: string
}

export interface QuestionAnalysis {
  competency: string
  keyPoints: string[]
  suggestedResponse: string
  toolsToMention: string[]
  metricsToMention: string[]
  confidence: 'high' | 'medium' | 'low'
}

export interface AnalyzedQuestion {
  id: string
  question: string
  timestamp: Date
  analysis: QuestionAnalysis | null
  isLoading: boolean
  streamingText?: string
  error?: string
}

export interface PrepQuestion {
  id: string
  question: string
  competency: string
  rationale: string
}

export interface PrepQuestionsState {
  status: 'idle' | 'loading' | 'ready' | 'error'
  questions: PrepQuestion[]
  error?: string
}

export interface ElectronAPI {
  getSettings: () => Promise<Settings>
  saveSettings: (settings: Settings) => Promise<boolean>
  fetchJobUrl: (url: string) => Promise<{ success: boolean; text?: string; error?: string }>
  analyzeQuestionStream: (
    payload: {
      question: string
      jobDescription: string
      knowledgeContext: string
      conversationHistory: string
      resume: string
    },
    requestId: string
  ) => void
  onStreamChunk: (callback: (data: { requestId: string; delta: string }) => void) => void
  onStreamDone: (callback: (data: { requestId: string; fullText: string }) => void) => void
  onStreamError: (callback: (data: { requestId: string; error: string }) => void) => void
  removeStreamListeners: () => void
  detectQuestion: (payload: {
    transcript: string
    previousTranscript: string
  }) => Promise<{
    success: boolean
    data?: { isQuestion: boolean; question?: string; type?: string }
  }>
  generatePrepQuestions: (payload: {
    jobDescription: string
    knowledgeContext: string
    resume: string
  }) => Promise<{ success: boolean; questions?: PrepQuestion[]; error?: string }>
  transcribeAudio: (
    base64Audio: string,
    mimeType: string
  ) => Promise<{ success: boolean; text?: string; error?: string }>
}

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}
