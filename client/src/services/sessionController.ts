import { createSocketService } from "./socketService"
import { createRecorderService } from "./recorderService"
import { createVADService } from "./vadService"
import { initMSE, setOnPlaybackEnd, signalEndOfStream, handleAudioChunk, flushBuffer } from "./audioPlayerService"

type SessionMessage = {
  type: string
  text?: string
  ends_at?: number
  questions_asked?: number
  question_cap?: number
  message?: string
  id?: string
}

export function createSessionController(sessionId: string, onMessage: (data: SessionMessage) => void) {
  let socket: ReturnType<typeof createSocketService> | null = null
  let mediaRecorder: ReturnType<typeof createRecorderService> | null = null
  let vad: ReturnType<typeof createVADService> | null = null
  let stream: MediaStream | null = null

  let isAISpeaking = false
  let isInterviewActive = false
  let closing = false
  let turnHadAudio = false
  let silenceTimer: ReturnType<typeof setTimeout> | null = null

  function armListening() {
    if (!isInterviewActive || closing || isAISpeaking) return
    if (mediaRecorder?.getState() === "inactive" || mediaRecorder?.getState() === null) {
      mediaRecorder?.start()
    }
  }

  async function getStream(): Promise<MediaStream> {
    if (!stream) {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true }
      })
    }
    return stream
  }

  async function start() {
    isInterviewActive = true
    isAISpeaking = true
    closing = false
    turnHadAudio = false

    const audioStream = await getStream()
    initMSE()

    socket = createSocketService(sessionId, {
      onMessage: (data) => {
        onMessage(data)
        if (data.type === "ai_turn_complete" && !turnHadAudio) {
          isAISpeaking = false
          armListening()
        }
        if (data.type === "ai_turn_complete") {
          turnHadAudio = false
        }
        if (data.type === "session_ended") {
          closing = true
          isInterviewActive = false
          vad?.stop()
          socket?.disconnect()
          signalEndOfStream()
        }
      },
      onAudioChunk: (chunk) => {
        turnHadAudio = true
        isAISpeaking = true
        handleAudioChunk(chunk)
      },
    })
    await socket.connect()

    mediaRecorder = createRecorderService(audioStream, {
      onCommit: (blob) => {
        socket!.send(blob)
        socket!.sendJson({ type: "end" })
      },
      onStop: () => {
        if (!isInterviewActive) {
          socket?.sendJson({ type: "stop" })
          return
        }
        if (closing) {
          socket?.sendJson({ type: "time_up" })
          return
        }
        if (!isAISpeaking) {
          mediaRecorder!.start()
        }
      },
    })

    const vadCallbacks = {
      onSpeakingStart: () => {
        if (silenceTimer) {
          clearTimeout(silenceTimer)
          silenceTimer = null
          return
        }

        if (!isAISpeaking) return
        flushBuffer()
        socket!.sendJson({ type: "barge_in" })
        isAISpeaking = false
        if (mediaRecorder!.getState() !== "recording") mediaRecorder!.start()
      },
      onSpeakingEnd: () => {
        const isRecording = mediaRecorder?.getState() === "recording"
        if (socket?.isOpen() && !isAISpeaking && isRecording && !closing) {
          if (silenceTimer) clearTimeout(silenceTimer)

          silenceTimer = setTimeout(() => {
            mediaRecorder!.stop()
            silenceTimer = null
          }, 2000)
        }
      },
    }

    if (!vad) {
      vad = createVADService(audioStream, vadCallbacks)
    } else {
      vad.updateCallbacks(vadCallbacks)
    }

    setOnPlaybackEnd(() => {
      isAISpeaking = false
      armListening()
    })
  }

  function timeUp() {
    closing = true
    if (mediaRecorder?.getState() === "recording") {
      mediaRecorder.stop()
      return
    }
    socket?.sendJson({ type: "time_up" })
  }

  function stop() {
    isInterviewActive = false
    const recording = mediaRecorder?.getState() === "recording"
    mediaRecorder?.stop()
    vad?.stop()
    vad = null

    if (!recording) {
      socket?.sendJson({ type: "stop" })
    }
  }

  return { start, stop, timeUp }
}
