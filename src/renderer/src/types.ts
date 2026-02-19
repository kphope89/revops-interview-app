export type AppScreen = 'setup' | 'interview' | 'settings'

export interface Settings {
  apiKey: string
  model: string
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
  error?: string
}

export interface ElectronAPI {
  getSettings: () => Promise<Settings>
  saveSettings: (settings: Settings) => Promise<boolean>
  fetchJobUrl: (url: string) => Promise<{ success: boolean; text?: string; error?: string }>
  analyzeQuestion: (payload: {
    question: string
    jobDescription: string
    knowledgeContext: string
    conversationHistory: string
  }) => Promise<{ success: boolean; data?: QuestionAnalysis; error?: string }>
  detectQuestion: (payload: {
    transcript: string
    previousTranscript: string
  }) => Promise<{
    success: boolean
    data?: { isQuestion: boolean; question?: string; type?: string }
  }>
}

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}
