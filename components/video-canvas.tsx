"use client"

import { forwardRef, useEffect, useRef } from "react"
import type { BallState } from "@/lib/detection"
import { cn } from "@/lib/utils"

interface VideoCanvasProps {
  src: string | null
  ball: BallState
  showOverlay: boolean
  lastPulse: boolean
  onLoadedMetadata?: () => void
  onTimeUpdate?: () => void
  onPlay?: () => void
  onPause?: () => void
  onEnded?: () => void
}

/** 업로드된 영상 + 공 위치 오버레이 마커 (Canvas 기반) */
export const VideoCanvas = forwardRef<HTMLVideoElement, VideoCanvasProps>(function VideoCanvas(
  { src, ball, showOverlay, lastPulse, onLoadedMetadata, onTimeUpdate, onPlay, onPause, onEnded },
  ref,
) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const animationIdRef = useRef<number | null>(null)

  // ref를 VideoElement에 연결 (부모 컴포넌트가 videoRef 접근 가능하게)
  useEffect(() => {
    if (ref) {
      if (typeof ref === 'function') ref(videoRef.current)
      else ref.current = videoRef.current
    }
  }, [ref])

  // Canvas에 현재 비디오 프레임 그리기
  useEffect(() => {
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // 영상 메타데이터 로드 후 canvas 크기 설정
    const handleLoadedMetadata = () => {
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      onLoadedMetadata?.()
    }

    // 매 프레임 canvas에 렌더링
    const drawFrame = () => {
      if (video.paused && video.ended === false) {
        animationIdRef.current = null
        return
      }
      
      ctx.drawImage(video, 0, 0)
      onTimeUpdate?.()
      
      if (!video.paused || video.currentTime > 0) {
        animationIdRef.current = requestAnimationFrame(drawFrame)
      }
    }

    const handlePlay = () => {
      onPlay?.()
      if (animationIdRef.current === null) {
        animationIdRef.current = requestAnimationFrame(drawFrame)
      }
    }

    const handlePause = () => {
      onPause?.()
      if (animationIdRef.current !== null) {
        cancelAnimationFrame(animationIdRef.current)
        animationIdRef.current = null
      }
    }

    const handleEnded = () => {
      onEnded?.()
      if (animationIdRef.current !== null) {
        cancelAnimationFrame(animationIdRef.current)
        animationIdRef.current = null
      }
    }

    video.addEventListener('loadedmetadata', handleLoadedMetadata)
    video.addEventListener('play', handlePlay)
    video.addEventListener('pause', handlePause)
    video.addEventListener('ended', handleEnded)

    return () => {
      video.removeEventListener('loadedmetadata', handleLoadedMetadata)
      video.removeEventListener('play', handlePlay)
      video.removeEventListener('pause', handlePause)
      video.removeEventListener('ended', handleEnded)
      if (animationIdRef.current !== null) {
        cancelAnimationFrame(animationIdRef.current)
      }
    }
  }, [onLoadedMetadata, onTimeUpdate, onPlay, onPause, onEnded])

  return (
    <div className="relative aspect-video w-full overflow-hidden rounded-none border-0 bg-black md:rounded-xl md:border md:border-border">
      {src ? (
        <>
          {/* 숨겨진 video 엘리먼트 (시간, 재생 제어용) */}
          <video
            ref={videoRef}
            src={src}
            playsInline
            disablePictureInPicture
            controlsList="nodownload nofullscreen noremoteplayback"
            crossOrigin="anonymous"
            style={{ display: 'none' }}
          />

          {/* Canvas에 렌더링 */}
          <canvas
            ref={canvasRef}
            className="h-full w-full"
            style={{ display: 'block' }}
          />
        </>
      ) : (
        <div className="flex h-full w-full items-center justify-center px-6 text-center">
          <p className="text-sm text-muted-foreground text-balance">
            영상 파일을 업로드하면 여기에 공 위치가 표시됩니다.
          </p>
        </div>
      )}

      {/* 공 위치 마커 */}
      {src && showOverlay && ball.detected && (
        <div
          className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2"
          style={{ left: `${ball.nx * 100}%`, top: `${ball.ny * 100}%` }}
          aria-hidden="true"
        >
          <span
            className={cn(
              "block size-6 rounded-full border-2 border-primary bg-primary/30 transition-transform",
              lastPulse && "scale-150",
            )}
          />
          <span className="absolute inset-0 animate-ping rounded-full border-2 border-primary/60" />
        </div>
      )}

      {/* 공 소실 배지 */}
      {src && showOverlay && !ball.detected && (
        <div className="absolute left-3 top-3 rounded-md bg-destructive/20 px-2 py-1 text-xs font-medium text-destructive">
          공 추적 소실
        </div>
      )}
    </div>
  )
})
