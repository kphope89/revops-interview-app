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

const QUESTION_CHECK_DEBOUNCE = 3000 // ms after speech pause before checking for questions
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

  const lastCheckedTranscriptRef = useRef('')
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const previousTranscriptRef = useRef('')
  const processedFinalCountRef = useRef(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const transcriptEntriesRef = useRef<TranscriptEntry[]>([])
  // Ref so analyzeQuestion always reads the latest settings without being in the dependency array
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

  // Keep ref in sync so analyzeQuestion always reads current entries regardless of closure age
  useEffect(() => {
    transcriptEntriesRef.current = transcriptEntries
  }, [transcriptEntries])

  // Generate predicted questions from the job description on mount
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
  }, []) // intentionally empty — run once on mount

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

    // Debounce question detection
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

          // Mark transcript entries as question and link to the analyzed question
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
        // Silent fail for detection
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

    // Clean up any lingering listeners from a prior analysis
    window.electronAPI.removeStreamListeners()

    const knowledgeContext = getKnowledgeContext()
    // Read from ref so this always reflects current transcript, even when called
    // from checkForQuestion which closes over an older version of analyzeQuestion
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
      {/* Left panel: Transcript */}
      <div className="w-[420px] flex flex-col border-r border-slate-700/50">
        {/* Session controls */}
        <div className="border-b border-slate-700/50 bg-surface-1">
          {/* Top bar: status + timer + buttons */}
          <div className="flex items-center justify-between px-4 py-3">
            <div className="flex items-center gap-2.5">
              <div
                className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
                  status === 'listening'
                    ? 'bg-emerald-400 listening-dot'
                    : status === 'paused'
                    ? 'bg-amber-400'
                    : 'bg-slate-500'
                }`}
              />
              <div>
                <p className="text-sm font-semibold text-slate-200 leading-tight">
                  {status === 'listening'
                    ? interimTranscript
                      ? 'Transcribing...'
                      : 'Listening'
                    : status === 'paused'
                    ? 'Paused'
                    : 'Ready'}
                </p>
                {sessionStarted && (
                  <p className="text-xs text-slate-500 font-mono leading-tight">{formatTime(elapsedSeconds)}</p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              {status === 'idle' || status === 'error' ? (
                <button onClick={start} className="btn-success text-sm py-1.5 px-4">
                  Start Listening
                </button>
              ) : status === 'listening' ? (
                <button onClick={pause} className="btn-secondary text-sm py-1.5 px-4">
                  Pause
                </button>
              ) : (
                <button onClick={resume} className="btn-success text-sm py-1.5 px-4">
                  Resume
                </button>
              )}
              {sessionStarted && (
                <button onClick={stop} className="btn-danger text-sm py-1.5 px-4">
                  Stop
                </button>
              )}
            </div>
          </div>

          {/* Job context pill */}
          <div className="flex items-center gap-2 mx-4 mb-3 bg-slate-800/60 rounded-lg px-3 py-2">
            <div className="w-1.5 h-1.5 bg-blue-400 rounded-full flex-shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-slate-200 truncate">{jobContext.title}</p>
              <p className="text-xs text-slate-400 truncate">{jobContext.company}</p>
            </div>
            {status === 'listening' && (
              <span className="text-xs text-slate-500 flex-shrink-0">captures every 7s</span>
            )}
          </div>
        </div>

        {error && (
          <div className="mx-4 mt-3 p-2.5 bg-red-500/10 border border-red-500/20 rounded-lg text-xs text-red-400">
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

      {/* Right panel: Responses */}
      <div className="flex-1 overflow-hidden">
        <ResponsePanel
          questions={analyzedQuestions}
          selectedId={selectedQuestionId}
          onSelectQuestion={setSelectedQuestionId}
          jobContext={jobContext}
          onManualQuestion={handleManualQuestion}
          prepState={prepState}
          onPracticeQuestion={handleManualQuestion}
        />
      </div>
    </div>
  )
}
