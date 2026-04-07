import { useRef } from "react";
import { useMicVAD } from "@ricky0123/vad-react"
//import * as ort from "onnxruntime-web"

//ort.env.wasm.wasmPaths = "https://cdn.jsdelivr.net/npm/onnxruntime-web/dist/"

function useRecorder(onMessage, onAudio) {
  const mediaRecorderRef = useRef(null)
  const socketRef = useRef(null)

  const vad = useMicVAD({
    baseAssetPath: "/vad/",
    onnxWASMBasePath: "/onnx/",
    minSpeechMs: 300,
    redemptionMs: 1400,
    onSpeechEnd: () => {
      if (socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ type: "end" }))
      }
    }
  })

  async function startRecording() {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })

    const socket = new WebSocket("ws://localhost:8000/ws/interview")
    socketRef.current = socket

    socket.onopen = () => {
      const recorder = new MediaRecorder(stream, {mimeType: "audio/webm"})
      mediaRecorderRef.current = recorder

      recorder.ondataavailable = (event) => {
        if(event.data.size > 0 && socketRef.current?.readyState === WebSocket.OPEN) {
          socket.send(event.data)
        }
      }

      recorder.onerror = (event) => {
        console.error(`error recording stream: ${event.error.name}`)
      }

      recorder.start(250)
      vad.start()
    };

    socket.onmessage = async(event) => {
      if (typeof event.data === "string") {
        const data = JSON.parse(event.data)
        onMessage(data)
      }
      else {
        onAudio(event.data)
      }
    };

    socket.onerror = (e) => console.error(e)
  }

  function stopRecording() {
    mediaRecorderRef.current?.stop()
    socketRef.current?.send(JSON.stringify({ type: "end" }))
    vad.pause()
  }

  return { startRecording, stopRecording }
}

export default useRecorder