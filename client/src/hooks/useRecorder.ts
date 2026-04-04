import { useRef } from "react";

function useRecorder(onMessage, onAudio) {
  const mediaRecorderRef = useRef(null)
  const socketRef = useRef(null)

  async function startRecording() {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })

    const socket = new WebSocket("ws://localhost:8000/ws/interview")
    socketRef.current = socket

    socket.onopen = () => {
      const recorder = new MediaRecorder(stream, {mimeType: "audio/webm"})

      mediaRecorderRef.current = recorder

      recorder.ondataavailable = (event) => {
        if(event.data.size > 0 && socket.readyState === WebSocket.OPEN) {
          socket.send(event.data)
        }
      }

      recorder.onerror = (event) => {
        console.error(`error recording stream: ${event.error.name}`)
      }

      recorder.start(300)
    };

    socket.onmessage = async(event) => {
      // TEXT
      if (typeof event.data === "string") {
        const data = JSON.parse(event.data)
        onMessage(data)
      }
      // AUDIO
      else {
        onAudio(event.data)
      }
    };

    socket.onerror = (e) => console.error(e)
  }

  function stopRecording() {
    mediaRecorderRef.current?.stop()

    socketRef.current?.send(JSON.stringify({ type: "end" }))
  }

  return { startRecording, stopRecording }
}

export default useRecorder