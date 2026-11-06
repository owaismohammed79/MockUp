import axios from "axios"

export type InterviewKind = "general" | "resume"
export type Track = "frontend" | "backend" | "sde"
export type Experience = "0-1" | "1-3" | "3-5" | "5+"
export type CompanyKind = "startup" | "mnc"
export type DurationMinutes = 3 | 5 | 7 | 10

export type SessionView = {
  id: string
  kind: InterviewKind
  track: Track | null
  experience: Experience | null
  company_kind: CompanyKind | null
  duration_minutes: DurationMinutes
  question_cap: number
  questions_asked: number
  status: "ready" | "live" | "ended"
  started_at: number | null
  ends_at: number | null
  turn_count: number
}

const api = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000"

export async function createSession(form: FormData): Promise<SessionView> {
  const result = await axios.post<SessionView>(`${api}/sessions`, form)
  return result.data
}

export async function fetchSession(sessionId: string): Promise<SessionView> {
  const result = await axios.get<SessionView>(`${api}/sessions/${sessionId}`)
  return result.data
}
