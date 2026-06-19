import { useRef } from "react";
import { createSocketService } from "../utils/socketService"
import { createRecorderService } from "../utils/recorderService"
import { createVADService } from "../utils/vadService"
import { initMSE, setOnPlaybackEnd, signalEndOfStream, handleAudioChunk, flushBuffer } from "../utils/audioPlayer"

function useInterview(onMessage) {
  const socketRef = useRef(null)
  const mediaRecorderRef = useRef(null)
  const vadRef = useRef(null)
  const isAISpeakingRef = useRef(false)
  const streamRef = useRef(null)
  const isInterviewActiveRef = useRef(false)
  const silenceTimeRef = useRef(null)

  async function getStream() {
    if(!streamRef.current) {
      streamRef.current = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true }
      })
    }
    console.log("Stream found")
    return streamRef.current
  }


  async function startInterview() {
    isInterviewActiveRef.current = true
    isAISpeakingRef.current = false

    const stream = await getStream()
    initMSE()

    const socket = createSocketService({
      onMessage: (data) => {
        onMessage(data)
      },
      onAudioChunk: (chunk) => {
        isAISpeakingRef.current = true
        handleAudioChunk(chunk)
      },
    })
    socketRef.current = socket
    await socket.connect()

    console.log("Websocket connection established")

    const recorder = createRecorderService(stream, {
      onCommit: (blob) => {
        socket.send(blob)
        socket.sendJson({ type: "end" })
      },
      onStop: () => {
        if(!isInterviewActiveRef.current) return
        if(!isAISpeakingRef.current) {
          recorder.start()
        }
      },
    })
    mediaRecorderRef.current = recorder
    recorder.start()
    console.log("Recorder starting to record")

    const vadCallbacks = {
      onSpeakingStart: () => {
        if(silenceTimeRef.current) {
          clearTimeout(silenceTimeRef.current)
          silenceTimeRef.current = null
          console.log("User continued speaking")
          return
        }

        if(!isAISpeakingRef.current) return
        console.log("User tried to interrupt")
        flushBuffer()
        socketRef.current.sendJson({ type: "barge_in" })
        isAISpeakingRef.current = false
        if (mediaRecorderRef.current.getState() === "inactive") mediaRecorderRef.current.start()
      },
      onSpeakingEnd: () => {
        const isRecording = mediaRecorderRef.current?.getState() === "recording"
        if(socketRef.current?.isOpen() && !isAISpeakingRef.current && isRecording) {
          console.log("User quiet... waiting 2 secs to confirm")
          if(silenceTimeRef.current) clearTimeout(silenceTimeRef.current)
          
          silenceTimeRef.current = setTimeout(() => {
            console.log("Silence confirmed, stopping recorder")
            mediaRecorderRef.current.stop()
            silenceTimeRef.current = null
          }, 2000)
        }
      },
    }

    if(!vadRef.current) {
      vadRef.current = createVADService(stream, vadCallbacks)
    } else {
      vadRef.current.updateCallbacks(vadCallbacks)
    }

    setOnPlaybackEnd(() => {
      isAISpeakingRef.current = false
      if(mediaRecorderRef.current?.getState() === "inactive") {
        mediaRecorderRef.current.start()
      }
    })
  }

  function stopInterview() {
    isInterviewActiveRef.current = false
    mediaRecorderRef.current?.stop()
    vadRef.current?.stop()
    vadRef.current = null

    socketRef.current?.sendJson({ type: "end" })
    socketRef.current?.disconnect()
    signalEndOfStream()
  }

  return { startInterview, stopInterview }
}

export default useInterview