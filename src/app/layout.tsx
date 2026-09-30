import type { Metadata, Viewport } from "next";
import { SessionProvider } from "@/components/auth/SessionProvider";
import "./globals.css";

export const metadata: Metadata = {
  title: "NEXUS — Geospatial Decision Intelligence",
  description:
    "Observe, detect, understand and optimize community development interventions from Earth observation evidence.",
};

export const viewport: Viewport = {
  themeColor: "#070D18",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="font-sans">
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  );
}
