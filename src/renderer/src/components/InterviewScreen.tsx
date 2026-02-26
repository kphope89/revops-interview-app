import { useState, useEffect, useRef, useCallback } from 'react'
import { JobContext, Settings, AnalyzedQuestion, TranscriptEntry, QuestionAnalysis, PrepQuestionsState } from '../types'
import { useSpeechRecognition } from '../hooks/useSpeechRecognition'
import { getKnowledgeContext } from '../data/revops-knowledge'
import LiveTranscript from './LiveTranscript'
import ResponsePanel from './ResponsePanel'

interface Props {
  jobContext: JobContext
  settings: Settings
  onEnd: () => void
}

const QUESTION_CHECK_DEBOUNCE = 3000
const MIN_TRANSCRIPT_WORDS = 6

export default function InterviewScreen({ jobContext, settings }: Props) {
  const { status, interimTranscript, finalTranscripts, error, start, stop, pause, resume, clearTranscripts } =
    useSpeechRecognition()

  const [transcriptEntries, setTranscriptEntries] = useState<TranscriptEntry[]>([])
  const [analyzedQuestions, setAnalyzedQuestions] = useState<AnalyzedQuestion[]>([])
  const [selectedQuestionId, setSelectedQuestionId] = useState<string | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const [sessionStarted, setSessionStarted] = useState(false)
  const [prepState, setPrepState] = useState<PrepQuestionsState>({ status: 'idle', questions: [] })
  const [teleprompterOpen, setTeleprompterOpen] = useState(false)

  const lastCheckedTranscriptRef = useRef('')
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const previousTranscriptRef = useRef('')
  const processedFinalCountRef = useRef(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const transcriptEntriesRef = useRef<TranscriptEntry[]>([])
  const settingsRef = useRef(settings)
  useEffect(() => { settingsRef.current = settings }, [settings])

  // Timer
  useEffect(() => {
    if (status === 'listening' && !timerRef.current) {
      if (!sessionStarted) setSessionStarted(true)
      timerRef.current = setInterval(() => setElapsedSeconds((s) => s + 1), 1000)
    } else if (status !== 'listening' && timerRef.current) {
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

  // Generate predicted questions on mount
  useEffect(() => {
    const run = async () => {
      setPrepState({ status: 'loading', questions: [] })
      try {
        const result = await window.electronAPI.generatePrepQuestions({
          jobDescription: `${jobContext.title} at ${jobContext.company}\n\n${jobContext.description}`,
          knowledgeContext: getKnowledgeContext(),
          resume: settingsRef.current.resume ?? ''
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

  // Process new final transcript segments
  useEffect(() => {
    const newSegments = finalTranscripts.slice(processedFinalCountRef.current)
    if (newSegments.length === 0) return
    processedFinalCountRef.current = finalTranscripts.length

    const newEntries: TranscriptEntry[] = newSegments.map((text) => ({
      id: crypto.randomUUID(),
      text,
      timestamp: new Date(),
      isQuestion: false
    }))

    setTranscriptEntries((prev) => [...prev, ...newEntries])

    const combinedNew = newSegments.join(' ')
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current)
    debounceTimerRef.current = setTimeout(() => {
      const words = combinedNew.trim().split(/\s+/).filter(Boolean)
      if (words.length >= MIN_TRANSCRIPT_WORDS) {
        checkForQuestion(combinedNew)
      }
    }, QUESTION_CHECK_DEBOUNCE)
  }, [finalTranscripts])

  const checkForQuestion = useCallback(
    async (newText: string) => {
      if (newText === lastCheckedTranscriptRef.current) return
      lastCheckedTranscriptRef.current = newText

      try {
        const result = await window.electronAPI.detectQuestion({
          transcript: newText,
          previousTranscript: previousTranscriptRef.current.slice(-200)
        })

        previousTranscriptRef.current = newText

        if (result.success && result.data?.isQuestion && result.data.question) {
          const question = result.data.question
          const type = result.data.type as TranscriptEntry['questionType']
          const questionId = crypto.randomUUID()

          setTranscriptEntries((prev) =>
            prev.map((entry) =>
              entry.text.toLowerCase().includes(question.toLowerCase().slice(0, 30))
                ? { ...entry, isQuestion: true, questionType: type, relatedQuestionId: questionId }
                : entry
            )
          )

          analyzeQuestion(question, questionId)
        }
      } catch {
        // Silent fail
      }
    },
    []
  )

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

    setAnalyzedQuestions((prev) => [entry, ...prev])
    setSelectedQuestionId(questionId)
    setIsAnalyzing(true)

    window.electronAPI.removeStreamListeners()

    const knowledgeContext = getKnowledgeContext()
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
        resume: settingsRef.current.resume ?? ''
      },
      questionId
    )
  }, [jobContext])

  const handleManualQuestion = useCallback(
    (question: string) => {
      if (question.trim()) analyzeQuestion(question.trim())
    },
    [analyzeQuestion]
  )

  const handleClearSession = () => {
    clearTranscripts()
    setTranscriptEntries([])
    setAnalyzedQuestions([])
    setSelectedQuestionId(null)
    lastCheckedTranscriptRef.current = ''
    previousTranscriptRef.current = ''
    processedFinalCountRef.current = 0
    setElapsedSeconds(0)
    setSessionStarted(false)
  }

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0')
    const s = (seconds % 60).toString().padStart(2, '0')
    return `${m}:${s}`
  }

  const selectedQuestion = analyzedQuestions.find((q) => q.id === selectedQuestionId) || null

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
                <div
                  className={`w-2.5 h-2.5 rounded-full ${
                    status === 'listening'
                      ? 'bg-emerald-400 listening-dot'
                      : status === 'paused'
                      ? 'bg-amber-400'
                      : 'bg-slate-600'
                  }`}
                />
                {status === 'listening' && (
                  <div className="absolute inset-0 rounded-full bg-emerald-400/30 glow-pulse" />
                )}
              </div>

              <div>
                <p className={`text-sm font-semibold leading-tight ${
                  status === 'listening' ? 'text-emerald-300'
                  : status === 'paused' ? 'text-amber-300'
                  : 'text-slate-400'
                }`}>
                  {status === 'listening'
                    ? interimTranscript ? 'Transcribing…' : 'Listening'
                    : status === 'paused' ? 'Paused'
                    : 'Ready'}
                </p>
                {sessionStarted && (
                  <p className="text-[11px] text-slate-600 font-mono leading-tight">{formatTime(elapsedSeconds)}</p>
                )}
              </div>
            </div>

            {/* Control buttons with icons */}
            <div className="flex items-center gap-1.5">
              {(status === 'idle' || status === 'error') && (
                <button
                  onClick={start}
                  className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold px-3 py-1.5 rounded-xl transition-all duration-150 shadow-sm hover:shadow-emerald-500/20 hover:shadow-md"
                >
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z"/>
                  </svg>
                  Start
                </button>
              )}
              {status === 'listening' && (
                <button
                  onClick={pause}
                  className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium px-3 py-1.5 rounded-xl border border-slate-700/60 transition-all duration-150"
                >
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
                  </svg>
                  Pause
                </button>
              )}
              {status === 'paused' && (
                <button
                  onClick={resume}
                  className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold px-3 py-1.5 rounded-xl transition-all duration-150"
                >
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z"/>
                  </svg>
                  Resume
                </button>
              )}
              {sessionStarted && (
                <button
                  onClick={stop}
                  className="flex items-center justify-center w-7 h-7 bg-slate-800 hover:bg-red-500/20 text-slate-500 hover:text-red-400 rounded-xl border border-slate-700/60 hover:border-red-500/30 transition-all duration-150"
                  title="Stop session"
                >
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M6 6h12v12H6z"/>
                  </svg>
                </button>
              )}
            </div>
          </div>

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
          interimTranscript={interimTranscript}
          isListening={status === 'listening'}
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
        />
      </div>
    </div>
  )
}
