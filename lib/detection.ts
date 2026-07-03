// 축구 영상 공(ball) 감지 데이터 모델 + 운동학/이벤트 계산 유틸

/** YOLO 등으로 사전 처리된 프레임 단위 감지 결과 (한 프레임) */
export interface DetectionFrame {
  /** 영상 기준 시간(초) */
  t: number
  /** 공 중심 x (픽셀). 미검출 프레임이면 null */
  x: number | null
  /** 공 중심 y (픽셀). 미검출 프레임이면 null */
  y: number | null
  /** 신뢰도 0~1 (선택) */
  conf?: number
}

/** 업로드되는 감지 JSON 전체 구조 */
export interface DetectionData {
  /** 원본 영상 프레임레이트 (선택) */
  fps?: number
  /** 원본 프레임 가로 해상도 (픽셀) */
  width: number
  /** 원본 프레임 세로 해상도 (픽셀) */
  height: number
  /** 시간순으로 정렬된 프레임 목록 */
  frames: DetectionFrame[]
}

/** 특정 재생 시점에서 계산된 공의 상태 */
export interface BallState {
  /** 유효한 공 위치가 있는지 */
  detected: boolean
  /** 정규화 x (0=왼쪽, 1=오른쪽) */
  nx: number
  /** 정규화 y (0=위, 1=아래) */
  ny: number
  /** 정규화 속도 크기 (화면 폭 대비 초당 이동량) */
  speed: number
  /** 이동 방향 (라디안, atan2(vy, vx)) */
  angle: number
  /** 정규화 x 속도 성분 (초당) */
  vx: number
  /** 정규화 y 속도 성분 (초당) */
  vy: number
}

/** 감지된 하이라이트 이벤트 종류 */
export type BallEventType =
  | "shot" // 급격한 속도 증가 (슛/강한 킥)
  | "direction" // 급격한 방향 전환 (패스/드리블 전환)
  | "left" // 공이 좌측 진영으로 진입
  | "right" // 공이 우측 진영으로 진입
  | "lost" // 공 추적 소실
  | "found" // 공 재추적

export interface BallEvent {
  type: BallEventType
  /** 발생 시간(초) */
  t: number
  /** 부가 세기 값 0~1 */
  intensity: number
}

const EMPTY_STATE: BallState = {
  detected: false,
  nx: 0.5,
  ny: 0.5,
  speed: 0,
  angle: 0,
  vx: 0,
  vy: 0,
}

/** 감지 JSON 유효성 검사 및 정규화. 실패 시 에러 throw */
export function parseDetectionData(raw: unknown): DetectionData {
  if (typeof raw !== "object" || raw === null) {
    throw new Error("JSON 최상위는 객체여야 합니다.")
  }
  const obj = raw as Record<string, unknown>
  const width = Number(obj.width)
  const height = Number(obj.height)
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    throw new Error("width, height 는 양수여야 합니다.")
  }
  if (!Array.isArray(obj.frames)) {
    throw new Error("frames 배열이 필요합니다.")
  }
  const frames: DetectionFrame[] = obj.frames.map((f, i) => {
    if (typeof f !== "object" || f === null) {
      throw new Error(`frames[${i}] 가 올바르지 않습니다.`)
    }
    const ff = f as Record<string, unknown>
    const t = Number(ff.t)
    if (!Number.isFinite(t)) throw new Error(`frames[${i}].t 가 숫자가 아닙니다.`)
    const x = ff.x === null || ff.x === undefined ? null : Number(ff.x)
    const y = ff.y === null || ff.y === undefined ? null : Number(ff.y)
    const conf = ff.conf === undefined ? undefined : Number(ff.conf)
    return {
      t,
      x: x === null || !Number.isFinite(x) ? null : x,
      y: y === null || !Number.isFinite(y) ? null : y,
      conf: conf !== undefined && Number.isFinite(conf) ? conf : undefined,
    }
  })
  frames.sort((a, b) => a.t - b.t)
  const cleaned = cleanFrames(frames)
  return { fps: obj.fps ? Number(obj.fps) : undefined, width, height, frames: cleaned }
}

/**
 * YOLO 출력 특유의 노이즈를 정리하는 전처리 필터.
 * 1) 낮은 신뢰도(conf < 0.3) 프레임을 null 처리 (공 튐 방지)
 * 2) 연속으로 완전히 동일한 좌표가 반복되는 구간 → null 처리 (YOLO freeze 제거)
 * 3) 공이 한 프레임 만에 지나치게 많이 이동하는 경우 null 처리 (오검출 제거)
 */
function cleanFrames(frames: DetectionFrame[]): DetectionFrame[] {
  const MIN_CONF = 0.3
  const MAX_JUMP_PX = 250  // 한 프레임(~0.033초) 에 250픽셀 이상 이동하면 오검출
  const MAX_FREEZE = 10    // 같은 좌표가 10프레임 이상 연속이면 freeze

  const result: DetectionFrame[] = frames.map(f => ({ ...f }))

  // 1) 낮은 신뢰도 제거
  for (const f of result) {
    if (f.conf !== undefined && f.conf < MIN_CONF) {
      f.x = null
      f.y = null
    }
  }

  // 2) freeze 구간 제거 (같은 좌표가 MAX_FREEZE프레임 이상 연속)
  let freezeStart = 0
  let freezeCount = 1
  for (let i = 1; i < result.length; i++) {
    const prev = result[i - 1]
    const cur = result[i]
    if (
      cur.x !== null && prev.x !== null &&
      cur.x === prev.x && cur.y === prev.y
    ) {
      freezeCount++
    } else {
      if (freezeCount >= MAX_FREEZE) {
        for (let j = freezeStart; j < freezeStart + freezeCount; j++) {
          result[j].x = null
          result[j].y = null
        }
      }
      freezeStart = i
      freezeCount = 1
    }
  }
  // 마지막 구간
  if (freezeCount >= MAX_FREEZE) {
    for (let j = freezeStart; j < freezeStart + freezeCount; j++) {
      result[j].x = null
      result[j].y = null
    }
  }

  // 3) 급격한 위치 점프 제거
  let lastValid: DetectionFrame | null = null
  for (const f of result) {
    if (f.x === null || f.y === null) {
      lastValid = null
      continue
    }
    if (lastValid !== null) {
      const dx = f.x - (lastValid.x ?? 0)
      const dy = f.y - (lastValid.y ?? 0)
      const dist = Math.hypot(dx, dy)
      const dt = Math.max(0.001, f.t - lastValid.t)
      // 짧은 시간에 너무 먼 거리 이동 → 오검출
      if (dist / dt > MAX_JUMP_PX / 0.033) {
        f.x = null
        f.y = null
        continue
      }
    }
    lastValid = f
  }

  return result
}

/** 이진 탐색: t 이하인 마지막 프레임 인덱스 반환 (없으면 -1) */
function findFrameIndex(frames: DetectionFrame[], t: number): number {
  let lo = 0
  let hi = frames.length - 1
  let res = -1
  while (lo <= hi) {
    const mid = (lo + hi) >> 1
    if (frames[mid].t <= t) {
      res = mid
      lo = mid + 1
    } else {
      hi = mid - 1
    }
  }
  return res
}

/**
 * 주어진 재생 시점 t 의 공 상태를 계산.
 * 위치는 인접 프레임 선형 보간, 속도는 앞뒤 프레임 차분으로 산출.
 */
export function computeBallState(data: DetectionData, t: number): BallState {
  const { frames, width, height } = data
  if (frames.length === 0) return EMPTY_STATE

  const idx = findFrameIndex(frames, t)
  if (idx < 0) return EMPTY_STATE

  const cur = frames[idx]
  const next = frames[idx + 1]

  // 현재 프레임에 공이 없으면 소실 상태
  if (cur.x === null || cur.y === null) {
    return { ...EMPTY_STATE, detected: false }
  }

  // 위치 보간
  let px = cur.x
  let py = cur.y
  if (next && next.x !== null && next.y !== null && next.t > cur.t) {
    const ratio = Math.min(1, Math.max(0, (t - cur.t) / (next.t - cur.t)))
    px = cur.x + (next.x - cur.x) * ratio
    py = cur.y + (next.y - cur.y) * ratio
  }

  // 속도 계산: 현재 프레임과 다음(또는 이전) 프레임 차분
  let vx = 0
  let vy = 0
  let ref: DetectionFrame | undefined = next
  if (!ref || ref.x === null || ref.y === null) {
    ref = frames[idx - 1]
  }
  if (ref && ref.x !== null && ref.y !== null && ref.t !== cur.t) {
    const dt = Math.abs(ref.t - cur.t)
    if (dt > 0) {
      const dirSign = ref.t > cur.t ? 1 : -1
      vx = (dirSign * (ref.x - cur.x)) / dt / width
      vy = (dirSign * (ref.y - cur.y)) / dt / height
    }
  }

  const speed = Math.hypot(vx, vy)
  const angle = Math.atan2(vy, vx)

  return {
    detected: true,
    nx: px / width,
    ny: py / height,
    speed,
    angle,
    vx,
    vy,
  }
}

/** 이벤트 감지 임계값 */
// 필터 후 실제 속도 p75 ~ p90 범위를 "빠른 움직임"으로 정의
const SHOT_SPEED = 3.0   // 정규화 속도(초당 화면폭 배수) 이상이면 슛/강한 킥
const DIR_CHANGE = Math.PI / 2.5 // 방향 변화 72도 이상이면 전환 (좀 더 예민하게)
const SIDE_LEFT = 0.33
const SIDE_RIGHT = 0.67

/**
 * 전체 감지 데이터를 스캔하여 하이라이트 이벤트 타임라인을 미리 생성.
 * 재생 중에는 시간으로 이 목록을 조회하기만 하면 됨.
 */
export function buildEventTimeline(data: DetectionData, sampleHz = 20): BallEvent[] {
  const { frames } = data
  if (frames.length < 2) return []

  const events: BallEvent[] = []
  const start = frames[0].t
  const end = frames[frames.length - 1].t
  const step = 1 / sampleHz

  let prev: BallState | null = null
  let wasDetected = true
  let lastSide: "left" | "mid" | "right" | null = null
  let lastEventT: Record<string, number> = {}

  const cooldown = (key: string, t: number, gap: number) => {
    if (lastEventT[key] !== undefined && t - lastEventT[key] < gap) return false
    lastEventT[key] = t
    return true
  }

  for (let t = start; t <= end; t += step) {
    const s = computeBallState(data, t)

    // 소실 / 재추적
    if (!s.detected && wasDetected) {
      if (cooldown("lost", t, 0.5)) events.push({ type: "lost", t, intensity: 0.5 })
      wasDetected = false
    } else if (s.detected && !wasDetected) {
      if (cooldown("found", t, 0.5)) events.push({ type: "found", t, intensity: 0.5 })
      wasDetected = true
    }

    if (s.detected) {
      // 슛 (속도 급증)
      if (s.speed >= SHOT_SPEED && (!prev || prev.speed < SHOT_SPEED)) {
        if (cooldown("shot", t, 0.4)) {
          events.push({ type: "shot", t, intensity: Math.min(1, s.speed / (SHOT_SPEED * 1.6)) })
        }
      }
      // 방향 전환
      if (prev && prev.speed > 0.15 && s.speed > 0.15) {
        let diff = Math.abs(s.angle - prev.angle)
        if (diff > Math.PI) diff = 2 * Math.PI - diff
        if (diff >= DIR_CHANGE && cooldown("direction", t, 0.5)) {
          events.push({ type: "direction", t, intensity: Math.min(1, diff / Math.PI) })
        }
      }
      // 좌/우 진영 진입
      const side = s.nx < SIDE_LEFT ? "left" : s.nx > SIDE_RIGHT ? "right" : "mid"
      if (side !== lastSide && side !== "mid") {
        if (cooldown("side", t, 0.6)) {
          events.push({ type: side, t, intensity: 0.4 })
        }
      }
      lastSide = side
      prev = s
    } else {
      prev = null
    }
  }

  return events
}

export const EVENT_LABELS: Record<BallEventType, string> = {
  shot: "슛 / 강한 킥",
  direction: "방향 전환",
  left: "좌측 진영",
  right: "우측 진영",
  lost: "공 추적 소실",
  found: "공 재추적",
}
