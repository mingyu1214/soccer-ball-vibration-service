// Web Vibration API 기반 촉각(진동) 엔진
// - 공 위치/속도에 따른 "지속 진동"
// - 슛/방향전환 등 "이벤트 진동 패턴"

import type { BallEventType, BallState } from "./detection"
import { isVibrationAvailable, stopVibration, vibratePattern } from "./vibration-bridge"

export interface HapticSettings {
  /** 지속 진동 사용 여부 */
  continuous: boolean
  /** 이벤트 진동 사용 여부 */
  events: boolean
  /** 전체 세기 배율 0~1 */
  intensity: number
  /** 지속 진동 최소 펄스 간격(ms) — 공이 느릴 때 */
  slowInterval: number
  /** 지속 진동 최대 속도 시 펄스 간격(ms) — 공이 빠를 때 */
  fastInterval: number
}

export const DEFAULT_SETTINGS: HapticSettings = {
  continuous: true,
  events: true,
  intensity: 1,
  slowInterval: 520,
  fastInterval: 90,
}

/** 이 기기가 진동을 지원하는지 (웹 Vibration API 또는 네이티브 앱 햅틱) */
export function isVibrationSupported(): boolean {
  return isVibrationAvailable()
}

/** 이벤트별 진동 패턴 (ms 단위: 진동, 멈춤, 진동 ...) */
function eventPattern(type: BallEventType, intensity: number, scale: number): number[] {
  const s = (v: number) => Math.max(10, Math.round(v * scale))
  switch (type) {
    case "shot":
      // 강하고 긴 단일 펄스
      return [s(180 + intensity * 180)]
    case "direction":
      // 짧은 더블 탭
      return [s(60), 50, s(60)]
    case "left":
      // 왼쪽: 짧은 단발
      return [s(70)]
    case "right":
      // 오른쪽: 긴 단발
      return [s(160)]
    case "lost":
      // 소실: 페이드 아웃 느낌의 3연타
      return [s(40), 40, s(40), 40, s(40)]
    case "found":
      // 재추적: 경쾌한 더블
      return [s(50), 40, s(90)]
    default:
      return [s(80)]
  }
}

export class HapticEngine {
  private settings: HapticSettings
  private lastPulseAt = 0
  private supported: boolean

  constructor(settings: HapticSettings = DEFAULT_SETTINGS) {
    this.settings = settings
    this.supported = isVibrationSupported()
  }

  updateSettings(settings: HapticSettings) {
    this.settings = settings
  }

  get isSupported() {
    return this.supported
  }

  /** 모든 진동 즉시 중단 */
  stop() {
    if (this.supported) stopVibration()
    this.lastPulseAt = 0
  }

  /**
   * 지속 진동 틱. 매 애니메이션 프레임마다 현재 시각(ms)과 공 상태로 호출.
   * 공이 빠를수록 자주, 화면 아래(가까움)일수록 강하게 진동.
   * @returns 이번 틱에 실제로 진동을 발생시켰는지
   */
  tickContinuous(nowMs: number, ball: BallState): boolean {
    if (!this.supported || !this.settings.continuous || !ball.detected) return false

    const { slowInterval, fastInterval, intensity } = this.settings
    // 속도 0~1 로 클램프하여 펄스 간격 보간
    const speedNorm = Math.min(1, ball.speed / 1.2)
    const interval = slowInterval + (fastInterval - slowInterval) * speedNorm

    if (nowMs - this.lastPulseAt < interval) return false
    this.lastPulseAt = nowMs

    // 세로 위치(아래=가까움) + 속도로 펄스 길이 결정
    const proximity = ball.ny // 0(위) ~ 1(아래)
    const base = 18 + proximity * 40 + speedNorm * 45
    const dur = Math.max(10, Math.round(base * intensity))
    vibratePattern(dur)
    return true
  }

  /** 이벤트 진동 발생 */
  fireEvent(type: BallEventType, eventIntensity: number): number[] | null {
    if (!this.supported || !this.settings.events) return null
    const pattern = eventPattern(type, eventIntensity, this.settings.intensity)
    vibratePattern(pattern)
    // 이벤트 진동 직후 지속 진동이 곧바로 겹치지 않도록 살짝 지연
    this.lastPulseAt = performance.now() + pattern.reduce((a, b) => a + b, 0)
    return pattern
  }

  /** 설정/지원 여부와 무관하게 단발 테스트 진동 */
  testPulse(): boolean {
    if (!this.supported) return false
    vibratePattern([80, 60, 160])
    return true
  }
}
