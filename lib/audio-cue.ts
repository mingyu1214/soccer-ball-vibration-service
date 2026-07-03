// 시각장애인용 오디오 큐 엔진
// - 공의 좌/우 위치 → 스테레오 패닝 (왼쪽 공이면 왼쪽 스피커)
// - 공의 상/하 위치 & 속도 → 음 높이(피치)
// - 슛/방향전환 등 이벤트 → 한국어 음성 안내(SpeechSynthesis)
//
// 진동을 느끼기 어려운 상황(데스크톱)이나 진동만으로 방향 구분이 어려운
// 사용자를 위해 촉각(진동)과 병행하는 청각 채널을 제공한다.

import { EVENT_LABELS, type BallEventType, type BallState } from "./detection"

export interface AudioSettings {
  /** 위치 사운드(연속 톤) 사용 */
  tone: boolean
  /** 이벤트 음성 안내 사용 */
  speech: boolean
  /** 위치 안내 음성(주기적으로 "왼쪽/가운데/오른쪽") 사용 */
  positionSpeech: boolean
  /** 전체 볼륨 0~1 */
  volume: number
}

export const DEFAULT_AUDIO_SETTINGS: AudioSettings = {
  tone: true,
  speech: true,
  positionSpeech: false,
  volume: 0.7,
}

function speechSupported(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window
}

function audioSupported(): boolean {
  return typeof window !== "undefined" && (typeof AudioContext !== "undefined" || "webkitAudioContext" in window)
}

/** 공의 수평 위치를 사람이 알아듣기 쉬운 단어로 */
export function horizontalWord(nx: number): string {
  if (nx < 0.2) return "왼쪽 끝"
  if (nx < 0.4) return "왼쪽"
  if (nx < 0.6) return "가운데"
  if (nx < 0.8) return "오른쪽"
  return "오른쪽 끝"
}

export class AudioCueEngine {
  private settings: AudioSettings
  private ctx: AudioContext | null = null
  private osc: OscillatorNode | null = null
  private gain: GainNode | null = null
  private panner: StereoPannerNode | null = null
  private running = false
  private lastPositionSpeechAt = 0
  private lastSpokenSide: string | null = null

  readonly audioOk: boolean
  readonly speechOk: boolean

  constructor(settings: AudioSettings = DEFAULT_AUDIO_SETTINGS) {
    this.settings = settings
    this.audioOk = audioSupported()
    this.speechOk = speechSupported()
  }

  updateSettings(settings: AudioSettings) {
    this.settings = settings
    if (this.gain && this.ctx) {
      this.gain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.02)
    }
  }

  /** 사용자 제스처 안에서 호출해야 함(모바일 오디오 정책) */
  resume() {
    if (!this.audioOk) return
    if (!this.ctx) {
      const Ctor = (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)
      this.ctx = new Ctor()
      this.osc = this.ctx.createOscillator()
      this.gain = this.ctx.createGain()
      this.panner = this.ctx.createStereoPanner()
      this.gain.gain.value = 0
      this.osc.type = "sine"
      this.osc.frequency.value = 440
      this.osc.connect(this.gain)
      this.gain.connect(this.panner)
      this.panner.connect(this.ctx.destination)
      this.osc.start()
    }
    if (this.ctx.state === "suspended") void this.ctx.resume()
    this.running = true
  }

  /** 연속 톤 갱신 — 매 프레임 공 상태로 호출 */
  tickTone(ball: BallState) {
    if (!this.running || !this.ctx || !this.osc || !this.gain || !this.panner) return
    const now = this.ctx.currentTime

    if (!this.settings.tone || !ball.detected) {
      this.gain.gain.setTargetAtTime(0, now, 0.05)
      return
    }

    // 좌우 위치 → 패닝 (-1 왼쪽 ~ +1 오른쪽)
    const pan = Math.max(-1, Math.min(1, ball.nx * 2 - 1))
    this.panner.pan.setTargetAtTime(pan, now, 0.05)

    // 상하 위치 → 피치: 위(작게 보임/멀다)=높은음, 아래(가깝다)=낮은음
    // 속도가 빠를수록 살짝 더 높게
    const speedNorm = Math.min(1, ball.speed / 1.2)
    const base = 660 - ball.ny * 360 // ny 0(위)=660Hz, 1(아래)=300Hz
    const freq = base + speedNorm * 120
    this.osc.frequency.setTargetAtTime(freq, now, 0.04)

    // 볼륨: 속도가 있을수록 또렷하게, 최소치는 유지
    const vol = (0.12 + speedNorm * 0.25) * this.settings.volume
    this.gain.gain.setTargetAtTime(vol, now, 0.05)

    // 주기적 위치 음성 안내(선택)
    if (this.settings.positionSpeech && this.speechOk) {
      const word = horizontalWord(ball.nx)
      const nowMs = performance.now()
      if (word !== this.lastSpokenSide && nowMs - this.lastPositionSpeechAt > 1500) {
        this.speak(word, true)
        this.lastSpokenSide = word
        this.lastPositionSpeechAt = nowMs
      }
    }
  }

  /** 이벤트 음성 안내 */
  announceEvent(type: BallEventType) {
    if (!this.settings.speech || !this.speechOk) return
    this.speak(EVENT_LABELS[type], false)
  }

  /** 임의 문구 즉시 음성 안내 */
  speak(text: string, interrupt: boolean) {
    if (!this.speechOk || !this.settings.speech) return
    const synth = window.speechSynthesis
    if (interrupt) synth.cancel()
    const u = new SpeechSynthesisUtterance(text)
    u.lang = "ko-KR"
    u.rate = 1.15
    u.volume = this.settings.volume
    synth.speak(u)
  }

  /** 테스트: 좌 → 우 스윕 + 음성 */
  test() {
    this.resume()
    if (this.ctx && this.osc && this.gain && this.panner) {
      const now = this.ctx.currentTime
      this.gain.gain.setValueAtTime(0.0001, now)
      this.gain.gain.exponentialRampToValueAtTime(0.3 * this.settings.volume, now + 0.05)
      this.panner.pan.setValueAtTime(-1, now)
      this.panner.pan.linearRampToValueAtTime(1, now + 0.9)
      this.osc.frequency.setValueAtTime(400, now)
      this.osc.frequency.linearRampToValueAtTime(700, now + 0.9)
      this.gain.gain.setTargetAtTime(0, now + 0.9, 0.05)
    }
    this.speak("왼쪽에서 오른쪽", true)
  }

  stop() {
    this.running = false
    if (this.gain && this.ctx) this.gain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.05)
    if (this.speechOk) window.speechSynthesis.cancel()
    this.lastSpokenSide = null
  }
}
