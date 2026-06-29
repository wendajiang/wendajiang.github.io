// Overlays the native <audio> with a minimal custom player: a play/pause
// button, a fake bar-style ("|||||") progress, and the time below. The native
// <audio> is left in place (hidden via CSS) and used as the playback engine.
const PITCH = 4 // target px per bar (bar width + gap) -> thin, even spacing
const SVG_PLAY = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg>`
const SVG_PAUSE = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 5h3.4v14H7zm6.6 0H17v14h-3.4z"/></svg>`

function fmt(t: number): string {
  if (!isFinite(t) || t < 0) return "0:00"
  const m = Math.floor(t / 60)
  const s = Math.floor(t % 60)
  return `${m}:${s.toString().padStart(2, "0")}`
}

// deterministic pseudo-random bar height (%) so the "waveform" is stable
function barHeight(i: number): number {
  return 30 + Math.round(60 * Math.abs(Math.sin(i * 1.7) * Math.cos(i * 0.55)))
}

function buildPlayer(audio: HTMLAudioElement) {
  if (audio.dataset.customized === "true") return
  audio.dataset.customized = "true"
  // remove the native controls — a controls-less <audio> has no visual
  // rendering but stays in the DOM and loads normally (unlike display:none).
  // also drop loading="lazy" (added by the link transformer) and preload
  // metadata so the resource actually fetches.
  audio.removeAttribute("controls")
  audio.removeAttribute("loading")
  audio.preload = "metadata"

  const wrap = document.createElement("div")
  wrap.className = "audio-player"

  const row = document.createElement("div")
  row.className = "ap-row"

  const btn = document.createElement("button")
  btn.className = "ap-play"
  btn.type = "button"
  btn.setAttribute("aria-label", "Play")
  btn.innerHTML = SVG_PLAY

  const bars = document.createElement("div")
  bars.className = "ap-bars"

  const time = document.createElement("div")
  time.className = "ap-time"
  time.textContent = "0:00 / 0:00"

  row.append(btn, bars)
  wrap.append(row, time)
  // insert the custom UI before the audio; leave the audio element in place
  // (just hidden via CSS) so its native loading/playback is unaffected
  audio.parentNode?.insertBefore(wrap, audio)

  // size the bar count to the container width for thin, even spacing
  const count = Math.max(24, Math.floor((bars.clientWidth || 600) / PITCH))
  const barEls: HTMLElement[] = []
  for (let i = 0; i < count; i++) {
    const b = document.createElement("span")
    b.style.height = `${barHeight(i)}%`
    bars.appendChild(b)
    barEls.push(b)
  }

  const render = () => {
    const pct = audio.duration ? audio.currentTime / audio.duration : 0
    const played = Math.round(pct * barEls.length)
    for (let i = 0; i < barEls.length; i++) {
      barEls[i].classList.toggle("played", i < played)
    }
    time.textContent = `${fmt(audio.currentTime)} / ${fmt(audio.duration)}`
  }
  const onPlay = () => {
    btn.innerHTML = SVG_PAUSE
    btn.setAttribute("aria-label", "Pause")
  }
  const onPause = () => {
    btn.innerHTML = SVG_PLAY
    btn.setAttribute("aria-label", "Play")
  }
  // `busy` ignores the spurious double-fire of the click while a play() promise
  // is still pending, so pause() can't interrupt it (which caused AbortError)
  let busy = false
  const toggle = () => {
    if (busy) return
    if (audio.paused) {
      busy = true
      const p = audio.play()
      if (p && typeof p.then === "function") {
        p.then(() => (busy = false)).catch(() => (busy = false))
      } else {
        busy = false
      }
    } else {
      audio.pause()
    }
  }
  const seek = (e: MouseEvent) => {
    const rect = bars.getBoundingClientRect()
    const ratio = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width))
    if (audio.duration) audio.currentTime = ratio * audio.duration
  }

  btn.addEventListener("click", toggle)
  bars.addEventListener("click", seek)
  audio.addEventListener("timeupdate", render)
  audio.addEventListener("loadedmetadata", render)
  audio.addEventListener("durationchange", render)
  audio.addEventListener("play", onPlay)
  audio.addEventListener("pause", onPause)
  audio.addEventListener("ended", onPause)
  render()
  audio.load()

  window.addCleanup(() => {
    btn.removeEventListener("click", toggle)
    bars.removeEventListener("click", seek)
    audio.removeEventListener("timeupdate", render)
    audio.removeEventListener("loadedmetadata", render)
    audio.removeEventListener("durationchange", render)
    audio.removeEventListener("play", onPlay)
    audio.removeEventListener("pause", onPause)
    audio.removeEventListener("ended", onPause)
  })
}

document.addEventListener("nav", () => {
  document.querySelectorAll("audio").forEach((a) => buildPlayer(a as HTMLAudioElement))
})
