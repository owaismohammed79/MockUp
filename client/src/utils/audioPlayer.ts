let audioQueue = [];
let isPlaying = false;
let onPlaybackEnd = null

export function setOnPlaybackEnd(callback) {
  onPlaybackEnd = callback
}

async function playNext() {
  if(audioQueue.length === 0) {
    isPlaying = false
    if(onPlaybackEnd) onPlaybackEnd()
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

  audio.onerror = () => {
    URL.revokeObjectURL(url);
    playNext();
  };

  try {
    await audio.play();
  } catch (e) {
    console.error("Playback error:", e);
    playNext();
  }
}

export function handleAudioChunk(chunk) {
  const blob = new Blob([chunk], { type: "audio/mpeg" })

  audioQueue.push(blob)

  if (!isPlaying) playNext()
}