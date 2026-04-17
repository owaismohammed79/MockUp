type RecorderCallbacks = {
  onCommit: (blob: Blob) => void  // called when recorder stops with real audio
  onStop: () => void               // called after commit, so caller can restart
}

export function createRecorderService(stream: MediaStream,callbacks: RecorderCallbacks) {
  let recorder: MediaRecorder | null = null

  function start() {
    recorder = new MediaRecorder(stream, { mimeType: "audio/webm" })
    const chunks: Blob[] = []

    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        chunks.push(event.data)
      }
    }

    recorder.onstop = () => {
      if (chunks.length > 0) {
        const blob = new Blob(chunks, { type: "audio/webm;codecs=opus" })
        chunks.length = 0
        callbacks.onCommit(blob)
      } else {
        console.log("[Recorder] No audio detected, skipping commit")
      }
      callbacks.onStop()
    }

    recorder.onerror = (event) => {
      console.error(`[Recorder] Error: ${event.error.name}`)
    }

    recorder.start(250)
  }

  function stop() {
    if (recorder?.state === "recording") {
      recorder.stop()
    }
  }

  function getState(): RecordingState | null {
    return recorder?.state ?? null
  }

  return { start, stop, getState }
}