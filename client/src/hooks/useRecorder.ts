import { useRef } from "react";
import hark from "hark";
import { setOnPlaybackEnd } from "../utils/audioPlayer"

function useRecorder(onMessage, onAudio) {
  const mediaRecorderRef = useRef(null)
  const socketRef = useRef(null)
  const harkRef = useRef(null)
  const isAISpeakingRef = useRef(false)
  const chunksRef = useRef([])

  async function startRecording() {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })

    const socket = new WebSocket("ws://localhost:8000/ws/interview")
    socketRef.current = socket

    socket.onopen = () => {
      const recorder = new MediaRecorder(stream, { mimeType: "audio/webm" })
      mediaRecorderRef.current = recorder

      recorder.ondataavailable = (event) => {
        if(event.data.size > 0 && !isAISpeakingRef.current) {
          chunksRef.current.push(event.data)
        }
      }

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, {type: "audio/webm;codecs=opus"})
        chunksRef.current = []

        socketRef.current.send(blob)
        socketRef.current.send(JSON.stringify({ type: "end" }))

        if(!isAISpeakingRef.current) {
          recorder.start(250)
        }
      }

      recorder.onerror = (event) => {
        console.error(`error recording stream: ${event.error.name}`)
      }

      recorder.start(250)

      const speech = hark(stream, {
        interval: 100,
        threshold: -50,
      });

      harkRef.current = speech

      speech.on("stopped_speaking", () => {
        if (socketRef.current?.readyState === WebSocket.OPEN && !isAISpeakingRef.current && mediaRecorderRef.current?.state === "recording") {
          mediaRecorderRef.current.stop()
        }
      })
    }

    socket.onmessage = async(event) => {
      if(typeof event.data === "string") {
        const data = JSON.parse(event.data)
        onMessage(data)
      } else {
        //Audio chunk recieved, meaning AI is speaking
        isAISpeakingRef.current = true
        onAudio(event.data)
      }
    };

    socket.onerror = (e) => console.error(e)

    setOnPlaybackEnd(() => {
      isAISpeakingRef.current = false
      if(mediaRecorderRef.current?.state === "inactive") {
        mediaRecorderRef.current.start(250)
      }
    })
  }

  function stopRecording() {
    mediaRecorderRef.current?.stop()
    harkRef.current?.stop()
    harkRef.current = null
    socketRef.current?.send(JSON.stringify({ type: "end" }))
  }

  return { startRecording, stopRecording }
}

export default useRecorder