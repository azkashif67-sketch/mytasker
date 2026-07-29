import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // FullCalendar ships ESM packages that Next transpiles cleanly when listed here.
  transpilePackages: [
    "@fullcalendar/react",
    "@fullcalendar/daygrid",
    "@fullcalendar/timegrid",
    "@fullcalendar/interaction",
  ],
};

export default nextConfig;
