"use client"

import { Shield, Cpu, Eye, AlertTriangle, Users, Zap } from "lucide-react"

/**
 * HaptiBall 소개 컴포넌트 — 독립 사용 가능
 *
 * 의존성: lucide-react, Tailwind CSS (shadcn/ui 디자인 토큰 사용)
 * 다른 앱에 붙일 때: 이 파일 하나만 복사하면 됩니다.
 * Tailwind 토큰(bg-primary, text-foreground 등)이 없는 앱이면
 * className을 직접 색상으로 교체하세요.
 */
export function AboutPage() {
  return (
    <main className="mx-auto max-w-4xl px-4 py-8 md:px-8 md:py-12">

      {/* 히어로 */}
      <section className="mb-12 text-center" aria-labelledby="hero-heading">
        <div
          className="mx-auto mb-6 flex size-20 items-center justify-center rounded-3xl bg-primary shadow-lg"
          aria-hidden="true"
        >
          <Zap className="size-10 text-primary-foreground" />
        </div>
        <h2
          id="hero-heading"
          className="mb-3 text-3xl font-black tracking-tight text-foreground text-balance md:text-4xl"
        >
          시각을 진동으로 번역합니다
        </h2>
        <p className="mx-auto max-w-2xl text-base leading-relaxed text-muted-foreground text-pretty">
          HaptiBall은 YOLO 객체 감지 모델이 추출한 축구공의 위치·속도·방향 데이터를
          스마트폰의 진동 피드백으로 실시간 변환해, 시각장애인이 경기를 촉각으로 경험할 수 있도록 합니다.
        </p>
      </section>

      {/* 책임감 있는 AI */}
      <section className="mb-10" aria-labelledby="rai-heading">
        <div className="mb-5 flex items-center gap-3">
          <div
            className="flex size-9 items-center justify-center rounded-xl bg-accent/30"
            aria-hidden="true"
          >
            <Shield className="size-5 text-accent-foreground" />
          </div>
          <h3 id="rai-heading" className="text-xl font-bold text-foreground">
            책임감 있는 AI 원칙
          </h3>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <RAICard
            icon={<Eye className="size-5" />}
            title="투명성"
            desc="이 서비스는 YOLO 모델의 감지 결과를 그대로 사용합니다. 신뢰도가 낮은 프레임(conf < 0.3)은 자동으로 필터링하며, 감지 정확도는 모델 학습 데이터와 카메라 각도에 따라 달라질 수 있습니다."
          />
          <RAICard
            icon={<Users className="size-5" />}
            title="접근성 우선"
            desc="AI 기능의 최종 목적은 시각장애인 사용자가 스포츠를 더 풍부하게 경험하는 것입니다. 기술은 사람을 위한 도구이며, 진동 피드백은 보조 수단이지 완전한 대체재가 아닙니다."
          />
          <RAICard
            icon={<AlertTriangle className="size-5" />}
            title="오류 인지"
            desc="객체 감지 모델은 완벽하지 않습니다. 공이 겹치거나 가려지는 순간, 급격한 움직임 구간에서 감지가 누락되거나 오검출이 발생할 수 있습니다. 사용자에게 이 한계를 명확히 알립니다."
          />
          <RAICard
            icon={<Shield className="size-5" />}
            title="데이터 프라이버시"
            desc="업로드된 영상 파일은 서버로 전송되지 않으며 기기 로컬에서만 처리됩니다. 감지 JSON 데이터 또한 앱 내에서만 사용되고 외부로 수집·저장되지 않습니다."
          />
        </div>
      </section>

      {/* 동작 원리 */}
      <section aria-labelledby="how-heading">
        <div className="mb-5 flex items-center gap-3">
          <div
            className="flex size-9 items-center justify-center rounded-xl bg-primary/15"
            aria-hidden="true"
          >
            <Cpu className="size-5 text-primary" />
          </div>
          <h3 id="how-heading" className="text-xl font-bold text-foreground">
            동작 원리
          </h3>
        </div>
        <ol className="flex flex-col gap-4" role="list">
          {STEPS.map(({ step, title, desc }) => (
            <li key={step} className="flex gap-4">
              <span
                className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-black text-primary-foreground"
                aria-hidden="true"
              >
                {step}
              </span>
              <div>
                <p className="font-bold text-foreground">{title}</p>
                <p className="mt-0.5 text-sm leading-relaxed text-muted-foreground">{desc}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>
    </main>
  )
}

// ---- 내부 데이터 ----

const STEPS = [
  {
    step: "01",
    title: "YOLO 객체 감지",
    desc: "축구 영상에서 YOLOv8 모델이 프레임마다 공의 바운딩 박스와 신뢰도(conf)를 추출합니다.",
  },
  {
    step: "02",
    title: "데이터 전처리·필터링",
    desc: "저신뢰도 프레임 제거, 동일 좌표 반복(freeze) 감지, 이상 점프 필터링으로 노이즈를 정제합니다.",
  },
  {
    step: "03",
    title: "운동학 계산",
    desc: "프레임 간 위치 차분으로 속도·방향을 계산하고, 선형 보간으로 프레임 사이 부드러운 궤적을 생성합니다.",
  },
  {
    step: "04",
    title: "이벤트 감지",
    desc: "속도 임계값·방향 전환 각도를 기준으로 슛, 방향 전환, 진영 이동, 공 소실 등의 이벤트를 구성합니다.",
  },
  {
    step: "05",
    title: "진동 피드백 출력",
    desc: "공 속도에 따른 지속 진동 패턴과 이벤트별 특수 진동을 Web Vibration API 또는 네이티브 햅틱으로 출력합니다.",
  },
]

// ---- 내부 컴포넌트 ----

function RAICard({
  icon,
  title,
  desc,
}: {
  icon: React.ReactNode
  title: string
  desc: string
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="mb-3 flex items-center gap-2">
        <span
          className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary"
          aria-hidden="true"
        >
          {icon}
        </span>
        <h4 className="font-bold text-foreground">{title}</h4>
      </div>
      <p className="text-sm leading-relaxed text-muted-foreground">{desc}</p>
    </div>
  )
}
