"use client"

import { Button } from "@/components/ui/button"
import type { HapticSettings } from "@/lib/haptics"
import { cn } from "@/lib/utils"

interface HapticControlsProps {
  settings: HapticSettings
  supported: boolean
  native?: boolean
  onChange: (next: HapticSettings) => void
  onTest: () => void
}

export function HapticControls({ settings, supported, native = false, onChange, onTest }: HapticControlsProps) {
  const set = (patch: Partial<HapticSettings>) => onChange({ ...settings, ...patch })

  return (
    <section className="rounded-xl border border-border bg-card p-4" aria-labelledby="haptic-heading">
      <div className="mb-4 flex items-center justify-between">
        <h2 id="haptic-heading" className="text-base font-semibold">
          진동 설정
        </h2>
        <Button size="sm" variant="secondary" onClick={onTest} className="h-10 px-4">
          진동 테스트
        </Button>
      </div>

      {native && (
        <p className="mb-4 rounded-md bg-primary/15 px-3 py-2 text-sm text-primary text-pretty" role="status">
          네이티브 앱 모드입니다. iPhone·안드로이드에서 강한 네이티브 진동이 동작합니다.
        </p>
      )}

      {!supported && !native && (
        <p className="mb-4 rounded-md bg-destructive/15 px-3 py-2 text-sm text-destructive text-pretty" role="alert">
          이 브라우저는 진동을 지원하지 않습니다. 안드로이드 Chrome에서 열면 진동이 동작하고, iPhone은 웹 브라우저에서 진동이 막혀 있어 앱(HaptiBall) 설치 시 진동을 쓸 수 있습니다. 그동안은 소리·음성 안내를 이용하세요.
        </p>
      )}

      <div className="flex flex-col gap-3">
        <Toggle
          label="지속 진동"
          desc="공의 위치·속도에 따라 계속 진동"
          checked={settings.continuous}
          onChange={(v) => set({ continuous: v })}
        />
        <Toggle
          label="이벤트 진동"
          desc="슛·방향 전환·진영 이동 시 강조 진동"
          checked={settings.events}
          onChange={(v) => set({ events: v })}
        />

        <Range
          label="전체 세기"
          value={settings.intensity}
          min={0.2}
          max={1}
          step={0.05}
          format={(v) => `${Math.round(v * 100)}%`}
          onChange={(v) => set({ intensity: v })}
        />
        <Range
          label="느린 공 간격"
          value={settings.slowInterval}
          min={200}
          max={800}
          step={20}
          format={(v) => `${v}ms`}
          onChange={(v) => set({ slowInterval: v })}
        />
        <Range
          label="빠른 공 간격"
          value={settings.fastInterval}
          min={40}
          max={200}
          step={10}
          format={(v) => `${v}ms`}
          onChange={(v) => set({ fastInterval: v })}
        />
      </div>
    </section>
  )
}

function Toggle({
  label,
  desc,
  checked,
  onChange,
}: {
  label: string
  desc: string
  checked: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-4">
      <span>
        <span className="block text-sm font-medium">{label}</span>
        <span className="block text-xs text-muted-foreground">{desc}</span>
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative h-6 w-11 shrink-0 rounded-full border border-border transition-colors",
          checked ? "bg-primary" : "bg-secondary",
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 size-4 rounded-full bg-background transition-transform",
            checked ? "translate-x-5" : "translate-x-0.5",
          )}
        />
      </button>
    </label>
  )
}

function Range({
  label,
  value,
  min,
  max,
  step,
  format,
  onChange,
}: {
  label: string
  value: number
  min: number
  max: number
  step: number
  format: (v: number) => string
  onChange: (v: number) => void
}) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-xs">
        <span className="font-medium">{label}</span>
        <span className="text-muted-foreground">{format(value)}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        aria-label={label}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-secondary accent-primary"
      />
    </div>
  )
}
