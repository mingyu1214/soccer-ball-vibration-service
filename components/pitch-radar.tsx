"use client"

import type { BallState } from "@/lib/detection"

interface PitchRadarProps {
  ball: BallState
}

/** 공 위치/방향/속도를 위에서 내려다본 미니 레이더로 표시 */
export function PitchRadar({ ball }: PitchRadarProps) {
  const cx = ball.nx * 100
  const cy = ball.ny * 100
  // 방향 화살표 길이는 속도에 비례
  const len = Math.min(28, ball.speed * 40)
  const ex = cx + Math.cos(ball.angle) * len
  const ey = cy + Math.sin(ball.angle) * len

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold">공 위치 레이더</h3>
        <span className="text-xs text-muted-foreground">
          {ball.detected ? `속도 ${(ball.speed * 100).toFixed(0)}` : "미검출"}
        </span>
      </div>
      <div className="relative aspect-[16/10] w-full overflow-hidden rounded-lg border border-border bg-secondary/40">
        {/* 피치 라인 */}
        <div className="absolute inset-3 rounded-sm border border-primary/25" />
        <div className="absolute inset-y-3 left-1/2 w-px -translate-x-1/2 bg-primary/25" />
        <div className="absolute left-1/2 top-1/2 size-10 -translate-x-1/2 -translate-y-1/2 rounded-full border border-primary/25" />

        {ball.detected && (
          <>
            <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
              <line
                x1={cx}
                y1={cy}
                x2={ex}
                y2={ey}
                stroke="var(--color-accent)"
                strokeWidth={1.4}
                vectorEffect="non-scaling-stroke"
              />
            </svg>
            <span
              className="absolute size-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary shadow-[0_0_12px_var(--color-primary)]"
              style={{ left: `${cx}%`, top: `${cy}%` }}
              aria-hidden="true"
            />
          </>
        )}
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
        <Stat label="좌우" value={ball.detected ? sideLabel(ball.nx) : "-"} />
        <Stat label="상하" value={ball.detected ? depthLabel(ball.ny) : "-"} />
        <Stat label="방향" value={ball.detected ? dirLabel(ball.angle, ball.speed) : "-"} />
      </div>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-secondary/50 px-2 py-1.5">
      <div className="text-[10px] text-muted-foreground">{label}</div>
      <div className="font-medium">{value}</div>
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
