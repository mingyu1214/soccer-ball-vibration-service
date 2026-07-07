"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Play, Pause, RotateCcw, Vibrate, Upload } from "lucide-react"
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
import { VideoCanvas } from "@/components/video-canvas"
import { HapticControls } from "@/components/haptic-controls"
import { EventLog } from "@/components/event-log"
import { AboutPage } from "@/components/about-page"

const EMPTY_BALL: BallState = { detected: false, nx: 0.5, ny: 0.5, speed: 0, angle: 0, vx: 0, vy: 0 }

type DemoClip = { id: string; title: string; video: string; detection: string }

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
  const videoInputRef = useRef<HTMLInputElement>(null)

  const [videoSrc, setVideoSrc] = useState<string | null>(null)
  const [detection, setDetection] = useState<DetectionData | null>(null)
  const [events, setEvents] = useState<BallEvent[]>([])
  const [error, setError] = useState<string | null>(null)

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
  const [tab, setTab] = useState<"service" | "about">("service")
  const lastLiveSide = useRef<string | null>(null)

  // 모바일/데스크톱 레이아웃은 CSS(md:)로만 나뉘어 있어서 <video>가 둘 다 DOM에
  // 동시에 존재함 — ref를 두 곳에 나눠주면 안 되니, 실제 보이는 쪽 하나에만
  // videoRef를 연결하기 위해 현재 화면 크기를 JS로도 추적한다.
  const [isDesktop, setIsDesktop] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)")
    setIsDesktop(mq.matches)
    const handler = (e: MediaQueryListEvent) => setIsDesktop(e.matches)
    mq.addEventListener("change", handler)
    return () => mq.removeEventListener("change", handler)
  }, [])

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

  useEffect(() => { engineRef.current?.updateSettings(settings) }, [settings])

  useEffect(() => {
    if (!detection) { setEvents([]); return }
    setEvents(buildEventTimeline(detection))
  }, [detection])

  const applyDetection = useCallback((data: DetectionData, label: string) => {
    setDetection(data)
    lastProcessedT.current = 0
    setError(null)
    void label
  }, [])

  // 시연 클립 목록 로드 (public/demos.json)
  const [demos, setDemos] = useState<DemoClip[]>([])
  const [activeDemoId, setActiveDemoId] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    fetch("/demos.json")
      .then((res) => res.json())
      .then((data: DemoClip[]) => { if (!cancelled) setDemos(data) })
      .catch(() => { if (!cancelled) setError("시연 클립 목록을 불러오지 못했습니다.") })
    return () => { cancelled = true }
  }, [])

  // 클릭한 클립들의 fetch가 순서대로 응답 온다는 보장이 없어서, 응답이 왔을 때
  // "지금도 여전히 이 클립이 선택된 상태인지" 확인 후에만 반영한다 (레이스 컨디션 방지)
  const requestedDemoId = useRef<string | null>(null)

  const selectDemo = useCallback(async (demo: DemoClip) => {
    setError(null)
    setActiveDemoId(demo.id)
    requestedDemoId.current = demo.id
    setVideoSrc((prev) => {
      if (prev && prev.startsWith("blob:")) URL.revokeObjectURL(prev)
      return demo.video
    })
    try {
      const res = await fetch(demo.detection)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const parsed = parseDetectionData(await res.json())
      if (requestedDemoId.current !== demo.id) return // 그 사이 다른 클립으로 바뀌었으면 무시
      applyDetection(parsed, demo.title)
    } catch (e) {
      if (requestedDemoId.current !== demo.id) return
      setError(`감지 데이터 로드 실패: ${e instanceof Error ? e.message : String(e)}`)
    }
  }, [applyDetection])

  // 사용자가 직접 업로드한 영상: 재생만 가능, 진동은 지원하지 않음 (감지 데이터가 없으므로)
  const handleVideoFile = useCallback((file: File) => {
    const url = URL.createObjectURL(file)
    requestedDemoId.current = null // 진행 중이던 클립 fetch 응답이 와도 무시되게
    setActiveDemoId(null)
    setDetection(null)
    setVideoSrc((prev) => { if (prev && prev.startsWith("blob:")) URL.revokeObjectURL(prev); return url })
    setError(null)
  }, [])

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

  const loop = useCallback(() => {
    const video = videoRef.current
    const engine = engineRef.current
    if (!video || !detection) { rafRef.current = requestAnimationFrame(loop); return }
    const t = video.currentTime
    setCurrentTime(t)
    const state = computeBallState(detection, t)
    setBall(state)
    // 진동은 영상 재생 중에만 발생
    if (!video.paused && engine?.tickContinuous(performance.now(), state)) {
      setPulse(true)
      window.setTimeout(() => setPulse(false), 90)
    }
    if (state.detected) {
      const word = horizontalWord(state.nx)
      if (word !== lastLiveSide.current) { lastLiveSide.current = word; setLiveStatus(`공 위치: ${word}`) }
    } else if (lastLiveSide.current !== "lost") {
      lastLiveSide.current = "lost"; setLiveStatus("공을 추적하지 못하고 있습니다")
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
    if (video.paused) {
      video.play()
        .then(() => setIsPlaying(true))
        .catch(err => console.error("[v0] Play error:", err.message))
    } else {
      video.pause()
      setIsPlaying(false)
    }
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

  const ready = Boolean(videoSrc && detection)
  const progressLabel = useMemo(() => `${formatTime(currentTime)} / ${formatTime(duration)}`, [currentTime, duration])

  const statusText = activeEventLabel
    ? activeEventLabel
    : ball.detected
      ? `공: ${horizontalWord(ball.nx)}`
      : ready ? "공 추적 대�� 중" : "시연 클립을 선택하세요"

  return (
    <div className="min-h-screen bg-background">
      <p aria-live="assertive" className="sr-only">{liveStatus}</p>
      <a href="#play-btn" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground">
        재생 버튼으로 건너뛰기
      </a>

      {/* 헤더 */}
      <header className="border-b border-border bg-card px-4 md:px-8">
        <div className="mx-auto flex max-w-6xl items-center gap-3 py-3 md:py-4">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary md:size-12 md:rounded-2xl" aria-hidden="true">
            <Vibrate className="size-5 text-primary-foreground md:size-6" />
          </div>
          <div>
            <h1 className="text-lg font-black tracking-tight text-foreground md:text-2xl">HaptiBall</h1>
            <p className="hidden text-sm text-muted-foreground md:block">축구 공을 진동으로 — 시각장애인 접근성 서비스</p>
          </div>
          <div className="ml-auto shrink-0">
            {native ? (
              <span className="rounded-full bg-primary/15 px-2.5 py-1 text-xs font-semibold text-primary">네이티브 앱</span>
            ) : supported ? (
              <span className="rounded-full bg-primary/15 px-2.5 py-1 text-xs font-semibold text-primary">진동 지원</span>
            ) : (
              <span className="rounded-full bg-destructive/10 px-2.5 py-1 text-xs font-semibold text-destructive">진동 미지원</span>
            )}
          </div>
        </div>

        {/* 탭 */}
        <nav className="mx-auto flex max-w-6xl" aria-label="메뉴">
          {(["service", "about"] as const).map((t) => (
            <button
              key={t}
              role="tab"
              aria-selected={tab === t}
              onClick={() => setTab(t)}
              className={[
                "relative px-4 py-3 text-sm font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                tab === t
                  ? "text-primary after:absolute after:bottom-0 after:left-0 after:h-0.5 after:w-full after:bg-primary"
                  : "text-muted-foreground hover:text-foreground",
              ].join(" ")}
            >
              {t === "service" ? "서비스" : "소개 / 기술 스택"}
            </button>
          ))}
        </nav>
      </header>

      {/* 소개 탭 */}
      {tab === "about" && <AboutPage />}

      {/* 서비스 탭 */}
      {tab === "service" && (
        <>
          {/* 상태 배너 — 진동 중일 때 강조 */}
          <div
            className={`px-4 py-3 transition-colors md:px-8 ${pulse ? "bg-primary/15" : "bg-card"} border-b border-border`}
            aria-hidden="true"
          >
            <div className="mx-auto flex max-w-6xl items-center gap-3">
              <span className={`block size-4 shrink-0 rounded-full transition-all duration-75 ${pulse ? "scale-150 bg-primary" : "bg-primary/30"}`} />
              <span className="text-base font-bold text-foreground md:text-xl">{statusText}</span>
            </div>
          </div>

          {/* ── 모바일 레이아웃 ── */}
          <div className="flex flex-col md:hidden">

            {/* 0. 시연 클립 선택 — 진동이 실제로 동작하는 유일한 방법 */}
            <div className="border-b border-border bg-card px-4 py-3">
              <h2 className="mb-2 text-sm font-bold text-foreground">시연 클립 선택</h2>
              <div className="flex flex-col gap-2">
                {demos.map((demo) => (
                  <button
                    key={demo.id}
                    onClick={() => selectDemo(demo)}
                    aria-pressed={activeDemoId === demo.id}
                    className={[
                      "flex items-center justify-between rounded-xl border px-4 py-3 text-left text-sm font-bold",
                      activeDemoId === demo.id
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-secondary/40 text-foreground hover:bg-secondary",
                    ].join(" ")}
                  >
                    {demo.title}
                    {activeDemoId === demo.id && <span aria-hidden="true">✓</span>}
                  </button>
                ))}
                {demos.length === 0 && (
                  <p className="text-sm text-muted-foreground">시연 클립을 불러오는 중입니다...</p>
                )}
              </div>
            </div>

            {/* 1. 직접 업로드 — 재생 미리보기만 가능, 진동은 지원하지 않음 */}
            <div className="border-b border-border bg-card px-4 py-3">
              <input
                ref={videoInputRef}
                type="file"
                accept="video/*"
                className="hidden"
                aria-hidden="true"
                onChange={(e) => e.target.files?.[0] && handleVideoFile(e.target.files[0])}
              />
              <button
                onClick={() => videoInputRef.current?.click()}
                className="flex w-full items-center justify-center gap-3 rounded-xl border-2 border-dashed border-border bg-secondary/20 px-4 py-4"
                aria-label="내 영상 업로드 (미리보기 전용, 진동 미지원)"
              >
                <Upload className="size-5 text-muted-foreground" aria-hidden="true" />
                <span className="text-sm font-bold text-muted-foreground">내 영상 업로드 (미리보기만, 진동 없음)</span>
              </button>
              {error && (
                <p className="mt-2 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive" role="alert">{error}</p>
              )}
            </div>

            {/* 2. 재생 컨트롤 — 항상 상단 고정 느낌 */}
            <section id="play-btn" className="bg-card px-4 py-4 border-b border-border" aria-label="재생 컨트롤">
              <div className="flex gap-3">
                <Button
                  onClick={togglePlay}
                  disabled={!videoSrc}
                  className="h-16 flex-1 rounded-2xl text-xl font-black"
                  aria-label={isPlaying ? "일시정지" : "재생 및 진동 시작"}
                >
                  {isPlaying ? <Pause className="mr-2 size-7" /> : <Play className="mr-2 size-7" />}
                  {isPlaying ? "일시정지" : "재생"}
                </Button>
                <Button
                  size="icon"
                  variant="secondary"
                  onClick={restart}
                  disabled={!videoSrc}
                  aria-label="처음으로 되감기"
                  className="size-16 rounded-2xl"
                >
                  <RotateCcw className="size-6" />
                </Button>
              </div>
              <div className="mt-3 flex items-center gap-3">
                <input
                  type="range" min={0} max={duration || 0} step={0.05} value={currentTime}
                  onChange={(e) => seek(Number(e.target.value))}
                  disabled={!videoSrc}
                  aria-label="재생 위치" aria-valuetext={progressLabel}
                  className="h-3 flex-1 cursor-pointer appearance-none rounded-full bg-secondary accent-primary disabled:opacity-40"
                />
                <span className="w-20 shrink-0 text-right text-sm tabular-nums text-muted-foreground font-medium">{progressLabel}</span>
              </div>
            </section>

            {/* 2-1. 영상 — videoSrc가 있을 때만, 모바일 화면일 때만 표시 (ref 중복 방지) */}
            {videoSrc && !isDesktop && (
            <div className="border-b border-border">
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
            </div>
            )}

            {/* 3. 진동 세기 + 이벤트 — 하단 */}
            <div className="px-4 py-4 flex flex-col gap-4">
              <HapticControls
                settings={settings}
                supported={supported}
                native={native}
                onChange={setSettings}
                onTest={() => engineRef.current?.testPulse()}
              />
              <EventLog events={events} currentTime={currentTime} onSeek={seek} />
            </div>
          </div>

          {/* ── 데스크톱 레이아웃 ── */}
          <main className="mx-auto hidden max-w-6xl px-8 py-8 md:block">
            <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
              <div className="flex flex-col gap-5">
                {isDesktop && (
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
                )}
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
                    <Button size="icon" variant="secondary" onClick={restart} disabled={!videoSrc} aria-label="처음으로 되감기" className="size-16 rounded-xl">
                      <RotateCcw className="size-6" />
                    </Button>
                  </div>
                  <div className="mt-4 flex items-center gap-3">
                    <input
                      type="range" min={0} max={duration || 0} step={0.05} value={currentTime}
                      onChange={(e) => seek(Number(e.target.value))}
                      disabled={!videoSrc}
                      aria-label="재생 위치" aria-valuetext={progressLabel}
                      className="h-3 flex-1 cursor-pointer appearance-none rounded-full bg-secondary accent-primary disabled:opacity-40"
                    />
                    <span className="w-24 shrink-0 text-right text-sm tabular-nums text-muted-foreground font-medium">{progressLabel}</span>
                  </div>
                  {!ready && (
                    <p className="mt-4 rounded-xl bg-primary/8 px-4 py-3 text-sm font-medium text-primary text-pretty">
                      오른쪽에서 시연 클립을 선택하면 진동이 시작됩니다.
                    </p>
                  )}
                </section>
              </div>
              <div className="flex flex-col gap-5">
                {/* 시연 클립 선택 — 진동이 실제로 동작하는 유일한 방법 */}
                <section className="rounded-2xl border border-border bg-card p-5" aria-label="시연 클립 선택">
                  <h2 className="mb-4 text-base font-bold text-foreground">시연 클립 선택</h2>
                  <div className="flex flex-col gap-2">
                    {demos.map((demo) => (
                      <button
                        key={demo.id}
                        onClick={() => selectDemo(demo)}
                        aria-pressed={activeDemoId === demo.id}
                        className={[
                          "flex items-center justify-between rounded-xl border px-4 py-3 text-left text-sm font-bold",
                          activeDemoId === demo.id
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border bg-secondary/40 text-foreground hover:bg-secondary",
                        ].join(" ")}
                      >
                        {demo.title}
                        {activeDemoId === demo.id && <span aria-hidden="true">✓</span>}
                      </button>
                    ))}
                    {demos.length === 0 && (
                      <p className="text-sm text-muted-foreground">시연 클립을 불러오는 중입니다...</p>
                    )}
                  </div>
                  {error && <p className="mt-3 rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive" role="alert">{error}</p>}
                </section>

                {/* 직접 업로드 — 재생 미리보기만 가능, 진동은 지원하지 않음 */}
                <section className="rounded-2xl border border-border bg-card p-5" aria-label="내 영상 업로드">
                  <h2 className="mb-3 text-base font-bold text-foreground">내 영상 업로드</h2>
                  <p className="mb-3 text-sm text-muted-foreground">현재는 위 시연 클립만 진동이 지원됩니다. 직접 올린 영상은 미리보기(재생)만 가능해요.</p>
                  <input
                    type="file" accept="video/*" className="hidden" aria-hidden="true"
                    onChange={(e) => e.target.files?.[0] && handleVideoFile(e.target.files[0])}
                    ref={(el) => { if (el && !videoInputRef.current) (videoInputRef as React.MutableRefObject<HTMLInputElement | null>).current = el }}
                  />
                  <button
                    onClick={() => videoInputRef.current?.click()}
                    className="flex w-full flex-col items-center gap-3 rounded-xl border-2 border-dashed border-border bg-secondary/20 px-4 py-8 text-center hover:bg-secondary/30"
                    aria-label="내 영상 업로드 (미리보기 전용, 진동 미지원)"
                  >
                    <Upload className="size-8 text-muted-foreground" />
                    <div>
                      <p className="text-base font-bold text-foreground">영상 업로드</p>
                      <p className="mt-1 text-sm text-muted-foreground">MP4, MOV, AVI 등 (미리보기만)</p>
                    </div>
                  </button>
                </section>
                <HapticControls settings={settings} supported={supported} native={native} onChange={setSettings} onTest={() => engineRef.current?.testPulse()} />
                <EventLog events={events} currentTime={currentTime} onSeek={seek} />
              </div>
            </div>
          </main>
        </>
      )}
    </div>
  )
}

function formatTime(t: number) {
  if (!Number.isFinite(t)) return "0:00"
  const m = Math.floor(t / 60)
  const s = Math.floor(t % 60)
  return `${m}:${s.toString().padStart(2, "0")}`
}
