import { useState, useEffect, useRef } from 'react'
import { AnalyzedQuestion, QuestionAnalysis } from '../types'
import { extractStreamingResponse } from '../utils/extractStreamingResponse'

export default function TeleprompterWindow() {
  const [question, setQuestion] = useState<AnalyzedQuestion | null>(null)
  const [streamingText, setStreamingText] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const [analysis, setAnalysis] = useState<QuestionAnalysis | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [fontSize, setFontSize] = useState(24)
  // 0 = off, 1 = slow, 2 = medium, 3 = fast
  const [scrollSpeed, setScrollSpeed] = useState(0)

  const scrollRef = useRef<HTMLDivElement>(null)
  const scrollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const currentRequestIdRef = useRef<string | null>(null)

  // Register IPC listeners
  useEffect(() => {
    const api = (window as unknown as { electronAPI: TeleprompterAPI }).electronAPI

    api.onTeleprompterQuestion((data) => {
      const q = data as AnalyzedQuestion | null
      setQuestion(q)
      if (q?.analysis) {
        setAnalysis(q.analysis)
        setStreamingText('')
        setIsStreaming(false)
        setError(null)
      } else if (q?.isLoading) {
        setAnalysis(null)
        setStreamingText(q.streamingText ?? '')
        setIsStreaming(true)
        setError(null)
        currentRequestIdRef.current = q.id
      } else {
        setAnalysis(null)
        setStreamingText('')
        setIsStreaming(false)
        setError(q?.error ?? null)
      }
    })

    api.onTeleprompterChunk(({ requestId, delta }) => {
      if (currentRequestIdRef.current && requestId !== currentRequestIdRef.current) return
      setIsStreaming(true)
      setStreamingText((prev) => prev + delta)
    })

    api.onTeleprompterDone(({ requestId, fullText }) => {
      if (currentRequestIdRef.current && requestId !== currentRequestIdRef.current) return
      setIsStreaming(false)
      try {
        const jsonMatch = fullText.match(/\{[\s\S]*\}/)
        if (!jsonMatch) throw new Error('No JSON found')
        const parsed = JSON.parse(jsonMatch[0]) as QuestionAnalysis
        setAnalysis(parsed)
        setStreamingText('')
      } catch {
        setError('Could not parse response')
      }
    })

    api.onTeleprompterError(({ requestId, error: err }) => {
      if (currentRequestIdRef.current && requestId !== currentRequestIdRef.current) return
      setIsStreaming(false)
      setError(err)
    })

    return () => {
      api.removeTeleprompterListeners()
    }
  }, [])

  // Auto-scroll — interval varies by speed (ms per 1px tick)
  const SCROLL_INTERVALS = [0, 120, 60, 25] // off, slow, medium, fast
  useEffect(() => {
    if (scrollIntervalRef.current) clearInterval(scrollIntervalRef.current)
    const interval = SCROLL_INTERVALS[scrollSpeed]
    if (interval > 0 && scrollRef.current) {
      scrollIntervalRef.current = setInterval(() => {
        if (scrollRef.current) scrollRef.current.scrollTop += 1
      }, interval)
    }
    return () => {
      if (scrollIntervalRef.current) clearInterval(scrollIntervalRef.current)
    }
  }, [scrollSpeed])

  const handleClose = () => {
    const api = (window as unknown as { electronAPI: TeleprompterAPI }).electronAPI
    api.closeTeleprompter()
  }

  const liveResponse = isStreaming ? extractStreamingResponse(streamingText) : null
  const responseText = analysis?.suggestedResponse ?? liveResponse ?? ''
  const questionText = question?.question ?? ''

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        background: 'rgba(8, 12, 24, 0.92)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        color: '#e2e8f0',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        userSelect: 'none',
        borderRadius: '12px',
        overflow: 'hidden',
        border: '1px solid rgba(255,255,255,0.06)',
      }}
    >
      {/* ── Drag handle / header ── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '6px 10px',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          flexShrink: 0,
          WebkitAppRegion: 'drag',
        } as React.CSSProperties}
      >
        {/* Left: logo + label */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <div
            style={{
              width: '18px',
              height: '18px',
              borderRadius: '5px',
              background: 'linear-gradient(135deg, #3b82f6 0%, #6366f1 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <svg width="9" height="9" viewBox="0 0 16 16" fill="none">
              <path d="M3 8.5L6.5 12L13 4" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <span style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#64748b' }}>
            Teleprompter
          </span>
        </div>

        {/* Right: controls — no-drag zone */}
        <div
          style={{ display: 'flex', alignItems: 'center', gap: '4px', WebkitAppRegion: 'no-drag' } as React.CSSProperties}
        >
          {/* Scroll speed cycle: Off → Slow → Med → Fast → Off */}
          <button
            onClick={() => setScrollSpeed((s) => (s + 1) % 4)}
            title="Cycle scroll speed"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '3px',
              padding: '3px 7px',
              borderRadius: '6px',
              border: scrollSpeed > 0 ? '1px solid rgba(59,130,246,0.5)' : '1px solid rgba(255,255,255,0.1)',
              background: scrollSpeed > 0 ? 'rgba(59,130,246,0.15)' : 'rgba(255,255,255,0.04)',
              color: scrollSpeed > 0 ? '#93c5fd' : '#64748b',
              fontSize: '10px',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.15s',
            }}
          >
            <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 14l-7 7m0 0l-7-7m7 7V3"/>
            </svg>
            {scrollSpeed === 0 ? 'Scroll' : scrollSpeed === 1 ? 'Slow' : scrollSpeed === 2 ? 'Med' : 'Fast'}
          </button>

          {/* Font size – */}
          <button
            onClick={() => setFontSize((s) => Math.max(14, s - 2))}
            title="Decrease font size"
            style={{
              width: '22px',
              height: '22px',
              borderRadius: '5px',
              border: '1px solid rgba(255,255,255,0.1)',
              background: 'rgba(255,255,255,0.04)',
              color: '#94a3b8',
              fontSize: '13px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              lineHeight: 1,
            }}
          >
            –
          </button>

          {/* Font size display */}
          <span style={{ fontSize: '10px', color: '#475569', minWidth: '22px', textAlign: 'center', fontVariantNumeric: 'tabular-nums' }}>
            {fontSize}
          </span>

          {/* Font size + */}
          <button
            onClick={() => setFontSize((s) => Math.min(40, s + 2))}
            title="Increase font size"
            style={{
              width: '22px',
              height: '22px',
              borderRadius: '5px',
              border: '1px solid rgba(255,255,255,0.1)',
              background: 'rgba(255,255,255,0.04)',
              color: '#94a3b8',
              fontSize: '13px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              lineHeight: 1,
            }}
          >
            +
          </button>

          {/* Close */}
          <button
            onClick={handleClose}
            title="Close teleprompter"
            style={{
              width: '22px',
              height: '22px',
              borderRadius: '5px',
              border: '1px solid rgba(255,255,255,0.1)',
              background: 'rgba(255,255,255,0.04)',
              color: '#64748b',
              fontSize: '13px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            ✕
          </button>
        </div>
      </div>

      {/* ── Question line ── */}
      {questionText && (
        <div
          style={{
            padding: '5px 12px',
            borderBottom: '1px solid rgba(255,255,255,0.04)',
            flexShrink: 0,
            overflow: 'hidden',
          }}
        >
          <p style={{
            fontSize: '10px',
            color: '#475569',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            margin: 0,
          }}>
            <span style={{ color: '#334155', fontWeight: 700, marginRight: '4px' }}>Q:</span>
            {questionText}
          </p>
        </div>
      )}

      {/* ── Response area ── */}
      <div
        ref={scrollRef}
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '12px 14px 16px',
          scrollbarWidth: 'thin',
          scrollbarColor: 'rgba(255,255,255,0.1) transparent',
        }}
      >
        {/* Loading dots */}
        {isStreaming && !liveResponse && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 0' }}>
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: '#3b82f6',
                  animation: 'bounce 1s infinite',
                  animationDelay: `${i * 0.2}s`,
                }}
              />
            ))}
            <span style={{ fontSize: '13px', color: '#475569' }}>Crafting your talk track…</span>
          </div>
        )}

        {/* Empty / no question state */}
        {!question && !isStreaming && (
          <p style={{ fontSize: '13px', color: '#334155', textAlign: 'center', marginTop: '20px' }}>
            Waiting for a question…
          </p>
        )}

        {/* Error */}
        {error && (
          <div style={{
            padding: '10px 12px',
            borderRadius: '8px',
            background: 'rgba(239,68,68,0.1)',
            border: '1px solid rgba(239,68,68,0.2)',
          }}>
            <p style={{ fontSize: '12px', color: '#f87171', margin: 0 }}>{error}</p>
          </div>
        )}

        {/* Response text */}
        {responseText && (
          <p
            style={{
              fontSize: `${fontSize}px`,
              lineHeight: 1.75,
              letterSpacing: '0.01em',
              color: '#f1f5f9',
              whiteSpace: 'pre-wrap',
              margin: 0,
              fontWeight: 400,
            }}
          >
            {responseText}
            {isStreaming && (
              <span
                style={{
                  display: 'inline-block',
                  width: '2px',
                  height: `${fontSize * 1.1}px`,
                  background: '#60a5fa',
                  marginLeft: '3px',
                  verticalAlign: 'middle',
                  animation: 'pulse 1s infinite',
                }}
              />
            )}
          </p>
        )}

      </div>

      {/* Keyframe styles injected inline */}
      <style>{`
        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-4px); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 2px; }
      `}</style>
    </div>
  )
}

// Minimal type for the API available in teleprompter window context
interface TeleprompterAPI {
  closeTeleprompter: () => void
  onTeleprompterQuestion: (cb: (data: unknown) => void) => void
  onTeleprompterChunk: (cb: (data: { requestId: string; delta: string }) => void) => void
  onTeleprompterDone: (cb: (data: { requestId: string; fullText: string }) => void) => void
  onTeleprompterError: (cb: (data: { requestId: string; error: string }) => void) => void
  removeTeleprompterListeners: () => void
}
