import { useState, type ReactNode } from "react"
import { useNavigate } from "react-router"
import axios from "axios"
import { createSession, type CompanyKind, type DurationMinutes, type Experience, type Track } from "../services/sessionApi"

type Kind = "general" | "resume"

const tracks: { value: Track; label: string }[] = [
  { value: "frontend", label: "Frontend (React)" },
  { value: "backend", label: "Backend" },
  { value: "sde", label: "SDE" },
]

const experienceOptions: { value: Experience; label: string }[] = [
  { value: "0-1", label: "0–1 years" },
  { value: "1-3", label: "1–3 years" },
  { value: "3-5", label: "3–5 years" },
  { value: "5+", label: "5+ years" },
]

const companies: { value: CompanyKind; label: string }[] = [
  { value: "startup", label: "Startup" },
  { value: "mnc", label: "MNC" },
]

const durations: DurationMinutes[] = [3, 5, 7, 10]
const JD_MIN = 200

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1 text-sm font-medium text-stone-800">
      {label}
      {children}
    </label>
  )
}

const selectClass = "rounded-md border border-stone-300 bg-white px-3 py-2 text-sm"

export default function SetupPage() {
  const navigate = useNavigate()
  const [kind, setKind] = useState<Kind>("general")
  const [track, setTrack] = useState<Track | "">("")
  const [experience, setExperience] = useState<Experience | "">("")
  const [companyKind, setCompanyKind] = useState<CompanyKind | "">("")
  const [duration, setDuration] = useState<DurationMinutes | "">("")
  const [jobDescription, setJobDescription] = useState("")
  const [resume, setResume] = useState<File | null>(null)
  const [error, setError] = useState("")
  const [submitting, setSubmitting] = useState(false)

  const jdLength = jobDescription.trim().length

  function onFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return
    const extension = file.name.split(".").pop()?.toLowerCase() || ""
    if (!["pdf", "docx"].includes(extension)) {
      setResume(null)
      setError("Upload the resume as a PDF or DOCX file.")
      event.target.value = ""
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      setResume(null)
      setError("Resume must be 5MB or smaller.")
      event.target.value = ""
      return
    }
    setResume(file)
    setError("")
  }

  function validate(): string {
    if (!duration) return "Choose a duration."
    if (kind === "general") {
      if (!track || !experience || !companyKind) return "Choose a track, experience, and company kind."
      return ""
    }
    if (!resume) return "Upload a resume."
    if (jdLength < JD_MIN) return `Job description needs at least ${JD_MIN} characters.`
    return ""
  }

  async function begin() {
    const problem = validate()
    if (problem) {
      setError(problem)
      return
    }
    setSubmitting(true)
    setError("")
    const form = new FormData()
    form.append("kind", kind)
    form.append("duration_minutes", String(duration))
    if (kind === "general") {
      form.append("track", track)
      form.append("experience", experience)
      form.append("company_kind", companyKind)
    } else {
      form.append("job_description", jobDescription.trim())
      form.append("resume", resume as File)
    }
    try {
      const session = await createSession(form)
      navigate(`/interviews/${session.id}`)
    } catch (err) {
      if (axios.isAxiosError(err)) {
        const detail = err.response?.data?.detail
        setError(typeof detail === "string" ? detail : "Could not start the interview.")
      } else {
        setError("Could not start the interview.")
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-6 px-4 py-10">
      <div>
        <h1 className="text-2xl font-semibold text-stone-900">Set up the interview</h1>
        <p className="mt-1 text-sm text-stone-600">The interviewer speaks first. Stop ends the session early.</p>
      </div>

      <div className="flex gap-2">
        {(["general", "resume"] as Kind[]).map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => { setKind(option); setError("") }}
            className={`rounded-full px-4 py-2 text-sm font-medium ${kind === option ? "bg-stone-900 text-white" : "bg-stone-200 text-stone-800"}`}
          >
            {option === "general" ? "General interview" : "Resume interview"}
          </button>
        ))}
      </div>

      {kind === "general" ? (
        <div className="flex flex-col gap-4">
          <Field label="Track">
            <select className={selectClass} value={track} onChange={(e) => setTrack(e.target.value as Track)}>
              <option value="">Select a track</option>
              {tracks.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
            </select>
          </Field>
          <Field label="Years of experience">
            <select className={selectClass} value={experience} onChange={(e) => setExperience(e.target.value as Experience)}>
              <option value="">Select experience</option>
              {experienceOptions.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
            </select>
          </Field>
          <Field label="Company kind">
            <select className={selectClass} value={companyKind} onChange={(e) => setCompanyKind(e.target.value as CompanyKind)}>
              <option value="">Select a company kind</option>
              {companies.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
            </select>
          </Field>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <Field label="Resume">
            <input type="file" accept=".pdf,.docx,application/pdf" onChange={onFile} className="text-sm" />
          </Field>
          <Field label="Job description">
            <textarea
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
              rows={8}
              className="rounded-md border border-stone-300 px-3 py-2 text-sm"
            />
            <span className={jdLength < JD_MIN ? "text-stone-500" : "text-green-700"}>{jdLength} / {JD_MIN}</span>
          </Field>
        </div>
      )}

      <Field label="Duration">
        <select className={selectClass} value={duration === "" ? "" : String(duration)} onChange={(e) => setDuration(Number(e.target.value) as DurationMinutes)}>
          <option value="">Select a duration</option>
          {durations.map((minutes) => <option key={minutes} value={minutes}>{minutes} minutes</option>)}
        </select>
      </Field>

      {error && <p className="text-sm font-medium text-red-700">{error}</p>}

      <button
        type="button"
        onClick={begin}
        disabled={submitting}
        className="rounded-md bg-stone-900 px-4 py-2 text-sm font-semibold text-white disabled:bg-stone-300"
      >
        {submitting ? "Starting…" : "Begin interview"}
      </button>
    </div>
  )
}
