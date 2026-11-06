import { useRef } from "react"
import { createSessionController } from "../services/sessionController"

type SessionMessage = {
  type: string
  text?: string
  ends_at?: number
  questions_asked?: number
  question_cap?: number
  message?: string
  id?: string
}

function useInterview(sessionId: string, onMessage: (data: SessionMessage) => void) {
  const controllerRef = useRef<ReturnType<typeof createSessionController> | null>(null)

  const startInterview = async () => {
    if (!controllerRef.current) {
      controllerRef.current = createSessionController(sessionId, onMessage)
    }
    await controllerRef.current.start()
  }

  const stopInterview = () => {
    controllerRef.current?.stop()
  }

  const timeUp = () => {
    controllerRef.current?.timeUp()
  }

  return { startInterview, stopInterview, timeUp }
}

export default useInterview
