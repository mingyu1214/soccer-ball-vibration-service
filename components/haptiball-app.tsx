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
import { AudioCueEngine, DEFAULT_AUDIO_SETTINGS, horizontalWord, type AudioSettings } from "@/lib/audio-cue"
import { generateSampleDetection } from "@/lib/sample-data"
import { SourcePanel } from "@/components/source-panel"
import { VideoCanvas } from "@/components/video-canvas"
import { PitchRadar } from "@/components/pitch-radar"
import { HapticControls } from "@/components/haptic-controls"
import { AudioControls } from "@/components/audio-controls"
import { EventLog } from "@/components/event-log"

const EMPTY_BALL: BallState = { detected: false, nx: 0.5, ny: 0.5, speed: 0, angle: 0, vx: 0, vy: 0 }

export function HaptiBallApp() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const engineRef = useRef<HapticEngine | null>(null)
  const audioRef = useRef<AudioCueEngine | null>(null)
  const rafRef = useRef<number | null>(null)
  const lastProcessedT = useRef(0)

  const [videoSrc, setVideoSrc] = useState<string | null>(null)
  const [detection, setDetection] = useState<DetectionData | null>(null)
  const [events, setEvents] = useState<BallEvent[]>([])
  const [error, setError] = useState<string | null>(null)
  const [detectionInfo, setDetectionInfo] = useState<string | null>(null)

  const [settings, setSettings] = useState<HapticSettings>(DEFAULT_SETTINGS)
  const [audioSettings, setAudioSettings] = useState<AudioSettings>(DEFAULT_AUDIO_SETTINGS)
  const [ball, setBall] = useState<BallState>(EMPTY_BALL)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [pulse, setPulse] = useState(false)
  const [activeEventLabel, setActiveEventLabel] = useState<string | null>(null)
  const [supported, setSupported] = useState(false)
  const [audioOk, setAudioOk] = useState(false)
  const [speechOk, setSpeechOk] = useState(false)
  // 스크린리더용 실시간 안내 문구
  const [liveStatus, setLiveStatus] = useState("")
  const lastLiveSide = useRef<string | null>(null)

  // 엔진 초기화 (클라이언트 마운트 후에만 — SSR 하이드레이션 불일치 방지)
  useEffect(() => {
    if (engineRef.current === null) engineRef.current = new HapticEngine(settings)
    if (audioRef.current === null) audioRef.current = new AudioCueEngine(audioSettings)
    setSupported(engineRef.current.isSupported)
    setAudioOk(audioRef.current.audioOk)
    setSpeechOk(audioRef.current.speechOk)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    engineRef.current?.updateSettings(settings)
  }, [settings])

  useEffect(() => {
    audioRef.current?.updateSettings(audioSettings)
  }, [audioSettings])

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

  // 이벤트 발화 (재생 시점 진행분): 진동 + 음성
  const fireEventsBetween = useCallback((from: number, to: number, list: BallEvent[]) => {
    const engine = engineRef.current
    const audio = audioRef.current
    for (const ev of list) {
      if (ev.t > from && ev.t <= to) {
        engine?.fireEvent(ev.type, ev.intensity)
        audio?.announceEvent(ev.type)
        setActiveEventLabel(EVENT_LABELS[ev.type])
        setLiveStatus(`${EVENT_LABELS[ev.type]}`)
        window.setTimeout(() => setActiveEventLabel(null), 900)
      }
    }
  }, [])

  // 메인 루프
  const loop = useCallback(() => {
    const video = videoRef.current
    const engine = engineRef.current
    const audio = audioRef.current
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

    // 연속 오디오 톤(스테레오 위치 + 피치)
    audio?.tickTone(state)

    // 스크린리더용 위치 안내 (좌우 구간이 바뀔 때만 업데이트하여 과도한 낭독 방지)
    if (state.detected) {
      const word = horizontalWord(state.nx)
      if (word !== lastLiveSide.current) {
        lastLiveSide.current = word
        const speedWord = state.speed > 0.6 ? "빠르게" : state.speed > 0.2 ? "이동 중" : "느리게"
        setLiveStatus(`공 위치: ${word}, ${speedWord}`)
      }
    } else if (lastLiveSide.current !== "lost") {
      lastLiveSide.current = "lost"
      setLiveStatus("공을 추적하지 못하고 있습니다")
    }

    // 이벤트 진동 (seek 대비: 뒤로 이동하면 리셋)
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
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [loop])

  // 재생/일시정지 시 엔진 정지
  const handlePlay = () => setIsPlaying(true)
  const handlePause = () => {
    setIsPlaying(false)
    engineRef.current?.stop()
    audioRef.current?.stop()
  }
  const handleEnded = () => {
    setIsPlaying(false)
    engineRef.current?.stop()
    audioRef.current?.stop()
    setLiveStatus("영상이 끝났습니다")
  }

  const togglePlay = () => {
    const video = videoRef.current
    if (!video || !videoSrc) return
    // 사용자 제스처 안에서 오디오 컨텍스트 활성화 (모바일 정책)
    audioRef.current?.resume()
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

  const handleSeekBar = (e: React.ChangeEvent<HTMLInputElement>) => {
    seek(Number(e.target.value))
  }

  const testVibration = () => engineRef.current?.testPulse()
  const testAudio = () => audioRef.current?.test()

  const ready = Boolean(videoSrc && detection)
  const progressLabel = useMemo(() => `${formatTime(currentTime)} / ${formatTime(duration)}`, [currentTime, duration])

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 md:py-10">
      <a
        href="#controls"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground"
      >
        재생 컨트롤로 건너뛰기
      </a>

      <header className="mb-6 flex items-center gap-3">
        <span className="flex size-10 items-center justify-center rounded-xl bg-primary/15 text-primary" aria-hidden="true">
          <Vibrate className="size-5" />
        </span>
        <div>
          <h1 className="text-lg font-bold leading-tight md:text-xl">HaptiBall</h1>
          <p className="text-xs text-muted-foreground md:text-sm text-pretty">
            축구 영상의 공 위치를 진동과 소리로 — 시각장애인 접근성 서비스
          </p>
        </div>
      </header>

      {/* 스크린리더 실시간 안내 (항상 존재, 화면에는 숨김) */}
      <p aria-live="assertive" className="sr-only">
        {liveStatus}
      </p>

      {/* 화면에 보이는 현재 상태 배너 (저시력 사용자용 큰 텍스트) */}
      <div
        className="mb-4 flex min-h-14 items-center gap-3 rounded-xl border border-border bg-card px-4 py-3"
        aria-hidden="true"
      >
        <span
          className={cnPulse(pulse)}
        />
        <span className="text-base font-semibold md:text-lg text-pretty">
          {activeEventLabel
            ? activeEventLabel
            : ball.detected
              ? `공: ${horizontalWord(ball.nx)}`
              : ready
                ? "공 추적 대기 중"
                : "영상과 감지 데이터를 불러오세요"}
        </span>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_22rem]">
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
          <section id="controls" className="rounded-xl border border-border bg-card p-4" aria-label="재생 컨트롤">
            <div className="flex items-center gap-3">
              <Button
                onClick={togglePlay}
                disabled={!videoSrc}
                className="h-14 flex-1 text-base font-semibold"
                aria-label={isPlaying ? "일시정지" : "재생 및 진동·소리 시작"}
              >
                {isPlaying ? <Pause className="size-5" /> : <Play className="size-5" />}
                {isPlaying ? "일시정지" : "재생"}
              </Button>
              <Button
                size="icon"
                variant="secondary"
                onClick={restart}
                disabled={!videoSrc}
                aria-label="처음으로 되감기"
                className="size-14"
              >
                <RotateCcw className="size-5" />
              </Button>
            </div>
            <div className="mt-3 flex items-center gap-3">
              <input
                type="range"
                min={0}
                max={duration || 0}
                step={0.05}
                value={currentTime}
                onChange={handleSeekBar}
                disabled={!videoSrc}
                aria-label="재생 위치"
                aria-valuetext={progressLabel}
                className="h-2 flex-1 cursor-pointer appearance-none rounded-full bg-secondary accent-primary disabled:opacity-50"
              />
              <span className="w-24 shrink-0 text-right text-xs tabular-nums text-muted-foreground">
                {progressLabel}
              </span>
            </div>
            {!ready && (
              <p className="mt-3 text-sm text-muted-foreground text-pretty">
                영상과 감지 데이터를 모두 불러오면 재생 중 진동과 소리가 발생합니다. 진동은 스마트폰에서, 소리는 이어폰 착용 시 방향이 가장 잘 느껴집니다.
              </p>
            )}
          </section>

          <PitchRadar ball={ball} />
        </div>

        {/* 우측: 소스 / 소리 / 진동 / 이벤트 */}
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
          <AudioControls
            settings={audioSettings}
            audioOk={audioOk}
            speechOk={speechOk}
            onChange={setAudioSettings}
            onTest={testAudio}
          />
          <HapticControls settings={settings} supported={supported} onChange={setSettings} onTest={testVibration} />
          <EventLog events={events} currentTime={currentTime} onSeek={seek} />
        </div>
      </div>
    </div>
  )
}

function cnPulse(pulse: boolean) {
  return [
    "block size-4 shrink-0 rounded-full transition-transform",
    pulse ? "scale-150 bg-primary" : "bg-primary/50",
  ].join(" ")
}

function formatTime(t: number) {
  if (!Number.isFinite(t)) return "0:00"
  const m = Math.floor(t / 60)
  const s = Math.floor(t % 60)
  return `${m}:${s.toString().padStart(2, "0")}`
}
