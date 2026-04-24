import { useState } from "react"
import useInterview from "./hooks/useInterview"

function App() {
  const [status, setStatus] = useState("idle")

  const handleMessage = (data) => {
    if(data.type === "transcript") {
      console.log("Transcript:", data.text)
    }

    if(data.type === "llm_text") {
      console.log("LLM:", data.text)
    }
  }

  const {startInterview, stopInterview, calibrateMic} = useInterview(handleMessage)

  const handleStart = async () => {
    try {
      setStatus("calibrating")
      await calibrateMic()
      
      setStatus("active")
      await startInterview() 
    } catch (err) {
      console.error("Failed to start:", err)
      setStatus("idle")
    }
  }

  const handleStop = () => {
    stopInterview()
    setStatus("idle")
  }

  return (
    <>
      {status === "calibrating" ? <p>Calibrating Mic, please wait...</p> : null}
      <button onClick={handleStart}>Start</button>
      <button onClick={handleStop}>Stop</button>
    </>
  )
}

export default App