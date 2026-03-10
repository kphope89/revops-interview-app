export type AppScreen = 'setup' | 'prep' | 'interview' | 'settings'

export type ToneMode = 'conversational' | 'tight' | 'exec'

export interface Settings {
  apiKey: string
  model: string
  resume: string
  openaiApiKey: string
  toneMode: ToneMode
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
  followUps?: string[]
  followUpsLoading?: boolean
}

export interface PrepQuestion {
  id: string
  question: string
  competency: string
  rationale: string
}

export interface HotCompetency {
  label: string
  coachingNote: string
}

export interface PrepKit {
  narrative: string
  talkingPoints: string[]
  questionsToAsk: string[]
  hotCompetencies: HotCompetency[]
  powerPhrases: string[]
}

export type PrepKitStatus = 'idle' | 'loading' | 'ready' | 'error'

export interface PrepKitState {
  status: PrepKitStatus
  kit: PrepKit | null
  error?: string
}

export interface PrepQuestionsState {
  status: 'idle' | 'loading' | 'ready' | 'error'
  questions: PrepQuestion[]
  error?: string
}

export type KnowledgeItemType = 'project' | 'achievement' | 'framework' | 'brief'

export interface KnowledgeItem {
  id: string
  title: string
  type: KnowledgeItemType
  content: string
  createdAt: string
}

export interface UserProfile {
  name: string
  currentTitle: string
  currentCompany: string
  yearsExperience: string       // "1-3 years" | "4-6 years" | "7-10 years" | "10+ years"
  targetTitle: string
  targetStage: string           // "Seed / Series A" | "Series B-C" | ...
  targetIndustry: string
  lookingBecause: string
  topStrengths: string[]        // subset of the 14 RevOps competency labels, max 5
  signatureMetrics: string[]    // fixed array of 3 strings (empty string = blank)
  differentiator: string
  resume: string
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

  getKnowledgeItems: () => Promise<KnowledgeItem[]>
  upsertKnowledgeItem: (item: KnowledgeItem) => Promise<boolean>
  deleteKnowledgeItem: (id: string) => Promise<boolean>

  getSavedJobContext: () => Promise<JobContext | null>
  saveJobContext: (ctx: JobContext) => Promise<boolean>
  generateFollowUpQuestions: (payload: {
    question: string
    suggestedResponse: string
    jobDescription: string
  }) => Promise<{ success: boolean; questions?: string[]; error?: string }>

  getProfile: () => Promise<UserProfile>
  saveProfile: (profile: UserProfile) => Promise<boolean>
  parseResume: (resume: string) => Promise<{ success: boolean; parsed?: Partial<UserProfile>; error?: string }>

  generatePrepKit: (payload: {
    jobDescription: string
    knowledgeContext: string
    resume: string
    profileSection: string
    spotlightItems?: Array<{ title: string; type: string; content: string }>
  }) => Promise<{ success: boolean; kit?: PrepKit; error?: string }>

  // Teleprompter window control
  openTeleprompter: (data: unknown) => void
  closeTeleprompter: () => void
  updateTeleprompter: (data: unknown) => void
  onTeleprompterQuestion: (cb: (data: unknown) => void) => void
  onTeleprompterChunk: (cb: (data: { requestId: string; delta: string }) => void) => void
  onTeleprompterDone: (cb: (data: { requestId: string; fullText: string }) => void) => void
  onTeleprompterError: (cb: (data: { requestId: string; error: string }) => void) => void
  removeTeleprompterListeners: () => void
}

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}
