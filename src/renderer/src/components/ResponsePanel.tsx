import { useState, useEffect, useRef } from 'react'
import { AnalyzedQuestion, JobContext, PrepQuestionsState } from '../types'

interface Props {
  questions: AnalyzedQuestion[]
  selectedId: string | null
  onSelectQuestion: (id: string) => void
  jobContext: JobContext
  onManualQuestion: (question: string) => void
  prepState: PrepQuestionsState
  onPracticeQuestion: (question: string) => void
  teleprompterOpen: boolean
  onTeleprompterToggle: () => void
  selectedQuestion: AnalyzedQuestion | null
}

export default function ResponsePanel({
  questions,
  selectedId,
  onSelectQuestion,
  jobContext,
  prepState,
  onPracticeQuestion,
  teleprompterOpen,
  onTeleprompterToggle,
  selectedQuestion
}: Props) {
  const [copied, setCopied] = useState(false)
  const [prepOpen, setPrepOpen] = useState(false)

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const selected = questions.find((q) => q.id === selectedId) ?? null

  // ── Teleprompter overlay (full-screen) ────────────────────────────────────
  const teleprompterContent = selectedQuestion ?? selected
  const hasResponse = teleprompterContent?.analysis?.suggestedResponse ||
    (teleprompterContent?.isLoading && teleprompterContent?.streamingText)

  return (
    <>
      {/* ── Teleprompter Overlay ── */}
      {teleprompterOpen && (
        <TeleprompterOverlay
          question={teleprompterContent}
          onClose={onTeleprompterToggle}
          onCopy={handleCopy}
          copied={copied}
        />
      )}

      {/* ── Main panel ── */}
      <div className="flex flex-col h-full">
        {/* Panel header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-800/70 flex-shrink-0"
          style={{ background: 'linear-gradient(180deg, #0a0f1e 0%, #080d1a 100%)' }}>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-widest text-slate-600">Response Coach</p>
            <p className="text-xs text-slate-500 mt-0.5 truncate">
              {jobContext.title} · {jobContext.company}
            </p>
          </div>

          {/* Teleprompter toggle button */}
          <button
            onClick={onTeleprompterToggle}
            disabled={!hasResponse}
            title={teleprompterOpen ? 'Close teleprompter' : 'Open teleprompter mode'}
            className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl border transition-all duration-150 ${
              teleprompterOpen
                ? 'bg-blue-600 text-white border-blue-500'
                : hasResponse
                ? 'bg-slate-800/80 text-slate-300 border-slate-700/60 hover:bg-blue-600/20 hover:text-blue-300 hover:border-blue-500/40'
                : 'bg-slate-900/40 text-slate-700 border-slate-800/40 cursor-not-allowed'
            }`}
          >
            {/* Monitor/teleprompter icon */}
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            Teleprompter
          </button>
        </div>

        {/* Empty state */}
        {questions.length === 0 ? (
          <div className="flex-1 overflow-y-auto p-6">
            <div className="max-w-2xl mx-auto">
              <EmptyHint />
              <PrepQuestionsSection prepState={prepState} onPractice={onPracticeQuestion} />
            </div>
          </div>
        ) : (
          <>
            {/* Question tab bar */}
            <div className="flex items-center gap-1 px-4 py-2 border-b border-slate-800/60 overflow-x-auto flex-shrink-0 bg-[#080d1a]">
              {questions.map((q, i) => (
                <button
                  key={q.id}
                  onClick={() => onSelectQuestion(q.id)}
                  className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all duration-150 ${
                    q.id === selectedId
                      ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/20'
                      : 'text-slate-500 hover:text-slate-200 hover:bg-slate-800/60'
                  }`}
                >
                  {q.isLoading ? (
                    <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
                  ) : (
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  )}
                  Q{i + 1}
                </button>
              ))}

              {/* Prep questions dropdown */}
              {(prepState.status === 'ready' || prepState.status === 'loading') && (
                <div className="relative ml-auto flex-shrink-0">
                  <button
                    onClick={() => setPrepOpen(!prepOpen)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all duration-150 ${
                      prepOpen
                        ? 'bg-violet-600/20 text-violet-300 border border-violet-500/30'
                        : 'text-slate-600 hover:text-slate-300 hover:bg-slate-800/60'
                    }`}
                  >
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                    </svg>
                    Prep
                    {prepState.status === 'loading' ? (
                      <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse" />
                    ) : (
                      <span className="text-slate-600">({prepState.questions.length})</span>
                    )}
                  </button>
                  {prepOpen && prepState.status === 'ready' && (
                    <div className="absolute right-0 top-full mt-2 w-80 bg-[#0d1424] border border-slate-800 rounded-2xl shadow-2xl shadow-black/60 z-10 p-2 space-y-1 animate-fade-in">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-600 px-2 py-1">Predicted Questions</p>
                      {prepState.questions.map((pq) => (
                        <button
                          key={pq.id}
                          onClick={() => { onPracticeQuestion(pq.question); setPrepOpen(false) }}
                          className="w-full text-left p-3 rounded-xl hover:bg-slate-800/60 transition-colors group"
                        >
                          <p className="text-xs text-slate-300 leading-relaxed mb-1.5">{pq.question}</p>
                          <span className="badge bg-violet-500/10 text-violet-400 border border-violet-500/20">
                            {pq.competency}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Current question */}
            {selected && (
              <div className="px-5 py-3 border-b border-slate-800/40 bg-slate-900/30 flex-shrink-0">
                <div className="flex items-start gap-2.5">
                  <span className="flex-shrink-0 w-5 h-5 rounded-lg bg-blue-600/20 flex items-center justify-center mt-0.5">
                    <span className="text-[9px] font-bold text-blue-400">Q</span>
                  </span>
                  <p className="text-sm text-slate-300 leading-snug">{selected.question}</p>
                </div>
              </div>
            )}

            {/* Coaching area */}
            <div className="flex-1 overflow-y-auto">
              {selected ? (
                <TeleprompterCoaching question={selected} onCopy={handleCopy} copied={copied} />
              ) : (
                <div className="flex items-center justify-center h-full">
                  <p className="text-slate-600 text-sm">Select a question above</p>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </>
  )
}

// ── Teleprompter Overlay (full-screen popup) ──────────────────────────────────
function TeleprompterOverlay({
  question,
  onClose,
  onCopy,
  copied
}: {
  question: AnalyzedQuestion | null
  onClose: () => void
  onCopy: (text: string) => void
  copied: boolean
}) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [autoScroll, setAutoScroll] = useState(false)
  const scrollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Keyboard: Esc to close
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  // Auto-scroll
  useEffect(() => {
    if (autoScroll && scrollRef.current) {
      scrollIntervalRef.current = setInterval(() => {
        if (scrollRef.current) {
          scrollRef.current.scrollTop += 1
        }
      }, 40)
    } else {
      if (scrollIntervalRef.current) clearInterval(scrollIntervalRef.current)
    }
    return () => {
      if (scrollIntervalRef.current) clearInterval(scrollIntervalRef.current)
    }
  }, [autoScroll])

  const { analysis, isLoading, streamingText, error } = question ?? {}
  const isStreaming = isLoading && !!streamingText
  const liveResponse = isStreaming ? extractStreamingResponse(streamingText ?? '') : null
  const responseText = analysis?.suggestedResponse ?? liveResponse ?? ''

  return (
    <div className="teleprompter-overlay animate-fade-in">
      {/* ── Top bar ── */}
      <div className="flex items-center justify-between px-8 py-4 border-b border-white/5 flex-shrink-0">
        <div className="flex items-center gap-3">
          {/* Logo */}
          <div className="w-7 h-7 rounded-lg flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #3b82f6 0%, #6366f1 100%)' }}>
            <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
              <path d="M3 8.5L6.5 12L13 4" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-slate-500">Teleprompter</p>
            {analysis && (
              <p className="text-[10px] text-slate-600 leading-tight">{analysis.competency}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Auto-scroll toggle */}
          <button
            onClick={() => setAutoScroll((v) => !v)}
            className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-xl border transition-all duration-150 ${
              autoScroll
                ? 'bg-blue-600/20 text-blue-300 border-blue-500/40'
                : 'bg-slate-800/60 text-slate-500 border-slate-700/40 hover:text-slate-300'
            }`}
          >
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
            </svg>
            {autoScroll ? 'Scrolling…' : 'Auto-scroll'}
          </button>

          {/* Copy button */}
          {analysis?.suggestedResponse && (
            <button
              onClick={() => onCopy(analysis.suggestedResponse)}
              className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-xl bg-slate-800/60 text-slate-400 border border-slate-700/40 hover:text-slate-200 hover:bg-slate-700/60 transition-all duration-150"
            >
              {copied ? (
                <>
                  <svg className="w-3 h-3 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/>
                  </svg>
                  <span className="text-emerald-400">Copied</span>
                </>
              ) : (
                <>
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/>
                  </svg>
                  Copy
                </>
              )}
            </button>
          )}

          {/* Close button */}
          <button
            onClick={onClose}
            className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-slate-100 bg-slate-800/60 hover:bg-slate-700/60 border border-slate-700/40 hover:border-slate-600 px-3 py-1.5 rounded-xl transition-all duration-150"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/>
            </svg>
            Close (Esc)
          </button>
        </div>
      </div>

      {/* ── Question header ── */}
      {question?.question && (
        <div className="px-16 pt-8 pb-4 flex-shrink-0">
          <div className="flex items-start gap-3 max-w-4xl mx-auto">
            <span className="flex-shrink-0 w-6 h-6 rounded-lg bg-blue-600/20 border border-blue-500/20 flex items-center justify-center mt-0.5">
              <span className="text-[9px] font-bold text-blue-400">Q</span>
            </span>
            <p className="text-slate-400 text-base leading-relaxed">{question.question}</p>
          </div>
          <div className="max-w-4xl mx-auto mt-4 h-px bg-gradient-to-r from-transparent via-slate-800 to-transparent" />
        </div>
      )}

      {/* ── Teleprompter text area ── */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-16 py-8"
      >
        <div className="max-w-4xl mx-auto">
          {/* Loading state */}
          {isLoading && !streamingText && (
            <div className="flex items-center gap-4 py-8">
              {[0, 1, 2].map((i) => (
                <div key={i} className="w-3 h-3 bg-blue-500 rounded-full animate-bounce"
                  style={{ animationDelay: `${i * 0.2}s` }} />
              ))}
              <span className="text-slate-500 text-lg">Crafting your talk track…</span>
            </div>
          )}

          {/* Error state */}
          {error && (
            <div className="p-6 bg-red-500/10 border border-red-500/20 rounded-2xl">
              <p className="text-red-400 font-medium mb-1">Could not generate coaching</p>
              <p className="text-red-400/70 text-sm">{error}</p>
            </div>
          )}

          {/* The talk track — large teleprompter text */}
          {responseText && (
            <p
              className="text-slate-100 whitespace-pre-wrap font-normal"
              style={{
                fontSize: '28px',
                lineHeight: '1.9',
                letterSpacing: '0.01em',
                textShadow: '0 0 40px rgba(148,163,184,0.05)'
              }}
            >
              {responseText}
              {isStreaming && (
                <span className="inline-block w-0.5 h-8 bg-blue-400 ml-1 animate-pulse align-middle" />
              )}
            </p>
          )}

          {/* Key points (shown after streaming completes) */}
          {analysis?.keyPoints && !isStreaming && (
            <div className="mt-12 pt-8 border-t border-slate-800/60">
              <p className="text-xs font-bold uppercase tracking-widest text-slate-600 mb-6">Key Points to Hit</p>
              <ul className="space-y-4">
                {analysis.keyPoints.map((point, i) => (
                  <li key={i} className="flex items-start gap-4">
                    <span className="flex-shrink-0 w-7 h-7 rounded-full bg-emerald-500/15 border border-emerald-500/20 text-emerald-400 text-sm flex items-center justify-center font-bold mt-0.5">
                      {i + 1}
                    </span>
                    <p className="text-slate-300 text-lg leading-relaxed">{point}</p>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Tools + Metrics */}
          {analysis && !isStreaming && (analysis.toolsToMention.length > 0 || analysis.metricsToMention.length > 0) && (
            <div className="mt-10 flex gap-10 flex-wrap pb-16">
              {analysis.toolsToMention.length > 0 && (
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-slate-600 mb-3">Mention These Tools</p>
                  <div className="flex flex-wrap gap-2">
                    {analysis.toolsToMention.map((tool) => (
                      <span key={tool} className="badge bg-purple-500/10 text-purple-300 border border-purple-500/20 px-3 py-1.5 text-sm">
                        {tool}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {analysis.metricsToMention.length > 0 && (
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-slate-600 mb-3">Mention These Metrics</p>
                  <div className="flex flex-wrap gap-2">
                    {analysis.metricsToMention.map((metric) => (
                      <span key={metric} className="badge bg-amber-500/10 text-amber-300 border border-amber-500/20 px-3 py-1.5 text-sm">
                        {metric}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Bottom gradient fade ── */}
      <div className="h-20 flex-shrink-0 pointer-events-none"
        style={{ background: 'linear-gradient(to top, rgba(5,8,18,1) 0%, transparent 100%)' }} />
    </div>
  )
}

// ── Inline coaching view (in-panel, compact) ──────────────────────────────────
function TeleprompterCoaching({
  question,
  onCopy,
  copied
}: {
  question: AnalyzedQuestion
  onCopy: (text: string) => void
  copied: boolean
}) {
  const { analysis, isLoading, streamingText, error } = question
  const isStreaming = isLoading && !!streamingText
  const isInitialLoad = isLoading && !streamingText

  const liveResponse = isStreaming ? extractStreamingResponse(streamingText ?? '') : null
  const responseText = analysis?.suggestedResponse ?? liveResponse

  if (error) {
    return (
      <div className="p-6">
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl">
          <p className="text-sm text-red-400 font-semibold mb-1">Could not generate coaching</p>
          <p className="text-xs text-red-400/70">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6 animate-slide-in">
      {/* Competency + confidence badges */}
      <div className="flex items-center gap-2 flex-wrap">
        {analysis ? (
          <>
            <span className="badge bg-blue-500/12 text-blue-300 border border-blue-500/20 px-3 py-1">
              {analysis.competency}
            </span>
            <ConfidenceBadge confidence={analysis.confidence} />
          </>
        ) : (
          <span className="badge bg-slate-800/80 text-slate-600 px-3 py-1 animate-pulse">
            Identifying competency…
          </span>
        )}
      </div>

      {/* ── TALK TRACK ── */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <p className="text-[11px] font-bold uppercase tracking-widest text-slate-600">Talk Track</p>
          {analysis && (
            <button
              onClick={() => onCopy(analysis.suggestedResponse)}
              className="flex items-center gap-1.5 text-xs text-slate-600 hover:text-slate-200 transition-colors"
            >
              {copied ? (
                <span className="text-emerald-400 flex items-center gap-1">
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/>
                  </svg>
                  Copied
                </span>
              ) : (
                <>
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/>
                  </svg>
                  Copy
                </>
              )}
            </button>
          )}
        </div>

        <div className="min-h-[100px]">
          {isInitialLoad && (
            <div className="flex items-center gap-3 py-3">
              {[0, 1, 2].map((i) => (
                <div key={i} className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"
                  style={{ animationDelay: `${i * 0.2}s` }} />
              ))}
              <span className="text-sm text-slate-500">Crafting your talk track…</span>
            </div>
          )}
          {responseText && (
            <p className="text-[17px] text-slate-100 leading-[1.85] font-normal whitespace-pre-wrap tracking-wide">
              {responseText}
              {isStreaming && (
                <span className="inline-block w-0.5 h-5 bg-blue-400 ml-1 animate-pulse align-middle" />
              )}
            </p>
          )}
        </div>
      </div>

      {/* Key points */}
      {analysis?.keyPoints && !isStreaming && (
        <div>
          <p className="text-[11px] font-bold uppercase tracking-widest text-slate-600 mb-3">Key Points</p>
          <ul className="space-y-2.5">
            {analysis.keyPoints.map((point, i) => (
              <li key={i} className="flex items-start gap-3">
                <span className="flex-shrink-0 w-5 h-5 rounded-full bg-emerald-500/15 text-emerald-400 text-xs flex items-center justify-center font-bold mt-0.5 border border-emerald-500/20">
                  {i + 1}
                </span>
                <p className="text-sm text-slate-300 leading-relaxed">{point}</p>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Tools + Metrics */}
      {analysis && !isStreaming && (analysis.toolsToMention.length > 0 || analysis.metricsToMention.length > 0) && (
        <div className="flex gap-8 flex-wrap pb-6">
          {analysis.toolsToMention.length > 0 && (
            <div>
              <p className="text-[11px] font-bold uppercase tracking-widest text-slate-600 mb-2">Tools</p>
              <div className="flex flex-wrap gap-1.5">
                {analysis.toolsToMention.map((tool) => (
                  <span key={tool} className="badge bg-purple-500/10 text-purple-300 border border-purple-500/20 px-2.5 py-1">
                    {tool}
                  </span>
                ))}
              </div>
            </div>
          )}
          {analysis.metricsToMention.length > 0 && (
            <div>
              <p className="text-[11px] font-bold uppercase tracking-widest text-slate-600 mb-2">Metrics</p>
              <div className="flex flex-wrap gap-1.5">
                {analysis.metricsToMention.map((metric) => (
                  <span key={metric} className="badge bg-amber-500/10 text-amber-300 border border-amber-500/20 px-2.5 py-1">
                    {metric}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Empty hint ────────────────────────────────────────────────────────────────
function EmptyHint() {
  return (
    <div className="flex items-center gap-3 mb-6 p-4 bg-slate-900/40 border border-slate-800/60 rounded-2xl">
      <div className="w-8 h-8 rounded-xl bg-blue-600/15 border border-blue-500/20 flex items-center justify-center flex-shrink-0">
        <svg className="w-4 h-4 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
        </svg>
      </div>
      <p className="text-xs text-slate-500 leading-relaxed">
        Questions detected in the transcript appear here. Missed one? Type it in the left panel.
      </p>
    </div>
  )
}

// ── Prep questions section ────────────────────────────────────────────────────
function PrepQuestionsSection({
  prepState,
  onPractice
}: {
  prepState: PrepQuestionsState
  onPractice: (question: string) => void
}) {
  if (prepState.status === 'idle') return null

  if (prepState.status === 'loading') {
    return (
      <div>
        <div className="flex items-center gap-2 mb-4">
          {[0, 1, 2].map((i) => (
            <div key={i} className="w-1.5 h-1.5 bg-violet-500 rounded-full animate-bounce"
              style={{ animationDelay: `${i * 0.15}s` }} />
          ))}
          <span className="text-xs text-violet-400">Predicting likely questions for this role…</span>
        </div>
        <div className="space-y-2">
          {[85, 65, 78, 55, 90, 70].map((w, i) => (
            <div key={i} className="h-9 bg-slate-800/60 rounded-xl animate-pulse" style={{ width: `${w}%` }} />
          ))}
        </div>
      </div>
    )
  }

  if (prepState.status === 'error' || prepState.questions.length === 0) return null

  return (
    <div>
      <p className="text-[11px] font-bold uppercase tracking-widest text-slate-600 mb-3">
        Predicted Questions ({prepState.questions.length})
      </p>
      <div className="space-y-2">
        {prepState.questions.map((pq) => (
          <div
            key={pq.id}
            className="p-4 rounded-2xl bg-slate-900/50 border border-slate-800/60 hover:border-violet-500/25 transition-colors"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm text-slate-300 leading-relaxed mb-2">{pq.question}</p>
                <span className="badge bg-violet-500/10 text-violet-300 border border-violet-500/20">
                  {pq.competency}
                </span>
              </div>
              <button
                onClick={() => onPractice(pq.question)}
                className="flex-shrink-0 flex items-center gap-1 text-xs font-medium text-slate-400 hover:text-slate-100 bg-slate-800/60 hover:bg-slate-700 border border-slate-700/40 px-2.5 py-1 rounded-lg transition-all duration-150"
              >
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z"/>
                </svg>
                Practice
              </button>
            </div>
            {pq.rationale && (
              <p className="text-xs text-slate-600 mt-2 italic leading-relaxed">{pq.rationale}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function extractStreamingResponse(accumulatedText: string): string {
  const marker = '"suggestedResponse": "'
  const idx = accumulatedText.indexOf(marker)
  if (idx === -1) return ''
  const raw = accumulatedText.slice(idx + marker.length)
  const completeMatch = raw.match(/^([\s\S]*?)",?\s*"toolsToMention"/)
  const content = completeMatch ? completeMatch[1] : raw
  return content
    .replace(/\\n/g, '\n')
    .replace(/\\t/g, '\t')
    .replace(/\\"/g, '"')
    .replace(/\\\\/g, '\\')
}

function ConfidenceBadge({ confidence }: { confidence: 'high' | 'medium' | 'low' }) {
  const styles: Record<string, string> = {
    high: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    medium: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    low: 'bg-slate-500/10 text-slate-400 border-slate-500/20'
  }
  return (
    <span className={`badge border px-2.5 py-1 ${styles[confidence]}`}>
      {confidence} confidence
    </span>
  )
}
