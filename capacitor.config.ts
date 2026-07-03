import type { CapacitorConfig } from "@capacitor/cli"

// HaptiBall 네이티브 앱(Capacitor) 설정
// - webDir: `CAP_BUILD=1 next build` 로 생성되는 정적 파일 폴더
// - iOS/안드로이드에서 @capacitor/haptics 로 네이티브 진동을 사용한다.
const config: CapacitorConfig = {
  appId: "com.haptiball.app",
  appName: "HaptiBall",
  webDir: "out",
  // 개발 중 폰에서 실시간으로 확인하려면 아래 server.url 을 dev 서버 주소로 지정할 수 있다.
  // server: { url: "http://192.168.0.10:3000", cleartext: true },
}

export default config
