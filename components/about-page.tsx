"use client"

import { Shield, Cpu, Smartphone, Eye, AlertTriangle, Users, Zap, Code2 } from "lucide-react"

export function AboutPage() {
  return (
    <main className="mx-auto max-w-4xl px-4 py-8 md:px-8 md:py-12">

      {/* 히어로 */}
      <section className="mb-12 text-center" aria-labelledby="hero-heading">
        <div className="mx-auto mb-6 flex size-20 items-center justify-center rounded-3xl bg-primary shadow-lg" aria-hidden="true">
          <Zap className="size-10 text-primary-foreground" />
        </div>
        <h2 id="hero-heading" className="mb-3 text-3xl font-black tracking-tight text-foreground md:text-4xl text-balance">
          시각을 진동으로 번역합니다
        </h2>
        <p className="mx-auto max-w-2xl text-base text-muted-foreground leading-relaxed text-pretty">
          HaptiBall은 YOLO 객체 감지 모델이 추출한 축구공의 위치·속도·방향 데이터를
          스마트폰의 진동 피드백으로 실시간 변환해, 시각장애인이 경기를 촉각으로 경험할 수 있도록 합니다.
        </p>
      </section>

      {/* 책임감 있는 AI */}
      <section className="mb-10" aria-labelledby="rai-heading">
        <div className="mb-5 flex items-center gap-3">
          <div className="flex size-9 items-center justify-center rounded-xl bg-accent/30" aria-hidden="true">
            <Shield className="size-5 text-accent-foreground" />
          </div>
          <h3 id="rai-heading" className="text-xl font-bold text-foreground">책임감 있는 AI 원칙</h3>
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

      {/* 서비스 동작 원리 */}
      <section className="mb-10" aria-labelledby="how-heading">
        <div className="mb-5 flex items-center gap-3">
          <div className="flex size-9 items-center justify-center rounded-xl bg-primary/15" aria-hidden="true">
            <Cpu className="size-5 text-primary" />
          </div>
          <h3 id="how-heading" className="text-xl font-bold text-foreground">동작 원리</h3>
        </div>
        <ol className="flex flex-col gap-4" role="list">
          {[
            { step: "01", title: "YOLO 객체 감지", desc: "축구 영상에서 YOLOv8 모델이 프레임마다 공의 바운딩 박스와 신뢰도(conf)를 추출합니다." },
            { step: "02", title: "데이터 전처리·필터링", desc: "저신뢰도 프레임 제거, 동일 좌표 반복(freeze) 감지, 이상 점프 필터링으로 노이즈를 정제합니다." },
            { step: "03", title: "운동학 계산", desc: "프레임 간 위치 차분으로 속도·방향·가속도를 계산하고, 선형 보간으로 프레임 간 부드러운 궤적을 생성합니다." },
            { step: "04", title: "이벤트 감지", desc: "속도 임계값·방향 전환 각도를 기준으로 슛, 방향 전환, 진영 이동, 공 소실 등의 이벤트를 타임라인으로 구성합니다." },
            { step: "05", title: "진동 피드백 출력", desc: "공 위치(좌/우)와 속도에 따른 지속 진동 패턴과 이벤트별 특수 진동을 Web Vibration API 또는 Capacitor 네이티브 햅틱으로 출력합니다." },
          ].map(({ step, title, desc }) => (
            <li key={step} className="flex gap-4">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary font-black text-sm text-primary-foreground" aria-hidden="true">
                {step}
              </span>
              <div>
                <p className="font-bold text-foreground">{title}</p>
                <p className="mt-0.5 text-sm text-muted-foreground leading-relaxed">{desc}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {/* 기술 스택 */}
      <section className="mb-10" aria-labelledby="stack-heading">
        <div className="mb-5 flex items-center gap-3">
          <div className="flex size-9 items-center justify-center rounded-xl bg-primary/15" aria-hidden="true">
            <Code2 className="size-5 text-primary" />
          </div>
          <h3 id="stack-heading" className="text-xl font-bold text-foreground">기술 스택</h3>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {STACK.map(({ cat, items }) => (
            <div key={cat} className="rounded-2xl border border-border bg-card p-4">
              <p className="mb-2 text-xs font-bold uppercase tracking-widest text-primary">{cat}</p>
              <ul className="flex flex-col gap-2">
                {items.map(({ name, detail }) => (
                  <li key={name}>
                    <span className="text-sm font-semibold text-foreground">{name}</span>
                    {detail && <span className="block text-xs text-muted-foreground">{detail}</span>}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* 핵심 알고리즘 */}
      <section className="mb-10" aria-labelledby="algo-heading">
        <div className="mb-5 flex items-center gap-3">
          <div className="flex size-9 items-center justify-center rounded-xl bg-primary/15" aria-hidden="true">
            <Cpu className="size-5 text-primary" />
          </div>
          <h3 id="algo-heading" className="text-xl font-bold text-foreground">핵심 알고리즘 상세</h3>
        </div>
        <div className="flex flex-col gap-4">
          {ALGOS.map(({ title, items }) => (
            <div key={title} className="rounded-2xl border border-border bg-card p-5">
              <p className="mb-3 font-bold text-foreground">{title}</p>
              <ul className="flex flex-col gap-3">
                {items.map(({ label, desc }) => (
                  <li key={label} className="flex gap-3">
                    <span className="mt-0.5 h-fit shrink-0 rounded-md bg-primary/10 px-2 py-0.5 text-xs font-bold text-primary">{label}</span>
                    <p className="text-sm leading-relaxed text-muted-foreground">{desc}</p>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* 진동 패턴 범례 */}
      <section aria-labelledby="pattern-heading">
        <div className="mb-5 flex items-center gap-3">
          <div className="flex size-9 items-center justify-center rounded-xl bg-accent/30" aria-hidden="true">
            <Smartphone className="size-5 text-accent-foreground" />
          </div>
          <h3 id="pattern-heading" className="text-xl font-bold text-foreground">진동 패턴 범례</h3>
        </div>
        <div className="rounded-2xl border border-border bg-card overflow-hidden">
          <table className="w-full text-sm" role="table">
            <thead>
              <tr className="border-b border-border bg-secondary">
                <th className="px-4 py-3 text-left font-bold text-foreground">상황</th>
                <th className="px-4 py-3 text-left font-bold text-foreground">진동 패턴</th>
                <th className="px-4 py-3 text-left font-bold text-foreground hidden sm:table-cell">의미</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {[
                { event: "지속 (느린 공)", pattern: "짧게 반복 (600ms 간격)", meaning: "공이 천천히 이동 중" },
                { event: "지속 (빠른 공)", pattern: "짧게 반복 (100ms 간격)", meaning: "공이 빠르게 이동 중" },
                { event: "슛 / 강한 킥", pattern: "길게 — 짧게 — 짧게", meaning: "강력한 킥 발생" },
                { event: "방향 전환", pattern: "짧게 — 짧게 (더블탭)", meaning: "공의 방향이 크게 바뀜" },
                { event: "진영 이동", pattern: "짧게 — 멈춤 — 짧게", meaning: "공이 좌측/우측으로 넘어감" },
                { event: "공 소실", pattern: "없음 (진동 중단)", meaning: "공 추적 불가 구간" },
              ].map(({ event, pattern, meaning }) => (
                <tr key={event} className="hover:bg-secondary/50 transition-colors">
                  <td className="px-4 py-3 font-medium text-foreground">{event}</td>
                  <td className="px-4 py-3 text-muted-foreground font-mono text-xs">{pattern}</td>
                  <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">{meaning}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-xs text-muted-foreground text-pretty">
          * 진동 세기는 설정 화면에서 조절할 수 있습니다. 이어폰 없이 폰을 손에 쥐고 사용하는 것을 권장합니다.
        </p>
      </section>
    </main>
  )
}

// ---- 데이터 ----

const STACK: { cat: string; items: { name: string; detail?: string }[] }[] = [
  {
    cat: "AI / 객체 탐지",
    items: [
      { name: "YOLOv8 (Ultralytics)", detail: "축구공 탐지 모델. Python·OpenCV로 영상 분석 후 JSON 출력" },
      { name: "감지 JSON 포맷", detail: "{ fps, width, height, frames[{t, x, y, conf}] } — 프레임별 공 좌표" },
      { name: "신뢰도 필터 (conf < 0.3)", detail: "저신뢰도 프레임 자동 null 처리" },
    ],
  },
  {
    cat: "프레임워크",
    items: [
      { name: "Next.js 16 (App Router)", detail: "서버 컴포넌트 + 클라이언트 컴포넌트 혼합 구조" },
      { name: "React 19", detail: "useCallback·useRef·useState·useEffect 기반 재생 루프" },
      { name: "TypeScript 5.7", detail: "엄격한 타입으로 DetectionFrame·BallState·HapticSettings 정의" },
    ],
  },
  {
    cat: "스타일링 / UI",
    items: [
      { name: "Tailwind CSS v4", detail: "@theme 블록으로 디자인 토큰(색상·폰트·반경) 관리" },
      { name: "shadcn/ui + Base UI", detail: "Button 컴포넌트, 접근성 primitive" },
      { name: "Lucide React v1.16", detail: "아이콘 라이브러리" },
    ],
  },
  {
    cat: "진동 엔진",
    items: [
      { name: "Web Vibration API", detail: "navigator.vibrate(pattern[]) — 안드로이드 Chrome에서 동작" },
      { name: "@capacitor/haptics v8", detail: "iOS 네이티브 햅틱 브릿지. ImpactStyle Light/Medium/Heavy" },
      { name: "HapticEngine (커스텀)", detail: "속도 기반 지속 진동 + 이벤트별 패턴([on,off,on,…] ms 배열)" },
      { name: "Vibration Bridge", detail: "웹/네이티브를 자동 감지해 같은 API로 진동 발생" },
    ],
  },
  {
    cat: "운동학 계산 (detection.ts)",
    items: [
      { name: "이진 탐색 프레임 조회", detail: "O(log n)으로 현재 시간의 프레임 인덱스 탐색" },
      { name: "선형 보간 (Lerp)", detail: "인접 프레임 사이 공 위치를 시간 비율로 보간" },
      { name: "차분 속도 계산", detail: "vx = (dx/dt)/width, vy = (dy/dt)/height → 정규화 속도" },
      { name: "이벤트 타임라인 빌더", detail: "20Hz 샘플링으로 슛·방향전환·진영이동·소실 이벤트 사전 생성" },
    ],
  },
  {
    cat: "데이터 전처리 (cleanFrames)",
    items: [
      { name: "Freeze 감지", detail: "동일 좌표 10프레임 이상 연속 → null 처리 (YOLO freeze 제거)" },
      { name: "점프 필터", detail: "0.033초 안에 250px 이상 이동 시 오검출로 판정 → null" },
      { name: "저신뢰도 제거", detail: "conf < 0.3 프레임 null 처리 → 공 튐 현상 방지" },
    ],
  },
  {
    cat: "재생 동기화",
    items: [
      { name: "requestAnimationFrame 루프", detail: "video.currentTime 기준으로 매 프레임 공 상태 계산" },
      { name: "이벤트 쿨다운", detail: "동일 이벤트 최소 간격(0.4~0.6초) 적용으로 중복 진동 방지" },
      { name: "seek 처리", desc: "재생 위치 변경 시 lastProcessedT 리셋으로 이벤트 재발화 방지" } as { name: string; detail?: string },
    ],
  },
  {
    cat: "모바일 앱 (Capacitor)",
    items: [
      { name: "@capacitor/core v8.4", detail: "isNativePlatform()으로 웹/네이티브 자동 분기" },
      { name: "정적 Export (CAP_BUILD=1)", detail: "next build → out/ 폴더를 Capacitor webDir로 사용" },
      { name: "iOS / Android 동시 지원", detail: "cap add ios / cap add android 한 번으로 빌드 가능" },
    ],
  },
  {
    cat: "배포 / 인프라",
    items: [
      { name: "Vercel", detail: "GitHub main 브랜치 push 시 자동 프로덕션 배포" },
      { name: "@vercel/analytics", detail: "페이지 뷰·이벤트 분석 (클라이언트 사이드)" },
      { name: "pnpm 워크스페이스", detail: "패키지 매니저. hono 4.12.25 override 적용" },
    ],
  },
]

const ALGOS: { title: string; items: { label: string; desc: string }[] }[] = [
  {
    title: "공 상태 계산 파이프라인 (computeBallState)",
    items: [
      { label: "이진 탐색", desc: "frames 배열에서 현재 재생 시간 t 이하의 마지막 프레임을 O(log n)으로 찾습니다." },
      { label: "선형 보간", desc: "현재 프레임(cur)과 다음 프레임(next) 사이를 ratio = (t - cur.t) / (next.t - cur.t) 비율로 보간해 부드러운 공 위치를 계산합니다." },
      { label: "차분 속도", desc: "vx = (ref.x - cur.x) / dt / width 로 정규화. speed = hypot(vx, vy). 초당 화면 폭 대비 이동량으로 표현됩니다." },
    ],
  },
  {
    title: "진동 엔진 동작 방식 (HapticEngine)",
    items: [
      { label: "지속 진동 (tickContinuous)", desc: "공 속도를 0~1.2 구간으로 정규화해 slowInterval(520ms)~fastInterval(90ms) 사이의 펄스 간격을 선형 보간합니다. 공이 빠를수록 진동이 잦아집니다." },
      { label: "펄스 길이", desc: "ball.ny(화면 세로 위치, 0=위~1=아래)로 근접도를 표현. duration = 18 + ny×40 + speed×45 ms. 공이 아래쪽(가까운 카메라)일수록 강하게 진동합니다." },
      { label: "이벤트 패턴", desc: "슛=[180~360ms 단발], 방향전환=[60ms, 50, 60ms 더블탭], 소실=[40,40,40,40,40ms 3연타], 재추적=[50,40,90ms]. fireEvent() 호출 후 패턴 총 길이만큼 지속 진동을 억제합니다." },
    ],
  },
  {
    title: "이벤트 타임라인 빌더 (buildEventTimeline)",
    items: [
      { label: "사전 계산", desc: "재생 시작 전 20Hz(0.05초 간격)로 전체 구간을 스캔해 이벤트 배열을 미리 만듭니다. 재생 중에는 조회만 하면 됩니다." },
      { label: "슛 감지", desc: "speed ≥ 3.0(화면폭/초) 이상이고 직전 상태보다 증가했을 때 슛 이벤트로 판정합니다(쿨다운 0.4초)." },
      { label: "방향 전환", desc: "연속 두 샘플의 이동 각도 차이가 72도(π/2.5) 이상이면 방향 전환으로 판정합니다(쿨다운 0.5초)." },
    ],
  },
]

function RAICard({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="mb-3 flex items-center gap-2">
        <span className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary" aria-hidden="true">
          {icon}
        </span>
        <h4 className="font-bold text-foreground">{title}</h4>
      </div>
      <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
    </div>
  )
}
