# MockUp — Real-Time AI Voice Interviewer

MockUp is a full-stack, voice-first interview practice application. Instead of reading flashcards or typing answers, you *speak* with an AI interviewer in real time over a WebSocket. The interviewer asks questions, listens to your spoken answers, transcribes them, and responds conversationally via synthesized speech — complete with natural **barge-in** capabilities, allowing you to interrupt the AI mid-sentence just like in a real interview.

MockUp simulates real interview conditions, providing an AI interviewer persona and comprehensive multi-dimensional feedback, serving as an invaluable tool for job seekers, students, and career switchers.

## Key Features

- **Real-Time Conversational Agent:** Engage in a multi-turn interview with an AI that asks questions, listens, and responds naturally.
- **Natural Voice Barge-In:** Interrupt the AI at any time. The system detects your voice, halts its speech, and listens to your new input.
- **Multi-Dimensional Feedback:** Receive structured evaluations on technical accuracy, communication clarity, confidence, and completeness, including filler word detection.
- **Resume-Tailored Interviews:** Upload your resume (PDF/DOCX) to generate personalized, context-aware interview questions.
- **Performance Analytics:** Track your scores, monitor progress over multiple sessions, and identify areas for improvement.

## Tech Stack & Tooling

| Layer | Technology |
|---|---|
| **Frontend Framework** | React 19 + Vite 8 + TypeScript |
| **Styling** | Tailwind CSS v4 |
| **Real-Time Transport** | Native WebSocket (Duplex audio + JSON control messages) |
| **Audio Playback** | Native MediaSource Extensions (MSE) with streaming MP3 playback |
| **Client VAD** | hark (Voice Activity Detection) |
| **Backend Framework** | FastAPI on Starlette + Uvicorn |
| **Speech-to-Text (STT)**| Groq Whisper (`whisper-large-v3-turbo`) |
| **LLM / Evaluation** | Groq Llama (`llama-3.3-70b-versatile`) |
| **Text-to-Speech (TTS)**| Google Cloud Text-to-Speech (`en-IN-Wavenet-D`, MP3) |
| **Server VAD** | Silero VAD (PyTorch / torchaudio) |
| **Audio Processing** | pydub (webm/opus to 16 kHz mono float32 PCM) |
| **Document Parsing** | PyMuPDF (PDF), python-docx (DOCX) |
| **Database & Auth** | Supabase (PostgreSQL, pgvector, Auth) |

## System Architecture

```text
┌─────────────────────────────────────────┐
│           React + Vite Frontend         │
│  ┌──────────┐  ┌──────────────────────┐ │
│  │ Record & │  │  Results / History   │ │
│  │ Playback │  │  Dashboard           │ │
│  └────┬─────┘  └──────────────────────┘ │
└───────┼─────────────────────────────────┘
        │ Duplex WebSocket (Audio & JSON)
        ▼
┌─────────────────────────────────────────┐
│              FastAPI Backend            │
│  - WebSocket router (/ws/interview)     │
│  - Resume parsing (/resume/parse)       │
│  - Session management                   │
└───────────┬──────────────┬──────────────┘
            │              │
            ▼              ▼
     ┌────────────┐  ┌──────────────┐
     │ AI Services│  │   Supabase   │
     │(Groq, GCP) │  │ (DB & Auth)  │
     └────────────┘  └──────────────┘
```

## Core Workflow Pipelines

### 1. End-to-End Real-Time Voice Turn

A single conversational turn flows across the client and server. Both sides use async queues and refs to keep audio and control strictly ordered.

1. **Mic Acquisition:** `getUserMedia` requests the microphone with echo cancellation and noise suppression.
2. **Playback + Socket Init:** `MediaSource` initializes an audio queue. The WebSocket connects to the backend.
3. **Recording & VAD:** The client records via `MediaRecorder` (`audio/webm`) while `hark` monitors voice activity.
4. **Silence Detection:** Upon a ~2-second silence, the client stops recording and sends the accumulated audio blob to the server.
5. **Server-Side VAD (Silero):** The server verifies human speech using a sliding 512-sample Silero window.
6. **Transcription (Groq Whisper):** The validated audio is transcribed, providing precise, word-level timestamps.
7. **Streaming LLM (Groq Llama):** The AI generates a response token-by-token. Tokens are buffered until sentence punctuation is reached.
8. **Streaming TTS (Google Cloud):** Complete sentences are synthesized into MP3 format and streamed back to the client via WebSocket.
9. **Playback & Loop:** The client plays the streamed audio, then re-enables recording for the next turn.

### 2. Natural Barge-In

If the user begins speaking while the AI is talking:
- The client-side VAD detects speech and immediately flushes the audio buffer, silencing playback.
- A `{type: "barge_in"}` JSON signal is sent to the server.
- The server cancels the ongoing AI Turn task and drains the TTS queue, ensuring all audio generation stops instantly.
- The system resets to listen to the user's new input.

## Local Development Setup

### Prerequisites

- **Node.js** (v20+)
- **Python** (v3.11+)
- **Groq API Key** (for Whisper and Llama models)
- **Google Cloud Service Account** (authorized for Text-to-Speech API)
- **Supabase Account** (for database and authentication)

### Backend Setup

1. Navigate to the server directory:
   ```bash
   cd server
   ```
2. Create and activate a virtual environment:
   ```bash
   python -m venv .venv
   source .venv/bin/activate  # On Windows: .venv\Scriptsctivate.bat
   ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Create a `.env` file in the `server/` directory:
   ```env
   UPLOAD_DIR=uploads
   GROQ_API_KEY=your_groq_stt_key
   GROQ_LLM_API_KEY=your_groq_llm_key
   GOOGLE_APPLICATION_CREDENTIALS=/path/to/your-service-account.json
   ```
5. Run the FastAPI server:
   ```bash
   uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
   ```
   *Note: The first launch will download the Silero VAD model weights via `torch.hub`.*

### Frontend Setup

1. Navigate to the client directory:
   ```bash
   cd client
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Configure environment variables in `client/.env` (if applicable).
4. Start the development server:
   ```bash
   npm run dev
   ```

## Directory Structure

```text
MockUp/
├── client/                     # React + Vite + TS frontend
│   ├── src/
│   │   ├── components/         # UI Components (e.g., ResumeUpload)
│   │   ├── hooks/              # Custom React Hooks (e.g., useInterview)
│   │   ├── services/           # Client-side services (WebSocket, VAD, Audio)
│   │   ├── App.tsx             # Root Application component
│   │   └── main.tsx            # Entry point
│   ├── index.html              # HTML template
│   ├── package.json            # Node dependencies and scripts
│   └── vite.config.ts          # Vite configuration
│
└── server/                     # FastAPI backend
    ├── app/
    │   ├── config/             # Application configuration and keys
    │   ├── routes/             # API Endpoints (WebSocket, Resume parsing)
    │   ├── services/           # Backend services (AI, TTS, VAD, Transcription)
    │   └── main.py             # FastAPI application setup
    └── requirements.txt        # Python dependencies
```
