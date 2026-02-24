import { useState, useEffect, useRef, useCallback } from 'react'

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

export function useSpeechRecognition(): UseSpeechRecognitionReturn {
  const [status, setStatus] = useState<SpeechStatus>('idle')
  const [transcript, setTranscript] = useState('')
  const [interimTranscript, setInterimTranscript] = useState('')
  const [finalTranscripts, setFinalTranscripts] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)
  const recognitionRef = useRef<SpeechRecognition | null>(null)
  const isRunningRef = useRef(false)

  // Check support
  const SpeechRecognitionAPI =
    (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition

  useEffect(() => {
    if (!SpeechRecognitionAPI) {
      setStatus('unsupported')
      setError('Speech recognition is not supported in this environment.')
    }
    return () => {
      recognitionRef.current?.stop()
    }
  }, [])

  const createRecognition = useCallback(() => {
    if (!SpeechRecognitionAPI) return null

    const recognition = new SpeechRecognitionAPI()
    recognition.continuous = true
    recognition.interimResults = true
    recognition.lang = 'en-US'
    recognition.maxAlternatives = 1

    recognition.onstart = () => {
      isRunningRef.current = true
      setStatus('listening')
      setError(null)
    }

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interim = ''
      let newFinal = ''

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i]
        if (result.isFinal) {
          newFinal += result[0].transcript + ' '
        } else {
          interim += result[0].transcript
        }
      }

      if (newFinal) {
        const trimmed = newFinal.trim()
        setTranscript((prev) => (prev ? prev + ' ' + trimmed : trimmed))
        setFinalTranscripts((prev) => [...prev, trimmed])
      }
      setInterimTranscript(interim)
    }

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      const msg = event.error === 'no-speech'
        ? 'No speech detected. Continuing to listen...'
        : `Speech recognition error: ${event.error}`
      if (event.error !== 'no-speech') {
        setError(msg)
        setStatus('error')
      }
    }

    recognition.onend = () => {
      setInterimTranscript('')
      // Auto-restart if we're supposed to still be listening
      if (isRunningRef.current) {
        try {
          recognition.start()
        } catch {
          // already started
        }
      } else {
        setStatus('idle')
      }
    }

    return recognition
  }, [SpeechRecognitionAPI])

  const start = useCallback(() => {
    if (!SpeechRecognitionAPI) return

    // Explicitly request mic access via getUserMedia first.
    // This is what triggers the macOS permission dialog — without it the OS
    // never shows the prompt and Web Speech API silently fails with "network".
    navigator.mediaDevices.getUserMedia({ audio: true })
      .then((stream) => {
        // Release the stream immediately — we only needed the permission grant
        stream.getTracks().forEach((track) => track.stop())

        recognitionRef.current?.stop()
        const recognition = createRecognition()
        if (!recognition) return
        recognitionRef.current = recognition
        isRunningRef.current = true
        try {
          recognition.start()
        } catch (e) {
          setError(String(e))
          setStatus('error')
        }
      })
      .catch(() => {
        setError('Microphone access denied. Go to System Settings → Privacy & Security → Microphone and enable access for Electron.')
        setStatus('error')
      })
  }, [createRecognition, SpeechRecognitionAPI])

  const stop = useCallback(() => {
    isRunningRef.current = false
    recognitionRef.current?.stop()
    recognitionRef.current = null
    setStatus('idle')
    setInterimTranscript('')
  }, [])

  const pause = useCallback(() => {
    isRunningRef.current = false
    recognitionRef.current?.stop()
    setStatus('paused')
    setInterimTranscript('')
  }, [])

  const resume = useCallback(() => {
    if (!SpeechRecognitionAPI) return
    const recognition = createRecognition()
    if (!recognition) return
    recognitionRef.current = recognition
    isRunningRef.current = true
    try {
      recognition.start()
    } catch (e) {
      setError(String(e))
      setStatus('error')
    }
  }, [createRecognition, SpeechRecognitionAPI])

  const clearTranscripts = useCallback(() => {
    setTranscript('')
    setInterimTranscript('')
    setFinalTranscripts([])
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
