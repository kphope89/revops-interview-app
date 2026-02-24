import { useState } from 'react'
import { AnalyzedQuestion, JobContext, PrepQuestionsState, QuestionAnalysis } from '../types'

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
  onManualQuestion,
  prepState,
  onPracticeQuestion
}: Props) {
  const [copied, setCopied] = useState(false)
  const [prepCollapsed, setPrepCollapsed] = useState(false)

  const selected = questions.find((q) => q.id === selectedId)

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (questions.length === 0) {
    return (
      <div className="flex flex-col h-full">
        <div className="p-4 border-b border-slate-700/50 bg-surface-1">
          <h2 className="text-sm font-semibold text-slate-300">Response Coach</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Coaching for <span className="text-slate-400">{jobContext.title}</span> at{' '}
            <span className="text-slate-400">{jobContext.company}</span>
          </p>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-lg mx-auto">
            <div className="flex flex-col items-center text-center mb-8">
              <div className="w-14 h-14 rounded-2xl bg-slate-800 flex items-center justify-center mb-3">
                <svg className="w-7 h-7 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                </svg>
              </div>
              <h3 className="text-base font-semibold text-slate-300 mb-1">Waiting for questions</h3>
              <p className="text-sm text-slate-500 leading-relaxed">
                Questions detected from the transcript get coached here automatically.
                Missed one? Type it in the panel on the left.
              </p>
            </div>

            <PrepQuestionsSection
              prepState={prepState}
              collapsed={prepCollapsed}
              onToggleCollapse={() => setPrepCollapsed(!prepCollapsed)}
              onPractice={onPracticeQuestion}
            />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full">
      {/* Question list sidebar — visible as soon as any question exists */}
      {questions.length >= 1 && (
        <div className="w-64 border-r border-slate-700/50 flex flex-col">
          {/* Prep questions accordion */}
          {(prepState.status === 'loading' || prepState.status === 'ready') && (
            <div className="border-b border-slate-700/50">
              <button
                onClick={() => setPrepCollapsed(!prepCollapsed)}
                className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold text-slate-400 uppercase tracking-wide hover:text-slate-300 transition-colors"
              >
                <span>
                  {prepState.status === 'loading'
                    ? 'Prep (generating…)'
                    : `Prep (${prepState.questions.length})`}
                </span>
                {prepState.status === 'loading' ? (
                  <div className="flex gap-0.5">
                    {[0, 1, 2].map((i) => (
                      <div
                        key={i}
                        className="w-1 h-1 bg-violet-400 rounded-full animate-bounce"
                        style={{ animationDelay: `${i * 0.15}s` }}
                      />
                    ))}
                  </div>
                ) : (
                  <svg
                    className={`w-3 h-3 transition-transform ${prepCollapsed ? '' : 'rotate-180'}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                )}
              </button>
              {prepState.status === 'ready' && !prepCollapsed && (
                <div className="p-2 space-y-1">
                  {prepState.questions.map((pq) => (
                    <button
                      key={pq.id}
                      onClick={() => onPracticeQuestion(pq.question)}
                      className="w-full text-left p-2.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-300 text-xs transition-colors"
                    >
                      <p className="line-clamp-2 leading-relaxed mb-1">{pq.question}</p>
                      <span className="badge bg-violet-500/10 text-violet-300 border border-violet-500/20 text-xs">
                        {pq.competency}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="p-3 border-b border-slate-700/50 bg-surface-1">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
              Questions ({questions.length})
            </p>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {questions.map((q) => (
              <button
                key={q.id}
                onClick={() => onSelectQuestion(q.id)}
                className={`w-full text-left p-2.5 rounded-lg transition-colors text-xs ${
                  q.id === selectedId
                    ? 'bg-blue-600/20 border border-blue-500/30 text-blue-200'
                    : 'hover:bg-slate-800 text-slate-400 hover:text-slate-300'
                }`}
              >
                <p className="line-clamp-2 leading-relaxed">{q.question}</p>
                {q.isLoading && (
                  <p className="text-blue-400 mt-1">Analyzing...</p>
                )}
                {q.analysis && !q.isLoading && (
                  <p className="text-slate-500 mt-1 truncate">{q.analysis.competency}</p>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Main response area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-slate-700/50 bg-surface-1">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <h2 className="text-sm font-semibold text-slate-300 mb-0.5">Response Coach</h2>
              {selected && (
                <p className="text-sm text-slate-200 font-medium leading-snug line-clamp-2">
                  "{selected.question}"
                </p>
              )}
            </div>
            {selected?.analysis && (
              <div className="flex items-center gap-2 flex-shrink-0">
                <ConfidenceBadge confidence={selected.analysis.confidence} />
              </div>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {selected ? (
            <QuestionCoaching question={selected} onCopy={handleCopy} copied={copied} />
          ) : (
            <div className="flex items-center justify-center h-full text-slate-500 text-sm">
              Select a question to see coaching
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// Extracts the partial suggestedResponse value from a streaming JSON string.
// Returns empty string until the field starts appearing.
function extractStreamingResponse(accumulatedText: string): string {
  const marker = '"suggestedResponse": "'
  const idx = accumulatedText.indexOf(marker)
  if (idx === -1) return ''
  const raw = accumulatedText.slice(idx + marker.length)
  // If the field is complete (closing quote followed by comma + next key), trim it
  const completeMatch = raw.match(/^([\s\S]*?)",?\s*"toolsToMention"/)
  const content = completeMatch ? completeMatch[1] : raw
  // Unescape JSON string sequences for readable display
  return content
    .replace(/\\n/g, '\n')
    .replace(/\\t/g, '\t')
    .replace(/\\"/g, '"')
    .replace(/\\\\/g, '\\')
}

function StreamingPreview({ text }: { text: string }) {
  const preview = extractStreamingResponse(text)
  return (
    <div className="p-5 space-y-4">
      <div className="flex items-center gap-2">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce"
            style={{ animationDelay: `${i * 0.15}s` }}
          />
        ))}
        <span className="text-xs text-blue-400">Crafting response...</span>
      </div>
      {preview && (
        <div>
          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2.5">
            Suggested Response
          </h3>
          <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
            <p className="text-sm text-slate-200 leading-relaxed whitespace-pre-wrap">
              {preview}
              <span className="inline-block w-0.5 h-4 bg-blue-400 ml-0.5 animate-pulse align-middle" />
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

function QuestionCoaching({
  question,
  onCopy,
  copied
}: {
  question: AnalyzedQuestion
  onCopy: (text: string) => void
  copied: boolean
}) {
  if (question.isLoading && question.streamingText) {
    return <StreamingPreview text={question.streamingText} />
  }

  if (question.isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4">
        <div className="flex gap-1.5">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="w-2.5 h-2.5 bg-blue-500 rounded-full animate-bounce"
              style={{ animationDelay: `${i * 0.2}s` }}
            />
          ))}
        </div>
        <p className="text-sm text-slate-400">Crafting your coaching response...</p>
      </div>
    )
  }

  if (question.error) {
    return (
      <div className="p-6">
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-sm text-red-400">
          <p className="font-medium mb-1">Could not generate coaching</p>
          <p className="text-red-400/80">{question.error}</p>
        </div>
      </div>
    )
  }

  const { analysis } = question
  if (!analysis) return null

  return (
    <div className="p-5 space-y-5 animate-slide-in">
      {/* Competency banner */}
      <div className="flex items-center gap-2.5 px-3 py-2 bg-blue-600/10 border border-blue-500/20 rounded-lg">
        <div className="w-2 h-2 bg-blue-400 rounded-full flex-shrink-0" />
        <div>
          <p className="text-xs text-slate-400 leading-none mb-0.5">Competency being tested</p>
          <p className="text-sm font-semibold text-blue-200">{analysis.competency}</p>
        </div>
      </div>

      {/* Suggested response — first since it's the most immediately useful */}
      <div>
        <div className="flex items-center justify-between mb-2.5">
          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
            Suggested Response
          </h3>
          <button
            onClick={() => onCopy(analysis.suggestedResponse)}
            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 transition-colors"
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
        </div>
        <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
          <p className="text-sm text-slate-200 leading-relaxed whitespace-pre-wrap">
            {analysis.suggestedResponse}
          </p>
        </div>
      </div>

      {/* Key talking points */}
      <div>
        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2.5">
          Key Points to Hit
        </h3>
        <ul className="space-y-2">
          {analysis.keyPoints.map((point, i) => (
            <li key={i} className="flex items-start gap-2.5">
              <span className="flex-shrink-0 w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 text-xs flex items-center justify-center font-bold mt-0.5">
                {i + 1}
              </span>
              <p className="text-sm text-slate-300 leading-relaxed">{point}</p>
            </li>
          ))}
        </ul>
      </div>

      {/* Tools + Metrics row */}
      <div className="grid grid-cols-2 gap-4">
        {analysis.toolsToMention.length > 0 && (
          <div>
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">
              Tools to Mention
            </h3>
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
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">
              Metrics to Reference
            </h3>
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

      <div className="pb-4" />
    </div>
  )
}

function PrepQuestionsSection({
  prepState,
  collapsed,
  onToggleCollapse,
  onPractice
}: {
  prepState: PrepQuestionsState
  collapsed: boolean
  onToggleCollapse: () => void
  onPractice: (question: string) => void
}) {
  if (prepState.status === 'idle') return null

  if (prepState.status === 'loading') {
    return (
      <div className="w-full max-w-md mt-6">
        <div className="flex items-center gap-2 mb-3">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="w-1.5 h-1.5 bg-violet-500 rounded-full animate-bounce"
              style={{ animationDelay: `${i * 0.15}s` }}
            />
          ))}
          <span className="text-xs text-violet-400">Predicting likely questions for this role…</span>
        </div>
        <div className="space-y-2">
          {[85, 65, 78, 55, 90, 70].map((w, i) => (
            <div
              key={i}
              className="h-10 bg-slate-800 rounded-lg animate-pulse"
              style={{ width: `${w}%` }}
            />
          ))}
        </div>
      </div>
    )
  }

  if (prepState.status === 'error') {
    return (
      <div className="w-full max-w-md mt-6">
        <p className="text-xs text-slate-500 mb-1">Could not generate predicted questions.</p>
        <p className="text-xs text-red-400/70">{prepState.error}</p>
      </div>
    )
  }

  if (prepState.questions.length === 0) return null

  return (
    <div className="w-full max-w-md mt-6">
      <button
        onClick={onToggleCollapse}
        className="flex items-center justify-between w-full mb-3"
      >
        <p className="text-xs font-semibold text-slate-300 uppercase tracking-wide">
          Predicted Questions ({prepState.questions.length})
        </p>
        <svg
          className={`w-3.5 h-3.5 text-slate-400 transition-transform ${collapsed ? '' : 'rotate-180'}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {!collapsed && (
        <div className="space-y-2">
          {prepState.questions.map((pq) => (
            <div
              key={pq.id}
              className="p-3 rounded-lg bg-slate-800 border border-slate-700 hover:border-violet-500/30 transition-colors"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-slate-300 leading-relaxed mb-1.5">{pq.question}</p>
                  <span className="badge bg-violet-500/10 text-violet-300 border border-violet-500/20">
                    {pq.competency}
                  </span>
                </div>
                <button
                  onClick={() => onPractice(pq.question)}
                  className="flex-shrink-0 btn-secondary text-xs py-1 px-2.5"
                >
                  Practice
                </button>
              </div>
              <p className="text-xs text-slate-500 mt-2 italic leading-relaxed">{pq.rationale}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function ConfidenceBadge({ confidence }: { confidence: 'high' | 'medium' | 'low' }) {
  const styles = {
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
