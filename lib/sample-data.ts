import type { DetectionData } from "./detection"

/**
 * 데모용 감지 데이터 생성기.
 * 실제 YOLO 출력이 없을 때 UI/진동 흐름을 시험하기 위한 합성 궤적.
 * 공이 좌우로 오가며 중간에 슛(속도 급증)과 소실 구간을 포함.
 */
export function generateSampleDetection(durationSec = 20, fps = 30): DetectionData {
  const width = 1280
  const height = 720
  const frames = []
  const total = Math.floor(durationSec * fps)

  for (let i = 0; i <= total; i++) {
    const t = i / fps

    // 5.5~6.2초 구간은 공 소실(가림) 시뮬레이션
    if (t > 5.5 && t < 6.2) {
      frames.push({ t, x: null, y: null })
      continue
    }

    // 기본 좌우 왕복 (사인파)
    let x = width * (0.5 + 0.42 * Math.sin(t * 0.7))
    // 상하 완만한 움직임
    let y = height * (0.55 + 0.28 * Math.sin(t * 1.3 + 1))

    // 12.0초 부근 슛: 순간적으로 오른쪽 골문으로 빠르게 이동
    if (t > 12 && t < 12.5) {
      const p = (t - 12) / 0.5
      x = width * (0.5 + 0.45 * p)
      y = height * (0.5 - 0.1 * p)
    }

    frames.push({
      t: Number(t.toFixed(3)),
      x: Math.round(x),
      y: Math.round(y),
      conf: Number((0.7 + 0.3 * Math.random()).toFixed(2)),
    })
  }

  return { fps, width, height, frames }
}
