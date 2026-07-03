"use client"

import { forwardRef } from "react"
import type { BallState } from "@/lib/detection"
import { cn } from "@/lib/utils"

interface VideoCanvasProps {
  src: string | null
  ball: BallState
  showOverlay: boolean
  /** 경기가 선택되었는지 (영상 없는 소리·진동 전용 경기 안내용) */
  hasMatch?: boolean
  lastPulse: boolean
  onLoadedMetadata?: () => void
  onTimeUpdate?: () => void
  onPlay?: () => void
  onPause?: () => void
  onEnded?: () => void
}

/** 영상(있을 때) + 공 위치 오버레이 마커. 영상이 없으면 소리·진동 전용 안내를 표시 */
export const VideoCanvas = forwardRef<HTMLVideoElement, VideoCanvasProps>(function VideoCanvas(
  { src, ball, showOverlay, hasMatch = false, lastPulse, onLoadedMetadata, onTimeUpdate, onPlay, onPause, onEnded },
  ref,
) {
  return (
    <div className="relative aspect-video w-full overflow-hidden rounded-xl border border-border bg-black">
      {src ? (
        <video
          ref={ref}
          src={src}
          playsInline
          className="h-full w-full object-contain"
          onLoadedMetadata={onLoadedMetadata}
          onTimeUpdate={onTimeUpdate}
          onPlay={onPlay}
          onPause={onPause}
          onEnded={onEnded}
        />
      ) : (
        <div className="flex h-full w-full flex-col items-center justify-center gap-2 px-6 text-center">
          {hasMatch ? (
            <>
              <span
                className={cn(
                  "block size-8 rounded-full border-2 border-primary bg-primary/30 transition-transform",
                  lastPulse && "scale-150",
                )}
                aria-hidden="true"
              />
              <p className="text-sm font-medium text-foreground text-balance">소리·진동 전용 경기</p>
              <p className="text-xs text-muted-foreground text-balance">
                재생을 누르면 진동과 소리로 공을 전달합니다. 아래 레이더에서 위치를 볼 수 있습니다.
              </p>
            </>
          ) : (
            <p className="text-sm text-muted-foreground text-balance">
              오른쪽 목록에서 경기를 선택하세요.
            </p>
          )}
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
