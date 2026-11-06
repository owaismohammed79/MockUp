import { useEffect, useRef, useState } from "react"
import { useParams } from "react-router"
import useInterview from "../hooks/useInterview"
import { fetchSession, type SessionView } from "../services/sessionApi"

type Line = { speaker: "you" | "interviewer"; text: string }

function formatRemaining(ms: number) {
  const total = Math.max(0, Math.ceil(ms / 1000))
  const minutes = Math.floor(total / 60)
  const seconds = total % 60
  return `${minutes}:${seconds.toString().padStart(2, "0")}`
}

const trackLabel: Record<string, string> = {
  frontend: "Frontend (React)",
  backend: "Backend",
  sde: "SDE",
}

export default function InterviewPage() {
  const { sessionId = "" } = useParams()
  const [session, setSession] = useState<SessionView | null>(null)
  const [lines, setLines] = useState<Line[]>([])
  const [error, setError] = useState("")
  const [ended, setEnded] = useState(false)
  const [remainingMs, setRemainingMs] = useState<number | null>(null)
  const [questionsAsked, setQuestionsAsked] = useState(0)
  const endsAtRef = useRef<number | null>(null)
  const streaming = useRef(false)
  const timedOut = useRef(false)
  const timeUpRef = useRef<() => void>(() => {})

  const onMessage = (data: { type: string; text?: string; ends_at?: number | null; questions_asked?: number; message?: string }) => {
    if (data.type === "session" && data.ends_at) {
      endsAtRef.current = data.ends_at * 1000
      setRemainingMs(endsAtRef.current - Date.now())
    }
    if (typeof data.questions_asked === "number") {
      setQuestionsAsked(data.questions_asked)
    }
    if (data.type === "error") {
      setError(data.message || "The interview could not start.")
    }
    if (data.type === "session_ended") {
      setEnded(true)
    }
    if (data.type === "transcript" && data.text) {
      streaming.current = false
      setLines((prev) => [...prev, { speaker: "you", text: data.text as string }])
    }
    if (data.type === "llm_text" && data.text) {
      setLines((prev) => {
        if (streaming.current && prev.at(-1)?.speaker === "interviewer") {
          const next = prev.slice()
          const last = next[next.length - 1]
          next[next.length - 1] = { speaker: "interviewer", text: last.text + data.text }
          return next
        }
        streaming.current = true
        return [...prev, { speaker: "interviewer", text: data.text as string }]
      })
    }
    if (data.type === "ai_turn_complete") {
      streaming.current = false
    }
  }

  const { startInterview, stopInterview, timeUp } = useInterview(sessionId, onMessage)
  timeUpRef.current = timeUp

  useEffect(() => {
    let ignore = false
    fetchSession(sessionId)
      .then((view) => {
        if (ignore) return
        setSession(view)
        setQuestionsAsked(view.questions_asked)
        if (view.status === "ended") setEnded(true)
        if (view.ends_at) {
          endsAtRef.current = view.ends_at * 1000
          setRemainingMs(endsAtRef.current - Date.now())
        }
      })
      .catch(() => {
        if (!ignore) setError("This session does not exist.")
      })
    return () => { ignore = true }
  }, [sessionId])

  const startRef = useRef(startInterview)
  const stopRef = useRef(stopInterview)
  startRef.current = startInterview
  stopRef.current = stopInterview

  useEffect(() => {
    if (!session || session.status === "ended") return
    let started = false
    let cancelled = false
    const timer = window.setTimeout(() => {
      if (cancelled) return
      started = true
      startRef.current().catch(() => setError("Microphone or connection failed."))
    }, 100)
    return () => {
      cancelled = true
      window.clearTimeout(timer)
      if (started) stopRef.current()
    }
  }, [session])

  useEffect(() => {
    const timer = window.setInterval(() => {
      if (endsAtRef.current == null || ended) return
      const left = endsAtRef.current - Date.now()
      setRemainingMs(left)
      if (left <= 0 && !timedOut.current) {
        timedOut.current = true
        timeUpRef.current()
      }
    }, 250)
    return () => window.clearInterval(timer)
  }, [ended])

  const title = session?.kind === "resume"
    ? "Resume interview"
    : trackLabel[session?.track || ""] || "Interview"

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-5 px-4 py-10">
      <div>
        <p className="text-xs uppercase tracking-wide text-stone-500">Session</p>
        <h1 className="text-2xl font-semibold text-stone-900">{title}</h1>
        <p className="mt-1 break-all font-mono text-xs text-stone-500">{sessionId}</p>
      </div>

      <div className="flex items-center justify-between rounded-md bg-stone-100 px-4 py-3">
        <span className="text-sm text-stone-700">
          {questionsAsked > 0 && session ? `Question ${Math.min(questionsAsked, session.question_cap)} of ${session.question_cap}` : "Waiting for the first question"}
        </span>
        <span className="font-mono text-lg">{remainingMs == null ? "--:--" : formatRemaining(remainingMs)}</span>
      </div>

      <div className="flex min-h-48 flex-col gap-3">
        {lines.map((line, index) => (
          <p key={index} className="text-sm leading-6 text-stone-800">
            <span className="font-semibold">{line.speaker === "interviewer" ? "Interviewer" : "You"}: </span>
            {line.text}
          </p>
        ))}
        {lines.length === 0 && !ended && <p className="text-sm text-stone-500">The interviewer is about to speak.</p>}
      </div>

      {error && <p className="text-sm font-medium text-red-700">{error}</p>}

      {ended ? (
        <p className="rounded-md bg-stone-100 px-4 py-3 text-sm text-stone-800">
          This session has ended. The results page is not ready yet. The session id above is how it will be found in history.
        </p>
      ) : (
        <button
          type="button"
          onClick={() => { stopInterview(); setEnded(true) }}
          className="rounded-md bg-stone-900 px-4 py-2 text-sm font-semibold text-white"
        >
          Stop
        </button>
      )}
    </div>
  )
}
