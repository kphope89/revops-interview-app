import { useState } from 'react'
import { JobContext } from '../types'

interface Props {
  onStart: (job: JobContext) => void
  onSettings: () => void
  hasApiKey: boolean
  initialJob?: JobContext | null
}

const EXAMPLE_JOBS = [
  {
    title: 'Director of Revenue Operations',
    company: 'Acme SaaS Co.',
    description: `We are looking for a Director of Revenue Operations to lead our GTM operations function. You will own the full revenue tech stack (Salesforce, Outreach, Gong, Clari), drive forecasting accuracy, lead pipeline review cadences, and align Sales and Marketing on lead management processes. You will partner with CRO and CMO to design territory plans and quota, and build a RevOps team from 0 to 3. Key metrics: pipeline coverage, win rates, NRR, and forecast accuracy.`
  },
  {
    title: 'Revenue Operations Manager',
    company: 'Growth Stage Startup',
    description: `Join our RevOps team to own Salesforce administration, build reporting and dashboards, manage the lead-to-revenue process, and support SDR/AE operations. You will design our lead scoring model, optimize our inbound funnel, and partner with Marketing on attribution. 3+ years RevOps/Sales Ops experience required. Salesforce Admin certified preferred.`
  }
]

const HOW_IT_WORKS = [
  { icon: '📋', text: 'Paste or fetch the job description for role-specific coaching' },
  { icon: '🎤', text: 'Start the session — the assistant listens via your microphone' },
  { icon: '🔍', text: 'Questions are auto-detected from the live transcript' },
  { icon: '⚡', text: 'Instant talk tracks, key points, metrics, and tools appear' },
  { icon: '📺', text: 'Pop out the teleprompter to read your response hands-free' },
]

export default function JobSetup({ onStart, onSettings, hasApiKey, initialJob }: Props) {
  const [inputMode, setInputMode] = useState<'paste' | 'url'>('paste')
  const [url, setUrl] = useState('')
  const [title, setTitle] = useState(
    initialJob?.title && initialJob.title !== 'Untitled Role' ? initialJob.title : ''
  )
  const [company, setCompany] = useState(
    initialJob?.company && initialJob.company !== 'Unknown Company' ? initialJob.company : ''
  )
  const [description, setDescription] = useState(initialJob?.description ?? '')
  const [fetchingUrl, setFetchingUrl] = useState(false)
  const [urlError, setUrlError] = useState('')
  const [fetchedUrl, setFetchedUrl] = useState<string | undefined>(initialJob?.url)

  const handleFetchUrl = async () => {
    if (!url.trim()) return
    setFetchingUrl(true)
    setUrlError('')
    try {
      const result = await window.electronAPI.fetchJobUrl(url.trim())
      if (result.success && result.text) {
        setDescription(result.text)
        setFetchedUrl(url.trim())
        setInputMode('paste')
      } else {
        setUrlError(result.error || 'Could not fetch that URL. Try pasting the description directly.')
      }
    } catch (e) {
      setUrlError(String(e))
    }
    setFetchingUrl(false)
  }

  const handleLoadExample = (example: (typeof EXAMPLE_JOBS)[0]) => {
    setTitle(example.title)
    setCompany(example.company)
    setDescription(example.description)
    setInputMode('paste')
  }

  const canStart = description.trim().length > 20 && hasApiKey
  const wordCount = description.trim().split(/\s+/).filter(Boolean).length

  const handleStart = () => {
    if (!canStart) return
    onStart({
      title: title || 'Untitled Role',
      company: company || 'Unknown Company',
      description: description.trim(),
      url: fetchedUrl ?? (inputMode === 'url' ? url.trim() || undefined : undefined)
    })
  }

  return (
    <div className="flex h-full overflow-hidden">
      {/* ── Left: Setup form ── */}
      <div className="flex-1 overflow-y-auto">
        {/* Hero section */}
        <div className="px-10 pt-10 pb-6 border-b border-slate-800/60">
          <div className="max-w-xl">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xs font-semibold uppercase tracking-widest text-blue-400/80 bg-blue-500/10 border border-blue-500/20 px-2.5 py-1 rounded-full">
                Interview Prep
              </span>
            </div>
            <h2 className="text-3xl font-bold text-slate-100 leading-tight mb-2"
              style={{ letterSpacing: '-0.02em' }}>
              Set up your session
            </h2>
            <p className="text-slate-500 text-sm leading-relaxed">
              Add the job description and the AI will tailor every coaching response to this specific role.
            </p>
          </div>
        </div>

        <div className="px-10 py-8 max-w-xl">
          {/* API key warning */}
          {!hasApiKey && (
            <div className="mb-6 p-4 bg-amber-500/8 border border-amber-500/20 rounded-2xl flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-amber-500/15 flex items-center justify-center flex-shrink-0 mt-0.5">
                <svg className="w-4 h-4 text-amber-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd"/>
                </svg>
              </div>
              <div>
                <p className="text-amber-300 text-sm font-semibold mb-0.5">API Key Required</p>
                <p className="text-amber-400/70 text-xs leading-relaxed">
                  You need an Anthropic API key to use the assistant.{' '}
                  <button onClick={onSettings} className="text-amber-300 underline underline-offset-2 hover:text-amber-200">
                    Add it in Settings →
                  </button>
                </p>
              </div>
            </div>
          )}

          {/* Role metadata */}
          <div className="grid grid-cols-2 gap-3 mb-5">
            <div>
              <label className="label">Job Title</label>
              <input
                className="input"
                placeholder="Director of RevOps"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
            <div>
              <label className="label">Company</label>
              <input
                className="input"
                placeholder="Acme Corp"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
              />
            </div>
          </div>

          {/* Input mode toggle */}
          <div className="flex gap-1 mb-4 bg-slate-900/80 border border-slate-800 p-1 rounded-xl w-fit">
            {(['paste', 'url'] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setInputMode(mode)}
                className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all duration-150 ${
                  inputMode === mode
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                {mode === 'paste' ? (
                  <span className="flex items-center gap-1.5">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                    Paste
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                    </svg>
                    From URL
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* URL input */}
          {inputMode === 'url' && (
            <div className="mb-4">
              <label className="label">Job Posting URL</label>
              <div className="flex gap-2">
                <input
                  className="input flex-1"
                  placeholder="https://jobs.company.com/role/..."
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleFetchUrl()}
                />
                <button
                  onClick={handleFetchUrl}
                  disabled={!url.trim() || fetchingUrl}
                  className="btn-primary whitespace-nowrap flex items-center gap-1.5"
                >
                  {fetchingUrl ? (
                    <>
                      <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                      </svg>
                      Fetching...
                    </>
                  ) : 'Fetch'}
                </button>
              </div>
              {urlError && (
                <p className="text-red-400 text-xs mt-1.5 flex items-center gap-1">
                  <svg className="w-3 h-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd"/>
                  </svg>
                  {urlError}
                </p>
              )}
            </div>
          )}

          {/* Paste textarea */}
          {inputMode === 'paste' && (
            <div className="mb-5">
              <div className="flex items-center justify-between mb-1.5">
                <label className="label mb-0">Job Description</label>
                {wordCount > 0 && (
                  <span className="text-xs text-slate-600">{wordCount} words</span>
                )}
              </div>
              <textarea
                className="input h-52 resize-none font-mono text-sm leading-relaxed"
                placeholder="Paste the full job description here — responsibilities, requirements, team context. More detail = better coaching."
                value={description}
                onChange={(e) => { setDescription(e.target.value); setFetchedUrl(undefined) }}
              />
            </div>
          )}

          {/* Start button */}
          <button
            onClick={handleStart}
            disabled={!canStart}
            className="btn-primary w-full py-3.5 text-base font-bold flex items-center justify-center gap-2 rounded-2xl"
          >
            {canStart ? (
              <>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.971l-11.54 6.347a1.125 1.125 0 01-1.667-.985V5.653z" />
                </svg>
                Start Interview Session
              </>
            ) : (
              <span className="opacity-60">
                {!hasApiKey ? 'API Key Required' : 'Add Job Description to Start'}
              </span>
            )}
          </button>

          {!hasApiKey && (
            <p className="text-center text-xs text-slate-600 mt-2.5">
              <button onClick={onSettings} className="text-blue-500 hover:text-blue-400 underline underline-offset-2">
                Configure API key in Settings
              </button>
            </p>
          )}
        </div>
      </div>

      {/* ── Right: Sidebar ── */}
      <div className="w-72 border-l border-slate-800/60 overflow-y-auto flex flex-col">
        {/* Examples section */}
        <div className="p-5 border-b border-slate-800/60">
          <p className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-3">Quick Examples</p>
          <div className="space-y-2">
            {EXAMPLE_JOBS.map((job) => (
              <button
                key={job.title}
                onClick={() => handleLoadExample(job)}
                className="w-full text-left p-3.5 rounded-xl bg-slate-900/60 hover:bg-slate-800/80 border border-slate-800/80 hover:border-slate-700/60 transition-all duration-150 group"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-200 leading-snug mb-0.5 truncate">{job.title}</p>
                    <p className="text-xs text-slate-500">{job.company}</p>
                  </div>
                  <svg className="w-4 h-4 text-slate-700 group-hover:text-blue-400 flex-shrink-0 mt-0.5 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* How it works */}
        <div className="p-5 flex-1">
          <p className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-4">How It Works</p>
          <ol className="space-y-3.5">
            {HOW_IT_WORKS.map((step, i) => (
              <li key={i} className="flex items-start gap-3">
                <span className="text-base leading-none flex-shrink-0 mt-0.5">{step.icon}</span>
                <p className="text-xs text-slate-400 leading-relaxed">{step.text}</p>
              </li>
            ))}
          </ol>
        </div>

        {/* Privacy note */}
        <div className="p-5 border-t border-slate-800/60">
          <div className="p-3.5 bg-slate-900/60 rounded-xl border border-slate-800">
            <div className="flex items-center gap-2 mb-1.5">
              <svg className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              <p className="text-xs font-semibold text-slate-400">Private by default</p>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Audio is captured locally and transcribed via Whisper. Only text goes to Anthropic. API keys are stored on your device only.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
