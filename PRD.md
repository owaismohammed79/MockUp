# MockUp - AI Interviewer Coach

**Version:** 1.0  
**Status:** Draft  
**Last Updated:** March 2026  
**Phases Covered:** 0 → 3 (MVP through Deep Analytics)

---

## Table of Contents

1. [Product Overview](#1-product-overview)
2. [Goals & Success Metrics](#2-goals--success-metrics)
3. [User Personas](#3-user-personas)
4. [Tech Stack](#4-tech-stack)
5. [System Architecture](#5-system-architecture)
6. [Phase 0 — Project Skeleton](#6-phase-0--project-skeleton)
7. [Phase 1 — MVP](#7-phase-1--mvp)
8. [Phase 2 — Real Interview Feel](#8-phase-2--real-interview-feel)
9. [Phase 3 — Analytics & Depth](#9-phase-3--analytics--depth)
10. [API Contracts](#10-api-contracts)
11. [Data Models](#11-data-models)
12. [Non-Functional Requirements](#12-non-functional-requirements)
13. [Constraints & Assumptions](#13-constraints--assumptions)
14. [Out of Scope](#14-out-of-scope)

---

## 1. Product Overview

### 1.1 What Is It?

An AI powered web application that simulates real interview conditions and gives structured, multi-dimensional feedback on a user's spoken answers. It evaluates not just *what* you said (technical accuracy, completeness) but *how* you said it (filler words, hedging language, confidence, structure).

Unlike flashcard tools or reading-based prep, this platform forces users to speak aloud, hear themselves played back via transcript, and receive the kind of specific actionable feedback that a human coach would give — but instantly, for free, at any time.

### 1.2 The Core Loop

```
User selects question → Records spoken answer → 
Groq Whisper transcribes → Groq Llama evaluates → 
Multi-dimensional scorecard rendered
```

### 1.3 The Problem It Solves

Most people prepare for interviews by reading. But the actual interview requires speaking — under pressure, coherently, in real time. Generic mock interview platforms either require a human partner or give shallow, single-score feedback. This tool gives:

- Timestamped filler word detection
- Technical accuracy scoring against a rubric
- Confidence and vagueness language flags
- Improvement suggestions grounded in the actual transcript

---

## 2. Goals & Success Metrics

### 2.1 Product Goals

| Goal | Description |
|---|---|
| Simulate real interview pressure | Audio recording, AI interviewer persona, time-limited responses |
| Give actionable multi-dimensional feedback | Not one score but four distinct axes, each with explanation |
| Be personalised | Resume-aware question generation tailored to the user's background |
| Be free to use | No paywalls, no rate limit friction for the target user (students, job seekers) |
| Be impressive on a portfolio | Full-stack, multimodal, real deployed product |

### 2.2 Success Metrics (MVP)

- End-to-end flow (record → scorecard) completes in under 30 seconds
- Groq Whisper transcription accuracy > 90% on clear audio
- LLM returns valid structured JSON on > 95% of evaluation calls
- App is publicly accessible on Render with < 5s cold start after wake-up

### 2.3 Success Metrics (Phase 2+)

- User can complete a full 5-question mock interview session end-to-end
- Resume upload correctly extracts skills from > 80% of standard PDF resumes
- Session history persists correctly across logins
- Score trend data is queryable per user per category

---

## 3. User Personas

### 3.1 Primary — The Job-Seeking Student

**Name:** Arjun  
**Situation:** Final year CS student, applying for SDE roles at product companies. Has read all the DSA theory but freezes up when speaking answers aloud. Can't afford coaching.  
**Goal:** Practice speaking technical answers until they feel natural. Reduce filler words. Get feedback without needing a human partner.  
**Behaviour:** Uses the app alone, late at night, 2–3 sessions per week. Wants to see improvement over time.

### 3.2 Secondary — The Career Switcher

**Name:** Priya  
**Situation:** 3 years in a non-tech role, transitioning into data. Has technical skills but no interview practice.  
**Goal:** Get realistic behavioural and ML interview practice. Wants personalised questions based on her resume.  
**Behaviour:** Uploads resume before each session. Focuses on behavioural rounds. Uses the model answer feature to understand what a strong response looks like.

---

## 4. Tech Stack

### 4.1 Full Stack Decision Table

| Layer | Choice | Rationale | Tradeoff |
|---|---|---|---|
| Frontend | React + Vite | Familiar, fast dev server, lightweight | No built-in SSR or API proxying (solved by FastAPI backend) |
| Styling | Tailwind CSS + shadcn/ui | Professional UI fast, free, component-ready | shadcn requires initial setup time |
| Charts | Recharts | React-native, animated, no cost | Less customisable than D3 |
| Backend | FastAPI (Python) | Native Groq SDK, async support, audio libraries | Slightly more WS setup than Node |
| Database | Supabase (free tier) | Postgres + pgvector + built-in Auth | Free tier pauses after 7 days inactivity |
| STT | Groq Whisper Large v3 Turbo | 216x real-time speed, free tier 2000 req/day | Rate limits apply; sufficient for portfolio traffic |
| LLM Evaluation | Groq Llama 3.3 70B | Strong reasoning, JSON mode, free tier | 1000 req/day free; cache repeat calls where possible |
| TTS | Browser `SpeechSynthesis` API | Zero cost, zero API calls, built into every browser | Less natural than ElevenLabs; acceptable for portfolio |
| Resume Parsing | PyMuPDF | Free, runs on backend, no external API | May struggle with image-based PDFs |
| Deployment | Render | Free static site + free web service | Backend spins down after 15min inactivity (cold start ~30s) |

### 4.2 Environment Variables

```
# Backend (.env)
GROQ_API_KEY=
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=

# Frontend (.env)
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_API_BASE_URL=   # Render backend URL
```

---

## 5. System Architecture

### 5.1 High-Level Architecture

```
┌─────────────────────────────────────────┐
│           React + Vite (Render)         │
│                                         │
│  ┌──────────┐  ┌──────────────────────┐ │
│  │ Record   │  │  Results / History   │ │
│  │ Component│  │  Dashboard           │ │
│  └────┬─────┘  └──────────────────────┘ │
└───────┼─────────────────────────────────┘
        │ audio blob + question_id
        ▼
┌─────────────────────────────────────────┐
│         FastAPI Backend (Render)        │
│                                         │
│  POST /transcribe  →  Groq Whisper      │
│  POST /evaluate    →  Groq Llama 3.3    │
│  POST /session     →  Supabase          │
│  GET  /history     →  Supabase          │
│  POST /resume      →  PyMuPDF           │
└───────────┬──────────────┬──────────────┘
            │              │
            ▼              ▼
     ┌────────────┐  ┌──────────────┐
     │ Groq API   │  │  Supabase    │
     │ (Whisper + │  │  (Postgres + │
     │  Llama)    │  │   Auth)      │
     └────────────┘  └──────────────┘
```

### 5.2 Evaluation Pipeline (Per Request)

```
audio blob
    │
    ▼
Groq Whisper Large v3 Turbo
    │ transcript + word timestamps
    ▼
Filler word regex pass (client-side on transcript)
    │ filler_words[], filler_count
    ▼
Groq Llama 3.3 70B (JSON mode)
    │ Input: question + transcript + rubric system prompt
    │ Output: structured EvaluationResult JSON
    ▼
Store to Supabase (sessions table)
    │
    ▼
Return EvaluationResult to frontend → render scorecard
```

---

## 6. Phase 0 — Project Skeleton

**Target Duration:** Days 1–2  
**Goal:** Prove the pipeline works end-to-end. No UI polish, no evaluation, no DB.

### 6.1 Tasks

| Task | Detail |
|---|---|
| Scaffold React + Vite | `npm create vite@latest` with Tailwind configured |
| Scaffold FastAPI | `main.py` with single `/health` endpoint, running locally |
| Deploy backend to Render | Verify Render web service spins up, returns 200 on `/health` |
| Wire Groq API | Test raw Whisper call with a `.webm` file from terminal |
| `MediaRecorder` proof of concept | Browser records audio, sends blob to FastAPI, prints transcript in terminal |
| Supabase project created | Tables not yet created, just connection string verified |

### 6.2 Completion Criteria

> You can speak into the browser → click submit → see the raw transcript printed on screen (even just in the console or a `<pre>` tag).

---

## 7. Phase 1 — MVP

**Target Duration:** Days 3–10 (must ship by Day 10)  
**Goal:** A publicly accessible app where a stranger can pick a question, record an answer, and receive a scorecard. No auth, no history, stateless.

### 7.1 Features

#### 7.1.1 Question Bank (Hardcoded)

- 20 questions across 3 categories:
  - **DSA** (7 questions): Arrays, trees, recursion, dynamic programming, graphs, sorting, hashing
  - **System Design** (7 questions): Cache design, rate limiting, URL shortener, notification system, distributed storage
  - **Behavioural** (6 questions): Leadership, conflict resolution, failure, growth, STAR-structured prompts
- Questions stored as a static JSON file in the frontend — no DB required at this stage
- User selects a category → shown a random question from that category
- "Try another question" button to get a different one within the same category

#### 7.1.2 Audio Recording UI

- Large circular record button — pulsing red dot animation while recording
- Live duration timer visible during recording (MM:SS)
- Max recording duration: 3 minutes (enforced by `MediaRecorder` stop trigger)
- Stop button ends recording and triggers submission
- Audio format: `.webm` (default `MediaRecorder` output)
- No playback of the recording itself (Phase 1 scope)

**States the UI must handle:**
- `idle` — ready to record
- `recording` — pulsing indicator, timer running
- `processing` — spinner + "Analysing your answer..." message
- `results` — scorecard rendered
- `error` — transcription or evaluation failed, user-friendly error message + retry button

#### 7.1.3 Transcription (FastAPI → Groq Whisper)

**Endpoint:** `POST /transcribe`  
**Input:** `multipart/form-data` with `audio` (`.webm` blob)  
**Process:**
1. Receive audio blob
2. Write to `/tmp/{uuid}.webm` (temp file, deleted after processing)
3. Send to Groq Whisper Large v3 Turbo with `response_format: verbose_json` to get word timestamps
4. Return transcript + word-level timestamps

**Output:**
```json
{
  "transcript": "So basically the idea is um you'd use a hash map...",
  "words": [
    { "word": "So", "start": 0.0, "end": 0.3 },
    { "word": "basically", "start": 0.3, "end": 0.7 },
    ...
  ],
  "duration_seconds": 87.4
}
```

**Error handling:**
- Audio file > 25MB → return 400 with `"Audio file too large"`
- Groq API error → return 502 with `"Transcription service unavailable, please retry"`
- Empty transcript (silence) → return 422 with `"No speech detected"`

#### 7.1.4 Evaluation (FastAPI → Groq Llama 3.3 70B)

**Endpoint:** `POST /evaluate`  
**Input:**
```json
{
  "question": "Explain how a hash map works internally.",
  "transcript": "So basically...",
  "category": "DSA"
}
```

**System Prompt:**
```
You are a senior technical interviewer evaluating a candidate's spoken answer.
You must return ONLY a valid JSON object matching the schema below — no preamble, no markdown fences.

Evaluate the following spoken answer on four dimensions, each scored 0–10:
- technical_accuracy: Is the answer factually correct and technically sound?
- communication_clarity: Is the answer structured, clear, and free of vague language?
- confidence: Does the candidate use assertive language, or do they hedge constantly?
- completeness: Did the candidate fully answer the question, covering key aspects?

Also extract:
- filler_words: list of exact filler words/phrases detected (um, uh, like, basically, you know, kind of, sort of)
- filler_count: total count
- hedging_phrases: list of confidence-undermining phrases detected (I think, maybe, I'm not sure, something like that)
- improvements: exactly 3 specific, actionable improvement suggestions grounded in the actual transcript
- summary: one sentence overall assessment

Return schema:
{
  "technical_accuracy": <int 0-10>,
  "communication_clarity": <int 0-10>,
  "confidence": <int 0-10>,
  "completeness": <int 0-10>,
  "filler_words": [<string>],
  "filler_count": <int>,
  "hedging_phrases": [<string>],
  "improvements": [<string>, <string>, <string>],
  "summary": <string>
}
```

**Groq call config:**
- `model`: `llama-3.3-70b-versatile`
- `response_format`: `{ "type": "json_object" }`
- `temperature`: `0.2` (low — we want consistent, structured evaluation)
- `max_tokens`: `800`

**Output:** Parsed `EvaluationResult` JSON (schema above) returned to frontend.

#### 7.1.5 Scorecard UI

**Radar Chart (Recharts)**
- 4 axes: Technical Accuracy, Communication Clarity, Confidence, Completeness
- Scale: 0–10 on each axis
- Animate in on mount (Recharts built-in animation)
- Color: filled area in brand accent color, stroke slightly darker

**Score Tiles**
- 4 tiles below the radar — one per dimension
- Each shows: dimension name, score (large), one-line explanation from LLM

**Filler Words Section**
- Badge list of detected filler words with count: `um ×4`, `basically ×2`
- Hedging phrases listed separately: `"I think" ×3`, `"kind of" ×2`

**Transcript Display**
- Full transcript rendered as text
- Filler words highlighted in amber background
- Hedging phrases highlighted in orange background
- Clean monospace or readable sans-serif font

**Improvements Section**
- 3 improvement bullets from LLM, numbered
- Each directly references something from the transcript

**Summary**
- One-sentence LLM summary at the top of the scorecard, styled as a callout

**Action Buttons**
- "Try Another Question" → resets to question selection
- "Practice Same Question Again" → resets recorder, keeps same question

### 7.2 MVP Completion Criteria

- App is live on Render (both frontend and backend)
- All 3 question categories work
- End-to-end flow (record → scorecard) completes in < 30 seconds on good audio
- Scorecard renders correctly with radar chart
- Error states handled gracefully (no blank screens or unhandled exceptions)
- Works on Chrome and Firefox (primary targets)

---

## 8. Phase 2 — Real Interview Feel

**Target Duration:** 1.5–2 weeks post-MVP  
**Goal:** Transform from a single Q&A tool into a full mock interview experience with auth, persistence, and personalisation.

### 8.1 Supabase Auth

- Google OAuth via Supabase Auth (Supabase dashboard config + 1 frontend hook)
- Protected routes: history, session detail, resume upload — redirect to login if unauthenticated
- User profile created in `profiles` table on first login (see Data Models)
- Auth state managed via Supabase `onAuthStateChange` listener in React context

### 8.2 Conversational Agent Mode

This is the core experiential upgrade. Instead of one question → one scorecard, the AI conducts a full multi-turn mock interview.

**Flow:**
1. User selects category + number of questions (3 or 5)
2. Agent introduces itself and the session: *"Hi, I'm Alex. I'll be interviewing you today for a backend engineering role. Let's start with a warm-up question."*
3. Agent reads the question aloud via browser `SpeechSynthesis`
4. User records answer
5. Agent gives a brief natural acknowledgement before moving on: *"Got it, interesting approach. Let's continue."* — this is LLM-generated, not hardcoded
6. Repeat for all questions
7. After final question, agent says: *"That's all from me. Your full session report is ready below."*
8. Full session scorecard rendered with aggregate scores + per-question breakdowns

**Context Retention:**
- Entire conversation history (questions + transcripts) accumulated in an array
- Passed to Groq Llama on each turn as `messages` array
- System prompt instructs the agent to reference previous answers when relevant
- Example: if user mentions Redis in Q2, Q3 follow-up might be: *"You mentioned Redis earlier — how would you handle Redis failure in this architecture?"*

**Endpoint:** `POST /agent/turn`  
**Input:**
```json
{
  "session_id": "uuid",
  "turn_number": 2,
  "category": "system_design",
  "conversation_history": [
    { "role": "assistant", "content": "Explain how you'd design a rate limiter." },
    { "role": "user", "content": "<transcript of answer>" }
  ],
  "latest_transcript": "<transcript of current answer>"
}
```
**Output:**
```json
{
  "acknowledgement": "Interesting, you went with token bucket. Let's move on.",
  "next_question": "Now, how would you handle data consistency in a distributed cache?",
  "is_final_turn": false
}
```

**TTS Implementation:**
```javascript
const speak = (text) => {
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = 0.95;
  utterance.pitch = 1.0;
  // Select a natural-sounding voice if available
  const voices = speechSynthesis.getVoices();
  const preferred = voices.find(v => v.name.includes('Google') && v.lang === 'en-US');
  if (preferred) utterance.voice = preferred;
  speechSynthesis.speak(utterance);
};
```

### 8.3 Resume Upload & Tailored Questions

**Upload Flow:**
1. Optional step before starting a session: "Upload your resume for personalised questions"
2. User uploads PDF (max 5MB)
3. FastAPI receives file, parses with PyMuPDF
4. Extracted text sent to Groq Llama for structured skill/experience extraction

**Endpoint:** `POST /resume/parse`  
**Input:** `multipart/form-data` with `resume` (PDF)  
**Process:**
1. Extract raw text via PyMuPDF
2. Send to Llama with prompt: *"Extract the candidate's technical skills, years of experience, notable projects, and job titles. Return as JSON."*
3. Store extracted profile in Supabase `resume_profiles` table linked to `user_id`

**Output:**
```json
{
  "skills": ["Python", "FastAPI", "PostgreSQL", "Redis", "Docker"],
  "experience_years": 1,
  "projects": ["Built a RAG pipeline with LangChain", "Agentic web search tool"],
  "roles": ["Software Engineering Intern"]
}
```

**Question Generation:**
- Resume profile injected into agent system prompt
- *"The candidate has listed experience with Python, FastAPI, and RAG systems. Generate technically relevant interview questions that probe their actual experience."*
- Questions are LLM-generated per session (not pulled from the static bank)
- Fallback: if no resume uploaded, use static question bank

### 8.4 Session History

**Sessions List Page:**
- Cards showing: date, category, question count, average overall score, duration
- Click card → session detail page

**Session Detail Page:**
- Per-question breakdown: question text, transcript, individual scores, fillers, improvements
- Aggregate scores (average across all questions in session)
- Aggregate radar chart

**Supabase tables required:** `sessions`, `session_turns` (see Data Models)

---

## 9. Phase 3 — Analytics & Depth

**Target Duration:** 2 weeks after Phase 2  
**Goal:** Make the app a long-term practice companion with measurable progress tracking and deeper feedback.

### 9.1 Score Trend Charts

**Location:** Dedicated "Progress" page accessible from nav

**Charts:**
- Line chart (Recharts) per dimension (Technical Accuracy, Clarity, Confidence, Completeness) over time
- X-axis: session date, Y-axis: score 0–10
- Filterable by category (DSA / System Design / Behavioural)
- Rolling 7-session average line overlaid

**Data source:** Aggregate scores per session from `sessions` table, queried via Supabase client

### 9.2 Weakest Area Detection

- Computed from last 5 sessions minimum (don't show if < 5 sessions)
- Find dimension with lowest average score across recent sessions
- Dashboard callout card: *"Your weakest area is Confidence — you average 4.1 across your last 7 sessions. This means you frequently use hedging phrases like 'I think' and 'maybe'. Try recording answers where you consciously eliminate these."*
- Specific to category: *"In System Design sessions specifically, your Completeness scores are lowest."*

### 9.3 Vagueness & Hedging Language Detector

This is a separate, more granular feature than the basic hedging detection in Phase 1.

**Hedging phrase taxonomy (passed to LLM in system prompt):**

| Category | Examples |
|---|---|
| Uncertainty hedges | "I think", "I believe", "maybe", "probably", "I'm not sure but" |
| Vague quantifiers | "some", "a few", "several", "kind of a lot" |
| Approximation | "something like", "sort of", "roughly", "around" |
| Disclaimer openers | "I'm not 100% sure", "don't quote me on this", "this might be wrong" |

**Scorecard additions:**
- Dedicated "Confidence Language" section
- Each detected phrase shown with its count and a 1-line suggestion: *"Replace 'I think the time complexity is O(n log n)' with 'The time complexity is O(n log n)' — assert, don't hedge."*

### 9.4 Live Filler Word Counter

**Behaviour during recording:**
- Audio chunked every 6 seconds using `MediaRecorder`'s `ondataavailable` event with `timeslice: 6000`
- Each chunk sent to `POST /transcribe/chunk` endpoint
- Backend transcribes chunk, runs regex for filler words, returns count delta
- Frontend updates a live badge: `Fillers detected: 5`
- Badge animates (brief shake) when a new filler is detected

**Endpoint:** `POST /transcribe/chunk`  
**Input:** `multipart/form-data` with `audio_chunk` (`.webm` chunk)  
**Output:**
```json
{
  "chunk_transcript": "um so basically the way I would",
  "fillers_in_chunk": ["um", "basically"],
  "filler_count_delta": 2
}
```

**Note:** Chunk transcripts are accumulated client-side and merged into the final transcript at submission. Final evaluation still runs on the full assembled transcript for accuracy.

**Rate limit awareness:** Each chunk call uses 1 Groq Whisper request. At 6s intervals for a 3-minute answer = 30 chunk calls. At Groq's free tier of 2000 req/day, this supports ~66 full live-mode sessions per day — adequate for portfolio traffic.

### 9.5 Model Answer Generator

**Trigger:** Button on scorecard: "Show me a strong answer" — visible only after evaluation

**Endpoint:** `POST /model-answer`  
**Input:**
```json
{
  "question": "Explain how consistent hashing works.",
  "user_transcript": "<user's actual answer>",
  "scores": { "technical_accuracy": 5, "completeness": 4, ... }
}
```

**System prompt:**
```
You are a senior engineer. Generate a model answer to the following interview question — 
the kind that would score 9/10. It should be spoken-word natural (not written prose), 
around 2–3 minutes when read aloud, technically precise, structured clearly, and assertive 
in tone. Reference the candidate's answer to show what was good and what was missing.
```

**UI:**
- Rendered side-by-side with the user's transcript on desktop, stacked on mobile
- User transcript on left (with filler highlights), model answer on right
- Model answer shown in a distinct background colour to differentiate

---

## 10. API Contracts

### 10.1 Endpoint Summary

| Method | Path | Phase | Auth Required | Description |
|---|---|---|---|---|
| GET | `/health` | 0 | No | Health check |
| POST | `/transcribe` | 1 | No | Transcribe full audio blob |
| POST | `/evaluate` | 1 | No | Evaluate transcript against question |
| POST | `/agent/turn` | 2 | Yes | Multi-turn conversational agent |
| POST | `/resume/parse` | 2 | Yes | Parse resume PDF, extract profile |
| POST | `/session` | 2 | Yes | Save completed session to DB |
| GET | `/session/{session_id}` | 2 | Yes | Fetch single session detail |
| GET | `/sessions` | 2 | Yes | Fetch all sessions for current user |
| POST | `/transcribe/chunk` | 3 | No | Transcribe audio chunk (live mode) |
| POST | `/model-answer` | 3 | No | Generate model answer |

### 10.2 Standard Error Response

```json
{
  "error": {
    "code": "TRANSCRIPTION_FAILED",
    "message": "Groq Whisper returned an error. Please retry.",
    "retry": true
  }
}
```

**Error codes:** `TRANSCRIPTION_FAILED`, `EVALUATION_FAILED`, `INVALID_AUDIO`, `EMPTY_TRANSCRIPT`, `RESUME_PARSE_FAILED`, `RATE_LIMIT_EXCEEDED`, `UNAUTHORIZED`

---

## 11. Data Models

### 11.1 Supabase Schema

```sql
-- User profiles (created on first login)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  email TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Resume profiles (one per user, overwritten on re-upload)
CREATE TABLE resume_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  skills TEXT[],
  experience_years INT,
  projects TEXT[],
  roles TEXT[],
  raw_text TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Interview sessions
CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  category TEXT NOT NULL CHECK (category IN ('dsa', 'system_design', 'behavioural')),
  mode TEXT NOT NULL CHECK (mode IN ('single', 'agent')),
  question_count INT NOT NULL,
  avg_technical_accuracy FLOAT,
  avg_communication_clarity FLOAT,
  avg_confidence FLOAT,
  avg_completeness FLOAT,
  total_filler_count INT,
  duration_seconds INT,
  resume_used BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Individual turns within a session
CREATE TABLE session_turns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
  turn_number INT NOT NULL,
  question TEXT NOT NULL,
  transcript TEXT NOT NULL,
  technical_accuracy INT,
  communication_clarity INT,
  confidence INT,
  completeness INT,
  filler_words TEXT[],
  filler_count INT,
  hedging_phrases TEXT[],
  improvements TEXT[],
  summary TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 11.2 Frontend TypeScript Types

```typescript
type Category = 'dsa' | 'system_design' | 'behavioural';
type SessionMode = 'single' | 'agent';

interface EvaluationResult {
  technical_accuracy: number;      // 0–10
  communication_clarity: number;   // 0–10
  confidence: number;              // 0–10
  completeness: number;            // 0–10
  filler_words: string[];
  filler_count: number;
  hedging_phrases: string[];
  improvements: [string, string, string];
  summary: string;
}

interface TranscriptWord {
  word: string;
  start: number;
  end: number;
}

interface TranscriptResult {
  transcript: string;
  words: TranscriptWord[];
  duration_seconds: number;
}

interface Session {
  id: string;
  category: Category;
  mode: SessionMode;
  question_count: number;
  avg_technical_accuracy: number;
  avg_communication_clarity: number;
  avg_confidence: number;
  avg_completeness: number;
  total_filler_count: number;
  duration_seconds: number;
  resume_used: boolean;
  created_at: string;
}

interface SessionTurn {
  id: string;
  session_id: string;
  turn_number: number;
  question: string;
  transcript: string;
  evaluation: EvaluationResult;
}

interface ResumeProfile {
  skills: string[];
  experience_years: number;
  projects: string[];
  roles: string[];
}
```

---

## 12. Non-Functional Requirements

### 12.1 Performance

| Metric | Target |
|---|---|
| Groq Whisper response time | < 5s for a 3-minute audio file |
| Groq Llama evaluation response time | < 8s |
| Full pipeline (record stop → scorecard render) | < 20s on good network |
| Render backend cold start | < 35s (acceptable for portfolio; document this for users) |

### 12.3 Audio Requirements

- Minimum recommended: built-in laptop mic in a quiet room
- Format: `.webm` (MediaRecorder default)
- Max duration enforced: 3 minutes
- Max file size enforced: 10MB (well within Groq's 25MB limit)

### 12.4 Security

- Groq API key **never** exposed to the frontend — all LLM/STT calls proxied through FastAPI
- Supabase service role key only on backend; frontend uses anon key with RLS policies
- Row Level Security (RLS) on all Supabase tables: users can only read/write their own rows
- Resume PDF deleted from `/tmp` immediately after parsing

```sql
-- Example RLS policy
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can only access own sessions"
  ON sessions FOR ALL
  USING (auth.uid() = user_id);
```

### 12.5 Rate Limit Strategy

| API | Free Limit | Strategy |
|---|---|---|
| Groq Whisper | 2000 req/day | Live chunk mode uses ~30 req per session; single mode uses 1 |
| Groq Llama 3.3 70B | 1000 req/day | 1 req per evaluation; agent mode ~5 req per session |
| Supabase | 500MB storage, 2GB egress/month | Text-only storage; no audio stored |

---

## 14. Out of Scope

The following are explicitly excluded from Phases 0–3:

| Feature | Reason |
|---|---|
| Video recording and playback | Storage costs unsustainable on free tier |
| Recruiter RBAC and hiring platform features | Phase 5 — only if Phase 1–4 are solid |
| Real-time collaborative sessions | Requires WebRTC infrastructure beyond current scope |
| Mobile native app | Web app is mobile-responsive; native app is a separate project |
| Paid subscription / monetisation | Not relevant for portfolio use case |
| Non-English language support | Out of scope for v1 |
| Offline mode | Requires service workers and local model inference; out of scope |
| Custom LLM fine-tuning | Not necessary; prompt engineering sufficient for evaluation quality |
| Plagiarism detection on answers | Out of scope |
| Integration with job boards | Out of scope |

---