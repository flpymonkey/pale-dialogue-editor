import "./globals.css";
import "@xyflow/react/dist/style.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Pale — Dialogue Editor",
  description: "A Disco Elysium-style dialogue tree editor.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
