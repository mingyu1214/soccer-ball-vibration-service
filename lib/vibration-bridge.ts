// 웹 / Capacitor 네이티브 양쪽에서 동작하는 진동 브릿지
// - 웹(안드로이드 Chrome 등): navigator.vibrate — 패턴 배열 지원
// - 네이티브 앱(iOS/안드로이드): @capacitor/haptics — iOS Safari가 막아둔 진동을 네이티브로 우회
//
// iOS Safari 는 Web Vibration API 를 지원하지 않기 때문에,
// Capacitor 로 앱을 빌드하면 이 브릿지가 네이티브 햅틱으로 자동 전환됩니다.

let capReady = false
let CapacitorRef: typeof import("@capacitor/core").Capacitor | null = null
let HapticsRef: typeof import("@capacitor/haptics").Haptics | null = null
let ImpactStyleRef: typeof import("@capacitor/haptics").ImpactStyle | null = null

// 네이티브 패턴 순차 실행을 취소하기 위한 토큰
let nativeRunToken = 0

/** Capacitor 네이티브 플러그인을 지연 로드 (웹 번들에 영향 없음) */
export async function initVibrationBridge(): Promise<void> {
  if (capReady || typeof window === "undefined") return
  try {
    const core = await import("@capacitor/core")
    if (core.Capacitor?.isNativePlatform?.()) {
      const hap = await import("@capacitor/haptics")
      CapacitorRef = core.Capacitor
      HapticsRef = hap.Haptics
      ImpactStyleRef = hap.ImpactStyle
    }
  } catch {
    // Capacitor 미설치/웹 환경 — 무시하고 웹 API 사용
  }
  capReady = true
}

/** 현재 네이티브 앱(Capacitor) 안에서 실행 중인지 */
export function isNativeApp(): boolean {
  return !!CapacitorRef?.isNativePlatform?.()
}

/** 진동을 지원하는지 (웹 Vibration API 또는 네이티브 햅틱) */
export function isVibrationAvailable(): boolean {
  if (isNativeApp()) return true
  return typeof navigator !== "undefined" && typeof navigator.vibrate === "function"
}

/**
 * 진동 실행. 웹에서는 navigator.vibrate 로 패턴을 그대로 전달하고,
 * 네이티브에서는 duration 만큼 vibrate 한 뒤 pause 를 두고 다음 구간을 실행한다.
 * @param pattern 단일 ms 값 또는 [진동, 멈춤, 진동, ...] 배열
 */
export function vibratePattern(pattern: number | number[]): void {
  // 네이티브 경로
  if (isNativeApp() && HapticsRef) {
    const arr = Array.isArray(pattern) ? pattern : [pattern]
    runNativePattern(arr)
    return
  }
  // 웹 경로
  if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
    navigator.vibrate(pattern)
  }
}

/** 모든 진동 중단 */
export function stopVibration(): void {
  nativeRunToken++
  if (isNativeApp() && HapticsRef) return
  if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
    navigator.vibrate(0)
  }
}

/** 네이티브에서 [on, off, on, ...] 패턴을 순차 실행 */
function runNativePattern(arr: number[]): void {
  if (!HapticsRef) return
  const token = ++nativeRunToken
  let idx = 0

  const step = () => {
    if (token !== nativeRunToken || idx >= arr.length) return
    const on = arr[idx]
    // 짝수 인덱스 = 진동 구간
    HapticsRef!.vibrate({ duration: Math.max(10, Math.round(on)) }).catch(() => {})
    const off = arr[idx + 1] ?? 0
    idx += 2
    if (idx < arr.length) {
      window.setTimeout(step, on + off)
    }
  }
  step()
}

/** 세기에 따라 네이티브 임팩트 강도를 매핑한 단발 임팩트 (선택적으로 사용) */
export async function nativeImpact(intensity: number): Promise<void> {
  if (!isNativeApp() || !HapticsRef || !ImpactStyleRef) return
  const style =
    intensity > 0.66 ? ImpactStyleRef.Heavy : intensity > 0.33 ? ImpactStyleRef.Medium : ImpactStyleRef.Light
  try {
    await HapticsRef.impact({ style })
  } catch {
    // 무시
  }
}
