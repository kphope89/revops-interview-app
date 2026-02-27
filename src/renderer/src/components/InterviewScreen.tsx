import { useState, useEffect, useRef, useCallback } from 'react'
import { JobContext, Settings, AnalyzedQuestion, TranscriptEntry, QuestionAnalysis, PrepQuestionsState, KnowledgeItem, UserProfile } from '../types'
import { useSpeechRecognition } from '../hooks/useSpeechRecognition'
import { getKnowledgeContext, buildUserKnowledgeSection } from '../data/revops-knowledge'
import { buildProfileSection } from '../data/buildProfileSection'
import LiveTranscript from './LiveTranscript'
import ResponsePanel from './ResponsePanel'

const DEFAULT_PROFILE: UserProfile = {
  name: '',
  currentTitle: '',
  currentCompany: '',
  yearsExperience: '',
  targetTitle: '',
  targetStage: '',
  targetIndustry: '',
  lookingBecause: '',
  topStrengths: [],
  signatureMetrics: ['', '', ''],
  differentiator: '',
  resume: ''
}

interface Props {
  jobContext: JobContext
  settings: Settings
  onEnd: () => void
}

const MIN_WORDS_TO_ANALYZE = 4

export default function InterviewScreen({ jobContext, settings }: Props) {
  const { status, finalTranscripts, error, arm, startHold, stopHold, disarm, clearTranscripts } =
    useSpeechRecognition()

  const [transcriptEntries, setTranscriptEntries] = useState<TranscriptEntry[]>([])
  const [analyzedQuestions, setAnalyzedQuestions] = useState<AnalyzedQuestion[]>([])
  const [selectedQuestionId, setSelectedQuestionId] = useState<string | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const [sessionStarted, setSessionStarted] = useState(false)
  const [prepState, setPrepState] = useState<PrepQuestionsState>({ status: 'idle', questions: [] })
  const [teleprompterOpen, setTeleprompterOpen] = useState(false)
  const [exportCopied, setExportCopied] = useState(false)

  const [knowledgeItems, setKnowledgeItems] = useState<KnowledgeItem[]>([])
  const [userProfile, setUserProfile] = useState<UserProfile>(DEFAULT_PROFILE)

  const processedFinalCountRef = useRef(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const transcriptEntriesRef = useRef<TranscriptEntry[]>([])
  const settingsRef = useRef(settings)
  useEffect(() => { settingsRef.current = settings }, [settings])
  const knowledgeItemsRef = useRef<KnowledgeItem[]>([])
  useEffect(() => { knowledgeItemsRef.current = knowledgeItems }, [knowledgeItems])
  const userProfileRef = useRef<UserProfile>(DEFAULT_PROFILE)
  useEffect(() => { userProfileRef.current = userProfile }, [userProfile])

  // Timer — runs while session is active (not idle/error)
  useEffect(() => {
    const isActive = status !== 'idle' && status !== 'error'
    if (isActive && !timerRef.current) {
      if (!sessionStarted) setSessionStarted(true)
      timerRef.current = setInterval(() => setElapsedSeconds((s) => s + 1), 1000)
    } else if (!isActive && timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [status, sessionStarted])

  useEffect(() => {
    transcriptEntriesRef.current = transcriptEntries
  }, [transcriptEntries])

  // Fetch knowledge items and profile on mount
  useEffect(() => {
    window.electronAPI.getKnowledgeItems().then(setKnowledgeItems)
    window.electronAPI.getProfile().then((p) => {
      const metrics = p.signatureMetrics ?? ['', '', '']
      while (metrics.length < 3) metrics.push('')
      setUserProfile({ ...DEFAULT_PROFILE, ...p, signatureMetrics: metrics.slice(0, 3) })
    })
  }, [])

  // Generate predicted questions on mount
  useEffect(() => {
    const run = async () => {
      setPrepState({ status: 'loading', questions: [] })
      try {
        const profileSection = buildProfileSection(userProfileRef.current)
        const result = await window.electronAPI.generatePrepQuestions({
          jobDescription: `${jobContext.title} at ${jobContext.company}\n\n${jobContext.description}`,
          knowledgeContext: getKnowledgeContext() + buildUserKnowledgeSection(knowledgeItemsRef.current) + (profileSection ? '\n\n' + profileSection : ''),
          resume: userProfileRef.current.resume || settingsRef.current.resume || ''
        })
        if (result.success && result.questions) {
          setPrepState({
            status: 'ready',
            questions: result.questions.map((q) => ({ ...q, id: q.id ?? crypto.randomUUID() }))
          })
        } else {
          setPrepState({ status: 'error', questions: [], error: result.error })
        }
      } catch (err) {
        setPrepState({ status: 'error', questions: [], error: String(err) })
      }
    }
    run()
  }, [])

  // Each new transcription from a hold → add to transcript + immediately analyze
  useEffect(() => {
    const newSegments = finalTranscripts.slice(processedFinalCountRef.current)
    if (newSegments.length === 0) return
    processedFinalCountRef.current = finalTranscripts.length

    const newEntries: TranscriptEntry[] = newSegments.map((text) => ({
      id: crypto.randomUUID(),
      text,
      timestamp: new Date(),
      isQuestion: true
    }))

    setTranscriptEntries((prev) => [...prev, ...newEntries])

    // Analyze every capture — the user pressed hold deliberately
    newSegments.forEach((text) => {
      if (text.trim().split(/\s+/).filter(Boolean).length >= MIN_WORDS_TO_ANALYZE) {
        analyzeQuestion(text.trim())
      }
    })
  }, [finalTranscripts])

  // Spacebar = hold while session is armed/recording
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code !== 'Space' || e.repeat) return
      const target = e.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return
      e.preventDefault()
      startHold()
    }
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code !== 'Space') return
      stopHold()
    }
    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [startHold, stopHold])

  const analyzeQuestion = useCallback((question: string, id?: string) => {
    const questionId = id ?? crypto.randomUUID()
    const entry: AnalyzedQuestion = {
      id: questionId,
      question,
      timestamp: new Date(),
      analysis: null,
      isLoading: true,
      streamingText: ''
    }

    setAnalyzedQuestions((prev) => {
      const existingIdx = prev.findIndex((q) => q.id === questionId)
      if (existingIdx >= 0) {
        const next = [...prev]
        next[existingIdx] = entry
        return next
      }
      return [entry, ...prev]
    })
    setSelectedQuestionId(questionId)
    setIsAnalyzing(true)

    window.electronAPI.removeStreamListeners()

    const profileSection = buildProfileSection(userProfile)
    const knowledgeContext = getKnowledgeContext() + buildUserKnowledgeSection(knowledgeItems) + (profileSection ? '\n\n' + profileSection : '')
    const conversationHistory = transcriptEntriesRef.current
      .slice(-10)
      .map((e) => e.text)
      .join(' ')

    window.electronAPI.onStreamChunk(({ requestId, delta }) => {
      if (requestId !== questionId) return
      setAnalyzedQuestions((prev) =>
        prev.map((q) =>
          q.id === questionId ? { ...q, streamingText: (q.streamingText ?? '') + delta } : q
        )
      )
    })

    window.electronAPI.onStreamDone(({ requestId, fullText }) => {
      if (requestId !== questionId) return
      window.electronAPI.removeStreamListeners()
      try {
        const jsonMatch = fullText.match(/\{[\s\S]*\}/)
        if (!jsonMatch) throw new Error('Could not parse JSON response')
        const parsed = JSON.parse(jsonMatch[0]) as QuestionAnalysis
        setAnalyzedQuestions((prev) =>
          prev.map((q) =>
            q.id === questionId
              ? { ...q, isLoading: false, analysis: parsed, streamingText: undefined }
              : q
          )
        )
      } catch (e) {
        setAnalyzedQuestions((prev) =>
          prev.map((q) =>
            q.id === questionId
              ? { ...q, isLoading: false, error: String(e), streamingText: undefined }
              : q
          )
        )
      }
      setIsAnalyzing(false)
    })

    window.electronAPI.onStreamError(({ requestId, error }) => {
      if (requestId !== questionId) return
      window.electronAPI.removeStreamListeners()
      setAnalyzedQuestions((prev) =>
        prev.map((q) =>
          q.id === questionId
            ? { ...q, isLoading: false, error, streamingText: undefined }
            : q
        )
      )
      setIsAnalyzing(false)
    })

    window.electronAPI.analyzeQuestionStream(
      {
        question,
        jobDescription: `${jobContext.title} at ${jobContext.company}\n\n${jobContext.description}`,
        knowledgeContext,
        conversationHistory,
        resume: userProfile.resume || settingsRef.current.resume || ''
      },
      questionId
    )
  }, [jobContext, knowledgeItems, userProfile])

  const handleManualQuestion = useCallback(
    (question: string) => {
      if (question.trim()) analyzeQuestion(question.trim())
    },
    [analyzeQuestion]
  )

  const handleReanalyze = useCallback(
    (questionId: string, question: string) => {
      analyzeQuestion(question, questionId)
    },
    [analyzeQuestion]
  )

  const handleGenerateFollowUps = useCallback(
    async (questionId: string) => {
      const question = analyzedQuestions.find((q) => q.id === questionId)
      if (!question?.analysis) return

      setAnalyzedQuestions((prev) =>
        prev.map((q) => (q.id === questionId ? { ...q, followUpsLoading: true } : q))
      )

      const result = await window.electronAPI.generateFollowUpQuestions({
        question: question.question,
        suggestedResponse: question.analysis.suggestedResponse,
        jobDescription: `${jobContext.title} at ${jobContext.company}\n\n${jobContext.description}`
      })

      setAnalyzedQuestions((prev) =>
        prev.map((q) =>
          q.id === questionId
            ? { ...q, followUpsLoading: false, followUps: result.questions ?? [] }
            : q
        )
      )
    },
    [analyzedQuestions, jobContext]
  )

  const handleClearSession = () => {
    clearTranscripts()
    setTranscriptEntries([])
    setAnalyzedQuestions([])
    setSelectedQuestionId(null)
    processedFinalCountRef.current = 0
    setElapsedSeconds(0)
    setSessionStarted(false)
  }

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0')
    const s = (seconds % 60).toString().padStart(2, '0')
    return `${m}:${s}`
  }

  const buildExportMarkdown = () => {
    const now = new Date().toLocaleString()
    const chronological = [...analyzedQuestions].reverse()
    const header = `# Interview Session — ${jobContext.title} at ${jobContext.company}\n${now}`
    const sections = chronological
      .filter((q) => q.analysis)
      .map((q, i) => {
        const a = q.analysis!
        const keyPoints = a.keyPoints.map((p) => `- ${p}`).join('\n')
        return `---\n\n## Q${i + 1}: ${q.question}\n**Competency:** ${a.competency}\n**Key Points:**\n${keyPoints}\n\n**Talk Track:**\n${a.suggestedResponse}`
      })
      .join('\n\n')
    return sections ? `${header}\n\n${sections}` : header
  }

  const handleExport = async () => {
    await navigator.clipboard.writeText(buildExportMarkdown())
    setExportCopied(true)
    setTimeout(() => setExportCopied(false), 2000)
  }

  const selectedQuestion = analyzedQuestions.find((q) => q.id === selectedQuestionId) || null

  // Sync teleprompter window open/close state
  useEffect(() => {
    if (teleprompterOpen) {
      window.electronAPI.openTeleprompter(selectedQuestion)
    } else {
      window.electronAPI.closeTeleprompter()
    }
  }, [teleprompterOpen])

  // Update teleprompter when selected question changes
  useEffect(() => {
    if (teleprompterOpen && selectedQuestion) {
      window.electronAPI.updateTeleprompter(selectedQuestion)
    }
  }, [selectedQuestion?.id])

  // Derived status labels
  const statusLabel =
    status === 'recording' ? 'Recording…' :
    status === 'transcribing' ? 'Transcribing…' :
    status === 'armed' ? (isAnalyzing ? 'Analyzing…' : 'Ready — hold to capture') :
    status === 'error' ? 'Error' :
    'Ready'

  const statusColor =
    status === 'recording' ? 'text-red-300' :
    status === 'transcribing' ? 'text-amber-300' :
    status === 'armed' ? 'text-emerald-300' :
    'text-slate-400'

  const dotColor =
    status === 'recording' ? 'bg-red-400' :
    status === 'transcribing' ? 'bg-amber-400' :
    status === 'armed' ? 'bg-emerald-400' :
    'bg-slate-600'

  return (
    <div className="flex h-full">
      {/* ── Left panel: Transcript ── */}
      <div className="w-[300px] flex flex-col border-r border-slate-800/70 bg-[#080d1a]">
        {/* Session controls */}
        <div className="border-b border-slate-800/70 px-4 py-3 space-y-3">
          {/* Status row */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              {/* Status dot */}
              <div className="relative flex-shrink-0">
                <div className={`w-2.5 h-2.5 rounded-full ${dotColor} ${status === 'armed' ? 'listening-dot' : ''}`} />
                {status === 'armed' && (
                  <div className="absolute inset-0 rounded-full bg-emerald-400/30 glow-pulse" />
                )}
                {status === 'recording' && (
                  <div className="absolute inset-0 rounded-full bg-red-400/30 glow-pulse" />
                )}
              </div>

              <div>
                <p className={`text-sm font-semibold leading-tight ${statusColor}`}>
                  {statusLabel}
                </p>
                {sessionStarted && (
                  <p className="text-[11px] text-slate-600 font-mono leading-tight">{formatTime(elapsedSeconds)}</p>
                )}
              </div>
            </div>

            {/* Control buttons */}
            <div className="flex items-center gap-1.5">
              {(status === 'idle' || status === 'error') && (
                <button
                  onClick={arm}
                  className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold px-3 py-1.5 rounded-xl transition-all duration-150 shadow-sm hover:shadow-emerald-500/20 hover:shadow-md"
                >
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z"/>
                  </svg>
                  Start
                </button>
              )}
              {sessionStarted && status !== 'idle' && (
                <button
                  onClick={disarm}
                  className="flex items-center justify-center w-7 h-7 bg-slate-800 hover:bg-red-500/20 text-slate-500 hover:text-red-400 rounded-xl border border-slate-700/60 hover:border-red-500/30 transition-all duration-150"
                  title="End session"
                >
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M6 6h12v12H6z"/>
                  </svg>
                </button>
              )}
            </div>
          </div>

          {/* Hold button — shown when session is active */}
          {(status === 'armed' || status === 'recording' || status === 'transcribing') && (
            <button
              onMouseDown={startHold}
              onMouseUp={stopHold}
              onMouseLeave={() => { if (status === 'recording') stopHold() }}
              disabled={status === 'transcribing'}
              className={`w-full py-2.5 rounded-xl text-sm font-semibold transition-all duration-100 select-none ${
                status === 'recording'
                  ? 'bg-red-500 text-white shadow-lg shadow-red-500/30 scale-[0.98]'
                  : status === 'transcribing'
                  ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30 cursor-wait'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700/60 hover:border-slate-600 active:scale-[0.98]'
              }`}
            >
              {status === 'recording' ? '● Recording…' : status === 'transcribing' ? 'Transcribing…' : 'Hold to Capture  ·  Space'}
            </button>
          )}

          {/* Job context pill */}
          <div className="flex items-center gap-2 bg-slate-900/60 rounded-xl px-3 py-2 border border-slate-800/60">
            <div className="w-5 h-5 rounded-lg bg-blue-600/20 flex items-center justify-center flex-shrink-0">
              <svg className="w-3 h-3 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-slate-200 truncate leading-tight">{jobContext.title}</p>
              <p className="text-[11px] text-slate-500 truncate leading-tight">{jobContext.company}</p>
            </div>
          </div>

          {/* Export button — appears once at least one question is fully analyzed */}
          {analyzedQuestions.some((q) => q.analysis) && (
            <button
              onClick={handleExport}
              className="w-full flex items-center justify-center gap-1.5 text-xs py-1 rounded-lg transition-colors text-slate-500 hover:text-slate-300 hover:bg-slate-800/50"
            >
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              {exportCopied ? 'Copied!' : 'Copy session summary'}
            </button>
          )}
        </div>

        {/* Error display */}
        {error && (
          <div className="mx-4 mt-3 p-2.5 bg-red-500/10 border border-red-500/20 rounded-xl text-xs text-red-400 flex items-center gap-2">
            <svg className="w-3.5 h-3.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd"/>
            </svg>
            {error}
          </div>
        )}

        <LiveTranscript
          entries={transcriptEntries}
          isActive={status !== 'idle' && status !== 'error'}
          onQuestionClick={setSelectedQuestionId}
          onManualQuestion={handleManualQuestion}
          onClear={handleClearSession}
          isAnalyzing={isAnalyzing}
        />
      </div>

      {/* ── Right panel: Responses ── */}
      <div className="flex-1 overflow-hidden">
        <ResponsePanel
          questions={analyzedQuestions}
          selectedId={selectedQuestionId}
          onSelectQuestion={setSelectedQuestionId}
          jobContext={jobContext}
          onManualQuestion={handleManualQuestion}
          prepState={prepState}
          onPracticeQuestion={handleManualQuestion}
          teleprompterOpen={teleprompterOpen}
          onTeleprompterToggle={() => setTeleprompterOpen((v) => !v)}
          selectedQuestion={selectedQuestion}
          onReanalyze={handleReanalyze}
          onGenerateFollowUps={handleGenerateFollowUps}
        />
      </div>
    </div>
  )
}
