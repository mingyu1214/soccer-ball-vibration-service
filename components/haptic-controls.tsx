"use client"

import { Button } from "@/components/ui/button"
import type { HapticSettings } from "@/lib/haptics"
import { Vibrate } from "lucide-react"

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
    <section className="rounded-2xl border border-border bg-card p-5" aria-labelledby="haptic-heading">
      <div className="mb-5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Vibrate className="size-5 text-primary" aria-hidden="true" />
          <h2 id="haptic-heading" className="text-base font-bold text-foreground">진동 설정</h2>
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={onTest}
          className="h-10 rounded-xl border-primary/30 px-4 font-semibold text-primary hover:bg-primary/10"
          aria-label="진동 테스트"
        >
          테스트
        </Button>
      </div>

      {native && (
        <p className="mb-4 rounded-xl bg-primary/10 px-4 py-3 text-sm font-medium text-primary" role="status">
          네이티브 앱 모드 — iPhone·안드로이드에서 강한 햅틱이 동작합니다.
        </p>
      )}
      {!supported && !native && (
        <p className="mb-4 rounded-xl bg-destructive/8 px-4 py-3 text-sm text-destructive text-pretty" role="alert">
          이 브라우저는 진동을 지원하지 않습니다. 안드로이드 Chrome에서 열어주세요. iPhone은 앱 설치 시 진동이 동작합니다.
        </p>
      )}

      <Range
        label="진동 세기"
        value={settings.intensity}
        min={0.2}
        max={1}
        step={0.05}
        format={(v) => `${Math.round(v * 100)}%`}
        onChange={(v) => set({ intensity: v })}
      />
    </section>
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
      <div className="mb-2 flex items-center justify-between">
        <span className="text-sm font-semibold text-foreground">{label}</span>
        <span className="rounded-lg bg-secondary px-2 py-0.5 text-xs font-bold text-foreground">{format(value)}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        aria-label={label}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-2 w-full cursor-pointer appearance-none rounded-full bg-secondary accent-primary"
      />
    </div>
  )
}
