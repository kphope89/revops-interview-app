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

// Each segment is this long before being sent to Whisper.
// Longer = more context for Whisper, but more latency.
const SEGMENT_DURATION_MS = 7000

export function useSpeechRecognition(): UseSpeechRecognitionReturn {
  const [status, setStatus] = useState<SpeechStatus>('idle')
  const [transcript, setTranscript] = useState('')
  const [interimTranscript, setInterimTranscript] = useState('')
  const [finalTranscripts, setFinalTranscripts] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)

  const streamRef = useRef<MediaStream | null>(null)
  const recorderRef = useRef<MediaRecorder | null>(null)
  const segmentTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const mimeTypeRef = useRef('audio/webm')
  const isActiveRef = useRef(false)
  const isTranscribingRef = useRef(false)

  // FileReader-based base64 — reliably handles large buffers
  const blobToBase64 = (blob: Blob): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve((reader.result as string).split(',')[1])
      reader.onerror = reject
      reader.readAsDataURL(blob)
    })

  const transcribeBlob = useCallback(async (blob: Blob) => {
    if (isTranscribingRef.current) return
    isTranscribingRef.current = true
    setInterimTranscript('Transcribing...')

    try {
      const base64 = await blobToBase64(blob)
      const result = await window.electronAPI.transcribeAudio(base64, 'audio/webm')
      if (result.success && result.text?.trim()) {
        const text = result.text.trim()
        setTranscript((prev) => (prev ? prev + ' ' + text : text))
        setFinalTranscripts((prev) => [...prev, text])
        setError(null)
      } else if (!result.success && result.error) {
        setError(result.error)
      }
    } catch (e) {
      setError(`Transcription error: ${String(e)}`)
    } finally {
      isTranscribingRef.current = false
      setInterimTranscript('')
    }
  }, [])

  // Use a ref so onstop can call the latest version without stale closure
  const startSegmentRef = useRef<() => void>(() => {})

  startSegmentRef.current = () => {
    if (!streamRef.current || !isActiveRef.current) return

    const mimeType = mimeTypeRef.current
    const chunks: Blob[] = []
    const recorder = new MediaRecorder(streamRef.current, { mimeType })
    recorderRef.current = recorder

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.push(e.data)
    }

    recorder.onstop = () => {
      // All chunks together form one complete, valid WebM file
      const blob = new Blob(chunks, { type: mimeType })
      if (blob.size >= 1000) {
        transcribeBlob(blob) // fire and forget — chain continues independently
      }
      // Immediately start the next segment (no gap in recording)
      if (isActiveRef.current && streamRef.current) {
        startSegmentRef.current()
      }
    }

    // Collect everything until stop() — no timeslice means the first
    // ondataavailable call includes the WebM header + all data
    recorder.start()

    // Schedule stop after SEGMENT_DURATION_MS
    if (segmentTimerRef.current) clearTimeout(segmentTimerRef.current)
    segmentTimerRef.current = setTimeout(() => {
      if (recorder.state === 'recording') {
        recorder.stop()
      }
    }, SEGMENT_DURATION_MS)
  }

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

      mimeTypeRef.current = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : 'audio/ogg'

      startSegmentRef.current()
      setStatus('listening')
      setError(null)
    } catch {
      setError(
        'Microphone access denied. Go to System Settings → Privacy & Security → Microphone and enable access for Electron.'
      )
      setStatus('error')
    }
  }, [])

  const stop = useCallback(() => {
    isActiveRef.current = false

    if (segmentTimerRef.current) {
      clearTimeout(segmentTimerRef.current)
      segmentTimerRef.current = null
    }

    if (recorderRef.current && recorderRef.current.state !== 'inactive') {
      recorderRef.current.onstop = null // don't chain into a new segment
      recorderRef.current.stop()
    }
    recorderRef.current = null

    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null

    setStatus('idle')
    setInterimTranscript('')
  }, [])

  const pause = useCallback(() => {
    isActiveRef.current = false

    if (segmentTimerRef.current) {
      clearTimeout(segmentTimerRef.current)
      segmentTimerRef.current = null
    }

    if (recorderRef.current && recorderRef.current.state !== 'inactive') {
      recorderRef.current.onstop = null // don't chain into a new segment
      recorderRef.current.stop()
    }
    recorderRef.current = null

    setStatus('paused')
    setInterimTranscript('')
  }, [])

  const resume = useCallback(async () => {
    if (streamRef.current) {
      isActiveRef.current = true
      startSegmentRef.current()
      setStatus('listening')
    } else {
      await start()
    }
  }, [start])

  const clearTranscripts = useCallback(() => {
    setTranscript('')
    setInterimTranscript('')
    setFinalTranscripts([])
  }, [])

  useEffect(() => {
    return () => {
      isActiveRef.current = false
      if (segmentTimerRef.current) clearTimeout(segmentTimerRef.current)
      if (recorderRef.current?.state !== 'inactive') recorderRef.current?.stop()
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
