"use client"

import { useRef } from "react"
import { Button } from "@/components/ui/button"
import { Film, FileJson, Sparkles, Check } from "lucide-react"

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
  onUseSample,
}: SourcePanelProps) {
  const videoInput = useRef<HTMLInputElement>(null)
  const jsonInput = useRef<HTMLInputElement>(null)

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <h3 className="mb-3 text-sm font-semibold">소스 불러오기</h3>

      <div className="flex flex-col gap-2">
        <input
          ref={videoInput}
          type="file"
          accept="video/*"
          className="hidden"
          onChange={(e) => e.target.files?.[0] && onVideoFile(e.target.files[0])}
        />
        <input
          ref={jsonInput}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={(e) => e.target.files?.[0] && onDetectionFile(e.target.files[0])}
        />

        {/* 감지 데이터는 앱에 내장됨 — 사용자는 영상만 넣으면 됨 */}
        <div className="flex items-center gap-2 rounded-md bg-primary/10 px-3 py-2 text-xs text-primary">
          <Check className="size-4 shrink-0" />
          <span className="text-pretty">감지 데이터가 앱에 내장되어 있습니다. 영상만 업로드하면 바로 재생됩니다.</span>
        </div>

        <Button className="h-12 justify-start text-base" onClick={() => videoInput.current?.click()}>
          <Film className="size-5" />
          <span className="flex-1 text-left">경기 영상 업로드</span>
          {hasVideo && <Check className="size-5" />}
        </Button>
      </div>

      {detectionInfo && <p className="mt-3 text-xs text-muted-foreground text-pretty">{detectionInfo}</p>}
      {error && <p className="mt-3 rounded-md bg-destructive/15 px-3 py-2 text-xs text-destructive text-pretty">{error}</p>}

      <details className="mt-4 text-xs text-muted-foreground">
        <summary className="cursor-pointer font-medium text-foreground">다른 감지 JSON으로 교체 (선택)</summary>
        <div className="mt-2 flex flex-col gap-2">
          <Button variant="outline" className="justify-start" onClick={() => jsonInput.current?.click()}>
            <FileJson className="size-4" />
            <span className="flex-1 text-left">감지 JSON 업로드</span>
            {hasDetection && <Check className="size-4 text-primary" />}
          </Button>
          <Button variant="secondary" className="justify-start" onClick={onUseSample}>
            <Sparkles className="size-4" />
            <span className="flex-1 text-left">샘플 감지 데이터 생성</span>
          </Button>
        </div>
      </details>

      <details className="mt-4 text-xs text-muted-foreground">
        <summary className="cursor-pointer font-medium text-foreground">감지 JSON 형식</summary>
        <pre className="mt-2 overflow-x-auto rounded-md bg-secondary/50 p-3 leading-relaxed">
{`{
  "fps": 30,
  "width": 1280,
  "height": 720,
  "frames": [
    { "t": 0.00, "x": 640, "y": 360, "conf": 0.92 },
    { "t": 0.03, "x": 655, "y": 358 },
    { "t": 0.06, "x": null, "y": null }
  ]
}`}
        </pre>
        <p className="mt-2 text-pretty">
          t=시간(초), x·y=공 중심 픽셀 좌표. 미검출 프레임은 x·y를 null 로 두세요.
        </p>
      </details>
    </div>
  )
}
