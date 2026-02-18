import { AppScreen } from '../types'

interface Props {
  screen: AppScreen
  onSettings: () => void
  onBack: () => void
  hasApiKey: boolean
}

export default function Header({ screen, onSettings, onBack, hasApiKey }: Props) {
  return (
    <header className="flex items-center justify-between px-5 py-3 bg-surface-1 border-b border-slate-700/50 select-none" style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}>
      <div className="flex items-center gap-3" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
        {/* Logo mark */}
        <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center font-bold text-sm text-white">
          RO
        </div>
        <div>
          <h1 className="text-sm font-semibold text-slate-100 leading-tight">RevOps Interview Assistant</h1>
          {screen === 'interview' && (
            <span className="text-xs text-emerald-400 font-medium">Live Session</span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
        {!hasApiKey && screen !== 'settings' && (
          <div className="flex items-center gap-1.5 text-xs text-amber-400 bg-amber-400/10 px-2.5 py-1 rounded-full">
            <span className="w-1.5 h-1.5 bg-amber-400 rounded-full"></span>
            API key required
          </div>
        )}

        {screen === 'interview' && (
          <button
            onClick={onBack}
            className="btn-secondary text-sm py-1.5 px-3"
          >
            End Interview
          </button>
        )}

        {screen !== 'settings' && (
          <button
            onClick={onSettings}
            className="btn-secondary text-sm py-1.5 px-3"
            title="Settings"
          >
            Settings
          </button>
        )}

        {screen === 'settings' && (
          <button
            onClick={onBack}
            className="btn-secondary text-sm py-1.5 px-3"
          >
            Back
          </button>
        )}
      </div>
    </header>
  )
}
