import { useState, useEffect, useRef, useCallback } from 'react'
import { JobContext, Settings, AnalyzedQuestion, TranscriptEntry } from '../types'
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

export default function InterviewScreen({ jobContext, settings: _settings }: Props) {
  const { status, interimTranscript, finalTranscripts, error, start, stop, pause, resume, clearTranscripts } =
    useSpeechRecognition()

  const [transcriptEntries, setTranscriptEntries] = useState<TranscriptEntry[]>([])
  const [analyzedQuestions, setAnalyzedQuestions] = useState<AnalyzedQuestion[]>([])
  const [selectedQuestionId, setSelectedQuestionId] = useState<string | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const [sessionStarted, setSessionStarted] = useState(false)

  const lastCheckedTranscriptRef = useRef('')
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const previousTranscriptRef = useRef('')
  const processedFinalCountRef = useRef(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

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

          // Mark transcript entries as question
          setTranscriptEntries((prev) =>
            prev.map((entry) =>
              entry.text.toLowerCase().includes(question.toLowerCase().slice(0, 30))
                ? { ...entry, isQuestion: true, questionType: type }
                : entry
            )
          )

          analyzeQuestion(question)
        }
      } catch {
        // Silent fail for detection
      }
    },
    []
  )

  const analyzeQuestion = useCallback(async (question: string) => {
    const id = crypto.randomUUID()
    const entry: AnalyzedQuestion = {
      id,
      question,
      timestamp: new Date(),
      analysis: null,
      isLoading: true
    }

    setAnalyzedQuestions((prev) => [entry, ...prev])
    setSelectedQuestionId(id)
    setIsAnalyzing(true)

    try {
      const knowledgeContext = getKnowledgeContext()
      const conversationHistory = transcriptEntries
        .slice(-10)
        .map((e) => e.text)
        .join(' ')

      const result = await window.electronAPI.analyzeQuestion({
        question,
        jobDescription: `${jobContext.title} at ${jobContext.company}\n\n${jobContext.description}`,
        knowledgeContext,
        conversationHistory
      })

      setAnalyzedQuestions((prev) =>
        prev.map((q) =>
          q.id === id
            ? {
                ...q,
                isLoading: false,
                analysis: result.success ? result.data || null : null,
                error: result.success ? undefined : result.error
              }
            : q
        )
      )
    } catch (e) {
      setAnalyzedQuestions((prev) =>
        prev.map((q) =>
          q.id === id ? { ...q, isLoading: false, error: String(e) } : q
        )
      )
    }

    setIsAnalyzing(false)
  }, [jobContext, transcriptEntries])

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
        <div className="p-4 border-b border-slate-700/50 bg-surface-1">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div
                className={`w-2 h-2 rounded-full ${
                  status === 'listening'
                    ? 'bg-emerald-400 listening-dot'
                    : status === 'paused'
                    ? 'bg-amber-400'
                    : 'bg-slate-500'
                }`}
              />
              <span className="text-sm font-medium text-slate-300">
                {status === 'listening' ? 'Listening' : status === 'paused' ? 'Paused' : 'Stopped'}
              </span>
              {sessionStarted && (
                <span className="text-xs text-slate-500 font-mono">{formatTime(elapsedSeconds)}</span>
              )}
            </div>
            <div className="flex items-center gap-1.5">
              {status === 'idle' || status === 'error' ? (
                <button onClick={start} className="btn-primary text-xs py-1 px-3">
                  Start Listening
                </button>
              ) : status === 'listening' ? (
                <button onClick={pause} className="btn-secondary text-xs py-1 px-3">
                  Pause
                </button>
              ) : (
                <button onClick={resume} className="btn-primary text-xs py-1 px-3">
                  Resume
                </button>
              )}
              {sessionStarted && (
                <button onClick={stop} className="btn-danger text-xs py-1 px-3">
                  Stop
                </button>
              )}
            </div>
          </div>

          {/* Job context pill */}
          <div className="flex items-center gap-2 bg-slate-800 rounded-lg px-3 py-1.5">
            <div className="w-1.5 h-1.5 bg-blue-400 rounded-full flex-shrink-0" />
            <div className="min-w-0">
              <p className="text-xs font-medium text-slate-200 truncate">{jobContext.title}</p>
              <p className="text-xs text-slate-400 truncate">{jobContext.company}</p>
            </div>
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
        />
      </div>
    </div>
  )
}
