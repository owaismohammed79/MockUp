let mediaSource
let sourceBuffer
let queue = []
let audio = new Audio()
let isAppending = false
let onPlaybackEnd = null

export function setOnPlaybackEnd(callback) {
  onPlaybackEnd = callback
}

export function initMSE() {
  mediaSource = new MediaSource()
  audio.src = URL.createObjectURL(mediaSource)

  audio.onended = () => {
    if(onPlaybackEnd) onPlaybackEnd()
  }

  mediaSource.addEventListener('sourceopen', () => {
    sourceBuffer = mediaSource.addSourceBuffer('audio/mpeg')
    
    sourceBuffer.addEventListener('updateend', () => {
      isAppending = false
      if (queue.length > 0) {
        processQueue()
      }
    })
  })
  audio.play().catch(e => console.error("MSE Playback Error:", e))
}

function processQueue() {
  if (queue.length > 0 && !isAppending && sourceBuffer && !sourceBuffer.updating) {
    isAppending = true
    sourceBuffer.appendBuffer(queue.shift())
  }
}

export function handleAudioChunk(chunk) {
  //if stream was previously closed, we need to re init
  if (sourceBuffer && !sourceBuffer.updating && queue.length === 0) {
    isAppending = true
    sourceBuffer.appendBuffer(chunk)
  } else {
    queue.push(chunk)
  }
}

export function signalEndOfStream() {
  if (mediaSource && mediaSource.readyState === 'open') {
    //wait until buffer isnt updating before closing 
    if(!sourceBuffer.updating) {
      mediaSource.endOfStream()
    } else{
      sourceBuffer.addEventListener('updateend', () => {
        if(mediaSource.readyState === 'open') mediaSource.endOfStream()
      }, { once: true })
    }
  }
}