import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Nemotron Chat",
  description: "A premium chat experience powered by NVIDIA Nemotron 3 Ultra.",
};

export const viewport: Viewport = {
  colorScheme: "dark",
  themeColor: "#080a0c",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="dark">
      <body>{children}</body>
    </html>
  );
}
