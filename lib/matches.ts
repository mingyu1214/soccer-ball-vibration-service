import type { DetectionData } from "./detection"

/**
 * 앱에 내장되는 "경기" 한 개의 메타데이터.
 * 감지 데이터(build)는 사전 처리된 YOLO 결과를 대신하는 재현 가능한 궤적이며,
 * 실제 서비스에서는 이 build() 결과를 미리 저장한 JSON 으로 교체하면 된다.
 * videoSrc 는 선택 — 시각장애인 사용자는 영상 없이 진동·소리만으로 이용 가능.
 */
export interface MatchMeta {
  id: string
  title: string
  subtitle: string
  description: string
  durationSec: number
  /** 사전 처리된 감지 데이터 생성기 (실서비스에서는 저장된 JSON 로 대체) */
  build: () => DetectionData
  /** 선택: 함께 재생할 영상 경로 (public 기준) */
  videoSrc?: string
}

const WIDTH = 1280
const HEIGHT = 720
const FPS = 30

/** 재현 가능한 의사난수 (시드 고정 → 앱 재실행해도 같은 데이터) */
function mulberry32(seed: number) {
  let a = seed
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

interface ScenarioOpts {
  seed: number
  durationSec: number
  /** 좌우 왕복 속도 */
  swayHz: number
  /** 슛 발생 시각(초) 목록 */
  shots: number[]
  /** 공 소실 구간 [시작, 끝] 목록 */
  lostSpans: [number, number][]
  /** 좌우 치우침 강도 (0=중앙 위주, 1=측면까지) */
  spread: number
}

/** 파라미터 기반 감지 궤적 생성 */
function buildScenario(opts: ScenarioOpts): DetectionData {
  const { seed, durationSec, swayHz, shots, lostSpans, spread } = opts
  const rand = mulberry32(seed)
  const total = Math.floor(durationSec * FPS)
  const frames = []

  // 매 프레임 약간의 노이즈로 자연스러운 흔들림
  const noiseX = () => (rand() - 0.5) * 0.02
  const noiseY = () => (rand() - 0.5) * 0.02

  for (let i = 0; i <= total; i++) {
    const t = i / FPS

    // 소실 구간
    const lost = lostSpans.some(([a, b]) => t >= a && t <= b)
    if (lost) {
      frames.push({ t: Number(t.toFixed(3)), x: null, y: null })
      continue
    }

    // 기본 좌우 왕복 + 상하 완만한 이동
    let nx = 0.5 + spread * 0.42 * Math.sin(t * swayHz) + noiseX()
    let ny = 0.55 + 0.24 * Math.sin(t * (swayHz * 1.7) + 1) + noiseY()

    // 슛: 각 슛 시각 부근 0.45초 동안 골문 방향으로 급가속
    for (const s of shots) {
      if (t > s && t < s + 0.45) {
        const p = (t - s) / 0.45
        const goalRight = Math.floor(s) % 2 === 0
        const targetX = goalRight ? 0.95 : 0.05
        nx = nx + (targetX - nx) * p
        ny = 0.5 + (rand() - 0.5) * 0.1 * p
      }
    }

    nx = Math.min(0.99, Math.max(0.01, nx))
    ny = Math.min(0.99, Math.max(0.01, ny))

    frames.push({
      t: Number(t.toFixed(3)),
      x: Math.round(nx * WIDTH),
      y: Math.round(ny * HEIGHT),
      conf: Number((0.72 + rand() * 0.28).toFixed(2)),
    })
  }

  return { fps: FPS, width: WIDTH, height: HEIGHT, frames }
}

/** 앱에 내장된 경기 목록 */
export const MATCHES: MatchMeta[] = [
  {
    id: "attack-endline",
    title: "공격 하이라이트 · 골 장면 모음",
    subtitle: "빠른 전개 · 슛 다수",
    description: "양 골문을 빠르게 오가는 공격 위주 경기. 강한 슛 진동을 여러 번 느낄 수 있습니다.",
    durationSec: 30,
    build: () =>
      buildScenario({
        seed: 101,
        durationSec: 30,
        swayHz: 0.9,
        shots: [6, 11.5, 17, 23, 27.5],
        lostSpans: [[14.5, 15.1]],
        spread: 1,
      }),
  },
  {
    id: "midfield-possession",
    title: "중원 점유 · 패스 전개",
    subtitle: "느린 전개 · 방향 전환 위주",
    description: "중앙에서 패스가 오가는 점유 위주 경기. 방향 전환 진동이 자주 발생합니다.",
    durationSec: 30,
    build: () =>
      buildScenario({
        seed: 202,
        durationSec: 30,
        swayHz: 1.6,
        shots: [21],
        lostSpans: [],
        spread: 0.45,
      }),
  },
  {
    id: "wing-play",
    title: "측면 돌파 · 윙 플레이",
    subtitle: "좌우 이동이 큰 경기",
    description: "공이 좌우 측면을 크게 오가는 경기. 좌측·우측 진영 진입 신호를 익히기 좋습니다.",
    durationSec: 28,
    build: () =>
      buildScenario({
        seed: 303,
        durationSec: 28,
        swayHz: 0.55,
        shots: [13, 25],
        lostSpans: [[8, 8.5]],
        spread: 1,
      }),
  },
  {
    id: "training-demo",
    title: "연습용 · 진동 익히기",
    subtitle: "짧은 데모 · 각 신호 1회씩",
    description: "슛·방향 전환·소실 신호를 천천히 하나씩 경험하는 연습용 데모입니다.",
    durationSec: 20,
    build: () =>
      buildScenario({
        seed: 404,
        durationSec: 20,
        swayHz: 0.7,
        shots: [12],
        lostSpans: [[5.5, 6.2]],
        spread: 0.9,
      }),
  },
]

export function getMatchById(id: string): MatchMeta | undefined {
  return MATCHES.find((m) => m.id === id)
}
