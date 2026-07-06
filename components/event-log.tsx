"use client"

import { useState } from "react"

import { ChevronDown, ChevronUp } from "lucide-react"
import { EVENT_LABELS, type BallEvent, type BallEventType } from "@/lib/detection"
import { cn } from "@/lib/utils"

interface EventLogProps {
  events: BallEvent[]
  currentTime: number
  onSeek: (t: number) => void
}

const TYPE_STYLES: Record<BallEventType, string> = {
  shot:      "bg-destructive/15 text-destructive font-black",
  direction: "bg-accent/20 text-accent-foreground font-bold",
  left:      "bg-primary/15 text-primary font-bold",
  right:     "bg-primary/15 text-primary font-bold",
  lost:      "bg-muted text-muted-foreground",
  found:     "bg-primary/15 text-primary font-bold",
}

export function EventLog({ events, currentTime, onSeek }: EventLogProps) {
  const [open, setOpen] = useState(false)
  const activeIdx = findActive(events, currentTime)

  return (
    <section className="rounded-2xl border border-border bg-card" aria-labelledby="events-heading">
      {/* 헤더 — 클릭으로 펼치기/접기 */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-3 px-5 py-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset rounded-2xl"
        aria-expanded={open}
        aria-controls="events-list"
      >
        <div className="flex items-center gap-3">
          <h2 id="events-heading" className="text-base font-bold text-foreground">이벤트 타임라인</h2>
          {activeIdx >= 0 && (
            <span className="rounded-lg bg-primary/15 px-2 py-0.5 text-xs font-bold text-primary">
              {EVENT_LABELS[events[activeIdx].type]}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-lg bg-secondary px-2 py-1 text-xs font-bold text-foreground">
            {events.length}개
          </span>
          {open ? <ChevronUp className="size-4 text-muted-foreground" /> : <ChevronDown className="size-4 text-muted-foreground" />}
        </div>
      </button>

      {/* 목록 — 내부 스크롤, 페이지 스크롤 없음 */}
      {open && (
        <div
          id="events-list"
          className="max-h-56 overflow-y-auto border-t border-border px-5 pb-5 pt-3"
          role="list"
          aria-label="감지된 이벤트 목록"
        >
          {events.length === 0 ? (
            <p className="text-sm text-muted-foreground">감지 데이터가 로드되면 이벤트가 생성됩니다.</p>
          ) : (
            <div className="flex flex-col gap-1.5">
              {events.map((e, i) => (
                <button
                  key={`${e.t}-${e.type}-${i}`}
                  role="listitem"
                  onClick={() => onSeek(e.t)}
                  aria-label={`${EVENT_LABELS[e.type]}, ${formatTime(e.t)}로 이동`}
                  className={cn(
                    "flex items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                    i === activeIdx && "bg-primary/10 ring-2 ring-primary",
                  )}
                >
                  <span className={cn("rounded-lg px-2.5 py-1 text-xs", TYPE_STYLES[e.type])}>
                    {EVENT_LABELS[e.type]}
                  </span>
                  <span className="tabular-nums text-xs font-semibold text-muted-foreground">{formatTime(e.t)}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </section>
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
