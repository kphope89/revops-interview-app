import { AppScreen } from '../types'

interface Props {
  screen: AppScreen
  onSettings: () => void
  onBack: () => void
  hasApiKey: boolean
}

export default function Header({ screen, onSettings, onBack, hasApiKey }: Props) {
  return (
    <header
      className="flex items-center justify-between px-5 py-2.5 border-b border-slate-800/80 select-none"
      style={{
        background: 'linear-gradient(180deg, #0d1424 0%, #0a0f1e 100%)',
        WebkitAppRegion: 'drag'
      } as React.CSSProperties}
    >
      {/* ── Brand ── */}
      <div
        className="flex items-center gap-3"
        style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
      >
        {/* Logo */}
        <div className="relative flex-shrink-0">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #3b82f6 0%, #6366f1 100%)' }}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M3 8.5L6.5 12L13 4" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          {screen === 'interview' && (
            <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-400 rounded-full border-2 border-[#0a0f1e] listening-dot" />
          )}
        </div>

        <div>
          <h1 className="text-sm font-semibold text-slate-100 leading-tight tracking-tight">
            RevOps Interview
          </h1>
          <p className="text-[10px] leading-tight font-medium"
            style={{ color: screen === 'interview' ? '#34d399' : '#475569' }}>
            {screen === 'interview' ? 'Live Session'
            : screen === 'settings' ? 'Settings'
            : screen === 'prep' ? 'Prep Kit'
            : 'AI Coach'}
          </p>
        </div>
      </div>

      {/* ── Nav actions ── */}
      <div
        className="flex items-center gap-2"
        style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
      >
        {/* API key warning */}
        {!hasApiKey && screen !== 'settings' && screen !== 'prep' && (
          <div className="flex items-center gap-1.5 text-xs text-amber-400 bg-amber-400/8 border border-amber-400/20 px-2.5 py-1 rounded-full">
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd"/>
            </svg>
            <span>API key required</span>
          </div>
        )}

        {/* End Interview button */}
        {screen === 'interview' && (
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 text-xs font-semibold text-slate-300 hover:text-red-300 bg-slate-800/80 hover:bg-red-500/10 border border-slate-700/60 hover:border-red-500/30 px-3 py-1.5 rounded-xl transition-all duration-150"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/>
            </svg>
            End Session
          </button>
        )}

        {/* Settings button */}
        {screen !== 'settings' && screen !== 'prep' && (
          <button
            onClick={onSettings}
            className="flex items-center gap-1.5 text-xs font-medium text-slate-400 hover:text-slate-100 bg-slate-800/60 hover:bg-slate-700/60 border border-slate-700/40 hover:border-slate-600 px-3 py-1.5 rounded-xl transition-all duration-150"
            title="Settings"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Settings
          </button>
        )}

        {/* Back button on settings or prep */}
        {(screen === 'settings' || screen === 'prep') && (
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 text-xs font-medium text-slate-400 hover:text-slate-100 bg-slate-800/60 hover:bg-slate-700/60 border border-slate-700/40 hover:border-slate-600 px-3 py-1.5 rounded-xl transition-all duration-150"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18"/>
            </svg>
            Back
          </button>
        )}
      </div>
    </header>
  )
}
