let audioQueue = [];
let isPlaying = false;

function playNext() {
  if(audioQueue.length === 0) {
    isPlaying = false
    return
  }

  isPlaying = true

  const blob = audioQueue.shift()
  const url = URL.createObjectURL(blob)
  const audio = new Audio(url)

  audio.onended = () => {
    URL.revokeObjectURL(url)
    playNext()
  }

  audio.play()
}

export function handleAudioChunk(chunk) {
  const blob = new Blob([chunk], { type: "audio/mpeg" })

  audioQueue.push(blob)

  if (!isPlaying) playNext()
}