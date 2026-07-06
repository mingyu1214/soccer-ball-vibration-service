"use client"

import { forwardRef } from "react"
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

/** 업로드된 영상 + 공 위치 오버레이 마커 */
export const VideoCanvas = forwardRef<HTMLVideoElement, VideoCanvasProps>(function VideoCanvas(
  { src, ball, showOverlay, lastPulse, onLoadedMetadata, onTimeUpdate, onPlay, onPause, onEnded },
  ref,
) {
  return (
    <div className="relative aspect-video w-full overflow-hidden rounded-none border-0 bg-black md:rounded-xl md:border md:border-border">
      {src ? (
        <video
          ref={ref}
          src={src}
          playsInline
          disablePictureInPicture
          controlsList="nodownload nofullscreen noremoteplayback"
          className="h-full w-full object-contain"
          onLoadedMetadata={onLoadedMetadata}
          onTimeUpdate={onTimeUpdate}
          onPlay={onPlay}
          onPause={onPause}
          onEnded={onEnded}
        />
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
