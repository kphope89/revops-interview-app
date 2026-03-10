import { useState, useEffect } from 'react'
import { JobContext, KnowledgeItem, PrepKit, PrepKitState } from '../types'

interface Props {
  jobContext: JobContext
  prepKitState: PrepKitState
  onGenerate: (spotlightIds: string[]) => void
  onGoLive: () => void
  onBack: () => void
}

export default function PrepKitScreen({ jobContext, prepKitState, onGenerate, onGoLive, onBack }: Props) {
  const { status, kit, error } = prepKitState
  const [copiedAll, setCopiedAll] = useState(false)
  const [knowledgeItems, setKnowledgeItems] = useState<KnowledgeItem[]>([])
  const [spotlightIds, setSpotlightIds] = useState<string[]>([])

  useEffect(() => {
    window.electronAPI.getKnowledgeItems().then(setKnowledgeItems)
  }, [])

  const handleCopyAll = () => {
    if (!kit) return
    const text = buildCopyText(kit, jobContext)
    navigator.clipboard.writeText(text)
    setCopiedAll(true)
    setTimeout(() => setCopiedAll(false), 2000)
  }

  return (
    <div className="flex h-full">
      {/* ── Left Sidebar ── */}
      <div className="w-[280px] flex flex-col border-r border-slate-800/70 bg-[#080d1a] flex-shrink-0">
        <div className="flex-1 px-5 py-5 space-y-4 overflow-y-auto">
          {/* Label */}
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-600">Prep Kit</p>
            <p className="text-sm font-semibold text-slate-100 mt-1 leading-tight">{jobContext.title}</p>
            <p className="text-xs text-slate-500 mt-0.5">{jobContext.company}</p>
          </div>

          {/* Generate / Regenerate */}
          <button
            onClick={() => onGenerate(spotlightIds)}
            disabled={status === 'loading'}
            className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all duration-150 ${
              status === 'loading'
                ? 'bg-indigo-600/30 text-indigo-400 cursor-wait'
                : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm hover:shadow-indigo-500/20 hover:shadow-md'
            }`}
          >
            {status === 'loading' ? (
              <>
                <span className="w-3.5 h-3.5 border-2 border-indigo-400/40 border-t-indigo-400 rounded-full animate-spin" />
                Generating…
              </>
            ) : (
              <>
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                {status === 'ready' ? 'Regenerate Kit' : 'Generate Prep Kit'}
              </>
            )}
          </button>

          {/* Stories to Feature */}
          {knowledgeItems.length > 0 && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-600">
                  Stories to Feature
                </p>
                {spotlightIds.length > 0 && (
                  <span className="text-[10px] font-bold text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-1.5 py-0.5 rounded-full">
                    {spotlightIds.length}/3
                  </span>
                )}
              </div>
              <p className="text-[10px] text-slate-700 leading-relaxed">
                {spotlightIds.length === 0
                  ? 'Claude picks — or select up to 3 to spotlight'
                  : 'These will be woven into your narrative and talking points'}
              </p>
              <div className="space-y-1 mt-1">
                {knowledgeItems.map((item) => {
                  const selected = spotlightIds.includes(item.id)
                  const atMax = spotlightIds.length >= 3 && !selected
                  return (
                    <button
                      key={item.id}
                      disabled={atMax}
                      onClick={() =>
                        setSpotlightIds((prev) =>
                          selected ? prev.filter((id) => id !== item.id) : [...prev, item.id]
                        )
                      }
                      className={`w-full flex items-start gap-2 px-2.5 py-2 rounded-lg text-left transition-all duration-100 ${
                        selected
                          ? 'bg-indigo-600/15 border border-indigo-500/30'
                          : atMax
                          ? 'opacity-30 cursor-not-allowed bg-transparent border border-transparent'
                          : 'bg-slate-900/40 border border-slate-800/40 hover:border-slate-700/60 hover:bg-slate-800/40'
                      }`}
                    >
                      <span className={`flex-shrink-0 w-3.5 h-3.5 mt-0.5 rounded border flex items-center justify-center ${
                        selected ? 'bg-indigo-500 border-indigo-400' : 'border-slate-700'
                      }`}>
                        {selected && (
                          <svg className="w-2 h-2 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-[11px] font-medium text-slate-300 leading-tight truncate">{item.title}</p>
                        <span className="text-[9px] font-bold uppercase tracking-wider text-slate-600">{item.type}</span>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* Copy All */}
          {status === 'ready' && kit && (
            <button
              onClick={handleCopyAll}
              className="w-full flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-slate-100 bg-slate-800/60 hover:bg-slate-700/60 border border-slate-700/40 hover:border-slate-600 transition-all duration-150"
            >
              {copiedAll ? (
                <>
                  <svg className="w-3.5 h-3.5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-emerald-400">Copied!</span>
                </>
              ) : (
                <>
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  Copy All as Markdown
                </>
              )}
            </button>
          )}

          {/* Section nav — only when ready */}
          {status === 'ready' && kit && (
            <div className="space-y-1 pt-2">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-700 mb-2">Sections</p>
              {[
                { label: 'Your Narrative', href: 'narrative' },
                { label: 'Key Talking Points', href: 'talking-points' },
                { label: 'Questions to Ask', href: 'questions-to-ask' },
                { label: 'Hot Competencies', href: 'hot-competencies' },
                { label: 'Power Phrases', href: 'power-phrases' },
              ].map((s) => (
                <a
                  key={s.href}
                  href={`#${s.href}`}
                  className="block text-xs text-slate-500 hover:text-slate-200 py-1 px-2 rounded-lg hover:bg-slate-800/50 transition-colors"
                >
                  {s.label}
                </a>
              ))}
            </div>
          )}
        </div>

        {/* Bottom actions */}
        <div className="px-5 py-4 border-t border-slate-800/60 space-y-2">
          <button
            onClick={onGoLive}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm hover:shadow-emerald-500/20 hover:shadow-md transition-all duration-150"
          >
            <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
            Go Live
          </button>
          <button
            onClick={onBack}
            className="w-full text-xs text-slate-600 hover:text-slate-400 py-1.5 transition-colors"
          >
            ← Back to setup
          </button>
        </div>
      </div>

      {/* ── Right content ── */}
      <div className="flex-1 overflow-y-auto">
        {status === 'idle' && <IdleState onGenerate={() => onGenerate(spotlightIds)} />}
        {status === 'loading' && <LoadingState />}
        {status === 'error' && <ErrorState error={error} onRetry={() => onGenerate(spotlightIds)} />}
        {status === 'ready' && kit && <KitContent kit={kit} />}
      </div>
    </div>
  )
}

// ── Idle state ─────────────────────────────────────────────────────────────────
function IdleState({ onGenerate }: { onGenerate: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-6 text-center px-12">
      <div className="w-16 h-16 rounded-2xl bg-indigo-600/15 border border-indigo-500/20 flex items-center justify-center">
        <svg className="w-8 h-8 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      </div>
      <div>
        <h2 className="text-lg font-semibold text-slate-100">Generate your prep kit</h2>
        <p className="text-sm text-slate-500 mt-2 leading-relaxed max-w-sm">
          Get your narrative, key messages, sharp interviewer questions, hot competencies, and power phrases — all tailored to this role.
        </p>
      </div>
      <button
        onClick={onGenerate}
        className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold px-6 py-3 rounded-xl transition-all duration-150 shadow-sm hover:shadow-indigo-500/20 hover:shadow-md"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
        Generate Prep Kit
      </button>
    </div>
  )
}

// ── Loading state — animated skeletons ────────────────────────────────────────
function LoadingState() {
  const sections = [
    { title: 'Your Narrative', lines: [92, 85, 78, 90, 65] },
    { title: 'Key Talking Points', lines: [75, 82, 68] },
    { title: 'Questions to Ask', lines: [88, 72, 80, 65, 77] },
    { title: 'Hot Competencies', lines: [60, 70, 55] },
    { title: 'Power Phrases', lines: [78, 65, 82, 70, 60] },
  ]
  return (
    <div className="p-8 space-y-8 max-w-3xl">
      {sections.map((s) => (
        <div key={s.title}>
          <div className="h-4 w-40 bg-slate-800 rounded-lg animate-pulse mb-4" />
          <div className="space-y-2.5">
            {s.lines.map((w, i) => (
              <div
                key={i}
                className="h-4 bg-slate-800/80 rounded-lg animate-pulse"
                style={{ width: `${w}%`, animationDelay: `${i * 0.1}s` }}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

// ── Error state ───────────────────────────────────────────────────────────────
function ErrorState({ error, onRetry }: { error?: string; onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-4 text-center px-12">
      <div className="w-12 h-12 rounded-xl bg-red-500/15 border border-red-500/20 flex items-center justify-center">
        <svg className="w-6 h-6 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      </div>
      <div>
        <p className="text-sm font-semibold text-red-400">Failed to generate prep kit</p>
        {error && <p className="text-xs text-slate-500 mt-1 max-w-sm">{error}</p>}
      </div>
      <button
        onClick={onRetry}
        className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-medium px-5 py-2.5 rounded-xl border border-slate-700/60 transition-all duration-150"
      >
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
        Retry
      </button>
    </div>
  )
}

// ── Full kit content ──────────────────────────────────────────────────────────
function KitContent({ kit }: { kit: PrepKit }) {
  return (
    <div className="p-8 space-y-10 max-w-3xl">
      {/* Narrative */}
      <section id="narrative">
        <SectionHeader title="Your Narrative" subtitle="Tell me about yourself" copyText={kit.narrative} />
        <p className="text-sm text-slate-200 leading-[1.8] whitespace-pre-wrap mt-4 font-normal tracking-wide">
          {kit.narrative}
        </p>
      </section>

      {/* Talking Points */}
      <section id="talking-points">
        <SectionHeader title="Key Talking Points" subtitle="Land these regardless of what's asked" />
        <div className="mt-4 space-y-3">
          {kit.talkingPoints.map((point, i) => (
            <div key={i} className="flex gap-4 p-4 rounded-xl bg-slate-900/50 border-l-2 border-blue-500/60 border border-slate-800/60">
              <span className="flex-shrink-0 w-5 h-5 rounded-full bg-blue-600/20 text-blue-400 text-xs font-bold flex items-center justify-center mt-0.5 border border-blue-500/20">
                {i + 1}
              </span>
              <p className="text-sm text-slate-200 leading-relaxed">{point}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Questions to Ask */}
      <section id="questions-to-ask">
        <SectionHeader title="Questions to Ask" subtitle="Sharp, specific — signal strategic depth" />
        <div className="mt-4 space-y-2">
          {kit.questionsToAsk.map((q, i) => (
            <div key={i} className="flex gap-3 p-3.5 rounded-xl bg-slate-900/40 border border-slate-800/50 hover:border-violet-500/20 hover:bg-violet-500/5 transition-colors group">
              <span className="flex-shrink-0 text-xs font-bold text-slate-600 group-hover:text-violet-500 mt-0.5 w-5 text-right transition-colors">
                {i + 1}.
              </span>
              <p className="text-sm text-slate-300 leading-relaxed">{q}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Hot Competencies */}
      <section id="hot-competencies">
        <SectionHeader title="Hot Competencies" subtitle="Most likely to be tested — lean in here" />
        <div className="mt-4 space-y-3">
          {kit.hotCompetencies.map((hc, i) => (
            <div key={i} className="p-4 rounded-xl bg-slate-900/50 border border-slate-800/60">
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-[10px] font-bold uppercase tracking-widest text-blue-400 bg-blue-500/10 border border-blue-500/20 px-2.5 py-0.5 rounded-full">
                  {hc.label}
                </span>
              </div>
              <p className="text-sm text-slate-400 leading-relaxed">{hc.coachingNote}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Power Phrases */}
      <section id="power-phrases">
        <SectionHeader title="Power Phrases" subtitle="Vocabulary that signals VP-level seniority" />
        <div className="mt-4 space-y-2.5">
          {kit.powerPhrases.map((phrase, i) => {
            const [phraseText, deployNote] = phrase.split(' — ')
            const cleanPhrase = phraseText?.replace(/^Phrase:\s*/i, '').trim() ?? phrase
            return (
              <div key={i} className="p-3.5 rounded-xl bg-amber-500/5 border border-amber-500/15">
                <p className="text-sm font-semibold text-amber-300">{cleanPhrase}</p>
                {deployNote && (
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">{deployNote.trim()}</p>
                )}
              </div>
            )
          })}
        </div>
      </section>
    </div>
  )
}

// ── Section header with optional copy ────────────────────────────────────────
function SectionHeader({ title, subtitle, copyText }: { title: string; subtitle: string; copyText?: string }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    if (!copyText) return
    navigator.clipboard.writeText(copyText)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="flex items-center justify-between">
      <div>
        <h3 className="text-base font-semibold text-slate-100">{title}</h3>
        <p className="text-xs text-slate-600 mt-0.5">{subtitle}</p>
      </div>
      {copyText && (
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 text-xs text-slate-600 hover:text-slate-200 transition-colors px-2 py-1 rounded-lg hover:bg-slate-800/50"
        >
          {copied ? (
            <span className="text-emerald-400 flex items-center gap-1">
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              Copied
            </span>
          ) : (
            <>
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              Copy
            </>
          )}
        </button>
      )}
    </div>
  )
}

// ── Copy all helper ───────────────────────────────────────────────────────────
function buildCopyText(kit: PrepKit, jobContext: JobContext): string {
  const lines: string[] = []
  lines.push(`# Prep Kit — ${jobContext.title} at ${jobContext.company}`)
  lines.push('')

  lines.push('## Your Narrative')
  lines.push(kit.narrative)
  lines.push('')

  lines.push('## Key Talking Points')
  kit.talkingPoints.forEach((t, i) => lines.push(`${i + 1}. ${t}`))
  lines.push('')

  lines.push('## Questions to Ask')
  kit.questionsToAsk.forEach((q, i) => lines.push(`${i + 1}. ${q}`))
  lines.push('')

  lines.push('## Hot Competencies')
  kit.hotCompetencies.forEach((hc) => lines.push(`**${hc.label}** — ${hc.coachingNote}`))
  lines.push('')

  lines.push('## Power Phrases')
  kit.powerPhrases.forEach((p) => lines.push(`- ${p}`))

  return lines.join('\n')
}
