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

/**
 * 계단식 7단계 HapticLevel (Vision2Touch iOS 앱 기획 문서 기준)
 * 속도를 연속 곡선이 아닌, 조정 가능한 7단계(0~6)의 intensity로 매핑한다.
 */
export const HAPTIC_LEVELS: readonly number[] = [0, 0.15, 0.3, 0.45, 0.65, 0.85, 1.0]

/**
 * 레벨별 최소 속도 임계값 (정규화 속도: 화면 폭 대비 초당 이동 비율).
 * ⚠️ 임시 보정값 — clip-01 실제 감지 데이터(약 665개 속도 샘플)의 백분위수
 * (p10≈0.006, p40≈0.06, p65≈0.11, p78≈0.19, p87≈0.29, p96≈0.38)를 참고해
 * 잡은 값이다. iOS 팀 문서에도 "speedRanges가 임시값"이라고 명시되어 있듯,
 * 영상 종류가 늘어나면 그 속도 분포를 다시 뽑아 재보정해야 한다.
 */
const SPEED_LEVEL_THRESHOLDS: readonly number[] = [0, 0.015, 0.05, 0.10, 0.18, 0.28, 0.40]

/** 판정 기준은 각 단계의 최솟값 — 정의 구간 사이 값은 직전(더 낮은) 단계를 유지 */
export function speedToLevel(speed: number): number {
  let level = 0
  for (let i = 0; i < SPEED_LEVEL_THRESHOLDS.length; i++) {
    if (speed >= SPEED_LEVEL_THRESHOLDS[i]) level = i
  }
  return level
}

export function speedToIntensity(speed: number): number {
  return HAPTIC_LEVELS[speedToLevel(speed)]
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
   * 속도를 계단식 7단계(HAPTIC_LEVELS)로 판정해, 레벨이 높을수록 더 자주·더 강하게 진동.
   * 레벨 0(정지)이면 진동 없음 — 드리블 같은 저속 이동과 슛 같은 고속 이동이
   * 뚜렷이 구분되도록 하는 게 목적.
   * @returns 이번 틱에 실제로 진동을 발생시켰는지
   */
  tickContinuous(nowMs: number, ball: BallState): boolean {
    if (!this.supported || !this.settings.continuous || !ball.detected) return false

    const level = speedToLevel(ball.speed)
    if (level === 0) return false // 거의 정지 상태 — 진동 없음

    const { slowInterval, fastInterval, intensity } = this.settings
    const levelIntensity = HAPTIC_LEVELS[level]
    // 레벨(0~6)을 0~1로 정규화해 펄스 간격 보간 (레벨 높을수록 자주)
    const levelNorm = level / (HAPTIC_LEVELS.length - 1)
    const interval = slowInterval + (fastInterval - slowInterval) * levelNorm

    if (nowMs - this.lastPulseAt < interval) return false
    this.lastPulseAt = nowMs

    // 펄스 길이도 계단식 세기(levelIntensity)로 결정 — 레벨 간 체감 차이를 명확히
    const base = 20 + levelIntensity * 90
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
