import xpSound from '../assets/mcxpsound1s.m4a'

function playSound(volume = 0.45) {
  const audio = new Audio(xpSound)
  audio.volume = volume
  void audio.play().catch(() => {})
}

export function playCompletionChime() {
  playSound(0.45)
}

export function playRewardChime() {
  playSound(0.55)
}