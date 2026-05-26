import xpSound from '../assets/mcxpsound1s.m4a'
import upgradeS from '../assets/upgradeSound.m4a'

function playSound(volume = 0.45) {
  const audio = new Audio(xpSound)
  audio.volume = volume
  void audio.play().catch(() => {})
}

function playRewardSound(volume = 0.45) {
  const audio = new Audio(upgradeS)
  audio.volume = volume
  void audio.play().catch(() => {})
}


export function playCompletionChime() {
  playSound(0.45)
}

export function playReward() {
  playRewardSound(0.55)
}