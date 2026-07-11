"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { Bot, Menu, ShieldCheck, X } from "lucide-react";
import { hermesTokens } from "@/lib/design-tokens";
import { IconButton, StatusPill } from "@/components/ui";

const navItems = [
  { label: "Dashboard", href: "/" },
  { label: "Paper Trading", href: "/paper-trading" },
  { label: "Morning Briefing", href: "/morning-briefing" },
  { label: "Scanner", href: "/opportunity-scanner" },
  { label: "Learning", href: "/learning-journey" },
  { label: "Replay", href: "/replay-mode" },
  { label: "Journal", href: "/decision-journal" },
  { label: "Settings", href: "/settings" },
] as const;

export function TopNav() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="sticky top-0 z-30 border-b border-white/10 bg-surface-950/85 backdrop-blur-xl">
      <div
        className={`mx-auto flex ${hermesTokens.layout.maxWidthWide} items-center justify-between gap-3 ${hermesTokens.layout.pageX} py-2.5`}
      >
        <div className="flex min-w-0 items-center gap-2.5">
          <div className="grid size-8 place-items-center rounded-lg border border-mint-300/25 bg-mint-400 text-surface-950 sm:size-9">
            <Bot className="size-4" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold tracking-tight text-white sm:text-[15px]">Hermes</p>
            <p className="hidden text-[11px] text-slate-500 sm:block">Paper trading mentor</p>
          </div>
        </div>

        <nav
          className="hidden items-center gap-0.5 rounded-lg border border-white/10 bg-white/[0.02] p-0.5 lg:flex"
          aria-label="Primary"
        >
          {navItems.map((item) => {
            const active = pathname === item.href;
            return (
              <a
                className={`rounded-md px-2.5 py-1.5 text-xs font-medium ${hermesTokens.motion.calm} xl:px-3 ${
                  active
                    ? "bg-white/10 text-white shadow-insetPanel"
                    : "text-slate-400 hover:bg-white/5 hover:text-white"
                }`}
                href={item.href}
                key={item.href}
              >
                {item.label}
              </a>
            );
          })}
        </nav>

        <div className="flex items-center gap-2">
          <StatusPill tone="mint" className="hidden sm:inline-flex">
            <ShieldCheck className="size-3.5" aria-hidden="true" />
            Paper
          </StatusPill>
          <IconButton
            className="lg:hidden"
            label={mobileOpen ? "Close menu" : "Open menu"}
            onClick={() => setMobileOpen((open) => !open)}
          >
            {mobileOpen ? <X className="size-4" /> : <Menu className="size-4" />}
          </IconButton>
        </div>
      </div>

      {mobileOpen ? (
        <nav
          className="hermes-fade-in border-t border-white/10 bg-surface-950/95 px-4 py-3 lg:hidden"
          aria-label="Mobile"
        >
          <div className="mx-auto grid max-w-[1440px] gap-1">
            {navItems.map((item) => {
              const active = pathname === item.href;
              return (
                <a
                  className={`rounded-md px-3 py-2.5 text-sm font-medium ${
                    active
                      ? "bg-white/10 text-white"
                      : "text-slate-400 hover:bg-white/5 hover:text-white"
                  }`}
                  href={item.href}
                  key={item.href}
                  onClick={() => setMobileOpen(false)}
                >
                  {item.label}
                </a>
              );
            })}
          </div>
        </nav>
      ) : null}
    </header>
  );
}
