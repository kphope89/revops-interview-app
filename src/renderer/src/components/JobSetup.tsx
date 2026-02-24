import { useState } from 'react'
import { JobContext } from '../types'

interface Props {
  onStart: (job: JobContext) => void
  onSettings: () => void
  hasApiKey: boolean
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

export default function JobSetup({ onStart, onSettings, hasApiKey }: Props) {
  const [inputMode, setInputMode] = useState<'paste' | 'url'>('paste')
  const [url, setUrl] = useState('')
  const [title, setTitle] = useState('')
  const [company, setCompany] = useState('')
  const [description, setDescription] = useState('')
  const [fetchingUrl, setFetchingUrl] = useState(false)
  const [urlError, setUrlError] = useState('')
  const [fetchedUrl, setFetchedUrl] = useState<string | undefined>(undefined)

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
    <div className="flex h-full">
      {/* Left: Setup form */}
      <div className="flex-1 overflow-y-auto p-8">
        <div className="max-w-2xl mx-auto">
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-slate-100 mb-2">Setup Your Interview</h2>
            <p className="text-slate-400">
              Paste the job description or fetch it from a URL. The assistant will use this to tailor every response to this specific role.
            </p>
          </div>

          {!hasApiKey && (
            <div className="mb-5 p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl">
              <p className="text-amber-300 text-sm font-medium mb-1">API Key Required</p>
              <p className="text-amber-400/80 text-sm">
                You need an Anthropic API key to use the assistant.{' '}
                <button onClick={onSettings} className="text-amber-300 underline">
                  Add it in Settings
                </button>
                .
              </p>
            </div>
          )}

          {/* Role metadata */}
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="label">Job Title</label>
              <input
                className="input"
                placeholder="e.g. Director of Revenue Operations"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
            <div>
              <label className="label">Company</label>
              <input
                className="input"
                placeholder="e.g. Acme Corp"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
              />
            </div>
          </div>

          {/* Input mode toggle */}
          <div className="flex gap-1 mb-4 bg-surface-1 p-1 rounded-lg w-fit">
            <button
              onClick={() => setInputMode('paste')}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                inputMode === 'paste'
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Paste Description
            </button>
            <button
              onClick={() => setInputMode('url')}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                inputMode === 'url'
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Fetch from URL
            </button>
          </div>

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
                  className="btn-primary whitespace-nowrap"
                >
                  {fetchingUrl ? 'Fetching...' : 'Fetch'}
                </button>
              </div>
              {urlError && <p className="text-red-400 text-xs mt-1">{urlError}</p>}
            </div>
          )}

          {inputMode === 'paste' && (
            <div className="mb-4">
              <label className="label">
                Job Description
                <span className="text-slate-500 font-normal ml-1">
                  ({description.trim().split(/\s+/).filter(Boolean).length} words)
                </span>
              </label>
              <textarea
                className="input h-56 resize-none font-mono text-sm leading-relaxed"
                placeholder="Paste the full job description here. Include responsibilities, requirements, and any context about the team and company. The more detail, the better the coaching."
                value={description}
                onChange={(e) => { setDescription(e.target.value); setFetchedUrl(undefined) }}
              />
            </div>
          )}

          {/* Start button */}
          <button
            onClick={handleStart}
            disabled={!canStart}
            className="btn-primary w-full py-3 text-base font-semibold"
          >
            Start Interview Session
          </button>

          {!hasApiKey && (
            <p className="text-center text-xs text-slate-500 mt-2">
              API key required —{' '}
              <button onClick={onSettings} className="text-blue-400 hover:text-blue-300">
                configure in Settings
              </button>
            </p>
          )}
        </div>
      </div>

      {/* Right: Sidebar with tips and examples */}
      <div className="w-80 border-l border-slate-700/50 bg-surface-1 p-5 overflow-y-auto">
        <h3 className="text-sm font-semibold text-slate-300 mb-3">Quick Start Examples</h3>
        <div className="space-y-3 mb-6">
          {EXAMPLE_JOBS.map((job) => (
            <button
              key={job.title}
              onClick={() => handleLoadExample(job)}
              className="w-full text-left p-3 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 transition-colors"
            >
              <p className="text-sm font-medium text-slate-200">{job.title}</p>
              <p className="text-xs text-slate-400 mt-0.5">{job.company}</p>
            </button>
          ))}
        </div>

        <h3 className="text-sm font-semibold text-slate-300 mb-3">How It Works</h3>
        <ol className="space-y-3 text-xs text-slate-400">
          {[
            'Paste or fetch the job description to give the assistant context about the role',
            'Start the session and begin your interview call — the assistant listens via your microphone',
            'Questions are automatically detected from the live transcript',
            'Instant coaching appears: suggested response, key talking points, metrics to mention, and tools to reference',
            'Copy any response or use it as a guide while you answer'
          ].map((step, i) => (
            <li key={i} className="flex gap-2.5">
              <span className="flex-shrink-0 w-5 h-5 rounded-full bg-blue-600/20 text-blue-400 text-xs flex items-center justify-center font-medium">
                {i + 1}
              </span>
              <span className="leading-relaxed">{step}</span>
            </li>
          ))}
        </ol>

        <div className="mt-6 p-3 bg-slate-800 rounded-lg border border-slate-700">
          <p className="text-xs font-medium text-slate-300 mb-1">Privacy Note</p>
          <p className="text-xs text-slate-500 leading-relaxed">
            Audio is captured locally and transcribed via OpenAI Whisper. Only the text transcript is sent to Anthropic's API for coaching. Both API keys are stored locally on your device and never shared.
          </p>
        </div>
      </div>
    </div>
  )
}
