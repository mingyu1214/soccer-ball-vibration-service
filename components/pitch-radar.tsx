"use client"

import type { BallState } from "@/lib/detection"

interface PitchRadarProps {
  ball: BallState
}

export function PitchRadar({ ball }: PitchRadarProps) {
  const cx = ball.nx * 100
  const cy = ball.ny * 100
  const len = Math.min(28, ball.speed * 40)
  const ex = cx + Math.cos(ball.angle) * len
  const ey = cy + Math.sin(ball.angle) * len

  return (
    <section className="rounded-2xl border border-border bg-card p-5" aria-labelledby="radar-heading">
      <div className="mb-3 flex items-center justify-between">
        <h2 id="radar-heading" className="text-base font-bold text-foreground">공 위치 레이더</h2>
        <span className="rounded-lg bg-secondary px-2 py-1 text-xs font-bold text-foreground">
          {ball.detected ? `속도 ${(ball.speed * 100).toFixed(0)}` : "미검출"}
        </span>
      </div>

      {/* 피치 */}
      <div className="relative aspect-[16/10] w-full overflow-hidden rounded-xl border-2 border-primary/20 bg-[#2d5a1b]">
        {/* 잔디 라인 */}
        <div className="absolute inset-3 rounded-sm border border-white/30" />
        <div className="absolute inset-y-3 left-1/2 w-px -translate-x-1/2 bg-white/30" />
        {/* 센터 서클 */}
        <div className="absolute left-1/2 top-1/2 size-12 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/30" />
        {/* 센터 점 */}
        <div className="absolute left-1/2 top-1/2 size-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/60" />
        {/* 페널티 박스 */}
        <div className="absolute bottom-3 left-1/2 h-6 w-16 -translate-x-1/2 border border-white/20" />
        <div className="absolute top-3 left-1/2 h-6 w-16 -translate-x-1/2 border border-white/20" />

        {ball.detected && (
          <>
            <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
              <line
                x1={cx} y1={cy} x2={ex} y2={ey}
                stroke="oklch(0.78 0.18 88)"
                strokeWidth={1.6}
                vectorEffect="non-scaling-stroke"
              />
            </svg>
            <span
              className="absolute size-4 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white shadow-[0_0_12px_rgba(255,255,255,0.9)]"
              style={{ left: `${cx}%`, top: `${cy}%` }}
              aria-hidden="true"
            />
          </>
        )}
      </div>

      {/* 통계 */}
      <div className="mt-3 grid grid-cols-3 gap-2 text-center">
        <Stat label="좌우" value={ball.detected ? sideLabel(ball.nx) : "-"} />
        <Stat label="상하" value={ball.detected ? depthLabel(ball.ny) : "-"} />
        <Stat label="방향" value={ball.detected ? dirLabel(ball.angle, ball.speed) : "-"} />
      </div>
    </section>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-secondary px-2 py-2.5">
      <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-0.5 text-sm font-bold text-foreground">{value}</div>
    </div>
  )
}

function sideLabel(nx: number) {
  if (nx < 0.33) return "왼쪽"
  if (nx > 0.67) return "오른쪽"
  return "중앙"
}
function depthLabel(ny: number) {
  if (ny < 0.4) return "위"
  if (ny > 0.6) return "아래"
  return "중간"
}
function dirLabel(angle: number, speed: number) {
  if (speed < 0.05) return "정지"
  const deg = (angle * 180) / Math.PI
  if (deg >= -45 && deg < 45) return "→"
  if (deg >= 45 && deg < 135) return "↓"
  if (deg >= -135 && deg < -45) return "↑"
  return "←"
}
