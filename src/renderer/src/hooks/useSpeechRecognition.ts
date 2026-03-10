import { useState, useRef, useCallback, useEffect } from 'react'

export type SpeechStatus = 'idle' | 'armed' | 'recording' | 'transcribing' | 'error'

interface UsePressAndHoldReturn {
  status: SpeechStatus
  error: string | null
  finalTranscripts: string[]
  arm: () => Promise<void>
  startHold: () => void
  stopHold: () => void
  disarm: () => void
  clearTranscripts: () => void
}

export function useSpeechRecognition(): UsePressAndHoldReturn {
  const [status, setStatus] = useState<SpeechStatus>('idle')
  const [finalTranscripts, setFinalTranscripts] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)

  const streamRef = useRef<MediaStream | null>(null)
  const recorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const mimeTypeRef = useRef('audio/webm')
  const statusRef = useRef<SpeechStatus>('idle')

  // Keep ref in sync for use inside callbacks without stale closure
  useEffect(() => { statusRef.current = status }, [status])

  const blobToBase64 = (blob: Blob): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve((reader.result as string).split(',')[1])
      reader.onerror = reject
      reader.readAsDataURL(blob)
    })

  // Arm the session: get mic access and keep the stream open for holds
  const arm = useCallback(async () => {
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
      mimeTypeRef.current = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : 'audio/ogg'
      setStatus('armed')
      setError(null)
    } catch {
      setError(
        'Microphone access denied. Go to System Settings → Privacy & Security → Microphone and enable access for Electron.'
      )
      setStatus('error')
    }
  }, [])

  // Begin recording on press
  const startHold = useCallback(() => {
    if (!streamRef.current || statusRef.current !== 'armed') return
    chunksRef.current = []
    const recorder = new MediaRecorder(streamRef.current, { mimeType: mimeTypeRef.current })
    recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data) }
    recorder.start()
    recorderRef.current = recorder
    setStatus('recording')
  }, [])

  // End recording on release, send to Whisper, return to armed
  const stopHold = useCallback(() => {
    if (!recorderRef.current || statusRef.current !== 'recording') return
    const recorder = recorderRef.current
    recorderRef.current = null
    setStatus('transcribing')

    recorder.onstop = async () => {
      const blob = new Blob(chunksRef.current, { type: mimeTypeRef.current })
      if (blob.size >= 500) {
        try {
          const base64 = await blobToBase64(blob)
          const result = await window.electronAPI.transcribeAudio(base64, 'audio/webm')
          if (result.success && result.text?.trim()) {
            setFinalTranscripts((prev) => [...prev, result.text.trim()])
          } else if (!result.success && result.error) {
            setError(result.error)
          }
        } catch (e) {
          setError(`Transcription error: ${String(e)}`)
        }
      }
      setStatus('armed')
    }

    recorder.stop()
  }, [])

  // Release mic and end session
  const disarm = useCallback(() => {
    if (recorderRef.current && recorderRef.current.state !== 'inactive') {
      recorderRef.current.onstop = null
      recorderRef.current.stop()
    }
    recorderRef.current = null
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
    setStatus('idle')
    setError(null)
  }, [])

  const clearTranscripts = useCallback(() => {
    setFinalTranscripts([])
  }, [])

  useEffect(() => {
    return () => {
      if (recorderRef.current?.state !== 'inactive') recorderRef.current?.stop()
      streamRef.current?.getTracks().forEach((t) => t.stop())
    }
  }, [])

  return { status, error, finalTranscripts, arm, startHold, stopHold, disarm, clearTranscripts }
}
