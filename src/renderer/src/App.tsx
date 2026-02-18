import { useState, useEffect } from 'react'
import { AppScreen, JobContext, Settings } from './types'
import JobSetup from './components/JobSetup'
import InterviewScreen from './components/InterviewScreen'
import SettingsScreen from './components/Settings'
import Header from './components/Header'

export default function App() {
  const [screen, setScreen] = useState<AppScreen>('setup')
  const [jobContext, setJobContext] = useState<JobContext | null>(null)
  const [settings, setSettings] = useState<Settings>({ apiKey: '', model: 'claude-opus-4-5' })
  const [hasApiKey, setHasApiKey] = useState(false)

  useEffect(() => {
    // Load persisted settings on startup
    window.electronAPI.getSettings().then((s) => {
      setSettings(s)
      setHasApiKey(!!s.apiKey)
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
    setScreen('interview')
  }

  const handleEndInterview = () => {
    setScreen('setup')
  }

  return (
    <div className="flex flex-col h-screen bg-surface-0 text-slate-100 overflow-hidden">
      <Header
        screen={screen}
        onSettings={() => setScreen('settings')}
        onBack={() => setScreen('setup')}
        hasApiKey={hasApiKey}
      />

      <main className="flex-1 overflow-hidden">
        {screen === 'setup' && (
          <JobSetup
            onStart={handleStartInterview}
            onSettings={() => setScreen('settings')}
            hasApiKey={hasApiKey}
          />
        )}
        {screen === 'interview' && jobContext && (
          <InterviewScreen
            jobContext={jobContext}
            settings={settings}
            onEnd={handleEndInterview}
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
