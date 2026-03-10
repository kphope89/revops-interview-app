import { useEffect, useRef, useState } from 'react'
import { TranscriptEntry } from '../types'

interface Props {
  entries: TranscriptEntry[]
  isActive: boolean
  onQuestionClick: (id: string) => void
  onManualQuestion: (question: string) => void
  onClear: () => void
  isAnalyzing: boolean
}

export default function LiveTranscript({
  entries,
  isActive,
  onQuestionClick,
  onManualQuestion,
  onClear,
  isAnalyzing
}: Props) {
  const bottomRef = useRef<HTMLDivElement>(null)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const isNearBottomRef = useRef(true)
  const [manualInput, setManualInput] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [transcriptCopied, setTranscriptCopied] = useState(false)

  const handleScroll = () => {
    if (scrollContainerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current
      isNearBottomRef.current = scrollHeight - scrollTop - clientHeight < 120
    }
  }

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

  const handleCopyTranscript = async () => {
    const text = entries
      .map((e) => `[${formatTime(e.timestamp)}] ${e.text}`)
      .join('\n\n')
    await navigator.clipboard.writeText(text)
    setTranscriptCopied(true)
    setTimeout(() => setTranscriptCopied(false), 2000)
  }

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* Transcript area */}
      <div ref={scrollContainerRef} onScroll={handleScroll} className="flex-1 overflow-y-auto p-4 space-y-2">
        {entries.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center px-6 py-12">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${
                isActive ? 'bg-emerald-500/10 border border-emerald-500/20' : 'bg-slate-800'
              }`}
            >
              <svg
                className={`w-5 h-5 ${isActive ? 'text-emerald-400' : 'text-slate-500'}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
                />
              </svg>
            </div>
            <p className={`text-sm font-semibold mb-1 ${isActive ? 'text-emerald-400' : 'text-slate-400'}`}>
              {isActive ? 'Session active' : 'Ready to start'}
            </p>
            <p className="text-xs text-slate-500 leading-relaxed max-w-[200px]">
              {isActive
                ? 'Hold the button (or Space) while the interviewer asks a question.'
                : 'Click Start above to arm the microphone.'}
            </p>
          </div>
        )}

        {entries.map((entry) => (
          <div
            key={entry.id}
            className={`group relative rounded-xl p-3 transition-colors animate-slide-in ${
              entry.isQuestion
                ? 'bg-blue-500/10 border border-blue-500/30 cursor-pointer hover:bg-blue-500/15'
                : 'bg-slate-800/40 border border-transparent hover:bg-slate-800/70'
            }`}
            onClick={() => entry.isQuestion && entry.relatedQuestionId && onQuestionClick(entry.relatedQuestionId)}
          >
            <div className="flex items-start gap-2.5">
              {entry.isQuestion ? (
                <span className="flex-shrink-0 mt-0.5 w-5 h-5 rounded-full bg-blue-500/30 text-blue-300 text-xs flex items-center justify-center font-bold">
                  Q
                </span>
              ) : (
                <span className="flex-shrink-0 mt-1.5 w-1 h-1 rounded-full bg-slate-600" />
              )}
              <div className="flex-1 min-w-0">
                <p className={`text-sm leading-relaxed ${entry.isQuestion ? 'text-blue-100 font-medium' : 'text-slate-300'}`}>
                  {entry.text}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-slate-600">{formatTime(entry.timestamp)}</span>
                  {entry.isQuestion && entry.questionType && (
                    <span className="badge bg-blue-500/10 text-blue-400 border border-blue-500/20">{entry.questionType}</span>
                  )}
                  {entry.isQuestion && (
                    <span className="text-xs text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity">
                      View coaching →
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}

        {isAnalyzing && (
          <div className="flex items-center gap-2 px-1 py-1">
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

      {/* Footer: manual input + clear */}
      <div className="border-t border-slate-700/50 p-3 space-y-1.5">
        <div className="flex gap-2">
          <input
            className="input flex-1 text-sm py-2"
            placeholder="Missed a question? Type it here..."
            value={manualInput}
            onChange={(e) => setManualInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleManualSubmit()}
          />
          <button
            onClick={handleManualSubmit}
            disabled={!manualInput.trim()}
            className="btn-primary text-sm py-2 px-3 flex-shrink-0"
          >
            Analyze
          </button>
        </div>
        {entries.length > 0 && (
          <div className="flex items-center justify-between">
            <button
              onClick={() => setShowModal(true)}
              className="text-xs text-slate-600 hover:text-slate-400 py-0.5 transition-colors flex items-center gap-1"
            >
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              View transcript
            </button>
            <button onClick={onClear} className="text-xs text-slate-600 hover:text-slate-400 py-0.5 transition-colors">
              Clear session
            </button>
          </div>
        )}
      </div>

      {/* ── Transcript modal ── */}
      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-6"
          style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
          onClick={(e) => e.target === e.currentTarget && setShowModal(false)}
        >
          <div className="bg-[#0d1424] border border-slate-700/60 rounded-2xl flex flex-col w-full max-w-lg max-h-[75vh] shadow-2xl">
            {/* Modal header */}
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-800/70 flex-shrink-0">
              <span className="text-sm font-semibold text-slate-200">Full Transcript</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopyTranscript}
                  className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors border border-slate-700/60"
                >
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  {transcriptCopied ? 'Copied!' : 'Copy'}
                </button>
                <button
                  onClick={() => setShowModal(false)}
                  className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-500 hover:text-slate-300 hover:bg-slate-800 transition-colors text-sm"
                >
                  ✕
                </button>
              </div>
            </div>
            {/* Modal body */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
              {entries.map((entry) => (
                <div key={entry.id} className="space-y-0.5">
                  <p className="text-[10px] text-slate-600 font-mono">{formatTime(entry.timestamp)}</p>
                  <p className="text-sm text-slate-300 leading-relaxed">{entry.text}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
