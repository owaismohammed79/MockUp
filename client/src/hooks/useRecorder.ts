import { useRef } from "react";
import hark from "hark";

function useRecorder(onMessage, onAudio) {
  const mediaRecorderRef = useRef(null)
  const socketRef = useRef(null)
  const harkRef = useRef(null)

  async function startRecording() {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })

    const socket = new WebSocket("ws://localhost:8000/ws/interview")
    socketRef.current = socket

    socket.onopen = () => {
      const recorder = new MediaRecorder(stream, { mimeType: "audio/webm" })
      mediaRecorderRef.current = recorder

      recorder.ondataavailable = (event) => {
        if(event.data.size > 0 && socketRef.current?.readyState === WebSocket.OPEN) {
          socketRef.current.send(event.data)
        }
      }

      recorder.onerror = (event) => {
        console.error(`error recording stream: ${event.error.name}`)
      }

      recorder.start(250)
    }

    const speech = hark(stream, {
        interval: 100,
        threshold: -50,
      });

      harkRef.current = speech

      speech.on("stopped_speaking", () => {
        if (socketRef.current?.readyState === WebSocket.OPEN) {
          socketRef.current.send(JSON.stringify({ type: "end" }))
        }
      })

    socket.onmessage = async(event) => {
      if(typeof event.data === "string") {
        const data = JSON.parse(event.data)
        onMessage(data)
      } else {
        onAudio(event.data)
      }
    };

    socket.onerror = (e) => console.error(e)
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