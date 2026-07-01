import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Hermes",
  description: "AI-assisted market intelligence with local paper trading persistence.",
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
