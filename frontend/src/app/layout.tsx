import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CoreStack — Auth Monitor",
  description: "Secure SaaS authentication foundation with token monitoring",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ position: "relative", zIndex: 1 }}>{children}</body>
    </html>
  );
}
