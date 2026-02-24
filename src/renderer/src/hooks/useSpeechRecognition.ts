import { useState, useRef, useCallback, useEffect } from 'react'

export type SpeechStatus = 'idle' | 'listening' | 'paused' | 'error' | 'unsupported'

interface UseSpeechRecognitionReturn {
  status: SpeechStatus
  transcript: string
  interimTranscript: string
  finalTranscripts: string[]
  error: string | null
  start: () => void
  stop: () => void
  pause: () => void
  resume: () => void
  clearTranscripts: () => void
}

const CHUNK_INTERVAL_MS = 5000 // send audio to Whisper every 5 seconds

export function useSpeechRecognition(): UseSpeechRecognitionReturn {
  const [status, setStatus] = useState<SpeechStatus>('idle')
  const [transcript, setTranscript] = useState('')
  const [interimTranscript, setInterimTranscript] = useState('')
  const [finalTranscripts, setFinalTranscripts] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)

  const streamRef = useRef<MediaStream | null>(null)
  const recorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const mimeTypeRef = useRef('audio/webm')
  const isActiveRef = useRef(false)

  const blobToBase64 = async (blob: Blob): Promise<string> => {
    const arrayBuffer = await blob.arrayBuffer()
    const bytes = new Uint8Array(arrayBuffer)
    let binary = ''
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i])
    }
    return btoa(binary)
  }

  const drainAndTranscribe = useCallback(async () => {
    if (chunksRef.current.length === 0) return

    const chunks = chunksRef.current.splice(0)
    const blob = new Blob(chunks, { type: mimeTypeRef.current })

    if (blob.size < 1000) return // too small — likely silence or noise

    setInterimTranscript('▋')

    try {
      const base64 = await blobToBase64(blob)
      const result = await window.electronAPI.transcribeAudio(base64, 'audio/webm')
      if (result.success && result.text?.trim()) {
        const text = result.text.trim()
        setTranscript((prev) => (prev ? prev + ' ' + text : text))
        setFinalTranscripts((prev) => [...prev, text])
      } else if (!result.success && result.error) {
        if (result.error.includes('API key') || result.error.includes('401') || result.error.includes('OpenAI')) {
          setError(result.error)
        }
      }
    } catch {
      // Silent fail — individual chunk failures should not stop the session
    } finally {
      setInterimTranscript('')
    }
  }, [])

  const startInterval = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current)
    intervalRef.current = setInterval(() => {
      drainAndTranscribe()
    }, CHUNK_INTERVAL_MS)
  }, [drainAndTranscribe])

  const createRecorder = useCallback((stream: MediaStream) => {
    const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
      ? 'audio/webm;codecs=opus'
      : MediaRecorder.isTypeSupported('audio/webm')
      ? 'audio/webm'
      : 'audio/ogg'

    mimeTypeRef.current = mimeType
    chunksRef.current = []

    const recorder = new MediaRecorder(stream, { mimeType })
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data)
    }
    recorder.start(500) // emit data every 500ms
    return recorder
  }, [])

  const start = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: 16000,
          echoCancellation: true,
          noiseSuppression: true
        }
      })
      streamRef.current = stream
      isActiveRef.current = true

      recorderRef.current = createRecorder(stream)
      startInterval()
      setStatus('listening')
      setError(null)
    } catch {
      setError(
        'Microphone access denied. Go to System Settings → Privacy & Security → Microphone and enable access for Electron.'
      )
      setStatus('error')
    }
  }, [createRecorder, startInterval])

  const stop = useCallback(() => {
    isActiveRef.current = false

    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }

    if (recorderRef.current && recorderRef.current.state !== 'inactive') {
      recorderRef.current.stop()
    }
    recorderRef.current = null

    drainAndTranscribe()

    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
    chunksRef.current = []

    setStatus('idle')
    setInterimTranscript('')
  }, [drainAndTranscribe])

  const pause = useCallback(() => {
    isActiveRef.current = false

    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }

    if (recorderRef.current?.state === 'recording') {
      recorderRef.current.pause()
    }

    setStatus('paused')
    setInterimTranscript('')
  }, [])

  const resume = useCallback(async () => {
    if (streamRef.current && recorderRef.current?.state === 'paused') {
      recorderRef.current.resume()
      isActiveRef.current = true
      startInterval()
      setStatus('listening')
    } else {
      // Stream was released — start fresh
      await start()
    }
  }, [start, startInterval])

  const clearTranscripts = useCallback(() => {
    setTranscript('')
    setInterimTranscript('')
    setFinalTranscripts([])
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isActiveRef.current = false
      if (intervalRef.current) clearInterval(intervalRef.current)
      recorderRef.current?.stop()
      streamRef.current?.getTracks().forEach((t) => t.stop())
    }
  }, [])

  return {
    status,
    transcript,
    interimTranscript,
    finalTranscripts,
    error,
    start,
    stop,
    pause,
    resume,
    clearTranscripts
  }
}
