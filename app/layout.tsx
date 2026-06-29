import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Hermes",
  description: "AI-assisted market intelligence and paper trading engine.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
