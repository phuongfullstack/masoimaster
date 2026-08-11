import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  // Firestore handles realtime; no more socket.io proxy.

  // Proxy Firebase Auth helper về CÙNG domain với app (fix Google sign-in
  // bị chặn bởi third-party-cookie/COOP khi authDomain khác origin).
  // Hoạt động cả dev (localhost:3000) lẫn Vercel.
  async rewrites() {
    return [
      {
        source: "/__/auth/:path*",
        destination: "https://masoimaster.firebaseapp.com/__/auth/:path*",
      },
      {
        source: "/__/firebase/:path*",
        destination: "https://masoimaster.firebaseapp.com/__/firebase/:path*",
      },
    ];
  },
};

export default nextConfig;
