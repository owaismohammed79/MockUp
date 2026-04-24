import hark from "hark"

export function createVADService(stream, callbacks = {}) {
  let speech = null
  let cb = {...callbacks}
  speech = hark(stream, { interval: 70, threshold: -50 })


  speech.on("speaking", () => cb.onSpeakingStart?.())
  speech.on("stopped_speaking", () => cb.onSpeakingEnd?.())

  function calibrate(duration = 3000) {
    return new Promise((resolve) => {
      let volumes = []
      
      const volumeListener = (vol)=>{
        volumes.push(vol)
      }

      speech.on('volume_change', volumeListener)

      setTimeout(() => {
        speech.off('volume_change', volumeListener)

        if(volumes.length > 0) {
          volumes.sort((a, b) => a - b);
          const cleaned = volumes.slice(0, Math.floor(volumes.length*0.95)) //Remove noise spikes (highest vol)
          const avgVol = cleaned.reduce((a, b) => a + b)/cleaned.length
          const newThreshold = Math.round(avgVol + 12)
          //Fix the value in proper ranges so that they don't go out of [-100db, 0]          
          const final = Math.max(-75, Math.min(-35, newThreshold))
          
          speech.setThreshold(final)
          resolve(final)
        } else {
          resolve(-50)
        }
      }, duration)
    })
  }

  function updateCallbacks(newCb) {
    callbacks = { ...cb, ...newCb }
  }

  function start() {
    speech.on("speaking", () => {
      callbacks.onSpeakingStart()
    })

    speech.on("stopped_speaking", () => {
      callbacks.onSpeakingEnd()
    })
  }

  function stop() {
    speech?.stop()
    speech = null
  }

  return { start, stop, calibrate, updateCallbacks }
}