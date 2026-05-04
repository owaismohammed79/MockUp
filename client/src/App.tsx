import useInterview from "./hooks/useInterview"

function App() {
    const [status, setStatus] = useState<"idle" | "active">("idle")


  const handleMessage = (data) => {
    if(data.type === "transcript") {
      console.log("Transcript:", data.text)
    }

    if(data.type === "llm_text") {
      console.log("LLM:", data.text)
    }
  }

  const {startInterview, stopInterview } = useInterview(handleMessage)

  const handleStart = async () => {
    try {
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
      <button onClick={handleStart} disabled={status === "active"}>Start</button>
      <button onClick={handleStop} disabled={status === "idle"}>Stop</button>
    </>
  )
}

export default App