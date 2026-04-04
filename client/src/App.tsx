import useRecorder from "./hooks/useRecorder"
import { handleAudioChunk } from "./utils/audioPlayer"

function App() {
  const handleMessage = (data) => {
    if(data.type === "transcript") {
      console.log("Transcript:", data.text)
    }

    if(data.type === "llm_text") {
      console.log("LLM:", data.text)
    }
  }

  const {startRecording, stopRecording} = useRecorder(handleMessage, handleAudioChunk)

  return (
    <>
      <button onClick={startRecording}>Start</button>
      <button onClick={stopRecording}>Stop</button>
    </>
  )
}

export default App