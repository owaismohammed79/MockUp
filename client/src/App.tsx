import useRecorder from "./hooks/useRecorder"
import uploadAudio from "./utils/uploadAudio"

function App() {
  const { startRecording, stopRecording } = useRecorder()

  const handleSubmit = async () => {
    const blob = await stopRecording()
    const res = await uploadAudio(blob)
    console.log(res)
  }

  return (
    <>
      <button onClick={startRecording}>Start</button>
      <button onClick={handleSubmit}>Submit</button>
    </>
  )
}

export default App