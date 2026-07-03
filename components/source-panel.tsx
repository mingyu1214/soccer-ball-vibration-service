"use client"

import { useRef } from "react"
import { Button } from "@/components/ui/button"
import { Film, FileJson, Check, Upload } from "lucide-react"

interface SourcePanelProps {
  hasVideo: boolean
  hasDetection: boolean
  detectionInfo: string | null
  error: string | null
  onVideoFile: (file: File) => void
  onDetectionFile: (file: File) => void
  onUseSample: () => void
}

export function SourcePanel({
  hasVideo,
  hasDetection,
  detectionInfo,
  error,
  onVideoFile,
  onDetectionFile,
}: SourcePanelProps) {
  const videoInput = useRef<HTMLInputElement>(null)
  const jsonInput = useRef<HTMLInputElement>(null)

  return (
    <section className="rounded-2xl border border-border bg-card p-5" aria-labelledby="source-heading">
      <h2 id="source-heading" className="mb-4 text-base font-bold text-foreground">영상 불러오기</h2>

      <input
        ref={videoInput}
        type="file"
        accept="video/*"
        className="hidden"
        aria-hidden="true"
        onChange={(e) => e.target.files?.[0] && onVideoFile(e.target.files[0])}
      />
      <input
        ref={jsonInput}
        type="file"
        accept="application/json,.json"
        className="hidden"
        aria-hidden="true"
        onChange={(e) => e.target.files?.[0] && onDetectionFile(e.target.files[0])}
      />

      {/* 내장 감지 데이터 안내 */}
      <div className="mb-3 flex items-start gap-2 rounded-xl bg-primary/8 px-4 py-3">
        <Check className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
        <p className="text-sm font-medium text-primary text-pretty">
          감지 데이터 내장 완료. 영상만 업로드하면 진동이 시작됩니다.
        </p>
      </div>

      {/* 영상 업로드 — 주 버튼 */}
      {hasVideo ? (
        <button
          onClick={() => videoInput.current?.click()}
          className="flex w-full items-center gap-3 rounded-xl border-2 border-primary bg-primary/8 px-4 py-4 text-left transition-colors hover:bg-primary/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          aria-label="다른 영상으로 교체"
        >
          <Film className="size-6 shrink-0 text-primary" aria-hidden="true" />
          <div className="flex-1">
            <p className="text-sm font-bold text-primary">영상 업로드 완료</p>
            <p className="text-xs text-primary/70">탭하여 교체</p>
          </div>
          <Check className="size-5 text-primary" aria-hidden="true" />
        </button>
      ) : (
        <button
          onClick={() => videoInput.current?.click()}
          className="flex w-full flex-col items-center gap-3 rounded-xl border-2 border-dashed border-primary/40 bg-primary/5 px-4 py-8 text-center transition-colors hover:border-primary hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          aria-label="경기 영상 파일 선택"
        >
          <Upload className="size-8 text-primary/60" aria-hidden="true" />
          <div>
            <p className="text-base font-bold text-foreground">경기 영상 업로드</p>
            <p className="mt-1 text-sm text-muted-foreground">MP4, MOV, AVI 등 동영상 파일</p>
          </div>
        </button>
      )}

      {detectionInfo && (
        <p className="mt-3 text-xs text-muted-foreground">{detectionInfo}</p>
      )}
      {error && (
        <p className="mt-3 rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive text-pretty" role="alert">
          {error}
        </p>
      )}

      {/* JSON 교체 (접힘) */}
      <details className="mt-4">
        <summary className="cursor-pointer text-xs font-semibold text-muted-foreground hover:text-foreground">
          다른 감지 JSON으로 교체 (선택사항)
        </summary>
        <div className="mt-2">
          <Button
            variant="outline"
            className="w-full justify-start rounded-xl"
            onClick={() => jsonInput.current?.click()}
          >
            <FileJson className="size-4" aria-hidden="true" />
            <span className="flex-1 text-left">감지 JSON 업로드</span>
            {hasDetection && <Check className="size-4 text-primary" aria-hidden="true" />}
          </Button>
        </div>
      </details>
    </section>
  )
}
