"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Play, Pause, RotateCcw, Vibrate } from "lucide-react"
import {
  buildEventTimeline,
  computeBallState,
  EVENT_LABELS,
  type BallEvent,
  type BallState,
  type DetectionData,
} from "@/lib/detection"
import { DEFAULT_SETTINGS, HapticEngine, type HapticSettings } from "@/lib/haptics"
import { initVibrationBridge, isNativeApp, isVibrationAvailable } from "@/lib/vibration-bridge"
import { AudioCueEngine, DEFAULT_AUDIO_SETTINGS, horizontalWord, type AudioSettings } from "@/lib/audio-cue"
import { getMatchById } from "@/lib/matches"
import { MatchLibrary } from "@/components/match-library"
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

  // 가상 재생 클럭 (영상이 없는 경기용 — 시각장애인은 영상 없이 재생)
  const virtualTimeRef = useRef(0)
  const playingRef = useRef(false)
  const lastNowRef = useRef(0)

  const [selectedMatchId, setSelectedMatchId] = useState<string | null>(null)
  const [videoSrc, setVideoSrc] = useState<string | null>(null)
  const [detection, setDetection] = useState<DetectionData | null>(null)
  const [events, setEvents] = useState<BallEvent[]>([])

  const [settings, setSettings] = useState<HapticSettings>(DEFAULT_SETTINGS)
  const [audioSettings, setAudioSettings] = useState<AudioSettings>(DEFAULT_AUDIO_SETTINGS)
  const [ball, setBall] = useState<BallState>(EMPTY_BALL)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [pulse, setPulse] = useState(false)
  const [activeEventLabel, setActiveEventLabel] = useState<string | null>(null)
  const [supported, setSupported] = useState(false)
  const [native, setNative] = useState(false)
  const [audioOk, setAudioOk] = useState(false)
  const [speechOk, setSpeechOk] = useState(false)
  // 스크린리더용 실시간 안내 문구
  const [liveStatus, setLiveStatus] = useState("")
  const lastLiveSide = useRef<string | null>(null)

  // 엔진 초기화 (클라이언트 마운트 후에만 — SSR 하이드레이션 불일치 방지)
  useEffect(() => {
    let cancelled = false
    // Capacitor 네이티브 햅틱 브릿지 초기화 (iOS 진동 지원). 웹에서는 no-op.
    initVibrationBridge().then(() => {
      if (cancelled) return
      setNative(isNativeApp())
      setSupported(isVibrationAvailable())
    })

    if (engineRef.current === null) engineRef.current = new HapticEngine(settings)
    if (audioRef.current === null) audioRef.current = new AudioCueEngine(audioSettings)
    setSupported(engineRef.current.isSupported)
    setAudioOk(audioRef.current.audioOk)
    setSpeechOk(audioRef.current.speechOk)
    return () => {
      cancelled = true
    }
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

  const stopEngines = useCallback(() => {
    engineRef.current?.stop()
    audioRef.current?.stop()
  }, [])

  // 경기 선택 — 파일 업로드 대신 내장 경기를 로드
  const selectMatch = useCallback(
    (id: string) => {
      const match = getMatchById(id)
      if (!match) return
      const data = match.build()

      playingRef.current = false
      setIsPlaying(false)
      stopEngines()

      setSelectedMatchId(id)
      setDetection(data)
      setVideoSrc(match.videoSrc ?? null)

      virtualTimeRef.current = 0
      lastProcessedT.current = 0
      lastLiveSide.current = null
      setCurrentTime(0)
      setBall(EMPTY_BALL)

      const dur = data.frames.length ? data.frames[data.frames.length - 1].t : 0
      setDuration(dur)
      setLiveStatus(`${match.title} 선택됨. 재생 버튼을 누르면 진동과 소리가 시작됩니다.`)
    },
    [stopEngines],
  )

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
    if (!detection) {
      rafRef.current = requestAnimationFrame(loop)
      return
    }

    // 현재 재생 시간 결정: 영상이 있으면 영상 기준, 없으면 가상 클럭
    let t: number
    const now = performance.now()
    if (videoSrc && video) {
      t = video.currentTime
    } else {
      if (playingRef.current) {
        const dt = (now - lastNowRef.current) / 1000
        let nt = virtualTimeRef.current + dt
        if (duration > 0 && nt >= duration) {
          nt = duration
          playingRef.current = false
          setIsPlaying(false)
          stopEngines()
          setLiveStatus("경기 재생이 끝났습니다")
        }
        virtualTimeRef.current = nt
      }
      t = virtualTimeRef.current
    }
    lastNowRef.current = now
    setCurrentTime(t)

    const state = computeBallState(detection, t)
    setBall(state)

    // 지속 진동
    if (engine?.tickContinuous(now, state)) {
      setPulse(true)
      window.setTimeout(() => setPulse(false), 90)
    }

    // 연속 오디오 톤(스테레오 위치 + 피치)
    audio?.tickTone(state)

    // 스크린리더용 위치 안내 (좌우 구간이 바뀔 때만 업데이트)
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

    // 이벤트 발화 (seek 대비: 뒤로 이동하면 리셋)
    if (t < lastProcessedT.current - 0.05) {
      lastProcessedT.current = t
    } else if (t > lastProcessedT.current) {
      fireEventsBetween(lastProcessedT.current, t, events)
      lastProcessedT.current = t
    }

    rafRef.current = requestAnimationFrame(loop)
  }, [detection, videoSrc, duration, events, fireEventsBetween, stopEngines])

  useEffect(() => {
    rafRef.current = requestAnimationFrame(loop)
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [loop])

  // 영상 재생/일시정지 콜백 (영상이 있는 경기용)
  const handlePlay = () => setIsPlaying(true)
  const handlePause = () => {
    setIsPlaying(false)
    stopEngines()
  }
  const handleEnded = () => {
    setIsPlaying(false)
    stopEngines()
    setLiveStatus("경기 재생이 끝났습니다")
  }

  const togglePlay = () => {
    if (!detection) return
    // 사용자 제스처 안에서 오디오 컨텍스트 활성화 (모바일 정책)
    audioRef.current?.resume()

    const video = videoRef.current
    if (videoSrc && video) {
      if (video.paused) video.play()
      else video.pause()
      return
    }

    // 가상 클럭 재생/정지
    if (playingRef.current) {
      playingRef.current = false
      setIsPlaying(false)
      stopEngines()
    } else {
      if (duration > 0 && virtualTimeRef.current >= duration) {
        virtualTimeRef.current = 0
        lastProcessedT.current = 0
      }
      lastNowRef.current = performance.now()
      playingRef.current = true
      setIsPlaying(true)
      setLiveStatus("재생을 시작합니다")
    }
  }

  const restart = () => {
    const video = videoRef.current
    if (videoSrc && video) video.currentTime = 0
    virtualTimeRef.current = 0
    lastProcessedT.current = 0
    setCurrentTime(0)
    setLiveStatus("처음으로 이동했습니다")
  }

  const seek = (t: number) => {
    const video = videoRef.current
    if (videoSrc && video) video.currentTime = t
    virtualTimeRef.current = t
    lastProcessedT.current = t
    setCurrentTime(t)
  }

  const handleSeekBar = (e: React.ChangeEvent<HTMLInputElement>) => {
    seek(Number(e.target.value))
  }

  const testVibration = () => engineRef.current?.testPulse()
  const testAudio = () => audioRef.current?.test()

  const ready = Boolean(detection)
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
            축구 경기의 공 위치를 진동과 소리로 — 시각장애인 접근성 서비스
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
        <span className={cnPulse(pulse)} />
        <span className="text-base font-semibold md:text-lg text-pretty">
          {activeEventLabel
            ? activeEventLabel
            : ball.detected
              ? `공: ${horizontalWord(ball.nx)}`
              : ready
                ? "공 추적 대기 중"
                : "경기를 선택하세요"}
        </span>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_22rem]">
        {/* 좌측: 영상/레이더 + 재생 컨트롤 */}
        <div className="flex flex-col gap-4">
          <VideoCanvas
            ref={videoRef}
            src={videoSrc}
            ball={ball}
            showOverlay={Boolean(detection)}
            hasMatch={ready}
            lastPulse={pulse}
            onLoadedMetadata={() => setDuration(videoRef.current?.duration ?? duration)}
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
                disabled={!ready}
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
                disabled={!ready}
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
                disabled={!ready}
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
                오른쪽 목록에서 경기를 선택한 뒤 재생하세요. 진동은 스마트폰에서, 소리는 이어폰 착용 시 방향이 가장 잘 느껴집니다.
              </p>
            )}
          </section>

          <PitchRadar ball={ball} />
        </div>

        {/* 우측: 경기 목록 / 소리 / 진동 / 이벤트 */}
        <div className="flex flex-col gap-4">
          <MatchLibrary selectedId={selectedMatchId} onSelect={selectMatch} />
          <AudioControls
            settings={audioSettings}
            audioOk={audioOk}
            speechOk={speechOk}
            onChange={setAudioSettings}
            onTest={testAudio}
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
