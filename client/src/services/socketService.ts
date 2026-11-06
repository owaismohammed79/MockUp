type SocketCallbacks = {
  onMessage: (data: { type: string; text?: string; ends_at?: number; questions_asked?: number; question_cap?: number; message?: string; id?: string }) => void
  onAudioChunk: (chunk: ArrayBuffer) => void
  onError?: (e: Event) => void
}

function socketUrl(sessionId: string) {
  const http = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000"
  const url = new URL(http)
  url.protocol = url.protocol === "https:" ? "wss:" : "ws:"
  url.pathname = `/ws/interview/${sessionId}`
  url.search = ""
  return url.toString()
}

export function createSocketService(sessionId: string, callbacks: SocketCallbacks) {
  let socket: WebSocket | null = null

  function connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      socket = new WebSocket(socketUrl(sessionId))
      socket.binaryType = "arraybuffer"

      socket.onopen = () => resolve()

      socket.onmessage = (event) => {
        if (typeof event.data === "string") {
          const data = JSON.parse(event.data)
          callbacks.onMessage(data)
        } else {
          callbacks.onAudioChunk(event.data as ArrayBuffer)
        }
      }

      socket.onerror = (e) => {
        console.error("[Socket] Error:", e)
        callbacks.onError?.(e)
        reject(e)
      }
    })
  }

  function send(data: Blob | string) {
    if (socket?.readyState === WebSocket.OPEN) {
      socket.send(data)
    } else {
      console.warn("can't send data on non open socket")
    }
  }

  function sendJson(payload: object) {
    send(JSON.stringify(payload))
  }

  function disconnect() {
    socket?.close()
    socket = null
  }

  function isOpen(): boolean {
    return socket?.readyState === WebSocket.OPEN
  }

  return { connect, send, sendJson, disconnect, isOpen }
}
