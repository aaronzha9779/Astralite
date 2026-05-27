import xpSound from '../assets/mcxpsound1s.m4a'
import upgradeSound from '../assets/upgradeSound.m4a'

function playAudio(src: string, volume = 0.45) {
  console.log('trying to play sound:', src)

  const audio = new Audio(src)
  audio.volume = volume

  void audio.play().catch((err) => {
    console.error('sound failed:', err)
  })
}

export function playCompletionChime() {
  playAudio(xpSound, 0.45)
}

export function playReward() {
  playAudio(upgradeSound, 0.55)
}