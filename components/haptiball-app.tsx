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
import { initVibrationBridge, isNativeApp, isVibrationAvailable } from "@/lib/vibration-bridge"
import { SourcePanel } from "@/components/source-panel"
import { VideoCanvas } from "@/components/video-canvas"
import { PitchRadar } from "@/components/pitch-radar"
import { HapticControls } from "@/components/haptic-controls"
import { EventLog } from "@/components/event-log"

const EMPTY_BALL: BallState = { detected: false, nx: 0.5, ny: 0.5, speed: 0, angle: 0, vx: 0, vy: 0 }

function horizontalWord(nx: number): string {
  if (nx < 0.33) return "왼쪽"
  if (nx > 0.67) return "오른쪽"
  return "중앙"
}

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
  const [native, setNative] = useState(false)
  const [liveStatus, setLiveStatus] = useState("")
  const lastLiveSide = useRef<string | null>(null)

  // 엔진 초기화 (클라이언트 마운트 후 — SSR 하이드레이션 방지)
  useEffect(() => {
    let cancelled = false
    initVibrationBridge().then(() => {
      if (cancelled) return
      setNative(isNativeApp())
      setSupported(isVibrationAvailable())
    })
    if (engineRef.current === null) engineRef.current = new HapticEngine(settings)
    setSupported(engineRef.current.isSupported)
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    engineRef.current?.updateSettings(settings)
  }, [settings])

  useEffect(() => {
    if (!detection) { setEvents([]); return }
    setEvents(buildEventTimeline(detection))
  }, [detection])

  const applyDetection = useCallback((data: DetectionData, label: string) => {
    setDetection(data)
    lastProcessedT.current = 0
    const detected = data.frames.filter((f) => f.x !== null).length
    setDetectionInfo(`${label} · ${data.frames.length}프레임 · 공 검출 ${detected}프레임 · ${data.width}×${data.height}`)
    setError(null)
  }, [])

  // 내장 감지 데이터 자동 로드
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch("/detection.json")
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const parsed = parseDetectionData(await res.json())
        if (!cancelled) applyDetection(parsed, "내장 감지 데이터")
      } catch (e) {
        if (!cancelled) setError(`감지 데이터 로드 실패: ${e instanceof Error ? e.message : String(e)}`)
      }
    })()
    return () => { cancelled = true }
  }, [applyDetection])

  const handleVideoFile = useCallback((file: File) => {
    const url = URL.createObjectURL(file)
    setVideoSrc((prev) => { if (prev) URL.revokeObjectURL(prev); return url })
    setError(null)
  }, [])

  const handleDetectionFile = useCallback(async (file: File) => {
    try {
      const text = await file.text()
      const parsed = parseDetectionData(JSON.parse(text))
      applyDetection(parsed, file.name)
    } catch (e) {
      setError(`감지 JSON 오류: ${e instanceof Error ? e.message : String(e)}`)
    }
  }, [applyDetection])

  const fireEventsBetween = useCallback((from: number, to: number, list: BallEvent[]) => {
    const engine = engineRef.current
    for (const ev of list) {
      if (ev.t > from && ev.t <= to) {
        engine?.fireEvent(ev.type, ev.intensity)
        setActiveEventLabel(EVENT_LABELS[ev.type])
        setLiveStatus(EVENT_LABELS[ev.type])
        window.setTimeout(() => setActiveEventLabel(null), 900)
      }
    }
  }, [])

  // 메인 rAF 루프
  const loop = useCallback(() => {
    const video = videoRef.current
    const engine = engineRef.current
    if (!video || !detection) { rafRef.current = requestAnimationFrame(loop); return }

    const t = video.currentTime
    setCurrentTime(t)
    const state = computeBallState(detection, t)
    setBall(state)

    if (engine?.tickContinuous(performance.now(), state)) {
      setPulse(true)
      window.setTimeout(() => setPulse(false), 90)
    }

    if (state.detected) {
      const word = horizontalWord(state.nx)
      if (word !== lastLiveSide.current) {
        lastLiveSide.current = word
        setLiveStatus(`공 위치: ${word}`)
      }
    } else if (lastLiveSide.current !== "lost") {
      lastLiveSide.current = "lost"
      setLiveStatus("공을 추적하지 못하고 있습니다")
    }

    if (t < lastProcessedT.current - 0.05) {
      lastProcessedT.current = t
    } else if (t > lastProcessedT.current) {
      fireEventsBetween(lastProcessedT.current, t, events)
      lastProcessedT.current = t
    }
    rafRef.current = requestAnimationFrame(loop)
  }, [detection, events, fireEventsBetween])

  useEffect(() => {
    rafRef.current = requestAnimationFrame(loop)
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current) }
  }, [loop])

  const handlePlay = () => setIsPlaying(true)
  const handlePause = () => { setIsPlaying(false); engineRef.current?.stop() }
  const handleEnded = () => { setIsPlaying(false); engineRef.current?.stop(); setLiveStatus("영상이 끝났습니다") }

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
    setLiveStatus("처음으로 이동했습니다")
  }

  const seek = (t: number) => {
    const video = videoRef.current
    if (!video) return
    video.currentTime = t
    lastProcessedT.current = t
    setCurrentTime(t)
  }

  const testVibration = () => engineRef.current?.testPulse()

  const ready = Boolean(videoSrc && detection)
  const progressLabel = useMemo(() => `${formatTime(currentTime)} / ${formatTime(duration)}`, [currentTime, duration])

  const statusText = activeEventLabel
    ? activeEventLabel
    : ball.detected
      ? `공: ${horizontalWord(ball.nx)}`
      : ready
        ? "공 추적 대기 중"
        : "경기 영상을 업로드하세요"

  return (
    <div className="min-h-screen bg-background">
      {/* 스크린리더 건너뛰기 링크 */}
      <a
        href="#controls"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground"
      >
        재생 컨트롤로 건너뛰기
      </a>

      {/* 스크린리더 라이브 리전 */}
      <p aria-live="assertive" className="sr-only">{liveStatus}</p>

      {/* 헤더 */}
      <header className="border-b border-border bg-card px-4 py-4 md:px-8">
        <div className="mx-auto flex max-w-6xl items-center gap-4">
          <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-primary" aria-hidden="true">
            <Vibrate className="size-6 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-xl font-black tracking-tight text-foreground md:text-2xl">HaptiBall</h1>
            <p className="text-sm text-muted-foreground">축구 공을 진동으로 — 시각장애인 접근성 서비스</p>
          </div>
          {/* 진동 지원 배지 */}
          <div className="ml-auto">
            {native ? (
              <span className="rounded-full bg-primary/15 px-3 py-1 text-xs font-semibold text-primary">네이티브 앱</span>
            ) : supported ? (
              <span className="rounded-full bg-primary/15 px-3 py-1 text-xs font-semibold text-primary">진동 지원</span>
            ) : (
              <span className="rounded-full bg-destructive/10 px-3 py-1 text-xs font-semibold text-destructive">진동 미지원</span>
            )}
          </div>
        </div>
      </header>

      {/* 공 위치 상태 배너 — 큰 텍스트로 저시력 사용자에게도 유용 */}
      <div className={`border-b border-border px-4 py-4 transition-colors md:px-8 ${pulse ? "bg-primary/10" : "bg-card"}`} aria-hidden="true">
        <div className="mx-auto flex max-w-6xl items-center gap-4">
          <span className={`block size-5 shrink-0 rounded-full transition-all duration-75 ${pulse ? "scale-150 bg-primary" : "bg-primary/40"}`} />
          <span className="text-xl font-bold tracking-tight text-foreground md:text-2xl">{statusText}</span>
        </div>
      </div>

      {/* 메인 콘텐츠 */}
      <main className="mx-auto max-w-6xl px-4 py-6 md:px-8 md:py-8">
        <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">

          {/* 좌측: 영상 + 재생 컨트롤 + 레이더 */}
          <div className="flex flex-col gap-5">
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

            {/* 재생 컨트롤 */}
            <section id="controls" className="rounded-2xl border border-border bg-card p-5" aria-label="재생 컨트롤">
              <div className="flex items-center gap-3">
                <Button
                  onClick={togglePlay}
                  disabled={!videoSrc}
                  className="h-16 flex-1 rounded-xl text-lg font-bold"
                  aria-label={isPlaying ? "일시정지" : "재생 및 진동 시작"}
                >
                  {isPlaying ? <Pause className="mr-2 size-6" /> : <Play className="mr-2 size-6" />}
                  {isPlaying ? "일시정지" : "재생"}
                </Button>
                <Button
                  size="icon"
                  variant="secondary"
                  onClick={restart}
                  disabled={!videoSrc}
                  aria-label="처음으로 되감기"
                  className="size-16 rounded-xl"
                >
                  <RotateCcw className="size-6" />
                </Button>
              </div>

              <div className="mt-4 flex items-center gap-3">
                <input
                  type="range"
                  min={0}
                  max={duration || 0}
                  step={0.05}
                  value={currentTime}
                  onChange={(e) => seek(Number(e.target.value))}
                  disabled={!videoSrc}
                  aria-label="재생 위치"
                  aria-valuetext={progressLabel}
                  className="h-3 flex-1 cursor-pointer appearance-none rounded-full bg-secondary accent-primary disabled:opacity-40"
                />
                <span className="w-24 shrink-0 text-right text-sm tabular-nums text-muted-foreground font-medium">
                  {progressLabel}
                </span>
              </div>

              {!ready && (
                <p className="mt-4 rounded-xl bg-primary/8 px-4 py-3 text-sm font-medium text-primary text-pretty">
                  감지 데이터가 내장되어 있습니다. 경기 영상만 업로드하면 진동이 시작됩니다.
                </p>
              )}
            </section>

            <PitchRadar ball={ball} />
          </div>

          {/* 우측: 소스 업로드 + 진동 설정 + 이벤트 */}
          <div className="flex flex-col gap-5">
            <SourcePanel
              hasVideo={Boolean(videoSrc)}
              hasDetection={Boolean(detection)}
              detectionInfo={detectionInfo}
              error={error}
              onVideoFile={handleVideoFile}
              onDetectionFile={handleDetectionFile}
              onUseSample={() => {}}
            />
            <HapticControls
              settings={settings}
              supported={supported}
              native={native}
              onChange={setSettings}
              onTest={testVibration}
            />
            <EventLog events={events} currentTime={currentTime} onSeek={seek} />
          </div>
        </div>
      </main>
    </div>
  )
}

function formatTime(t: number) {
  if (!Number.isFinite(t)) return "0:00"
  const m = Math.floor(t / 60)
  const s = Math.floor(t % 60)
  return `${m}:${s.toString().padStart(2, "0")}`
}
