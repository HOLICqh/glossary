import "./globals.css";

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Chinese Logic Glossary",
  description: "Scholarly glossary manager for a multi-volume handbook on Chinese logic."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
