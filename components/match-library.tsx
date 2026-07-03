"use client"

import { Check, ListVideo } from "lucide-react"
import { MATCHES } from "@/lib/matches"
import { cn } from "@/lib/utils"

interface MatchLibraryProps {
  selectedId: string | null
  onSelect: (id: string) => void
}

/** 앱에 내장된 경기 목록 — 사용자는 파일 없이 목록에서 선택만 하면 된다. */
export function MatchLibrary({ selectedId, onSelect }: MatchLibraryProps) {
  return (
    <section className="rounded-xl border border-border bg-card p-4" aria-labelledby="library-heading">
      <div className="mb-3 flex items-center gap-2">
        <ListVideo className="size-5 text-primary" aria-hidden="true" />
        <h2 id="library-heading" className="text-base font-semibold">
          경기 선택
        </h2>
      </div>

      <ul className="flex flex-col gap-2" role="list">
        {MATCHES.map((m) => {
          const selected = m.id === selectedId
          return (
            <li key={m.id}>
              <button
                type="button"
                onClick={() => onSelect(m.id)}
                aria-pressed={selected}
                aria-label={`${m.title}. ${m.subtitle}. 길이 약 ${m.durationSec}초. ${m.description}`}
                className={cn(
                  "flex w-full flex-col gap-1 rounded-lg border p-3 text-left transition-colors",
                  "min-h-16 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  selected
                    ? "border-primary bg-primary/10"
                    : "border-border bg-secondary/40 hover:bg-secondary",
                )}
              >
                <span className="flex items-center justify-between gap-2">
                  <span className="text-sm font-semibold text-pretty">{m.title}</span>
                  {selected && <Check className="size-4 shrink-0 text-primary" aria-hidden="true" />}
                </span>
                <span className="text-xs text-muted-foreground text-pretty">
                  {m.subtitle} · 약 {m.durationSec}초
                </span>
              </button>
            </li>
          )
        })}
      </ul>

      <p className="mt-3 text-xs text-muted-foreground text-pretty">
        경기를 선택하면 진동과 소리로 공의 위치·움직임을 전달합니다. 영상은 필요하지 않으며, 이어폰을 착용하면 방향이 더 잘 느껴집니다.
      </p>
    </section>
  )
}
