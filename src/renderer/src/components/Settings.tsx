import { useState } from 'react'
import { Settings } from '../types'

interface Props {
  settings: Settings
  onSave: (settings: Settings) => void
  onCancel: () => void
}

const MODELS = [
  { id: 'claude-opus-4-5', label: 'Claude Opus 4.5 (Best quality)' },
  { id: 'claude-sonnet-4-5', label: 'Claude Sonnet 4.5 (Balanced)' },
  { id: 'claude-haiku-3-5', label: 'Claude Haiku 3.5 (Fastest)' }
]

export default function SettingsScreen({ settings, onSave, onCancel }: Props) {
  const [apiKey, setApiKey] = useState(settings.apiKey)
  const [openaiApiKey, setOpenaiApiKey] = useState(settings.openaiApiKey ?? '')
  const [model, setModel] = useState(settings.model)
  const [resume, setResume] = useState(settings.resume ?? '')
  const [resumeExpanded, setResumeExpanded] = useState(false)
  const [showKey, setShowKey] = useState(false)
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<{ ok: boolean; msg: string } | null>(null)

  const handleTest = async () => {
    if (!apiKey.trim()) return
    setTesting(true)
    setTestResult(null)
    try {
      await window.electronAPI.saveSettings({ apiKey: apiKey.trim(), model, resume: resume.trim(), openaiApiKey: openaiApiKey.trim() })
      const res = await window.electronAPI.detectQuestion({
        transcript: 'How do you approach RevOps?',
        previousTranscript: ''
      })
      if (res.success) {
        setTestResult({ ok: true, msg: 'Connection successful! API key is valid.' })
      } else {
        setTestResult({ ok: false, msg: 'Connection failed. Check your API key.' })
      }
    } catch (e) {
      setTestResult({ ok: false, msg: String(e) })
    }
    setTesting(false)
  }

  const handleSave = () => {
    onSave({ apiKey: apiKey.trim(), model, resume: resume.trim(), openaiApiKey: openaiApiKey.trim() })
  }

  const wordCount = resume.trim().split(/\s+/).filter(Boolean).length

  return (
    <div className="flex items-center justify-center h-full p-8">
      <div className="card p-8 w-full max-w-lg">
        <h2 className="text-xl font-semibold text-slate-100 mb-1">Settings</h2>
        <p className="text-sm text-slate-400 mb-6">Configure your Anthropic API connection</p>

        {/* API Key */}
        <div className="mb-5">
          <label className="label">Anthropic API Key</label>
          <div className="relative">
            <input
              type={showKey ? 'text' : 'password'}
              className="input pr-20"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="sk-ant-api03-..."
            />
            <button
              type="button"
              onClick={() => setShowKey(!showKey)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-200"
            >
              {showKey ? 'Hide' : 'Show'}
            </button>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Get your API key at{' '}
            <span className="text-blue-400">console.anthropic.com</span>. Stored locally on your device.
          </p>
        </div>

        {/* OpenAI API Key */}
        <div className="mb-5">
          <label className="label">OpenAI API Key <span className="text-slate-500 font-normal">(for speech recognition)</span></label>
          <div className="relative">
            <input
              type={showKey ? 'text' : 'password'}
              className="input pr-20"
              value={openaiApiKey}
              onChange={(e) => setOpenaiApiKey(e.target.value)}
              placeholder="sk-proj-..."
            />
            <button
              type="button"
              onClick={() => setShowKey(!showKey)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-200"
            >
              {showKey ? 'Hide' : 'Show'}
            </button>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Used for Whisper speech-to-text transcription. Get your key at{' '}
            <span className="text-blue-400">platform.openai.com</span>. Stored locally.
          </p>
        </div>

        {/* Model Selection */}
        <div className="mb-5">
          <label className="label">Model</label>
          <select
            className="input"
            value={model}
            onChange={(e) => setModel(e.target.value)}
          >
            {MODELS.map((m) => (
              <option key={m.id} value={m.id}>
                {m.label}
              </option>
            ))}
          </select>
          <p className="text-xs text-slate-500 mt-1">
            Opus gives the best coaching quality. Haiku is fastest for real-time detection.
          </p>
        </div>

        {/* Candidate Background — collapsible */}
        <div className="mb-6">
          <button
            type="button"
            onClick={() => setResumeExpanded(!resumeExpanded)}
            className="flex items-center justify-between w-full text-left"
          >
            <span className="label mb-0 cursor-pointer">
              Candidate Background
              <span className="text-slate-500 font-normal ml-1">(optional)</span>
            </span>
            <span className="text-xs text-slate-400 hover:text-slate-200 transition-colors flex items-center gap-1 flex-shrink-0">
              {resumeExpanded ? 'Collapse' : resume.trim() ? 'Edit' : 'Add resume'}
              <svg
                className={`w-3.5 h-3.5 transition-transform ${resumeExpanded ? 'rotate-180' : ''}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </span>
          </button>

          {!resumeExpanded && resume.trim() && (
            <p className="text-xs text-emerald-400 mt-1">
              Resume saved ({wordCount} words) — included in all coaching sessions
            </p>
          )}
          {!resumeExpanded && !resume.trim() && (
            <p className="text-xs text-slate-500 mt-1">
              Paste your resume to anchor coaching in your actual experience
            </p>
          )}

          {resumeExpanded && (
            <>
              <textarea
                className="input mt-2 h-48 resize-none font-mono text-sm leading-relaxed"
                placeholder={`Paste your resume or a professional summary here.\n\nExample:\n• 8 years RevOps, most recently Director at Acme Corp\n• Reduced forecast error from 22% to 8% via Clari implementation\n• Built SDR ops from scratch: 0 → 40 reps, supporting $180M ARR\n• Certified Salesforce Admin; deployed HubSpot, Outreach, Gong\n\nThe more specific your metrics and company context, the better Claude can anchor suggested answers in your actual experience.`}
                value={resume}
                onChange={(e) => setResume(e.target.value)}
              />
              <p className="text-xs text-slate-500 mt-1">
                Stored locally. Used to personalize coaching responses and generate predicted questions.
              </p>
            </>
          )}
        </div>

        {/* Test result */}
        {testResult && (
          <div
            className={`mb-4 p-3 rounded-lg text-sm ${
              testResult.ok
                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                : 'bg-red-500/10 text-red-400 border border-red-500/20'
            }`}
          >
            {testResult.msg}
          </div>
        )}

        <div className="flex gap-3">
          <button
            onClick={handleTest}
            disabled={!apiKey.trim() || testing}
            className="btn-secondary flex-1"
          >
            {testing ? 'Testing...' : 'Test Connection'}
          </button>
          <button onClick={handleSave} disabled={!apiKey.trim()} className="btn-primary flex-1">
            Save Settings
          </button>
        </div>

        <button onClick={onCancel} className="w-full mt-3 text-sm text-slate-400 hover:text-slate-300 py-1">
          Cancel
        </button>
      </div>
    </div>
  )
}
