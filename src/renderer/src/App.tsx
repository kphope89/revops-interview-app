import { useState, useEffect } from 'react'
import { AppScreen, JobContext, Settings, PrepKitState } from './types'
import JobSetup from './components/JobSetup'
import InterviewScreen from './components/InterviewScreen'
import SettingsScreen from './components/Settings'
import PrepKitScreen from './components/PrepKitScreen'
import Header from './components/Header'
import { getKnowledgeContext, buildUserKnowledgeSection } from './data/revops-knowledge'
import { buildProfileSection } from './data/buildProfileSection'

export default function App() {
  const [screen, setScreen] = useState<AppScreen>('setup')
  const [jobContext, setJobContext] = useState<JobContext | null>(null)
  const [savedJob, setSavedJob] = useState<JobContext | null>(null)
  const [settings, setSettings] = useState<Settings>({ apiKey: '', model: 'claude-sonnet-4-6', resume: '', openaiApiKey: '', toneMode: 'conversational' })
  const [hasApiKey, setHasApiKey] = useState(false)
  const [prepKitState, setPrepKitState] = useState<PrepKitState>({ status: 'idle', kit: null })

  useEffect(() => {
    window.electronAPI.getSettings().then((s) => {
      setSettings(s)
      setHasApiKey(!!s.apiKey)
    })
    window.electronAPI.getSavedJobContext().then((j) => {
      if (j) setSavedJob(j)
    })
  }, [])

  const handleSettingsSave = (newSettings: Settings) => {
    setSettings(newSettings)
    setHasApiKey(!!newSettings.apiKey)
    window.electronAPI.saveSettings(newSettings)
    setScreen('setup')
  }

  const handleStartInterview = (job: JobContext) => {
    setJobContext(job)
    setSavedJob(job)
    window.electronAPI.saveJobContext(job)
    setPrepKitState({ status: 'idle', kit: null })
    setScreen('prep')
  }

  const handleGoLive = () => {
    setScreen('interview')
  }

  const handlePrepBack = () => {
    setScreen('setup')
  }

  const handleGeneratePrepKit = async (spotlightIds: string[]) => {
    if (!jobContext) return
    setPrepKitState({ status: 'loading', kit: null })
    try {
      const profile = await window.electronAPI.getProfile()
      const knowledgeItems = await window.electronAPI.getKnowledgeItems()
      const profileSection = buildProfileSection(profile)
      const knowledgeContext =
        getKnowledgeContext() +
        buildUserKnowledgeSection(knowledgeItems) +
        (profileSection ? '\n\n' + profileSection : '')

      const spotlightItems = knowledgeItems
        .filter((item) => spotlightIds.includes(item.id))
        .map((item) => ({ title: item.title, type: item.type, content: item.content }))

      const result = await window.electronAPI.generatePrepKit({
        jobDescription: `${jobContext.title} at ${jobContext.company}\n\n${jobContext.description}`,
        knowledgeContext,
        resume: profile.resume || settings.resume || '',
        profileSection,
        spotlightItems: spotlightItems.length > 0 ? spotlightItems : undefined
      })

      if (result.success && result.kit) {
        setPrepKitState({ status: 'ready', kit: result.kit })
      } else {
        setPrepKitState({ status: 'error', kit: null, error: result.error })
      }
    } catch (err) {
      setPrepKitState({ status: 'error', kit: null, error: String(err) })
    }
  }

  const handleEndInterview = () => {
    setScreen('setup')
  }

  return (
    <div className="flex flex-col h-screen bg-surface-0 text-slate-100 overflow-hidden">
      <Header
        screen={screen}
        onSettings={() => setScreen('settings')}
        onBack={() => screen === 'prep' ? handlePrepBack() : setScreen('setup')}
        hasApiKey={hasApiKey}
      />

      <main className="flex-1 overflow-hidden">
        {screen === 'setup' && (
          <JobSetup
            onStart={handleStartInterview}
            onSettings={() => setScreen('settings')}
            hasApiKey={hasApiKey}
            initialJob={savedJob}
          />
        )}
        {screen === 'prep' && jobContext && (
          <PrepKitScreen
            jobContext={jobContext}
            prepKitState={prepKitState}
            onGenerate={handleGeneratePrepKit}
            onGoLive={handleGoLive}
            onBack={handlePrepBack}
          />
        )}
        {screen === 'interview' && jobContext && (
          <InterviewScreen
            jobContext={jobContext}
            settings={settings}
            onEnd={handleEndInterview}
            prepKit={prepKitState.kit}
          />
        )}
        {screen === 'settings' && (
          <SettingsScreen
            settings={settings}
            onSave={handleSettingsSave}
            onCancel={() => setScreen('setup')}
          />
        )}
      </main>
    </div>
  )
}
