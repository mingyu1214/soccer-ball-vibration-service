"use client"

import { Button } from "@/components/ui/button"
import type { AudioSettings } from "@/lib/audio-cue"
import { cn } from "@/lib/utils"

interface AudioControlsProps {
  settings: AudioSettings
  audioOk: boolean
  speechOk: boolean
  onChange: (next: AudioSettings) => void
  onTest: () => void
}

export function AudioControls({ settings, audioOk, speechOk, onChange, onTest }: AudioControlsProps) {
  const set = (patch: Partial<AudioSettings>) => onChange({ ...settings, ...patch })

  return (
    <section className="rounded-xl border border-border bg-card p-4" aria-labelledby="audio-heading">
      <div className="mb-4 flex items-center justify-between">
        <h2 id="audio-heading" className="text-base font-semibold">
          소리 안내 설정
        </h2>
        <Button size="sm" variant="secondary" onClick={onTest} className="h-10 px-4">
          소리 테스트
        </Button>
      </div>

      {!audioOk && (
        <p className="mb-4 rounded-md bg-destructive/15 px-3 py-2 text-sm text-destructive text-pretty" role="alert">
          이 브라우저는 오디오를 지원하지 않습니다.
        </p>
      )}

      <div className="flex flex-col gap-3">
        <Toggle
          label="위치 소리"
          desc="공이 왼쪽이면 왼쪽 스피커, 높은 음일수록 위쪽·빠른 공"
          checked={settings.tone}
          onChange={(v) => set({ tone: v })}
        />
        <Toggle
          label="이벤트 음성 안내"
          desc="슛·방향 전환 등을 한국어 음성으로 읽어줌"
          checked={settings.speech}
          disabled={!speechOk}
          onChange={(v) => set({ speech: v })}
        />
        <Toggle
          label="위치 음성 안내"
          desc={'공의 좌우 위치가 바뀔 때 "왼쪽/가운데/오른쪽"을 말해줌'}
          checked={settings.positionSpeech}
          disabled={!speechOk}
          onChange={(v) => set({ positionSpeech: v })}
        />

        <Range
          label="음량"
          value={settings.volume}
          min={0}
          max={1}
          step={0.05}
          format={(v) => `${Math.round(v * 100)}%`}
          onChange={(v) => set({ volume: v })}
        />
      </div>

      {!speechOk && (
        <p className="mt-3 text-xs text-muted-foreground text-pretty">이 브라우저는 음성 안내(SpeechSynthesis)를 지원하지 않습니다.</p>
      )}
    </section>
  )
}

function Toggle({
  label,
  desc,
  checked,
  disabled,
  onChange,
}: {
  label: string
  desc: string
  checked: boolean
  disabled?: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span>
        <span className="block text-sm font-medium">{label}</span>
        <span className="block text-xs text-muted-foreground text-pretty">{desc}</span>
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative h-8 w-14 shrink-0 rounded-full border border-border transition-colors disabled:opacity-40",
          checked ? "bg-primary" : "bg-secondary",
        )}
      >
        <span
          className={cn(
            "absolute top-1 size-6 rounded-full bg-background transition-transform",
            checked ? "translate-x-6" : "translate-x-1",
          )}
        />
      </button>
    </div>
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
      <div className="mb-1 flex items-center justify-between text-sm">
        <span className="font-medium">{label}</span>
        <span className="text-muted-foreground tabular-nums">{format(value)}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        aria-label={label}
        aria-valuetext={format(value)}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-2 w-full cursor-pointer appearance-none rounded-full bg-secondary accent-primary"
      />
    </div>
  )
}
