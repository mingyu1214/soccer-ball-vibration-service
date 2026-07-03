"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Play, Pause, RotateCcw, Vibrate } from "lucide-react"
import {
  buildEventTimeline,
  computeBallState,
  parseDetectionData,
  EVENT_LABELS,
  type BallEvent,
  type BallState,
  type DetectionData,
} from "@/lib/detection"
import { DEFAULT_SETTINGS, HapticEngine, type HapticSettings } from "@/lib/haptics"
import { generateSampleDetection } from "@/lib/sample-data"
import { SourcePanel } from "@/components/source-panel"
import { VideoCanvas } from "@/components/video-canvas"
import { PitchRadar } from "@/components/pitch-radar"
import { HapticControls } from "@/components/haptic-controls"
import { EventLog } from "@/components/event-log"

const EMPTY_BALL: BallState = { detected: false, nx: 0.5, ny: 0.5, speed: 0, angle: 0, vx: 0, vy: 0 }

export function HaptiBallApp() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const engineRef = useRef<HapticEngine | null>(null)
  const rafRef = useRef<number | null>(null)
  const lastProcessedT = useRef(0)

  const [videoSrc, setVideoSrc] = useState<string | null>(null)
  const [detection, setDetection] = useState<DetectionData | null>(null)
  const [events, setEvents] = useState<BallEvent[]>([])
  const [error, setError] = useState<string | null>(null)
  const [detectionInfo, setDetectionInfo] = useState<string | null>(null)

  const [settings, setSettings] = useState<HapticSettings>(DEFAULT_SETTINGS)
  const [ball, setBall] = useState<BallState>(EMPTY_BALL)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [pulse, setPulse] = useState(false)
  const [activeEventLabel, setActiveEventLabel] = useState<string | null>(null)
  const [supported, setSupported] = useState(false)

  // 엔진 초기화 (클라이언트 마운트 후에만 — SSR 하이드레이션 불일치 방지)
  useEffect(() => {
    if (engineRef.current === null) {
      engineRef.current = new HapticEngine(settings)
    }
    setSupported(engineRef.current.isSupported)
    // settings 는 마운트 시점 기본값으로 초기화, 이후 아래 effect 가 동기화
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    engineRef.current?.updateSettings(settings)
  }, [settings])

  // 감지 데이터가 바뀌면 이벤트 타임라인 재계산
  useEffect(() => {
    if (!detection) {
      setEvents([])
      return
    }
    setEvents(buildEventTimeline(detection))
  }, [detection])

  const applyDetection = useCallback((data: DetectionData, label: string) => {
    setDetection(data)
    lastProcessedT.current = 0
    const detected = data.frames.filter((f) => f.x !== null).length
    setDetectionInfo(
      `${label} · ${data.frames.length}프레임 · 공 검출 ${detected}프레임 · ${data.width}×${data.height}`,
    )
    setError(null)
  }, [])

  // 파일 핸들러
  const handleVideoFile = useCallback((file: File) => {
    const url = URL.createObjectURL(file)
    setVideoSrc((prev) => {
      if (prev) URL.revokeObjectURL(prev)
      return url
    })
    setError(null)
  }, [])

  const handleDetectionFile = useCallback(
    async (file: File) => {
      try {
        const text = await file.text()
        const parsed = parseDetectionData(JSON.parse(text))
        applyDetection(parsed, file.name)
      } catch (e) {
        setError(`감지 JSON 오류: ${e instanceof Error ? e.message : String(e)}`)
      }
    },
    [applyDetection],
  )

  const handleUseSample = useCallback(() => {
    applyDetection(generateSampleDetection(), "샘플 데이터")
  }, [applyDetection])

  // 이벤트 발화 (재생 시점 진행분)
  const fireEventsBetween = useCallback((from: number, to: number, data: DetectionData, list: BallEvent[]) => {
    const engine = engineRef.current
    for (const ev of list) {
      if (ev.t > from && ev.t <= to) {
        engine?.fireEvent(ev.type, ev.intensity)
        setActiveEventLabel(EVENT_LABELS[ev.type])
        window.setTimeout(() => setActiveEventLabel(null), 700)
      }
    }
  }, [])

  // 메인 루프
  const loop = useCallback(() => {
    const video = videoRef.current
    const engine = engineRef.current
    if (!video || !detection) {
      rafRef.current = requestAnimationFrame(loop)
      return
    }

    const t = video.currentTime
    setCurrentTime(t)

    const state = computeBallState(detection, t)
    setBall(state)

    // 지속 진동
    if (engine?.tickContinuous(performance.now(), state)) {
      setPulse(true)
      window.setTimeout(() => setPulse(false), 90)
    }

    // 이벤트 진동 (seek 대비: 뒤로 이동하면 리셋)
    if (t < lastProcessedT.current - 0.05) {
      lastProcessedT.current = t
    } else if (t > lastProcessedT.current) {
      fireEventsBetween(lastProcessedT.current, t, detection, events)
      lastProcessedT.current = t
    }

    rafRef.current = requestAnimationFrame(loop)
  }, [detection, events, fireEventsBetween])

  useEffect(() => {
    rafRef.current = requestAnimationFrame(loop)
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [loop])

  // 재생/일시정지 시 엔진 정지
  const handlePlay = () => setIsPlaying(true)
  const handlePause = () => {
    setIsPlaying(false)
    engineRef.current?.stop()
  }
  const handleEnded = () => {
    setIsPlaying(false)
    engineRef.current?.stop()
  }

  const togglePlay = () => {
    const video = videoRef.current
    if (!video || !videoSrc) return
    if (video.paused) video.play()
    else video.pause()
  }

  const restart = () => {
    const video = videoRef.current
    if (!video) return
    video.currentTime = 0
    lastProcessedT.current = 0
  }

  const seek = (t: number) => {
    const video = videoRef.current
    if (!video) return
    video.currentTime = t
    lastProcessedT.current = t
    setCurrentTime(t)
  }

  const handleSeekBar = (e: React.ChangeEvent<HTMLInputElement>) => {
    seek(Number(e.target.value))
  }

  const testVibration = () => engineRef.current?.testPulse()

  const ready = Boolean(videoSrc && detection)

  const progressLabel = useMemo(() => `${formatTime(currentTime)} / ${formatTime(duration)}`, [currentTime, duration])

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 md:py-10">
      <header className="mb-6 flex items-center gap-3">
        <span className="flex size-10 items-center justify-center rounded-xl bg-primary/15 text-primary">
          <Vibrate className="size-5" />
        </span>
        <div>
          <h1 className="text-lg font-bold leading-tight md:text-xl">HaptiBall</h1>
          <p className="text-xs text-muted-foreground md:text-sm text-pretty">
            축구 영상의 공 위치를 진동(촉각)으로 — 시각 정보 접근성 서비스
          </p>
        </div>
      </header>

      {activeEventLabel && (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-primary/40 bg-primary/10 px-3 py-2 text-sm font-medium text-primary">
          <Vibrate className="size-4 animate-pulse" />
          이벤트 진동: {activeEventLabel}
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-[1fr_20rem]">
        {/* 좌측: 영상 + 재생 컨트롤 */}
        <div className="flex flex-col gap-4">
          <VideoCanvas
            ref={videoRef}
            src={videoSrc}
            ball={ball}
            showOverlay={Boolean(detection)}
            lastPulse={pulse}
            onLoadedMetadata={() => setDuration(videoRef.current?.duration ?? 0)}
            onTimeUpdate={() => setCurrentTime(videoRef.current?.currentTime ?? 0)}
            onPlay={handlePlay}
            onPause={handlePause}
            onEnded={handleEnded}
          />

          {/* 재생 바 */}
          <div className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center gap-3">
              <Button size="icon" onClick={togglePlay} disabled={!videoSrc} aria-label={isPlaying ? "일시정지" : "재생"}>
                {isPlaying ? <Pause className="size-4" /> : <Play className="size-4" />}
              </Button>
              <Button size="icon" variant="secondary" onClick={restart} disabled={!videoSrc} aria-label="처음으로">
                <RotateCcw className="size-4" />
              </Button>
              <input
                type="range"
                min={0}
                max={duration || 0}
                step={0.05}
                value={currentTime}
                onChange={handleSeekBar}
                disabled={!videoSrc}
                aria-label="재생 위치"
                className="h-1.5 flex-1 cursor-pointer appearance-none rounded-full bg-secondary accent-primary disabled:opacity-50"
              />
              <span className="w-24 shrink-0 text-right text-xs tabular-nums text-muted-foreground">
                {progressLabel}
              </span>
            </div>
            {!ready && (
              <p className="mt-3 text-xs text-muted-foreground text-pretty">
                영상과 감지 데이터를 모두 불러오면 재생 중 진동이 발생합니다. 진동을 느끼려면 스마트폰에서 열어주세요.
              </p>
            )}
          </div>

          <PitchRadar ball={ball} />
        </div>

        {/* 우측: 소스 / 진동 설정 / 이벤트 */}
        <div className="flex flex-col gap-4">
          <SourcePanel
            hasVideo={Boolean(videoSrc)}
            hasDetection={Boolean(detection)}
            detectionInfo={detectionInfo}
            error={error}
            onVideoFile={handleVideoFile}
            onDetectionFile={handleDetectionFile}
            onUseSample={handleUseSample}
          />
          <HapticControls settings={settings} supported={supported} onChange={setSettings} onTest={testVibration} />
          <EventLog events={events} currentTime={currentTime} onSeek={seek} />
        </div>
      </div>
    </div>
  )
}

function formatTime(t: number) {
  if (!Number.isFinite(t)) return "0:00"
  const m = Math.floor(t / 60)
  const s = Math.floor(t % 60)
  return `${m}:${s.toString().padStart(2, "0")}`
}
