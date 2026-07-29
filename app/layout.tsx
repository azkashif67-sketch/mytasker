import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Public_Sans, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";

// Type roles from the brief §13.
const display = Bricolage_Grotesque({
  subsets: ["latin"],
  weight: ["600"],
  variable: "--font-display",
  display: "swap",
});

const body = Public_Sans({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-body",
  display: "swap",
});

const data = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["500"],
  variable: "--font-data",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Minute",
  description: "A personal task & learning planner.",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "Minute", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  themeColor: "#E6E9E4",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable} ${data.variable}`}>
      <body>{children}</body>
    </html>
  );
}
