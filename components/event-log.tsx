"use client"

import { useEffect, useRef } from "react"
import { EVENT_LABELS, type BallEvent, type BallEventType } from "@/lib/detection"
import { cn } from "@/lib/utils"

interface EventLogProps {
  events: BallEvent[]
  currentTime: number
  onSeek: (t: number) => void
}

const TYPE_STYLES: Record<BallEventType, string> = {
  shot: "bg-destructive/15 text-destructive",
  direction: "bg-accent/15 text-accent",
  left: "bg-primary/15 text-primary",
  right: "bg-primary/15 text-primary",
  lost: "bg-muted text-muted-foreground",
  found: "bg-primary/15 text-primary",
}

export function EventLog({ events, currentTime, onSeek }: EventLogProps) {
  const listRef = useRef<HTMLDivElement>(null)

  // 현재 재생 시점에 해당하는 이벤트 인덱스
  const activeIdx = findActive(events, currentTime)

  useEffect(() => {
    if (activeIdx < 0 || !listRef.current) return
    const el = listRef.current.querySelector<HTMLElement>(`[data-idx="${activeIdx}"]`)
    el?.scrollIntoView({ block: "nearest", behavior: "smooth" })
  }, [activeIdx])

  return (
    <div className="flex h-full flex-col rounded-xl border border-border bg-card p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold">이벤트 타임라인</h3>
        <span className="text-xs text-muted-foreground">{events.length}개</span>
      </div>
      {events.length === 0 ? (
        <p className="text-xs text-muted-foreground">감지 데이터를 불러오면 이벤트가 생성됩니다.</p>
      ) : (
        <div ref={listRef} className="flex max-h-72 flex-col gap-1.5 overflow-y-auto pr-1">
          {events.map((e, i) => (
            <button
              key={`${e.t}-${e.type}-${i}`}
              data-idx={i}
              onClick={() => onSeek(e.t)}
              className={cn(
                "flex items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-xs transition-colors hover:bg-secondary/60",
                i === activeIdx && "ring-2 ring-primary",
              )}
            >
              <span className="flex items-center gap-2">
                <span className={cn("rounded-md px-2 py-0.5 font-medium", TYPE_STYLES[e.type])}>
                  {EVENT_LABELS[e.type]}
                </span>
              </span>
              <span className="tabular-nums text-muted-foreground">{formatTime(e.t)}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function findActive(events: BallEvent[], t: number): number {
  let res = -1
  for (let i = 0; i < events.length; i++) {
    if (events[i].t <= t + 0.15 && events[i].t >= t - 0.6) res = i
  }
  return res
}

function formatTime(t: number) {
  const m = Math.floor(t / 60)
  const s = Math.floor(t % 60)
  return `${m}:${s.toString().padStart(2, "0")}`
}
