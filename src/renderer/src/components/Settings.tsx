import { useState, useEffect } from 'react'
import { Settings, KnowledgeItem, KnowledgeItemType, ToneMode, UserProfile } from '../types'
import { REVOPS_COMPETENCIES } from '../data/revops-knowledge'

interface Props {
  settings: Settings
  onSave: (settings: Settings) => void
  onCancel: () => void
}

const MODELS = [
  { id: 'claude-opus-4-6', label: 'Claude Opus 4.6 (Best quality)' },
  { id: 'claude-sonnet-4-6', label: 'Claude Sonnet 4.6 (Balanced)' },
  { id: 'claude-haiku-4-5-20251001', label: 'Claude Haiku 4.5 (Fastest)' }
]

const TONE_MODES: { id: ToneMode; label: string; description: string }[] = [
  {
    id: 'conversational',
    label: 'Conversational',
    description: 'Natural, first-person speech with contractions and varied rhythm. Sounds like a real person thinking out loud.'
  },
  {
    id: 'tight',
    label: 'Tight',
    description: 'Compressed and direct. One example, one metric, done. Useful for practicing concise delivery under time pressure.'
  },
  {
    id: 'exec',
    label: 'Senior Exec',
    description: 'Polished and precise — the register for a board room or PE diligence conversation. Fewer contractions, airtight logic.'
  }
]

const TYPE_BADGE_STYLES: Record<KnowledgeItemType, string> = {
  project: 'bg-blue-500/20 text-blue-300 border border-blue-500/30',
  achievement: 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30',
  framework: 'bg-purple-500/20 text-purple-300 border border-purple-500/30',
  brief: 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
}

const FORM_PLACEHOLDERS: Record<KnowledgeItemType, string> = {
  project: 'e.g. Rebuilt lead routing in LeanData, cutting SLA from 8h to 4min. Integrated with Salesforce to auto-assign by territory, industry, and deal size. Reduced lead leakage by 34% in Q1.',
  achievement: 'e.g. Reduced CAC by 32% by consolidating 3 attribution models into a single multi-touch model in Bizible. Enabled marketing to reallocate $400K from underperforming channels.',
  framework: 'e.g. GTM capacity planning model: bottoms-up quota built from ramp time, average ACV, and win rate per segment. Run quarterly; feeds headcount plan and OKRs.',
  brief: 'e.g. Preparing for VP RevOps role at Series C SaaS (~$50M ARR). Company uses Salesforce + HubSpot + Gong stack. Key gap they are trying to solve is forecasting accuracy and CS expansion motion.'
}

const YEARS_OPTIONS = ['1-3 years', '4-6 years', '7-10 years', '10+ years']
const STAGE_OPTIONS = ['Seed / Series A', 'Series B-C', 'Series D / Pre-IPO', 'Public company', 'Any stage']
const INDUSTRY_OPTIONS = ['B2B SaaS', 'Fintech', 'Healthcare Tech', 'E-commerce', 'Enterprise Software', 'Any']
const MAX_STRENGTHS = 5

const DEFAULT_PROFILE: UserProfile = {
  name: '',
  currentTitle: '',
  currentCompany: '',
  yearsExperience: '',
  targetTitle: '',
  targetStage: '',
  targetIndustry: '',
  lookingBecause: '',
  topStrengths: [],
  signatureMetrics: ['', '', ''],
  differentiator: '',
  resume: ''
}

export default function SettingsScreen({ settings, onSave, onCancel }: Props) {
  const [activeTab, setActiveTab] = useState<'profile' | 'knowledge' | 'config'>('profile')

  // Profile tab state
  const [profile, setProfile] = useState<UserProfile>(DEFAULT_PROFILE)
  const [profileSaved, setProfileSaved] = useState(false)
  const [resumeExpanded, setResumeExpanded] = useState(false)

  // Config tab state
  const [apiKey, setApiKey] = useState(settings.apiKey)
  const [openaiApiKey, setOpenaiApiKey] = useState(settings.openaiApiKey ?? '')
  const [model, setModel] = useState(settings.model)
  const [toneMode, setToneMode] = useState<ToneMode>(settings.toneMode ?? 'conversational')
  const [showKey, setShowKey] = useState(false)
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<{ ok: boolean; msg: string } | null>(null)

  // Knowledge tab state
  const [knowledgeItems, setKnowledgeItems] = useState<KnowledgeItem[]>([])
  const [editingItem, setEditingItem] = useState<KnowledgeItem | null>(null)
  const [isAdding, setIsAdding] = useState(false)
  const [formType, setFormType] = useState<KnowledgeItemType>('project')
  const [formTitle, setFormTitle] = useState('')
  const [formContent, setFormContent] = useState('')

  useEffect(() => {
    window.electronAPI.getKnowledgeItems().then(setKnowledgeItems)
    window.electronAPI.getProfile().then((p) => {
      // Ensure signatureMetrics is always length 3
      const metrics = p.signatureMetrics ?? ['', '', '']
      while (metrics.length < 3) metrics.push('')
      setProfile({ ...DEFAULT_PROFILE, ...p, signatureMetrics: metrics.slice(0, 3) })
    })
  }, [])

  const handleTest = async () => {
    if (!apiKey.trim()) return
    setTesting(true)
    setTestResult(null)
    try {
      await window.electronAPI.saveSettings({ apiKey: apiKey.trim(), model, resume: settings.resume ?? '', openaiApiKey: openaiApiKey.trim(), toneMode })
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

  const handleSaveConfig = () => {
    // Preserve existing settings.resume so backward-compat resume fallback still works in InterviewScreen
    onSave({ apiKey: apiKey.trim(), model, resume: settings.resume ?? '', openaiApiKey: openaiApiKey.trim(), toneMode })
  }

  const handleSaveProfile = async () => {
    await window.electronAPI.saveProfile(profile)
    setProfileSaved(true)
    setTimeout(() => setProfileSaved(false), 2000)
  }

  const setProfileField = <K extends keyof UserProfile>(field: K, value: UserProfile[K]) => {
    setProfile((prev) => ({ ...prev, [field]: value }))
  }

  const toggleStrength = (s: string) => {
    setProfile((prev) => {
      const already = prev.topStrengths.includes(s)
      if (already) {
        return { ...prev, topStrengths: prev.topStrengths.filter((x) => x !== s) }
      }
      if (prev.topStrengths.length >= MAX_STRENGTHS) return prev
      return { ...prev, topStrengths: [...prev.topStrengths, s] }
    })
  }

  const setMetric = (idx: number, value: string) => {
    setProfile((prev) => {
      const metrics = [...prev.signatureMetrics]
      metrics[idx] = value
      return { ...prev, signatureMetrics: metrics }
    })
  }

  const openAddForm = () => {
    setEditingItem(null)
    setFormType('project')
    setFormTitle('')
    setFormContent('')
    setIsAdding(true)
  }

  const openEditForm = (item: KnowledgeItem) => {
    setEditingItem(item)
    setFormType(item.type)
    setFormTitle(item.title)
    setFormContent(item.content)
    setIsAdding(true)
  }

  const closeForm = () => {
    setIsAdding(false)
    setEditingItem(null)
  }

  const handleSaveItem = async () => {
    if (!formTitle.trim() || !formContent.trim()) return
    const item: KnowledgeItem = {
      id: editingItem?.id ?? crypto.randomUUID(),
      title: formTitle.trim(),
      type: formType,
      content: formContent.trim(),
      createdAt: editingItem?.createdAt ?? new Date().toISOString()
    }
    await window.electronAPI.upsertKnowledgeItem(item)
    setKnowledgeItems((prev) => {
      const idx = prev.findIndex((i) => i.id === item.id)
      if (idx >= 0) {
        const next = [...prev]
        next[idx] = item
        return next
      }
      return [...prev, item]
    })
    closeForm()
  }

  const handleDelete = async (id: string) => {
    await window.electronAPI.deleteKnowledgeItem(id)
    setKnowledgeItems((prev) => prev.filter((i) => i.id !== id))
  }

  const resumeWordCount = profile.resume.trim().split(/\s+/).filter(Boolean).length

  return (
    <div className="flex items-center justify-center h-full p-8">
      <div className="card p-8 w-full max-w-2xl">
        <h2 className="text-xl font-semibold text-slate-100 mb-1">Settings</h2>
        <p className="text-sm text-slate-400 mb-5">Configure your profile, knowledge base, and API connection</p>

        {/* Tab bar */}
        <div className="flex gap-1 mb-6 bg-slate-900/60 rounded-xl p-1 border border-slate-800/60">
          {(['profile', 'knowledge', 'config'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-1.5 text-sm font-medium rounded-lg transition-all ${
                activeTab === tab
                  ? 'bg-slate-700 text-slate-100 shadow-sm'
                  : 'text-slate-400 hover:text-slate-300'
              }`}
            >
              {tab === 'profile' ? 'Profile' : tab === 'knowledge' ? (
                <>
                  Knowledge Base
                  {knowledgeItems.length > 0 && (
                    <span className="ml-1.5 text-xs bg-blue-500/20 text-blue-300 px-1.5 py-0.5 rounded-full">
                      {knowledgeItems.length}
                    </span>
                  )}
                </>
              ) : 'Config'}
            </button>
          ))}
        </div>

        {/* ── Profile Tab ── */}
        {activeTab === 'profile' && (
          <div className="space-y-6 overflow-y-auto max-h-[calc(100vh-280px)] pr-1">

            {/* Section 1: Who You Are */}
            <div>
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Who You Are</h3>
              <div className="space-y-3">
                <div>
                  <label className="label">Name</label>
                  <input
                    type="text"
                    className="input"
                    placeholder="e.g. Alex Chen"
                    value={profile.name}
                    onChange={(e) => setProfileField('name', e.target.value)}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="label">Current Title</label>
                    <input
                      type="text"
                      className="input"
                      placeholder="e.g. Director of RevOps"
                      value={profile.currentTitle}
                      onChange={(e) => setProfileField('currentTitle', e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="label">Current Company</label>
                    <input
                      type="text"
                      className="input"
                      placeholder="e.g. Acme Corp"
                      value={profile.currentCompany}
                      onChange={(e) => setProfileField('currentCompany', e.target.value)}
                    />
                  </div>
                </div>
                <div>
                  <label className="label">Years in RevOps</label>
                  <select
                    className="input"
                    value={profile.yearsExperience}
                    onChange={(e) => setProfileField('yearsExperience', e.target.value)}
                  >
                    <option value="">Select range</option>
                    {YEARS_OPTIONS.map((o) => (
                      <option key={o} value={o}>{o}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Section 2: What You're Targeting */}
            <div>
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">What You're Targeting</h3>
              <div className="space-y-3">
                <div>
                  <label className="label">Target Title</label>
                  <input
                    type="text"
                    className="input"
                    placeholder="e.g. VP Revenue Operations"
                    value={profile.targetTitle}
                    onChange={(e) => setProfileField('targetTitle', e.target.value)}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="label">Company Stage</label>
                    <select
                      className="input"
                      value={profile.targetStage}
                      onChange={(e) => setProfileField('targetStage', e.target.value)}
                    >
                      <option value="">Select stage</option>
                      {STAGE_OPTIONS.map((o) => (
                        <option key={o} value={o}>{o}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="label">Target Industry</label>
                    <select
                      className="input"
                      value={profile.targetIndustry}
                      onChange={(e) => setProfileField('targetIndustry', e.target.value)}
                    >
                      <option value="">Select industry</option>
                      {INDUSTRY_OPTIONS.map((o) => (
                        <option key={o} value={o}>{o}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="label">Why making this move</label>
                  <textarea
                    className="input h-20 resize-none"
                    placeholder="e.g. Ready to step into a true VP seat where I own the full revenue architecture end-to-end, not just ops support."
                    value={profile.lookingBecause}
                    onChange={(e) => setProfileField('lookingBecause', e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* Section 3: Your Edge */}
            <div>
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Your Edge</h3>
              <div className="space-y-4">

                {/* Top Strengths multi-select */}
                <div>
                  <label className="label">
                    Top Strengths
                    <span className="text-slate-500 font-normal ml-1">
                      ({profile.topStrengths.length}/{MAX_STRENGTHS} selected)
                    </span>
                  </label>
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {REVOPS_COMPETENCIES.map((s) => {
                      const selected = profile.topStrengths.includes(s)
                      const disabled = !selected && profile.topStrengths.length >= MAX_STRENGTHS
                      return (
                        <button
                          key={s}
                          type="button"
                          onClick={() => toggleStrength(s)}
                          disabled={disabled}
                          className={`text-xs px-2.5 py-1 rounded-full border transition-all duration-100 ${
                            selected
                              ? 'bg-blue-600/20 border-blue-500/50 text-blue-300'
                              : disabled
                              ? 'bg-slate-900/20 border-slate-800/40 text-slate-600 cursor-not-allowed'
                              : 'bg-slate-900/40 border-slate-700/60 text-slate-400 hover:border-slate-500 hover:text-slate-300'
                          }`}
                        >
                          {s}
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Signature Metrics */}
                <div>
                  <label className="label">Signature Metrics <span className="text-slate-500 font-normal">(leave blank if not applicable)</span></label>
                  <div className="space-y-2">
                    {[0, 1, 2].map((idx) => (
                      <input
                        key={idx}
                        type="text"
                        className="input text-sm"
                        placeholder={
                          idx === 0
                            ? 'e.g. Reduced forecast error from 22% to 8% via Clari'
                            : idx === 1
                            ? 'e.g. Built SDR ops 0 → 40 reps, supporting $180M ARR'
                            : 'e.g. Reduced CAC by 32% through attribution model consolidation'
                        }
                        value={profile.signatureMetrics[idx] ?? ''}
                        onChange={(e) => setMetric(idx, e.target.value)}
                      />
                    ))}
                  </div>
                </div>

                {/* Differentiator */}
                <div>
                  <label className="label">What sets you apart</label>
                  <textarea
                    className="input h-16 resize-none"
                    placeholder="e.g. I build RevOps systems that survive hypergrowth — not just for today's motion but for the company 3x from here."
                    value={profile.differentiator}
                    onChange={(e) => setProfileField('differentiator', e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* Section 4: Resume */}
            <div>
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Resume / Background</h3>
              <div>
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
                    {resumeExpanded ? 'Collapse' : profile.resume.trim() ? 'Edit' : 'Add resume'}
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

                {!resumeExpanded && profile.resume.trim() && (
                  <p className="text-xs text-emerald-400 mt-1">
                    Resume saved ({resumeWordCount} words) — included in all coaching sessions
                  </p>
                )}
                {!resumeExpanded && !profile.resume.trim() && (
                  <p className="text-xs text-slate-500 mt-1">
                    Paste your resume to anchor coaching in your actual experience
                  </p>
                )}

                {resumeExpanded && (
                  <>
                    <textarea
                      className="input mt-2 h-48 resize-none font-mono text-sm leading-relaxed"
                      placeholder={`Paste your resume or a professional summary here.\n\nExample:\n• 8 years RevOps, most recently Director at Acme Corp\n• Reduced forecast error from 22% to 8% via Clari implementation\n• Built SDR ops from scratch: 0 → 40 reps, supporting $180M ARR\n• Certified Salesforce Admin; deployed HubSpot, Outreach, Gong\n\nThe more specific your metrics and company context, the better Claude can anchor suggested answers in your actual experience.`}
                      value={profile.resume}
                      onChange={(e) => setProfileField('resume', e.target.value)}
                    />
                    <p className="text-xs text-slate-500 mt-1">
                      Stored locally. Used to personalize coaching responses and generate predicted questions.
                    </p>
                  </>
                )}
              </div>
            </div>

            {/* Save Profile */}
            <div className="pt-2 pb-4">
              <button
                onClick={handleSaveProfile}
                className="btn-primary w-full"
              >
                {profileSaved ? 'Profile Saved!' : 'Save Profile'}
              </button>
              <button onClick={onCancel} className="w-full mt-3 text-sm text-slate-400 hover:text-slate-300 py-1">
                Close
              </button>
            </div>
          </div>
        )}

        {/* ── Knowledge Tab ── */}
        {activeTab === 'knowledge' && (
          <div>
            <p className="text-sm text-slate-400 mb-4">
              Add projects, achievements, and frameworks. Claude will reference these when coaching you on relevant questions.
            </p>

            {/* Item list */}
            <div className="space-y-2 mb-4">
              {knowledgeItems.map((item) => (
                <div
                  key={item.id}
                  className="flex items-start gap-3 bg-slate-900/60 rounded-xl px-4 py-3 border border-slate-800/60"
                >
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full flex-shrink-0 mt-0.5 ${TYPE_BADGE_STYLES[item.type]}`}>
                    {item.type}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-200 leading-tight">{item.title}</p>
                    <p className="text-xs text-slate-500 mt-0.5 line-clamp-2 leading-relaxed">{item.content}</p>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      onClick={() => openEditForm(item)}
                      className="text-xs text-slate-500 hover:text-slate-300 px-2 py-1 rounded-lg hover:bg-slate-800 transition-colors"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(item.id)}
                      className="text-xs text-slate-500 hover:text-red-400 px-2 py-1 rounded-lg hover:bg-red-500/10 transition-colors"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}

              {knowledgeItems.length === 0 && !isAdding && (
                <div className="text-center py-8 text-slate-600 text-sm">
                  No items yet. Add a project or achievement to personalize your coaching.
                </div>
              )}
            </div>

            {/* Inline add/edit form */}
            {isAdding && (
              <div className="bg-slate-900/80 rounded-xl border border-slate-700/60 p-4 mb-4 space-y-3">
                <div className="flex gap-3">
                  <div className="flex-shrink-0">
                    <label className="label text-xs">Type</label>
                    <select
                      className="input text-sm"
                      value={formType}
                      onChange={(e) => setFormType(e.target.value as KnowledgeItemType)}
                    >
                      <option value="project">Project</option>
                      <option value="achievement">Achievement</option>
                      <option value="framework">Framework</option>
                      <option value="brief">Brief</option>
                    </select>
                  </div>
                  <div className="flex-1">
                    <label className="label text-xs">Title</label>
                    <input
                      type="text"
                      className="input text-sm"
                      placeholder="Short descriptive title"
                      value={formTitle}
                      onChange={(e) => setFormTitle(e.target.value)}
                    />
                  </div>
                </div>
                <div>
                  <label className="label text-xs">Content</label>
                  <textarea
                    className="input h-28 resize-none text-sm leading-relaxed"
                    placeholder={FORM_PLACEHOLDERS[formType]}
                    value={formContent}
                    onChange={(e) => setFormContent(e.target.value)}
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleSaveItem}
                    disabled={!formTitle.trim() || !formContent.trim()}
                    className="btn-primary text-sm px-4 py-1.5"
                  >
                    Save
                  </button>
                  <button
                    onClick={closeForm}
                    className="btn-secondary text-sm px-4 py-1.5"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Add button */}
            {!isAdding && (
              <button
                onClick={openAddForm}
                className="w-full py-2.5 rounded-xl border border-dashed border-slate-700 text-slate-500 hover:text-slate-300 hover:border-slate-500 text-sm transition-colors"
              >
                + Add item
              </button>
            )}

            <button onClick={onCancel} className="w-full mt-4 text-sm text-slate-400 hover:text-slate-300 py-1">
              Close
            </button>
          </div>
        )}

        {/* ── Config Tab ── */}
        {activeTab === 'config' && (
          <>
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

            {/* Response Style */}
            <div className="mb-5">
              <label className="label">Response Style</label>
              <div className="space-y-2">
                {TONE_MODES.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setToneMode(t.id)}
                    className={`w-full text-left px-4 py-3 rounded-xl border transition-all duration-150 ${
                      toneMode === t.id
                        ? 'bg-blue-600/15 border-blue-500/40 text-slate-100'
                        : 'bg-slate-900/40 border-slate-800/60 text-slate-400 hover:border-slate-700 hover:text-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className={`w-2 h-2 rounded-full flex-shrink-0 ${toneMode === t.id ? 'bg-blue-400' : 'bg-slate-700'}`} />
                      <span className="text-sm font-semibold">{t.label}</span>
                    </div>
                    <p className="text-xs text-slate-500 leading-relaxed pl-4">{t.description}</p>
                  </button>
                ))}
              </div>
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
              <button onClick={handleSaveConfig} disabled={!apiKey.trim()} className="btn-primary flex-1">
                Save Settings
              </button>
            </div>

            <button onClick={onCancel} className="w-full mt-3 text-sm text-slate-400 hover:text-slate-300 py-1">
              Cancel
            </button>
          </>
        )}
      </div>
    </div>
  )
}
