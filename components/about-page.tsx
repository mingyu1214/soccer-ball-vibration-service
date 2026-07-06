"use client"

import { Shield, Cpu, Smartphone, Eye, AlertTriangle, Users, Zap, Code2, Database, Layers } from "lucide-react"

export function AboutPage() {
  return (
    <main className="mx-auto max-w-4xl px-4 py-8 md:px-8 md:py-12">

      {/* 히어로 */}
      <section className="mb-12 text-center" aria-labelledby="hero-heading">
        <div className="mx-auto mb-6 flex size-20 items-center justify-center rounded-3xl bg-primary shadow-lg" aria-hidden="true">
          <Zap className="size-10 text-primary-foreground" />
        </div>
        <h2 id="hero-heading" className="mb-2 text-3xl font-black tracking-tight text-foreground text-balance md:text-4xl">
          시각을 진동으로 번역합니다
        </h2>
        <p className="mb-1 text-sm font-semibold text-primary">Soccer Haptics Demo — iOS Application v1.2</p>
        <p className="mx-auto max-w-2xl text-base leading-relaxed text-muted-foreground text-pretty">
          온디바이스 AI(YOLO 계열 객체 탐지 모델)로 프레임별 공의 위치를 추적하고,
          프레임 간 이동 거리로부터 속도(px/s)를 계산해 iPhone의 Core Haptics 진동 세기를
          실시간 대응시킵니다. 시각장애인이 축구 경기를 촉각으로 경험할 수 있도록 합니다.
        </p>
      </section>

      {/* 기술 스택 */}
      <section className="mb-10" aria-labelledby="stack-heading">
        <SectionHeader icon={<Code2 className="size-5 text-primary" />} bg="bg-primary/15" id="stack-heading">
          기술 스택
        </SectionHeader>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {STACK.map(({ cat, items }) => (
            <div key={cat} className="rounded-2xl border border-border bg-card p-4">
              <p className="mb-2 text-xs font-bold uppercase tracking-widest text-primary">{cat}</p>
              <ul className="flex flex-col gap-1">
                {items.map((item) => (
                  <li key={item} className="text-sm text-foreground">{item}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* 시스템 아키텍처 — 데이터 흐름 */}
      <section className="mb-10" aria-labelledby="arch-heading">
        <SectionHeader icon={<Layers className="size-5 text-primary" />} bg="bg-primary/15" id="arch-heading">
          시스템 아키텍처 — 데이터 흐름
        </SectionHeader>
        <ol className="flex flex-col gap-4" role="list">
          {FLOW.map(({ step, title, desc }) => (
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

      {/* 핵심 알고리즘 */}
      <section className="mb-10" aria-labelledby="algo-heading">
        <SectionHeader icon={<Cpu className="size-5 text-primary" />} bg="bg-primary/15" id="algo-heading">
          핵심 알고리즘
        </SectionHeader>
        <div className="flex flex-col gap-4">
          <AlgoCard
            title="속도 계산 파이프라인 (3단계)"
            items={[
              { label: "Gap Filling", desc: "미검출 구간이 0.4초 이하이면 앞뒤 검출 지점을 선형보간해 채웁니다. 임계값 초과 구간은 보간하지 않아 근거 없는 움직임을 만들지 않습니다." },
              { label: "Smoothing", desc: "각 프레임 좌표를 t±2 구간의 대칭 이동평균으로 대체합니다. 사전 분석 방식이므로 미래 프레임 정보까지 활용해 지연 없이 오탐(outlier)의 영향을 줄입니다." },
              { label: "Speed 계산", desc: "스무딩된 연속 두 프레임 간 유클리드 거리를 시간차로 나눠 px/s 속도를 산출합니다. 긴 공백 구간은 속도 0으로 처리해 진동이 없음으로 표현됩니다." },
            ]}
          />
          <AlgoCard
            title="진동-영상 동기화 재생"
            items={[
              { label: "단일 연속 이벤트", desc: "영상 전체 길이를 duration으로 갖는 단일 CHHapticEvent(.hapticContinuous)를 생성하고, intensity/sharpness를 CHHapticParameterCurve의 제어점으로 등록합니다." },
              { label: "동기화 시작", desc: "AVPlayer.seek(to: .zero) 완료 콜백 안에서 player.play()와 CHHapticPatternPlayer.start()를 동시에 호출합니다. seek 완료를 기다리지 않으면 영상과 진동의 시작 시점이 어긋납니다." },
              { label: "다운샘플링", desc: "제어점 밀도는 초당 약 16개(간격 0.06초)로 다운샘플링하며, 구간 내 첫 샘플이 아닌 최댓값(피크)을 남겨 킥처럼 짧은 속도 스파이크가 유실되지 않도록 합니다." },
            ]}
          />
          <AlgoCard
            title="캐싱 전략"
            items={[
              { label: "캐시 키 구성", desc: "영상 파일명 + 파일 수정시각 + 모델 modelIdentifier 세 값을 조합합니다. 다른 모델로 전환하면 자동으로 별도 캐시가 생성되어 결과가 섞이지 않습니다." },
              { label: "저장 위치", desc: "분석 결과(HapticTimeline)를 JSON 파일로 디바이스 Caches 디렉토리에 저장합니다. 최초 분석 이후 재생은 캐시를 바로 사용해 대기 없이 즉시 시작됩니다." },
            ]}
          />
        </div>
      </section>

      {/* 진동 레벨 매핑 */}
      <section className="mb-10" aria-labelledby="haptic-level-heading">
        <SectionHeader icon={<Smartphone className="size-5 text-accent-foreground" />} bg="bg-accent/30" id="haptic-level-heading">
          진동 레벨 매핑 — 계단식 7단계
        </SectionHeader>
        <p className="mb-4 text-sm leading-relaxed text-muted-foreground text-pretty">
          속도(px/s)를 연속 곡선이 아닌 7단계(0=없음 ~ 6=최고)로 매핑합니다.
          각 단계는 HapticMapper.speedRanges 배열로 정의된 [최소, 최대] px/s 구간을 가지며,
          sharpness(날카로움)는 0.4 고정값을 사용합니다.
        </p>
        <div className="overflow-hidden rounded-2xl border border-border bg-card">
          <table className="w-full text-sm" role="table">
            <thead>
              <tr className="border-b border-border bg-secondary">
                <th className="px-4 py-3 text-left font-bold text-foreground">레벨</th>
                <th className="px-4 py-3 text-left font-bold text-foreground">의미</th>
                <th className="px-4 py-3 text-left font-bold text-foreground">intensity</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {HAPTIC_LEVELS.map(({ level, meaning, intensity }) => (
                <tr key={level} className="transition-colors hover:bg-secondary/50">
                  <td className="px-4 py-3 font-black text-primary">{level}</td>
                  <td className="px-4 py-3 font-medium text-foreground">{meaning}</td>
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{intensity}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* 책임감 있는 AI */}
      <section className="mb-10" aria-labelledby="rai-heading">
        <SectionHeader icon={<Shield className="size-5 text-accent-foreground" />} bg="bg-accent/30" id="rai-heading">
          책임감 있는 AI 원칙
        </SectionHeader>
        <div className="grid gap-4 sm:grid-cols-2">
          <RAICard
            icon={<Eye className="size-5" />}
            title="투명성"
            desc="YOLO 모델의 감지 결과를 그대로 사용하며, 오검출·미검출 가능성을 사용자에게 명확히 알립니다. 탐지기가 지정된 라벨과 다른 객체를 감지하면 폴백 없이 미검출로 처리해 잘못된 데이터가 진동에 반영되지 않습니다."
          />
          <RAICard
            icon={<Users className="size-5" />}
            title="접근성 우선"
            desc="AI 기능의 최종 목적은 시각장애인 사용자가 스포츠를 더 풍부하게 경험하는 것입니다. 기술은 사람을 위한 도구이며, 진동 피드백은 보조 수단이지 완전한 대체재가 아닙니다."
          />
          <RAICard
            icon={<AlertTriangle className="size-5" />}
            title="오류 인지"
            desc="공이 겹치거나 가려지는 순간, 급격한 움직임 구간에서 감지가 누락되거나 오검출이 발생할 수 있습니다. 또한 동일 라벨을 가진 공 모양 물체(관중석 소품 등)가 여러 개일 경우 오탐 가능성이 있음을 인지합니다."
          />
          <RAICard
            icon={<Database className="size-5" />}
            title="데이터 프라이버시"
            desc="영상 분석은 온디바이스에서만 수행됩니다. 업로드된 영상과 감지 데이터는 서버로 전송되지 않으며, 분석 결과는 기기의 Caches 디렉토리에만 저장됩니다."
          />
        </div>
      </section>

      {/* 알려진 제약사항 */}
      <section aria-labelledby="limits-heading">
        <SectionHeader icon={<AlertTriangle className="size-5 text-accent-foreground" />} bg="bg-accent/30" id="limits-heading">
          알려진 제약사항
        </SectionHeader>
        <ul className="flex flex-col gap-3">
          {LIMITS.map(({ title, desc }) => (
            <li key={title} className="flex gap-3 rounded-2xl border border-border bg-card px-5 py-4">
              <span className="mt-0.5 size-2 shrink-0 rounded-full bg-destructive/60" aria-hidden="true" />
              <div>
                <p className="text-sm font-bold text-foreground">{title}</p>
                <p className="mt-0.5 text-sm leading-relaxed text-muted-foreground">{desc}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </main>
  )
}

// ---- 내부 데이터 ----

const STACK = [
  { cat: "UI", items: ["SwiftUI (선언형 UI)", "NavigationStack"] },
  { cat: "동시성", items: ["Swift Concurrency", "async/await · actor", "VideoAnalyzer (actor 격리)"] },
  { cat: "영상 처리", items: ["AVFoundation", "AVAssetReader (프레임 추출)", "AVPlayer (재생)"] },
  { cat: "객체 탐지", items: ["Vision + Core ML", "VNCoreMLRequest", "VNRecognizedObjectObservation"] },
  { cat: "AI 모델", items: ["YOLOv8l (파인튜닝)", "YOLO11n (경량 검증용)", ".pt → Core ML (.mlpackage)"] },
  { cat: "진동 피드백", items: ["Core Haptics", "CHHapticEngine", "CHHapticParameterCurve"] },
] as const

const FLOW = [
  { step: "01", title: "영상·모델 선택", desc: "ContentView에서 사전 탑재된 축구 영상과 탐지 모델(YOLO11n / YOLOv8l)을 선택합니다." },
  { step: "02", title: "캐시 확인", desc: "영상 파일명 + 수정시각 + 모델 ID로 구성된 캐시 키로 기존 분석 결과를 조회합니다. 캐시가 있으면 분석을 건너뜁니다." },
  { step: "03", title: "프레임 추출", desc: "VideoFrameExtractor가 AVAssetReader로 영상을 순회하며 everyNthFrame(기본 3) 간격으로 CVPixelBuffer + timestamp를 추출합니다." },
  { step: "04", title: "공 위치 탐지", desc: "VisionBallDetectorService가 VNCoreMLRequest로 각 프레임에서 공의 바운딩 박스를 탐지합니다. 지정 라벨 불일치 시 nil(미검출)을 반환합니다." },
  { step: "05", title: "속도 계산", desc: "SpeedCalculator가 Gap Filling → Smoothing → 속도 계산 3단계 파이프라인으로 프레임 간 px/s 속도를 산출합니다." },
  { step: "06", title: "진동 레벨 매핑", desc: "HapticMapper가 속도를 계단식 7단계(0=없음 ~ 6=최고)로 매핑하고, 0.06초 간격으로 다운샘플링(구간 내 피크값)해 HapticEvent 배열을 만듭니다." },
  { step: "07", title: "결과 캐싱", desc: "HapticTimeline(추적 프레임 + 속도 샘플 + 진동 이벤트)을 JSON으로 기기 Caches 디렉토리에 저장합니다." },
  { step: "08", title: "동기화 재생", desc: "AVPlayer.seek() 완료 콜백 안에서 player.play()와 CHHapticPatternPlayer.start()를 동시 호출해 영상·진동을 정확히 동기화합니다." },
] as const

const HAPTIC_LEVELS = [
  { level: "0", meaning: "없음 (정지)", intensity: "0.00" },
  { level: "1", meaning: "아주 미약", intensity: "0.15" },
  { level: "2", meaning: "미약", intensity: "0.30" },
  { level: "3", meaning: "보통 (문자 진동 정도)", intensity: "0.45" },
  { level: "4", meaning: "강함 (알람 정도)", intensity: "0.65" },
  { level: "5", meaning: "매우 강함", intensity: "0.85" },
  { level: "6", meaning: "최고 (시스템 최대)", intensity: "1.00" },
] as const

const LIMITS = [
  { title: "실기기 필수", desc: "Core Haptics는 iOS 시뮬레이터에서 동작하지 않습니다. 진동 관련 기능은 반드시 실기기에서 테스트해야 합니다." },
  { title: "다중 객체 오탐", desc: "화면에 공이 하나만 있다고 가정합니다. 동일 라벨을 가진 공 모양 물체가 여러 개 있으면 오탐 가능성이 있습니다." },
  { title: "속도-진동 매핑 캘리브레이션 필요", desc: "HapticMapper.speedRanges와 fixedSharpness는 임시값입니다. 다양한 영상의 속도 분포를 기반으로 재캘리브레이션이 필요합니다." },
  { title: "캐시 자동 만료 없음", desc: "캐시는 영상+모델 조합별로 무기한 보관됩니다. 현재는 수동 Clear Cache만 제공되며, LRU 등 자동 만료 정책 도입이 향후 과제입니다." },
] as const

// ---- 내부 컴포넌트 ----

function SectionHeader({
  icon, bg, id, children,
}: {
  icon: React.ReactNode
  bg: string
  id: string
  children: React.ReactNode
}) {
  return (
    <div className="mb-5 flex items-center gap-3">
      <div className={`flex size-9 items-center justify-center rounded-xl ${bg}`} aria-hidden="true">
        {icon}
      </div>
      <h3 id={id} className="text-xl font-bold text-foreground">{children}</h3>
    </div>
  )
}

function AlgoCard({ title, items }: { title: string; items: { label: string; desc: string }[] }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <p className="mb-3 font-bold text-foreground">{title}</p>
      <ul className="flex flex-col gap-3">
        {items.map(({ label, desc }) => (
          <li key={label} className="flex gap-3">
            <span className="mt-0.5 shrink-0 rounded-md bg-primary/10 px-2 py-0.5 text-xs font-bold text-primary h-fit">{label}</span>
            <p className="text-sm leading-relaxed text-muted-foreground">{desc}</p>
          </li>
        ))}
      </ul>
    </div>
  )
}

function RAICard({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="mb-3 flex items-center gap-2">
        <span className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary" aria-hidden="true">
          {icon}
        </span>
        <h4 className="font-bold text-foreground">{title}</h4>
      </div>
      <p className="text-sm leading-relaxed text-muted-foreground">{desc}</p>
    </div>
  )
}
