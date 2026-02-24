import { useState } from 'react'
import { AnalyzedQuestion, JobContext, PrepQuestionsState } from '../types'

interface Props {
  questions: AnalyzedQuestion[]
  selectedId: string | null
  onSelectQuestion: (id: string) => void
  jobContext: JobContext
  onManualQuestion: (question: string) => void
  prepState: PrepQuestionsState
  onPracticeQuestion: (question: string) => void
}

export default function ResponsePanel({
  questions,
  selectedId,
  onSelectQuestion,
  jobContext,
  prepState,
  onPracticeQuestion
}: Props) {
  const [copied, setCopied] = useState(false)
  const [prepOpen, setPrepOpen] = useState(false)

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const selected = questions.find((q) => q.id === selectedId) ?? null

  // ── Empty state ───────────────────────────────────────────────────────────
  if (questions.length === 0) {
    return (
      <div className="flex flex-col h-full">
        <PanelHeader jobContext={jobContext} />
        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-xl mx-auto">
            <div className="flex flex-col items-center text-center mb-8 pt-4">
              <div className="w-14 h-14 rounded-2xl bg-slate-800 flex items-center justify-center mb-3">
                <svg className="w-7 h-7 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                </svg>
              </div>
              <h3 className="text-base font-semibold text-slate-300 mb-1">Ready to coach</h3>
              <p className="text-sm text-slate-500 leading-relaxed max-w-xs">
                Questions detected in the transcript get coached here. Missed one? Type it in the left panel.
              </p>
            </div>

            <PrepQuestionsSection
              prepState={prepState}
              onPractice={onPracticeQuestion}
            />
          </div>
        </div>
      </div>
    )
  }

  // ── Active state ──────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full">
      <PanelHeader jobContext={jobContext} />

      {/* Question tab bar — stable width, never shifts layout */}
      <div className="flex items-center gap-1 px-4 py-2 border-b border-slate-700/50 bg-surface-1 overflow-x-auto flex-shrink-0">
        {questions.map((q, i) => (
          <button
            key={q.id}
            onClick={() => onSelectQuestion(q.id)}
            className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              q.id === selectedId
                ? 'bg-blue-600 text-white'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
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
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                prepOpen ? 'bg-violet-600/20 text-violet-300' : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800'
              }`}
            >
              Prep
              {prepState.status === 'loading' ? (
                <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse" />
              ) : (
                <span className="text-slate-500">({prepState.questions.length})</span>
              )}
            </button>
            {prepOpen && prepState.status === 'ready' && (
              <div className="absolute right-0 top-full mt-1 w-80 bg-slate-800 border border-slate-700 rounded-xl shadow-xl z-10 p-2 space-y-1">
                {prepState.questions.map((pq) => (
                  <button
                    key={pq.id}
                    onClick={() => { onPracticeQuestion(pq.question); setPrepOpen(false) }}
                    className="w-full text-left p-2.5 rounded-lg hover:bg-slate-700 transition-colors"
                  >
                    <p className="text-xs text-slate-300 leading-relaxed mb-1">{pq.question}</p>
                    <span className="badge bg-violet-500/10 text-violet-400 border border-violet-500/20 text-xs">
                      {pq.competency}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Current question text */}
      {selected && (
        <div className="px-6 py-3 border-b border-slate-700/30 bg-slate-900/40 flex-shrink-0">
          <p className="text-sm text-slate-300 leading-snug">
            <span className="text-slate-500 mr-2">Q</span>
            {selected.question}
          </p>
        </div>
      )}

      {/* Main coaching area — teleprompter */}
      <div className="flex-1 overflow-y-auto">
        {selected ? (
          <TeleprompterCoaching question={selected} onCopy={handleCopy} copied={copied} />
        ) : (
          <div className="flex items-center justify-center h-full text-slate-500 text-sm">
            Select a question above
          </div>
        )}
      </div>
    </div>
  )
}

// ── Shared panel header ──────────────────────────────────────────────────────
function PanelHeader({ jobContext }: { jobContext: JobContext }) {
  return (
    <div className="px-4 py-3 border-b border-slate-700/50 bg-surface-1 flex-shrink-0">
      <h2 className="text-xs font-bold uppercase tracking-widest text-slate-500">Response Coach</h2>
      <p className="text-xs text-slate-500 mt-0.5 truncate">
        {jobContext.title} · {jobContext.company}
      </p>
    </div>
  )
}

// ── Teleprompter coaching view ───────────────────────────────────────────────
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
      <div className="p-8">
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-sm text-red-400">
          <p className="font-medium mb-1">Could not generate coaching</p>
          <p className="text-red-400/80 text-xs">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8 space-y-8 animate-slide-in">
      {/* Competency + confidence */}
      <div className="flex items-center gap-2 flex-wrap">
        {analysis ? (
          <>
            <span className="badge bg-blue-500/15 text-blue-300 border border-blue-500/20 px-3 py-1">
              {analysis.competency}
            </span>
            <ConfidenceBadge confidence={analysis.confidence} />
          </>
        ) : (
          <span className="badge bg-slate-800 text-slate-600 px-3 py-1 animate-pulse">
            Identifying competency...
          </span>
        )}
      </div>

      {/* ── TALK TRACK — the main event ── */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xs font-bold uppercase tracking-widest text-slate-500">Talk Track</h2>
          {analysis && (
            <button
              onClick={() => onCopy(analysis.suggestedResponse)}
              className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-200 transition-colors"
            >
              {copied ? (
                <span className="text-emerald-400">Copied!</span>
              ) : (
                <>
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  Copy
                </>
              )}
            </button>
          )}
        </div>

        {/* Response text area — fixed layout, content swaps in place */}
        <div className="min-h-[120px]">
          {isInitialLoad && (
            <div className="flex items-center gap-3 py-2">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="w-2.5 h-2.5 bg-blue-500 rounded-full animate-bounce"
                  style={{ animationDelay: `${i * 0.2}s` }}
                />
              ))}
              <span className="text-sm text-slate-400">Crafting your talk track...</span>
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

      {/* Key Points — visible once streaming is done */}
      {analysis?.keyPoints && !isStreaming && (
        <div>
          <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-3">
            Key Points to Hit
          </h3>
          <ul className="space-y-2.5">
            {analysis.keyPoints.map((point, i) => (
              <li key={i} className="flex items-start gap-3">
                <span className="flex-shrink-0 w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 text-xs flex items-center justify-center font-bold mt-0.5">
                  {i + 1}
                </span>
                <p className="text-sm text-slate-300 leading-relaxed">{point}</p>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Tools + Metrics — visible once streaming is done */}
      {analysis && !isStreaming && (analysis.toolsToMention.length > 0 || analysis.metricsToMention.length > 0) && (
        <div className="flex gap-8 flex-wrap pb-6">
          {analysis.toolsToMention.length > 0 && (
            <div>
              <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">Tools</h3>
              <div className="flex flex-wrap gap-1.5">
                {analysis.toolsToMention.map((tool) => (
                  <span key={tool} className="badge bg-purple-500/10 text-purple-300 border border-purple-500/20 px-2 py-1">
                    {tool}
                  </span>
                ))}
              </div>
            </div>
          )}
          {analysis.metricsToMention.length > 0 && (
            <div>
              <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">Metrics</h3>
              <div className="flex flex-wrap gap-1.5">
                {analysis.metricsToMention.map((metric) => (
                  <span key={metric} className="badge bg-amber-500/10 text-amber-300 border border-amber-500/20 px-2 py-1">
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

// ── Prep questions ───────────────────────────────────────────────────────────
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
        <div className="flex items-center gap-2 mb-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="w-1.5 h-1.5 bg-violet-500 rounded-full animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
          ))}
          <span className="text-xs text-violet-400">Predicting likely questions for this role…</span>
        </div>
        <div className="space-y-2">
          {[85, 65, 78, 55, 90, 70].map((w, i) => (
            <div key={i} className="h-12 bg-slate-800 rounded-xl animate-pulse" style={{ width: `${w}%` }} />
          ))}
        </div>
      </div>
    )
  }

  if (prepState.status === 'error') return null

  if (prepState.questions.length === 0) return null

  return (
    <div>
      <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-3">
        Predicted Questions ({prepState.questions.length})
      </h3>
      <div className="space-y-2">
        {prepState.questions.map((pq) => (
          <div
            key={pq.id}
            className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/50 hover:border-violet-500/30 transition-colors"
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
                className="flex-shrink-0 btn-secondary text-xs py-1 px-3"
              >
                Practice
              </button>
            </div>
            <p className="text-xs text-slate-500 mt-2 italic leading-relaxed">{pq.rationale}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Helpers ──────────────────────────────────────────────────────────────────
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
    <span className={`badge border px-2 py-1 ${styles[confidence]}`}>
      {confidence} confidence
    </span>
  )
}
