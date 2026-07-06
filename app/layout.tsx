import type { Metadata } from "next";
import { HermesCoachCard } from "@/components/hermes-coach-card";
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
      <body>
        {children}
        <HermesCoachCard />
      </body>
    </html>
  );
}
