import { useEffect, useRef, useState } from 'react'
import { TranscriptEntry } from '../types'

interface Props {
  entries: TranscriptEntry[]
  interimTranscript: string
  isListening: boolean
  onQuestionClick: (id: string) => void
  onManualQuestion: (question: string) => void
  onClear: () => void
  isAnalyzing: boolean
}

export default function LiveTranscript({
  entries,
  interimTranscript,
  isListening,
  onQuestionClick,
  onManualQuestion,
  onClear,
  isAnalyzing
}: Props) {
  const bottomRef = useRef<HTMLDivElement>(null)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const isNearBottomRef = useRef(true)
  const [manualInput, setManualInput] = useState('')

  // Track whether user has scrolled away from the bottom
  const handleScroll = () => {
    if (scrollContainerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current
      isNearBottomRef.current = scrollHeight - scrollTop - clientHeight < 120
    }
  }

  // Auto-scroll only when new entries arrive and only if already near the bottom
  useEffect(() => {
    if (isNearBottomRef.current) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [entries])

  const handleManualSubmit = () => {
    if (manualInput.trim()) {
      onManualQuestion(manualInput.trim())
      setManualInput('')
    }
  }

  const formatTime = (date: Date) =>
    date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* Transcript area */}
      <div ref={scrollContainerRef} onScroll={handleScroll} className="flex-1 overflow-y-auto p-4 space-y-2">
        {entries.length === 0 && !interimTranscript && (
          <div className="flex flex-col items-center justify-center h-full text-center px-6 py-12">
            <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center mb-3">
              <svg className="w-5 h-5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
            </div>
            <p className="text-sm text-slate-400 font-medium mb-1">
              {isListening ? 'Waiting for speech...' : 'Ready to listen'}
            </p>
            <p className="text-xs text-slate-500 leading-relaxed">
              {isListening
                ? 'Speak naturally. Questions will be detected automatically.'
                : 'Click "Start Listening" to begin capturing the interview.'}
            </p>
          </div>
        )}

        {entries.map((entry) => (
          <div
            key={entry.id}
            className={`group relative rounded-lg p-2.5 transition-colors ${
              entry.isQuestion
                ? 'bg-blue-500/10 border border-blue-500/30 cursor-pointer hover:bg-blue-500/15'
                : 'bg-slate-800/50 hover:bg-slate-800'
            }`}
            onClick={() => entry.isQuestion && entry.relatedQuestionId && onQuestionClick(entry.relatedQuestionId)}
          >
            <div className="flex items-start gap-2">
              {entry.isQuestion && (
                <span className="flex-shrink-0 mt-0.5 badge bg-blue-500/20 text-blue-300">
                  Q
                </span>
              )}
              <div className="flex-1 min-w-0">
                <p className={`text-sm leading-relaxed ${entry.isQuestion ? 'text-blue-100 font-medium' : 'text-slate-300'}`}>
                  {entry.text}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-slate-600">{formatTime(entry.timestamp)}</span>
                  {entry.isQuestion && entry.questionType && (
                    <span className="badge bg-slate-700 text-slate-400">{entry.questionType}</span>
                  )}
                </div>
              </div>
              {entry.isQuestion && (
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    if (entry.relatedQuestionId) onQuestionClick(entry.relatedQuestionId)
                  }}
                  className="opacity-0 group-hover:opacity-100 flex-shrink-0 text-xs text-blue-400 hover:text-blue-300 transition-opacity"
                >
                  View
                </button>
              )}
            </div>
          </div>
        ))}

        {/* Interim (in-progress) transcript */}
        {interimTranscript && (
          <div className="rounded-lg p-2.5 bg-slate-800/30 border border-slate-700/30">
            <p className="text-sm text-slate-400 italic leading-relaxed">{interimTranscript}</p>
          </div>
        )}

        {isAnalyzing && (
          <div className="flex items-center gap-2 px-2 py-1">
            <div className="flex gap-1">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce"
                  style={{ animationDelay: `${i * 0.15}s` }}
                />
              ))}
            </div>
            <span className="text-xs text-blue-400">Analyzing question...</span>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Footer: clear + manual input */}
      <div className="border-t border-slate-700/50 p-3 space-y-2">
        {/* Manual question entry */}
        <div className="flex gap-2">
          <input
            className="input flex-1 text-sm py-1.5"
            placeholder="Type a question to analyze manually..."
            value={manualInput}
            onChange={(e) => setManualInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleManualSubmit()}
          />
          <button
            onClick={handleManualSubmit}
            disabled={!manualInput.trim()}
            className="btn-primary text-xs py-1.5 px-3 flex-shrink-0"
          >
            Ask
          </button>
        </div>

        {entries.length > 0 && (
          <button
            onClick={onClear}
            className="w-full text-xs text-slate-500 hover:text-slate-400 py-1 transition-colors"
          >
            Clear session
          </button>
        )}
      </div>
    </div>
  )
}
