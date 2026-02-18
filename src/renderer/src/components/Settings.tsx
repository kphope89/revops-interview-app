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
  const [model, setModel] = useState(settings.model)
  const [showKey, setShowKey] = useState(false)
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<{ ok: boolean; msg: string } | null>(null)

  const handleTest = async () => {
    if (!apiKey.trim()) return
    setTesting(true)
    setTestResult(null)
    try {
      // Save temporarily and test
      await window.electronAPI.saveSettings({ apiKey: apiKey.trim(), model })
      const res = await window.electronAPI.analyzeQuestion({
        question: 'What is RevOps?',
        jobDescription: 'Test',
        knowledgeContext: 'Test',
        conversationHistory: ''
      })
      if (res.success) {
        setTestResult({ ok: true, msg: 'Connection successful! API key is valid.' })
      } else {
        setTestResult({ ok: false, msg: res.error || 'Connection failed.' })
      }
    } catch (e) {
      setTestResult({ ok: false, msg: String(e) })
    }
    setTesting(false)
  }

  const handleSave = () => {
    onSave({ apiKey: apiKey.trim(), model })
  }

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

        {/* Model Selection */}
        <div className="mb-6">
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
