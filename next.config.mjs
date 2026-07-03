/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  // CAP_BUILD=1 로 빌드하면 Capacitor 네이티브 앱용 정적 파일(out/)을 생성한다.
  // 평소(웹/프리뷰/Vercel 배포)에는 영향이 없다.
  ...(process.env.CAP_BUILD === "1" ? { output: "export" } : {}),
}

export default nextConfig
